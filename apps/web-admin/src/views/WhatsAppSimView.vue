<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch, onUnmounted } from 'vue';
import { 
  MessageSquareCode, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  Clock,
  Scissors,
  Split,
  ShieldCheck,
  Zap,
  Mic,
  QrCode,
  Smartphone,
  Cpu,
  Sliders,
  CheckCheck,
  Play,
  Volume2,
  Wifi,
  Battery,
  BatteryCharging,
  AlertTriangle,
  Bell,
  Users,
  Flame,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Star,
  Gift,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Settings,
  Power,
  Pause,
  AlertCircle,
  HelpCircle,
  Radio,
  Trash2
} from 'lucide-vue-next';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

// --- Active Tab State ---
type TabType = 'CHAT' | 'CONNECTION' | 'NOTIFICATIONS' | 'CAMPAIGNS' | 'AI_CONFIG';
const activeTab = ref<TabType>('CHAT');

// --- Backend Connection State ---
const API_BASE = '/api/whatsapp';

interface TelemetryState {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE';
  connectedPhone: string;
  deviceModel: string;
  batteryLevel: number;
  isCharging: boolean;
  instanceName: string;
  apiUrl: string;
  webhookUrl: string;
  lastDisconnectAlert: string | null;
  stats: {
    activeChats: number;
    aiAutomatedPercentage: string;
    responseLatency: string;
  };
}

const telemetry = ref<TelemetryState>({
  status: 'CONNECTED',
  connectedPhone: '+55 11 98765-4321',
  deviceModel: 'iPhone 15 Pro • WhatsApp Business',
  batteryLevel: 88,
  isCharging: true,
  instanceName: 'barber-ia',
  apiUrl: 'http://127.0.0.1:8088',
  webhookUrl: 'http://localhost:3333/api/webhooks/whatsapp',
  lastDisconnectAlert: null,
  stats: {
    activeChats: 4,
    aiAutomatedPercentage: '88%',
    responseLatency: '0.6s (Gemini 2.5 Flash)',
  },
});

// QR Code display
const qrCodeData = ref<string>('');
const qrExpiresIn = ref<number>(45);
const evolutionOnline = ref<boolean>(true);
const evolutionMessage = ref<string>('');

// --- Live Conversations State ---
interface ConversationItem {
  id: string;
  customerPhone: string;
  customerName: string;
  avatar: string;
  unreadCount: number;
  aiActive: boolean;
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

// Live conversations loaded strictly from real incoming WhatsApp tests (no mock data)
const conversations = ref<ConversationItem[]>([]);
const selectedConvId = ref<string>('');
const chatSearchQuery = ref('');
const chatFilter = ref<'ALL' | 'AI' | 'HUMAN'>('ALL');
const inputMessage = ref('');
const sendingMessage = ref(false);
const chatScrollContainer = ref<HTMLElement | null>(null);

// Mobile navigation view ('list' | 'chat') & Mobile Dossier
const mobileView = ref<'list' | 'chat'>('list');
const isMobileDossierOpen = ref(false);

// Takeover Dividers Tracking
interface TakeoverDivider {
  id: string;
  convId: string;
  text: string;
  time: string;
  atMessageIndex: number;
}
const takeoverDividers = ref<TakeoverDivider[]>([]);

function recordTakeoverDivider(convId: string, text: string) {
  const currentConv = conversations.value.find((c) => c.id === convId);
  const atIndex = currentConv ? currentConv.messages.length : 0;
  takeoverDividers.value.push({
    id: `divider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    convId,
    text,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    atMessageIndex: atIndex,
  });
}

// Audio Player Simulation State
const playingAudioId = ref<string | null>(null);
const audioProgress = ref<Record<string, number>>({});
let audioInterval: any = null;

const audioBarHeights = [
  35, 65, 45, 80, 100, 70, 50, 85, 60, 40,
  90, 75, 45, 95, 60, 40, 80, 55, 30, 20
];

function toggleAudio(msgId: string) {
  if (playingAudioId.value === msgId) {
    playingAudioId.value = null;
    if (audioInterval) clearInterval(audioInterval);
  } else {
    playingAudioId.value = msgId;
    if (!audioProgress.value[msgId]) audioProgress.value[msgId] = 0;
    if (audioInterval) clearInterval(audioInterval);
    audioInterval = setInterval(() => {
      if (playingAudioId.value === msgId) {
        if ((audioProgress.value[msgId] || 0) < 100) {
          audioProgress.value[msgId] = (audioProgress.value[msgId] || 0) + 5;
        } else {
          audioProgress.value[msgId] = 0;
          playingAudioId.value = null;
          clearInterval(audioInterval);
        }
      }
    }, 200);
  }
}

// Simulation Modal State
const isSimulateModalOpen = ref(false);
const isSimulating = ref(false);
const simulateForm = ref({
  clientName: 'Arthur Silveira',
  clientPhone: '+55 (11) 98765-4321',
  message: 'Quero agendar um corte degradê para hoje',
});

const quickSimMessages = [
  'Quero agendar um corte degradê para hoje',
  'Qual o valor da Barboterapia?',
  'Tem horário com o Diego às 16:30?',
  'Quanto custa corte e barba no Pix?',
  'Gostaria de ver os barbeiros disponíveis',
  'Vocês têm cerveja e estacionamento cortesia?',
];

const clientPresets = [
  { name: 'Arthur Silveira', phone: '+55 11 98765-4321', tag: 'Habitual' },
  { name: 'Maycon Silva', phone: '+55 31 99123-4567', tag: 'Novo' },
  { name: 'Rafael Costa', phone: '+55 21 98888-1122', tag: 'VIP' },
];

function selectClientPreset(preset: { name: string; phone: string }) {
  simulateForm.value.clientName = preset.name;
  simulateForm.value.clientPhone = preset.phone;
}

function selectMessagePreset(msg: string) {
  simulateForm.value.message = msg;
}

function openSimulateModal(customMsg?: string) {
  if (customMsg) {
    simulateForm.value.message = customMsg;
  }
  isSimulateModalOpen.value = true;
}

async function runSimulation() {
  if (!simulateForm.value.message.trim()) {
    toast.show({
      title: 'Mensagem Obrigatória',
      message: 'Informe a mensagem que o cliente enviará.',
      type: 'error',
    });
    return;
  }

  isSimulating.value = true;
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: simulateForm.value.clientName || 'Arthur Silveira',
        clientPhone: simulateForm.value.clientPhone || '+55 11 98765-4321',
        message: simulateForm.value.message,
      }),
    });

    if (res.ok) {
      isSimulateModalOpen.value = false;

      toast.show({
        title: '🤖 Simulação Executada!',
        message: `Sofia respondeu para ${simulateForm.value.clientName} em tempo real.`,
        type: 'success',
        duration: 5000,
      });

      // Reload conversations from backend
      await fetchConversations();

      // Find and select the simulated conversation
      const cleanPhone = simulateForm.value.clientPhone.replace(/\D/g, '');
      const matched = conversations.value.find(
        (c) => c.customerPhone.replace(/\D/g, '') === cleanPhone || 
               c.customerPhone.replace(/\D/g, '').includes(cleanPhone) || 
               cleanPhone.includes(c.customerPhone.replace(/\D/g, '')) ||
               c.id === `conv-${cleanPhone}`
      );

      if (matched) {
        selectedConvId.value = matched.id;
      } else if (conversations.value.length > 0) {
        selectedConvId.value = conversations.value[0].id;
      }

      // Switch to CHAT tab and mobile chat view
      activeTab.value = 'CHAT';
      mobileView.value = 'chat';
      scrollToBottom();
    } else {
      toast.show({
        title: 'Erro na Simulação',
        message: 'O servidor não pôde processar a mensagem simulada.',
        type: 'error',
      });
    }
  } catch (err) {
    console.error(err);
    toast.show({
      title: 'Falha de Conexão',
      message: 'Não foi possível contatar /api/whatsapp/simulate.',
      type: 'error',
    });
  } finally {
    isSimulating.value = false;
  }
}

function runSimulationWithPreset(msg: string) {
  simulateForm.value.message = msg;
  runSimulation();
}

// Selected Conversation computed
const activeConversation = computed(() => {
  if (!selectedConvId.value) return conversations.value[0] || null;
  return conversations.value.find((c) => c.id === selectedConvId.value) || null;
});

// Active Conversation Messages (with system takeover dividers interleaved)
const activeConversationMessages = computed(() => {
  if (!activeConversation.value) return [];
  const msgs = [...activeConversation.value.messages];
  const dividers = takeoverDividers.value.filter((d) => d.convId === activeConversation.value?.id);
  if (dividers.length === 0) return msgs;

  const sorted = [...dividers].sort((a, b) => a.atMessageIndex - b.atMessageIndex);
  const result: any[] = [];
  let dividerIdx = 0;

  for (let i = 0; i <= msgs.length; i++) {
    while (dividerIdx < sorted.length && sorted[dividerIdx].atMessageIndex === i) {
      result.push({
        id: sorted[dividerIdx].id,
        sender: 'system' as const,
        text: sorted[dividerIdx].text,
        time: sorted[dividerIdx].time,
      });
      dividerIdx++;
    }
    if (i < msgs.length) {
      result.push(msgs[i]);
    }
  }

  while (dividerIdx < sorted.length) {
    result.push({
      id: sorted[dividerIdx].id,
      sender: 'system' as const,
      text: sorted[dividerIdx].text,
      time: sorted[dividerIdx].time,
    });
    dividerIdx++;
  }

  return result;
});

// Filtered Conversations
const filteredConversations = computed(() => {
  return conversations.value.filter((conv) => {
    const matchesSearch = 
      conv.customerName.toLowerCase().includes(chatSearchQuery.value.toLowerCase()) ||
      conv.customerPhone.includes(chatSearchQuery.value);
    
    if (!matchesSearch) return false;
    if (chatFilter.value === 'AI') return conv.aiActive;
    if (chatFilter.value === 'HUMAN') return !conv.aiActive;
    return true;
  });
});

// --- Automated Notifications State ---
interface NotificationItem {
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

const defaultNotifications: NotificationItem[] = [
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

const notifications = ref<NotificationItem[]>(defaultNotifications);
const editingNotifId = ref<string | null>(null);

// --- Marketing Campaigns State ---
interface CampaignItem {
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

const defaultCampaigns: CampaignItem[] = [
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
];

const campaigns = ref<CampaignItem[]>(defaultCampaigns);
const isNewCampaignModalOpen = ref(false);
const newCampaignData = ref({
  name: '',
  segment: 'Todos os Clientes Ativos (1.264 contatos)',
  messageText: '',
  delaySeconds: 10,
});

// --- AI Model & Tone Configuration State ---
const aiConfig = ref({
  assistantName: 'Sofia',
  model: 'Google Gemini 2.5 Flash',
  tone: 'BARBER_STREET', // 'BARBER_STREET' | 'PROFESSIONAL' | 'VIP_LUXURY'
  pixDiscountPercent: 10,
  maxLateToleranceMinutes: 15,
  offerComplimentaryBeer: true,
  hasFreeParking: true,
  customInstructions: 'Sempre mencione que temos cerveja artesanal trincando e café expresso cortesia. Caso o cliente peça desconto adicional além do Pix, explique educadamente que o valor do Pix já é o limite máximo com o melhor custo-benefício da região.',
});

// Copied Pix state
const copiedPix = ref<string | null>(null);

// State for Connection tab
const savingConfig = ref(false);
const testPhone = ref('+55 31 8210-5323');
const testMessageText = ref('💈 Olá! Teste de conexão do Atelier 88 Barber Lounge via Evolution API!');
const sendingTest = ref(false);

// State for Notification editing & testing
const isEditingNotifModalOpen = ref(false);
const editingNotif = ref<NotificationItem | null>(null);
const savingNotif = ref(false);
const testingNotifId = ref<string | null>(null);

// State for AI Config
const savingAi = ref(false);

// --- Fetch Data on Mount ---
onMounted(async () => {
  await fetchStatus();
  await fetchConversations();
  await fetchNotifications();
  await fetchCampaigns();
  await fetchAiConfig();
});

// --- Methods ---

async function fetchAiConfig() {
  try {
    const res = await fetch(`${API_BASE}/ai-config`);
    if (res.ok) {
      aiConfig.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load AI config:', err);
  }
}

async function saveAiConfig() {
  savingAi.value = true;
  try {
    const res = await fetch(`${API_BASE}/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiConfig.value),
    });
    if (res.ok) {
      toast.show({
        title: 'Regras da IA Salvas!',
        message: 'Diretrizes gravadas no banco de dados com sucesso. A IA já está operando com essas regras.',
        type: 'success',
      });
    }
  } catch (err) {
    toast.show({ title: 'Erro', message: 'Falha ao salvar no banco de dados.', type: 'error' });
  } finally {
    savingAi.value = false;
  }
}

