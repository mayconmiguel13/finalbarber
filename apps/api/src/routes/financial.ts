import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';


async function syncCompletedAppointmentsToFinancial(orgId: string) {
  try {
    const completedApts = await prisma.appointment.findMany({
      where: { orgId, status: 'COMPLETED' },
      include: { service: true, customer: true, barber: true },
    });

    for (const apt of completedApts) {
      const finId = 'fin_apt_' + apt.id;
      const existing: any[] = await prisma.$queryRawUnsafe('SELECT id FROM financial_entries WHERE id = ?', finId);
      if (existing.length === 0) {
        const finalPrice = Number(apt.finalPrice) || 0;
        const commRate = Number(apt.barber?.commissionRate) || 50;
        const commAmount = (finalPrice * commRate) / 100;
        const desc = `Atendimento: ${apt.service?.name || 'Serviço'} (${apt.customer?.name || 'Cliente'})`;

        await prisma.$queryRawUnsafe(`
          INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
          VALUES (?, ?, 'INCOME', 'Serviço', ?, ?, 'PIX', 'PAID', ?, ?, ?, ?, NOW())
        `, finId, orgId, desc, finalPrice, apt.barberId, commAmount, apt.endsAt || apt.startsAt, apt.startsAt);
      }
    }
  } catch (err: any) {
    console.warn('[syncCompletedAppointments Notice]:', err?.message);
  }
}

