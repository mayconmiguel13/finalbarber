import dotenv from 'dotenv';
dotenv.config();
import { calculateSplit } from './splitCalculator.js';
import { prisma } from '../db.js';

export interface MessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiSession {
  clientPhone: string;
  clientName?: string;
  selectedServiceId?: string;
  selectedBarberId?: string;
  selectedTime?: string;
  selectedDate?: 'today' | 'tomorrow';
  stage: 'GREETING' | 'CHOOSING_SERVICE' | 'CHOOSING_BARBER' | 'CHOOSING_TIME' | 'CONFIRMING' | 'BOOKED';
  history: MessageContext[];
}

export function detectDateIntent(text: string): 'today' | 'tomorrow' | null {
  const lower = text.toLowerCase();
  if (lower.includes('amanh') || lower.includes('amanha')) {
    return 'tomorrow';
  }
  if (lower.includes('não') && (lower.includes('para hoje') || lower.includes('pra hoje') || lower.includes('de hoje') || lower.includes('é hoje') || lower.includes('e hoje'))) {
    return 'tomorrow';
  }
  if (lower.includes('hoje') || lower.includes('hj')) {
    return 'today';
  }
  return null;
}

export function getCalendarDate(target: 'today' | 'tomorrow' | string = 'today') {
  const isTomorrow = target === 'tomorrow' || target.includes('24') || target.toLowerCase().includes('amanh');
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (isTomorrow ? 1 : 0));
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const isoDate = `${year}-${month}-${day}`;
  const formattedDate = `${day}/${month}/${year}`;
  const shortDate = `${day}/${month}`;
  const prefix = isTomorrow ? 'Amanhã' : 'Hoje';

  return {
    isTomorrow,
    target: isTomorrow ? ('tomorrow' as const) : ('today' as const),
    isoDate,
    formattedDate,
    shortDate,
    fullLabel: `${prefix} (${formattedDate})`,
    displayLabel: `${prefix}, ${shortDate}`,
    targetDateObj: d,
  };
}

export function getDateLabel(date?: 'today' | 'tomorrow' | string): string {
  const cal = getCalendarDate(date || 'today');
  return cal.fullLabel;
}

// In-memory sessions store indexed by clean phone number
const sessions = new Map<string, AiSession>();

// Services Database (Default + DB Fallback)
export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export const defaultServicesDb: ServiceItem[] = [
  { id: '1', name: 'Fade Navalhado / Degradê', price: 50.0, duration: 40 },
  { id: '2', name: 'Barboterapia com Toalha Quente', price: 45.0, duration: 30 },
  { id: '3', name: 'Combo Completo (Cabelo + Barba)', price: 85.0, duration: 60 },
  { id: '4', name: 'Corte Clássico na Tesoura', price: 55.0, duration: 45 },
  { id: '5', name: 'Alinhamento & Pigmentação', price: 35.0, duration: 25 },
];

export let servicesDb: ServiceItem[] = [...defaultServicesDb];

// Barbers Database (Default + DB Fallback)
export interface BarberProfile {
  id: string;
  name: string;
  nickname: string;
  chair: string;
  specialties: string;
  photo: string;
}

export const defaultBarbersDb: BarberProfile[] = [
  {
    id: '1',
    name: 'Diego Santos',
    nickname: 'Fade Master',
    chair: 'Cadeira 1',
    specialties: 'Degradê Navalhado, Fade Moderno & Barboterapia',
    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '2',
    name: 'Lucas Lima',
    nickname: 'Navalha de Ouro',
    chair: 'Cadeira 2',
    specialties: 'Corte Clássico na Tesoura, Barba Terapia & Pigmentação',
    photo: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600',
  },
];

export let barbersDb: BarberProfile[] = [...defaultBarbersDb];

/**
 * Dynamically queries active services from Prisma database with fallback to default services
 */
export async function getDynamicServices(): Promise<ServiceItem[]> {
  try {
    const rows = await prisma.service.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    if (rows && rows.length > 0) {
      servicesDb = rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        duration: r.durationMinutes,
      }));
      return servicesDb;
    }
  } catch (err) {
    // MySQL offline or empty
  }
  servicesDb = [...defaultServicesDb];
  return servicesDb;
}

/**
 * Dynamically queries active barbers from Prisma database with fallback to default barbers
 */
export async function getDynamicBarbers(): Promise<BarberProfile[]> {
  try {
    const rows = await prisma.barberProfile.findMany({
      where: { active: true },
      include: { user: true },
    });
    if (rows && rows.length > 0) {
      barbersDb = rows.map((b, idx) => ({
        id: b.id,
        name: b.user?.name || `Barbeiro ${idx + 1}`,
        nickname: b.nickname || `Cadeira ${idx + 1}`,
        chair: `Cadeira ${idx + 1}`,
        specialties: b.bio || 'Especialista em Corte & Barba',
        photo: b.user?.avatarUrl || defaultBarbersDb[idx % defaultBarbersDb.length].photo,
      }));
      return barbersDb;
    }
  } catch (err) {
    // MySQL offline or empty
  }
  barbersDb = [...defaultBarbersDb];
  return barbersDb;
}

/**
 * Performs Customer upsert in Prisma and local memory store
 */
export async function upsertCustomer(phone: string, name?: string, photo?: string) {
  const cleanPhone = phone.replace(/\D/g, '') || phone;
  const customerName = (name && name.trim() && name !== 'Cliente') 
    ? name.trim() 
    : `Cliente ${cleanPhone.slice(-4)}`;

  try {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Atelier 88 Barber Lounge',
          slug: 'atelier88',
          phone: '+55 11 98765-4321',
        },
      }).catch(() => null);
    }

    if (org) {
      await prisma.customer.upsert({
        where: {
          orgId_phone: {
            orgId: org.id,
            phone: cleanPhone,
          },
        },
        update: {
          name: (name && name !== 'Cliente') ? name : undefined,
        },
        create: {
          orgId: org.id,
          phone: cleanPhone,
          name: customerName,
        },
      });
    }
  } catch (err) {
    // Fallback if MySQL is offline
  }
}

/**
 * Confirms appointment in Prisma with status CONFIRMED and creates Transaction with Lei do Salão-Parceiro split
 */
export async function confirmarAgendamentoNoBanco(params: {
  customerPhone: string;
  customerName?: string;
  serviceIdOrName: string;
  barberIdOrName: string;
  time: string;
  date: 'today' | 'tomorrow' | string;
  paymentMethod: 'PIX' | 'COUNTER' | 'CASH' | 'CREDIT_CARD';
}) {
  const cleanPhone = params.customerPhone.replace(/\D/g, '') || params.customerPhone;
  const cal = getCalendarDate(params.date);
  const [h, m] = params.time.split(':').map(Number);
  const startsAt = new Date(cal.targetDateObj.getFullYear(), cal.targetDateObj.getMonth(), cal.targetDateObj.getDate(), h, m, 0, 0);

  // 1. Refresh dynamic lists
  const currentServices = await getDynamicServices();
  const currentBarbers = await getDynamicBarbers();

  // 2. Map service
  const srv = currentServices.find(
    (s) => s.id === params.serviceIdOrName || s.name.toLowerCase().includes(params.serviceIdOrName.toLowerCase())
  ) || currentServices[0];

  // 3. Map barber
  const brb = currentBarbers.find(
    (b) => b.id === params.barberIdOrName || b.name.toLowerCase().includes(params.barberIdOrName.toLowerCase())
  ) || currentBarbers[0];

  const durationMinutes = srv.duration || 45;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

  const isPix = params.paymentMethod === 'PIX';
  const split = calculateSplit({
    servicePrice: srv.price,
    onlineDiscountActive: isPix,
    onlineDiscountType: 'PERCENTAGE',
    onlineDiscountValue: 10,
    barberCommissionRate: 50,
    platformFee: 1.49,
    gatewayCost: 0.99,
  });

  const pixCode = isPix ? makePix(split.finalPrice) : null;
  const paymentMethodLabel = isPix 
    ? `Pix 10% OFF (R$ ${split.finalPrice.toFixed(2)})` 
    : `No balcão (R$ ${srv.price.toFixed(2)})`;

  // 4. Update in-memory / local slots store
  const existingSlot = bookedSlotsStore.find(
    (b) => b.barberId === brb.id && b.time === params.time && (b.dateStr === cal.isoDate || b.date === cal.target)
  );

  if (!existingSlot) {
    bookedSlotsStore.push({
      barberId: brb.id,
      time: params.time,
      date: cal.target,
      dateStr: cal.isoDate,
      dateLabel: cal.fullLabel,
      customerPhone: cleanPhone,
      serviceName: srv.name,
      price: split.finalPrice,
      paymentMethod: paymentMethodLabel,
    });
  } else {
    existingSlot.customerPhone = cleanPhone;
    existingSlot.serviceName = srv.name;
    existingSlot.price = split.finalPrice;
    existingSlot.paymentMethod = paymentMethodLabel;
  }

  // 5. Persist to Prisma with status CONFIRMED and create Transaction with split
  try {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Atelier 88 Barber Lounge',
          slug: 'atelier88',
          phone: '+55 11 98765-4321',
        },
      });
    }

    // Upsert Customer
    let customer = await prisma.customer.findFirst({
      where: {
        orgId: org.id,
        phone: cleanPhone,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          orgId: org.id,
          phone: cleanPhone,
          name: params.customerName || `Cliente ${cleanPhone.slice(-4)}`,
        },
      });
    }

    // Resolve real Service ID in Prisma
    let realService = await prisma.service.findFirst({
      where: {
        orgId: org.id,
        OR: [
          { id: srv.id },
          { name: { contains: srv.name } },
        ],
      },
    });

    if (!realService) {
      realService = await prisma.service.create({
        data: {
          orgId: org.id,
          name: srv.name,
          price: srv.price,
          durationMinutes: srv.duration,
        },
      });
    }

    // Resolve real BarberProfile ID in Prisma
    let realBarber = await prisma.barberProfile.findFirst({
      where: {
        orgId: org.id,
        OR: [
          { id: brb.id },
          { nickname: { contains: brb.nickname } },
          { user: { name: { contains: brb.name } } },
        ],
      },
      include: { user: true },
    });

    if (!realBarber) {
      let user = await prisma.user.findFirst({
        where: { orgId: org.id, role: 'BARBER' },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            orgId: org.id,
            name: brb.name,
            email: `barber-${Date.now()}@atelier88.com`,
            passwordHash: 'hashed_pw',
            role: 'BARBER',
          },
        });
      }
      realBarber = await prisma.barberProfile.create({
        data: {
          orgId: org.id,
          userId: user.id,
          nickname: brb.nickname,
          commissionRate: 50.0,
        },
        include: { user: true },
      });
    }

    // Create Appointment with status CONFIRMED
    const appointment = await prisma.appointment.create({
      data: {
        orgId: org.id,
        barberId: realBarber.id,
        customerId: customer.id,
        serviceId: realService.id,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
        origin: 'WHATSAPP_AI',
        originalPrice: split.originalPrice,
        discountAmount: split.discountAmount,
        finalPrice: split.finalPrice,
        notes: `Agendado via IA WhatsApp Sofia. Forma de pagamento: ${paymentMethodLabel}`,
      },
    });

    // Create Transaction with Lei do Salão-Parceiro split
    await prisma.transaction.create({
      data: {
        orgId: org.id,
        appointmentId: appointment.id,
        paymentMethod: isPix ? 'PIX' : 'CASH',
        status: 'PENDING',
        grossAmount: split.finalPrice,
        salonShare: split.salonShare,
        barberShare: split.barberShare,
        platformFee: split.platformFee,
        gatewayFee: split.gatewayFee,
        pixCopiaCola: pixCode,
      },
    });

    console.log(`[aiAgent] Appointment ${appointment.id} CONFIRMED & Transaction created with split (Salon: R$ ${split.salonShare}, Barber: R$ ${split.barberShare})`);
  } catch (err) {
    console.warn('[aiAgent] Prisma appointment/transaction creation offline/skipped:', err);
  }

  return {
    success: true,
    split,
    pixCopiaCola: pixCode,
    startsAt,
    endsAt,
    serviceName: srv.name,
    barberName: brb.name,
    calendarDate: cal.fullLabel,
  };
}

