import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db.js';
import { processWhatsAppMessage, bookedSlotsStore } from './aiAgent.js';

const STORE_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'conversations_store.json');

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookUrl: string;
}

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE';

export interface WhatsAppConversation {
  id: string;
  customerPhone: string;
  customerName: string;
  avatar: string;
  unreadCount: number;
  aiActive: boolean; // true = IA respondendo, false = Humano assumiu o chat
  status: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'WAITING';
  lastMessage: string;
  lastMessageTime: string;
  customerDetails: {
    visitsCount: number;
    totalSpent: number;
    preferredBarber: string;
    lastCutDate: string;
    noShowCount: number;
    vipMember: boolean;
  };
  messages: Array<{
    id: string;
    sender: 'client' | 'ai' | 'human';
    text: string;
    time: string;
    isAudio?: boolean;
    audioDuration?: string;
    bookingData?: any;
    pixCopiaCola?: string;
    mediaItems?: Array<{ url: string; caption?: string }>;
  }>;
}

export interface AutomatedNotification {
  id: string;
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  triggerTime: string;
  template: string;
  sentThisMonth: number;
  impactMetric: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  segment: string;
  totalRecipients: number;
  deliveredCount: number;
  repliedCount: number;
  bookingsCount: number;
  revenueGenerated: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  createdAt: string;
  messageText: string;
}

// Ensure local JSON storage directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[EvolutionStore] Could not ensure data directory:', err);
  }
}

// Load conversations from local JSON fallback
function loadConversationsFromJson(): WhatsAppConversation[] {
  try {
    ensureDataDir();
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[EvolutionStore] Error loading from conversations_store.json:', err);
  }
  return [];
}

// Save conversations to local JSON fallback
function saveConversationsToJson(conversations: WhatsAppConversation[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify(conversations, null, 2), 'utf-8');
  } catch (err) {
    console.error('[EvolutionStore] Error writing to conversations_store.json:', err);
  }
}

// Persist a single conversation and its messages to Prisma
async function persistConversationToDb(conv: WhatsAppConversation) {
  try {
    await prisma.whatsAppConversation.upsert({
      where: { id: conv.id },
      update: {
        customerPhone: conv.customerPhone,
        customerName: conv.customerName,
        avatar: conv.avatar,
        unreadCount: conv.unreadCount,
        aiActive: conv.aiActive,
        status: conv.status,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
      },
      create: {
        id: conv.id,
        customerPhone: conv.customerPhone,
        customerName: conv.customerName,
        avatar: conv.avatar,
        unreadCount: conv.unreadCount,
        aiActive: conv.aiActive,
        status: conv.status,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
      },
    });

    // Persist messages
    if (conv.messages && conv.messages.length > 0) {
      for (const msg of conv.messages) {
        await prisma.whatsAppMessage.upsert({
          where: { id: msg.id },
          update: {
            text: msg.text,
            time: msg.time,
          },
          create: {
            id: msg.id,
            conversationId: conv.id,
            sender: msg.sender,
            text: msg.text,
            time: msg.time,
            isAudio: Boolean(msg.isAudio),
            audioDuration: msg.audioDuration || null,
            bookingData: msg.bookingData ? (msg.bookingData as any) : undefined,
            pixCopiaCola: msg.pixCopiaCola || null,
            mediaItems: msg.mediaItems ? (msg.mediaItems as any) : undefined,
          },
        });
      }
    }
  } catch (err) {
    // MySQL is offline or tables not migrated — gracefully ignore since JSON store holds data
  }
}

