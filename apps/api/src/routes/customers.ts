import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function customersRoutes(app: FastifyInstance) {
  // GET /api/customers - List organization customers with enriched CRM metrics
  app.get('/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      const [customers, productSalesSums] = await Promise.all([
        prisma.customer.findMany({
          where: { orgId },
          include: {
            appointments: {
              select: {
                id: true,
                startsAt: true,
                finalPrice: true,
                status: true,
              },
              orderBy: { startsAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.$queryRawUnsafe<any[]>(`
          SELECT customerId, SUM(totalAmount) as totalProductsSpent, COUNT(*) as productsCount
          FROM product_sales
          WHERE orgId = ? AND customerId IS NOT NULL
          GROUP BY customerId
        `, orgId),
      ]);

      const productSpentMap: Record<string, { totalSpent: number; count: number }> = {};
      if (Array.isArray(productSalesSums)) {
        productSalesSums.forEach((r) => {
          if (r.customerId) {
            productSpentMap[r.customerId] = {
              totalSpent: Number(r.totalProductsSpent) || 0,
              count: Number(r.productsCount) || 0,
            };
          }
        });
      }

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      return customers.map((c) => {
        const completedAppointments = c.appointments.filter((a) => a.status === 'COMPLETED');
        const totalAppointments = c.appointments.length;
        const totalSpentServices = completedAppointments.reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
        const prodData = productSpentMap[c.id] || { totalSpent: 0, count: 0 };
        const totalSpentProducts = prodData.totalSpent;
        const totalSpent = totalSpentServices + totalSpentProducts;

        const lastAppointment = c.appointments.length > 0 ? c.appointments[0].startsAt : null;
        
        // Calculate days since last visit
        let daysSinceLastVisit: number | null = null;
        if (lastAppointment) {
          const diffMs = Date.now() - new Date(lastAppointment).getTime();
          daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        // Aniversariante do mês / hoje
        let isBirthdayMonth = false;
        let isBirthdayToday = false;
        if (c.birthDate) {
          let bMonth: number | null = null;
          let bDay: number | null = null;
          if (c.birthDate.includes('-')) {
            const parts = c.birthDate.split('-').map(Number);
            if (parts.length === 3) {
              bMonth = parts[1];
              bDay = parts[2];
            } else if (parts.length === 2) {
              bMonth = parts[0];
              bDay = parts[1];
            }
          } else if (c.birthDate.includes('/')) {
            const parts = c.birthDate.split('/').map(Number);
            if (parts.length >= 2) {
              bDay = parts[0];
              bMonth = parts[1];
            }
          }

          if (bMonth === currentMonth) {
            isBirthdayMonth = true;
            if (bDay === currentDay) {
              isBirthdayToday = true;
            }
          }
        }

        // Status de fidelidade inteligente
        let loyaltyStatus: 'VIP' | 'EM_RISCO' | 'NOVO' | 'RECORRENTE' = 'NOVO';
        if (c.isVipMember) {
          loyaltyStatus = 'VIP';
        } else if (daysSinceLastVisit !== null && daysSinceLastVisit >= 30) {
          loyaltyStatus = 'EM_RISCO';
        } else if (totalAppointments >= 2) {
          loyaltyStatus = 'RECORRENTE';
        }

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || '',
          birthDate: c.birthDate || '',
          instagram: c.instagram || '',
          avatarUrl: c.avatarUrl || '',
          notes: c.notes || '',
          preferences: c.preferences || [],
          isVipMember: c.isVipMember,
          totalAppointments,
          totalSpentServices,
          totalSpentProducts,
          totalSpent,
          lastAppointment,
          daysSinceLastVisit,
          isAtRisk: daysSinceLastVisit !== null && daysSinceLastVisit >= 30,
          isBirthdayMonth,
          isBirthdayToday,
          loyaltyStatus,
          createdAt: c.createdAt,
        };
      });
    } catch (err: any) {
      console.error('[Customers GET error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar clientes no banco de dados.' });
    }
  });

  // GET /api/customers/:id - Dossier 360º Completo do Cliente
  app.get('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const customer = await prisma.customer.findFirst({
        where: { id, orgId },
      });

      if (!customer) {
        return reply.status(404).send({ error: 'Cliente não encontrado.' });
      }

      // Histórico completo de Agendamentos (com barbeiro e serviço)
      const appointments = await prisma.appointment.findMany({
        where: { customerId: id, orgId },
        include: {
          barber: {
            select: { 
              id: true, 
              nickname: true, 
              chair: true,
              user: {
                select: { name: true, avatarUrl: true }
              }
            },
          },
          service: {
            select: { id: true, name: true, durationMinutes: true, price: true },
          },
        },
        orderBy: { startsAt: 'desc' },
      });

      // Histórico completo de Produtos / Bebidas consumidos
      const productSales = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          ps.id,
          ps.productId,
          p.name as productName,
          p.category as productCategory,
          ps.quantity,
          ps.unitPrice,
          ps.totalAmount,
          ps.paymentMethod,
          ps.createdAt
        FROM product_sales ps
        LEFT JOIN products p ON ps.productId = p.id
        WHERE ps.customerId = ? AND ps.orgId = ?
        ORDER BY ps.createdAt DESC
      `, id, orgId);

      // Métricas e Inteligência do Cliente
      const completedApts = appointments.filter(a => a.status === 'COMPLETED');
      const totalServicesSpent = completedApts.reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
      const totalProductsSpent = productSales.reduce((acc, ps) => acc + Number(ps.totalAmount || 0), 0);
      const totalProductsCount = productSales.reduce((acc, ps) => acc + Number(ps.quantity || 0), 0);
      const totalLTV = totalServicesSpent + totalProductsSpent;

      // Barbeiro favorito
      const barberCountMap: Record<string, { count: number; name: string }> = {};
      appointments.forEach(a => {
        if (a.barber) {
          const barberName = (a.barber as any).user?.name || (a.barber as any).nickname || 'Barbeiro';
          if (!barberCountMap[a.barber.id]) {
            barberCountMap[a.barber.id] = { count: 0, name: barberName };
          }
          barberCountMap[a.barber.id].count++;
        }
      });
      let preferredBarber: string | null = null;
      let maxBarberCount = 0;
      Object.values(barberCountMap).forEach(b => {
        if (b.count > maxBarberCount) {
          maxBarberCount = b.count;
          preferredBarber = b.name;
        }
      });

      // Bebida / Produto favorito
      const prodCountMap: Record<string, { count: number; name: string; category: string }> = {};
      productSales.forEach(ps => {
        const name = ps.productName || 'Produto';
        if (!prodCountMap[name]) {
          prodCountMap[name] = { count: 0, name, category: ps.productCategory || 'Geral' };
        }
        prodCountMap[name].count += Number(ps.quantity || 1);
      });
      let favoriteProduct: { name: string; count: number; category: string } | null = null;
      let maxProdCount = 0;
      Object.values(prodCountMap).forEach(p => {
        if (p.count > maxProdCount) {
          maxProdCount = p.count;
          favoriteProduct = p;
        }
      });

      // Intervalo médio entre visitas
      let averageDaysBetweenVisits: number | null = null;
      if (appointments.length >= 2) {
        const sortedDates = [...appointments].map(a => new Date(a.startsAt).getTime()).sort((a, b) => a - b);
        const spanMs = sortedDates[sortedDates.length - 1] - sortedDates[0];
        const spanDays = Math.floor(spanMs / (1000 * 60 * 60 * 24));
        averageDaysBetweenVisits = Math.max(1, Math.round(spanDays / (appointments.length - 1)));
      }

      // Dias desde a última visita
      let daysSinceLastVisit: number | null = null;
      if (appointments.length > 0) {
        const diffMs = Date.now() - new Date(appointments[0].startsAt).getTime();
        daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      // Status
      let loyaltyStatus: 'VIP' | 'EM_RISCO' | 'NOVO' | 'RECORRENTE' = 'NOVO';
      if (customer.isVipMember) {
        loyaltyStatus = 'VIP';
      } else if (daysSinceLastVisit !== null && daysSinceLastVisit >= 30) {
        loyaltyStatus = 'EM_RISCO';
      } else if (appointments.length >= 2) {
        loyaltyStatus = 'RECORRENTE';
      }

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          birthDate: customer.birthDate || '',
          instagram: customer.instagram || '',
          avatarUrl: customer.avatarUrl || '',
          notes: customer.notes || '',
          preferences: customer.preferences || [],
          isVipMember: customer.isVipMember,
          createdAt: customer.createdAt,
        },
        metrics: {
          totalAppointments: appointments.length,
          completedAppointments: completedApts.length,
          totalProductsCount,
          totalServicesSpent,
          totalProductsSpent,
          totalLTV,
          preferredBarber,
          favoriteProduct,
          averageDaysBetweenVisits,
          daysSinceLastVisit,
          loyaltyStatus,
        },
        appointments: appointments.map(a => ({
          id: a.id,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          status: a.status,
          finalPrice: Number(a.finalPrice),
          origin: a.origin,
          notes: a.notes,
          barber: a.barber ? {
            id: a.barber.id,
            name: (a.barber as any).user?.name || (a.barber as any).nickname || 'Barbeiro',
            chair: a.barber.chair,
            avatarUrl: (a.barber as any).user?.avatarUrl
          } : null,
          service: a.service,
        })),
        productSales: productSales.map(ps => ({
          id: ps.id,
          productId: ps.productId,
          name: ps.productName || 'Produto',
          category: ps.productCategory || 'Geral',
          quantity: Number(ps.quantity),
          unitPrice: Number(ps.unitPrice),
          totalAmount: Number(ps.totalAmount),
          paymentMethod: ps.paymentMethod,
          createdAt: ps.createdAt,
        })),
      };
    } catch (err: any) {
      console.error('[Customer 360 GET error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar dossiê 360 do cliente.' });
    }
  });

  // POST /api/customers - Create new customer
  app.post('/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      phone: z.string().min(8, 'Telefone / WhatsApp é obrigatório'),
      email: z.string().email().optional().nullable().or(z.literal('')),
      birthDate: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      avatarUrl: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      preferences: z.any().optional().nullable(),
      isVipMember: z.boolean().default(false),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;

    try {
      const existing = await prisma.customer.findUnique({
        where: {
          orgId_phone: {
            orgId,
            phone: data.phone,
          },
        },
      });

      if (existing) {
        return reply.status(400).send({ error: 'Já existe um cliente cadastrado com este telefone/WhatsApp.' });
      }

      const created = await prisma.customer.create({
        data: {
          orgId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          birthDate: data.birthDate || null,
          instagram: data.instagram || null,
          avatarUrl: data.avatarUrl || null,
          notes: data.notes || null,
          preferences: data.preferences ? (Array.isArray(data.preferences) ? data.preferences : [data.preferences]) : [],
          isVipMember: data.isVipMember,
        },
      });

      return {
        success: true,
        message: 'Cliente cadastrado com sucesso!',
        customer: {
          ...created,
          totalAppointments: 0,
          totalSpent: 0,
          totalSpentServices: 0,
          totalSpentProducts: 0,
          lastAppointment: null,
          daysSinceLastVisit: null,
          isAtRisk: false,
          loyaltyStatus: created.isVipMember ? 'VIP' : 'NOVO',
        },
      };
    } catch (err: any) {
      console.error('[Customers POST error]', err);
      return reply.status(500).send({ error: 'Erro ao cadastrar cliente.' });
    }
  });

  // PUT /api/customers/:id - Update customer
  app.put('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          name: body.name !== undefined ? body.name : undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
          email: body.email !== undefined ? (body.email || null) : undefined,
          birthDate: body.birthDate !== undefined ? (body.birthDate || null) : undefined,
          instagram: body.instagram !== undefined ? (body.instagram || null) : undefined,
          avatarUrl: body.avatarUrl !== undefined ? (body.avatarUrl || null) : undefined,
          notes: body.notes !== undefined ? (body.notes || null) : undefined,
          preferences: body.preferences !== undefined ? (Array.isArray(body.preferences) ? body.preferences : [body.preferences]) : undefined,
          isVipMember: body.isVipMember !== undefined ? body.isVipMember : undefined,
        },
      });

      return {
        success: true,
        message: 'Cliente atualizado com sucesso!',
        customer: updated,
      };
    } catch (err: any) {
      console.error('[Customers PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar cliente.' });
    }
  });

  // DELETE /api/customers/:id
  app.delete('/customers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;

    try {
      await prisma.customer.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Cliente removido com sucesso.',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao remover cliente.' });
    }
  });
}
