import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const defaultAds = [
  {
    title: 'Garage 66 Smash Burger',
    subtitle: 'Os melhores smash burgers artesanais e carnes defumadas da região.',
    category: 'PARTNER',
    priceTag: '15% OFF NO COMBO',
    partnerMonthlyFee: 150.0,
    displayDuration: 12,
    qrCodeLabel: 'Aponte a câmera e peça com 15% OFF',
    targetUrl: 'https://wa.me/5511999990001?text=Ola!%20Vim%20pela%20TV%20da%20Barbearia%20e%20quero%20meu%20cupom%20de%2015%25%20OFF',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    title: 'Cervejas Artesanais Trincando',
    subtitle: 'Heineken, Corona Extra com Limão e Chopp Artesanal servidos no ponto.',
    category: 'BAR',
    priceTag: 'A PARTIR DE R$ 12',
    partnerMonthlyFee: 0.0,
    displayDuration: 10,
    qrCodeLabel: 'Peça no balcão ou ao seu barbeiro',
    targetUrl: 'https://wa.me/5511987654321?text=Quero%20uma%20cerveja%20gelada',
    imageUrl: 'https://images.unsplash.com/photo-1608270176766-3d7195747e44?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    title: 'Pomada Matte Alta Fixação',
    subtitle: 'Mantenha o penteado do barbeiro em casa com efeito natural sem brilho.',
    category: 'PRODUCTS',
    priceTag: 'R$ 49,90 NO CHECKOUT',
    partnerMonthlyFee: 0.0,
    displayDuration: 10,
    qrCodeLabel: 'Leve para casa no balcão de saída',
    targetUrl: 'https://barblyclub.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1597354984706-fac992d9306f?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    title: 'Old School Tattoo & Piercing',
    subtitle: 'Tatuadores premiados especializados em realismo, tradicional e blackwork.',
    category: 'PARTNER',
    priceTag: '10% OFF NO FLASH',
    partnerMonthlyFee: 200.0,
    displayDuration: 12,
    qrCodeLabel: 'Aponte para ver o portfólio no Instagram',
    targetUrl: 'https://instagram.com/oldschooltattoo',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    title: 'Wi-Fi Grátis de Alta Velocidade',
    subtitle: 'Rede: Barbly-Lounge-5G • Conexão fibra dedicada para seu conforto.',
    category: 'NOTICE',
    priceTag: '100% CORTESIA',
    partnerMonthlyFee: 0.0,
    displayDuration: 8,
    qrCodeLabel: 'Aponte a câmera para conectar sem senha',
    targetUrl: 'WIFI:S:Barbly-Lounge-5G;T:WPA;P:barbervip2026;;',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
];


import fs from 'node:fs';
import path from 'node:path';

const TV_SETTINGS_FILE = path.join(process.cwd(), 'data', 'tv_settings.json');

function loadTvSettings() {
  try {
    if (fs.existsSync(TV_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(TV_SETTINGS_FILE, 'utf-8'));
    }
  } catch {}
  return {
    barblyAdsNetworkEnabled: true,
    tvFooterText: '💼 Quer anunciar sua empresa nesta TV? Fale na recepção da barbearia',
    tvWhatsAppContact: '(31) 98210-5323',
    defaultDuration: 14,
  };
}

function saveTvSettings(data: any) {
  try {
    const dir = path.dirname(TV_SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = loadTvSettings();
    const merged = { ...current, ...data };
    fs.writeFileSync(TV_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (e) {
    console.error('Error saving tv settings:', e);
    return loadTvSettings();
  }
}

export async function tvAdsRoutes(app: FastifyInstance) {
  // GET /api/tv-ads - List active ads for the TV & Management
  app.get('/tv-ads', async (request: FastifyRequest, reply: FastifyReply) => {
    let orgId = 'org_std0cb0y';
    try {
      await request.jwtVerify();
      const payload = (request as any).user;
      if (payload?.orgId) orgId = payload.orgId;
    } catch {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) orgId = firstOrg.id;
    }

    try {
      let ads = await prisma.tvAd.findMany({
        where: { orgId },
        orderBy: { createdAt: 'asc' },
      });

      // Seed default demo ads if none exist
      if (ads.length === 0) {
        for (const ad of defaultAds) {
          await prisma.tvAd.create({
            data: {
              orgId,
              ...ad,
            },
          });
        }
        ads = await prisma.tvAd.findMany({
          where: { orgId },
          orderBy: { createdAt: 'asc' },
        });
      }

      const totalMonthlyRevenue = ads
        .filter((a) => a.active && (Number(a.partnerMonthlyFee) || 0) > 0)
        .reduce((acc, a) => acc + (Number(a.partnerMonthlyFee) || 0), 0);

      const activeCount = ads.filter((a) => a.active).length;

      return {
        ads,
        totalMonthlyRevenue,
        activeCount,
        metrics: {
          totalAds: ads.length,
          activeCount,
          partnerAdsCount: ads.filter((a) => Number(a.partnerMonthlyFee) > 0).length,
          totalMonthlyRevenue,
        },
      };
    } catch (err: any) {
      console.error('[TvAds GET error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar anúncios da TV.' });
    }
  });

  // POST /api/tv-ads - Create a new ad / partner
  app.post('/tv-ads', async (request: FastifyRequest, reply: FastifyReply) => {
    let orgId = 'org_std0cb0y';
    try {
      await request.jwtVerify();
      const payload = (request as any).user;
      if (payload?.orgId) orgId = payload.orgId;
    } catch {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) orgId = firstOrg.id;
    }

    const schema = z.object({
      title: z.string().min(2, 'Título é obrigatório'),
      subtitle: z.string().optional(),
      category: z.string().default('PARTNER'),
      mediaType: z.string().default('IMAGE'),
      imageUrl: z.string().default(''),
      videoUrl: z.string().optional(),
      targetUrl: z.string().optional(),
      qrCodeLabel: z.string().optional(),
      priceTag: z.string().optional(),
      partnerMonthlyFee: z.number().default(0),
      displayDuration: z.number().default(12),
      active: z.boolean().default(true),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.format() });
    }

    try {
      const created = await prisma.tvAd.create({
        data: {
          orgId,
          ...parsed.data,
        },
      });

      return {
        success: true,
        message: 'Anúncio cadastrado com sucesso!',
        ad: created,
      };
    } catch (err: any) {
      console.error('[TvAds POST error]', err);
      return reply.status(500).send({ error: 'Erro ao salvar anúncio.' });
    }
  });

  // PUT /api/tv-ads/:id - Update ad
  app.put('/tv-ads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      // In dev fallback, allow operation
    }

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      const updated = await prisma.tvAd.update({
        where: { id },
        data: {
          title: body.title !== undefined ? body.title : undefined,
          subtitle: body.subtitle !== undefined ? body.subtitle : undefined,
          category: body.category !== undefined ? body.category : undefined,
          mediaType: body.mediaType !== undefined ? body.mediaType : undefined,
          imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
          videoUrl: body.videoUrl !== undefined ? body.videoUrl : undefined,
          targetUrl: body.targetUrl !== undefined ? body.targetUrl : undefined,
          qrCodeLabel: body.qrCodeLabel !== undefined ? body.qrCodeLabel : undefined,
          priceTag: body.priceTag !== undefined ? body.priceTag : undefined,
          partnerMonthlyFee: body.partnerMonthlyFee !== undefined ? body.partnerMonthlyFee : undefined,
          displayDuration: body.displayDuration !== undefined ? body.displayDuration : undefined,
          active: body.active !== undefined ? body.active : undefined,
        },
      });

      return {
        success: true,
        message: 'Anúncio atualizado com sucesso!',
        ad: updated,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao atualizar anúncio.' });
    }
  });

  // DELETE /api/tv-ads/:id - Delete ad
  app.delete('/tv-ads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      // In dev fallback, allow operation
    }

    const { id } = request.params;

    try {
      await prisma.tvAd.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Anúncio removido com sucesso.',
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao remover anúncio.' });
    }
  });

  // GET /api/tv-ads/settings - Retrieve TV configuration & Barbly Ads network state
  app.get('/tv-ads/settings', async () => {
    return loadTvSettings();
  });

  // PUT /api/tv-ads/settings - Update TV configuration
  app.put('/tv-ads/settings', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {}
    const body: any = request.body || {};
    const updated = saveTvSettings(body);
    return {
      success: true,
      message: 'Configurações da TV atualizadas com sucesso!',
      settings: updated,
    };
  });

}