// Real calculation of Customer Metrics grounded on Prisma and local bookings
export async function calculateCustomerMetrics(phone: string): Promise<{
  visitsCount: number;
  totalSpent: number;
  preferredBarber: string;
  lastCutDate: string;
  noShowCount: number;
  vipMember: boolean;
}> {
  const cleanPhone = phone.replace(/\D/g, '') || phone;
  const digits8 = cleanPhone.slice(-8);

  let visitsCount = 0;
  let totalSpent = 0;
  let noShowCount = 0;
  let vipMember = false;
  let lastCutDate = 'Hoje';
  const barberCounts: Record<string, number> = {};

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        phone: {
          contains: digits8,
        },
      },
      include: {
        appointments: {
          include: {
            barber: {
              include: { user: true },
            },
            service: true,
            transaction: true,
          },
          orderBy: { startsAt: 'desc' },
        },
      },
    });

    if (customer) {
      vipMember = Boolean(customer.isVipMember);
      const appointments = customer.appointments || [];

      for (const apt of appointments) {
        if (apt.status === 'COMPLETED' || apt.status === 'CONFIRMED') {
          visitsCount++;
          const price = Number(apt.finalPrice || apt.originalPrice || 0);
          totalSpent += price;

          const barberName = apt.barber?.nickname || apt.barber?.user?.name;
          if (barberName) {
            barberCounts[barberName] = (barberCounts[barberName] || 0) + 1;
          }

          if (lastCutDate === 'Hoje' && apt.startsAt) {
            lastCutDate = new Date(apt.startsAt).toLocaleDateString('pt-BR');
          }
        } else if (apt.status === 'NO_SHOW') {
          noShowCount++;
        }
      }
    }
  } catch (err) {
    // Database offline
  }

  // Also include any bookings made in current session/bookedSlotsStore
  const localBooked = bookedSlotsStore.filter(
    (b) => b.customerPhone.replace(/\D/g, '').endsWith(digits8)
  );

  for (const b of localBooked) {
    visitsCount++;
    totalSpent += b.price || 50;
    const bName = b.barberId === '2' ? 'Lucas Lima' : 'Diego Santos';
    barberCounts[bName] = (barberCounts[bName] || 0) + 1;
    if (b.dateLabel) {
      lastCutDate = b.dateLabel.split(' ')[0] || 'Hoje';
    }
  }

  // Tally favorite barber
  let preferredBarber = 'Primeiro disponível';
  let maxCount = 0;
  for (const [name, count] of Object.entries(barberCounts)) {
    if (count > maxCount) {
      maxCount = count;
      preferredBarber = name;
    }
  }

  return {
    visitsCount: Math.max(visitsCount, 1),
    totalSpent,
    preferredBarber,
    lastCutDate,
    noShowCount,
    vipMember,
  };
}

// Global Evolution & Persistent Conversations Manager
class EvolutionManager {
  private config: EvolutionConfig = {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8088',
    apiKey: process.env.EVOLUTION_API_KEY || '2aae0a23c401aa219d1aa8fffc58607e10beb406549f780136b1e864c19e7d27',
    instanceName: process.env.EVOLUTION_INSTANCE || 'barber-ia',
    webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3333/api/webhooks/whatsapp',
  };

  private status: ConnectionStatus = 'QR_CODE';
  private connectedPhone = '';
  private deviceModel = 'Aparelho WhatsApp Business';
  private batteryLevel = 92;
  private isCharging = false;
  private lastDisconnectAlert: string | null = null;

  // Conversations Store with local JSON fallback & Prisma sync
  private conversations: WhatsAppConversation[] = [];

