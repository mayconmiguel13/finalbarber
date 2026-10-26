import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function servicesRoutes(app: FastifyInstance) {
  // GET /api/services - List all active services
  app.get('/services', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      const services = await prisma.service.findMany({
        where: { orgId, active: true },
        orderBy: { createdAt: 'asc' },
      });

      return services.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        durationMinutes: s.durationMinutes,
        description: s.description || '',
        category: s.category || 'Cortes',
        photoUrl: s.photoUrl || '',
      }));
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao buscar serviços no banco de dados' });
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
    const orgId = payload.orgId;

    const schema = z.object({
      name: z.string().min(2, 'Nome é obrigatório'),
      price: z.number().min(0, 'Preço deve ser positivo'),
      durationMinutes: z.number().min(5, 'Duração mínima é de 5 minutos'),
      category: z.string().default('Cortes'),
      description: z.string().optional().nullable(),
      photoUrl: z.string().optional().nullable(),
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
          name: data.name,
          price: data.price,
          durationMinutes: data.durationMinutes,
          category: data.category,
          description: data.description || null,
          photoUrl: data.photoUrl || null,
          active: true,
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
      return reply.status(500).send({ error: 'Erro ao cadastrar serviço.' });
    }
  });

  // PUT /api/services/:id - Update single service
  app.put('/services/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      const updated = await prisma.service.update({
        where: { id },
        data: {
          name: body.name || undefined,
          price: body.price !== undefined ? Number(body.price) : undefined,
          durationMinutes: body.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
          category: body.category || undefined,
          description: body.description !== undefined ? body.description : undefined,
          photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
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
      return reply.status(500).send({ error: 'Erro ao atualizar serviço.' });
    }
  });

  // DELETE /api/services/:id - Deactivate service
  app.delete('/services/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;

    try {
      await prisma.service.update({
        where: { id },
        data: { active: false },
      });

      return {
        success: true,
        message: 'Serviço removido com sucesso.',
      };
    } catch (err: any) {
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
        })),
      };
    } catch (err: any) {
      console.error('[Services Batch Error]', err);
      return reply.status(500).send({ error: 'Falha ao sincronizar serviços com o MySQL' });
    }
  });
}
