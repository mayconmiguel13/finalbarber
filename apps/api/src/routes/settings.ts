import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asaasService } from '../services/asaasService.js';

// Default opening hours schedule (Monday to Sunday)
export const defaultOpeningHours = {
  monday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  tuesday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  thursday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  friday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  saturday: { open: '08:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  sunday: { open: '09:00', close: '14:00', lunchStart: '', lunchEnd: '', closed: true },
};

// Default payment and card fees for barbershops
export const defaultPaymentFees = {
  pixFeePercent: 0,
  debitFeePercent: 1.4,
  creditFeePercent: 3.2,
  deductFeeFromSplit: true,
};

// Default booking policies and house rules
export const defaultBookingPolicies = {
  minAdvanceMinutes: 30,
  maxAdvanceDays: 30,
  chairCleanupMinutes: 5,
  cancelNoticeHours: 2,
  welcomeMessage: 'Bem-vindo ao nosso espaço! Chegue com 5 minutos de antecedência. Café e Wi-Fi de cortesia disponíveis.',
  aiTone: 'MODERN',
  aiCustomPrompt: '',
  metaPixelId: '',
  googleAnalyticsId: '',
};

export async function settingsRoutes(app: FastifyInstance) {
  const settingsUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),
    document: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    logoUrl: z.string().optional().nullable(),

    // Endereço
    postalCode: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    addressNumber: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    complement: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),

    // Visual
    themeColor: z.enum(['gold', 'blue', 'emerald', 'copper']).default('gold'),
    themeMode: z.enum(['dark', 'light']).default('dark'),

    // Regras de Pagamento & Anti No-Show
    onlinePaymentEnabled: z.boolean().default(true),
    autoSplitEnabled: z.boolean().default(true),
    onlineDiscountActive: z.boolean().default(true),
    onlineDiscountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
    onlineDiscountValue: z.number().default(10),
    toleranceMinutes: z.number().min(0).max(60).default(15),

    // Gateway Asaas & Subcontas
    asaasApiKey: z.string().optional().nullable(),
    asaasEnvironment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    asaasWalletId: z.string().optional().nullable(),

    // Chave Pix Direta
    pixKey: z.string().optional().nullable(),
    pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']).optional().nullable(),

    // Horários de Funcionamento
    openingHours: z.record(z.any()).optional().nullable(),

    // Políticas de Agendamento
    bookingPolicies: z.object({
      minAdvanceMinutes: z.number().min(0).max(1440).default(30),
      maxAdvanceDays: z.number().min(1).max(365).default(30),
      chairCleanupMinutes: z.number().min(0).max(60).default(5),
      cancelNoticeHours: z.number().min(0).max(72).default(2),
      welcomeMessage: z.string().max(500).optional().nullable(),
      aiTone: z.enum(['CLASSIC', 'MODERN', 'URBAN']).default('MODERN').optional(),
      aiCustomPrompt: z.string().max(500).optional().nullable(),
      metaPixelId: z.string().max(100).optional().nullable(),
      googleAnalyticsId: z.string().max(100).optional().nullable(),
    }).optional().nullable(),

    // Taxas de Cartão & Operadora (Adquirência)
    paymentFees: z.object({
      pixFeePercent: z.number().min(0).max(100).default(0),
      debitFeePercent: z.number().min(0).max(100).default(1.4),
      creditFeePercent: z.number().min(0).max(100).default(3.2),
      deductFeeFromSplit: z.boolean().default(true),
    }).optional().nullable(),
  });

  // GET /api/settings/:orgId
  app.get('/settings/:orgId', async (request: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
    const { orgId } = request.params;

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        return reply.status(404).send({ error: 'Organização não encontrada.' });
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        document: org.document || '',
        phone: org.phone || '',
        ownerName: org.ownerName || '',
        logoUrl: org.logoUrl || '',
        postalCode: org.postalCode || '',
        address: org.address || '',
        addressNumber: org.addressNumber || '',
        neighborhood: org.neighborhood || '',
        complement: org.complement || '',
        city: org.city || '',
        state: org.state || '',
        themeColor: org.themeColor || 'gold',
        themeMode: org.themeMode || 'dark',
        onlinePaymentEnabled: org.onlinePaymentEnabled ?? true,
        autoSplitEnabled: org.autoSplitEnabled ?? true,
        onlineDiscountActive: org.onlineDiscountActive ?? true,
        onlineDiscountType: org.onlineDiscountType || 'PERCENTAGE',
        onlineDiscountValue: Number(org.onlineDiscountValue) || 10,
        toleranceMinutes: org.toleranceMinutes ?? 15,
        asaasApiKey: org.asaasApiKey || '',
        asaasEnvironment: org.asaasEnvironment || 'SANDBOX',
        asaasWalletId: org.asaasWalletId || '',
        pixKey: org.pixKey || '',
        pixKeyType: org.pixKeyType || 'PHONE',
        openingHours: org.openingHours || defaultOpeningHours,
        bookingPolicies: org.bookingPolicies || defaultBookingPolicies,
        paymentFees: org.paymentFees || defaultPaymentFees,
        planStatus: org.planStatus,
        planTier: org.planTier,
        trialEndsAt: org.trialEndsAt,
      };
    } catch (err: any) {
      console.error('[Settings GET Error]', err);
      return reply.status(500).send({ error: 'Erro ao buscar configurações no banco de dados.' });
    }
  });

  // PATCH /api/settings/:orgId
  app.patch('/settings/:orgId', async (request: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
    const { orgId } = request.params;

    const parse = settingsUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const data = parse.data;

    try {
      const updated = await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          slug: data.slug !== undefined ? data.slug : undefined,
          document: data.document !== undefined ? data.document : undefined,
          phone: data.phone || undefined,
          ownerName: data.ownerName !== undefined ? data.ownerName : undefined,
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
          postalCode: data.postalCode !== undefined ? data.postalCode : undefined,
          address: data.address !== undefined ? data.address : undefined,
          addressNumber: data.addressNumber !== undefined ? data.addressNumber : undefined,
          neighborhood: data.neighborhood !== undefined ? data.neighborhood : undefined,
          complement: data.complement !== undefined ? data.complement : undefined,
          city: data.city !== undefined ? data.city : undefined,
          state: data.state !== undefined ? data.state : undefined,
          themeColor: data.themeColor,
          themeMode: data.themeMode,
          onlinePaymentEnabled: data.onlinePaymentEnabled,
          autoSplitEnabled: data.autoSplitEnabled,
          onlineDiscountActive: data.onlineDiscountActive,
          onlineDiscountType: data.onlineDiscountType,
          onlineDiscountValue: data.onlineDiscountValue,
          toleranceMinutes: data.toleranceMinutes,
          asaasApiKey: data.asaasApiKey !== undefined ? data.asaasApiKey : undefined,
          asaasEnvironment: data.asaasEnvironment !== undefined ? data.asaasEnvironment : undefined,
          asaasWalletId: data.asaasWalletId !== undefined ? data.asaasWalletId : undefined,
          pixKey: data.pixKey !== undefined ? data.pixKey : undefined,
          pixKeyType: data.pixKeyType !== undefined ? data.pixKeyType : undefined,
          openingHours: data.openingHours !== undefined ? (data.openingHours as any) : undefined,
          bookingPolicies: data.bookingPolicies !== undefined ? (data.bookingPolicies as any) : undefined,
          paymentFees: data.paymentFees !== undefined ? (data.paymentFees as any) : undefined,
        },
      });

      return {
        success: true,
        message: 'Configurações da barbearia salvas com sucesso no banco de dados!',
        settings: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          document: updated.document,
          phone: updated.phone,
          ownerName: updated.ownerName,
          logoUrl: updated.logoUrl,
          postalCode: updated.postalCode,
          address: updated.address,
          addressNumber: updated.addressNumber,
          neighborhood: updated.neighborhood,
          complement: updated.complement,
          city: updated.city,
          state: updated.state,
          themeColor: updated.themeColor,
          themeMode: updated.themeMode,
          onlinePaymentEnabled: updated.onlinePaymentEnabled,
          autoSplitEnabled: updated.autoSplitEnabled,
          onlineDiscountActive: updated.onlineDiscountActive,
          onlineDiscountType: updated.onlineDiscountType,
          onlineDiscountValue: Number(updated.onlineDiscountValue),
          toleranceMinutes: updated.toleranceMinutes,
          asaasApiKey: updated.asaasApiKey,
          asaasEnvironment: updated.asaasEnvironment,
          asaasWalletId: updated.asaasWalletId,
          pixKey: updated.pixKey,
          pixKeyType: updated.pixKeyType,
          openingHours: updated.openingHours || defaultOpeningHours,
          bookingPolicies: updated.bookingPolicies || defaultBookingPolicies,
          paymentFees: updated.paymentFees || defaultPaymentFees,
        },
      };
    } catch (err: any) {
      console.error('[Settings PATCH Error]', err);
      return reply.status(500).send({ error: 'Erro ao salvar configurações no banco de dados.' });
    }
  });

  // POST /api/settings/:orgId/test-asaas
  app.post('/settings/:orgId/test-asaas', async (request: FastifyRequest<{
    Params: { orgId: string };
    Body: { apiKey?: string; environment?: 'SANDBOX' | 'PRODUCTION' };
  }>, reply: FastifyReply) => {
    const { orgId } = request.params;
    const body = request.body || {};

    let apiKey = body.apiKey;
    let environment = body.environment || 'SANDBOX';

    // If not provided in body, load from organization
    if (!apiKey) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { asaasApiKey: true, asaasEnvironment: true },
      });
      apiKey = org?.asaasApiKey || undefined;
      environment = (org?.asaasEnvironment as any) || environment;
    }

    if (!apiKey || !apiKey.trim()) {
      return reply.status(400).send({
        success: false,
        error: 'Chave de API não informada nem configurada na barbearia.',
      });
    }

    const result = await asaasService.testConnection(apiKey, environment);
    if (!result.success) {
      return reply.status(400).send(result);
    }

    return result;
  });
}
