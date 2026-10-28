import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const defaultAds = [
  {
    title: 'Garage 66 Smash Burger',
    subtitle: 'Os melhores smash burgers artesanais e carnes defumadas da região.',
    category: 'ALIMENTACAO',
    priceTag: '15% OFF NO COMBO',
    partnerMonthlyFee: 150.0,
    displayDuration: 14,
    qrCodeLabel: 'Aponte a câmera e peça com 15% OFF',
    targetUrl: 'https://wa.me/5511999990001?text=Ola!%20Vim%20pela%20TV%20da%20Barbearia%20e%20quero%20meu%20cupom%20de%2015%25%20OFF',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    videoUrl: '/videos/sample.mp4',
    mediaType: 'VIDEO',
    active: true,
  },
  {
    title: 'Cervejas Artesanais Trincando',
    subtitle: 'Heineken, Corona Extra com Limão e Chopp Artesanal servidos no ponto.',
    category: 'BEBIDAS',
    priceTag: 'A PARTIR DE R$ 12',
    partnerMonthlyFee: 0.0,
    displayDuration: 12,
    qrCodeLabel: 'Peça no balcão ou ao seu barbeiro',
    targetUrl: 'https://wa.me/5511987654321?text=Quero%20uma%20cerveja%20gelada',
    imageUrl: 'https://images.unsplash.com/photo-1608270176766-3d7195747e44?auto=format&fit=crop&w=900&q=80',
    mediaType: 'IMAGE',
    active: true,
  },
  {
    title: 'Pomada Matte Barbly Club',
    subtitle: 'Mantenha o penteado do barbeiro em casa com efeito natural sem brilho.',
    category: 'BARBEARIA',
    priceTag: 'R$ 49,90 NO CHECKOUT',
    partnerMonthlyFee: 0.0,
    displayDuration: 10,
    qrCodeLabel: 'Leve para casa no balcão de saída',
    targetUrl: 'https://barblyclub.com.br',
    imageUrl: 'https://images.unsplash.com/photo-1597354984706-fac992d9306f?auto=format&fit=crop&w=900&q=80',
    mediaType: 'IMAGE',
    active: true,
  },
  {
    title: 'Old School Tattoo & Piercing',
    subtitle: 'Tatuadores premiados especializados em realismo, tradicional e blackwork.',
    category: 'TATUAGEM',
    priceTag: '10% OFF NO FLASH',
    partnerMonthlyFee: 200.0,
    displayDuration: 14,
    qrCodeLabel: 'Aponte para ver o portfólio no Instagram',
    targetUrl: 'https://instagram.com/oldschooltattoo',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80',
    videoUrl: '/videos/sample.mp4',
    mediaType: 'VIDEO',
    active: true,
  },
  {
    title: 'Wi-Fi Grátis de Alta Velocidade',
    subtitle: 'Rede: Barbly-Lounge-5G • Conexão fibra dedicada para seu conforto.',
    category: 'OUTROS',
    priceTag: '100% CORTESIA',
    partnerMonthlyFee: 0.0,
    displayDuration: 8,
    qrCodeLabel: 'Aponte a câmera para conectar sem senha',
    targetUrl: 'WIFI:S:Barbly-Lounge-5G;T:WPA;P:barbervip2026;;',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=80',
    mediaType: 'IMAGE',
    active: true,
  },
];

const defaultTvSettings = {
  barblyAdsNetworkEnabled: true,
  tvFooterText: '💼 Quer anunciar sua empresa nesta TV? Fale na recepção da barbearia',
  tvWhatsAppContact: '(31) 98210-5323',
  defaultDuration: 14,
};

async function getOrgTvSettings(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { tvSettings: true, phone: true },
  });
  if (!org) return defaultTvSettings;
  const custom = (org.tvSettings as Record<string, any>) || {};
  return {
    ...defaultTvSettings,
    tvWhatsAppContact: org.phone || defaultTvSettings.tvWhatsAppContact,
    ...custom,
  };
}