async function saveConnectionConfig() {
  savingConfig.value = true;
  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: telemetry.value.apiUrl,
        instanceName: telemetry.value.instanceName,
        webhookUrl: telemetry.value.webhookUrl,
        connectedPhone: telemetry.value.connectedPhone,
      }),
    });
    if (res.ok) {
      toast.show({
        title: 'Conexão Atualizada',
        message: 'Configurações da Evolution API salvas no banco de dados com sucesso.',
        type: 'success',
      });
      await fetchStatus();
    }
  } catch (err) {
    toast.show({ title: 'Erro', message: 'Falha ao salvar configuração.', type: 'error' });
  } finally {
    savingConfig.value = false;
  }
}

async function sendTestWhatsAppMessage() {
  if (!testPhone.value) {
    toast.show({ title: 'Telefone Obrigatório', message: 'Informe o número de destino para o teste.', type: 'error' });
    return;
  }
  sendingTest.value = true;
  try {
    const res = await fetch(`${API_BASE}/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone.value,
        message: testMessageText.value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.show({
        title: 'Mensagem Enviada!',
        message: `Mensagem de teste disparada com sucesso para ${testPhone.value}.`,
        type: 'success',
      });
    } else {
      toast.show({
        title: 'Aviso de Envio',
        message: data.status || 'Não foi possível entregar a mensagem.',
        type: 'info',
      });
    }
  } catch (err) {
    toast.show({ title: 'Erro no Envio', message: 'Falha ao contatar a Evolution API.', type: 'error' });
  } finally {
    sendingTest.value = false;
  }
}

function openEditNotificationModal(notif: NotificationItem) {
  editingNotif.value = { ...notif };
  isEditingNotifModalOpen.value = true;
}

function insertTemplateTag(tag: string) {
  if (!editingNotif.value) return;
  editingNotif.value.template += ` ${tag}`;
}

function insertCampaignTag(tag: string) {
  newCampaignData.value.messageText += ` ${tag}`;
}

async function saveNotificationTemplate() {
  if (!editingNotif.value) return;
  savingNotif.value = true;
  try {
    const res = await fetch(`${API_BASE}/notifications/${editingNotif.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: editingNotif.value.template,
        enabled: editingNotif.value.enabled,
      }),
    });
    if (res.ok) {
      const idx = notifications.value.findIndex((n) => n.id === editingNotif.value?.id);
      if (idx !== -1 && editingNotif.value) {
        notifications.value[idx].template = editingNotif.value.template;
        notifications.value[idx].enabled = editingNotif.value.enabled;
      }
      isEditingNotifModalOpen.value = false;
      toast.show({
        title: 'Template Atualizado!',
        message: 'A mensagem do gatilho foi gravada no banco de dados com sucesso.',
        type: 'success',
      });
    }
  } catch (err) {
    toast.show({ title: 'Erro', message: 'Falha ao salvar template no banco.', type: 'error' });
  } finally {
    savingNotif.value = false;
  }
}

async function testNotification(notif: NotificationItem) {
  testingNotifId.value = notif.id;
  try {
    const res = await fetch(`${API_BASE}/notifications/${notif.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: telemetry.value.connectedPhone || '553182105323' }),
    });
    const data = await res.json();
    if (data.success) {
      toast.show({
        title: '🧪 Teste Disparado!',
        message: `Prévia enviada para ${data.sentTo}. Confira seu WhatsApp!`,
        type: 'success',
        duration: 6000,
      });
    }
  } catch (err) {
    toast.show({ title: 'Erro', message: 'Falha ao disparar teste.', type: 'error' });
  } finally {
    testingNotifId.value = null;
  }
}

// --- Methods ---

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (res.ok) {
      const data = await res.json();
      telemetry.value = data;
      if (data.evolutionOnline !== undefined) {
        evolutionOnline.value = data.evolutionOnline;
      }
    }
  } catch (err) {
    console.error('Failed to load whatsapp status:', err);
  }
}

async function fetchConversations(silent = false) {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    if (res.ok) {
      const data: ConversationItem[] = await res.json();
      
      const prevActive = conversations.value.find((c) => c.id === selectedConvId.value);
      const currentActive = data.find((c) => c.id === selectedConvId.value);
      const hasNewMessages = prevActive && currentActive && currentActive.messages.length > prevActive.messages.length;

      conversations.value = data;

      if (!selectedConvId.value && conversations.value.length > 0) {
        selectedConvId.value = conversations.value[0].id;
      }

      if (hasNewMessages) {
        scrollToBottom();
      }
    }
  } catch (err) {
    if (!silent) console.error('Failed to load conversations:', err);
  }
}

async function fetchNotifications() {
  try {
    const res = await fetch(`${API_BASE}/notifications`);
    if (res.ok) {
      notifications.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

async function fetchCampaigns() {
  try {
    const res = await fetch(`${API_BASE}/campaigns`);
    if (res.ok) {
      campaigns.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
  }
}

// Switch Connection State (Connect / Disconnect / Simulate Alert)
async function setConnection(targetStatus: 'CONNECTED' | 'DISCONNECTED' | 'QR_CODE') {
  try {
    const reason = targetStatus === 'DISCONNECTED' 
      ? 'Aparelho desconectado pelo operador para teste ou sem bateria.' 
      : undefined;

    const res = await fetch(`${API_BASE}/connection/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus, reason }),
    });

    if (res.ok) {
      telemetry.value = await res.json();
      if (targetStatus === 'DISCONNECTED') {
        toast.show({
          title: '⚠️ WhatsApp Desconectado!',
          message: 'Atenção: A conexão com o celular foi perdida. A IA e os lembretes automáticos estão pausados!',
          type: 'error',
          duration: 7000,
        });
      } else if (targetStatus === 'CONNECTED') {
        toast.show({
          title: 'WhatsApp Conectado com Sucesso',
          message: 'Sua barbearia está 100% online com a Evolution API e Gemini Flash.',
          type: 'success',
        });
      } else if (targetStatus === 'QR_CODE') {
        await loadQrCode();
      }
    }
  } catch (err) {
    toast.show({
      title: 'Erro de Comunicação',
      message: 'Não foi possível alterar o status da Evolution API.',
      type: 'error',
    });
  }
}

const loadingQr = ref(false);
let statusInterval: any = null;
let countdownInterval: any = null;
let chatInterval: any = null;

async function loadQrCode() {
  loadingQr.value = true;
  try {
    const res = await fetch(`${API_BASE}/qrcode`);
    if (res.ok) {
      const data = await res.json();
      qrCodeData.value = data.qrCodeData || '';
      evolutionOnline.value = data.evolutionOnline !== false;
      evolutionMessage.value = data.message || '';
      qrExpiresIn.value = data.expiresInSeconds || 45;

      if (countdownInterval) clearInterval(countdownInterval);
      if (evolutionOnline.value && qrCodeData.value) {
        countdownInterval = setInterval(() => {
          if (qrExpiresIn.value > 0) {
            qrExpiresIn.value--;
          } else {
            // Auto renew expired QR Code
            loadQrCode();
          }
        }, 1000);
      }
    }
  } catch (err) {
    console.error(err);
    evolutionOnline.value = false;
    evolutionMessage.value = 'Falha ao conectar com o servidor API.';
  } finally {
    loadingQr.value = false;
  }
}

// Watch active tab to start/stop live polling for Chat or QR Code
watch(activeTab, async (newTab) => {
  // Live polling for Central de Atendimento & Chat ao Vivo
  if (newTab === 'CHAT') {
    await fetchConversations();
    scrollToBottom();

    if (!chatInterval) {
      chatInterval = setInterval(async () => {
        if (activeTab.value !== 'CHAT') {
          clearInterval(chatInterval);
          chatInterval = null;
          return;
        }
        await fetchConversations(true);
      }, 2500);
    }
  } else {
    if (chatInterval) {
      clearInterval(chatInterval);
      chatInterval = null;
    }
  }

  // Live polling for Conexão Evolution API & QR Code
  if (newTab === 'CONNECTION') {
    await loadQrCode();
    await fetchStatus();

    if (!statusInterval) {
      statusInterval = setInterval(async () => {
        if (activeTab.value !== 'CONNECTION') {
          clearInterval(statusInterval);
          statusInterval = null;
          return;
        }

        const prevStatus = telemetry.value.status;
        await fetchStatus();

        // If just connected, show success message!
        if (prevStatus !== 'CONNECTED' && telemetry.value.status === 'CONNECTED') {
          toast.show({
            title: '🎉 WhatsApp Conectado com Sucesso!',
            message: `Número ${telemetry.value.connectedPhone} pareado com sucesso à barbearia!`,
            type: 'success',
            duration: 8000,
          });
          if (countdownInterval) clearInterval(countdownInterval);
        }
      }, 3000);
    }
  } else {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }
}, { immediate: true });

watch(selectedConvId, () => {
  scrollToBottom();
});

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval);
  if (countdownInterval) clearInterval(countdownInterval);
  if (chatInterval) clearInterval(chatInterval);
  if (audioInterval) clearInterval(audioInterval);
});

