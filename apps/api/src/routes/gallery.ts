import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function galleryRoutes(app: FastifyInstance) {
  // GET /api/gallery - List all gallery portfolio items for admin
  app.get('/gallery', async (request: FastifyRequest, reply: FastifyReply) => {
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

  // GET /api/gallery/public - Public endpoint for Client PWA and WhatsApp AI
  app.get('/gallery/public', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orgId: queryOrgId, category, tag } = request.query as any || {};
      let targetOrgId = queryOrgId;

      if (!targetOrgId) {
        const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
        targetOrgId = firstOrg?.id;
      }

      if (!targetOrgId) {
        return [];
      }

      const items = await prisma.$queryRawUnsafe(`
        SELECT 
          g.id,
          g.title,
          g.description,
          g.photoUrl,
          g.category,
          g.tags,
          g.likesCount,
          u.name AS barberName,
          bp.nickname AS barberNickname
        FROM gallery_items g
        LEFT JOIN barber_profiles bp ON g.barberId = bp.id
        LEFT JOIN users u ON bp.userId = u.id
        WHERE g.orgId = ? AND g.whatsappAiEnabled = 1
        ORDER BY g.likesCount DESC, g.createdAt DESC
      `, targetOrgId);

      return items;
    } catch (err: any) {
      console.error('[Gallery Public GET error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar portfólio público.' });
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
    const orgId = payload?.orgId;
    if (!orgId) {
      return reply.status(400).send({ error: 'Organização não identificada.' });
    }

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
      `, id, orgId, data.barberId || null, data.serviceId || null, data.title.trim(), data.description?.trim() || null, data.photoUrl.trim(), data.category.trim(), data.tags?.trim() || null, data.whatsappAiEnabled ? 1 : 0);

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

  // PUT /api/gallery/:id - Update portfolio item with multi-tenant check
  app.put('/gallery/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
      const existing: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM gallery_items WHERE id = ? AND orgId = ?`, id, orgId);
      if (!existing || existing.length === 0) {
        return reply.status(404).send({ error: 'Item da galeria não encontrado nesta organização.' });
      }

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
        WHERE id = ? AND orgId = ?
      `, 
        body.title?.trim() || null,
        body.photoUrl?.trim() || null,
        body.barberId || null,
        body.category?.trim() || null,
        body.description !== undefined ? (body.description ? String(body.description).trim() : null) : null,
        body.tags !== undefined ? (body.tags ? String(body.tags).trim() : null) : null,
        body.whatsappAiEnabled !== undefined ? (body.whatsappAiEnabled ? 1 : 0) : null,
        id,
        orgId
      );

      return {
        success: true,
        message: 'Trabalho da galeria atualizado com sucesso!',
      };
    } catch (err: any) {
      console.error('[Gallery PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar item da galeria.' });
    }
  });

  // DELETE /api/gallery/:id - Delete item with multi-tenant check
  app.delete('/gallery/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const payload = (request as any).user;
    const orgId = payload?.orgId;
    const { id } = request.params;

    try {
      const existing: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM gallery_items WHERE id = ? AND orgId = ?`, id, orgId);
      if (!existing || existing.length === 0) {
        return reply.status(404).send({ error: 'Item da galeria não encontrado nesta organização.' });
      }

      await prisma.$queryRawUnsafe(`DELETE FROM gallery_items WHERE id = ? AND orgId = ?`, id, orgId);

      return {
        success: true,
        message: 'Foto removida da galeria com sucesso.',
      };
    } catch (err: any) {
      console.error('[Gallery DELETE error]', err);
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