export async function financialRoutes(app: FastifyInstance) {
  // GET /api/financial/summary - Resumo financeiro e KPI cards
  app.get('/financial/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);
      const entries: any[] = await prisma.$queryRawUnsafe(`
        SELECT type, category, amount, barberCommission, status
        FROM financial_entries
        WHERE orgId = ?
      `, orgId);

      let totalIncome = 0;
      let totalExpense = 0;
      let totalCommissionsGenerated = 0;
      let totalCommissionsPaid = 0;

      for (const e of entries) {
        const val = Number(e.amount) || 0;
        const comm = Number(e.barberCommission) || 0;

        if (e.type === 'INCOME') {
          totalIncome += val;
          totalCommissionsGenerated += comm;
        } else if (e.type === 'EXPENSE') {
          totalExpense += val;
          if ((e.category === 'Repasse Barbeiro' || e.category === 'Repasse Salão-Parceiro' || e.category === 'Comissão Barbeiro') && e.status === 'PAID') {
            totalCommissionsPaid += val;
          }
        }
      }

      const pendingCommissions = Math.max(0, totalCommissionsGenerated - totalCommissionsPaid);
      const netProfit = totalIncome - totalExpense;

      return {
        totalIncome,
        totalExpense,
        netProfit,
        totalCommissionsGenerated,
        totalCommissionsPaid,
        pendingCommissions,
      };
    } catch (err: any) {
      console.error('[Financial Summary error]', err);
      return reply.status(500).send({ error: 'Erro ao calcular resumo financeiro.' });
    }
  });

  // GET /api/financial/entries - Lançamentos de receitas e despesas
  app.get('/financial/entries', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);
      const entries = await prisma.$queryRawUnsafe(`
        SELECT 
          f.id,
          f.type,
          f.category,
          f.description,
          f.amount,
          f.paymentMethod,
          f.status,
          f.barberId,
          f.barberCommission,
          f.paidAt,
          f.createdAt,
          u.name AS barberName,
          u.avatarUrl AS barberAvatar
        FROM financial_entries f
        LEFT JOIN barber_profiles bp ON f.barberId = bp.id
        LEFT JOIN users u ON bp.userId = u.id
        WHERE f.orgId = ?
        ORDER BY f.createdAt DESC
      `, orgId);

      return entries;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao buscar extrato financeiro.' });
    }
  });

  // POST /api/financial/entries - Criar receita ou despesa manual
  app.post('/financial/entries', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.string().min(2),
      description: z.string().min(2),
      amount: z.number().positive('Valor deve ser positivo'),
      paymentMethod: z.string().default('PIX'),
      status: z.string().default('PAID'),
      barberId: z.string().optional().nullable(),
      barberCommission: z.number().default(0),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: parse.error.format() });

    const data = parse.data;
    const id = 'fin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    try {
      await prisma.$queryRawUnsafe(`
        INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `, id, orgId, data.type, data.category, data.description, data.amount, data.paymentMethod, data.status, data.barberId || null, data.barberCommission || 0);

      return {
        success: true,
        message: 'Lançamento registrado com sucesso!',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao registrar lançamento.' });
    }
  });

  // DELETE /api/financial/entries/:id
  app.delete('/financial/entries/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    try {
      await prisma.$queryRawUnsafe('DELETE FROM financial_entries WHERE id = ?', id);
      return { success: true, message: 'Lançamento removido.' };
    } catch {
      return reply.status(500).send({ error: 'Erro ao remover lançamento.' });
    }
  });

  // GET /api/financial/barber-splits - Extrato individual de cada barbeiro
  app.get('/financial/barber-splits', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);
      const barbers = await prisma.barberProfile.findMany({
        where: { orgId, active: true },
        include: { user: true },
      });

      const entries: any[] = await prisma.$queryRawUnsafe(`
        SELECT barberId, type, category, amount, barberCommission, status
        FROM financial_entries
        WHERE orgId = ? AND barberId IS NOT NULL
      `, orgId);

      const splits = barbers.map((b) => {
        const barberEntries = entries.filter((e) => e.barberId === b.id);
        
        let servicesTotal = 0;
        let productsTotal = 0;
        let totalCommissions = 0;
        let totalPaid = 0;

        for (const e of barberEntries) {
          const val = Number(e.amount) || 0;
          const comm = Number(e.barberCommission) || 0;

          if (e.type === 'INCOME') {
            const cat = (e.category || '').toLowerCase();
            if (cat.includes('prod') || cat.includes('bebid') || cat.includes('cerveja')) {
              productsTotal += val;
            } else {
              servicesTotal += val;
            }
            totalCommissions += comm;
          } else if (e.type === 'EXPENSE' && (e.category === 'Repasse Barbeiro' || e.category === 'Repasse Salão-Parceiro' || e.category === 'Comissão Barbeiro') && e.status === 'PAID') {
            totalPaid += val;
          }
        }

        const pendingPayout = Math.max(0, totalCommissions - totalPaid);
        const salonRetained = (servicesTotal + productsTotal) - totalCommissions;

        return {
          barberId: b.id,
          name: b.user.name,
          barberName: b.user.name,
          email: b.user.email,
          phone: b.user.phone || '',
          avatarUrl: b.user.avatarUrl || '',
          chair: b.chair || 'Cadeira Principal',
          commissionRate: Number(b.commissionRate) || 50,
          pixKey: b.pixKey || b.user.phone || '',
          servicesTotal,
          totalServicesRevenue: servicesTotal,
          productsTotal,
          totalProductsRevenue: productsTotal,
          totalGross: servicesTotal + productsTotal,
          totalGrossRevenue: servicesTotal + productsTotal,
          totalCommissions,
          totalCommissionEarned: totalCommissions,
          totalPaid,
          totalCommissionPaid: totalPaid,
          pendingPayout,
          salonRetained,
          salonRetainedShare: salonRetained,
          servicesCount: barberEntries.filter(e => e.category === 'Serviço').length,
          productsCount: barberEntries.filter(e => e.category === 'Venda de Produto').length,
        };
      });

      return splits;
    } catch (err: any) {
      console.error('[Barber Splits error]', err);
      return reply.status(500).send({ error: 'Erro ao calcular repasses dos barbeiros.' });
    }
  });

  // POST /api/financial/barber-splits/:barberId/pay - Registrar repasse Pix ao Barbeiro
  app.post('/financial/barber-splits/:barberId/pay', async (request: FastifyRequest<{ Params: { barberId: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { barberId } = request.params;
    const body: any = request.body || {};
    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'Informe um valor válido para o repasse.' });
    }

    try {
      const barber = await prisma.barberProfile.findUnique({
        where: { id: barberId },
        include: { user: true },
      });

      if (!barber) return reply.status(404).send({ error: 'Barbeiro não encontrado.' });

      const id = 'fin_pay_' + Date.now();
      const desc = `Repasse de Comissões Pix (Lei 13.352) - ${barber.user.name}`;

      await prisma.$queryRawUnsafe(`
        INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
        VALUES (?, ?, 'EXPENSE', 'Repasse Barbeiro', ?, ?, 'PIX', 'PAID', ?, 0, NOW(), NOW(), NOW())
      `, id, orgId, desc, amount, barberId);

      return {
        success: true,
        message: `Repasse de R$ ${amount.toFixed(2)} registrado com sucesso para ${barber.user.name}!`,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao registrar repasse Pix.' });
    }
  });

  // ================= PRODUTOS & BEBIDAS =================
  // GET /api/products
  app.get('/products', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      let products: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          id,
          orgId,
          name,
          category,
          photoUrl,
          stockQuantity,
          minStockAlert,
          costPrice,
          salePrice,
          commissionPercentage,
          expirationDate,
          batchCode,
          barcode,
          description,
          active,
          createdAt
        FROM products
        WHERE orgId = ? AND active = 1
        ORDER BY category ASC, name ASC
      `, orgId);

      // Auto-inicializar catálogo de bebidas e cosméticos se a barbearia não tiver nenhum produto
      if (products.length === 0) {
        const defaultCatalog = [
          { name: 'Cerveja Heineken Long Neck 330ml', category: 'Frigobar & Bebidas', cost: 4.80, price: 12.00, stock: 24, min: 6, comm: 0, photo: 'https://images.unsplash.com/photo-1608270192804-d54620ec4221?auto=format&fit=crop&q=80&w=600' },
          { name: 'Cerveja Corona Extra 330ml', category: 'Frigobar & Bebidas', cost: 5.20, price: 14.00, stock: 18, min: 6, comm: 0, photo: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&q=80&w=600' },
          { name: 'Coca-Cola Lata 350ml', category: 'Bebidas sem Álcool', cost: 2.50, price: 6.00, stock: 30, min: 8, comm: 0, photo: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600' },
          { name: 'Água Mineral com/sem Gás 500ml', category: 'Bebidas sem Álcool', cost: 1.20, price: 4.00, stock: 40, min: 10, comm: 0, photo: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=600' },
          { name: 'Pomada Efeito Matte Extra Fixação 120g', category: 'Cosméticos & Pomadas', cost: 18.00, price: 45.00, stock: 15, min: 4, comm: 15, photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600' },
          { name: 'Óleo Hidratante para Barba Wood & Spice 30ml', category: 'Cosméticos & Pomadas', cost: 15.00, price: 38.00, stock: 12, min: 3, comm: 15, photo: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&q=80&w=600' },
        ];

        for (const item of defaultCatalog) {
          const newId = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await prisma.$queryRawUnsafe(`
            INSERT INTO products (id, orgId, name, category, photoUrl, stockQuantity, minStockAlert, costPrice, salePrice, commissionPercentage, active, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
          `, newId, orgId, item.name, item.category, item.photo, item.stock, item.min, item.cost, item.price, item.comm);
        }

        products = await prisma.$queryRawUnsafe(`
          SELECT 
            id,
            orgId,
            name,
            category,
            photoUrl,
            stockQuantity,
            minStockAlert,
            costPrice,
            salePrice,
            commissionPercentage,
            expirationDate,
            batchCode,
            barcode,
            description,
            active,
            createdAt
          FROM products
          WHERE orgId = ? AND active = 1
          ORDER BY category ASC, name ASC
        `, orgId);
      }

      return products;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao carregar produtos.' });
    }
  });

  // POST /api/products - Cadastrar produto
  app.post('/products', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      name: z.string().min(2, 'Nome do produto é obrigatório'),
      category: z.string().default('Frigobar & Bebidas'),
      photoUrl: z.string().optional().nullable(),
      stockQuantity: z.number().int().default(0),
      minStockAlert: z.number().int().min(0).default(5),
      costPrice: z.number().min(0).default(0),
      salePrice: z.number().positive('Preço de venda deve ser maior que zero'),
      commissionPercentage: z.number().min(0).max(100).default(0),
      expirationDate: z.string().optional().nullable(),
      batchCode: z.string().optional().nullable(),
      barcode: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: parse.error.format() });

    const data = parse.data;
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    try {
      await prisma.$queryRawUnsafe(`
        INSERT INTO products (
          id, orgId, name, category, photoUrl, stockQuantity, minStockAlert,
          costPrice, salePrice, commissionPercentage, expirationDate, batchCode,
          barcode, description, active, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, 
        id, orgId, data.name, data.category, data.photoUrl || null,
        data.stockQuantity, data.minStockAlert, data.costPrice, data.salePrice,
        data.commissionPercentage, data.expirationDate || null, data.batchCode || null,
        data.barcode || null, data.description || null
      );

      return {
        success: true,
        message: 'Produto cadastrado com sucesso!',
        product: { id, ...data },
      };
    } catch (err: any) {
      console.error('[Create product error]', err);
      return reply.status(500).send({ error: 'Erro ao cadastrar produto.' });
    }
  });

  // PUT /api/products/:id - Atualizar produto
  app.put('/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      await prisma.$queryRawUnsafe(`
        UPDATE products
        SET 
          name = COALESCE(?, name),
          category = COALESCE(?, category),
          photoUrl = COALESCE(?, photoUrl),
          stockQuantity = COALESCE(?, stockQuantity),
          minStockAlert = COALESCE(?, minStockAlert),
          costPrice = COALESCE(?, costPrice),
          salePrice = COALESCE(?, salePrice),
          commissionPercentage = COALESCE(?, commissionPercentage),
          expirationDate = COALESCE(?, expirationDate),
          batchCode = COALESCE(?, batchCode),
          barcode = COALESCE(?, barcode),
          description = COALESCE(?, description),
          updatedAt = NOW()
        WHERE id = ?
      `, 
        body.name || null,
        body.category || null,
        body.photoUrl !== undefined ? body.photoUrl : null,
        body.stockQuantity !== undefined ? Number(body.stockQuantity) : null,
        body.minStockAlert !== undefined ? Number(body.minStockAlert) : null,
        body.costPrice !== undefined ? Number(body.costPrice) : null,
        body.salePrice !== undefined ? Number(body.salePrice) : null,
        body.commissionPercentage !== undefined ? Number(body.commissionPercentage) : null,
        body.expirationDate !== undefined ? body.expirationDate : null,
        body.batchCode !== undefined ? body.batchCode : null,
        body.barcode !== undefined ? body.barcode : null,
        body.description !== undefined ? body.description : null,
        id
      );

      return {
        success: true,
        message: 'Produto atualizado com sucesso!',
      };
    } catch (err: any) {
      console.error('[Update product error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar produto.' });
    }
  });

  // DELETE /api/products/:id
  app.delete('/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    try {
      await prisma.$queryRawUnsafe(`UPDATE products SET active = 0 WHERE id = ?`, id);
      return { success: true, message: 'Produto desativado com sucesso.' };
    } catch {
      return reply.status(500).send({ error: 'Erro ao desativar produto.' });
    }
  });

  // POST /api/products/sell - PDV / Venda de produto com comissão opcional
  app.post('/products/sell', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      productId: z.string(),
      barberId: z.string().optional().nullable(),
      quantity: z.number().int().min(1).default(1),
      paymentMethod: z.string().default('PIX'),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: parse.error.format() });

    const { productId, barberId, quantity, paymentMethod } = parse.data;

    try {
      const prodRes: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, category, stockQuantity, salePrice, commissionPercentage
        FROM products
        WHERE id = ? AND orgId = ?
      `, productId, orgId);

      if (prodRes.length === 0) return reply.status(404).send({ error: 'Produto não encontrado.' });
      const product = prodRes[0];

      // Opção A: Permite venda mesmo se estoque zerar ou for insuficiente, gerando aviso
      const isNegativeStock = (Number(product.stockQuantity) - quantity) < 0;

      const unitPrice = Number(product.salePrice);
      const totalAmount = unitPrice * quantity;
      
      // Cálculo de comissão (se barbeiro informado e percentual > 0)
      let commissionRate = 0;
      let commissionAmount = 0;
      if (barberId) {
        commissionRate = Number(product.commissionPercentage) || 0;
        commissionAmount = (totalAmount * commissionRate) / 100;
      }

      // 1. Decrementar estoque (permite negativo para não travar a venda na barbearia)
      await prisma.$queryRawUnsafe(`
        UPDATE products SET stockQuantity = stockQuantity - ?, updatedAt = NOW() WHERE id = ?
      `, quantity, productId);

      // 2. Registrar venda
      const saleId = 'sale_' + Date.now();
      await prisma.$queryRawUnsafe(`
        INSERT INTO product_sales (id, orgId, productId, barberId, quantity, unitPrice, totalAmount, commissionRate, commissionAmount, paymentMethod)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, saleId, orgId, productId, barberId || null, quantity, unitPrice, totalAmount, commissionRate, commissionAmount, paymentMethod);

      // 3. Registrar no Livro Financeiro como RECEITA
      const entryId = 'fin_prod_' + Date.now();
      const desc = `Venda: ${quantity}x ${product.name} (${product.category})`;
      await prisma.$queryRawUnsafe(`
        INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
        VALUES (?, ?, 'INCOME', 'Venda de Produto', ?, ?, ?, 'PAID', ?, ?, NOW(), NOW(), NOW())
      `, entryId, orgId, desc, totalAmount, paymentMethod, barberId || null, commissionAmount);

      return {
        success: true,
        message: `Venda de ${quantity}x "${product.name}" registrada com sucesso!`,
        totalAmount,
        commissionAmount,
      };
    } catch (err: any) {
      console.error('[Sell product error]', err);
      return reply.status(500).send({ error: 'Erro ao processar venda de produto.' });
    }
  });
}
