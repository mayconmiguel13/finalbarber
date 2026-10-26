import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function galleryRoutes(app: FastifyInstance) {
  // GET /api/gallery - List all gallery portfolio items
  app.get('/gallery', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    try {
      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          g.id,
          g.orgId,
          g.barberId,
          g.serviceId,
          g.title,
          g.description,
          g.photoUrl,
          g.category,
          g.tags,
          g.whatsappAiEnabled,
          g.likesCount,
          g.createdAt,
          u.name AS barberName,
          u.avatarUrl AS barberAvatar,
          bp.chair AS barberChair,
          bp.nickname AS barberNickname
        FROM gallery_items g
        LEFT JOIN barber_profiles bp ON g.barberId = bp.id
        LEFT JOIN users u ON bp.userId = u.id
        WHERE g.orgId = ?
        ORDER BY g.createdAt DESC
      `, orgId);

      return items;
    } catch (err: any) {
      console.error('[Gallery GET error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar galeria de trabalhos.' });
    }
  });

  // POST /api/gallery - Create new portfolio item
  app.post('/gallery', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload.orgId;

    const schema = z.object({
      title: z.string().min(2, 'Título é obrigatório'),
      photoUrl: z.string().min(5, 'Foto do trabalho é obrigatória'),
      barberId: z.string().optional().nullable(),
      serviceId: z.string().optional().nullable(),
      category: z.string().default('Cortes'),
      description: z.string().optional().nullable(),
      tags: z.string().optional().nullable(),
      whatsappAiEnabled: z.boolean().default(true),
    });

    const parse = schema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;
    const id = 'gal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    try {
      await prisma.$queryRawUnsafe(`
        INSERT INTO gallery_items (id, orgId, barberId, serviceId, title, description, photoUrl, category, tags, whatsappAiEnabled, likesCount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, id, orgId, data.barberId || null, data.serviceId || null, data.title, data.description || null, data.photoUrl, data.category, data.tags || null, data.whatsappAiEnabled);

      return {
        success: true,
        message: 'Foto adicionada à galeria com sucesso!',
        item: {
          id,
          orgId,
          ...data,
          likesCount: 0,
        },
      };
    } catch (err: any) {
      console.error('[Gallery POST error]', err);
      return reply.status(500).send({ error: 'Erro ao salvar foto na galeria.' });
    }
  });

  // PUT /api/gallery/:id - Update portfolio item
  app.put('/gallery/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      await prisma.$queryRawUnsafe(`
        UPDATE gallery_items 
        SET 
          title = COALESCE(?, title),
          photoUrl = COALESCE(?, photoUrl),
          barberId = COALESCE(?, barberId),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          tags = COALESCE(?, tags),
          whatsappAiEnabled = COALESCE(?, whatsappAiEnabled)
        WHERE id = ?
      `, 
        body.title || null,
        body.photoUrl || null,
        body.barberId || null,
        body.category || null,
        body.description || null,
        body.tags || null,
        body.whatsappAiEnabled !== undefined ? body.whatsappAiEnabled : null,
        id
      );

      return {
        success: true,
        message: 'Trabalho da galeria atualizado com sucesso!',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao atualizar item da galeria.' });
    }
  });

  // DELETE /api/gallery/:id - Delete item
  app.delete('/gallery/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const { id } = request.params;

    try {
      await prisma.$queryRawUnsafe(`DELETE FROM gallery_items WHERE id = ?`, id);

      return {
        success: true,
        message: 'Foto removida da galeria com sucesso.',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao remover foto da galeria.' });
    }
  });

  // POST /api/gallery/:id/like - Like a cut
  app.post('/gallery/:id/like', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    try {
      await prisma.$queryRawUnsafe(`UPDATE gallery_items SET likesCount = likesCount + 1 WHERE id = ?`, id);
      return { success: true };
    } catch {
      return reply.status(500).send({ error: 'Erro ao registrar like.' });
    }
  });
}