async function updateOrgTvSettings(orgId: string, newSettings: Record<string, any>) {
  const current = await getOrgTvSettings(orgId);
  const merged = { ...current, ...newSettings };
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      tvSettings: merged,
    },
  });
  return merged;
}

async function getTvLoungeChairsAndQueue(orgId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const barbers = await prisma.barberProfile.findMany({
    where: { orgId, active: true },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      orgId,
      startsAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      customer: { select: { name: true, isVipMember: true } },
      service: { select: { name: true } },
    },
    orderBy: { startsAt: 'asc' },
  });

  const chairs = barbers.map((barber) => {
    const currentApt = todayAppointments.find((a) => {
      if (a.barberId !== barber.id) return false;
      if (a.status === 'IN_PROGRESS') return true;
      const sTime = new Date(a.startsAt).getTime();
      const eTime = new Date(a.endsAt).getTime();
      const nTime = now.getTime();
      return a.status === 'CONFIRMED' && nTime >= sTime && nTime <= eTime;
    });

    const nextApt = todayAppointments.find((a) => {
      if (a.barberId !== barber.id) return false;
      if (a.status !== 'CONFIRMED' && a.status !== 'PENDING_PAYMENT') return false;
      return new Date(a.startsAt).getTime() > now.getTime();
    });

    let currentDetails = null;
    if (currentApt) {
      const start = new Date(currentApt.startsAt);
      const end = new Date(currentApt.endsAt);
      const totalDurationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      const elapsedMinutes = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000));
      const remainingMinutes = Math.max(0, totalDurationMinutes - elapsedMinutes);
      const progressPercent = Math.min(100, Math.round((elapsedMinutes / totalDurationMinutes) * 100));

      const parts = currentApt.customer.name.trim().split(' ');
      const safeName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

      currentDetails = {
        id: currentApt.id,
        clientName: safeName,
        isVipMember: currentApt.customer.isVipMember,
        serviceName: currentApt.service.name,
        startsAt: currentApt.startsAt,
        endsAt: currentApt.endsAt,
        elapsedMinutes,
        remainingMinutes,
        progressPercent,
      };
    }

    let nextDetails = null;
    if (nextApt) {
      const nStart = new Date(nextApt.startsAt);
      const parts = nextApt.customer.name.trim().split(' ');
      const safeName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      nextDetails = {
        id: nextApt.id,
        startsAt: nextApt.startsAt,
        time: nStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        clientName: safeName,
        serviceName: nextApt.service.name,
      };
    }

    const chairStatus = currentDetails ? 'OCCUPIED' : 'AVAILABLE';
    const chairStatusLabel = currentDetails ? 'Em Atendimento' : 'Disponível • Livre';

    return {
      barberId: barber.id,
      barberName: barber.user.name,
      nickname: barber.chair || barber.user.name.split(' ')[0],
      avatarUrl: barber.user.avatarUrl || '',
      chair: barber.chair || 'Cadeira 01',
      status: chairStatus,
      statusLabel: chairStatusLabel,
      currentAppointment: currentDetails,
      nextAppointment: nextDetails,
    };
  });

  const upcomingQueue = todayAppointments
    .filter((a) => (a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT') && new Date(a.startsAt).getTime() >= now.getTime())
    .slice(0, 5)
    .map((a) => {
      const parts = a.customer.name.trim().split(' ');
      const safeName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      return {
        id: a.id,
        clientName: safeName,
        serviceName: a.service.name,
        time: new Date(a.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
    });

  return { chairs, upcomingQueue };
}

export async function tvAdsRoutes(app: FastifyInstance) {
  // Helper to get authenticated orgId
  const getAuthOrgId = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    try {
      await request.jwtVerify();
      const payload = (request as any).user;
      if (payload?.orgId) return payload.orgId;
    } catch {}

    // In dev environment only, allow fallback if single org exists
    if (process.env.NODE_ENV !== 'production') {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      if (firstOrg) return firstOrg.id;
    }

    reply.status(401).send({ error: 'Não autorizado. Faça login para continuar.' });
    return null;
  };

  // GET /api/tv-ads - List active ads for the TV & Management
  app.get('/tv-ads', async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

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
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

    const schema = z.object({
      title: z.string().min(2, 'Título é obrigatório'),
      subtitle: z.string().optional(),
      category: z.string().default('ALIMENTACAO'),
      mediaType: z.string().default('VIDEO'),
      imageUrl: z.string().default(''),
      videoUrl: z.string().optional(),
      targetUrl: z.string().optional(),
      qrCodeLabel: z.string().optional(),
      priceTag: z.string().optional(),
      partnerMonthlyFee: z.number().default(0),
      displayDuration: z.number().default(14),
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

  // PUT /api/tv-ads/:id - Update ad with multi-tenant check
  app.put('/tv-ads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

    const { id } = request.params;
    const body: any = request.body || {};

    try {
      const existing = await prisma.tvAd.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Anúncio não encontrado nesta organização.' });
      }

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
      console.error('[TvAds PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao atualizar anúncio.' });
    }
  });

  // DELETE /api/tv-ads/:id - Delete ad with multi-tenant check
  app.delete('/tv-ads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

    const { id } = request.params;

    try {
      const existing = await prisma.tvAd.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Anúncio não encontrado nesta organização.' });
      }

      await prisma.tvAd.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Anúncio removido com sucesso.',
      };
    } catch (err: any) {
      console.error('[TvAds DELETE error]', err);
      return reply.status(500).send({ error: 'Erro ao remover anúncio.' });
    }
  });

  // GET /api/tv-ads/settings - Retrieve TV configuration from DB
  app.get('/tv-ads/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

    try {
      const settings = await getOrgTvSettings(orgId);
      return settings;
    } catch (err) {
      return defaultTvSettings;
    }
  });

  // PUT /api/tv-ads/settings - Update TV configuration in DB
  app.put('/tv-ads/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = await getAuthOrgId(request, reply);
    if (!orgId) return;

    try {
      const body: any = request.body || {};
      const updated = await updateOrgTvSettings(orgId, body);
      return {
        success: true,
        message: 'Configurações da TV atualizadas com sucesso!',
        settings: updated,
      };
    } catch (err: any) {
      console.error('[TvAds Settings PUT error]', err);
      return reply.status(500).send({ error: 'Erro ao salvar configurações da TV.' });
    }
  });

  // =========================================================================
  // PUBLIC KIOSK TV PLAYER ENDPOINT (NO AUTH REQUIRED - SAFE FOR SMART TVS)
  // GET /api/public/tv/:slug
  // =========================================================================
  app.get('/public/tv/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const { slug } = request.params;

    try {
      let org = await prisma.organization.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          themeColor: true,
          phone: true,
          tvSettings: true,
        },
      });

      // Fallback: try find by id or first org
      if (!org) {
        org = await prisma.organization.findFirst({
          where: { OR: [{ id: slug }, { slug: 'atelier88' }] },
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            themeColor: true,
            phone: true,
            tvSettings: true,
          },
        });
      }

      if (!org) {
        org = await prisma.organization.findFirst({
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            themeColor: true,
            phone: true,
            tvSettings: true,
          },
        });
      }

      if (!org) {
        return reply.status(404).send({ error: 'Barbearia não encontrada.' });
      }

      // Load active ads for this org
      let ads = await prisma.tvAd.findMany({
        where: { orgId: org.id, active: true },
        orderBy: { createdAt: 'asc' },
      });

      if (ads.length === 0) {
        // Seed default ads if empty
        for (const ad of defaultAds) {
          await prisma.tvAd.create({
            data: {
              orgId: org.id,
              ...ad,
            },
          });
        }
        ads = await prisma.tvAd.findMany({
          where: { orgId: org.id, active: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      const tvSettings = await getOrgTvSettings(org.id);
      const { chairs, upcomingQueue } = await getTvLoungeChairsAndQueue(org.id);

      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl,
          themeColor: org.themeColor,
          phone: org.phone,
        },
        tvSettings,
        ads,
        chairs,
        upcomingQueue,
      };
    } catch (err: any) {
      console.error('[Public TV GET error]', err);
      return reply.status(500).send({ error: 'Erro ao carregar dados do visor da TV.' });
    }
  });
}