// Toggle Human Takeover vs AI in Active Chat
async function toggleTakeover(aiActive: boolean) {
  if (!activeConversation.value) return;
  try {
    const res = await fetch(`${API_BASE}/conversations/${activeConversation.value.id}/takeover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      activeConversation.value.aiActive = updated.aiActive;
      activeConversation.value.status = updated.status;

      if (!aiActive) {
        recordTakeoverDivider(activeConversation.value.id, '👤 Barbeiro assumiu o atendimento manual');
        toast.show({
          title: '👤 Você Assumiu o Atendimento!',
          message: `A IA foi pausada para ${activeConversation.value.customerName}. Responda diretamente ao cliente.`,
          type: 'info',
        });
      } else {
        recordTakeoverDivider(activeConversation.value.id, '🤖 Secretária Virtual (IA) reassumiu o atendimento');
        toast.show({
          title: '🤖 IA Reativada!',
          message: `A Secretária Virtual reassumiu a conversa com ${activeConversation.value.customerName}.`,
          type: 'success',
        });
      }
      scrollToBottom();
    }
  } catch (err) {
    console.error(err);
  }
}

// Send Message in Active Conversation
async function sendChatMessage(sender: 'human' | 'client' = 'human', customText?: string) {
  const text = customText || inputMessage.value.trim();
  if (!text || !activeConversation.value) return;

  sendingMessage.value = true;
  if (!customText) inputMessage.value = '';

  try {
    const res = await fetch(`${API_BASE}/conversations/${activeConversation.value.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sender }),
    });

    if (res.ok) {
      const updated = await res.json();
      activeConversation.value.messages = updated.messages;
      activeConversation.value.lastMessage = updated.lastMessage;
      activeConversation.value.lastMessageTime = updated.lastMessageTime;
      const idx = conversations.value.findIndex((c) => c.id === updated.id);
      if (idx !== -1) {
        conversations.value[idx] = updated;
      }
      scrollToBottom();
    }
  } catch (err) {
    console.error(err);
  } finally {
    sendingMessage.value = false;
  }
}

// Simulate client voice note
function simulateVoiceNote() {
  if (!activeConversation.value) return;
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // Push visual audio note bubble
  activeConversation.value.messages.push({
    id: `audio-${Date.now()}`,
    sender: 'client',
    text: '🎤 [Mensagem de Áudio enviada pelo cliente: "Opa mestre, tem como me encaixar com o Diego hoje às 16:30?"]',
    isAudio: true,
    audioDuration: '0:08',
    time: now,
  });
  scrollToBottom();

  setTimeout(() => {
    sendChatMessage('client', 'Opa mestre, tem como me encaixar com o Diego hoje às 16:30?');
  }, 1000);
}

