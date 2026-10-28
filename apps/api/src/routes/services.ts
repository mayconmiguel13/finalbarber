import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function servicesRoutes(app: FastifyInstance) {
  // GET /api/services - List organization services (supports ?includeInactive=true)
  app.get('/services', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    if (!orgId) {
      return reply.status(400).send({ error: 'Organização não identificada.' });
    }

    const { includeInactive } = request.query as any || {};

    try {
      const whereClause: any = { orgId };
      if (includeInactive !== 'true') {
        whereClause.active = true;
      }

      const services = await prisma.service.findMany({
        where: whereClause,
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      });

      return services.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        durationMinutes: s.durationMinutes,
        description: s.description || '',
        category: s.category || 'Cortes',
        photoUrl: s.photoUrl || '',
        active: s.active,
        createdAt: s.createdAt,
      }));
    } catch (err: any) {
      console.error('[Services GET error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar serviços no banco de dados' });
    }
  });

  // GET /api/services/public - Public endpoint for Client PWA / Booking
  app.get('/services/public', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orgId: queryOrgId } = request.query as any || {};
      let targetOrgId = queryOrgId;

      if (!targetOrgId) {
        const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
        targetOrgId = firstOrg?.id;
      }

      if (!targetOrgId) {
        return [];
      }

      const services = await prisma.service.findMany({
        where: { orgId: targetOrgId, active: true },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      });

      return services.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        durationMinutes: s.durationMinutes,
        description: s.description || '',
        category: s.category || 'Cortes',
        photoUrl: s.photoUrl || '',
        active: s.active,
      }));
    } catch (err: any) {
      console.error('[Services Public GET error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar serviços.' });
    }
  });

  // POST /api/services - Create single service
  app.post('/services', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    if (!orgId) {
      return reply.status(400).send({ error: 'Organização não identificada.' });
    }

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      price: z.number().min(0, 'Preço deve ser positivo'),
      durationMinutes: z.number().min(5, 'Duração mínima é de 5 minutos'),
      category: z.string().default('Cortes'),
      description: z.string().optional().nullable(),
      photoUrl: z.string().optional().nullable(),
      active: z.boolean().default(true),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;

    try {
      const service = await prisma.service.create({
        data: {
          orgId,
          name: data.name.trim(),
          price: data.price,
          durationMinutes: data.durationMinutes,
          category: data.category.trim(),
          description: data.description?.trim() || null,
          photoUrl: data.photoUrl?.trim() || null,
          active: data.active !== undefined ? data.active : true,
        },
      });

      return {
        success: true,
        message: 'Serviço adicionado com sucesso!',
        service: {
          ...service,
          price: Number(service.price),
        },
      };
    } catch (err: any) {
      console.error('[Services POST error]', err);
      return reply.status(500).send({ error: 'Erro ao cadastrar serviço.' });
    }
  });

  // PUT /api/services/:id - Update single service with multi-tenant check
  app.put('/services/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
      const existing = await prisma.service.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado nesta organização.' });
      }

      const updated = await prisma.service.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          price: body.price !== undefined ? Number(body.price) : undefined,
          durationMinutes: body.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
          category: body.category !== undefined ? String(body.category).trim() : undefined,
          description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
          photoUrl: body.photoUrl !== undefined ? (body.photoUrl ? String(body.photoUrl).trim() : null) : undefined,
          active: body.active !== undefined ? Boolean(body.active) : undefined,
        },
      });

      return {
        success: true,
        message: 'Serviço atualizado com sucesso!',
        service: {
          ...updated,
          price: Number(updated.price),
        },
      };
    } catch (err: any) {
      console.error('[Services PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar serviço.' });
    }
  });

  // PATCH /api/services/:id/toggle - Toggle active/paused status with multi-tenant check
  app.patch('/services/:id/toggle', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    const { id } = request.params;

    try {
      const existing = await prisma.service.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado nesta organização.' });
      }

      const newActive = !existing.active;
      const updated = await prisma.service.update({
        where: { id },
        data: { active: newActive },
      });

      return {
        success: true,
        message: newActive ? `Serviço "${updated.name}" ativado no cardápio!` : `Serviço "${updated.name}" pausado no cardápio.`,
        service: {
          ...updated,
          price: Number(updated.price),
        },
      };
    } catch (err: any) {
      console.error('[Services Toggle error]', err);
      return reply.status(500).send({ error: 'Erro ao alternar status do serviço.' });
    }
  });

  // DELETE /api/services/:id - Deactivate service (soft delete) with multi-tenant check
  app.delete('/services/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    const { id } = request.params;

    try {
      const existing = await prisma.service.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado nesta organização.' });
      }

      await prisma.service.update({
        where: { id },
        data: { active: false },
      });

      return {
        success: true,
        message: 'Serviço desativado do cardápio com sucesso.',
      };
    } catch (err: any) {
      console.error('[Services DELETE error]', err);
      return reply.status(500).send({ error: 'Erro ao remover serviço.' });
    }
  });

  // POST /api/services/batch (Save full list from Onboarding or Settings)
  app.post('/services/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      services: z.array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(2),
          price: z.number().min(0),
          durationMinutes: z.number().min(5),
          description: z.string().optional(),
          category: z.string().optional(),
          photoUrl: z.string().optional(),
        })
      ),
    });

    const bodyParse = schema.safeParse(request.body);
    if (!bodyParse.success) {
      return reply.status(400).send({ error: bodyParse.error.format() });
    }

    const newServices = bodyParse.data.services;

    try {
      // Deactivate existing services
      await prisma.service.updateMany({
        where: { orgId },
        data: { active: false },
      });

      // Insert new or reactivated services
      for (const s of newServices) {
        await prisma.service.create({
          data: {
            orgId,
            name: s.name,
            price: s.price,
            durationMinutes: s.durationMinutes,
            category: s.category || 'Cortes',
            description: s.description || null,
            photoUrl: s.photoUrl || null,
            active: true,
          },
        });
      }

      const updated = await prisma.service.findMany({
        where: { orgId, active: true },
      });

      return {
        success: true,
        message: 'Serviços salvos com sucesso no banco de dados!',
        services: updated.map((s) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price),
          durationMinutes: s.durationMinutes,
          category: s.category,
          photoUrl: s.photoUrl,
          active: s.active,
        })),
      };
    } catch (err: any) {
      console.error('[Services Batch Error]', err);
      return reply.status(500).send({ error: 'Falha ao sincronizar serviços com o MySQL' });
    }
  });
}