// -------------------------------------------------------------
// REAL DATABASE VALIDATION & BOOKED SLOTS TRACKER
// Prevents hallucinations, double-booking, and invalid times
// -------------------------------------------------------------
interface BookedSlot {
  barberId: string;
  time: string;
  date: 'today' | 'tomorrow';
  dateStr: string;   // ISO "2026-10-24" or "2026-10-23"
  dateLabel: string; // "Amanhã (24/10/2026)" or "Hoje (23/10/2026)"
  customerPhone: string;
  serviceName?: string;
  price?: number;
  paymentMethod?: string;
}

const calToday = getCalendarDate('today');
const calTomorrow = getCalendarDate('tomorrow');

// Initial booked slots to demonstrate real schedule collision prevention
export const bookedSlotsStore: BookedSlot[] = [
  { barberId: '1', time: '14:00', date: 'today', dateStr: calToday.isoDate, dateLabel: calToday.fullLabel, customerPhone: '5511999990001', serviceName: 'Fade Navalhado / Degradê' },
  { barberId: '2', time: '16:00', date: 'today', dateStr: calToday.isoDate, dateLabel: calToday.fullLabel, customerPhone: '5511999990002', serviceName: 'Fade Navalhado / Degradê' },
];

/**
 * Validates real schedule against database and existing bookings for that calendar date.
 */