  // Automated Notifications Triggers
  private notifications: AutomatedNotification[] = [
    {
      id: 'notif-1',
      key: 'REMINDER_2H',
      title: 'Lembrete de Agendamento (2 Horas Antes)',
      description: 'Envia mensagem automática para o cliente confirmando presença. Reduz faltas (no-show) em até 85%.',
      enabled: true,
      triggerTime: '2 horas antes do horário',
      template: 'Fala {cliente}! 💈 Lembrando do seu agendamento hoje às {horario} com {barbeiro}. Para confirmar, responda [1]. Se precisar reagendar, responda [2]. Te esperamos!',
      sentThisMonth: 184,
      impactMetric: '97.4% de Presença',
    },
    {
      id: 'notif-2',
      key: 'REMINDER_EVE',
      title: 'Lembrete de Véspera (Noite Anterior)',
      description: 'Disparado às 20h do dia anterior ao corte para evitar esquecimentos.',
      enabled: true,
      triggerTime: 'Às 20:00 da véspera',
      template: 'Boa noite, {cliente}! Passando para lembrar do seu corte amanhã às {horario} no {barbearia}. Até amanhã!',
      sentThisMonth: 122,
      impactMetric: 'Zero esquecimentos',
    },
    {
      id: 'notif-3',
      key: 'RECOVERY_25D',
      title: 'Recuperação de Cliente Sumido (Anti-Churn)',
      description: 'Quando o cliente passa de 25 dias sem cortar, a IA dispara um convite com 10% OFF para reativá-lo.',
      enabled: true,
      triggerTime: '25 dias após o último corte',
      template: 'Fala {cliente}! Já faz 25 dias desde o seu último corte com {barbeiro}. Seu visual já merece aquele trato de respeito! Agende hoje pelo Pix e ganhe 10% OFF.',
      sentThisMonth: 48,
      impactMetric: '41 Clientes Reativados (R$ 2.450)',
    },
    {
      id: 'notif-4',
      key: 'POST_CUT_NPS',
      title: 'Pesquisa de Satisfação & Google Reviews (Pós-Corte)',
      description: 'Disparo 45 minutos após o corte. Se o cliente der nota 5, convida para avaliar a barbearia no Google!',
      enabled: true,
      triggerTime: '45 minutos após o serviço',
      template: 'Opa {cliente}! O que achou do atendimento do {barbeiro} hoje? De 1 a 5 estrelas, qual nota você dá para o resultado do seu corte?',
      sentThisMonth: 160,
      impactMetric: 'Nota 4.9 no Google (+32 reviews)',
    },
    {
      id: 'notif-5',
      key: 'BIRTHDAY_GIFT',
      title: 'Aniversariantes do Mês',
      description: 'Envia um parabéns caloroso com 20% de desconto ou serviço cortesia na semana do aniversário.',
      enabled: true,
      triggerTime: 'Às 09:00 no dia do aniversário',
      template: 'Parabéns {cliente}! 🎂 A equipe do {barbearia} deseja muita saúde e sucesso! Seu presente da semana: 20% OFF no seu corte ou barba. Vem comemorar!',
      sentThisMonth: 19,
      impactMetric: '14 Aniversariantes Agendaram',
    },
    {
      id: 'notif-6',
      key: 'PIX_CONFIRMED',
      title: 'Confirmação de Pagamento Pix Instantâneo',
      description: 'Envia o recibo do Pix e os dados da reserva assim que o webhook do banco compensa o pagamento.',
      enabled: true,
      triggerTime: 'Instantâneo após pagamento Pix',
      template: 'Pagamento Pix recebido com sucesso! ✅ Seu horário com {barbeiro} está bloqueado na agenda. Código de segurança do agendamento: #{codigo}',
      sentThisMonth: 215,
      impactMetric: '100% de Automação',
    },
  ];

  // Marketing Broadcast Campaigns
  private campaigns: WhatsAppCampaign[] = [
    {
      id: 'camp-1',
      name: 'Sextou com Chopp Cortesia & Barba Terapia',
      segment: 'Todos os Clientes Ativos (1.264 contatos)',
      totalRecipients: 1264,
      deliveredCount: 1252,
      repliedCount: 482,
      bookingsCount: 68,
      revenueGenerated: 5780.00,
      status: 'COMPLETED',
      createdAt: '18/10/2026',
      messageText: 'Fala meu camarada! Sexta-feira chegou no Atelier 88. Hoje quem agendar Combo Cabelo + Barba ganha Chopp artesanal gelado cortesia na faixa! Quer garantir seu horário?',
    },
    {
      id: 'camp-2',
      name: 'Resgate de Clientes Inativos (+30 dias)',
      segment: 'Clientes Inativos (148 contatos)',
      totalRecipients: 148,
      deliveredCount: 146,
      repliedCount: 52,
      bookingsCount: 29,
      revenueGenerated: 2175.00,
      status: 'COMPLETED',
      createdAt: '12/10/2026',
      messageText: 'Sentimos sua falta por aqui! Liberamos um cupom especial de 15% OFF no Pix para você renovar o visual nesta semana com seu barbeiro preferido. Vamos agendar?',
    },
    {
      id: 'camp-3',
      name: 'Abertura de Agenda Especial - Fim de Ano VIP',
      segment: 'Assinantes Clube VIP (54 contatos)',
      totalRecipients: 54,
      deliveredCount: 54,
      repliedCount: 41,
      bookingsCount: 38,
      revenueGenerated: 3420.00,
      status: 'COMPLETED',
      createdAt: '05/10/2026',
      messageText: 'Exclusivo para membros VIP! A agenda para as semanas de Natal e Réveillon acabou de abrir com exclusividade de 48h para você antes do público geral. Reserve agora!',
    },
  ];

