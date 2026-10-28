import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

// Armazenamento em memória do status operacional das cadeiras (Livre / Almoço / Limpeza)
export const barberOperationalStatusMap = new Map<string, {
  status: 'AVAILABLE' | 'BREAK' | 'CLEANING';
  message?: string;
  updatedAt: Date;
}>();

export async function barbersRoutes(app: FastifyInstance) {
  // GET /api/barbers - List all barbers of the organization
  app.get('/barbers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      const profiles = await prisma.barberProfile.findMany({
        where: { orgId, active: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return profiles.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone || '',
        avatarUrl: p.user.avatarUrl || '',
        nickname: p.nickname || p.user.name,
        document: p.document || '',
        pixKey: p.pixKey || '',
        commissionRate: Number(p.commissionRate) || 50,
        chair: p.chair || 'Cadeira 1',
        specialties: p.specialties || 'Corte Degradê, Barba Terapia',
        workingDays: p.workingDays || 'mon,tue,wed,thu,fri,sat',
        customSchedule: p.customSchedule || null,
        bio: p.bio || 'Especialista BarblyClub',
        role: p.user.role,
        active: p.active,
      }));
    } catch (err: any) {
      console.error('[Barbers GET error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar barbeiros no banco de dados.' });
    }
  });

  // POST /api/barbers - Add a new barber to the team
  
  // GET /api/barbers/public - List active barbers for client booking / public view
  app.get('/barbers/public', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orgId: queryOrgId } = (request.query as any) || {};
      let targetOrgId = queryOrgId;

      if (!targetOrgId) {
        const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
        targetOrgId = firstOrg?.id;
      }

      if (!targetOrgId) {
        return [];
      }

      const profiles = await prisma.barberProfile.findMany({
        where: { orgId: targetOrgId, active: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return profiles.map((p) => {
        const opStatus = barberOperationalStatusMap.get(p.id);
        return {
          id: p.id,
          name: p.user.name,
          nickname: p.nickname || p.user.name,
          chair: p.chair || 'Cadeira 1',
          avatarUrl: p.user.avatarUrl || '',
          specialties: p.specialties || 'Corte Degradê, Barba Terapia',
          bio: p.bio || 'Especialista BarblyClub',
          operationalStatus: opStatus?.status || 'AVAILABLE',
          operationalMessage: opStatus?.message || 'Disponível',
        };
      });
    } catch (err: any) {
      console.error('[Barbers Public GET error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar barbeiros públicos.' });
    }
  });

  app.post('/barbers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      email: z.string().email('E-mail válido é obrigatório').optional().nullable(),
      phone: z.string().min(8, 'Telefone/WhatsApp é obrigatório'),
      avatarUrl: z.string().optional().nullable(),
      document: z.string().optional().nullable(),
      pixKey: z.string().optional().nullable(),
      commissionRate: z.number().min(0).max(100).default(50),
      chair: z.string().default('Cadeira 2'),
      specialties: z.string().optional().nullable(),
      workingDays: z.string().default('mon,tue,wed,thu,fri,sat'),
      customSchedule: z.record(z.any()).optional().nullable(),
      bio: z.string().optional().nullable(),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;
    const email = data.email || `barbeiro-${Date.now()}@barblyclub.com.br`;

    try {
      // 1. Create User
      const user = await prisma.user.create({
        data: {
          orgId,
          name: data.name,
          email,
          phone: data.phone,
          avatarUrl: data.avatarUrl || null,
          passwordHash: '$2b$10$placeholderDummyHashNotUsedForLoginDirectly',
          role: 'BARBER',
          active: true,
        },
      });

      // 2. Create BarberProfile
      const profile = await prisma.barberProfile.create({
        data: {
          userId: user.id,
          orgId,
          nickname: data.name.split(' ')[0],
          document: data.document || null,
          pixKey: data.pixKey || data.phone,
          commissionRate: data.commissionRate,
          chair: data.chair,
          specialties: data.specialties || 'Degradê, Barba',
          workingDays: data.workingDays,
          customSchedule: data.customSchedule !== undefined ? (data.customSchedule as any) : undefined,
          bio: data.bio || 'Profissional parceiro',
          active: true,
        },
      });

      return {
        success: true,
        message: 'Profissional cadastrado com sucesso!',
        barber: {
          id: profile.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          commissionRate: Number(profile.commissionRate),
          chair: profile.chair,
          specialties: profile.specialties,
          workingDays: profile.workingDays,
          pixKey: profile.pixKey,
        },
      };
    } catch (err: any) {
      console.error('[Barbers POST error]', err);
      return reply.status(500).send({ error: 'Erro ao cadastrar profissional no banco de dados.' });
    }
  });

  // PUT /api/barbers/:id - Update barber
  app.put('/barbers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    const { id } = request.params;
    const body: any = request.body || {};

    try {
      const existing = await prisma.barberProfile.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!existing || existing.orgId !== orgId) {
        return reply.status(404).send({ error: 'Barbeiro não encontrado nesta organização.' });
      }

      // Update User details if provided
      if (body.name || body.phone || body.email || body.avatarUrl !== undefined) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            name: body.name || undefined,
            phone: body.phone || undefined,
            email: body.email || undefined,
            avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : undefined,
          },
        });
      }

      // Update Profile
      const updated = await prisma.barberProfile.update({
        where: { id },
        data: {
          commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
          chair: body.chair !== undefined ? body.chair : undefined,
          pixKey: body.pixKey !== undefined ? body.pixKey : undefined,
          document: body.document !== undefined ? body.document : undefined,
          specialties: body.specialties !== undefined ? body.specialties : undefined,
          workingDays: body.workingDays !== undefined ? body.workingDays : undefined,
          customSchedule: body.customSchedule !== undefined ? (body.customSchedule as any) : undefined,
          bio: body.bio !== undefined ? body.bio : undefined,
        },
      });

      return {
        success: true,
        message: 'Dados do barbeiro atualizados com sucesso!',
        barber: updated,
      };
    } catch (err: any) {
      console.error('[Barbers PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar dados do profissional.' });
    }
  });

  // DELETE /api/barbers/:id - Deactivate barber
  app.delete('/barbers/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    const { id } = request.params;

    try {
      const existing = await prisma.barberProfile.findUnique({
        where: { id },
      });

      if (!existing || existing.orgId !== orgId) {
        return reply.status(404).send({ error: 'Barbeiro não encontrado nesta organização.' });
      }

      await prisma.barberProfile.update({
        where: { id },
        data: { active: false },
      });

      return {
        success: true,
        message: 'Profissional desativado da equipe com sucesso.',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao desativar profissional.' });
    }
  });


  // POST /api/barbers/:id/status - Atualizar status operacional (Disponível, Pausa/Almoço, Limpeza)
  app.post('/barbers/:id/status', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { status: 'AVAILABLE' | 'BREAK' | 'CLEANING'; message?: string };
  }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    const { status, message } = request.body || {};

    if (!['AVAILABLE', 'BREAK', 'CLEANING'].includes(status)) {
      return reply.status(400).send({ error: 'Status operacional inválido. Use AVAILABLE, BREAK ou CLEANING.' });
    }

    let defaultMsg = 'Disponível';
    if (status === 'BREAK') defaultMsg = message || 'Em Almoço / Pausa';
    if (status === 'CLEANING') defaultMsg = message || 'Limpeza de Bancada';

    barberOperationalStatusMap.set(id, {
      status,
      message: defaultMsg,
      updatedAt: new Date(),
    });

    return {
      success: true,
      barberId: id,
      status,
      message: defaultMsg,
    };
  });
}