export async function getRealAvailableSlots(barberId: string, date: 'today' | 'tomorrow' | string = 'today') {
  const cal = getCalendarDate(date);
  const baseSlots = {
    morning: ['09:30', '10:15', '11:00'],
    afternoon: ['14:00', '14:45', '15:30', '16:15', '17:00'],
    night: ['18:00', '18:45', '19:30'],
  };

  // Try reading from MySQL Prisma if available
  let dbOccupiedTimes: string[] = [];
  try {
    const startOfDay = new Date(cal.targetDateObj.getFullYear(), cal.targetDateObj.getMonth(), cal.targetDateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(cal.targetDateObj.getFullYear(), cal.targetDateObj.getMonth(), cal.targetDateObj.getDate(), 23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { startsAt: true },
    });
    dbOccupiedTimes = appointments.map((a) => {
      const d = new Date(a.startsAt);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
  } catch (err) {
    // If DB is offline or not migrated yet, use in-memory store
  }

  // Filter out any booked slots for this barber on this date
  const isSlotFree = (t: string) => {
    if (dbOccupiedTimes.includes(t)) return false;
    return !bookedSlotsStore.some(
      (b) => b.barberId === barberId && b.time === t && (b.dateStr === cal.isoDate || b.date === cal.target)
    );
  };

  return {
    morning: baseSlots.morning.filter(isSlotFree),
    afternoon: baseSlots.afternoon.filter(isSlotFree),
    night: baseSlots.night.filter(isSlotFree),
  };
}

/**
 * Locks an appointment slot in the database store with exact calendar date.
 * Returns true if locked successfully, false if already taken.
 */
export async function lockSlotInDatabase(
  barberId: string, 
  time: string, 
  date: 'today' | 'tomorrow' | string, 
  customerPhone: string,
  extraDetails?: { serviceName?: string; price?: number; paymentMethod?: string }
): Promise<boolean> {
  const cal = getCalendarDate(date);

  // Check collision
  const alreadyBooked = bookedSlotsStore.some(
    (b) => b.barberId === barberId && b.time === time && (b.dateStr === cal.isoDate || b.date === cal.target)
  );
  if (alreadyBooked) {
    return false;
  }

  bookedSlotsStore.push({
    barberId,
    time,
    date: cal.target,
    dateStr: cal.isoDate,
    dateLabel: cal.fullLabel,
    customerPhone,
    serviceName: extraDetails?.serviceName || 'Fade Navalhado / Degradê',
    price: extraDetails?.price || 50,
    paymentMethod: extraDetails?.paymentMethod || 'No balcão (presencial)',
  });

  // Also record in Prisma if MySQL is active
  try {
    const [h, m] = time.split(':').map(Number);
    const startsAt = new Date(cal.targetDateObj.getFullYear(), cal.targetDateObj.getMonth(), cal.targetDateObj.getDate(), h, m, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 45 * 60000);

    // If org exists, write to Prisma
    const org = await prisma.organization.findFirst();
    const customer = await prisma.customer.findFirst({ where: { phone: customerPhone } });
    if (org && customer) {
      await prisma.appointment.create({
        data: {
          orgId: org.id,
          barberId,
          customerId: customer.id,
          serviceId: '1',
          startsAt,
          endsAt,
          status: 'PENDING_PAYMENT',
          originalPrice: 50.0,
          finalPrice: 45.0,
        },
      });
    }
  } catch (err) {
    // Graceful fallback to memory store
  }

  return true;
}

/**
 * Unlocks a previously booked slot (used when client changes date or time).
 */
export function unlockSlotInDatabase(barberId: string, time: string, date: string, customerPhone: string) {
  const cleanPhone = customerPhone.replace(/\D/g, '') || customerPhone;
  const cal = getCalendarDate(date);
  const idx = bookedSlotsStore.findIndex(
    (b) => b.barberId === barberId && b.time === time && (b.dateStr === cal.isoDate || b.date === cal.target) && b.customerPhone.replace(/\D/g, '') === cleanPhone
  );
  if (idx !== -1) {
    bookedSlotsStore.splice(idx, 1);
  }
}

/**
 * Retrieves the most recent appointment for a customer phone.
 */
export function getCustomerAppointment(customerPhone: string): BookedSlot | undefined {
  const cleanPhone = customerPhone.replace(/\D/g, '') || customerPhone;
  return bookedSlotsStore.slice().reverse().find(
    (b) => b.customerPhone.replace(/\D/g, '') === cleanPhone
  );
}

// Helper to format Pix Copia e Cola
export const makePix = (amount: number) => {
  return `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${amount.toFixed(2)}5802BR5925ATELIER 88 BARBER LOUNGE6009SAO PAULO62070503***6304E2B1`;
};

// -------------------------------------------------------------
// GOOGLE GEMINI FLASH TOOL CALLING ENGINE
// Strictly grounded on database queries (Zero Hallucinations)
// -------------------------------------------------------------
async function callGeminiIfAvailable(userMessage: string, session: AiSession): Promise<{
  handled: boolean;
  reply?: string;
  actionTaken?: string;
  bookingData?: any;
  pixCopiaCola?: string;
  mediaToSend?: Array<{ url: string; caption: string }>;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return { handled: false };
  }

  try {
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'consultar_meus_agendamentos',
            description: 'Consulta no banco de dados os agendamentos existentes para o cliente atual pelo número de telefone ou histórico da conversa.',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'apresentar_profissionais_disponiveis',
            description: 'Apresenta os 2 profissionais disponíveis na barbearia (Diego Santos e Lucas Lima), enviando foto, nome e especialidades de cada um para que o cliente escolha com quem prefere ser atendido.',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'consultar_tabela_servicos',
            description: 'Retorna a lista oficial de serviços e preços da barbearia com 10% de desconto no Pix.',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'consultar_horarios_no_banco',
            description: 'Consulta no banco de dados os horários reais disponíveis para um barbeiro específico hoje ou amanhã, garantindo que não haja choque de horários. Use SOMENTE depois que o cliente tiver indicado qual profissional prefere.',
            parameters: {
              type: 'OBJECT',
              properties: {
                barbeiro: {
                  type: 'STRING',
                  description: 'Nome do barbeiro escolhido pelo cliente: Diego Santos ou Lucas Lima',
                },
                data: {
                  type: 'STRING',
                  description: 'Data do agendamento: "hoje" ou "amanhã"',
                },
              },
              required: ['barbeiro'],
            },
          },
          {
            name: 'criar_pre_reserva',
            description: 'Valida a disponibilidade no banco de dados e cria uma pré-reserva, gerando as opções de pagamento (Pix 10% OFF ou balcão).',
            parameters: {
              type: 'OBJECT',
              properties: {
                servico: { type: 'STRING', description: 'Nome do serviço escolhido' },
                barbeiro: { type: 'STRING', description: 'Nome do barbeiro escolhido' },
                horario: { type: 'STRING', description: 'Horário escolhido, ex: 15:00, 16:30' },
                data: { type: 'STRING', description: 'Data do agendamento: "hoje" ou "amanhã"' },
              },
              required: ['servico', 'barbeiro', 'horario'],
            },
          },
          {
            name: 'escolher_forma_pagamento',
            description: 'Processa a escolha do cliente para pagamento via Pix com 10% OFF ou pagamento no balcão no momento do corte.',
            parameters: {
              type: 'OBJECT',
              properties: {
                forma_pagamento: {
                  type: 'STRING',
                  description: 'PIX ou BALCAO',
                },
              },
              required: ['forma_pagamento'],
            },
          },
        ],
      },
    ];

    const calToday = getCalendarDate('today');
    const calTomorrow = getCalendarDate('tomorrow');

    const systemPrompt = `Você é Sofia, a secretária virtual e recepcionista da barbearia Atelier 88 Barber Lounge.

CALENDÁRIO REAL DO SISTEMA:
- Hoje é: ${calToday.fullLabel} (Sexta-feira)
- Amanhã é: ${calTomorrow.fullLabel} (Sábado)

REGRAS CRÍTICAS DE TRATAMENTO DE TEXTO COM DATAS:
1. TRATAMENTO DE DATAS: NUNCA mencione apenas a palavra "Hoje" ou "Amanhã" sem a data entre parênteses!
   - Para hoje, você DEVE SEMPRE escrever: "${calToday.fullLabel}" (exemplo: "${calToday.fullLabel} às 15:30").
   - Para amanhã, você DEVE SEMPRE escrever: "${calTomorrow.fullLabel}" (exemplo: "${calTomorrow.fullLabel} às 15:30").
2. CONSULTA DE AGENDAMENTOS: Se o cliente perguntar "meus agendamentos", "resumo", "qual meu horário", ou quiser saber sobre agendamento já feito, você DEVE OBRIGATORIAMENTE chamar a ferramenta 'consultar_meus_agendamentos'. Nunca invente nem suponha dados de agendamentos.

INFORMAÇÕES DA BARBEARIA:
- Endereço: Av. Paulista, 1000 - Bela Vista, São Paulo - SP (Estacionamento conveniado no local gratuito por 1h)
- Horário de Funcionamento: Terça a Sábado das 09:00 às 20:00 (Domingos e Segundas fechado).
- Cortesia: Cerveja artesanal gelada ou café expresso especial para todos os clientes.
- Formas de pagamento aceitas: Pix (com 10% de desconto pelo WhatsApp), Cartão de Débito, Cartão de Crédito e Dinheiro.
- Profissionais disponíveis (2 barbeiros da casa):
  1) Diego Santos (Cadeira 1, Especialista Fade Master: Degradê Navalhado & Barboterapia)
  2) Lucas Lima (Cadeira 2, Especialista Navalha de Ouro: Tesoura Clássica & Barba)

REGRAS OBRIGATÓRIAS DE ATENDIMENTO:
1. REGRA SUPREMA DOS PROFISSIONAIS: Você NUNCA deve escolher, indicar ou assumir um barbeiro por conta própria. Se o cliente perguntar sobre horários disponíveis (ex: 'horários disponíveis hoje', 'tem vaga amanhã?', 'que horas tem?', 'quais os horários?'), ou se quiser agendar e ainda não disse quem prefere, você DEVE SEMPRE executar a ferramenta 'apresentar_profissionais_disponiveis'. Isso enviará a foto e especialidade de cada um dos 2 barbeiros (Diego Santos e Lucas Lima) e perguntará educadamente com qual profissional ele prefere ser atendido.
2. Somente DEPOIS que o cliente responder escolhendo o profissional (ex: 'Diego', 'Lucas', '1' ou '2') é que você deve consultar os horários no banco chamando 'consultar_horarios_no_banco' para aquele barbeiro específico.
3. ATENÇÃO OBRIGATÓRIA À DATA (HOJE vs AMANHÃ):
   - Preste atenção extrema se o cliente disse 'hoje' ou 'amanhã' ('amanha').
   - Se o cliente disse 'amanhã', 'amanha', 'não quero para hoje', 'troca para amanhã' ou similar, a data DEVE ser 'amanhã'.
   - Em todas as respostas de horários e agendamentos, declare explicitamente a data completa: "${calTomorrow.fullLabel} às 15:30" ou "${calToday.fullLabel} às 14:00".
   - NUNCA agende para hoje se o cliente disse amanhã.
4. FLEXIBILIDADE CONVERSACIONAL TOTAL (COMO UMA CONVERSA COM UM HUMANO):
   - O cliente pode mudar de ideia a qualquer instante. NUNCA ignore ou fique em silêncio.
   - Se o cliente disser que quer trocar ou escolher outro profissional (ex: 'quero escolher outro profissional', 'mudar de barbeiro', 'outro barbeiro', 'tem outro profissional?', 'quem mais corta?'): Execute IMEDIATAMENTE a ferramenta 'apresentar_profissionais_disponiveis'.
   - Se o cliente citar diretamente outro barbeiro (ex: 'e o Lucas?', 'prefiro o Lucas', 'tem vaga com o Lucas?', 'muda pro Diego'): Execute IMEDIATAMENTE a ferramenta 'consultar_horarios_no_banco' para o barbeiro citado.
   - Se o cliente quiser mudar de serviço, ver preços ou tabela (ex: 'quero mudar de serviço', 'quanto custa a barba?', 'tem combo?', 'tabela de preços', 'ver serviços'): Execute IMEDIATAMENTE a ferramenta 'consultar_tabela_servicos'.
   - Se o cliente quiser voltar, ir ao menu anterior ou recomeçar: Seja prestativo, empático e conduza-o para a etapa anterior ou menu inicial com naturalidade.
5. Você NUNCA deve inventar preços, serviços ou horários da sua cabeça.
6. Para qualquer dúvida de serviços ou preços, execute a ferramenta 'consultar_tabela_servicos'.
7. Para agendar ou reservar um horário após o cliente escolher serviço, barbeiro e horário, execute a ferramenta 'criar_pre_reserva'.
8. Ao criar a pré-reserva, SEMPRE apresente as duas opções de pagamento ao cliente:
   1) Pagar agora no Pix com 10% de Desconto
   2) Pagar na barbearia no momento do corte (valor integral).
9. Se o cliente escolher a forma de pagamento (Pix ou Balcão), execute a ferramenta 'escolher_forma_pagamento'.
10. Fale sempre em português do Brasil de forma simpática, moderna, acolhedora e concisa.`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let candidate: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...session.history.slice(-6).map((h) => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
              })),
              { role: 'user', parts: [{ text: userMessage }] },
            ],
            tools,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          candidate = data?.candidates?.[0]?.content?.parts?.[0];
          if (candidate) break;
        } else {
          console.warn(`Gemini model ${model} status:`, response.status);
        }
      } catch (err) {
        console.warn(`Error contacting Gemini model ${model}:`, err);
      }
    }

    if (!candidate) {
      return { handled: false };
    }

    // Check if Gemini invoked a Tool Call
    if (candidate?.functionCall) {
      const fnName = candidate.functionCall.name;
      const args = candidate.functionCall.args || {};

      if (fnName === 'consultar_meus_agendamentos') {
        const apt = getCustomerAppointment(session.clientPhone);
        if (!apt) {
          return {
            handled: true,
            actionTaken: 'VIEW_APPOINTMENTS',
            reply: `Você ainda não possui nenhum agendamento ativo no Atelier 88.\n\n` +
              `Gostaria de agendar um horário com a gente para *${calToday.fullLabel}* ou *${calTomorrow.fullLabel}*? Digite *1* para consultar horários ou me diga qual serviço você prefere!`,
          };
        }
        const brb = barbersDb.find((b) => b.id === apt.barberId) || barbersDb[0];
        const cal = getCalendarDate(apt.dateStr || apt.date);
        return {
          handled: true,
          actionTaken: 'VIEW_APPOINTMENTS',
          reply: `Olá! Aqui está o resumo do seu agendamento no *Atelier 88 Barber Lounge*:\n\n` +
            `• *Cliente:* ${session.clientName || 'Cliente'}\n` +
            `• *Serviço:* ${apt.serviceName || 'Fade Navalhado / Degradê'}\n` +
            `• *Barbeiro:* ${brb.name} (${brb.chair})\n` +
            `• *Data & Horário:* ${cal.fullLabel} às *${apt.time}*\n` +
            `• *Status:* Confirmado ✅\n` +
            `• *Pagamento:* ${apt.paymentMethod || 'No balcão (presencial)'}\n\n` +
            `📍 *Localização:* Av. Paulista, 1000 - Bela Vista, São Paulo - SP\n` +
            `🍻 Cerveja artesanal gelada e café expresso de cortesia te esperando!\n\n` +
            `Caso precise alterar ou cancelar seu horário, basta me avisar por aqui.`,
        };
      }

      if (fnName === 'apresentar_profissionais_disponiveis') {
        if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
          unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, session.clientPhone);
        }
        session.selectedBarberId = undefined;
        session.selectedTime = undefined;
        session.stage = 'CHOOSING_BARBER';
        const media = barbersDb.map((b, idx) => ({
          url: b.photo,
          caption: `💈 *${idx + 1}️⃣ ${b.name}* (${b.chair})\n✂️ Especialidade: *${b.nickname}*\n${b.specialties}`,
        }));

        return {
          handled: true,
          actionTaken: 'PRESENT_BARBERS',
          mediaToSend: media,
          reply: `Sem problemas! Vamos escolher outro profissional com todo prazer. 😊💈\n\n` +
            `Temos 2 profissionais excelentes no Atelier 88:\n` +
            `1️⃣ *Diego Santos* (Fade Master • Degradê Navalhado & Barboterapia)\n` +
            `2️⃣ *Lucas Lima* (Navalha de Ouro • Corte Clássico na Tesoura & Barba)\n\n` +
            `👉 *Com qual desses profissionais você prefere o seu atendimento?*\n` +
            `_(Digite 1 para Diego Santos ou 2 para Lucas Lima)_`,
        };
      }

      if (fnName === 'consultar_tabela_servicos') {
        session.stage = 'CHOOSING_SERVICE';
        return {
          handled: true,
          actionTaken: 'LIST_SERVICES',
          reply: `💈 *Tabela de Serviços & Preços — Atelier 88*\n\n` +
            servicesDb.map((s, idx) => `*${idx + 1}️⃣ ${s.name}* — R$ ${s.price.toFixed(2)}\n  └ ⚡ *R$ ${(s.price * 0.9).toFixed(2)}* no Pix (10% OFF)`).join('\n\n') +
            `\n\n👉 *Qual desses serviços você gostaria de agendar?*\n_(Digite o número ou o nome do serviço para prosseguir)_`,
        };
      }

      if (fnName === 'consultar_horarios_no_banco') {
        const barberArg = (args.barbeiro || '').toLowerCase();
        const mentionsDiego = barberArg.includes('diego') || barberArg.includes('santos') || barberArg === '1';
        const mentionsLucas = barberArg.includes('lucas') || barberArg.includes('lima') || barberArg === '2';

        // Guardrail: if client hasn't specified a barber yet, present the 2 barbers with photos!
        if (!mentionsDiego && !mentionsLucas && !session.selectedBarberId) {
          session.stage = 'CHOOSING_BARBER';
          const media = barbersDb.map((b, idx) => ({
            url: b.photo,
            caption: `💈 *${idx + 1}️⃣ ${b.name}* (${b.chair})\n✂️ Especialidade: *${b.nickname}*\n${b.specialties}`,
          }));

          return {
            handled: true,
            actionTaken: 'PRESENT_BARBERS',
            mediaToSend: media,
            reply: `Temos 2 profissionais excelentes disponíveis no Atelier 88! 💈✨\n\n` +
              `Acabei de te enviar a foto e o perfil de cada um acima:\n` +
              `1️⃣ *Diego Santos* (Fade Master • Degradê Navalhado & Barboterapia)\n` +
              `2️⃣ *Lucas Lima* (Navalha de Ouro • Corte Clássico & Barba)\n\n` +
              `👉 *Com qual desses profissionais você prefere consultar os horários?*\n` +
              `_(Digite 1 para Diego Santos ou 2 para Lucas Lima)_`,
          };
        }

        const brb = mentionsLucas 
          ? barbersDb[1] 
          : (mentionsDiego ? barbersDb[0] : (barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0]));

        let targetDate: 'today' | 'tomorrow' = session.selectedDate || 'today';
        if (args.data?.toLowerCase().includes('amanh') || args.data?.toLowerCase().includes('amanha')) {
          targetDate = 'tomorrow';
        } else if (args.data?.toLowerCase().includes('hoje') || args.data?.toLowerCase().includes('hj')) {
          targetDate = 'today';
        }
        session.selectedDate = targetDate;
        session.selectedBarberId = brb.id;
        session.stage = 'CHOOSING_TIME';

        const dateLabel = getDateLabel(targetDate);
        const slots = await getRealAvailableSlots(brb.id, targetDate);

        return {
          handled: true,
          actionTaken: 'CHECK_AVAILABILITY',
          reply: `🗓️ *Horários Disponíveis para ${brb.name} (${brb.chair}) — ${dateLabel}:*\n\n` +
            (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
            (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
            (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
            `👉 Qual desses horários de ${dateLabel.toLowerCase()} fica melhor para você?`,
        };
      }

      if (fnName === 'criar_pre_reserva') {
        const srv = servicesDb.find((s) => s.name.toLowerCase().includes(args.servico?.toLowerCase() || '')) || servicesDb[0];
        const brb = barbersDb.find((b) => b.name.toLowerCase().includes(args.barbeiro?.toLowerCase() || '')) || barbersDb[0];
        const time = args.horario || '15:00';

        let targetDate: 'today' | 'tomorrow' = session.selectedDate || 'today';
        if (args.data?.toLowerCase().includes('amanh') || args.data?.toLowerCase().includes('amanha')) {
          targetDate = 'tomorrow';
        } else if (args.data?.toLowerCase().includes('hoje') || args.data?.toLowerCase().includes('hj')) {
          targetDate = 'today';
        }
        session.selectedDate = targetDate;
        const cal = getCalendarDate(targetDate);

        const split = calculateSplit({
          servicePrice: srv.price,
          onlineDiscountActive: true,
          onlineDiscountType: 'PERCENTAGE',
          onlineDiscountValue: 10,
          barberCommissionRate: 50,
        });

        // Check if slot is free in DB for targetDate and save full details
        const isFree = await lockSlotInDatabase(brb.id, time, targetDate, session.clientPhone, {
          serviceName: srv.name,
          price: split.finalPrice,
          paymentMethod: 'Pendente (Aguardando escolha)',
        });
        if (!isFree) {
          const alternativeSlots = await getRealAvailableSlots(brb.id, targetDate);
          return {
            handled: true,
            reply: `⚠️ O horário das *${time}* de ${cal.fullLabel} com ${brb.name} já foi reservado por outro cliente!\n\n` +
              `Temos os seguintes horários vagos (${cal.fullLabel}):\n☀️ ${alternativeSlots.afternoon.slice(0, 3).join(', ')}\n\nQual deles você prefere?`,
          };
        }

        session.selectedServiceId = srv.id;
        session.selectedBarberId = brb.id;
        session.selectedTime = time;
        session.stage = 'CONFIRMING';

        return {
          handled: true,
          actionTaken: 'CREATE_APPOINTMENT',
          bookingData: { service: srv.name, barber: brb.name, date: cal.fullLabel, time, originalPrice: srv.price, finalPrice: split.finalPrice },
          pixCopiaCola: makePix(split.finalPrice),
          reply: `✅ *Agendamento Pré-Reservado!*\n\n` +
            `💈 *Serviço:* ${srv.name}\n` +
            `✂️ *Barbeiro:* ${brb.name} (${brb.chair})\n` +
            `⏰ *Data & Horário:* ${cal.fullLabel} às *${time}*\n\n` +
            `💰 *Como você prefere realizar o pagamento?*\n\n` +
            `1️⃣ *Pagar agora no Pix com 10% de Desconto:*\n` +
            `   De ~R$ ${srv.price.toFixed(2)}~ por apenas 👉 *R$ ${split.finalPrice.toFixed(2)}*\n` +
            `   _(Economize R$ ${(srv.price * 0.1).toFixed(2)} e garanta sua vaga sem risco de fila!)_\n\n` +
            `2️⃣ *Pagar na barbearia no momento do corte:*\n` +
            `   Valor integral de *R$ ${srv.price.toFixed(2)}* (Dinheiro, Cartão Débito ou Crédito)\n\n` +
            `👉 *Digite 1 para Pix com Desconto ou 2 para Pagar na Barbearia:*`,
        };
      }

      if (fnName === 'escolher_forma_pagamento') {
        const forma = String(args.forma_pagamento || '').toUpperCase();
        const srv = servicesDb.find((s) => s.id === session.selectedServiceId) || servicesDb[0];
        const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
        const curDate = session.selectedDate || 'today';
        const cal = getCalendarDate(curDate);
        const split = calculateSplit({
          servicePrice: srv.price,
          onlineDiscountActive: true,
          onlineDiscountType: 'PERCENTAGE',
          onlineDiscountValue: 10,
          barberCommissionRate: 50,
        });

        const apt = getCustomerAppointment(session.clientPhone);

        if (forma.includes('PIX') || forma === '1') {
          session.stage = 'CONFIRMING';
          if (apt) {
            apt.paymentMethod = `Pix 10% OFF (R$ ${split.finalPrice.toFixed(2)})`;
          }
          const pixCode = makePix(split.finalPrice);

          await confirmarAgendamentoNoBanco({
            customerPhone: session.clientPhone,
            customerName: session.clientName,
            serviceIdOrName: session.selectedServiceId || srv.id,
            barberIdOrName: session.selectedBarberId || brb.id,
            time: session.selectedTime || '15:00',
            date: curDate,
            paymentMethod: 'PIX',
          });

          return {
            handled: true,
            actionTaken: 'PIX_CHOSEN',
            pixCopiaCola: pixCode,
            reply: `⚡ *Excelente escolha! Você economizou R$ ${(srv.price * 0.1).toFixed(2)}!*\n\n` +
              `Segue o seu código Pix Copia-e-Cola no valor de *R$ ${split.finalPrice.toFixed(2)}*:\n\n` +
              `\`${pixCode}\`\n\n` +
              `_(Toque no código acima para copiar e pagar no app do seu banco. Assim que o pagamento for concluído, sua vaga para ${cal.fullLabel} fica 100% confirmada na agenda!)_`,
          };
        } else {
          session.stage = 'BOOKED';
          if (apt) {
            apt.paymentMethod = `No balcão (R$ ${srv.price.toFixed(2)})`;
          }

          await confirmarAgendamentoNoBanco({
            customerPhone: session.clientPhone,
            customerName: session.clientName,
            serviceIdOrName: session.selectedServiceId || srv.id,
            barberIdOrName: session.selectedBarberId || brb.id,
            time: session.selectedTime || '16:00',
            date: curDate,
            paymentMethod: 'COUNTER',
          });

          return {
            handled: true,
            actionTaken: 'COUNTER_PAYMENT',
            reply: `Confirmado com sucesso! 👍\n\n` +
              `Sua cadeira para *${srv.name}* com *${brb.name}* está reservada para ${cal.fullLabel} às *${session.selectedTime || '16:00'}*.\n\n` +
              `O pagamento de *R$ ${srv.price.toFixed(2)}* será realizado diretamente na recepção no momento do corte.\n` +
              `Te esperamos com cerveja artesanal gelada cortesia da casa! 💈🍻`,
          };
        }
      }
    }

    if (candidate?.text) {
      return { handled: true, reply: candidate.text };
    }
  } catch (err) {
    console.warn('Error calling Gemini API:', err);
  }

  return { handled: false };
}