// Toggle Automated Notification
async function toggleNotification(notif: NotificationItem) {
  try {
    notif.enabled = !notif.enabled;
    const res = await fetch(`${API_BASE}/notifications/${notif.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: notif.enabled }),
    });
    if (res.ok) {
      toast.show({
        title: notif.enabled ? 'Gatilho Ativado' : 'Gatilho Desativado',
        message: `${notif.title} foi atualizado com sucesso.`,
        type: notif.enabled ? 'success' : 'info',
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// Create Campaign
async function submitNewCampaign() {
  if (!newCampaignData.value.name || !newCampaignData.value.messageText) {
    toast.show({
      title: 'Campos Incompletos',
      message: 'Preencha o título da campanha e a mensagem a ser disparada.',
      type: 'error',
    });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCampaignData.value),
    });

    if (res.ok) {
      const created = await res.json();
      campaigns.value.unshift(created);
      isNewCampaignModalOpen.value = false;
      newCampaignData.value = {
        name: '',
        segment: 'Todos os Clientes Ativos (1.264 contatos)',
        messageText: '',
        delaySeconds: 10,
      };

      toast.show({
        title: '📢 Disparo de Campanha Iniciado!',
        message: `A campanha está sendo transmitida com intervalo anti-ban de 10s para proteger seu número.`,
        type: 'success',
        duration: 6000,
      });

      // Refresh campaigns after delay
      setTimeout(() => { fetchCampaigns(); }, 4500);
    }
  } catch (err) {
    console.error(err);
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatScrollContainer.value) {
      chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight;
    }
  });
  setTimeout(() => {
    if (chatScrollContainer.value) {
      chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight;
    }
  }, 60);
}

function copyPix(code: string) {
  navigator.clipboard.writeText(code);
  copiedPix.value = code;
  toast.show({
    title: 'Pix Copiado!',
    message: 'Código Pix Copia e Cola copiado para a área de transferência.',
    type: 'success',
  });
  setTimeout(() => { copiedPix.value = null; }, 3000);
}

async function deleteConversation(id: string) {
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      conversations.value = conversations.value.filter((c) => c.id !== id);
      if (selectedConvId.value === id) {
        selectedConvId.value = conversations.value[0]?.id || '';
      }
      toast.show({
        title: 'Conversa Removida',
        message: 'A conversa foi excluída do painel.',
        type: 'info',
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function clearAllConversations() {
  if (!confirm('Deseja realmente limpar todas as conversas? Apenas as novas conversas reais que chegarem no WhatsApp serão listadas.')) return;
  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'DELETE',
    });
    if (res.ok) {
      conversations.value = [];
      selectedConvId.value = '';
      toast.show({
        title: 'Caixa de Entrada Limpa',
        message: 'Todas as conversas fictícias e testes antigos foram removidos.',
        type: 'success',
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function handleAvatarError(e: Event, name?: string) {
  const target = e.target as HTMLImageElement;
  if (target) {
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Cliente')}&background=0284c7&color=fff&bold=true`;
  }
}
</script>

<template>
  <div class="w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">

    <!-- CRITICAL ALERT BANNER (Shows when WhatsApp disconnects) -->
    <div 
      v-if="telemetry.status === 'DISCONNECTED'" 
      class="w-full bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-subtle"
    >
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
          <AlertTriangle class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-rose-700 dark:text-rose-400">
            ⚠️ ATENÇÃO: Conexão WhatsApp Interrompida!
          </h4>
          <p class="text-xs text-rose-600/90 dark:text-rose-300 mt-0.5">
            {{ telemetry.lastDisconnectAlert || 'O aparelho foi desconectado ou a bateria acabou. Agendamentos automáticos e lembretes 2h antes estão pausados!' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <button 
          @click="setConnection('QR_CODE')" 
          class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
        >
          <QrCode class="w-4 h-4" />
          <span>Escanear QR Code</span>
        </button>
        <button 
          @click="setConnection('CONNECTED')" 
          class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
        >
          Forçar Reconexão
        </button>
      </div>
    </div>

    <!-- MODULE HEADER & MAIN TELEMETRY -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#131722] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-brand">
            <MessageSquareCode class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Central de Automação & WhatsApp
              </h1>
              
              <!-- Connection Badge -->
              <span 
                v-if="telemetry.status === 'CONNECTED'" 
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Evolution API Conectada
              </span>
              <span 
                v-else-if="telemetry.status === 'QR_CODE'" 
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5"
              >
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Aguardando Leitura do QR Code
              </span>
              <span 
                v-else 
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 flex items-center gap-1.5"
              >
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                Desconectado
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instância: <code class="font-mono text-slate-700 dark:text-slate-300 font-semibold">{{ telemetry.instanceName }}</code> • Motor: <span class="font-semibold text-brand">Gemini 2.5 Flash</span> (Latência ~0.6s) • Número: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ telemetry.connectedPhone }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Quick Actions / Diagnostics Bar -->
      <div class="flex items-center gap-2.5 self-end lg:self-auto">
        <!-- Battery & Signal Pill -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-semibold">
          <BatteryCharging v-if="telemetry.isCharging" class="w-4 h-4 text-emerald-500" />
          <Battery v-else class="w-4 h-4 text-slate-500" />
          <span>{{ telemetry.batteryLevel }}%</span>
          <span class="text-slate-300 dark:text-slate-600">•</span>
          <Wifi class="w-4 h-4 text-brand" />
          <span>4G/Wi-Fi OK</span>
        </div>

        <!-- Disconnect Simulation for Testing -->
        <button 
          v-if="telemetry.status === 'CONNECTED'"
          @click="setConnection('DISCONNECTED')"
          title="Simula uma queda de conexão para testar os alertas"
          class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
        >
          <Power class="w-3.5 h-3.5" />
          <span>Simular Queda</span>
        </button>
        <button 
          v-else
          @click="setConnection('CONNECTED')"
          class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>Reconectar</span>
        </button>

        <button 
          @click="openSimulateModal()" 
          class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-brand text-white hover:opacity-95 transition text-xs font-bold flex items-center gap-1.5 shadow-brand shrink-0"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          <span>Simular Novo Cliente</span>
        </button>

        <button 
          @click="isNewCampaignModalOpen = true" 
          class="px-3.5 py-2 rounded-xl bg-brand text-white hover:opacity-90 transition text-xs font-bold flex items-center gap-1.5 shadow-brand"
        >
          <Plus class="w-4 h-4" />
          <span>Nova Campanha</span>
        </button>
      </div>
    </div>

    <!-- NAVIGATION SUBTABS -->
    <div class="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
      <button 
        @click="activeTab = 'CHAT'" 
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
        :class="activeTab === 'CHAT' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        <MessageSquareCode class="w-4 h-4" />
        <span>Central de Atendimento & Chat ao Vivo</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px]" :class="activeTab === 'CHAT' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">
          {{ conversations.length }}
        </span>
      </button>

      <button 
        @click="activeTab = 'CONNECTION'" 
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
        :class="activeTab === 'CONNECTION' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        <QrCode class="w-4 h-4" />
        <span>Conexão Evolution API & QR Code</span>
        <span 
          class="w-2 h-2 rounded-full" 
          :class="telemetry.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'"
        ></span>
      </button>

      <button 
        @click="activeTab = 'NOTIFICATIONS'" 
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
        :class="activeTab === 'NOTIFICATIONS' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        <Bell class="w-4 h-4" />
        <span>Lembretes & Notificações Automáticas</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px]" :class="activeTab === 'NOTIFICATIONS' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">
          6 Gatilhos
        </span>
      </button>

      <button 
        @click="activeTab = 'CAMPAIGNS'" 
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
        :class="activeTab === 'CAMPAIGNS' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        <Flame class="w-4 h-4" />
        <span>Campanhas & Disparos em Massa</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px]" :class="activeTab === 'CAMPAIGNS' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">
          {{ campaigns.length }}
        </span>
      </button>

      <button 
        @click="activeTab = 'AI_CONFIG'" 
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
        :class="activeTab === 'AI_CONFIG' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        <Cpu class="w-4 h-4" />
        <span>IA & Regras de Atendimento</span>
      </button>
    </div>

    <!-- ============================================================== -->
    <!-- TAB 1: CENTRAL DE ATENDIMENTO & CHAT AO VIVO (100% WIDTH)       -->
    <!-- ============================================================== -->
    <div v-if="activeTab === 'CHAT'" class="w-full h-auto lg:h-[calc(100vh-220px)] lg:min-h-[640px] grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 overflow-hidden">
      
      <!-- COLUMN 1: CONVERSATIONS LIST (3 Cols) -->
      <div 
        class="h-[calc(100vh-210px)] min-h-[500px] lg:h-full bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col shadow-sm overflow-hidden min-h-0"
        :class="[
          mobileView === 'chat' && activeConversation ? 'hidden lg:flex lg:col-span-3' : 'col-span-1 lg:col-span-3 flex'
        ]"
      >
        
        <!-- Search & Filter Header -->
        <div class="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shrink-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>Mensagens WhatsApp</span>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                {{ conversations.length }}
              </span>
            </span>
            <button 
              v-if="conversations.length > 0"
              @click="clearAllConversations"
              title="Limpar conversas do painel"
              class="text-[11px] text-slate-400 hover:text-rose-500 transition flex items-center gap-1 font-medium"
            >
              <Trash2 class="w-3 h-3" />
              <span>Limpar</span>
            </button>
          </div>

          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              v-model="chatSearchQuery"
              type="text" 
              placeholder="Buscar cliente ou telefone..."
              class="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
            >
          </div>

          <!-- Quick Filter Tabs -->
          <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-[11px] font-semibold">
            <button 
              @click="chatFilter = 'ALL'"
              class="flex-1 py-1 rounded-lg transition"
              :class="chatFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'"
            >
              Todos ({{ conversations.length }})
            </button>
            <button 
              @click="chatFilter = 'AI'"
              class="flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1"
              :class="chatFilter === 'AI' ? 'bg-white dark:bg-slate-700 text-brand shadow-xs' : 'text-slate-500 hover:text-slate-900'"
            >
              <Bot class="w-3 h-3" />
              <span>IA</span>
            </button>
            <button 
              @click="chatFilter = 'HUMAN'"
              class="flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1"
              :class="chatFilter === 'HUMAN' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500 hover:text-slate-900'"
            >
              <User class="w-3 h-3" />
              <span>Barbeiro</span>
            </button>
          </div>

          <!-- Quick Simulate Button Inside List Header -->
          <button 
            @click="openSimulateModal()"
            class="w-full py-2 px-3 rounded-xl bg-brand/10 hover:bg-brand/15 text-brand dark:bg-brand/20 dark:hover:bg-brand/30 border border-brand/25 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Sparkles class="w-3.5 h-3.5 text-brand" />
            <span>+ Simular Novo Cliente</span>
          </button>
        </div>

        <!-- List items -->
        <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 min-h-0 custom-scrollbar">
          <div v-if="filteredConversations.length === 0" class="p-6 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
            <div class="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shadow-xs">
              <MessageSquareCode class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma conversa encontrada</p>
              <p class="text-[11px] text-slate-400 max-w-[210px] leading-relaxed mt-0.5">
                Inicie um teste agora simulando um cliente ou aguarde mensagens reais do WhatsApp.
              </p>
            </div>
            <button 
              @click="openSimulateModal()"
              class="px-3.5 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-brand"
            >
              <Sparkles class="w-3.5 h-3.5 text-amber-300" />
              <span>Simular Cliente Agora</span>
            </button>
          </div>

          <div 
            v-for="conv in filteredConversations" 
            :key="conv.id"
            @click="selectedConvId = conv.id; mobileView = 'chat'; scrollToBottom();"
            class="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition flex items-start gap-3 relative group"
            :class="selectedConvId === conv.id ? 'bg-brand-light/40 dark:bg-brand/10 border-l-4 border-brand' : ''"
          >
            <div class="relative shrink-0">
              <img 
                :src="conv.avatar" 
                @error="handleAvatarError($event, conv.customerName)"
                class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              >
              <span 
                v-if="conv.aiActive" 
                title="IA Ativa" 
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand text-white flex items-center justify-center text-[9px]"
              >
                🤖
              </span>
              <span 
                v-else 
                title="Barbeiro Assumiu" 
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px]"
              >
                👤
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ conv.customerName }}
                </span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-slate-400">
                    {{ conv.lastMessageTime }}
                  </span>
                  <button 
                    @click.stop="deleteConversation(conv.id)" 
                    title="Excluir conversa"
                    class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition p-0.5 rounded"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {{ conv.lastMessage }}
              </p>

              <div class="flex items-center gap-2 mt-1.5">
                <span 
                  v-if="conv.aiActive"
                  class="text-[9px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded"
                >
                  IA Ativa
                </span>
                <span 
                  v-else
                  class="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded"
                >
                  Barbeiro no Chat
                </span>
                <span v-if="conv.customerDetails?.vipMember" class="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star class="w-2.5 h-2.5 fill-current" /> VIP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMN 2: ACTIVE CHAT THREAD (6 Cols) -->
      <div 
        v-if="activeConversation" 
        class="h-[calc(100vh-210px)] min-h-[500px] lg:h-full bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col shadow-sm overflow-hidden min-h-0"
        :class="[
          mobileView === 'list' ? 'hidden lg:flex lg:col-span-6' : 'col-span-1 lg:col-span-6 flex'
        ]"
      >
        
        <!-- Chat Top Bar with Customer Info & TAKEOVER BUTTON -->
        <div class="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <!-- Mobile Back Button -->
            <button 
              @click="mobileView = 'list'" 
              class="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition shrink-0"
              title="Voltar para a lista de conversas"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>

            <img 
              :src="activeConversation?.avatar" 
              @error="handleAvatarError($event, activeConversation?.customerName)"
              class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {{ activeConversation?.customerName }}
                </h3>
                <span class="text-[11px] text-slate-400 shrink-0 hidden sm:inline">({{ activeConversation?.customerPhone }})</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>WhatsApp Online</span>
                <span class="hidden sm:inline">•</span>
                <span class="truncate hidden sm:inline">Barbeiro habitual: <strong class="text-slate-700 dark:text-slate-300">{{ activeConversation?.customerDetails?.preferredBarber }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Chat Top Actions (Dossier toggle + Takeover) -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Mobile Dossier Toggle -->
            <button 
              @click="isMobileDossierOpen = true"
              class="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
              title="Ver Dossiê do Cliente"
            >
              <User class="w-4 h-4 text-brand" />
            </button>

            <!-- TAKEOVER BUTTON (CRITICAL USER REQUIREMENT) -->
            <!-- If AI is active, allow Barber to Take Over -->
            <button 
              v-if="activeConversation?.aiActive" 
              @click="toggleTakeover(false)"
              class="px-3 sm:px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <User class="w-3.5 h-3.5" />
              <span>Assumir Atendimento</span>
            </button>

            <!-- If Barber has assumed, allow to return to AI -->
            <button 
              v-else 
              @click="toggleTakeover(true)"
              class="px-3 sm:px-3.5 py-1.5 rounded-xl bg-brand text-white hover:opacity-90 text-xs font-bold transition flex items-center gap-1.5 shadow-brand"
            >
              <Bot class="w-3.5 h-3.5" />
              <span>Devolver para IA</span>
            </button>
          </div>
        </div>

        <!-- TAKEOVER STATUS BANNER -->
        <div 
          v-if="!activeConversation?.aiActive" 
          class="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/40 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
            <span class="truncate"><strong>Você está no controle:</strong> IA pausada. Suas mensagens vão direto ao cliente.</span>
          </div>
          <button @click="toggleTakeover(true)" class="underline font-bold text-[11px] hover:text-amber-900 shrink-0 ml-2">
            Reativar IA
          </button>
        </div>

        <!-- MESSAGES SCROLL CONTAINER WITH CUSTOM SCROLLBAR -->
        <div 
          ref="chatScrollContainer"
          class="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F4F5F7] dark:bg-[#0E111A] min-h-0 custom-scrollbar"
        >
          <div 
            v-for="msg in activeConversationMessages" 
            :key="msg.id"
            class="flex flex-col"
            :class="msg.sender === 'client' ? 'items-start' : (msg.sender === 'system' ? 'items-center' : 'items-end')"
          >
            <!-- SYSTEM TAKEOVER DIVIDER -->
            <div v-if="msg.sender === 'system'" class="w-full flex items-center justify-center my-3 py-1">
              <div class="relative flex py-1 items-center w-full max-w-md">
                <div class="flex-grow border-t border-slate-300/80 dark:border-slate-800"></div>
                <span 
                  class="flex-shrink mx-3 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 shadow-xs border"
                  :class="msg.text.includes('Barbeiro') 
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                    : 'bg-brand-light text-brand border-brand/30 dark:bg-brand/20 dark:text-brand-light dark:border-brand/40'"
                >
                  — {{ msg.text }} —
                </span>
                <div class="flex-grow border-t border-slate-300/80 dark:border-slate-800"></div>
              </div>
            </div>

            <!-- REGULAR CHAT MESSAGE (Client / AI / Human) -->
            <template v-else>
              <!-- SENDER BADGE -->
              <span class="text-[10px] text-slate-400 mb-1 px-1">
                {{ msg.sender === 'client' ? activeConversation?.customerName : (msg.sender === 'ai' ? '🤖 Secretária Virtual (IA)' : '👤 Barbeiro (Você)') }}
              </span>

              <!-- MESSAGE BUBBLE -->
              <div 
                class="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative leading-relaxed"
                :class="[
                  msg.sender === 'client' 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50' 
                    : msg.sender === 'ai'
                      ? 'bg-brand text-white rounded-tr-xs'
                      : 'bg-emerald-600 text-white rounded-tr-xs'
                ]"
              >
                <!-- Photos / Media attached to message (Barbers profiles) -->
                <div v-if="msg.mediaItems && msg.mediaItems.length" class="mb-2 space-y-2">
                  <div 
                    v-for="(media, mIdx) in msg.mediaItems" 
                    :key="mIdx" 
                    class="rounded-xl overflow-hidden border border-white/20 bg-black/20 shadow-sm"
                  >
                    <img :src="media.url" :alt="media.caption || 'Foto Barbeiro'" class="w-full max-h-48 object-cover object-top" />
                    <div v-if="media.caption" class="p-2 text-[11px] whitespace-pre-line bg-black/40 text-white font-medium">
                      {{ media.caption }}
                    </div>
                  </div>
                </div>

                <!-- Voice Note Bubble (Stylized with Waveform & Play/Pause) -->
                <div v-if="msg.isAudio" class="py-1 space-y-2 w-full min-w-[220px] sm:min-w-[260px]">
                  <div class="flex items-center gap-3">
                    <!-- Play/Pause Button -->
                    <button 
                      @click="toggleAudio(msg.id)"
                      class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition shadow-sm"
                      :class="msg.sender === 'client' 
                        ? 'bg-brand text-white hover:bg-brand-dark' 
                        : 'bg-white text-slate-900 hover:bg-slate-100'"
                      :title="playingAudioId === msg.id ? 'Pausar áudio' : 'Ouvir mensagem de voz'"
                    >
                      <Pause v-if="playingAudioId === msg.id" class="w-4 h-4 fill-current" />
                      <Play v-else class="w-4 h-4 ml-0.5 fill-current" />
                    </button>

                    <!-- Simulated Sound Waveform -->
                    <div class="flex-1 space-y-1.5 min-w-0">
                      <div class="flex items-center gap-0.5 sm:gap-1 h-7">
                        <div 
                          v-for="(h, bIdx) in audioBarHeights" 
                          :key="bIdx"
                          class="flex-1 rounded-full transition-all duration-150"
                          :style="{ height: `${h}%` }"
                          :class="[
                            (audioProgress[msg.id] || 0) >= ((bIdx + 1) / audioBarHeights.length * 100)
                              ? (msg.sender === 'client' ? 'bg-brand' : 'bg-white')
                              : (msg.sender === 'client' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-white/40'),
                            playingAudioId === msg.id && Math.abs((audioProgress[msg.id] || 0) - (bIdx / audioBarHeights.length * 100)) < 15 ? 'scale-y-125' : ''
                          ]"
                        ></div>
                      </div>

                      <div 
                        class="flex items-center justify-between text-[10px]"
                        :class="msg.sender === 'client' ? 'text-slate-400' : 'text-white/80'"
                      >
                        <span class="flex items-center gap-1">
                          <Mic class="w-3 h-3" />
                          <span>Mensagem de Voz</span>
                        </span>
                        <span class="font-mono">
                          {{ playingAudioId === msg.id ? `0:0${Math.min(8, Math.floor((audioProgress[msg.id] || 0) * 0.08))}` : (msg.audioDuration || '0:08') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Audio Transcript Preview Pill -->
                  <div 
                    v-if="msg.text" 
                    class="text-[11px] p-2 rounded-xl italic leading-relaxed border"
                    :class="msg.sender === 'client' 
                      ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60' 
                      : 'bg-black/20 text-white/90 border-white/15'"
                  >
                    "{{ msg.text.replace(/🎤\s*\[Mensagem de Áudio.*?:\s*"(.*?)"\]/g, '$1') }}"
                  </div>
                </div>

                <!-- Text Message -->
                <div v-else class="whitespace-pre-line">
                  {{ msg.text }}
                </div>

                <!-- Booking Confirmation Card (when bookingData is present) -->
                <div 
                  v-if="msg.bookingData" 
                  class="mt-3 p-3.5 rounded-xl border transition shadow-sm space-y-2.5"
                  :class="[
                    msg.sender === 'client' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-800 dark:text-slate-100'
                      : 'bg-emerald-950/40 border-emerald-400/40 text-white'
                  ]"
                >
                  <div class="flex items-center justify-between gap-2 border-b border-white/15 pb-2">
                    <div class="flex items-center gap-1.5">
                      <div class="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Calendar class="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span class="text-xs font-bold block">Reserva Identificada</span>
                        <span class="text-[10px] text-emerald-300 font-semibold block">Horário Reservado na Agenda</span>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Pré-Agendado
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-black/20 p-2 rounded-lg">
                      <span class="text-[10px] text-slate-300 block font-medium">Serviço</span>
                      <strong class="font-bold truncate block">{{ msg.bookingData.service }}</strong>
                    </div>
                    <div class="bg-black/20 p-2 rounded-lg">
                      <span class="text-[10px] text-slate-300 block font-medium">Barbeiro</span>
                      <strong class="font-bold truncate block">{{ msg.bookingData.barber }}</strong>
                    </div>
                    <div class="bg-black/20 p-2 rounded-lg">
                      <span class="text-[10px] text-slate-300 block font-medium">Data & Horário</span>
                      <strong class="font-bold truncate block">{{ msg.bookingData.date }} às {{ msg.bookingData.time }}</strong>
                    </div>
                    <div class="bg-black/20 p-2 rounded-lg">
                      <span class="text-[10px] text-slate-300 block font-medium">Valor no Pix</span>
                      <strong class="font-bold text-emerald-400 truncate block">
                        R$ {{ Number(msg.bookingData.finalPrice || msg.bookingData.originalPrice || 0).toFixed(2) }}
                      </strong>
                    </div>
                  </div>
                </div>

                <!-- PIX Copia e Cola Card (Prominent & Stylish) -->
                <div 
                  v-if="msg.pixCopiaCola" 
                  class="mt-3 p-3.5 rounded-xl border transition shadow-sm space-y-2.5"
                  :class="[
                    msg.sender === 'client' 
                      ? 'bg-amber-500/10 border-amber-500/30 text-slate-800 dark:text-slate-100'
                      : 'bg-black/30 border-white/25 text-white'
                  ]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <div class="w-6 h-6 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Zap class="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div>
                        <span class="text-xs font-bold block truncate">Pagamento Pix Copia e Cola</span>
                        <span class="text-[10px] text-amber-300 font-semibold block">10% de Desconto Aplicado</span>
                      </div>
                    </div>
                    <button 
                      @click="copyPix(msg.pixCopiaCola)" 
                      class="text-[11px] px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 active:scale-95 font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <Check v-if="copiedPix === msg.pixCopiaCola" class="w-3.5 h-3.5 text-emerald-600" />
                      <Copy v-else class="w-3.5 h-3.5" />
                      <span>{{ copiedPix === msg.pixCopiaCola ? 'Copiado!' : 'Copiar Pix' }}</span>
                    </button>
                  </div>

                  <div class="font-mono text-[10px] bg-black/40 border border-white/10 p-2 rounded-lg select-all break-all text-slate-200">
                    {{ msg.pixCopiaCola }}
                  </div>

                  <div class="flex items-center justify-between text-[10px] opacity-80 pt-0.5">
                    <span>⚡ Compensação automática via Webhook</span>
                    <span>Validade: 15 min</span>
                  </div>
                </div>

                <!-- Timestamp & Subtle Double Checkmarks -->
                <div 
                  class="flex items-center justify-end gap-1 mt-1 text-[10px]"
                  :class="msg.sender === 'client' ? 'text-slate-400' : 'text-white/80'"
                >
                  <span>{{ msg.time }}</span>
                  <CheckCheck 
                    v-if="msg.sender !== 'client'" 
                    class="w-3.5 h-3.5 text-sky-300 dark:text-sky-200" 
                    title="Mensagem lida pelo cliente"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- INPUT ACTION BAR -->
        <div class="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131722] space-y-2 shrink-0">
          <!-- Quick action chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
            <button 
              @click="simulateVoiceNote()"
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition flex items-center gap-1 shrink-0"
            >
              <Mic class="w-3 h-3 text-brand" />
              <span>Simular Áudio do Cliente</span>
            </button>
            <button 
              @click="sendChatMessage('client', 'Quais horários disponíveis hoje?')"
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition shrink-0"
            >
              "Quais horários disponíveis hoje?"
            </button>
            <button 
              @click="sendChatMessage('client', '1')"
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition shrink-0"
            >
              "1" (Diego Santos)
            </button>
            <button 
              @click="sendChatMessage('client', '2')"
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition shrink-0"
            >
              "2" (Lucas Lima)
            </button>
            <button 
              @click="sendChatMessage('client', 'Quanto custa corte e barba?')"
              class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition shrink-0"
            >
              "Quanto custa corte e barba?"
            </button>
          </div>

          <!-- Input field -->
          <div class="flex items-center gap-2">
            <input 
              v-model="inputMessage"
              @keydown.enter="sendChatMessage('human')"
              type="text" 
              :placeholder="activeConversation.aiActive ? 'Digite uma mensagem (ou assuma a conversa acima)...' : 'Respondendo como barbeiro diretamente ao cliente...'"
              class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
            >
            <button 
              @click="sendChatMessage('human')"
              :disabled="sendingMessage || !inputMessage.trim()"
              class="p-2.5 rounded-xl bg-brand text-white hover:opacity-90 disabled:opacity-40 transition shadow-brand shrink-0"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      <!-- COLUMN 3: CUSTOMER CRM DOSSIER (3 Cols) -->
      <div 
        v-if="activeConversation" 
        class="hidden lg:block lg:col-span-3 h-auto lg:h-full overflow-y-auto space-y-4 pr-1 min-h-0 custom-scrollbar"
      >
        <!-- Dossier Card -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Dossiê do Cliente</span>
            <span 
              v-if="activeConversation?.customerDetails?.vipMember" 
              class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            >
              ⭐ Cliente VIP
            </span>
          </div>

          <div class="flex flex-col items-center text-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <img 
              :src="activeConversation?.avatar" 
              @error="handleAvatarError($event, activeConversation?.customerName)"
              class="w-16 h-16 rounded-2xl object-cover border-2 border-brand/20 shadow-sm mb-2"
            >
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ activeConversation?.customerName }}</h3>
            <p class="text-xs text-slate-400">{{ activeConversation?.customerPhone }}</p>
          </div>

          <!-- Customer Stats -->
          <div class="grid grid-cols-2 gap-2 text-center">
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Cortes Realizados</span>
              <span class="text-sm font-extrabold text-slate-900 dark:text-white">{{ activeConversation?.customerDetails?.visitsCount ?? 0 }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Total Gasto</span>
              <span class="text-sm font-extrabold text-brand">R$ {{ (activeConversation?.customerDetails?.totalSpent ?? 0).toFixed(2) }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Barbeiro Favorito</span>
              <span class="text-xs font-bold text-slate-900 dark:text-white truncate block">{{ activeConversation?.customerDetails?.preferredBarber ?? '-' }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">No-Shows (Faltas)</span>
              <span class="text-xs font-bold text-emerald-600 block">{{ activeConversation?.customerDetails?.noShowCount ?? 0 }} (100% Pontual)</span>
            </div>
          </div>

          <!-- Upcoming Appointment or Quick Actions -->
          <div class="pt-2">
            <span class="text-xs font-bold text-slate-900 dark:text-white block mb-2">Ações Rápidas</span>
            <div class="space-y-1.5">
              <button 
                @click="sendChatMessage('human', 'Fala parceiro, seu agendamento de hoje às 16:30 está confirmadíssimo! Já deixei a cerveja gelando.')"
                class="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold text-left transition flex items-center justify-between"
              >
                <span>Enviar Confirmação Manual</span>
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
              </button>
              <button 
                @click="sendChatMessage('human', 'Arthur, você ganhou 10% OFF no seu próximo corte por ser nosso cliente frequente! Use o cupom VIP10.')"
                class="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold text-left transition flex items-center justify-between"
              >
                <span>Enviar Cupom VIP Cortesia</span>
                <Gift class="w-3.5 h-3.5 text-brand" />
              </button>
            </div>
          </div>
        </div>

        <!-- AI Efficiency Pill -->
        <div class="p-4 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/20 space-y-2">
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-brand" />
            <h4 class="text-xs font-bold text-slate-900 dark:text-white">Produtividade no Piloto Automático</h4>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            A IA já respondeu a <strong>88% das mensagens</strong> hoje sem interromper o corte do barbeiro, economizando <strong>2h 15m</strong> de digitação.
          </p>
        </div>
      </div>

      <!-- EMPTY STATE WHEN NO CONVERSATION IS SELECTED -->
      <div v-else class="lg:col-span-9 bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[500px] lg:min-h-[620px] shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/10 to-violet-500/10 text-brand flex items-center justify-center mb-4 shadow-sm border border-brand/20">
          <Bot class="w-8 h-8" />
        </div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Central de Atendimento ao Vivo</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
          Nenhuma conversa selecionada no momento. Todas as conversas reais dos clientes que enviarem mensagens para o WhatsApp da sua barbearia (<strong>{{ telemetry.connectedPhone || '+55 (31) 7319-7723' }}</strong>) aparecerão aqui em tempo real.
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button 
            @click="openSimulateModal()"
            class="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-2 shadow-brand"
          >
            <Sparkles class="w-4 h-4 text-amber-300" />
            <span>Simular Novo Cliente com IA</span>
          </button>
          <button 
            @click="runSimulationWithPreset('Quero agendar um corte degradê para hoje')"
            class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            Testar "Quero agendar corte degradê"
          </button>
        </div>

        <div class="mt-6 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>A Sofia (IA Gemini Flash) está conectada e pronta para responder aos clientes.</span>
        </div>
      </div>

    </div>

    <!-- ============================================================== -->
    <!-- TAB 2: CONEXÃO EVOLUTION API & QR CODE                         -->
    <!-- ============================================================== -->
    <div v-else-if="activeTab === 'CONNECTION'" class="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Card: QR Code & Pairing Instructions (6 Cols) -->
      <div class="lg:col-span-6 bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <QrCode class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Conexão via QR Code</h3>
                <p class="text-xs text-slate-400">Escaneie com o WhatsApp da sua Barbearia</p>
              </div>
            </div>

            <!-- Status Pill -->
            <span 
              v-if="telemetry.status === 'CONNECTED'"
              class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <CheckCircle2 class="w-3.5 h-3.5" /> Conectado & Operante
            </span>
            <span 
              v-else
              class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1.5"
            >
              <AlertCircle class="w-3.5 h-3.5" /> Aguardando Escaneamento
            </span>
          </div>

          <!-- Dynamic QR Code Container -->
          <div class="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 my-4">
            
            <!-- When Connected -->
            <div v-if="telemetry.status === 'CONNECTED'" class="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-sm w-full">
              <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
                <CheckCheck class="w-8 h-8" />
              </div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">WhatsApp Conectado com Sucesso!</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Número ativo: <strong class="text-emerald-600">{{ telemetry.connectedPhone || '+55 (11) 98765-4321' }}</strong>
              </p>
              <div class="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                🚀 A secretária virtual inteligente (Gemini 2.5 Flash) já está ativa respondendo mensagens e áudios deste número em tempo real.
              </div>
              <button 
                @click="setConnection('QR_CODE')" 
                class="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
              >
                Conectar Outro Número
              </button>
            </div>

            <!-- When generating/scanning QR Code -->
            <div v-else class="flex flex-col items-center w-full">
              <!-- Case 1: Evolution API is OFFLINE -->
              <div v-if="!evolutionOnline" class="w-full max-w-sm bg-amber-500/10 dark:bg-amber-950/20 border-2 border-dashed border-amber-500/30 rounded-2xl p-5 flex flex-col items-center text-center">
                <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
                  <AlertTriangle class="w-6 h-6" />
                </div>
                <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">Evolution API Desconectada</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  O container ou serviço da Evolution API não está rodando no endereço <code class="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded">{{ telemetry.apiUrl }}</code>.
                </p>

                <div class="mt-4 flex flex-col gap-2 w-full">
                  <!-- Simulation Quick Connect -->
                  <button 
                    @click="setConnection('CONNECTED')" 
                    class="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <CheckCircle2 class="w-4 h-4" />
                    <span>🧪 Simular Aparelho Conectado (Testar Módulo)</span>
                  </button>

                  <button 
                    @click="loadQrCode()" 
                    :disabled="loadingQr"
                    class="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <RefreshCw class="w-3.5 h-3.5" :class="loadingQr ? 'animate-spin' : ''" />
                    <span>Testar Conexão com Evolution API</span>
                  </button>
                </div>

                <div class="mt-4 p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-left w-full text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <span class="font-bold text-slate-700 dark:text-slate-300 block">Como ativar o QR Code real:</span>
                  <span>1. Abra o <strong>Docker Desktop</strong> na máquina</span>
                  <span class="block">2. Inicie a Evolution API com Baileys</span>
                  <span class="block">3. Aponte a câmera do WhatsApp para o QR Code</span>
                </div>
              </div>

              <!-- Case 2: Loading QR Code -->
              <div v-else-if="loadingQr" class="w-64 h-64 sm:w-72 sm:h-72 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lg border-2 border-brand/30 flex flex-col items-center justify-center text-center">
                <RefreshCw class="w-8 h-8 text-brand animate-spin mb-2" />
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Gerando QR Code ao vivo...</span>
                <span class="text-[10px] text-slate-400 mt-0.5">Conectando à Evolution API</span>
              </div>

              <!-- Case 3: Live Base64 QR Code -->
              <div v-else-if="qrCodeData" class="flex flex-col items-center">
                <div class="w-64 h-64 sm:w-72 sm:h-72 bg-white p-3 rounded-2xl shadow-lg border-2 border-brand/30 flex items-center justify-center relative">
                  <img :src="qrCodeData" class="w-56 h-56 sm:w-64 sm:h-64 object-contain" alt="QR Code WhatsApp Real">
                </div>

                <!-- Live Expiration & Refresh Pill -->
                <div class="flex items-center gap-2 mt-4">
                  <span class="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock class="w-3.5 h-3.5 text-brand" />
                    <span>Renova em: <strong>{{ qrExpiresIn }}s</strong></span>
                  </span>
                  <button 
                    @click="loadQrCode()" 
                    :disabled="loadingQr"
                    title="Atualizar QR Code agora"
                    class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  >
                    <RefreshCw class="w-3.5 h-3.5" :class="loadingQr ? 'animate-spin' : ''" />
                  </button>
                </div>

                <!-- Radar Status -->
                <div class="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Aguardando leitura pela câmera do WhatsApp...</span>
                </div>
              </div>

              <!-- Case 4: Fallback pulse / Click to generate -->
              <div v-else class="flex flex-col items-center">
                <div class="w-64 h-64 sm:w-72 sm:h-72 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-4">
                  <QrCode class="w-24 h-24 text-slate-400 animate-pulse mb-2" />
                  <span class="text-xs text-slate-500">Clique abaixo para gerar</span>
                  <button 
                    @click="loadQrCode()" 
                    class="mt-3 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90 transition"
                  >
                    Gerar QR Code
                  </button>
                </div>
              </div>

              <!-- Steps -->
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-5 text-center max-w-sm leading-relaxed bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                1. Abra o <strong>WhatsApp</strong> no celular da sua barbearia<br>
                2. Toque em <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong><br>
                3. Toque em <strong>Conectar um aparelho</strong> e aponte a câmera
              </p>
            </div>
          </div>
        </div>

        <!-- Connection Action Buttons -->
        <div class="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            @click="loadQrCode()" 
            class="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-2 shadow-brand"
          >
            <RefreshCw class="w-4 h-4" :class="loadingQr ? 'animate-spin' : ''" />
            <span>Recarregar QR Code Real</span>
          </button>
          <button 
            @click="setConnection('DISCONNECTED')" 
            class="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
          >
            Desconectar Sessão
          </button>
        </div>
      </div>

      <!-- Card: Server Config & Telemetry (6 Cols) -->
      <div class="lg:col-span-6 space-y-6">
        
        <!-- Telemetry Details -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-brand" />
            <span>Telemetria do Aparelho & Evolution API</span>
          </h3>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Dispositivo Pareado</span>
              <strong class="text-slate-800 dark:text-slate-200 text-xs">{{ telemetry.deviceModel }}</strong>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Bateria do Celular</span>
              <strong class="text-emerald-600 flex items-center gap-1 mt-0.5">
                <BatteryCharging class="w-3.5 h-3.5" /> {{ telemetry.batteryLevel }}% (Carregando)
              </strong>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Endpoint Webhook</span>
              <code class="text-[11px] text-brand font-mono truncate block mt-0.5">{{ telemetry.webhookUrl }}</code>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span class="text-[10px] text-slate-400 block font-medium">Latência Média</span>
              <strong class="text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                <Zap class="w-3.5 h-3.5 text-amber-500" /> 38ms (Ultra-rápido)
              </strong>
            </div>
          </div>
        </div>

        <!-- Evolution API Server Setup Form -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings class="w-4 h-4 text-brand" />
              <span>Configuração da Evolution API</span>
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded bg-brand-light text-brand font-bold">Auto-Hospedada / VPS</span>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">URL da API Evolution (Host)</label>
              <input 
                v-model="telemetry.apiUrl" 
                type="text" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-1 focus:ring-brand"
              >
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Nome da Instância</label>
              <input 
                v-model="telemetry.instanceName" 
                type="text" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-1 focus:ring-brand"
              >
            </div>

            <button 
              @click="saveConnectionConfig()" 
              :disabled="savingConfig"
              class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              <RefreshCw v-if="savingConfig" class="w-3.5 h-3.5 animate-spin" />
              <span>Salvar & Conectar com o Banco de Dados</span>
            </button>
          </div>
        </div>

        <!-- Live WhatsApp Test Dispatch Card -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap class="w-4 h-4 text-emerald-500" />
              <span>Disparo de Teste no WhatsApp</span>
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold dark:bg-emerald-950/40 dark:text-emerald-300">Live Evolution API</span>
          </div>
          <p class="text-xs text-slate-400">
            Envie uma mensagem real instantaneamente para o seu próprio número para testar a entrega e o recebimento.
          </p>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Número de Destino (DDI + DDD + Telefone)</label>
              <input 
                v-model="testPhone" 
                type="text" 
                placeholder="+55 (31) 98210-5323"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-1 focus:ring-brand"
              >
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Mensagem de Teste</label>
              <textarea 
                v-model="testMessageText" 
                rows="2" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans text-xs focus:ring-1 focus:ring-brand"
              ></textarea>
            </div>

            <button 
              @click="sendTestWhatsAppMessage()" 
              :disabled="sendingTest"
              class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw v-if="sendingTest" class="w-3.5 h-3.5 animate-spin" />
              <Send v-else class="w-3.5 h-3.5" />
              <span>Disparar Mensagem de Teste Real</span>
            </button>
          </div>
        </div>

      </div>

    </div>

    <!-- ============================================================== -->
    <!-- TAB 3: NOTIFICAÇÕES & LEMBRETES AUTOMÁTICOS                    -->
    <!-- ============================================================== -->
    <div v-else-if="activeTab === 'NOTIFICATIONS'" class="w-full flex-1 space-y-4">
      
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Gatilhos de Notificação Automática</h2>
          <p class="text-xs text-slate-500">
            Aumente a retenção e elimine faltas (no-show) com disparos inteligentes acionados em segundo plano.
          </p>
        </div>
      </div>

      <!-- Trigger Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div 
          v-for="notif in notifications" 
          :key="notif.id"
          class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm flex flex-col justify-between transition hover:shadow-md"
        >
          <div>
            <!-- Header with Toggle -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-2.5">
                <div 
                  class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                  :class="notif.enabled ? 'bg-brand text-white shadow-brand' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'"
                >
                  <Bell class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {{ notif.title }}
                  </h3>
                  <span class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock class="w-3 h-3" /> {{ notif.triggerTime }}
                  </span>
                </div>
              </div>

              <!-- Switch Toggle -->
              <button 
                @click="toggleNotification(notif)" 
                class="w-10 h-6 rounded-full transition-colors relative shrink-0"
                :class="notif.enabled ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'"
              >
                <span 
                  class="w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs"
                  :class="notif.enabled ? 'right-1' : 'left-1'"
                ></span>
              </button>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              {{ notif.description }}
            </p>

            <!-- WhatsApp Message Preview Bubble -->
            <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed relative">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Prévia da Mensagem:</span>
              {{ notif.template }}
            </div>

            <!-- Card Action Buttons -->
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button 
                @click="openEditNotificationModal(notif)"
                class="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Settings class="w-3.5 h-3.5 text-brand" />
                <span>Editar Mensagem</span>
              </button>
              <button 
                @click="testNotification(notif)"
                :disabled="testingNotifId === notif.id"
                class="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold transition flex items-center gap-1"
                title="Disparar prévia deste gatilho no WhatsApp"
              >
                <RefreshCw v-if="testingNotifId === notif.id" class="w-3.5 h-3.5 animate-spin" />
                <Send v-else class="w-3.5 h-3.5" />
                <span>Testar</span>
              </button>
            </div>
          </div>

          <!-- Card Footer Metrics -->
          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span class="text-[11px] text-slate-400 font-medium">
              Disparos no mês: <strong class="text-slate-800 dark:text-slate-200">{{ notif.sentThisMonth }}</strong>
            </span>
            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {{ notif.impactMetric }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- ============================================================== -->
    <!-- TAB 4: CAMPANHAS & DISPAROS EM MASSA                           -->
    <!-- ============================================================== -->
    <div v-else-if="activeTab === 'CAMPAIGNS'" class="w-full flex-1 space-y-6">
      
      <!-- Top Metrics -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-[#131722] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span class="text-[11px] font-medium text-slate-400 block">Base de Clientes Disponível</span>
          <div class="text-xl font-extrabold text-slate-900 dark:text-white mt-1">1.284 contatos</div>
          <span class="text-[10px] text-emerald-500 font-semibold mt-0.5 block">100% com WhatsApp verificado</span>
        </div>

        <div class="bg-white dark:bg-[#131722] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span class="text-[11px] font-medium text-slate-400 block">Taxa de Entrega Média</span>
          <div class="text-xl font-extrabold text-brand mt-1">99.2%</div>
          <span class="text-[10px] text-slate-400 mt-0.5 block">Proteção anti-ban de 10s ativa</span>
        </div>

        <div class="bg-white dark:bg-[#131722] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span class="text-[11px] font-medium text-slate-400 block">Agendamentos Convertidos</span>
          <div class="text-xl font-extrabold text-emerald-600 mt-1">135 cortes</div>
          <span class="text-[10px] text-emerald-500 font-semibold mt-0.5 block">+28% de retorno</span>
        </div>

        <div class="bg-white dark:bg-[#131722] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span class="text-[11px] font-medium text-slate-400 block">Faturamento Adicional Gerado</span>
          <div class="text-xl font-extrabold text-slate-900 dark:text-white mt-1">R$ 11.375,00</div>
          <span class="text-[10px] text-brand font-semibold mt-0.5 block">Direto no Pix da barbearia</span>
        </div>
      </div>

      <!-- Campaigns Table Card -->
      <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Histórico de Campanhas Disparadas</h3>
            <p class="text-xs text-slate-400">Mensagens enviadas para clientes cadastrados com rastreamento de agendamentos</p>
          </div>
          <button 
            @click="isNewCampaignModalOpen = true"
            class="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold transition hover:opacity-90 flex items-center gap-1.5 shadow-brand"
          >
            <Plus class="w-4 h-4" />
            <span>Criar Nova Campanha</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th class="py-3 px-4">Campanha</th>
                <th class="py-3 px-4">Segmento</th>
                <th class="py-3 px-4">Disparados</th>
                <th class="py-3 px-4">Entregues</th>
                <th class="py-3 px-4">Respostas</th>
                <th class="py-3 px-4">Cortes Gerados</th>
                <th class="py-3 px-4">Receita Pix</th>
                <th class="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr v-for="c in campaigns" :key="c.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">
                  {{ c.name }}
                  <span class="block text-[10px] text-slate-400 font-normal">{{ c.createdAt }}</span>
                </td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300">
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                    {{ c.segment }}
                  </span>
                </td>
                <td class="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{{ c.totalRecipients }}</td>
                <td class="py-3 px-4 font-semibold text-emerald-600">{{ c.deliveredCount }}</td>
                <td class="py-3 px-4 text-slate-700 dark:text-slate-300">{{ c.repliedCount }}</td>
                <td class="py-3 px-4 font-bold text-brand">{{ c.bookingsCount }} agendamentos</td>
                <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">R$ {{ c.revenueGenerated.toFixed(2) }}</td>
                <td class="py-3 px-4">
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    :class="c.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse'"
                  >
                    {{ c.status === 'COMPLETED' ? 'Concluída' : 'Disparando...' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ============================================================== -->
    <!-- TAB 5: IA & REGRAS DE ATENDIMENTO (GEMINI 2.5 FLASH)            -->
    <!-- ============================================================== -->
    <div v-else-if="activeTab === 'AI_CONFIG'" class="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Config Form (7 Cols) -->
      <div class="lg:col-span-7 bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-5">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu class="w-4 h-4 text-brand" />
            <span>Personalidade & Regras do Agente Gemini 2.5 Flash</span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Defina o comportamento e o tom de voz da sua secretária virtual para atender os clientes da barbearia.
          </p>
        </div>

        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Nome da Secretária Virtual</label>
              <input 
                v-model="aiConfig.assistantName"
                type="text" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Modelo de IA</label>
              <select 
                v-model="aiConfig.model" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
                <option value="Google Gemini 2.5 Flash">Google Gemini 2.5 Flash (Recomendado - Áudio Nativo & 0.6s)</option>
                <option value="Google Gemini 1.5 Pro">Google Gemini 1.5 Pro (Raciocínio Complexo)</option>
              </select>
            </div>
          </div>

          <!-- Tone of Voice -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1.5">Tom de Voz da Barbearia</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                @click="aiConfig.tone = 'BARBER_STREET'" 
                class="p-3 rounded-xl border text-left transition"
                :class="aiConfig.tone === 'BARBER_STREET' ? 'border-brand bg-brand-light/30 text-brand font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600'"
              >
                <span class="block text-xs">Descontraído & Resenha</span>
                <span class="text-[10px] text-slate-400 font-normal mt-0.5 block">"Fala parceiro!", "Trato na régua"</span>
              </button>

              <button 
                @click="aiConfig.tone = 'PROFESSIONAL'" 
                class="p-3 rounded-xl border text-left transition"
                :class="aiConfig.tone === 'PROFESSIONAL' ? 'border-brand bg-brand-light/30 text-brand font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600'"
              >
                <span class="block text-xs">Moderno & Educado</span>
                <span class="text-[10px] text-slate-400 font-normal mt-0.5 block">"Olá Arthur, tudo bem? Como posso te ajudar?"</span>
              </button>

              <button 
                @click="aiConfig.tone = 'VIP_LUXURY'" 
                class="p-3 rounded-xl border text-left transition"
                :class="aiConfig.tone === 'VIP_LUXURY' ? 'border-brand bg-brand-light/30 text-brand font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600'"
              >
                <span class="block text-xs">Executivo & Fino</span>
                <span class="text-[10px] text-slate-400 font-normal mt-0.5 block">"Seja muito bem-vindo ao Atelier Lounge"</span>
              </button>
            </div>
          </div>

          <!-- Business Rules & Courtesies -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Desconto Pix Automático (%)</label>
              <input 
                v-model.number="aiConfig.pixDiscountPercent" 
                type="number" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Tolerância de Atraso (min)</label>
              <input 
                v-model.number="aiConfig.maxLateToleranceMinutes" 
                type="number" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs"
              >
            </div>
          </div>

          <!-- Courtesies & Perks -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-2">Cortesias Mencionadas pela Sofia</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <input type="checkbox" v-model="aiConfig.offerComplimentaryBeer" class="rounded text-brand focus:ring-brand">
                <span class="text-[11px] text-slate-700 dark:text-slate-200 font-medium">🍻 Chopp Artesanal</span>
              </label>

              <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <input type="checkbox" checked class="rounded text-brand focus:ring-brand">
                <span class="text-[11px] text-slate-700 dark:text-slate-200 font-medium">☕ Café Expresso</span>
              </label>

              <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <input type="checkbox" v-model="aiConfig.hasFreeParking" class="rounded text-brand focus:ring-brand">
                <span class="text-[11px] text-slate-700 dark:text-slate-200 font-medium">🚗 Estacionamento 1h</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Instruções Personalizadas do Salão (Prompt)</label>
            <textarea 
              v-model="aiConfig.customInstructions"
              rows="3" 
              class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:ring-1 focus:ring-brand"
            ></textarea>
          </div>

          <button 
            @click="saveAiConfig()" 
            :disabled="savingAi"
            class="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold transition hover:opacity-90 shadow-brand flex items-center gap-2"
          >
            <RefreshCw v-if="savingAi" class="w-3.5 h-3.5 animate-spin" />
            <span>Salvar Regras de IA no Banco de Dados</span>
          </button>
        </div>
      </div>

      <!-- Right Preview (5 Cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Live WhatsApp Simulation Preview of Sofia -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {{ aiConfig.assistantName.charAt(0) }}
                </div>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 ring-2 ring-white dark:ring-slate-900"></span>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  {{ aiConfig.assistantName }}
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">Online</span>
                </h4>
                <span class="text-[10px] text-slate-400">Atendente Virtual • Atelier 88</span>
              </div>
            </div>
            <span class="text-[10px] font-mono text-brand font-bold bg-brand-light/30 px-2 py-0.5 rounded-md">
              {{ aiConfig.model }}
            </span>
          </div>

          <!-- Simulated WhatsApp Bubble -->
          <div class="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs text-slate-800 dark:text-slate-100 leading-relaxed space-y-2">
            <p v-if="aiConfig.tone === 'BARBER_STREET'">
              Fala meu camarada! 💈 Aqui é a <strong>{{ aiConfig.assistantName }}</strong> do Atelier 88! Cerveja artesanal trincando te esperando na faixa. 🍻<br><br>
              Temos vaga hoje ou amanhã com o <strong>Diego Santos</strong> e o <strong>Lucas Lima</strong>. Já garanta com {{ aiConfig.pixDiscountPercent }}% de desconto no Pix! Qual horário você prefere?
            </p>
            <p v-else-if="aiConfig.tone === 'PROFESSIONAL'">
              Olá! Seja muito bem-vindo ao Atelier 88 Barber Lounge. 💈 Sou a <strong>{{ aiConfig.assistantName }}</strong>, sua atendente virtual.<br><br>
              Temos horários disponíveis com nossos barbeiros especializados e café expresso cortesia. Gostaria de agendar seu horário com {{ aiConfig.pixDiscountPercent }}% OFF no Pix?
            </p>
            <p v-else>
              Seja muito bem-vindo ao Atelier 88 Barber Lounge. É uma satisfação recebê-lo. 💈<br><br>
              Café especial e cerveja artesanal cortesia à sua espera. Com qual de nossos mestres barbeiros (Diego Santos ou Lucas Lima) prefere o seu atendimento hoje?
            </p>
            <span class="text-[9px] text-slate-400 block text-right">Agora mesmo • Entregue ✓✓</span>
          </div>
        </div>

        <!-- System Architecture Highlights -->
        <div class="bg-white dark:bg-[#131722] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Radio class="w-3.5 h-3.5 text-brand" />
            <span>Por que o Gemini Flash é imbatível para barbearias?</span>
          </h4>

          <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li class="flex items-start gap-2">
              <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Áudios Nativos de WhatsApp:</strong> Compreende áudios de clientes com gírias e ruídos sem custo ou delay de Whisper.</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Latência de 0.6s:</strong> Respostas no WhatsApp em tempo real, sem sensação de lentidão.</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Grounded 100% no MySQL:</strong> Consulta as vagas em tempo real no banco sem inventar horários.</span>
            </li>
          </ul>
        </div>
      </div>

    </div>

    <!-- ============================================================== -->
    <!-- MODAL: NOVA CAMPANHA DE DISPARO EM MASSA                       -->
    <!-- ============================================================== -->
    <div 
      v-if="isNewCampaignModalOpen"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div class="bg-white dark:bg-[#131722] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-brand">
              <Flame class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Nova Campanha de WhatsApp</h3>
              <p class="text-xs text-slate-400">Disparo inteligente com proteção anti-ban</p>
            </div>
          </div>
          <button @click="isNewCampaignModalOpen = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Nome da Campanha</label>
            <input 
              v-model="newCampaignData.name"
              type="text" 
              placeholder="Ex: Sextou com Chopp Cortesia" 
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-brand"
            >
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Segmento de Clientes</label>
            <select 
              v-model="newCampaignData.segment"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold"
            >
              <option value="Todos os Clientes Ativos (1.264 contatos)">Todos os Clientes Cadastrados (1.264 contatos)</option>
              <option value="Clientes Inativos há +30 dias (148 contatos)">Clientes Inativos há mais de 30 dias (148 contatos)</option>
              <option value="Clientes VIP & Clube (54 contatos)">Assinantes Clube VIP (54 contatos)</option>
              <option value="Clientes do Barbeiro Diego (320 contatos)">Clientes do Diego Santos (320 contatos)</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] font-bold text-slate-500">Texto da Mensagem</label>
              <div class="flex items-center gap-1.5">
                <button 
                  type="button" 
                  @click="insertCampaignTag('{cliente}')" 
                  class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
                >
                  + {cliente}
                </button>
                <button 
                  type="button" 
                  @click="insertCampaignTag('{barbearia}')" 
                  class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
                >
                  + {barbearia}
                </button>
                <button 
                  type="button" 
                  @click="insertCampaignTag('10% OFF no Pix')" 
                  class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
                >
                  + 10% OFF
                </button>
              </div>
            </div>
            <textarea 
              v-model="newCampaignData.messageText"
              rows="4" 
              placeholder="Fala parceiro! Sexta-feira na área no Atelier 88..."
              class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:ring-1 focus:ring-brand leading-relaxed"
            ></textarea>
          </div>

          <!-- Live WhatsApp Preview in Modal -->
          <div v-if="newCampaignData.messageText" class="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl">
            <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Como o cliente receberá:</span>
            <p class="text-[11px] text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
              {{ newCampaignData.messageText.replace(/{cliente}/g, 'Arthur').replace(/{barbearia}/g, 'Atelier 88').replace(/{barbeiro}/g, 'Diego Santos') }}
            </p>
          </div>

          <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
            <ShieldCheck class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span><strong>Proteção Anti-Ban:</strong> As mensagens serão enviadas com intervalos aleatórios entre 8 e 15 segundos para proteger seu chip do WhatsApp.</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button 
            @click="isNewCampaignModalOpen = false" 
            class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button 
            @click="submitNewCampaign()" 
            class="px-5 py-2 rounded-xl bg-brand text-white text-xs font-bold transition hover:opacity-90 shadow-brand flex items-center gap-1.5"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Iniciar Disparo Seguro</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL: EDITAR TEMPLATE DE NOTIFICAÇÃO                          -->
    <!-- ============================================================== -->
    <div 
      v-if="isEditingNotifModalOpen && editingNotif"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div class="bg-white dark:bg-[#131722] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-brand">
              <Bell class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Editar Notificação Automática</h3>
              <p class="text-xs text-slate-400">{{ editingNotif.title }}</p>
            </div>
          </div>
          <button @click="isEditingNotifModalOpen = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Horário de Disparo / Condição</label>
            <input 
              v-model="editingNotif.triggerTime" 
              type="text" 
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
            >
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] font-bold text-slate-500">Texto da Mensagem</label>
              <span class="text-[10px] text-slate-400">Variáveis dinâmicas suportadas</span>
            </div>
            
            <!-- Quick Tag Inserters -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <button 
                type="button" 
                @click="insertTemplateTag('{cliente}')" 
                class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
              >
                + {cliente}
              </button>
              <button 
                type="button" 
                @click="insertTemplateTag('{barbeiro}')" 
                class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
              >
                + {barbeiro}
              </button>
              <button 
                type="button" 
                @click="insertTemplateTag('{horario}')" 
                class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
              >
                + {horario}
              </button>
              <button 
                type="button" 
                @click="insertTemplateTag('{barbearia}')" 
                class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
              >
                + {barbearia}
              </button>
              <button 
                type="button" 
                @click="insertTemplateTag('{codigo}')" 
                class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-brand font-bold"
              >
                + {codigo}
              </button>
            </div>

            <textarea 
              v-model="editingNotif.template" 
              rows="4" 
              class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono leading-relaxed focus:ring-1 focus:ring-brand"
            ></textarea>
          </div>

          <!-- Preview Bubble -->
          <div class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
            <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Prévia no WhatsApp:</span>
            <p class="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
              {{ editingNotif.template.replace('{cliente}', 'Maycon Silva').replace('{barbeiro}', 'Diego Santos').replace('{horario}', '15:30').replace('{barbearia}', 'Atelier 88').replace('{codigo}', '88-4921') }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button 
            @click="isEditingNotifModalOpen = false" 
            class="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button 
            @click="saveNotificationTemplate()" 
            :disabled="savingNotif"
            class="px-5 py-2 rounded-xl bg-brand text-white text-xs font-bold transition hover:opacity-90 shadow-brand flex items-center gap-1.5"
          >
            <RefreshCw v-if="savingNotif" class="w-3.5 h-3.5 animate-spin" />
            <span>Salvar no Banco de Dados</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL: SIMULAR CLIENTE / INICIAR TESTE COM IA                  -->
    <!-- ============================================================== -->
    <div 
      v-if="isSimulateModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div class="bg-white dark:bg-[#131722] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-brand text-white flex items-center justify-center shadow-brand">
              <Sparkles class="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Simular Novo Cliente (IA Test)</h3>
              <p class="text-xs text-slate-400">Envie uma mensagem simulada para testar o atendimento da Sofia</p>
            </div>
          </div>
          <button @click="isSimulateModalOpen = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <!-- Modal Form -->
        <div class="space-y-3.5 text-xs">
          <!-- Quick client preset buttons -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1.5">Perfis Prontos para Teste</label>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="(p, pIdx) in clientPresets" 
                :key="pIdx"
                type="button"
                @click="selectClientPreset(p)"
                class="px-2.5 py-1.5 rounded-xl border text-[11px] transition flex items-center gap-1.5"
                :class="simulateForm.clientPhone === p.phone 
                  ? 'border-brand bg-brand/10 text-brand font-bold' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'"
              >
                <span>👤 {{ p.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">{{ p.tag }}</span>
              </button>
            </div>
          </div>

          <!-- Client Name & Phone -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Nome do Cliente</label>
              <input 
                v-model="simulateForm.clientName"
                type="text" 
                placeholder="Ex: Arthur Silveira" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-brand font-medium"
              >
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Telefone WhatsApp</label>
              <input 
                v-model="simulateForm.clientPhone"
                type="text" 
                placeholder="+55 (11) 98765-4321" 
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-brand font-mono"
              >
            </div>
          </div>

          <!-- Quick Message Chips -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1.5">Mensagens Prontas de Exemplo</label>
            <div class="flex flex-wrap gap-1.5">
              <button 
                v-for="(msgOption, mIdx) in quickSimMessages" 
                :key="mIdx"
                type="button"
                @click="selectMessagePreset(msgOption)"
                class="px-2.5 py-1 rounded-lg text-[10px] font-medium transition text-left"
                :class="simulateForm.message === msgOption 
                  ? 'bg-brand text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
              >
                "{{ msgOption }}"
              </button>
            </div>
          </div>

          <!-- Message Textarea -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Mensagem Inicial do Cliente</label>
            <textarea 
              v-model="simulateForm.message"
              rows="3" 
              placeholder="Digite o que o cliente enviará no WhatsApp..."
              class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-sans focus:ring-1 focus:ring-brand leading-relaxed"
            ></textarea>
          </div>

          <!-- AI Info Callout -->
          <div class="p-3 bg-brand/5 dark:bg-brand/10 border border-brand/20 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <Bot class="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <span>Ao clicar em enviar, a mensagem baterá no endpoint <code class="font-mono text-brand font-bold">/api/whatsapp/simulate</code> e a Sofia processará via Gemini com consulta aos barbeiros e horários em tempo real.</span>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button 
            @click="isSimulateModalOpen = false" 
            :disabled="isSimulating"
            class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button 
            @click="runSimulation()" 
            :disabled="isSimulating || !simulateForm.message.trim()"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-brand text-white text-xs font-bold transition hover:opacity-95 shadow-brand flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw v-if="isSimulating" class="w-3.5 h-3.5 animate-spin" />
            <Send v-else class="w-3.5 h-3.5" />
            <span>{{ isSimulating ? 'Sofia está respondendo...' : 'Enviar e Testar IA' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL: DOSSIÊ DO CLIENTE NO MOBILE (DRAWER)                    -->
    <!-- ============================================================== -->
    <div 
      v-if="isMobileDossierOpen && activeConversation" 
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in lg:hidden"
    >
      <div class="bg-white dark:bg-[#131722] rounded-t-3xl sm:rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <User class="w-4 h-4 text-brand" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Dossiê do Cliente</h3>
          </div>
          <button @click="isMobileDossierOpen = false" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <!-- Customer info -->
        <div class="flex flex-col items-center text-center pb-2">
          <img 
            :src="activeConversation.avatar" 
            @error="handleAvatarError($event, activeConversation.customerName)"
            class="w-14 h-14 rounded-2xl object-cover border-2 border-brand/20 shadow-sm mb-2"
          >
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ activeConversation.customerName }}</h3>
          <p class="text-xs text-slate-400">{{ activeConversation.customerPhone }}</p>
        </div>

        <!-- Customer stats grid -->
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[10px] text-slate-400 block font-medium">Cortes Realizados</span>
            <span class="text-sm font-extrabold text-slate-900 dark:text-white">{{ activeConversation.customerDetails?.visitsCount ?? 0 }}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[10px] text-slate-400 block font-medium">Total Gasto</span>
            <span class="text-sm font-extrabold text-brand">R$ {{ (activeConversation.customerDetails?.totalSpent ?? 0).toFixed(2) }}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[10px] text-slate-400 block font-medium">Barbeiro Favorito</span>
            <span class="text-xs font-bold text-slate-900 dark:text-white truncate block">{{ activeConversation.customerDetails?.preferredBarber ?? '-' }}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[10px] text-slate-400 block font-medium">Pontualidade</span>
            <span class="text-xs font-bold text-emerald-600 block">100% Pontual</span>
          </div>
        </div>

        <!-- Quick action manual message -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            @click="sendChatMessage('human', 'Fala parceiro, seu agendamento está confirmadíssimo! Já deixei a cerveja gelando.'); isMobileDossierOpen = false;"
            class="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold text-left transition flex items-center justify-between"
          >
            <span>Enviar Confirmação Manual</span>
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
          </button>
          <button 
            @click="sendChatMessage('human', 'Parceiro, você ganhou 10% OFF no seu próximo corte por ser nosso cliente! Use o cupom VIP10.'); isMobileDossierOpen = false;"
            class="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold text-left transition flex items-center justify-between"
          >
            <span>Enviar Cupom VIP Cortesia</span>
            <Gift class="w-3.5 h-3.5 text-brand" />
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes bounceSubtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.animate-bounce-subtle {
  animation: bounceSubtle 3s ease-in-out infinite;
}

/* Scrollbar visível e refinada para chat e listas */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.45);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 116, 139, 0.75);
}
</style>
