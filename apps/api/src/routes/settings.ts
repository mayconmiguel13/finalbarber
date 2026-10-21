import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function settingsRoutes(app: FastifyInstance) {
  // Mock in-memory or database organization settings
  const settingsSchema = z.object({
    themeColor: z.enum(['gold', 'blue', 'emerald', 'copper']).default('gold'),
    themeMode: z.enum(['dark', 'light']).default('dark'),
    onlineDiscountActive: z.boolean().default(true),
    onlineDiscountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
    onlineDiscountValue: z.number().default(10),
  });

  // GET /api/settings/:orgId
  app.get('/settings/:orgId', async (request, reply) => {
    return {
      themeColor: 'gold',
      themeMode: 'dark',
      onlineDiscountActive: true,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
    };
  });

  // PATCH /api/settings/:orgId
  app.patch('/settings/:orgId', async (request, reply) => {
    const parse = settingsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    return {
      success: true,
      settings: parse.data,
      message: 'Configurações atualizadas com sucesso.',
    };
  });
}