/**
 * Main WhatsApp Conversational Agent.
 * Uses Google Gemini 2.5 Flash when API key is provided,
 * with deterministic state machine fallback 100% grounded on real database slots.
 */
export async function processWhatsAppMessage(clientPhone: string, messageText: string, clientName?: string): Promise<{
  reply: string;
  actionTaken?: string;
  bookingData?: any;
  pixCopiaCola?: string;
  mediaToSend?: Array<{ url: string; caption: string }>;
}> {
  // Normalize phone key
  const cleanPhone = clientPhone.replace(/\D/g, '') || clientPhone;

  // Real database customer upsert
  await upsertCustomer(cleanPhone, clientName);

  // Refresh dynamic services and barbers from Prisma database
  await Promise.allSettled([getDynamicServices(), getDynamicBarbers()]);

  // Helper to present the 2 barbers with photos
  const getBarbersPresentation = () => {
    const media = barbersDb.map((b, idx) => ({
      url: b.photo,
      caption: `💈 *${idx + 1}️⃣ ${b.name}* (${b.chair})\n✂️ Especialidade: *${b.nickname}*\n${b.specialties}`,
    }));
    const textPrompt = `Temos 2 profissionais excelentes disponíveis hoje no Atelier 88! 💈✨\n\n` +
      `Acabei de te enviar a foto e a especialidade de cada um acima:\n` +
      `1️⃣ *Diego Santos* (Fade Master • Degradê Navalhado & Barboterapia)\n` +
      `2️⃣ *Lucas Lima* (Navalha de Ouro • Corte Clássico na Tesoura & Barba)\n\n` +
      `👉 *Com qual desses profissionais você prefere o seu atendimento?*\n` +
      `_(Digite 1 para Diego Santos ou 2 para Lucas Lima)_`;
    return { media, textPrompt };
  };

  // 1. Get or create session
  let session = sessions.get(cleanPhone);
  if (!session) {
    session = {
      clientPhone: cleanPhone,
      clientName: '',
      stage: 'GREETING',
      history: [],
    };
    sessions.set(cleanPhone, session);
  }

  // Normalize client name
  const isValidName = (name?: string) => {
    if (!name) return false;
    const clean = name.trim();
    return clean.length > 1 && clean !== '.' && clean !== '-' && clean !== 'Cliente';
  };

  const clientDisplayName = isValidName(session.clientName) 
    ? session.clientName 
    : (isValidName(clientName) ? clientName : '');

  if (clientDisplayName && !session.clientName) {
    session.clientName = clientDisplayName;
  }

  const text = messageText.toLowerCase().trim();
  session.history.push({ role: 'user', content: messageText });

  // -------------------------------------------------------------
  // DATE INTENT DETECTION (Today vs Tomorrow)
  // -------------------------------------------------------------
  const detectedDate = detectDateIntent(messageText);
  if (detectedDate) {
    if (session.selectedDate && session.selectedDate !== detectedDate && session.selectedTime && session.selectedBarberId) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
      session.selectedTime = undefined;
    }
    session.selectedDate = detectedDate;
  }

  let reply = '';
  let actionTaken: string | undefined;
  let bookingData: any;
  let pixCopiaCola: string | undefined;
  let mediaToSend: Array<{ url: string; caption: string }> | undefined;

  // -------------------------------------------------------------
  // COMMAND: Reset / Cancel / Menu Principal
  // -------------------------------------------------------------
  const isResetIntent = 
    text === 'menu' || 
    text === 'inicio' || 
    text === 'início' || 
    text === 'recomecar' || 
    text === 'recomeçar' || 
    text === 'ajuda' ||
    text.includes('recomeçar') || 
    text.includes('recomecar') || 
    text.includes('começar do zero') || 
    text.includes('comecar do zero') || 
    text.includes('começar de novo') || 
    text.includes('cancelar') || 
    text.includes('cancela tudo') || 
    text.includes('cancela') || 
    text.includes('menu principal') || 
    text.includes('do início') || 
    text.includes('do inicio');

  if (isResetIntent) {
    if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
    }
    session.stage = 'GREETING';
    session.selectedServiceId = undefined;
    session.selectedBarberId = undefined;
    session.selectedTime = undefined;

    const greetingName = clientDisplayName ? `, ${clientDisplayName}` : '';
    reply = `Tudo bem! Agendamento reiniciado. 🔄\n\n` +
      `Como posso te ajudar hoje${greetingName}?\n\n` +
      `1️⃣ Consultar horários livres para hoje ou amanhã\n` +
      `2️⃣ Ver nossa tabela de serviços e preços (com 10% OFF no Pix)\n` +
      `3️⃣ Agendar um corte direto comigo\n\n` +
      `👉 *Digite 1, 2 ou 3*, ou me diga com suas palavras o que você precisa!`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'RESET' };
  }

  // -------------------------------------------------------------
  // COMMAND: Voltar / Menu Anterior / Etapa Anterior
  // Context-aware: steps back smoothly to the previous natural step
  // -------------------------------------------------------------
  const isGoBackIntent = 
    text === 'voltar' || 
    text === 'volta' || 
    text.includes('voltar') || 
    text.includes('volta aí') || 
    text.includes('volta ai') || 
    text.includes('pode voltar') || 
    text.includes('quero voltar') || 
    text.includes('menu anterior') || 
    text.includes('etapa anterior') || 
    text.includes('passo anterior') || 
    text.includes('fase anterior') || 
    text.includes('retornar');

  if (isGoBackIntent) {
    if (session.stage === 'CONFIRMING') {
      // Step back from payment/confirmation to time selection
      if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
        unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
      }
      session.selectedTime = undefined;
      session.stage = 'CHOOSING_TIME';

      const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
      const curDate = session.selectedDate || 'today';
      const dateLabel = getDateLabel(curDate);
      const slots = await getRealAvailableSlots(brb.id, curDate);

      reply = `Tranquilo! Voltamos para a escolha de horários. 🗓️✨\n\n` +
        `Confira os horários disponíveis para *${brb.name}* (${brb.chair}) — *${dateLabel}*:\n\n` +
        (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
        (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
        (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
        `👉 *Qual horário de ${dateLabel.toLowerCase()} fica melhor para você?*`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'CHECK_AVAILABILITY' };
    } else if (session.stage === 'CHOOSING_TIME') {
      // Step back from time selection to choosing barber
      if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
        unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
      }
      session.selectedBarberId = undefined;
      session.selectedTime = undefined;
      session.stage = 'CHOOSING_BARBER';

      const { media, textPrompt } = getBarbersPresentation();
      reply = `Sem problemas, voltando um passo! 💈\n\n` + textPrompt;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'PRESENT_BARBERS', mediaToSend: media };
    } else {
      // Step back to greeting
      if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
        unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
      }
      session.stage = 'GREETING';
      session.selectedServiceId = undefined;
      session.selectedBarberId = undefined;
      session.selectedTime = undefined;

      const greetingName = clientDisplayName ? `, ${clientDisplayName}` : '';
      reply = `Voltando ao menu inicial! 💈 Como posso te ajudar${greetingName}?\n\n` +
        `1️⃣ Consultar horários livres para hoje ou amanhã\n` +
        `2️⃣ Ver nossa tabela de serviços e preços (com 10% OFF no Pix)\n` +
        `3️⃣ Agendar um corte direto comigo\n\n` +
        `👉 Digite 1, 2 ou 3:`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'GREETING' };
    }
  }

  // -------------------------------------------------------------
  // CHANGE BARBER INTENT ("quero escolher outro profissional", etc.)
  // Works at ANY stage (CHOOSING_TIME, CONFIRMING, etc.)
  // -------------------------------------------------------------
  const isChangeBarberIntent = 
    text.includes('outro profissional') || 
    text.includes('outra profissional') || 
    text.includes('outros profissionais') || 
    text.includes('outro barbeiro') || 
    text.includes('outros barbeiros') || 
    text.includes('mudar de profissional') || 
    text.includes('mudar o profissional') || 
    text.includes('trocar de profissional') || 
    text.includes('trocar o profissional') || 
    text.includes('mudar de barbeiro') || 
    text.includes('mudar o barbeiro') || 
    text.includes('trocar de barbeiro') || 
    text.includes('trocar o barbeiro') || 
    text.includes('mudar barbeiro') || 
    text.includes('trocar barbeiro') || 
    text.includes('mudar profissional') || 
    text.includes('trocar profissional') || 
    text.includes('escolher outro') || 
    text.includes('escolher outra') || 
    text.includes('quero outro') || 
    text.includes('prefiro outro') || 
    text.includes('tem outro') || 
    text.includes('quem mais atende') || 
    text.includes('quem mais corta');

  if (isChangeBarberIntent) {
    if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
    }
    session.selectedBarberId = undefined;
    session.selectedTime = undefined;
    session.stage = 'CHOOSING_BARBER';

    const { media, textPrompt } = getBarbersPresentation();
    reply = `Com certeza! Vamos escolher outro profissional com o maior prazer. 😊💈\n\n` + textPrompt;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'PRESENT_BARBERS', mediaToSend: media };
  }

  // -------------------------------------------------------------
  // DIRECT BARBER SWITCH (e.g. "e o Lucas?", "prefiro o Lucas", "faz com o Diego")
  // -------------------------------------------------------------
  const mentionsLucasDirect = text.includes('lucas') || text.includes('lima');
  const mentionsDiegoDirect = text.includes('diego') || text.includes('santos');
  const wantsLucasDirect = mentionsLucasDirect && !mentionsDiegoDirect && (
    session.stage === 'CHOOSING_BARBER' ||
    session.selectedBarberId === '1' ||
    text.includes('prefiro') ||
    text.includes('e o') ||
    text.includes('com o') ||
    text.includes('com a') ||
    text.includes('pro') ||
    text.includes('pra') ||
    text.includes('quero') ||
    text.includes('troca') ||
    text.includes('muda')
  );
  const wantsDiegoDirect = mentionsDiegoDirect && !mentionsLucasDirect && (
    session.stage === 'CHOOSING_BARBER' ||
    session.selectedBarberId === '2' ||
    text.includes('prefiro') ||
    text.includes('e o') ||
    text.includes('com o') ||
    text.includes('com a') ||
    text.includes('pro') ||
    text.includes('pra') ||
    text.includes('quero') ||
    text.includes('troca') ||
    text.includes('muda')
  );

  if (wantsLucasDirect) {
    if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
    }
    const brb = barbersDb[1]; // Lucas Lima
    session.selectedBarberId = brb.id;
    session.selectedTime = undefined;
    session.stage = 'CHOOSING_TIME';

    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);
    const slots = await getRealAvailableSlots(brb.id, curDate);

    reply = `Com certeza! Barbeiro selecionado: *${brb.name}* (${brb.chair}) 💈✨\n\n` +
      `Confira os horários disponíveis para ele na agenda (*${dateLabel}*):\n\n` +
      (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
      (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
      (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
      `👉 *Qual horário fica melhor para você?*\n` +
      `_(Exemplo: responda com *14:00*, *15:30*, *17:00* ou *18:45*)_`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'SELECT_BARBER' };
  }

  if (wantsDiegoDirect) {
    if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
    }
    const brb = barbersDb[0]; // Diego Santos
    session.selectedBarberId = brb.id;
    session.selectedTime = undefined;
    session.stage = 'CHOOSING_TIME';

    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);
    const slots = await getRealAvailableSlots(brb.id, curDate);

    reply = `Com certeza! Barbeiro selecionado: *${brb.name}* (${brb.chair}) 💈✨\n\n` +
      `Confira os horários disponíveis para ele na agenda (*${dateLabel}*):\n\n` +
      (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
      (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
      (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
      `👉 *Qual horário fica melhor para você?*\n` +
      `_(Exemplo: responda com *14:00*, *15:30*, *17:00* ou *18:45*)_`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'SELECT_BARBER' };
  }

  // -------------------------------------------------------------
  // CHANGE SERVICE / PRICE INQUIRY INTENT
  // -------------------------------------------------------------
  const isChangeServiceIntent = 
    text.includes('mudar de serviço') || 
    text.includes('mudar o serviço') || 
    text.includes('mudar de servico') || 
    text.includes('mudar o servico') || 
    text.includes('trocar de serviço') || 
    text.includes('trocar o serviço') || 
    text.includes('trocar de servico') || 
    text.includes('trocar o servico') || 
    text.includes('mudar serviço') || 
    text.includes('trocar serviço') || 
    text.includes('outro serviço') || 
    text.includes('outro servico') || 
    text.includes('outros serviços') || 
    text.includes('outros servicos') || 
    text.includes('tabela de preço') || 
    text.includes('tabela de preco') || 
    text.includes('tabela de serviço') || 
    text.includes('tabela de serviços') || 
    text.includes('ver serviços') || 
    text.includes('ver servicos') || 
    text.includes('quais serviços') || 
    text.includes('quais servicos') || 
    text.includes('quanto custa') || 
    text.includes('qual o valor') || 
    text.includes('preços') || 
    text.includes('precos') || 
    text.includes('valores');

  if (isChangeServiceIntent) {
    if (session.stage === 'CONFIRMING') {
      if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
        unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
      }
    }
    session.stage = 'CHOOSING_SERVICE';

    reply = `Com certeza! Você pode escolher outro serviço com tranquilidade. 💈✨\n\n` +
      `💈 *Tabela de Serviços & Preços — Atelier 88*\n\n` +
      servicesDb.map((s, idx) => `*${idx + 1}️⃣ ${s.name}* — R$ ${s.price.toFixed(2)}\n  └ ⚡ *R$ ${(s.price * 0.9).toFixed(2)}* no Pix (10% OFF)`).join('\n\n') +
      `\n\n👉 *Qual desses serviços você gostaria de agendar?*\n_(Digite o número do serviço ou o nome para prosseguir)_`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'LIST_SERVICES' };
  }

  // -------------------------------------------------------------
  // LOCATION / ADDRESS / PARKING / FAQ INTENT
  // -------------------------------------------------------------
  const isLocationOrFaqIntent = 
    text.includes('onde fica') || 
    text.includes('onde voces ficam') || 
    text.includes('onde vocês ficam') || 
    text.includes('qual o endereço') || 
    text.includes('qual o endereco') || 
    text.includes('qual endereço') || 
    text.includes('qual endereco') || 
    text.includes('localização') || 
    text.includes('localizacao') || 
    text.includes('como chegar') || 
    text.includes('estacionamento') || 
    text.includes('tem estacionamento') || 
    text.includes('horario de funcionamento') || 
    text.includes('horário de funcionamento') || 
    text.includes('que horas abre') || 
    text.includes('que horas fecha');

  if (isLocationOrFaqIntent) {
    const calT = getCalendarDate('today');
    const calA = getCalendarDate('tomorrow');
    reply = `📍 O *Atelier 88 Barber Lounge* fica localizado na:\n` +
      `*Av. Paulista, 1000 - Bela Vista, São Paulo - SP*\n\n` +
      `🚗 *Estacionamento:* Conveniado gratuito no local (1ª hora de cortesia para clientes).\n` +
      `⏰ *Horário de Atendimento:* Terça a Sábado das 09:00 às 20:00.\n` +
      `🍻 Cerveja artesanal gelada e café expresso especial de cortesia te esperando!\n\n` +
      `Gostaria de agendar um horário com a gente para *${calT.fullLabel}* ou *${calA.fullLabel}*? Digite *1* para consultar horários ou me diga qual serviço você prefere!`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'LOCATION_FAQ' };
  }

  // -------------------------------------------------------------
  // DIRECT SERVICE SWITCH WHILE IN TIME OR CONFIRMING STAGE
  // -------------------------------------------------------------
  const serviceSwitchMatch = 
    text.includes('combo') ? servicesDb[2] :
    (text.includes('barba') && !text.includes('cabelo')) ? servicesDb[1] :
    (text.includes('tesoura') || text.includes('clássico') || text.includes('classico')) ? servicesDb[3] :
    (text.includes('pigmenta') || text.includes('alinhamento')) ? servicesDb[4] :
    (text.includes('degradê') || text.includes('degrade') || text.includes('fade')) ? servicesDb[0] : null;

  if (serviceSwitchMatch && (session.stage === 'CONFIRMING' || session.stage === 'CHOOSING_TIME') && !text.match(/(\d{1,2})[:h](\d{2})?|(\b\d{2}\b)/)) {
    session.selectedServiceId = serviceSwitchMatch.id;
    const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);

    if (session.stage === 'CONFIRMING' && session.selectedTime) {
      const split = calculateSplit({
        servicePrice: serviceSwitchMatch.price,
        onlineDiscountActive: true,
        onlineDiscountType: 'PERCENTAGE',
        onlineDiscountValue: 10,
        barberCommissionRate: 50,
      });
      pixCopiaCola = makePix(split.finalPrice);
      bookingData = { service: serviceSwitchMatch.name, barber: brb.name, date: dateLabel, time: session.selectedTime, originalPrice: serviceSwitchMatch.price, finalPrice: split.finalPrice };

      const apt = getCustomerAppointment(cleanPhone);
      if (apt) {
        apt.serviceName = serviceSwitchMatch.name;
        apt.price = split.finalPrice;
      }

      reply = `Perfeito! Atualizei seu agendamento para *${serviceSwitchMatch.name}*! 👍\n\n` +
        `💈 *Serviço:* ${serviceSwitchMatch.name}\n` +
        `✂️ *Barbeiro:* ${brb.name} (${brb.chair})\n` +
        `⏰ *Data & Horário:* ${dateLabel} às *${session.selectedTime}*\n\n` +
        `💰 *Como você prefere realizar o pagamento?*\n\n` +
        `1️⃣ *Pagar agora no Pix com 10% de Desconto:*\n` +
        `   De ~R$ ${serviceSwitchMatch.price.toFixed(2)}~ por apenas 👉 *R$ ${split.finalPrice.toFixed(2)}*\n\n` +
        `2️⃣ *Pagar na barbearia no momento do corte:*\n` +
        `   Valor integral de *R$ ${serviceSwitchMatch.price.toFixed(2)}*\n\n` +
        `👉 *Digite 1 para Pix com Desconto ou 2 para Pagar na Barbearia:*`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'CREATE_APPOINTMENT', bookingData, pixCopiaCola };
    } else {
      reply = `Show! Atualizei para *${serviceSwitchMatch.name}* (R$ ${(serviceSwitchMatch.price * 0.9).toFixed(2)} no Pix / R$ ${serviceSwitchMatch.price.toFixed(2)} na barbearia). 💈\n\n` +
        `Qual dos horários com *${brb.name}* em *${dateLabel}* fica melhor para você?`;
      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'SELECT_SERVICE' };
    }
  }

  // -------------------------------------------------------------
  // QUERY CUSTOMER APPOINTMENTS ("meus agendamentos", "resumo")
  // -------------------------------------------------------------
  const isCheckAppointmentIntent = 
    text.includes('meus agendamento') || 
    text.includes('meu agendamento') || 
    text.includes('ver agendamento') || 
    text.includes('qual meu horario') ||
    text.includes('qual meu horário') ||
    text.includes('minha reserva') ||
    text.includes('meu horario') ||
    text.includes('meu horário') ||
    (text.includes('resumo') && !text.includes('serviço'));

  if (isCheckAppointmentIntent) {
    const apt = getCustomerAppointment(cleanPhone);
    if (apt) {
      const brb = barbersDb.find((b) => b.id === apt.barberId) || barbersDb[0];
      const cal = getCalendarDate(apt.dateStr || apt.date);
      const clientHeader = clientDisplayName ? `• *Cliente:* ${clientDisplayName}\n` : '';
      reply = `Olá! Aqui está o resumo do seu agendamento no *Atelier 88 Barber Lounge*:\n\n` +
        clientHeader +
        `• *Serviço:* ${apt.serviceName || 'Fade Navalhado / Degradê'}\n` +
        `• *Barbeiro:* ${brb.name} (${brb.chair})\n` +
        `• *Data & Horário:* ${cal.fullLabel} às *${apt.time}*\n` +
        `• *Status:* Confirmado ✅\n` +
        `• *Pagamento:* ${apt.paymentMethod || 'No balcão (presencial)'}\n\n` +
        `📍 *Localização:* Av. Paulista, 1000 - Bela Vista, São Paulo - SP\n` +
        `🍻 Cerveja artesanal gelada e café expresso de cortesia te esperando!\n\n` +
        `Caso precise alterar ou cancelar seu horário, basta me avisar por aqui.`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'VIEW_APPOINTMENTS' };
    } else {
      const calT = getCalendarDate('today');
      const calA = getCalendarDate('tomorrow');
      reply = `Você ainda não possui nenhum agendamento ativo no Atelier 88.\n\n` +
        `Gostaria de agendar um horário com a gente para *${calT.fullLabel}* ou *${calA.fullLabel}*? Digite *1* para consultar horários ou me diga qual serviço você prefere!`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken: 'VIEW_APPOINTMENTS' };
    }
  }

  // -------------------------------------------------------------
  // DATE CHANGE / CORRECTION INTERCEPTOR
  // e.g.: "não quero para hoje, eu falei amanha" or "e para hoje?"
  // -------------------------------------------------------------
  const isDateChangeCorrection = 
    text.includes('não quero para hoje') || 
    text.includes('nao quero para hoje') || 
    text.includes('não é hoje') || 
    text.includes('nao e hoje') || 
    text.includes('falei amanha') || 
    text.includes('falei amanhã') || 
    text.includes('muda para amanhã') || 
    text.includes('muda para amanha') || 
    text.includes('troca para amanhã') || 
    text.includes('troca para amanha') ||
    text.includes('quero para amanhã') ||
    text.includes('quero amanhã') ||
    text.includes('quero amanha') ||
    text.includes('para hoje') ||
    text.includes('pra hoje') ||
    text.includes('tem hoje') ||
    (detectedDate && (session.stage === 'CONFIRMING' || session.stage === 'CHOOSING_TIME'));

  if (isDateChangeCorrection && detectedDate) {
    if (session.selectedBarberId && session.selectedTime && session.selectedDate) {
      unlockSlotInDatabase(session.selectedBarberId, session.selectedTime, session.selectedDate, cleanPhone);
    }
    session.selectedDate = detectedDate;
    session.selectedTime = undefined;
    session.stage = 'CHOOSING_TIME';

    const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
    const calTarget = getCalendarDate(detectedDate);
    const slots = await getRealAvailableSlots(brb.id, detectedDate);

    reply = `Perfeito! Entendido, vamos agendar para *${calTarget.fullLabel}*! 🗓️✨\n\n` +
      `Confira os horários disponíveis para *${brb.name}* (${brb.chair}) — *${calTarget.fullLabel}*:\n\n` +
      (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
      (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
      (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
      `👉 *Qual horário de ${calTarget.displayLabel.toLowerCase()} fica melhor para você?*\n` +
      `_(Exemplo: responda com *14:00*, *15:30*, *17:00* ou *18:45*)_`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken: 'CHECK_AVAILABILITY' };
  }

  // -------------------------------------------------------------
  // IMMEDIATE BARBER SELECTION (When in CHOOSING_BARBER stage)
  // Ensures 100% deterministic, immediate resolution of 1 or 2
  // -------------------------------------------------------------
  const isChoosingBarber = session.stage === 'CHOOSING_BARBER';
  const isDiegoChoice = text === '1' || text.includes('diego') || text.includes('santos');
  const isLucasChoice = text === '2' || text.includes('lucas') || text.includes('lima');

  if (isChoosingBarber && (isDiegoChoice || isLucasChoice || text.includes('qualquer') || text.includes('tanto faz') || text.includes('sem'))) {
    const selectedBrb = isLucasChoice ? barbersDb[1] : barbersDb[0];
    session.selectedBarberId = selectedBrb.id;
    session.stage = 'CHOOSING_TIME';
    actionTaken = 'SELECT_BARBER';

    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);
    const slots = await getRealAvailableSlots(selectedBrb.id, curDate);

    reply = `Excelente escolha! ✂️ Barbeiro selecionado: *${selectedBrb.name}* (${selectedBrb.chair}).\n\n` +
      `Temos os seguintes horários disponíveis para ele na agenda (*${dateLabel}*):\n\n` +
      (slots.morning.length ? `🌅 *Manhã:* ${slots.morning.join(', ')}\n` : '') +
      (slots.afternoon.length ? `☀️ *Tarde:* ${slots.afternoon.join(', ')}\n` : '') +
      (slots.night.length ? `🌙 *Noite:* ${slots.night.join(', ')}\n\n` : '\n') +
      `👉 *Qual horário fica melhor para você?*\n` +
      `_(Exemplo: responda com *14:15*, *15:30*, *17:00* ou *18:45*)_`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken, bookingData, pixCopiaCola };
  }

  // -------------------------------------------------------------
  // IMMEDIATE TIME SELECTION (When in CHOOSING_TIME stage)
  // -------------------------------------------------------------
  const timeMatch = text.match(/(\d{1,2})[:h](\d{2})?|(\b\d{2}\b)/);
  if (session.stage === 'CHOOSING_TIME' && timeMatch) {
    let rawH = parseInt(timeMatch[1] || timeMatch[3], 10);
    let rawM = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (rawH >= 8 && rawH <= 21) {
      const chosenTime = `${String(rawH).padStart(2, '0')}:${String(rawM).padStart(2, '0')}`;
      const srv = servicesDb.find((s) => s.id === session.selectedServiceId) || servicesDb[0];
      const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
      const curDate = session.selectedDate || 'today';
      const dateLabel = getDateLabel(curDate);

      const split = calculateSplit({
        servicePrice: srv.price,
        onlineDiscountActive: true,
        onlineDiscountType: 'PERCENTAGE',
        onlineDiscountValue: 10,
        barberCommissionRate: 50,
      });

      // Real DB verification with dynamic date!
      const isFree = await lockSlotInDatabase(brb.id, chosenTime, curDate, cleanPhone, {
        serviceName: srv.name,
        price: split.finalPrice,
        paymentMethod: 'Pendente (Aguardando escolha)',
      });
      if (!isFree) {
        const altSlots = await getRealAvailableSlots(brb.id, curDate);
        reply = `⚠️ O horário das *${chosenTime}* de ${dateLabel.toLowerCase()} com ${brb.name} já foi reservado na agenda!\n\n` +
          `Temos os seguintes horários livres para ele (${dateLabel}):\n☀️ ${altSlots.afternoon.slice(0, 3).join(', ')}\n\nQual desses você prefere?`;
        session.history.push({ role: 'assistant', content: reply });
        return { reply };
      }

      pixCopiaCola = makePix(split.finalPrice);
      bookingData = { service: srv.name, barber: brb.name, date: dateLabel, time: chosenTime, originalPrice: srv.price, finalPrice: split.finalPrice };
      session.selectedServiceId = srv.id;
      session.selectedTime = chosenTime;
      session.stage = 'CONFIRMING';
      actionTaken = 'CREATE_APPOINTMENT';

      const clientHeader = clientDisplayName ? `👤 *Cliente:* ${clientDisplayName}\n` : '';

      reply = `✅ *Agendamento Pré-Reservado!*\n\n` +
        clientHeader +
        `💈 *Serviço:* ${srv.name}\n` +
        `✂️ *Barbeiro:* ${brb.name} (${brb.chair})\n` +
        `⏰ *Data & Horário:* ${dateLabel} às *${chosenTime}*\n\n` +
        `💰 *Como você prefere realizar o pagamento?*\n\n` +
        `1️⃣ *Pagar agora no Pix com 10% de Desconto:*\n` +
        `   De ~R$ ${srv.price.toFixed(2)}~ por apenas 👉 *R$ ${split.finalPrice.toFixed(2)}*\n` +
        `   _(Economize R$ ${(srv.price * 0.1).toFixed(2)} e garanta sua vaga sem risco de fila!)_\n\n` +
        `2️⃣ *Pagar na barbearia no momento do corte:*\n` +
        `   Valor integral de *R$ ${srv.price.toFixed(2)}* (Dinheiro, Cartão Débito ou Crédito)\n\n` +
        `👉 *Digite 1 para Pix com Desconto ou 2 para Pagar na Barbearia:*`;

      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken, bookingData, pixCopiaCola };
    }
  }

  // -------------------------------------------------------------
  // IMMEDIATE PAYMENT CHOICE (When in CONFIRMING stage)
  // -------------------------------------------------------------
  if (session.stage === 'CONFIRMING') {
    const srv = servicesDb.find((s) => s.id === session.selectedServiceId) || servicesDb[0];
    const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);
    const split = calculateSplit({
      servicePrice: srv.price,
      onlineDiscountActive: true,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
      barberCommissionRate: 50,
    });
    pixCopiaCola = makePix(split.finalPrice);

    const apt = getCustomerAppointment(cleanPhone);

    if (text === '1' || text.includes('pix') || text.includes('desconto') || text.includes('agora')) {
      if (apt) {
        apt.paymentMethod = `Pix 10% OFF (R$ ${split.finalPrice.toFixed(2)})`;
      }
      actionTaken = 'PIX_CHOSEN';

      await confirmarAgendamentoNoBanco({
        customerPhone: cleanPhone,
        customerName: session.clientName,
        serviceIdOrName: session.selectedServiceId || srv.id,
        barberIdOrName: session.selectedBarberId || brb.id,
        time: session.selectedTime || '15:00',
        date: curDate,
        paymentMethod: 'PIX',
      });

      reply = `⚡ *Excelente escolha! Você economizou R$ ${(srv.price * 0.1).toFixed(2)}!*\n\n` +
        `Segue o seu código Pix Copia-e-Cola no valor de *R$ ${split.finalPrice.toFixed(2)}*:\n\n` +
        `\`${pixCopiaCola}\`\n\n` +
        `_(Toque no código acima para copiar e pagar no app do seu banco. Sua vaga para ${dateLabel} fica 100% confirmada na agenda!)_`;
      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken, pixCopiaCola };
    } else if (text === '2' || text.includes('barbearia') || text.includes('balcão') || text.includes('balcao') || text.includes('presencial')) {
      session.stage = 'BOOKED';
      if (apt) {
        apt.paymentMethod = `No balcão (R$ ${srv.price.toFixed(2)})`;
      }
      actionTaken = 'COUNTER_PAYMENT';

      await confirmarAgendamentoNoBanco({
        customerPhone: cleanPhone,
        customerName: session.clientName,
        serviceIdOrName: session.selectedServiceId || srv.id,
        barberIdOrName: session.selectedBarberId || brb.id,
        time: session.selectedTime || '16:00',
        date: curDate,
        paymentMethod: 'COUNTER',
      });

      reply = `Confirmado com sucesso! 👍\n\n` +
        `Sua cadeira para *${srv.name}* com *${brb.name}* está reservada para ${dateLabel} às *${session.selectedTime || '16:00'}*.\n\n` +
        `O pagamento de *R$ ${srv.price.toFixed(2)}* será realizado diretamente na recepção no momento do corte.\n` +
        `Te esperamos com cerveja artesanal gelada cortesia da casa! 💈🍻`;
      session.history.push({ role: 'assistant', content: reply });
      return { reply, actionTaken };
    }
  }

  // -------------------------------------------------------------
  // ATTEMPT GEMINI TOOL CALLING (If GEMINI_API_KEY is configured)
  // -------------------------------------------------------------
  // Only invoke Gemini for natural conversational language (not simple menu digits 1, 2, 3)
  const isSimpleDigit = /^[1-5]$/.test(text);
  if (!isSimpleDigit && process.env.GEMINI_API_KEY) {
    const geminiResult = await callGeminiIfAvailable(messageText, session);
    if (geminiResult.handled && geminiResult.reply) {
      session.history.push({ role: 'assistant', content: geminiResult.reply });
      return {
        reply: geminiResult.reply,
        actionTaken: geminiResult.actionTaken,
        bookingData: geminiResult.bookingData,
        pixCopiaCola: geminiResult.pixCopiaCola,
        mediaToSend: geminiResult.mediaToSend,
      };
    }
  }

  // -------------------------------------------------------------
  // ONE-SHOT NATURAL LANGUAGE DETECTION
  // e.g.: "Quero cortar cabelo amanhã às 16h com o Diego"
  // -------------------------------------------------------------
  const hasTimeMatch = text.match(/(\d{1,2})[h:](\d{2})?|às\s+(\d{1,2})/);
  const mentionsBarber = isDiegoChoice || isLucasChoice;
  const mentionsService = text.includes('corte') || text.includes('fade') || text.includes('barba') || text.includes('combo') || text.includes('tesoura');

  // If user mentioned booking/time/service but DID NOT mention a barber:
  if ((hasTimeMatch || mentionsService) && !mentionsBarber && !session.selectedBarberId && !text.includes('tabela') && !text.includes('preço') && !text.includes('quanto')) {
    session.stage = 'CHOOSING_BARBER';
    actionTaken = 'PRESENT_BARBERS';
    const { media, textPrompt } = getBarbersPresentation();
    session.history.push({ role: 'assistant', content: textPrompt });
    return { reply: textPrompt, actionTaken, mediaToSend: media };
  }

  if (hasTimeMatch && (mentionsBarber || session.selectedBarberId)) {
    actionTaken = 'CREATE_APPOINTMENT';

    // Service
    let srv = servicesDb[0];
    if (text.includes('barba') && (text.includes('cabelo') || text.includes('corte') || text.includes('combo'))) srv = servicesDb[2];
    else if (text.includes('barba')) srv = servicesDb[1];
    else if (text.includes('tesoura')) srv = servicesDb[3];
    else if (text.includes('pigmenta')) srv = servicesDb[4];

    // Barber (Diego or Lucas)
    let brb = barbersDb[0];
    if (isLucasChoice) brb = barbersDb[1];
    else if (session.selectedBarberId === '2') brb = barbersDb[1];

    // Time validation (08:00 - 21:00)
    let timeStr = '16:00';
    if (hasTimeMatch) {
      const h = parseInt(hasTimeMatch[1] || hasTimeMatch[3] || '16', 10);
      const m = parseInt(hasTimeMatch[2] || '0', 10);
      if (h >= 8 && h <= 21) {
        timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    const curDate = session.selectedDate || 'today';
    const dateLabel = getDateLabel(curDate);

    const split = calculateSplit({
      servicePrice: srv.price,
      onlineDiscountActive: true,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
      barberCommissionRate: 50,
    });

    // Validate in Database
    const isFree = await lockSlotInDatabase(brb.id, timeStr, curDate, cleanPhone, {
      serviceName: srv.name,
      price: split.finalPrice,
      paymentMethod: 'Pendente (Aguardando escolha)',
    });
    if (!isFree) {
      const altSlots = await getRealAvailableSlots(brb.id, curDate);
      reply = `⚠️ O horário das *${timeStr}* de ${dateLabel.toLowerCase()} com ${brb.name} já está ocupado na agenda!\n\n` +
        `Temos os seguintes horários livres para ele (${dateLabel}):\n☀️ ${altSlots.afternoon.slice(0, 3).join(', ')}\n\nQual desses você prefere?`;
      session.history.push({ role: 'assistant', content: reply });
      return { reply };
    }

    pixCopiaCola = makePix(split.finalPrice);
    bookingData = { service: srv.name, barber: brb.name, date: dateLabel, time: timeStr, originalPrice: srv.price, finalPrice: split.finalPrice };
    session.selectedServiceId = srv.id;
    session.selectedBarberId = brb.id;
    session.selectedTime = timeStr;
    session.stage = 'CONFIRMING';

    const clientHeader = clientDisplayName ? `👤 *Cliente:* ${clientDisplayName}\n` : '';

    reply = `✅ *Agendamento Pré-Reservado!*\n\n` +
      clientHeader +
      `💈 *Serviço:* ${srv.name}\n` +
      `✂️ *Barbeiro:* ${brb.name} (${brb.chair})\n` +
      `⏰ *Data & Horário:* ${dateLabel} às *${timeStr}*\n\n` +
      `💰 *Como você prefere realizar o pagamento?*\n\n` +
      `1️⃣ *Pagar agora no Pix com 10% de Desconto:*\n` +
      `   De ~R$ ${srv.price.toFixed(2)}~ por apenas 👉 *R$ ${split.finalPrice.toFixed(2)}*\n` +
      `   _(Economize R$ ${(srv.price * 0.1).toFixed(2)} e garanta sua vaga sem risco de fila!)_\n\n` +
      `2️⃣ *Pagar na barbearia no momento do corte:*\n` +
      `   Valor integral de *R$ ${srv.price.toFixed(2)}* (Dinheiro, Cartão Débito ou Crédito)\n\n` +
      `👉 *Digite 1 para Pix com Desconto ou 2 para Pagar na Barbearia:*`;

    session.history.push({ role: 'assistant', content: reply });
    return { reply, actionTaken, bookingData, pixCopiaCola };
  }

  // -------------------------------------------------------------
  // STATE MACHINE FLOW (Grounded in Database Validation)
  // -------------------------------------------------------------

  // === STAGE: GREETING ===
  if (session.stage === 'GREETING') {
    // Option 1: Consultar horários livres -> ALWAYS ask which barber first + send photos!
    if (text === '1' || text.includes('horario') || text.includes('horário') || text.includes('vaga') || text.includes('disponib') || text.includes('quando tem')) {
      session.stage = 'CHOOSING_BARBER';
      actionTaken = 'PRESENT_BARBERS';
      const { media, textPrompt } = getBarbersPresentation();

      session.history.push({ role: 'assistant', content: textPrompt });
      return { reply: textPrompt, actionTaken, mediaToSend: media };
    }
    // Option 2: Ver tabela de serviços e preços
    else if (text === '2' || text.includes('preço') || text.includes('preco') || text.includes('valor') || text.includes('tabela') || text.includes('quanto custa') || text.includes('serviço')) {
      session.stage = 'CHOOSING_SERVICE';
      actionTaken = 'LIST_SERVICES';
      reply = `💈 *Tabela de Serviços & Preços — Atelier 88*\n\n` +
        `1️⃣ *Fade Navalhado / Degradê* — R$ 50,00\n` +
        `  └ ⚡ *R$ 45,00* no Pix (10% OFF) • ~40 min\n\n` +
        `2️⃣ *Barboterapia com Toalha Quente* — R$ 45,00\n` +
        `  └ ⚡ *R$ 40,50* no Pix (10% OFF) • ~30 min\n\n` +
        `3️⃣ *Combo Completo (Cabelo + Barba)* — R$ 85,00\n` +
        `  └ ⚡ *R$ 76,50* no Pix (10% OFF) • ~60 min\n\n` +
        `4️⃣ *Corte Clássico na Tesoura* — R$ 55,00\n` +
        `  └ ⚡ *R$ 49,50* no Pix (10% OFF) • ~45 min\n\n` +
        `5️⃣ *Alinhamento & Pigmentação* — R$ 35,00\n` +
        `  └ ⚡ *R$ 31,50* no Pix (10% OFF) • ~25 min\n\n` +
        `👉 *Qual desses você gostaria de agendar?*\n` +
        `_Digite o número do serviço (ex: 1, 2 ou 3) para prosseguir._`;
    }
    // Option 3: Agendar direto -> Present the 2 barbers with photos
    else if (text === '3' || text.includes('agendar') || text.includes('marcar') || text.includes('cortar')) {
      session.stage = 'CHOOSING_BARBER';
      actionTaken = 'PRESENT_BARBERS';
      const { media, textPrompt } = getBarbersPresentation();

      session.history.push({ role: 'assistant', content: textPrompt });
      return { reply: textPrompt, actionTaken, mediaToSend: media };
    }
    // Greeting inicial
    else {
      actionTaken = 'GREETING';
      const greetingName = clientDisplayName ? `, ${clientDisplayName}` : '';
      reply = `Olá${greetingName}! 💈 Seja muito bem-vindo ao *Atelier 88 Barber Lounge*!\n\n` +
        `Sou a secretária virtual da barbearia. Como posso te ajudar hoje?\n\n` +
        `1️⃣ Consultar horários livres para hoje ou amanhã\n` +
        `2️⃣ Ver nossa tabela de serviços e preços (com 10% OFF no Pix)\n` +
        `3️⃣ Agendar um corte direto comigo\n\n` +
        `👉 *Digite 1, 2 ou 3*, ou me mande um áudio/mensagem que eu respondo!`;
    }
  }

  // === STAGE: CHOOSING_SERVICE ===
  else if (session.stage === 'CHOOSING_SERVICE') {
    let selectedSrv = servicesDb[0];
    if (text === '1' || text.includes('fade') || text.includes('degrade') || text.includes('degradê')) {
      selectedSrv = servicesDb[0];
    } else if (text === '2' || (text.includes('barba') && !text.includes('cabelo') && !text.includes('combo'))) {
      selectedSrv = servicesDb[1];
    } else if (text === '3' || text.includes('combo') || (text.includes('cabelo') && text.includes('barba'))) {
      selectedSrv = servicesDb[2];
    } else if (text === '4' || text.includes('tesoura') || text.includes('classico') || text.includes('clássico')) {
      selectedSrv = servicesDb[3];
    } else if (text === '5' || text.includes('pigmenta') || text.includes('alinhamento')) {
      selectedSrv = servicesDb[4];
    }

    session.selectedServiceId = selectedSrv.id;
    session.stage = 'CHOOSING_BARBER';
    actionTaken = 'SELECT_SERVICE';

    const { media, textPrompt } = getBarbersPresentation();
    const serviceReply = `Show de bola! 💈 Você escolheu: *${selectedSrv.name}* (R$ ${(selectedSrv.price * 0.9).toFixed(2)} no Pix).\n\n` + textPrompt;

    session.history.push({ role: 'assistant', content: serviceReply });
    return { reply: serviceReply, actionTaken, mediaToSend: media };
  }

  // -------------------------------------------------------------
  // GUARANTEED CONTEXTUAL FALLBACK (Never return empty string!)
  // -------------------------------------------------------------
  if (!reply || reply.trim() === '') {
    if (session.stage === 'CHOOSING_TIME') {
      const brb = barbersDb.find((b) => b.id === session.selectedBarberId) || barbersDb[0];
      const curDate = session.selectedDate || 'today';
      const dateLabel = getDateLabel(curDate);
      reply = `Desculpe, não consegui entender o horário. 😊\n\n` +
        `Para agendar com *${brb.name}* (${dateLabel}):\n` +
        `• Você pode me responder com o horário desejado (ex: *14:00*, *15:30*, *17:00*)\n` +
        `• Ou digitar *outro profissional* para ver outro barbeiro\n` +
        `• Ou digitar *amanhã* para ver os horários de amanhã\n` +
        `• Ou digitar *voltar* para a etapa anterior.`;
    } else if (session.stage === 'CONFIRMING') {
      reply = `Desculpe, não compreendi. Para confirmar sua vaga na agenda:\n\n` +
        `1️⃣ Digite *1* para pagar no Pix com 10% de desconto\n` +
        `2️⃣ Digite *2* para pagar na barbearia no momento do corte\n\n` +
        `_(Ou digite *voltar* caso queira alterar o horário ou profissional)_`;
    } else if (session.stage === 'CHOOSING_BARBER') {
      const { media, textPrompt } = getBarbersPresentation();
      reply = `Com qual profissional você prefere o seu atendimento? 💈\n\n` + textPrompt;
      mediaToSend = media;
    } else if (session.stage === 'CHOOSING_SERVICE') {
      reply = `Desculpe, não entendi. Qual serviço você gostaria de agendar?\n\n` +
        `1️⃣ Fade Navalhado / Degradê (R$ 45 no Pix)\n` +
        `2️⃣ Barboterapia (R$ 40,50 no Pix)\n` +
        `3️⃣ Combo Cabelo + Barba (R$ 76,50 no Pix)\n` +
        `4️⃣ Corte Clássico na Tesoura (R$ 49,50 no Pix)\n` +
        `5️⃣ Alinhamento & Pigmentação (R$ 31,50 no Pix)\n\n` +
        `👉 Digite o número ou o nome do serviço!`;
    } else {
      const greetingName = clientDisplayName ? `, ${clientDisplayName}` : '';
      reply = `Olá${greetingName}! 💈 Como posso te ajudar hoje?\n\n` +
        `1️⃣ Consultar horários livres para hoje ou amanhã\n` +
        `2️⃣ Ver nossa tabela de serviços e preços (com 10% OFF no Pix)\n` +
        `3️⃣ Agendar um corte direto comigo\n\n` +
        `👉 *Digite 1, 2 ou 3*, ou me mande sua dúvida com suas próprias palavras!`;
    }
  }

  session.history.push({ role: 'assistant', content: reply });
  return { reply, actionTaken, bookingData, pixCopiaCola, mediaToSend };
}
