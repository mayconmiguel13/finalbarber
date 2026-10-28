import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { calculateSplit } from '../services/splitCalculator.js';
import { asaasService } from '../services/asaasService.js';
import { deductProductStockFEFO } from './financial.js';

export async function appointmentsRoutes(app: FastifyInstance) {
  // Helper: Auto-seed initial realistic appointments for an organization if empty
  async function ensureSampleAppointments(orgId: string) {
    try {
      const count = await prisma.appointment.count({ where: { orgId } });
      if (count > 0) return;

      const barbers = await prisma.barberProfile.findMany({
        where: { orgId, active: true },
        include: { user: true },
      });
      const services = await prisma.service.findMany({
        where: { orgId, active: true },
      });
      let customers = await prisma.customer.findMany({
        where: { orgId },
      });

      if (barbers.length === 0 || services.length === 0) return;

      // Ensure at least 3 sample customers if none exist
      if (customers.length === 0) {
        const sampleCust = [
          { name: 'Gabriel Santana', phone: '11988776655', email: 'gabriel@email.com' },
          { name: 'Rodrigo Alcantara', phone: '11977665544', email: 'rodrigo@email.com' },
          { name: 'Felipe Martins', phone: '11966554433', email: 'felipe@email.com' },
          { name: 'Lucas Vasconcelos', phone: '11955443322', email: 'lucas@email.com' },
        ];
        for (const c of sampleCust) {
          const custId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await prisma.customer.create({
            data: { id: custId, orgId, name: c.name, phone: c.phone, email: c.email },
          });
        }
        customers = await prisma.customer.findMany({ where: { orgId } });
      }

      // Seed 4 appointments for today
      const today = new Date();
      const y = today.getFullYear();
      const m = today.getMonth();
      const d = today.getDate();

      const timeSlots = [
        { hour: 9, minute: 0, status: 'COMPLETED' as const, origin: 'WHATSAPP_AI' as const, custIdx: 0, barbIdx: 0, servIdx: 0 },
        { hour: 10, minute: 30, status: 'IN_PROGRESS' as const, origin: 'COUNTER_WALKIN' as const, custIdx: 1, barbIdx: 0, servIdx: Math.min(1, services.length - 1) },
        { hour: 14, minute: 0, status: 'CONFIRMED' as const, origin: 'WHATSAPP_AI' as const, custIdx: 2, barbIdx: Math.min(1, barbers.length - 1), servIdx: 0 },
        { hour: 16, minute: 0, status: 'CONFIRMED' as const, origin: 'PWA_WEB' as const, custIdx: 3 % customers.length, barbIdx: 0, servIdx: Math.min(2, services.length - 1) },
      ];

      for (const slot of timeSlots) {
        const b = barbers[slot.barbIdx % barbers.length];
        const s = services[slot.servIdx % services.length];
        const c = customers[slot.custIdx % customers.length];

        const startsAt = new Date(y, m, d, slot.hour, slot.minute, 0);
        const endsAt = new Date(startsAt.getTime() + (s.durationMinutes || 35) * 60000);
        const price = Number(s.price);

        await prisma.appointment.create({
          data: {
            id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            orgId,
            barberId: b.id,
            customerId: c.id,
            serviceId: s.id,
            startsAt,
            endsAt,
            status: slot.status,
            origin: slot.origin,
            originalPrice: price,
            discountAmount: slot.origin === 'WHATSAPP_AI' ? price * 0.1 : 0,
            finalPrice: slot.origin === 'WHATSAPP_AI' ? price * 0.9 : price,
            notes: 'Agendamento sincronizado automaticamente',
          },
        });
      }
    } catch (err: any) {
      console.warn('[Appointments Seed Notice]:', err.message);
    }
  }

  // GET /api/appointments - Lista agendamentos filtrados por data ou período e barbeiro
  app.get('/appointments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const query: any = request.query || {};
    const dateStr = query.date; // YYYY-MM-DD
    const startDateStr = query.startDate;
    const endDateStr = query.endDate;
    const barberId = query.barberId;

    await ensureSampleAppointments(orgId);

    try {
      let gteDate: Date;
      let lteDate: Date;

      if (dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        gteDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        lteDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else if (startDateStr && endDateStr) {
        gteDate = new Date(startDateStr);
        lteDate = new Date(endDateStr);
      } else {
        // Padrão: hoje
        const now = new Date();
        gteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        lteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }

      const whereClause: any = {
        orgId,
        startsAt: {
          gte: gteDate,
          lte: lteDate,
        },
      };

      if (barberId && barberId !== 'ALL') {
        whereClause.barberId = barberId;
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          customer: true,
          barber: {
            include: { user: true },
          },
          service: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      return appointments.map((apt) => {
        const starts = new Date(apt.startsAt);
        const ends = new Date(apt.endsAt);
        const time = starts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const endTime = ends.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return {
          id: apt.id,
          date: starts.toISOString().split('T')[0],
          time,
          endTime,
          startsAt: apt.startsAt.toISOString(),
          endsAt: apt.endsAt.toISOString(),
          status: apt.status,
          origin: apt.origin,
          originalPrice: Number(apt.originalPrice),
          discountAmount: Number(apt.discountAmount),
          finalPrice: Number(apt.finalPrice),
          notes: apt.notes || '',
          customer: {
            id: apt.customer.id,
            name: apt.customer.name,
            phone: apt.customer.phone,
            avatarUrl: apt.customer.avatarUrl || '',
          },
          barber: {
            id: apt.barber.id,
            name: apt.barber.user.name,
            avatarUrl: apt.barber.user.avatarUrl || '',
            chair: apt.barber.chair || 'Cadeira Principal',
            commissionRate: Number(apt.barber.commissionRate) || 50,
          },
          service: {
            id: apt.service.id,
            name: apt.service.name,
            durationMinutes: apt.service.durationMinutes,
            price: Number(apt.service.price),
          },
        };
      });
    } catch (err: any) {
      console.error('[Get appointments error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar agendamentos.' });
    }
  });

  // GET /api/appointments/today - Retorna os agendamentos de hoje formatados para o dashboard
  app.get('/appointments/today', async (request: FastifyRequest, reply: FastifyReply) => {
    let orgId = '58a0928a-365b-444c-8a10-72213e53f596';
    try {
      await request.jwtVerify();
      const payload = (request as any).user;
      if (payload && payload.orgId) orgId = payload.orgId;
    } catch {}

    await ensureSampleAppointments(orgId);

    const now = new Date();
    const gteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const lteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          orgId,
          startsAt: {
            gte: gteDate,
            lte: lteDate,
          },
        },
        include: {
          customer: true,
          barber: { include: { user: true } },
          service: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      return appointments.map((apt) => {
        const starts = new Date(apt.startsAt);
        const time = starts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return {
          id: apt.id,
          time,
          clientName: apt.customer.name,
          clientPhone: apt.customer.phone,
          serviceName: apt.service.name,
          barberName: apt.barber.user.name,
          chair: apt.barber.chair || 'Cadeira Principal',
          status: apt.status,
          origin: apt.origin,
          originalPrice: Number(apt.originalPrice),
          discountAmount: Number(apt.discountAmount),
          finalPrice: Number(apt.finalPrice),
          paymentStatus: apt.status === 'COMPLETED' ? 'PAID' : 'PENDING',
          paymentMethod: 'PIX',
        };
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao carregar agendamentos de hoje.' });
    }
  });

  // POST /api/appointments - Criar agendamento (Encaixe rápido no balcão ou via app)
  app.post('/appointments', async (request: FastifyRequest, reply: FastifyReply) => {
    let orgId: string | undefined;
    try {
      await request.jwtVerify();
      const payload = (request as any).user;
      orgId = payload?.orgId;
    } catch {
      // Se não autenticado via JWT de admin, permite agendamento público online (PWA_WEB ou WHATSAPP_AI)
      const rawBody = (request.body as any) || {};
      if (rawBody.origin === 'PWA_WEB' || rawBody.origin === 'WHATSAPP_AI') {
        if (rawBody.orgId) {
          orgId = rawBody.orgId;
        } else if (rawBody.barberId && rawBody.barberId !== 'any' && rawBody.barberId !== 'barber-1') {
          const barber = await prisma.barberProfile.findUnique({
            where: { id: rawBody.barberId },
            select: { orgId: true }
          });
          orgId = barber?.orgId;
        }
        // Se ainda não encontrou orgId, tentar pelo serviço selecionado
        if (!orgId) {
          const targetSrvId = rawBody.serviceId || (rawBody.serviceIds && rawBody.serviceIds[0]);
          if (targetSrvId && targetSrvId !== 'srv-1') {
            const service = await prisma.service.findUnique({
              where: { id: targetSrvId },
              select: { orgId: true }
            });
            orgId = service?.orgId;
          }
        }
        // Fallback para primeira organização ativa
        if (!orgId) {
          const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
          orgId = firstOrg?.id;
        }
      }

      if (!orgId) {
        return reply.status(401).send({ error: 'Token inválido ou não autenticado.' });
      }
    }

    const schema = z.object({
      clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
      clientPhone: z.string().min(8, 'Telefone do cliente é obrigatório'),
      clientEmail: z.string().email().optional().nullable(),
      barberId: z.string().min(1, 'Selecione o profissional'),
      serviceId: z.string().optional().nullable(),
      serviceIds: z.array(z.string()).optional(),
      startsAt: z.string().min(5, 'Informe o horário de início'),
      notes: z.string().optional().nullable(),
      origin: z.enum(['WHATSAPP_AI', 'PWA_WEB', 'COUNTER_WALKIN']).default('COUNTER_WALKIN'),
      status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('CONFIRMED'),
      paymentMethod: z.string().default('PIX'),
      forceOverlap: z.boolean().default(false),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    const body = parsed.data;

    try {
      // 1. Obter serviços selecionados
      const targetServiceIds: string[] = body.serviceIds && body.serviceIds.length > 0 
        ? body.serviceIds 
        : body.serviceId ? [body.serviceId] : [];

      if (targetServiceIds.length === 0) {
        return reply.status(400).send({ error: 'Selecione ao menos um serviço.' });
      }

      let services = await prisma.service.findMany({
        where: { id: { in: targetServiceIds }, orgId },
      });
      if (services.length === 0) {
        // Fallback: se enviou id mock antigo como 'srv-1', associar ao primeiro serviço ativo
        const fallbackService = await prisma.service.findFirst({
          where: { orgId, active: true },
          orderBy: { createdAt: 'asc' }
        });
        if (fallbackService) {
          services = [fallbackService];
        } else {
          return reply.status(404).send({ error: 'Nenhum serviço válido encontrado.' });
        }
      }

      const primaryService = services[0];
      const totalDuration = services.reduce((sum, s) => sum + (s.durationMinutes || 30), 0);
      const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      const serviceNames = services.map(s => s.name).join(' + ');

      // Se barbeiro for 'any' ou mock 'barber-1', associar ao primeiro barbeiro ativo da organização
      let targetBarberId = body.barberId;
      if (targetBarberId === 'any' || targetBarberId === 'barber-1') {
        const firstBarber = await prisma.barberProfile.findFirst({
          where: { orgId, active: true },
          orderBy: { createdAt: 'asc' }
        });
        if (firstBarber) {
          targetBarberId = firstBarber.id;
        }
      }

      const barber = await prisma.barberProfile.findFirst({
        where: { id: targetBarberId, orgId },
        include: { user: true },
      });
      if (!barber) return reply.status(404).send({ error: 'Profissional não encontrado.' });

      // 2. Criar ou encontrar cliente pelo telefone
      const cleanPhone = body.clientPhone.replace(/\D/g, '');
      let customer = await prisma.customer.findFirst({
        where: { orgId, phone: cleanPhone },
      });

      if (!customer) {
        const custId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        customer = await prisma.customer.create({
          data: {
            id: custId,
            orgId,
            name: body.clientName.trim(),
            phone: cleanPhone,
            email: body.clientEmail?.trim() || null,
          },
        });
      }

      // 3. Calcular data/hora de início e fim somando a duração dos serviços
      const startsAtDate = new Date(body.startsAt);
      const endsAtDate = new Date(startsAtDate.getTime() + totalDuration * 60000);

      const discount = body.origin === 'WHATSAPP_AI' ? totalPrice * 0.1 : 0;
      const finalPrice = totalPrice - discount;

      const formattedNotes = services.length > 1 
        ? `[Combo: ${serviceNames}] ${body.notes?.trim() || ''}`
        : (body.notes?.trim() || null);

      // 3.1 Verificação de Conflito de Horário (Double Booking Prevention)
      if (!body.forceOverlap && body.status !== 'CANCELLED' && body.status !== 'NO_SHOW') {
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            orgId,
            barberId: barber.id,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            startsAt: { lt: endsAtDate },
            endsAt: { gt: startsAtDate },
          },
          include: {
            customer: true,
            service: true,
          },
        });

        if (conflictingAppointment) {
          const cStart = new Date(conflictingAppointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const cEnd = new Date(conflictingAppointment.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return reply.status(409).send({
            error: 'CONFLICT_OVERLAP',
            message: `O profissional ${barber.user.name} já possui atendimento marcado com ${conflictingAppointment.customer.name} (${conflictingAppointment.service.name}) das ${cStart} às ${cEnd}.`,
            conflict: {
              appointmentId: conflictingAppointment.id,
              clientName: conflictingAppointment.customer.name,
              serviceName: conflictingAppointment.service.name,
              startsAt: conflictingAppointment.startsAt,
              endsAt: conflictingAppointment.endsAt,
              timeFormatted: `${cStart} às ${cEnd}`,
            },
          });
        }
      }

      // 4. Salvar agendamento no banco
      const aptId = 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const appointment = await prisma.appointment.create({
        data: {
          id: aptId,
          orgId,
          barberId: barber.id,
          customerId: customer.id,
          serviceId: primaryService.id,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          status: body.status,
          origin: body.origin,
          originalPrice: totalPrice,
          discountAmount: discount,
          finalPrice,
          notes: formattedNotes,
        },
      });

      // Se já foi criado como COMPLETED, registra a receita no livro financeiro
      if (body.status === 'COMPLETED') {
        const commRate = Number(barber.commissionRate) || 50;
        const commAmount = (finalPrice * commRate) / 100;
        const finId = 'fin_apt_' + aptId;
        await prisma.$queryRawUnsafe(`
          INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
          VALUES (?, ?, 'INCOME', 'Serviço', ?, ?, ?, 'PAID', ?, ?, NOW(), NOW(), NOW())
        `, finId, orgId, `Atendimento: ${serviceNames} (${customer.name})`, finalPrice, body.paymentMethod, barber.id, commAmount);
      }

      return reply.status(201).send({
        success: true,
        message: 'Agendamento registrado com sucesso!',
        appointment: {
          id: appointment.id,
          clientName: customer.name,
          serviceName: serviceNames,
          barberName: barber.user.name,
          startsAt: startsAtDate.toISOString(),
          status: appointment.status,
          finalPrice,
        },
      });
    } catch (err: any) {
      console.error('[Create appointment error]', err);
      return reply.status(500).send({ error: 'Erro ao cadastrar agendamento.' });
    }
  });

  // PATCH /api/appointments/:id/status - Atualizar status do agendamento
  app.patch('/appointments/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    const schema = z.object({
      status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
      paymentMethod: z.string().default('PIX'),
      consumedProducts: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).default(1),
      })).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    const { status, paymentMethod, consumedProducts } = parsed.data;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, orgId },
        include: {
          customer: true,
          barber: { include: { user: true } },
          service: true,
        },
      });

      if (!appointment) return reply.status(404).send({ error: 'Agendamento não encontrado.' });

      await prisma.appointment.update({
        where: { id },
        data: { status },
      });

      // Se concluído, registrar receita e comissão de serviços no livro financeiro
      if (status === 'COMPLETED') {
        const finalPrice = Number(appointment.finalPrice);
        const commRate = Number(appointment.barber.commissionRate) || 50;
        const commAmount = (finalPrice * commRate) / 100;
        const finId = 'fin_apt_' + appointment.id;

        // Verificar se já existe lançamento para o serviço
        const existing: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM financial_entries WHERE id = ?`, finId);
        if (existing.length === 0) {
          await prisma.$queryRawUnsafe(`
            INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
            VALUES (?, ?, 'INCOME', 'Serviço', ?, ?, ?, 'PAID', ?, ?, NOW(), NOW(), NOW())
          `, finId, orgId, `Atendimento: ${appointment.service.name} (${appointment.customer.name})`, finalPrice, paymentMethod, appointment.barberId, commAmount);
        }

        // Se houver produtos/bebidas consumidos no atendimento, processar baixa no estoque e comissão
        if (consumedProducts && consumedProducts.length > 0) {
          for (const item of consumedProducts) {
            const prods: any[] = await prisma.$queryRawUnsafe(`
              SELECT id, name, category, salePrice, stockQuantity, commissionPercentage
              FROM products
              WHERE id = ? AND orgId = ?
            `, item.productId, orgId);

            if (prods.length > 0) {
              const prod = prods[0];
              const qty = item.quantity;
              const unitPrice = Number(prod.salePrice);
              const totalProdAmount = unitPrice * qty;
              const prodCommRate = Number(prod.commissionPercentage) || 0;
              const prodCommAmount = (totalProdAmount * prodCommRate) / 100;

              // Baixa no estoque com controle de lote e validade (FEFO)
              await deductProductStockFEFO(orgId, prod.id, qty);

              // Registrar venda de produto vinculada (ID <= 36 chars)
              const saleId = 'ps_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
              await prisma.$queryRawUnsafe(`
                INSERT INTO product_sales (id, orgId, productId, barberId, customerId, quantity, unitPrice, totalAmount, commissionRate, commissionAmount, paymentMethod, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `, saleId, orgId, prod.id, appointment.barberId, appointment.customerId, qty, unitPrice, totalProdAmount, prodCommRate, prodCommAmount, paymentMethod);

              // Lançar no Financeiro (ID <= 36 chars)
              const finProdId = 'fe_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
              const desc = `Consumo em Cadeira: ${qty}x ${prod.name} (${appointment.customer.name})`;
              await prisma.$queryRawUnsafe(`
                INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
                VALUES (?, ?, 'INCOME', 'Venda de Produto', ?, ?, ?, 'PAID', ?, ?, NOW(), NOW(), NOW())
              `, finProdId, orgId, desc, totalProdAmount, paymentMethod, appointment.barberId, prodCommAmount);
            }
          }
        }
      }

      return {
        success: true,
        message: `Atendimento atualizado para "${status}".`,
      };
    } catch (err: any) {
      console.error('[Update appointment status error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar status do agendamento.' });
    }
  });

  // PATCH /api/appointments/:id/reschedule - Arrastar e soltar / Reagendamento no FullCalendar
  app.patch('/appointments/:id/reschedule', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    const schema = z.object({
      startsAt: z.string().min(5),
      endsAt: z.string().optional().nullable(),
      barberId: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    const { startsAt, endsAt, barberId } = parsed.data;

    try {
      const apt = await prisma.appointment.findFirst({
        where: { id, orgId },
        include: { service: true },
      });
      if (!apt) return reply.status(404).send({ error: 'Agendamento não encontrado.' });

      const newStartsAt = new Date(startsAt);
      let newEndsAt = endsAt ? new Date(endsAt) : new Date(newStartsAt.getTime() + (apt.service.durationMinutes || 35) * 60000);

      const targetBarberId = barberId || apt.barberId;

      if (!parsed.data.forceOverlap && apt.status !== 'CANCELLED' && apt.status !== 'NO_SHOW') {
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            id: { not: id },
            orgId,
            barberId: targetBarberId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            startsAt: { lt: newEndsAt },
            endsAt: { gt: newStartsAt },
          },
          include: {
            customer: true,
            service: true,
          },
        });

        if (conflictingAppointment) {
          const cStart = new Date(conflictingAppointment.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const cEnd = new Date(conflictingAppointment.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          return reply.status(409).send({
            error: 'CONFLICT_OVERLAP',
            message: `Conflito: ${conflictingAppointment.customer.name} (${conflictingAppointment.service.name}) já está agendado das ${cStart} às ${cEnd}.`,
            conflict: {
              appointmentId: conflictingAppointment.id,
              clientName: conflictingAppointment.customer.name,
              serviceName: conflictingAppointment.service.name,
              timeFormatted: `${cStart} às ${cEnd}`,
            },
          });
        }
      }

      const updateData: any = {
        startsAt: newStartsAt,
        endsAt: newEndsAt,
      };
      if (barberId) {
        updateData.barberId = barberId;
      }

      await prisma.appointment.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Agendamento reagendado com sucesso!',
      };
    } catch (err: any) {
      console.error('[Reschedule appointment error]', err);
      return reply.status(500).send({ error: 'Erro ao reagendar atendimento.' });
    }
  });

  // DELETE /api/appointments/:id - Cancelar ou excluir agendamento
  app.delete('/appointments/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    try {
      const apt = await prisma.appointment.findFirst({ where: { id, orgId } });
      if (!apt) return reply.status(404).send({ error: 'Agendamento não encontrado.' });

      await prisma.appointment.delete({ where: { id } });
      return { success: true, message: 'Agendamento removido com sucesso.' };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao remover agendamento.' });
    }
  });

  // POST /api/appointments/:id/pix-checkout - Gerar Pix Dinâmico no Balcão com Split
  app.post('/appointments/:id/pix-checkout', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    const schema = z.object({
      discount: z.number().min(0).default(0),
      consumedProducts: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).default(1),
      })).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, orgId },
        include: {
          customer: true,
          barber: { include: { user: true } },
          service: true,
        },
      });

      if (!appointment) return reply.status(404).send({ error: 'Agendamento não encontrado.' });

      const servicePrice = Number(appointment.finalPrice) || Number(appointment.service.price) || 0;
      let productsPrice = 0;

      if (parsed.data.consumedProducts && parsed.data.consumedProducts.length > 0) {
        for (const item of parsed.data.consumedProducts) {
          const prods: any[] = await prisma.$queryRawUnsafe(
            'SELECT salePrice FROM products WHERE id = ? AND orgId = ?',
            item.productId, orgId
          );
          if (prods.length > 0) {
            productsPrice += (Number(prods[0].salePrice) || 0) * item.quantity;
          }
        }
      }

      const discount = parsed.data.discount || 0;
      const netTotal = Math.max(0.01, Number((servicePrice + productsPrice - discount).toFixed(2)));

      // Gerar Pix via Asaas (ou mock de alta fidelidade) com cálculo do Split da Lei do Salão-Parceiro
      const pixResult = await asaasService.createPixWithSplit({
        appointmentId: appointment.id,
        clientName: appointment.customer?.name || 'Cliente Balcão',
        clientPhone: appointment.customer?.phone || '5511999999999',
        servicePrice: netTotal,
        barberName: appointment.barber?.nickname || appointment.barber?.user?.name || 'Barbeiro',
        barberCommissionRate: Number(appointment.barber?.commissionRate) || 50,
      });

      // Salva / atualiza a transação como pendente
      await prisma.transaction.upsert({
        where: { appointmentId: appointment.id },
        create: {
          orgId,
          appointmentId: appointment.id,
          externalId: pixResult.externalId,
          paymentMethod: 'PIX',
          status: 'PENDING',
          grossAmount: pixResult.finalPrice,
          salonShare: pixResult.salonShare,
          barberShare: pixResult.barberShare,
          platformFee: pixResult.platformFee,
          gatewayFee: pixResult.gatewayFee,
          pixQrCodeUrl: pixResult.pixQrCodeUrl,
          pixCopiaCola: pixResult.pixCopiaCola,
        },
        update: {
          externalId: pixResult.externalId,
          paymentMethod: 'PIX',
          status: 'PENDING',
          grossAmount: pixResult.finalPrice,
          salonShare: pixResult.salonShare,
          barberShare: pixResult.barberShare,
          platformFee: pixResult.platformFee,
          gatewayFee: pixResult.gatewayFee,
          pixQrCodeUrl: pixResult.pixQrCodeUrl,
          pixCopiaCola: pixResult.pixCopiaCola,
          updatedAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        pix: {
          paymentId: pixResult.paymentId,
          externalId: pixResult.externalId,
          pixCopiaCola: pixResult.pixCopiaCola,
          pixQrCodeUrl: pixResult.pixQrCodeUrl,
          finalPrice: pixResult.finalPrice,
          discountAmount: discount,
          salonShare: pixResult.salonShare,
          barberShare: pixResult.barberShare,
          isMock: pixResult.isMock,
        },
      });
    } catch (err: any) {
      console.error('[Pix Checkout error]', err);
      return reply.status(500).send({ error: 'Erro ao gerar Pix dinâmico.' });
    }
  });

  // GET /api/appointments/:id/pix-status/:paymentId - Polling de Status do Pix
  app.get('/appointments/:id/pix-status/:paymentId', async (request: FastifyRequest<{ Params: { id: string; paymentId: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id, paymentId } = request.params;

    try {
      const tx = await prisma.transaction.findFirst({
        where: {
          orgId,
          OR: [
            { appointmentId: id },
            { externalId: paymentId },
          ],
        },
      });

      if (!tx) {
        return reply.status(404).send({ error: 'Transação Pix não encontrada.' });
      }

      const isPaid = tx.status === 'PAID';
      return reply.send({
        status: isPaid ? 'CONFIRMED' : 'PENDING',
        paidAt: tx.paidAt,
        grossAmount: tx.grossAmount,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao verificar status do Pix.' });
    }
  });

  // POST /api/appointments/:id/pix-confirm - Confirmação / Simulação de Pix Aprovado no Balcão
  app.post('/appointments/:id/pix-confirm', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;
    const { id } = request.params;

    const schema = z.object({
      paymentId: z.string().optional(),
      discount: z.number().min(0).default(0),
      consumedProducts: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).default(1),
      })).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.format() });

    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, orgId },
        include: {
          customer: true,
          barber: { include: { user: true } },
          service: true,
        },
      });

      if (!appointment) return reply.status(404).send({ error: 'Agendamento não encontrado.' });

      // Atualiza Transação para PAID
      await prisma.transaction.updateMany({
        where: {
          orgId,
          appointmentId: id,
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Atualiza Agendamento para COMPLETED
      await prisma.appointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
        },
      });

      // Lançar no financeiro e dar baixa no estoque
      const finalPrice = Number(appointment.finalPrice) || Number(appointment.service.price) || 0;
      const commRate = Number(appointment.barber.commissionRate) || 50;
      const commAmount = (finalPrice * commRate) / 100;
      const finId = 'fin_apt_' + appointment.id;

      const existing: any[] = await prisma.$queryRawUnsafe('SELECT id FROM financial_entries WHERE id = ?', finId);
      if (existing.length === 0) {
        await prisma.$queryRawUnsafe(`
          INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
          VALUES (?, ?, 'INCOME', 'Serviço', ?, ?, 'PIX', 'PAID', ?, ?, NOW(), NOW(), NOW())
        `, finId, orgId, `Atendimento: ${appointment.service.name} (${appointment.customer.name})`, finalPrice, appointment.barberId, commAmount);
      }

      if (parsed.data.consumedProducts && parsed.data.consumedProducts.length > 0) {
        for (const item of parsed.data.consumedProducts) {
          const prods: any[] = await prisma.$queryRawUnsafe(
            'SELECT id, name, category, salePrice, stockQuantity, commissionPercentage FROM products WHERE id = ? AND orgId = ?',
            item.productId, orgId
          );

          if (prods.length > 0) {
            const prod = prods[0];
            const qty = item.quantity;
            const unitPrice = Number(prod.salePrice);
            const totalProdAmount = unitPrice * qty;
            const prodCommRate = Number(prod.commissionPercentage) || 0;
            const prodCommAmount = (totalProdAmount * prodCommRate) / 100;

            // Baixa no estoque com controle de lote e validade (FEFO)
            await deductProductStockFEFO(orgId, prod.id, qty);

            const saleId = 'ps_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
            await prisma.$queryRawUnsafe(`
              INSERT INTO product_sales (id, orgId, productId, barberId, customerId, quantity, unitPrice, totalAmount, commissionRate, commissionAmount, paymentMethod, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PIX', NOW())
            `, saleId, orgId, prod.id, appointment.barberId, appointment.customerId, qty, unitPrice, totalProdAmount, prodCommRate, prodCommAmount);

            const finProdId = 'fe_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
            const desc = `Consumo em Cadeira: ${qty}x ${prod.name} (${appointment.customer.name})`;
            await prisma.$queryRawUnsafe(`
              INSERT INTO financial_entries (id, orgId, type, category, description, amount, paymentMethod, status, barberId, barberCommission, paidAt, createdAt, updatedAt)
              VALUES (?, ?, 'INCOME', 'Venda de Produto', ?, ?, 'PIX', 'PAID', ?, ?, NOW(), NOW(), NOW())
            `, finProdId, orgId, desc, totalProdAmount, appointment.barberId, prodCommAmount);
          }
        }
      }

      return reply.send({
        success: true,
        status: 'CONFIRMED',
        message: 'Pagamento Pix confirmado e receita lançada no financeiro!',
      });
    } catch (err: any) {
      console.error('[Pix Confirm error]', err);
      return reply.status(500).send({ error: 'Erro ao confirmar Pix.' });
    }
  });

}