  constructor() {
    // 1. Instantly load conversations from JSON fallback
    this.conversations = loadConversationsFromJson();

    // 2. Asynchronously load centralized config from Database or Env
    this.loadConfigFromDbOrEnv().catch(() => {});

    // 3. Asynchronously sync conversations from Prisma if MySQL is active
    this.syncInitialDataFromDb().catch(() => {});
  }

  // Centralized Configuration loader: Database (whatsapp_settings) -> process.env fallback
  public async loadConfigFromDbOrEnv(): Promise<EvolutionConfig> {
    try {
      const row = await prisma.whatsAppSetting.findFirst({
        where: { id: 'default' },
      });
      if (row) {
        if (row.apiUrl) {
          this.config.apiUrl = row.apiUrl.includes('18080') 
            ? (process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8088') 
            : row.apiUrl;
        }
        if (row.instanceName) this.config.instanceName = row.instanceName;
        if (row.webhookUrl) this.config.webhookUrl = row.webhookUrl;
        if (row.status) this.status = (row.status as ConnectionStatus) || this.status;
        if (row.connectedPhone) this.connectedPhone = row.connectedPhone;
        if (row.deviceModel) this.deviceModel = row.deviceModel;
        if (row.batteryLevel !== null && row.batteryLevel !== undefined) this.batteryLevel = row.batteryLevel;
        if (row.isCharging !== null && row.isCharging !== undefined) this.isCharging = Boolean(row.isCharging);
      }
    } catch (err) {
      // MySQL offline — keep current environment config
    }
    return this.config;
  }

  // Initial sync from Prisma database
  private async syncInitialDataFromDb() {
    try {
      const dbConvs = await prisma.whatsAppConversation.findMany({
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbConvs && dbConvs.length > 0) {
        const merged: WhatsAppConversation[] = dbConvs.map((c) => ({
          id: c.id,
          customerPhone: c.customerPhone,
          customerName: c.customerName,
          avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.customerName)}&background=0284c7&color=fff&bold=true`,
          unreadCount: c.unreadCount,
          aiActive: c.aiActive,
          status: (c.status as any) || 'AI_HANDLING',
          lastMessage: c.lastMessage || '',
          lastMessageTime: c.lastMessageTime || '',
          customerDetails: {
            visitsCount: 1,
            totalSpent: 0,
            preferredBarber: 'Primeiro disponível',
            lastCutDate: 'Hoje',
            noShowCount: 0,
            vipMember: false,
          },
          messages: c.messages.map((m) => ({
            id: m.id,
            sender: (m.sender as any) || 'client',
            text: m.text,
            time: m.time,
            isAudio: m.isAudio,
            audioDuration: m.audioDuration || undefined,
            bookingData: m.bookingData || undefined,
            pixCopiaCola: m.pixCopiaCola || undefined,
            mediaItems: (m.mediaItems as any) || undefined,
          })),
        }));

        this.conversations = merged;
        saveConversationsToJson(this.conversations);
      }
    } catch (err) {
      // Ignore if DB not reachable
    }
  }

  // --- API Methods ---

  public async getStatus() {
    await this.loadConfigFromDbOrEnv();
    let evolutionOnline = false;

    try {
      const res = await fetch(`${this.config.apiUrl}/instance/connectionState/${this.config.instanceName}`, {
        headers: {
          'apikey': this.config.apiKey,
          'Origin': this.config.apiUrl,
        },
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        evolutionOnline = true;
        const data: any = await res.json();
        const state = data?.instance?.state;
        if (state === 'open') {
          this.status = 'CONNECTED';
          this.lastDisconnectAlert = null;

          // Fetch device info
          try {
            const instRes = await fetch(`${this.config.apiUrl}/instance/fetchInstances`, {
              headers: { 'apikey': this.config.apiKey, 'Origin': this.config.apiUrl },
              signal: AbortSignal.timeout(2500),
            });
            if (instRes.ok) {
              const instances: any = await instRes.json();
              const myInst = Array.isArray(instances) ? instances.find((i: any) => i.name === this.config.instanceName) : instances;
              if (myInst?.ownerJid) {
                this.connectedPhone = '+' + myInst.ownerJid.replace('@s.whatsapp.net', '');
              }
              if (myInst?.profileName) {
                this.deviceModel = `${myInst.profileName} • WhatsApp Conectado`;
              }
            }
          } catch (e) {
            console.error('Error fetching instance details:', e);
          }
        } else if (state === 'connecting') {
          this.status = 'QR_CODE';
        } else {
          this.status = 'DISCONNECTED';
        }
      }
    } catch (err) {
      // Evolution API offline or timed out
      evolutionOnline = false;
    }

    return {
      status: this.status,
      connectedPhone: this.connectedPhone || 'Aguardando Leitura',
      deviceModel: this.deviceModel,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging,
      instanceName: this.config.instanceName,
      apiUrl: this.config.apiUrl,
      webhookUrl: this.config.webhookUrl,
      lastDisconnectAlert: this.lastDisconnectAlert,
      evolutionOnline,
      stats: {
        activeChats: this.conversations.length,
        aiAutomatedPercentage: '88%',
        responseLatency: '0.6s (Gemini Flash)',
      },
    };
  }

  public async setConnectionStatus(newStatus: ConnectionStatus, disconnectReason?: string) {
    if (newStatus === 'DISCONNECTED') {
      try {
        await fetch(`${this.config.apiUrl}/instance/logout/${this.config.instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': this.config.apiKey, 'Origin': this.config.apiUrl },
          signal: AbortSignal.timeout(2000),
        });
      } catch (e) {
        // Ignore logout error if service is offline
      }
      this.status = 'DISCONNECTED';
      this.lastDisconnectAlert = disconnectReason || 'O aparelho foi desconectado pelo usuário.';
    } else if (newStatus === 'CONNECTED') {
      this.status = 'CONNECTED';
      if (!this.connectedPhone || this.connectedPhone === 'Aguardando Leitura') {
        this.connectedPhone = '+55 (11) 98765-4321';
      }
      if (!this.deviceModel || this.deviceModel.includes('Aguardando')) {
        this.deviceModel = 'iPhone 15 Pro • WhatsApp Business';
      }
      this.lastDisconnectAlert = null;
    } else if (newStatus === 'QR_CODE') {
      this.status = 'QR_CODE';
      this.connectedPhone = 'Aguardando Leitura';
    }
    return this.getStatus();
  }

  public async getQrCode() {
    try {
      const res = await fetch(`${this.config.apiUrl}/instance/connect/${this.config.instanceName}`, {
        headers: {
          'apikey': this.config.apiKey,
          'Origin': this.config.apiUrl,
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data: any = await res.json();
        const base64 = data?.base64 || data?.qrcode?.base64 || data?.code;
        if (base64) {
          this.status = 'QR_CODE';
          return {
            status: 'QR_CODE',
            qrCodeData: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
            pairingCode: data.pairingCode || null,
            expiresInSeconds: 45,
            evolutionOnline: true,
            apiUrl: this.config.apiUrl,
            instanceName: this.config.instanceName,
          };
        }
      } else if (res.status === 404) {
        // Auto-create instance if not existing yet in Evolution API
        try {
          const createRes = await fetch(`${this.config.apiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'apikey': this.config.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceName: this.config.instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (createRes.ok) {
            const createData: any = await createRes.json();
            const base64 = createData?.qrcode?.base64 || createData?.base64;
            if (base64) {
              this.status = 'QR_CODE';
              return {
                status: 'QR_CODE',
                qrCodeData: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
                pairingCode: createData?.qrcode?.pairingCode || null,
                expiresInSeconds: 45,
                evolutionOnline: true,
                apiUrl: this.config.apiUrl,
                instanceName: this.config.instanceName,
              };
            }
          }
        } catch (e) {
          console.warn('[EvolutionApi] Auto-create instance attempt failed:', e);
        }
      }
    } catch (err: any) {
      console.warn('[EvolutionApi] Evolution API offline at', this.config.apiUrl, err.message);
    }

    return {
      status: 'QR_CODE',
      qrCodeData: '',
      pairingCode: null,
      expiresInSeconds: 45,
      evolutionOnline: false,
      apiUrl: this.config.apiUrl,
      instanceName: this.config.instanceName,
      message: `Evolution API offline em ${this.config.apiUrl}. Inicie o container Docker ou altere o endereço nas configurações.`,
    };
  }

  public async sendEvolutionTextMessage(phone: string, text: string) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      await fetch(`${this.config.apiUrl}/message/sendText/${this.config.instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json',
          'Origin': this.config.apiUrl,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
        }),
      });
      return true;
    } catch (err) {
      console.error('Error sending message via Evolution API:', err);
      return false;
    }
  }

  public async sendEvolutionMediaMessage(phone: string, mediaUrl: string, caption?: string) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch(`${this.config.apiUrl}/message/sendMedia/${this.config.instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json',
          'Origin': this.config.apiUrl,
        },
        body: JSON.stringify({
          number: cleanPhone,
          mediatype: 'image',
          media: mediaUrl,
          caption: caption || '',
        }),
      });
      if (!res.ok) {
        console.warn('sendEvolutionMediaMessage responded with status:', res.status);
      }
    } catch (err) {
      console.error('Error sending media message via Evolution API:', err);
    }
  }

  public async updateConfig(newConfig: Partial<EvolutionConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      await prisma.whatsAppSetting.upsert({
        where: { id: 'default' },
        update: {
          apiUrl: this.config.apiUrl,
          instanceName: this.config.instanceName,
          webhookUrl: this.config.webhookUrl,
        },
        create: {
          id: 'default',
          apiUrl: this.config.apiUrl,
          instanceName: this.config.instanceName,
          webhookUrl: this.config.webhookUrl,
        },
      });
    } catch (err) {
      // MySQL offline
    }
    return this.config;
  }

  public async fetchProfilePictureUrl(phone: string): Promise<string | null> {
    if (this.status !== 'CONNECTED') return null;
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch(`${this.config.apiUrl}/chat/fetchProfilePictureUrl/${this.config.instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json',
          'Origin': this.config.apiUrl,
        },
        body: JSON.stringify({ number: cleanPhone }),
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data: any = await res.json();
        const pic = data?.profilePictureUrl || data?.pictureUrl || null;
        if (pic && typeof pic === 'string' && pic.startsWith('http')) {
          return pic;
        }
      }
    } catch (err) {
      // Graceful fallback
    }
    return null;
  }

  // Get conversations with fresh metrics calculated from Database & JSON store
  public async getConversations() {
    // 1. Try background sync from DB if any new conversations exist
    try {
      const dbCount = await prisma.whatsAppConversation.count();
      if (dbCount > 0 && this.conversations.length === 0) {
        await this.syncInitialDataFromDb();
      }
    } catch (e) {}

    // 2. Proactively refresh avatars and compute real Customer Metrics for each conversation
    await Promise.allSettled(
      this.conversations.map(async (conv) => {
        // Calculate dynamic metrics from DB
        conv.customerDetails = await calculateCustomerMetrics(conv.customerPhone);

        // Fetch WhatsApp profile picture if missing
        if (!conv.avatar || conv.avatar.includes('unsplash.com') || conv.avatar.includes('ui-avatars.com')) {
          const cleanPhone = conv.customerPhone.replace(/\D/g, '');
          const pic = await this.fetchProfilePictureUrl(cleanPhone);
          if (pic) {
            conv.avatar = pic;
          }
        }
      })
    );

    // Save refreshed metrics to local JSON fallback
    saveConversationsToJson(this.conversations);
    return this.conversations;
  }

  public getConversationById(id: string) {
    return this.conversations.find((c) => c.id === id);
  }

  public async deleteConversation(id: string) {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    saveConversationsToJson(this.conversations);

    try {
      await prisma.whatsAppConversation.delete({ where: { id } });
    } catch (err) {
      // DB offline
    }
    return true;
  }

  public async clearAllConversations() {
    this.conversations = [];
    saveConversationsToJson(this.conversations);

    try {
      await prisma.whatsAppConversation.deleteMany();
    } catch (err) {
      // DB offline
    }
    return true;
  }

  public getOrCreateConversation(phone: string, contactName?: string, contactPhoto?: string): WhatsAppConversation {
    const cleanPhone = phone.replace(/\D/g, '') || phone;
    let conv = this.conversations.find((c) => {
      const cClean = c.customerPhone.replace(/\D/g, '');
      return cClean === cleanPhone || c.customerPhone === phone;
    });

    if (!conv) {
      const formattedPhone = cleanPhone.length >= 12
        ? `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, cleanPhone.length - 4)}-${cleanPhone.slice(-4)}`
        : `+${cleanPhone}`;

      const name = (contactName && contactName !== 'Cliente') ? contactName : `Cliente ${cleanPhone.slice(-4)}`;
      const defaultAvatar = contactPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff&bold=true`;

      conv = {
        id: `conv-${cleanPhone}`,
        customerPhone: formattedPhone,
        customerName: name,
        avatar: defaultAvatar,
        unreadCount: 0,
        aiActive: true,
        status: 'AI_HANDLING',
        lastMessage: '',
        lastMessageTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        customerDetails: {
          visitsCount: 1,
          totalSpent: 0,
          preferredBarber: 'Primeiro disponível',
          lastCutDate: 'Hoje',
          noShowCount: 0,
          vipMember: false,
        },
        messages: [],
      };

      // Asynchronously fetch real WhatsApp profile picture from Evolution API
      if (!contactPhoto || !contactPhoto.includes('whatsapp.net')) {
        this.fetchProfilePictureUrl(cleanPhone).then((pic) => {
          if (pic && conv) {
            conv.avatar = pic;
            saveConversationsToJson(this.conversations);
          }
        });
      }

      // Proactively compute customer metrics
      calculateCustomerMetrics(cleanPhone).then((metrics) => {
        if (conv) {
          conv.customerDetails = metrics;
          saveConversationsToJson(this.conversations);
        }
      });

      // Insert at the top of conversations list
      this.conversations.unshift(conv);
      saveConversationsToJson(this.conversations);
      persistConversationToDb(conv).catch(() => {});
    } else {
      if (contactName && contactName !== 'Cliente' && conv.customerName.startsWith('Cliente ')) {
        conv.customerName = contactName;
      }
      if (contactPhoto && contactPhoto.includes('whatsapp.net')) {
        conv.avatar = contactPhoto;
      } else if (!conv.avatar || conv.avatar.includes('unsplash.com') || conv.avatar.includes('ui-avatars.com')) {
        this.fetchProfilePictureUrl(cleanPhone).then((pic) => {
          if (pic && conv) {
            conv.avatar = pic;
            saveConversationsToJson(this.conversations);
          }
        });
      }
      saveConversationsToJson(this.conversations);
      persistConversationToDb(conv).catch(() => {});
    }

    return conv;
  }

  public recordIncomingMessage(
    phone: string, 
    text: string, 
    contactName?: string, 
    aiReply?: string, 
    bookingData?: any, 
    pixCopiaCola?: string,
    mediaToSend?: Array<{ url: string; caption?: string }>,
    contactPhoto?: string
  ): WhatsAppConversation {
    const conv = this.getOrCreateConversation(phone, contactName, contactPhoto);
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Push client's incoming message
    conv.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'client',
      text,
      time: now,
    });
    conv.lastMessage = text;
    conv.lastMessageTime = now;

    // Push AI reply if provided
    if (aiReply) {
      conv.messages.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'ai',
        text: aiReply,
        time: now,
        bookingData,
        pixCopiaCola,
        mediaItems: mediaToSend,
      });
      conv.lastMessage = aiReply;
      conv.lastMessageTime = now;
    }

    // Persist immediately to JSON fallback and asynchronously to Prisma
    saveConversationsToJson(this.conversations);
    persistConversationToDb(conv).catch(() => {});

    return conv;
  }

  public async toggleAiTakeover(conversationId: string, aiActive: boolean) {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return null;
    conv.aiActive = aiActive;
    conv.status = aiActive ? 'AI_HANDLING' : 'HUMAN_HANDLING';

    saveConversationsToJson(this.conversations);
    try {
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: {
          aiActive,
          status: conv.status,
        },
      });
    } catch (err) {}

    return conv;
  }

  public async sendMessage(conversationId: string, text: string, sender: 'human' | 'client' | 'ai' = 'human') {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (!conv) return null;

    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = {
      id: `msg-${Date.now()}`,
      sender,
      text,
      time,
    };

    conv.messages.push(msg);
    conv.lastMessage = text;
    conv.lastMessageTime = time;

    // Persist user/barber message
    saveConversationsToJson(this.conversations);
    persistConversationToDb(conv).catch(() => {});

    // If barber typed a message to the customer, send it out through Evolution API
    if (sender === 'human') {
      const cleanPhone = conv.customerPhone.replace(/\D/g, '');
      if (cleanPhone) {
        await this.sendEvolutionTextMessage(cleanPhone, text);
      }
    }

    // If client sent message and AI is active, invoke AI Agent automatically
    if (sender === 'client' && conv.aiActive) {
      const aiResponse = await processWhatsAppMessage(conv.customerPhone, text, conv.customerName);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai' as const,
        text: aiResponse.reply,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        bookingData: aiResponse.bookingData,
        pixCopiaCola: aiResponse.pixCopiaCola,
        mediaItems: aiResponse.mediaToSend,
      };
      conv.messages.push(aiMsg);
      conv.lastMessage = aiResponse.reply;
      conv.lastMessageTime = aiMsg.time;

      // Update metrics and persist
      conv.customerDetails = await calculateCustomerMetrics(conv.customerPhone);
      saveConversationsToJson(this.conversations);
      persistConversationToDb(conv).catch(() => {});

      // If customer has a real phone, dispatch via WhatsApp
      const cleanPhone = conv.customerPhone.replace(/\D/g, '');
      if (cleanPhone) {
        if (aiResponse.mediaToSend && aiResponse.mediaToSend.length > 0) {
          for (const media of aiResponse.mediaToSend) {
            await this.sendEvolutionMediaMessage(cleanPhone, media.url, media.caption);
            await new Promise((r) => setTimeout(r, 600));
          }
        }
        await this.sendEvolutionTextMessage(cleanPhone, aiResponse.reply);
      }
    }

    return conv;
  }

  public getNotifications() {
    return this.notifications;
  }

  public toggleNotification(id: string, enabled: boolean) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.enabled = enabled;
    return notif;
  }

  public updateNotificationTemplate(id: string, template: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.template = template;
    return notif;
  }

  public getCampaigns() {
    return this.campaigns;
  }

  public createCampaign(data: { name: string; segment: string; messageText: string; delaySeconds?: number }) {
    let recipientCount = 1264;
    if (data.segment.includes('Inativos')) recipientCount = 148;
    if (data.segment.includes('VIP')) recipientCount = 54;
    if (data.segment.includes('Diego')) recipientCount = 320;

    const newCamp: WhatsAppCampaign = {
      id: `camp-${Date.now()}`,
      name: data.name,
      segment: data.segment,
      totalRecipients: recipientCount,
      deliveredCount: 0,
      repliedCount: 0,
      bookingsCount: 0,
      revenueGenerated: 0,
      status: 'IN_PROGRESS',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      messageText: data.messageText,
    };

    this.campaigns.unshift(newCamp);

    // Simulate progressive broadcast with safety delay
    setTimeout(() => {
      newCamp.deliveredCount = Math.floor(recipientCount * 0.98);
      newCamp.repliedCount = Math.floor(recipientCount * 0.32);
      newCamp.bookingsCount = Math.floor(recipientCount * 0.12);
      newCamp.revenueGenerated = newCamp.bookingsCount * 85;
      newCamp.status = 'COMPLETED';
    }, 4000);

    return newCamp;
  }
}

export const evolutionManager = new EvolutionManager();
