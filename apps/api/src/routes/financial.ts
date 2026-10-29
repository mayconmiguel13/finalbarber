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

export async function deductProductStockFEFO(orgId: string, productId: string, quantityToDeduct: number) {
  try {
    // 1. Buscar lotes com saldo > 0 ordenados pela data de validade mais próxima (FEFO)
    const batches: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, currentQuantity, expirationDate, batchCode
      FROM product_batches
      WHERE productId = ? AND orgId = ? AND currentQuantity > 0
      ORDER BY (expirationDate IS NULL) ASC, expirationDate ASC, createdAt ASC
    `, productId, orgId);

    let remaining = quantityToDeduct;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deductFromThis = Math.min(Number(batch.currentQuantity), remaining);
      const newQty = Number(batch.currentQuantity) - deductFromThis;

      await prisma.$queryRawUnsafe(`
        UPDATE product_batches
        SET currentQuantity = ?, updatedAt = NOW()
        WHERE id = ? AND orgId = ?
      `, newQty, batch.id, orgId);

      remaining -= deductFromThis;
    }

    // 2. Decrementar estoque principal do produto
    await prisma.$queryRawUnsafe(`
      UPDATE products
      SET stockQuantity = stockQuantity - ?, updatedAt = NOW()
      WHERE id = ? AND orgId = ?
    `, quantityToDeduct, productId, orgId);

    // 3. Recalcular a validade e lote mais próximos ativos do produto
    const nearest: any[] = await prisma.$queryRawUnsafe(`
      SELECT expirationDate, batchCode
      FROM product_batches
      WHERE productId = ? AND orgId = ? AND currentQuantity > 0
      ORDER BY (expirationDate IS NULL) ASC, expirationDate ASC, createdAt ASC
      LIMIT 1
    `, productId, orgId);

    if (nearest.length > 0) {
      await prisma.$queryRawUnsafe(`
        UPDATE products
        SET expirationDate = ?, batchCode = COALESCE(?, batchCode), updatedAt = NOW()
        WHERE id = ? AND orgId = ?
      `, nearest[0].expirationDate || null, nearest[0].batchCode || null, productId, orgId);
    }
  } catch (err) {
    console.error('[deductProductStockFEFO Error]:', err);
    // Fallback: garante baixa no estoque geral
    await prisma.$queryRawUnsafe(`
      UPDATE products
      SET stockQuantity = stockQuantity - ?, updatedAt = NOW()
      WHERE id = ? AND orgId = ?
    `, quantityToDeduct, productId, orgId);
  }
}

export async function financialRoutes(app: FastifyInstance) {
  // GET /api/financial/summary - Resumo financeiro e KPI cards (suporta filtro de período)
  app.get('/financial/summary', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { startDate, endDate } = request.query;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);

      let query = `
        SELECT type, category, amount, barberCommission, status, paidAt, createdAt
        FROM financial_entries
        WHERE orgId = ?
      `;
      const params: any[] = [orgId];

      if (startDate) {
        query += ` AND COALESCE(paidAt, createdAt) >= ?`;
        params.push(new Date(startDate));
      }
      if (endDate) {
        query += ` AND COALESCE(paidAt, createdAt) <= ?`;
        params.push(new Date(endDate));
      }

      const entries: any[] = await prisma.$queryRawUnsafe(query, ...params);

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

      // Cálculo de comissões pendentes acumuladas totais
      let allTimePending = 0;
      if (startDate || endDate) {
        const allEntries: any[] = await prisma.$queryRawUnsafe(`
          SELECT type, category, amount, barberCommission, status
          FROM financial_entries
          WHERE orgId = ?
        `, orgId);
        let allIncomeComm = 0;
        let allExpensePaid = 0;
        for (const e of allEntries) {
          if (e.type === 'INCOME') {
            allIncomeComm += (Number(e.barberCommission) || 0);
          } else if (e.type === 'EXPENSE' && (e.category === 'Repasse Barbeiro' || e.category === 'Repasse Salão-Parceiro' || e.category === 'Comissão Barbeiro') && e.status === 'PAID') {
            allExpensePaid += (Number(e.amount) || 0);
          }
        }
        allTimePending = Math.max(0, allIncomeComm - allExpensePaid);
      } else {
        allTimePending = Math.max(0, totalCommissionsGenerated - totalCommissionsPaid);
      }

      const periodPendingCommissions = Math.max(0, totalCommissionsGenerated - totalCommissionsPaid);
      const netProfit = totalIncome - totalExpense;
      const netSalonIncome = Math.max(0, totalIncome - totalCommissionsGenerated);
      const profitMargin = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(1)) : 0;

      // Despesas pendentes / Contas a pagar futuras
      let pendingExpensesCount = 0;
      let pendingExpensesTotal = 0;

      // Distribuição por formas de pagamento
      const paymentMethodsMap: Record<string, { total: number; count: number }> = {};

      for (const e of entries) {
        const val = Number(e.amount) || 0;
        if (e.type === 'EXPENSE' && e.status === 'PENDING') {
          pendingExpensesCount++;
          pendingExpensesTotal += val;
        }

        if (e.type === 'INCOME') {
          const pm = (e.paymentMethod || 'PIX').toUpperCase();
          if (!paymentMethodsMap[pm]) {
            paymentMethodsMap[pm] = { total: 0, count: 0 };
          }
          paymentMethodsMap[pm].total += val;
          paymentMethodsMap[pm].count += 1;
        }
      }

      const paymentMethods: Record<string, { total: number; count: number; percentage: number }> = {};
      for (const [pm, data] of Object.entries(paymentMethodsMap)) {
        paymentMethods[pm] = {
          total: data.total,
          count: data.count,
          percentage: totalIncome > 0 ? Number(((data.total / totalIncome) * 100).toFixed(1)) : 0,
        };
      }

      return {
        totalIncome,
        totalExpense,
        netProfit,
        netSalonIncome,
        profitMargin,
        totalCommissionsGenerated,
        totalCommissionsPaid,
        pendingCommissions: allTimePending,
        periodPendingCommissions,
        pendingExpensesCount,
        pendingExpensesTotal,
        paymentMethods,
        entryCount: entries.length,
      };
    } catch (err: any) {
      console.error('[Financial Summary error]', err);
      return reply.status(500).send({ error: 'Erro ao calcular resumo financeiro.' });
    }
  });

  // GET /api/financial/entries - Lançamentos com filtro de período, tipo, categoria e busca
  app.get('/financial/entries', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; type?: string; category?: string; search?: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { startDate, endDate, type, category, search } = request.query;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);
      let query = `
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
          f.dueDate,
          f.createdAt,
          u.name AS barberName,
          u.avatarUrl AS barberAvatar
        FROM financial_entries f
        LEFT JOIN barber_profiles bp ON f.barberId = bp.id
        LEFT JOIN users u ON bp.userId = u.id
        WHERE f.orgId = ?
      `;
      const params: any[] = [orgId];

      if (startDate) {
        query += ` AND COALESCE(f.paidAt, f.createdAt) >= ?`;
        params.push(new Date(startDate));
      }
      if (endDate) {
        query += ` AND COALESCE(f.paidAt, f.createdAt) <= ?`;
        params.push(new Date(endDate));
      }
      if (type && type !== 'ALL') {
        query += ` AND f.type = ?`;
        params.push(type);
      }
      if (category && category !== 'Todos') {
        query += ` AND f.category = ?`;
        params.push(category);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        query += ` AND (f.description LIKE ? OR f.category LIKE ? OR u.name LIKE ? OR f.paymentMethod LIKE ?)`;
        params.push(q, q, q, q);
      }

      query += ` ORDER BY COALESCE(f.paidAt, f.createdAt) DESC, f.createdAt DESC`;

      const entries: any[] = await prisma.$queryRawUnsafe(query, ...params);
      const serialized = entries.map((e) => ({
        ...e,
        amount: Number(e.amount) || 0,
        barberCommission: Number(e.barberCommission) || 0,
      }));

      return serialized;
    } catch (err: any) {
      console.error('[Financial entries error]', err);
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
      dueDate: z.string().optional().nullable(),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: parse.error.format() });

    const data = parse.data;
    const id = 'fin_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

    try {
      const isPaid = data.status === 'PAID';
      const paidDate = isPaid ? new Date() : null;
      const dueDate = data.dueDate ? new Date(data.dueDate) : null;

      await prisma.$queryRawUnsafe(`
        INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, dueDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, id, orgId, data.type, data.category, data.description, data.amount, data.paymentMethod, data.status, data.barberId || null, data.barberCommission || 0, paidDate, dueDate);

      return {
        success: true,
        message: 'Lançamento registrado com sucesso!',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao registrar lançamento.' });
    }
  });

  // PATCH /api/financial/entries/:id/settle - Dar baixa em lançamento pendente (marcar como pago)
  app.patch('/financial/entries/:id/settle', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(
        'SELECT id FROM financial_entries WHERE id = ? AND orgId = ?',
        id,
        orgId
      );

      if (!existing || existing.length === 0) {
        return reply.status(404).send({ error: 'Lançamento não encontrado.' });
      }

      await prisma.$queryRawUnsafe(
        'UPDATE financial_entries SET status = ?, paidAt = NOW(), updatedAt = NOW() WHERE id = ? AND orgId = ?',
        'PAID',
        id,
        orgId
      );

      return {
        success: true,
        message: 'Lançamento liquidado com sucesso!',
      };
    } catch (err: any) {
      console.error('[Settle financial entry error]', err);
      return reply.status(500).send({ error: 'Erro ao liquidar lançamento.' });
    }
  });

  // DELETE /api/financial/entries/:id - Excluir lançamento com proteção Multi-Tenant estrita
  app.delete('/financial/entries/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT id FROM financial_entries WHERE id = ? AND orgId = ?
      `, id, orgId);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Lançamento não encontrado ou não pertence a esta organização.' });
      }

      await prisma.$queryRawUnsafe('DELETE FROM financial_entries WHERE id = ? AND orgId = ?', id, orgId);
      return { success: true, message: 'Lançamento removido com sucesso.' };
    } catch (err: any) {
      console.error('[Delete financial entry error]', err);
      return reply.status(500).send({ error: 'Erro ao remover lançamento.' });
    }
  });

  // GET /api/financial/barber-splits - Extrato individual de cada barbeiro com suporte a filtro de período
  app.get('/financial/barber-splits', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { startDate, endDate } = request.query;

    try {
      await syncCompletedAppointmentsToFinancial(orgId);
      const barbers = await prisma.barberProfile.findMany({
        where: { orgId, active: true },
        include: { user: true },
      });

      const allEntries: any[] = await prisma.$queryRawUnsafe(`
        SELECT barberId, type, category, amount, barberCommission, status, paidAt, createdAt
        FROM financial_entries
        WHERE orgId = ? AND barberId IS NOT NULL
      `, orgId);

      let periodEntries = allEntries;
      if (startDate || endDate) {
        const sTime = startDate ? new Date(startDate).getTime() : 0;
        const eTime = endDate ? new Date(endDate).getTime() : Infinity;

        periodEntries = allEntries.filter((e) => {
          const entryTime = new Date(e.paidAt || e.createdAt).getTime();
          return entryTime >= sTime && entryTime <= eTime;
        });
      }

      const splits = barbers.map((b) => {
        const bPeriodEntries = periodEntries.filter((e) => e.barberId === b.id);
        const bAllEntries = allEntries.filter((e) => e.barberId === b.id);

        let servicesTotal = 0;
        let productsTotal = 0;
        let periodCommissions = 0;
        let periodPaid = 0;

        for (const e of bPeriodEntries) {
          const val = Number(e.amount) || 0;
          const comm = Number(e.barberCommission) || 0;

          if (e.type === 'INCOME') {
            const cat = (e.category || '').toLowerCase();
            if (cat.includes('prod') || cat.includes('bebid') || cat.includes('cerveja')) {
              productsTotal += val;
            } else {
              servicesTotal += val;
            }
            periodCommissions += comm;
          } else if (e.type === 'EXPENSE' && (e.category === 'Repasse Barbeiro' || e.category === 'Repasse Salão-Parceiro' || e.category === 'Comissão Barbeiro') && e.status === 'PAID') {
            periodPaid += val;
          }
        }

        let allTimeEarned = 0;
        let allTimePaid = 0;
        for (const e of bAllEntries) {
          if (e.type === 'INCOME') {
            allTimeEarned += (Number(e.barberCommission) || 0);
          } else if (e.type === 'EXPENSE' && (e.category === 'Repasse Barbeiro' || e.category === 'Repasse Salão-Parceiro' || e.category === 'Comissão Barbeiro') && e.status === 'PAID') {
            allTimePaid += (Number(e.amount) || 0);
          }
        }

        const pendingPayout = Math.max(0, allTimeEarned - allTimePaid);
        const salonRetained = (servicesTotal + productsTotal) - periodCommissions;

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
          totalCommissions: periodCommissions,
          totalCommissionEarned: periodCommissions,
          totalPaid: periodPaid,
          totalCommissionPaid: periodPaid,
          pendingPayout,
          allTimeEarned,
          allTimePaid,
          salonRetained,
          salonRetainedShare: salonRetained,
          servicesCount: bPeriodEntries.filter(e => e.category === 'Serviço').length,
          productsCount: bPeriodEntries.filter(e => e.category === 'Venda de Produto').length,
        };
      });

      return splits;
    } catch (err: any) {
      console.error('[Barber Splits error]', err);
      return reply.status(500).send({ error: 'Erro ao calcular repasses dos barbeiros.' });
    }
  });

  // POST /api/financial/barber-splits/:barberId/pay - Registrar repasse Pix ao Barbeiro com validação estrita
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
      const barber = await prisma.barberProfile.findFirst({
        where: { id: barberId, orgId },
        include: { user: true },
      });

      if (!barber) {
        return reply.status(404).send({ error: 'Barbeiro não encontrado nesta organização.' });
      }

      const id = 'fin_pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      const desc = `Repasse de Comissões Pix (Lei 13.352) - ${barber.user.name}`;

      await prisma.$queryRawUnsafe(`
        INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
        VALUES (?, ?, 'EXPENSE', 'Repasse Barbeiro', ?, ?, 'PIX', 'PAID', ?, 0, NOW(), NOW(), NOW())
      `, id, orgId, desc, amount, barberId);

      return {
        success: true,
        message: `Repasse de R$ ${amount.toFixed(2)} registrado com sucesso para ${barber.user.name}!`,
        entry: {
          id,
          barberId,
          barberName: barber.user.name,
          amount,
          date: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      console.error('[Barber pay error]', err);
      return reply.status(500).send({ error: 'Erro ao registrar repasse Pix.' });
    }
  });

  // ================= PRODUTOS & BEBIDAS =================


  // GET /api/products - Listar produtos (suporta filtro de inativos e contagem de lotes)
  app.get('/products', async (request: FastifyRequest<{ Querystring: { includeInactive?: string; category?: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { includeInactive, category } = request.query;
    const allowInactive = includeInactive === 'true' || includeInactive === '1';

    try {
      let query = `
        SELECT 
          p.id,
          p.orgId,
          p.name,
          p.category,
          p.photoUrl,
          p.stockQuantity,
          p.minStockAlert,
          p.costPrice,
          p.salePrice,
          p.commissionPercentage,
          p.expirationDate,
          p.batchCode,
          p.barcode,
          p.description,
          p.active,
          p.createdAt,
          (
            SELECT COUNT(*) 
            FROM product_batches pb 
            WHERE pb.productId = p.id AND pb.orgId = p.orgId AND pb.currentQuantity > 0
          ) AS activeBatchesCount
        FROM products p
        WHERE p.orgId = ?
      `;

      const params: any[] = [orgId];

      if (!allowInactive) {
        query += ' AND p.active = 1';
      }

      if (category && category !== 'TODAS') {
        query += ' AND p.category = ?';
        params.push(category);
      }

      query += ' ORDER BY p.category ASC, p.name ASC';

      let products: any[] = await prisma.$queryRawUnsafe(query, ...params);

      // Auto-inicializar catálogo de bebidas e cosméticos se a barbearia não tiver nenhum produto
      if (products.length === 0 && !category) {
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

          // Criar lote inicial automático
          const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await prisma.$queryRawUnsafe(`
            INSERT INTO product_batches (id, orgId, productId, batchCode, expirationDate, initialQuantity, currentQuantity, costPrice, createdAt, updatedAt)
            VALUES (?, ?, ?, 'LOTE-INICIAL', NULL, ?, ?, ?, NOW(), NOW())
          `, batchId, orgId, newId, item.stock, item.stock, item.cost);
        }

        products = await prisma.$queryRawUnsafe(query, ...params);
      }

      const serialized = products.map((p) => ({
        ...p,
        activeBatchesCount: Number(p.activeBatchesCount) || 0,
        costPrice: Number(p.costPrice) || 0,
        salePrice: Number(p.salePrice) || 0,
        commissionPercentage: Number(p.commissionPercentage) || 0,
        stockQuantity: Number(p.stockQuantity) || 0,
        minStockAlert: Number(p.minStockAlert) || 0,
        active: Boolean(p.active),
      }));

      return serialized;
    } catch (err: any) {
      console.error('[Get products error]', err);
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

      // Se houver quantidade inicial em estoque, registra automaticamente como o 1º Lote
      if (data.stockQuantity > 0) {
        const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await prisma.$queryRawUnsafe(`
          INSERT INTO product_batches (
            id, orgId, productId, batchCode, expirationDate,
            initialQuantity, currentQuantity, costPrice, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, 
          batchId, orgId, id, data.batchCode || 'LOTE-INICIAL',
          data.expirationDate ? new Date(data.expirationDate) : null,
          data.stockQuantity, data.stockQuantity, data.costPrice
        );
      }

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

  // PUT /api/products/:id - Atualizar produto com proteção Multi-Tenant estrita
  app.put('/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;
    const body: any = request.body || {};

    try {
      // 1. Checagem estrita multi-tenant
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT id FROM products WHERE id = ? AND orgId = ?
      `, id, orgId);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Produto não encontrado ou acesso não autorizado.' });
      }

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
        WHERE id = ? AND orgId = ?
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
        id,
        orgId
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

  // PATCH /api/products/:id/toggle - Pausar / Reativar produto
  app.patch('/products/:id/toggle', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, active, name FROM products WHERE id = ? AND orgId = ?
      `, id, orgId);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Produto não encontrado.' });
      }

      const newActive = existing[0].active ? 0 : 1;
      await prisma.$queryRawUnsafe(`
        UPDATE products SET active = ?, updatedAt = NOW() WHERE id = ? AND orgId = ?
      `, newActive, id, orgId);

      return {
        success: true,
        active: Boolean(newActive),
        message: newActive ? `Produto "${existing[0].name}" ativado com sucesso!` : `Produto "${existing[0].name}" pausado.`,
      };
    } catch (err: any) {
      console.error('[Toggle product error]', err);
      return reply.status(500).send({ error: 'Erro ao alternar status do produto.' });
    }
  });

  // DELETE /api/products/:id - Desativar produto com proteção Multi-Tenant estrita
  app.delete('/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT id FROM products WHERE id = ? AND orgId = ?
      `, id, orgId);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Produto não encontrado ou acesso não autorizado.' });
      }

      await prisma.$queryRawUnsafe(`UPDATE products SET active = 0, updatedAt = NOW() WHERE id = ? AND orgId = ?`, id, orgId);
      return { success: true, message: 'Produto desativado com sucesso.' };
    } catch {
      return reply.status(500).send({ error: 'Erro ao desativar produto.' });
    }
  });

  // GET /api/products/:id/batches - Listar todos os lotes do produto
  app.get('/products/:id/batches', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const batches: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          id,
          batchCode,
          expirationDate,
          initialQuantity,
          currentQuantity,
          costPrice,
          createdAt
        FROM product_batches
        WHERE productId = ? AND orgId = ?
        ORDER BY (currentQuantity > 0) DESC, (expirationDate IS NULL) ASC, expirationDate ASC, createdAt DESC
      `, id, orgId);

      const serializedBatches = batches.map((b) => ({
        ...b,
        initialQuantity: Number(b.initialQuantity) || 0,
        currentQuantity: Number(b.currentQuantity) || 0,
        costPrice: Number(b.costPrice) || 0,
      }));
      return serializedBatches;
    } catch (err: any) {
      console.error('[Get product batches error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar lotes do produto.' });
    }
  });

  // POST /api/products/:id/batches - Dar entrada de novo lote com validade no estoque
  app.post('/products/:id/batches', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    const schema = z.object({
      quantity: z.number().int().min(1, 'Quantidade deve ser de pelo menos 1 unidade'),
      costPrice: z.number().min(0).optional(),
      expirationDate: z.string().optional().nullable(),
      batchCode: z.string().optional().nullable(),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: parse.error.format() });

    const { quantity, costPrice, expirationDate, batchCode } = parse.data;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, costPrice, stockQuantity, expirationDate, batchCode 
        FROM products 
        WHERE id = ? AND orgId = ?
      `, id, orgId);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Produto não encontrado.' });
      }
      const product = existing[0];

      const finalCost = costPrice !== undefined ? costPrice : Number(product.costPrice);
      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      // 1. Inserir lote
      await prisma.$queryRawUnsafe(`
        INSERT INTO product_batches (
          id, orgId, productId, batchCode, expirationDate,
          initialQuantity, currentQuantity, costPrice, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, batchId, orgId, id, batchCode || null, expirationDate ? new Date(expirationDate) : null, quantity, quantity, finalCost);

      // 2. Incrementar estoque do produto e atualizar preço de custo se informado
      await prisma.$queryRawUnsafe(`
        UPDATE products
        SET stockQuantity = stockQuantity + ?, costPrice = COALESCE(?, costPrice), updatedAt = NOW()
        WHERE id = ? AND orgId = ?
      `, quantity, costPrice !== undefined ? costPrice : null, id, orgId);

      // 3. Recalcular menor validade ativa
      const nearest: any[] = await prisma.$queryRawUnsafe(`
        SELECT expirationDate, batchCode
        FROM product_batches
        WHERE productId = ? AND orgId = ? AND currentQuantity > 0
        ORDER BY (expirationDate IS NULL) ASC, expirationDate ASC, createdAt ASC
        LIMIT 1
      `, id, orgId);

      if (nearest.length > 0) {
        await prisma.$queryRawUnsafe(`
          UPDATE products
          SET expirationDate = ?, batchCode = COALESCE(?, batchCode), updatedAt = NOW()
          WHERE id = ? AND orgId = ?
        `, nearest[0].expirationDate || null, nearest[0].batchCode || null, id, orgId);
      }

      return {
        success: true,
        message: `Entrada de ${quantity} unidades registrada no lote com sucesso!`,
        batchId,
      };
    } catch (err: any) {
      console.error('[Product batch entry error]', err);
      return reply.status(500).send({ error: 'Erro ao registrar entrada de lote.' });
    }
  });

  // POST /api/products/sell - PDV / Venda com baixa inteligente FEFO
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

      const unitPrice = Number(product.salePrice);
      const totalAmount = unitPrice * quantity;
      
      // Cálculo de comissão
      let commissionRate = 0;
      let commissionAmount = 0;
      if (barberId) {
        commissionRate = Number(product.commissionPercentage) || 0;
        commissionAmount = (totalAmount * commissionRate) / 100;
      }

      // 1. Baixa no estoque utilizando FEFO (First Expire, First Out)
      await deductProductStockFEFO(orgId, productId, quantity);

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
