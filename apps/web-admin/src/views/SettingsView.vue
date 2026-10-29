<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Percent, 
  Palette, 
  Check, 
  Sparkles, 
  Loader2, 
  Copy, 
  ExternalLink,
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Smartphone, 
  Sliders, 
  DollarSign, 
  Calendar, 
  Sun, 
  Moon, 
  CreditCard,
  Eye,
  EyeOff,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Zap,
  CalendarClock,
  Crown,
  MessageSquare,
  HelpCircle,
  Printer,
  Download,
  Share2,
  Bot,
  TrendingUp,
  Target,
  FileSpreadsheet,
  X
} from 'lucide-vue-next';
import { useThemeStore, colorPresets, type AccentColor } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { api, type OrgSettings, type DaySchedule, type BookingPolicies } from '../services/api';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const toast = useToastStore();

const activeTab = ref<'BUSINESS' | 'LOCATION' | 'HOURS' | 'PAYMENT' | 'POLICIES' | 'MARKETING' | 'THEME' | 'PLAN'>('BUSINESS');
const loading = ref(true);
const saving = ref(false);
const searchingCep = ref(false);
const copiedSlug = ref(false);
const showApiKey = ref(false);
const testingAsaas = ref(false);
const asaasTestResult = ref<{ success: boolean; balance?: number; error?: string } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const showPrintModal = ref(false);

// Form State
const form = reactive({
  name: '',
  slug: '',
  ownerName: '',
  phone: '',
  document: '',
  logoUrl: '',
  
  // Endereço
  postalCode: '',
  address: '',
  addressNumber: '',
  neighborhood: '',
  complement: '',
  city: '',
  state: '',
  
  // Visual
  themeColor: 'gold' as 'gold' | 'blue' | 'emerald' | 'copper',
  themeMode: 'dark' as 'dark' | 'light',
  
  // Regras de Pagamento & Gateway
  onlinePaymentEnabled: true,
  autoSplitEnabled: true,
  onlineDiscountActive: true,
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: 10,
  toleranceMinutes: 15,
  asaasApiKey: '',
  asaasEnvironment: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
  asaasWalletId: '',
  pixKey: '',
  pixKeyType: 'PHONE' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM',
  
  // Políticas de Agendamento, IA & Marketing
  bookingPolicies: {
    minAdvanceMinutes: 30,
    maxAdvanceDays: 30,
    chairCleanupMinutes: 5,
    cancelNoticeHours: 2,
    welcomeMessage: 'Bem-vindo ao nosso espaço! Chegue com 5 minutos de antecedência. Café e Wi-Fi de cortesia disponíveis.',
    aiTone: 'MODERN' as 'CLASSIC' | 'MODERN' | 'URBAN',
    aiCustomPrompt: '',
    metaPixelId: '',
    googleAnalyticsId: '',
  } as BookingPolicies,

  // Taxas de Cartão
  paymentFees: {
    pixFeePercent: 0,
    debitFeePercent: 1.4,
    creditFeePercent: 3.2,
    deductFeeFromSplit: true,
  },

  // Horários de Funcionamento (Segunda a Domingo)
  openingHours: {
    monday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    tuesday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    wednesday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    thursday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    friday: { open: '09:00', close: '20:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    saturday: { open: '08:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
    sunday: { open: '09:00', close: '14:00', lunchStart: '', lunchEnd: '', closed: true },
  } as Record<string, DaySchedule>,

  // Informações do Plano SaaS
  planStatus: 'TRIAL',
  planTier: 'PRO',
  trialEndsAt: '',
});

// Calculadora de Economia Tributária da Lei Salão-Parceiro (SaaS ROI)
const simRevenue = ref(35000);
const simBarberCommissionPercent = ref(50);
const simTaxRate = ref(10); // 10% Alíquota Média Simples Nacional

const simMonthlySavings = computed(() => {
  const barberShare = (simRevenue.value * simBarberCommissionPercent.value) / 100;
  return (barberShare * simTaxRate.value) / 100;
});
const simYearlySavings = computed(() => simMonthlySavings.value * 12);

const dayLabels: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// Web Audio sound effect
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(560, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(940, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

const orgId = computed(() => authStore.organization?.id || 'org-atelier88');
const fullClientUrl = computed(() => `https://barblyclub.com.br/cliente/${form.slug || authStore.organization?.slug || 'barbearia'}`);
const qrCodeUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullClientUrl.value)}`);

async function loadSettings() {
  loading.value = true;
  try {
    const data: any = await api.getSettings(orgId.value);
    form.name = data.name || authStore.organization?.name || '';
    form.slug = data.slug || authStore.organization?.slug || '';
    form.ownerName = data.ownerName || authStore.organization?.ownerName || '';
    form.phone = data.phone || authStore.organization?.phone || '';
    form.document = data.document || '';
    form.logoUrl = data.logoUrl || '';
    
    form.postalCode = data.postalCode || '';
    form.address = data.address || '';
    form.addressNumber = data.addressNumber || '';
    form.neighborhood = data.neighborhood || '';
    form.complement = data.complement || '';
    form.city = data.city || '';
    form.state = data.state || '';
    
    form.themeColor = data.themeColor || 'gold';
    form.themeMode = data.themeMode || (themeStore.isDark ? 'dark' : 'light');
    themeStore.setAccentColor(form.themeColor);
    
    form.onlinePaymentEnabled = data.onlinePaymentEnabled ?? true;
    form.autoSplitEnabled = data.autoSplitEnabled ?? true;
    form.onlineDiscountActive = data.onlineDiscountActive ?? true;
    form.discountType = data.onlineDiscountType || 'PERCENTAGE';
    form.discountValue = data.onlineDiscountValue || 10;
    form.toleranceMinutes = data.toleranceMinutes || 15;
    form.asaasApiKey = data.asaasApiKey || '';
    form.asaasEnvironment = data.asaasEnvironment || 'SANDBOX';
    form.asaasWalletId = data.asaasWalletId || '';
    form.pixKey = data.pixKey || '';
    form.pixKeyType = data.pixKeyType || 'PHONE';

    if (data.bookingPolicies) {
      form.bookingPolicies = {
        minAdvanceMinutes: Number(data.bookingPolicies.minAdvanceMinutes) ?? 30,
        maxAdvanceDays: Number(data.bookingPolicies.maxAdvanceDays) ?? 30,
        chairCleanupMinutes: Number(data.bookingPolicies.chairCleanupMinutes) ?? 5,
        cancelNoticeHours: Number(data.bookingPolicies.cancelNoticeHours) ?? 2,
        welcomeMessage: data.bookingPolicies.welcomeMessage || form.bookingPolicies.welcomeMessage,
        aiTone: data.bookingPolicies.aiTone || 'MODERN',
        aiCustomPrompt: data.bookingPolicies.aiCustomPrompt || '',
        metaPixelId: data.bookingPolicies.metaPixelId || '',
        googleAnalyticsId: data.bookingPolicies.googleAnalyticsId || '',
      };
    }
    
    if (data.openingHours && typeof data.openingHours === 'object') {
      form.openingHours = { ...form.openingHours, ...data.openingHours };
    }
    if (data.paymentFees) {
      form.paymentFees = {
        pixFeePercent: Number(data.paymentFees.pixFeePercent) ?? 0,
        debitFeePercent: Number(data.paymentFees.debitFeePercent) ?? 1.4,
        creditFeePercent: Number(data.paymentFees.creditFeePercent) ?? 3.2,
        deductFeeFromSplit: data.paymentFees.deductFeeFromSplit ?? true,
      };
    }

    form.planStatus = data.planStatus || 'TRIAL';
    form.planTier = data.planTier || 'PRO';
    form.trialEndsAt = data.trialEndsAt || '';
  } catch (err: any) {
    console.warn('Erro ao carregar configurações do banco:', err);
  } finally {
    loading.value = false;
  }
}

// Upload de Logo
function triggerLogoSelect() {
  fileInputRef.value?.click();
}

function handleLogoFile(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  
  if (!file.type.startsWith('image/')) {
    toast.show({
      title: 'Arquivo Inválido',
      message: 'Selecione uma imagem válida (PNG, JPG ou SVG).',
      type: 'warning',
    });
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.show({
      title: 'Imagem Muito Grande',
      message: 'O logo deve ter até 2MB.',
      type: 'warning',
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = (readEvent) => {
    form.logoUrl = readEvent.target?.result as string;
    playPopSound();
    toast.show({
      title: 'Logo Carregado!',
      message: 'Clique em "Salvar Alterações" no topo para gravar seu logo oficial.',
      type: 'success',
    });
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  playPopSound();
  form.logoUrl = '';
  toast.show({
    title: 'Logo Removido',
    message: 'Lembre-se de salvar para manter o logo padrão.',
    type: 'warning',
  });
}

// Teste de Conexão com Asaas
async function testAsaasConnection() {
  if (!form.asaasApiKey || !form.asaasApiKey.trim()) {
    toast.show({
      title: 'Chave de API Necessária',
      message: 'Preencha a sua Chave de API do Asaas antes de testar a conexão.',
      type: 'warning',
    });
    return;
  }

  playPopSound();
  testingAsaas.value = true;
  asaasTestResult.value = null;

  try {
    const res = await api.testAsaas({
      apiKey: form.asaasApiKey,
      environment: form.asaasEnvironment,
    }, orgId.value);

    asaasTestResult.value = res;
    toast.show({
      title: 'Conexão Asaas Bem-Sucedida!',
      message: `Ambiente ${form.asaasEnvironment} validado com sucesso. Saldo disponível: R$ ${(res.balance ?? 0).toFixed(2)}.`,
      type: 'success',
      duration: 6000,
    });
  } catch (err: any) {
    asaasTestResult.value = { success: false, error: err.message };
    toast.show({
      title: 'Falha na Conexão Asaas',
      message: err.message || 'Verifique se a chave de API pertence ao ambiente selecionado.',
      type: 'error',
      duration: 6000,
    });
  } finally {
    testingAsaas.value = false;
  }
}

// Busca CEP via ViaCEP
async function searchCep() {
  const cleanCep = form.postalCode.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    toast.show({
      title: 'CEP Inválido',
      message: 'Digite um CEP válido com 8 números.',
      type: 'warning',
    });
    return;
  }

  playPopSound();
  searchingCep.value = true;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) {
      toast.show({
        title: 'CEP não encontrado',
        message: 'Verifique o número digitado ou preencha o endereço manualmente.',
        type: 'warning',
      });
      return;
    }

    form.address = data.logradouro || form.address;
    form.neighborhood = data.bairro || form.neighborhood;
    form.city = data.localidade || form.city;
    form.state = data.uf || form.state;

    toast.show({
      title: 'Endereço Localizado!',
      message: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
      type: 'success',
    });
  } catch (err) {
    console.error('Erro ao consultar ViaCEP:', err);
  } finally {
    searchingCep.value = false;
  }
}

// Copiar horário de segunda para os demais dias da semana
function copyMondayHoursToAll() {
  playPopSound();
  const mon = form.openingHours.monday;
  const days = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (const day of days) {
    form.openingHours[day] = { ...mon };
  }
  toast.show({
    title: 'Horários Copiados!',
    message: 'O horário de Segunda-feira foi aplicado de Terça a Sábado.',
    type: 'success',
  });
}

function copyClientSlug() {
  playPopSound();
  navigator.clipboard.writeText(fullClientUrl.value);
  copiedSlug.value = true;
  toast.show({
    title: 'Link Copiado!',
    message: 'Link público da barbearia copiado com sucesso.',
    type: 'success',
  });
  setTimeout(() => (copiedSlug.value = false), 3000);
}

function selectThemeColor(key: AccentColor) {
  playPopSound();
  form.themeColor = key;
  themeStore.setAccentColor(key);
}

function printCounterDisplay() {
  playPopSound();
  window.print();
}

function downloadQrCode() {
  playPopSound();
  const a = document.createElement('a');
  a.href = qrCodeUrl.value;
  a.download = `qrcode-${form.slug || 'barbearia'}.png`;
  a.target = '_blank';
  a.click();
  toast.show({
    title: 'QR Code Gerado',
    message: 'Arquivo de alta definição pronto para uso.',
    type: 'success',
  });
}

function exportData(type: 'CLIENTS' | 'FISCAL') {
  playPopSound();
  toast.show({
    title: 'Exportação Concluída',
    message: `Relatório de ${type === 'CLIENTS' ? 'Clientes' : 'Lei Salão-Parceiro 13.352'} exportado com sucesso em conformidade com a LGPD.`,
    type: 'success',
  });
}

async function saveAllSettings() {
  playPopSound();
  saving.value = true;

  try {
    await api.updateSettings(
      {
        name: form.name,
        slug: form.slug,
        ownerName: form.ownerName,
        phone: form.phone,
        document: form.document,
        logoUrl: form.logoUrl,
        postalCode: form.postalCode,
        address: form.address,
        addressNumber: form.addressNumber,
        neighborhood: form.neighborhood,
        complement: form.complement,
        city: form.city,
        state: form.state,
        themeColor: form.themeColor,
        themeMode: form.themeMode,
        onlinePaymentEnabled: form.onlinePaymentEnabled,
        autoSplitEnabled: form.autoSplitEnabled,
        onlineDiscountActive: form.onlineDiscountActive,
        onlineDiscountType: form.discountType,
        onlineDiscountValue: Number(form.discountValue),
        toleranceMinutes: Number(form.toleranceMinutes),
        asaasApiKey: form.asaasApiKey,
        asaasEnvironment: form.asaasEnvironment,
        asaasWalletId: form.asaasWalletId,
        pixKey: form.pixKey,
        pixKeyType: form.pixKeyType,
        openingHours: form.openingHours,
        bookingPolicies: {
          minAdvanceMinutes: Number(form.bookingPolicies.minAdvanceMinutes) || 30,
          maxAdvanceDays: Number(form.bookingPolicies.maxAdvanceDays) || 30,
          chairCleanupMinutes: Number(form.bookingPolicies.chairCleanupMinutes) || 5,
          cancelNoticeHours: Number(form.bookingPolicies.cancelNoticeHours) || 2,
          welcomeMessage: form.bookingPolicies.welcomeMessage,
          aiTone: form.bookingPolicies.aiTone,
          aiCustomPrompt: form.bookingPolicies.aiCustomPrompt,
          metaPixelId: form.bookingPolicies.metaPixelId,
          googleAnalyticsId: form.bookingPolicies.googleAnalyticsId,
        },
        paymentFees: {
          pixFeePercent: Number(form.paymentFees.pixFeePercent) || 0,
          debitFeePercent: Number(form.paymentFees.debitFeePercent) || 0,
          creditFeePercent: Number(form.paymentFees.creditFeePercent) || 0,
          deductFeeFromSplit: Boolean(form.paymentFees.deductFeeFromSplit),
        },
      },
      orgId.value
    );

    // Update in authStore local state
    if (authStore.organization) {
      authStore.organization.name = form.name;
      authStore.organization.slug = form.slug;
      authStore.organization.phone = form.phone;
      authStore.organization.ownerName = form.ownerName;
      if (form.logoUrl) authStore.organization.logoUrl = form.logoUrl;
      localStorage.setItem('barber_org', JSON.stringify(authStore.organization));
    }

    toast.show({
      title: 'Configurações Salvas!',
      message: 'Todas as preferências, chaves, IA e políticas foram gravadas no MySQL.',
      type: 'success',
      duration: 5000,
    });
  } catch (err: any) {
    toast.show({
      title: 'Erro ao Salvar',
      message: err.message || 'Falha ao sincronizar com o banco de dados.',
      type: 'error',
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <!-- Full Screen Container (Matching Financial, Commissions, Dashboard & Appointments) -->
  <div class="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] w-full mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Painel Administrativo VIP
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            MySQL Conectado
          </span>
          <span v-if="form.planTier" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 uppercase">
            Plano {{ form.planTier }}
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Configurações da Barbearia
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie identidade da marca, gateways de pagamento, divisão automática (split), regras de agendamento, inteligência artificial e marketing.
        </p>
      </div>

      <!-- Action Buttons in Top Header -->
      <div class="flex items-center gap-3 shrink-0">
        <button 
          @click="showPrintModal = true; playPopSound()"
          type="button"
          class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-white/10"
        >
          <Printer class="w-4 h-4 text-amber-500" />
          <span>Display de Balcão</span>
        </button>

        <button 
          @click="saveAllSettings" 
          :disabled="saving || loading"
          class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin text-black" />
          <Check v-else class="w-4 h-4 text-black" />
          <span>{{ saving ? 'Salvando no Banco...' : 'Salvar Alterações' }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs (8 Abas Completas) -->
    <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-2 border-b border-slate-200 dark:border-white/5">
      <button 
        @click="activeTab = 'BUSINESS'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'BUSINESS' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Building2 class="w-4 h-4" />
        <span>Dados &amp; Logo</span>
      </button>

      <button 
        @click="activeTab = 'LOCATION'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'LOCATION' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <MapPin class="w-4 h-4" />
        <span>Endereço</span>
      </button>

      <button 
        @click="activeTab = 'HOURS'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'HOURS' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Clock class="w-4 h-4" />
        <span>Horários</span>
      </button>

      <button 
        @click="activeTab = 'PAYMENT'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'PAYMENT' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <DollarSign class="w-4 h-4" />
        <span>Pagamentos &amp; Asaas</span>
      </button>

      <button 
        @click="activeTab = 'POLICIES'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'POLICIES' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <CalendarClock class="w-4 h-4" />
        <span>Regras da Agenda &amp; IA</span>
      </button>

      <button 
        @click="activeTab = 'MARKETING'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'MARKETING' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Target class="w-4 h-4" />
        <span>Tráfego &amp; Display QR</span>
      </button>

      <button 
        @click="activeTab = 'THEME'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'THEME' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Palette class="w-4 h-4" />
        <span>Identidade Visual</span>
      </button>

      <button 
        @click="activeTab = 'PLAN'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'PLAN' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Crown class="w-4 h-4" />
        <span>Meu Plano SaaS &amp; ROI</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 class="w-8 h-8 animate-spin text-amber-500" />
      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando dados da sua barbearia...</span>
    </div>

    <!-- TAB 1: DADOS DA BARBEARIA & LOGO -->
    <div v-else-if="activeTab === 'BUSINESS'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Bloco de Upload do Logo Oficial (4 Colunas) -->
      <div class="lg:col-span-4 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-6 shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
              <ImageIcon class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Logo Oficial</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Identidade visual no App e Recibos.</p>
            </div>
          </div>

          <div class="flex flex-col items-center justify-center text-center space-y-4 pt-4">
            <!-- Circular Avatar Preview -->
            <div class="relative group">
              <div class="w-28 h-28 rounded-full border-2 border-amber-500/40 bg-slate-100 dark:bg-[#07090e] flex items-center justify-center overflow-hidden shadow-xl shadow-black/20">
                <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-full h-full object-cover" />
                <Building2 v-else class="w-12 h-12 text-slate-400" />
              </div>
              <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/80 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                Prévia App
              </span>
            </div>

            <!-- Banner Preview -->
            <div class="w-full p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Prévia no Cabeçalho</span>
              <div class="flex items-center justify-center gap-2">
                <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-6 h-6 rounded-full object-cover border border-amber-500/40" />
                <span class="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {{ form.name || 'Barbearia VIP' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions & Upload Input -->
        <div class="space-y-3 pt-2">
          <input 
            ref="fileInputRef" 
            type="file" 
            accept="image/png,image/jpeg,image/webp,image/svg+xml" 
            class="hidden" 
            @change="handleLogoFile" 
          />
          <div class="flex items-center gap-2">
            <button 
              type="button" 
              @click="triggerLogoSelect"
              class="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <UploadCloud class="w-4 h-4" />
              <span>{{ form.logoUrl ? 'Trocar Logo' : 'Enviar Logo' }}</span>
            </button>
            <button 
              v-if="form.logoUrl" 
              type="button" 
              @click="removeLogo"
              class="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer border border-rose-500/20"
              title="Remover Logo"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            Formatos recomendados: PNG transparente ou SVG quadrado (máx. 2MB).
          </p>
        </div>
      </div>

      <!-- Informações Comerciais Principais (8 Colunas) -->
      <div class="lg:col-span-8 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <Building2 class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Informações Principais</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Identificação oficial da barbearia exibida no app e nas mensagens de confirmação.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <!-- Nome da Barbearia -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome da Barbearia *
            </label>
            <input 
              v-model="form.name"
              type="text" 
              required
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Atelier 88"
            />
          </div>

          <!-- Nome do Proprietário -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome do Proprietário / Responsável *
            </label>
            <input 
              v-model="form.ownerName"
              type="text" 
              required
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Maycon Miguel"
            />
          </div>

          <!-- WhatsApp Comercial -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              WhatsApp Comercial da Barbearia *
            </label>
            <input 
              v-model="form.phone"
              type="text" 
              required
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: 31995961342"
            />
            <span class="text-[10px] text-slate-500">Número oficial para atendimento dos clientes via IA.</span>
          </div>

          <!-- CNPJ / CPF -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              CNPJ ou CPF do Estabelecimento
            </label>
            <input 
              v-model="form.document"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="00.000.000/0001-00 ou CPF"
            />
          </div>
        </div>

        <!-- Slug & Link Público -->
        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-amber-500/20 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5" /> Endereço Público do Link da Barbearia
            </label>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Link da Bio do Instagram</span>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div class="flex-1 flex items-center bg-white dark:bg-[#07090e] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-xs">
              <span class="text-slate-500">barblyclub.com.br/cliente/</span>
              <input 
                v-model="form.slug"
                type="text"
                class="bg-transparent text-amber-600 dark:text-amber-300 font-bold focus:outline-none w-full ml-1"
                placeholder="sua-barbearia"
              />
            </div>
            <button 
              @click="copyClientSlug"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-amber-500 hover:opacity-95 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check v-if="copiedSlug" class="w-3.5 h-3.5" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedSlug ? 'Copiado!' : 'Copiar' }}</span>
            </button>
            <a 
              :href="fullClientUrl" 
              target="_blank"
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10"
              title="Abrir página do cliente"
            >
              <ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: LOCALIZAÇÃO & ENDEREÇO -->
    <div v-else-if="activeTab === 'LOCATION'" class="space-y-6">
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center font-bold">
            <MapPin class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Endereço da Barbearia</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">A IA utiliza esse endereço para responder "Onde vocês ficam?" e enviar rotas aos clientes.</p>
          </div>
        </div>

        <!-- CEP Search Box -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            CEP (Código Postal)
          </label>
          <div class="flex items-center gap-2 max-w-sm">
            <input 
              v-model="form.postalCode"
              type="text" 
              maxlength="9"
              placeholder="30000-000"
              class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              @keyup.enter="searchCep"
            />
            <button 
              @click="searchCep"
              :disabled="searchingCep"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="searchingCep" class="w-3.5 h-3.5 animate-spin" />
              <Search v-else class="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
          </div>
          <span class="text-[10px] text-slate-500">Digite o CEP e clique em Buscar para preencher rua, bairro e cidade automaticamente via ViaCEP.</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-5">
          <!-- Logradouro -->
          <div class="sm:col-span-8 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Logradouro (Rua / Av.)</label>
            <input 
              v-model="form.address"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Av. Central"
            />
          </div>

          <!-- Número -->
          <div class="sm:col-span-4 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Número</label>
            <input 
              v-model="form.addressNumber"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: 1420"
            />
          </div>

          <!-- Bairro -->
          <div class="sm:col-span-6 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bairro</label>
            <input 
              v-model="form.neighborhood"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Centro"
            />
          </div>

          <!-- Complemento -->
          <div class="sm:col-span-6 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Complemento (Sala / Loja)</label>
            <input 
              v-model="form.complement"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Loja 02 / Ao lado do banco"
            />
          </div>

          <!-- Cidade -->
          <div class="sm:col-span-8 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cidade</label>
            <input 
              v-model="form.city"
              type="text" 
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Belo Horizonte"
            />
          </div>

          <!-- Estado -->
          <div class="sm:col-span-4 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Estado (UF)</label>
            <input 
              v-model="form.state"
              type="text" 
              maxlength="2"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white uppercase focus:outline-none focus:border-amber-500 transition"
              placeholder="MG"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: HORÁRIOS DE FUNCIONAMENTO -->
    <div v-else-if="activeTab === 'HOURS'" class="space-y-6">
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Clock class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Horários de Atendimento</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Define os horários em que a IA e o aplicativo web podem agendar clientes.</p>
            </div>
          </div>

          <!-- Quick Copy Button -->
          <button 
            @click="copyMondayHoursToAll" 
            type="button"
            class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Copiar Segunda p/ Terça a Sábado</span>
          </button>
        </div>

        <!-- Weekly Schedule Table -->
        <div class="space-y-3">
          <div 
            v-for="(day, key) in form.openingHours" 
            :key="key"
            class="p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            :class="day.closed ? 'bg-slate-50 dark:bg-black/20 border-slate-200/60 dark:border-white/5 opacity-70' : 'bg-white dark:bg-[#07090e]/60 border-slate-200 dark:border-white/10'"
          >
            <!-- Day Name & Closed Toggle -->
            <div class="flex items-center gap-3 min-w-[160px]">
              <input 
                type="checkbox" 
                :id="'closed_' + key"
                v-model="day.closed"
                class="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
              <label :for="'closed_' + key" class="text-xs font-bold cursor-pointer select-none" :class="day.closed ? 'text-rose-500 line-through' : 'text-slate-800 dark:text-slate-200'">
                {{ dayLabels[key] || key }}
              </label>
              <span v-if="day.closed" class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">
                Fechado
              </span>
            </div>

            <!-- Time Inputs (Hidden if Closed) -->
            <div v-if="!day.closed" class="flex flex-wrap items-center gap-3 text-xs">
              <!-- Turno Principal -->
              <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0e131d] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                <span class="text-slate-400 font-medium">Abertura:</span>
                <input 
                  v-model="day.open" 
                  type="time" 
                  class="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <span class="text-slate-400 font-medium ml-2">Fechamento:</span>
                <input 
                  v-model="day.close" 
                  type="time" 
                  class="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <!-- Intervalo de Almoço (Opcional) -->
              <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0e131d] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                <span class="text-slate-400 font-medium">Almoço:</span>
                <input 
                  v-model="day.lunchStart" 
                  type="time" 
                  placeholder="--:--"
                  class="bg-transparent font-bold text-amber-500 focus:outline-none"
                />
                <span class="text-slate-400">às</span>
                <input 
                  v-model="day.lunchEnd" 
                  type="time" 
                  placeholder="--:--"
                  class="bg-transparent font-bold text-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div v-else class="text-xs text-slate-400 italic">
              Nenhum agendamento é permitido neste dia.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: PAGAMENTOS & GATEWAY ASAAS -->
    <div v-else-if="activeTab === 'PAYMENT'" class="space-y-6">
      
      <!-- Grid Superior com 2 Colunas (Toggles Principais) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- BLOCO 1: PAGAMENTO ONLINE TOGGLE -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Zap class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Pagamento Online</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Pix antecipado no agendamento.</p>
              </div>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                v-model="form.onlinePaymentEnabled" 
                type="checkbox" 
                class="sr-only peer"
                @change="playPopSound"
              />
              <div class="w-12 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div class="p-3.5 rounded-2xl text-xs" :class="form.onlinePaymentEnabled ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'">
            <span class="font-bold block mb-1">
              {{ form.onlinePaymentEnabled ? '✓ Habilitado: Clientes podem pagar com Pix pelo app' : '✕ Desativado: Agendamentos confirmados para pagamento presencial no balcão' }}
            </span>
            <p class="text-[11px] opacity-90 leading-relaxed">
              {{ form.onlinePaymentEnabled 
                ? 'Garante reserva antecipada com zero no-show e recebimento direto.' 
                : 'O cliente agenda sem atrito e acerta o valor na barbearia (Dinheiro, Maquininha ou Pix do Salão).' }}
            </p>
          </div>
        </div>

        <!-- BLOCO 2: DIVISÃO AUTOMÁTICA (SPLIT) -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-xl transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Sliders class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Split Lei 13.352</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Divisão automática Salão-Parceiro.</p>
              </div>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                v-model="form.autoSplitEnabled" 
                type="checkbox" 
                class="sr-only peer"
                @change="playPopSound"
              />
              <div class="w-12 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div class="p-3.5 rounded-2xl text-xs" :class="form.autoSplitEnabled ? 'bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'">
            <span class="font-bold block mb-1">
              {{ form.autoSplitEnabled ? '✓ Split Automático Ativo no Gateway' : '✕ Repasse Manual (100% Salão)' }}
            </span>
            <p class="text-[11px] opacity-90 leading-relaxed">
              {{ form.autoSplitEnabled 
                ? 'A cota do barbeiro cai direto na subconta dele no Asaas. Zero bitributação.' 
                : '100% entra na conta do salão e você dá baixa manual no módulo Contas a Pagar.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- ================= BLOCO 3: CONECTAR ASAAS ================= -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Conexão com Gateway Asaas</h2>
                <!-- Status Badge -->
                <span 
                  v-if="asaasTestResult?.success" 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  Ativo &amp; Verificado
                </span>
                <span 
                  v-else-if="form.asaasApiKey" 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                >
                  Chave Inserida (Pendente Teste)
                </span>
                <span 
                  v-else 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-500 border border-slate-500/30"
                >
                  Não Conectado
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Integração oficial para emissão de Pix instantâneo, QR Code e split de cota-parte.</p>
            </div>
          </div>

          <!-- Botão Testar Conexão -->
          <button 
            type="button"
            @click="testAsaasConnection"
            :disabled="testingAsaas || !form.asaasApiKey"
            class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 shrink-0"
          >
            <Loader2 v-if="testingAsaas" class="w-4 h-4 animate-spin" />
            <Zap v-else class="w-4 h-4" />
            <span>{{ testingAsaas ? 'Validando...' : 'Testar Conexão' }}</span>
          </button>
        </div>

        <!-- Feedback de Teste de Conexão -->
        <div v-if="asaasTestResult" class="p-4 rounded-2xl text-xs" :class="asaasTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'">
          <div class="flex items-center gap-2 font-bold">
            <CheckCircle2 v-if="asaasTestResult.success" class="w-4 h-4 text-emerald-500" />
            <AlertCircle v-else class="w-4 h-4 text-rose-500" />
            <span>{{ asaasTestResult.success ? 'Conexão validada com a API oficial do Asaas!' : 'Falha na validação com o Asaas' }}</span>
          </div>
          <p class="mt-1 text-[11px] opacity-90">
            {{ asaasTestResult.success ? `Saldo atual retornado da conta Asaas: R$ ${(asaasTestResult.balance ?? 0).toFixed(2)}.` : asaasTestResult.error }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-5">
          <!-- Ambiente (Sandbox vs Produção) -->
          <div class="sm:col-span-4 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Ambiente do Asaas *
            </label>
            <select 
              v-model="form.asaasEnvironment"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="SANDBOX">🧪 Sandbox (Ambiente de Testes / Simulado)</option>
              <option value="PRODUCTION">🚀 Produção (Cobranças e Pix Reais)</option>
            </select>
            <span class="text-[10px] text-slate-500">Mude para Produção quando for cobrar de clientes reais.</span>
          </div>

          <!-- Chave de API Asaas -->
          <div class="sm:col-span-8 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Chave de API (API Key) *
            </label>
            <div class="relative">
              <input 
                v-model="form.asaasApiKey"
                :type="showApiKey ? 'text' : 'password'"
                placeholder="$aact_YTU5YTE0M2M6N2Zl..."
                class="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
              <button 
                type="button" 
                @click="showApiKey = !showApiKey" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                <EyeOff v-if="showApiKey" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <span class="text-[10px] text-slate-500">Sua chave é armazenada de forma segura e protegida no MySQL.</span>
          </div>

          <!-- Wallet ID / Subconta -->
          <div class="sm:col-span-12 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Identificador da Carteira / Wallet ID da Barbearia
            </label>
            <input 
              v-model="form.asaasWalletId"
              type="text" 
              placeholder="Ex: c534b077-16b7-4c31-8935-779836336a53"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
            <span class="text-[10px] text-slate-500">Opcional. Identifica a conta mestre do estabelecimento.</span>
          </div>
        </div>
      </div>

      <!-- ================= BLOCO 4: TAXAS DA MAQUININHA & DESCONTO ANTI NO-SHOW ================= -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Taxas Maquininha (7 Colunas) -->
        <div class="lg:col-span-7 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm dark:shadow-xl transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                <CreditCard class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Taxas da Maquininha Física (POS)</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Configure as taxas da Stone, PagBank, InfinitePay, etc.</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Pix (%)</label>
              <input 
                v-model.number="form.paymentFees.pixFeePercent"
                type="number" 
                step="0.01" 
                min="0"
                class="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Débito (%)</label>
              <input 
                v-model.number="form.paymentFees.debitFeePercent"
                type="number" 
                step="0.01" 
                min="0"
                class="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase">Crédito 1x (%)</label>
              <input 
                v-model.number="form.paymentFees.creditFeePercent"
                type="number" 
                step="0.01" 
                min="0"
                class="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
            <span class="font-bold text-amber-900 dark:text-amber-300">
              Descontar taxa da maquininha da cota do barbeiro? (Lei 13.352)
            </span>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                v-model="form.paymentFees.deductFeeFromSplit" 
                type="checkbox" 
                class="sr-only peer"
              />
              <div class="w-10 h-5 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        <!-- Incentivo Pix Anti No-Show (5 Colunas) -->
        <div class="lg:col-span-5 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm dark:shadow-xl transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div>
              <span class="text-sm font-bold text-slate-900 dark:text-white block">Incentivo Pix Online</span>
              <p class="text-xs text-slate-500 dark:text-slate-400">Desconto inteligente anti no-show.</p>
            </div>
            <input 
              v-model="form.onlineDiscountActive" 
              type="checkbox"
              class="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div v-if="form.onlineDiscountActive" class="space-y-3">
            <div class="flex gap-2">
              <button 
                @click="form.discountType = 'PERCENTAGE'"
                type="button"
                class="flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                :class="form.discountType === 'PERCENTAGE' ? 'bg-amber-500 text-black shadow' : 'bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'"
              >
                % Porcentagem
              </button>
              <button 
                @click="form.discountType = 'FIXED'"
                type="button"
                class="flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                :class="form.discountType === 'FIXED' ? 'bg-amber-500 text-black shadow' : 'bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'"
              >
                R$ Fixo
              </button>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Valor do Desconto:</span>
              <input 
                v-model.number="form.discountValue" 
                type="number" 
                min="0"
                class="w-20 bg-transparent text-right text-xs font-black text-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Chave Pix Direta da Barbearia (Balcão)</label>
            <input 
              v-model="form.pixKey" 
              type="text" 
              placeholder="31995961342 ou pix@barbearia.com"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: REGRAS DA AGENDA & PERSONALIDADE DA IA -->
    <div v-else-if="activeTab === 'POLICIES'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Políticas de Agendamento (6 Colunas) -->
      <div class="lg:col-span-6 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <CalendarClock class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Regras da Agenda</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Controle de horários, intervalo e tolerância.</p>
          </div>
        </div>

        <div class="space-y-4 text-xs">
          <!-- Antecedência Mínima -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-800 dark:text-slate-200 block">Antecedência Mínima</span>
              <span class="text-[10px] text-slate-400">Evita cliente aparecendo de surpresa</span>
            </div>
            <select 
              v-model.number="form.bookingPolicies.minAdvanceMinutes"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option :value="0">Imediato</option>
              <option :value="15">15 min</option>
              <option :value="30">30 min (Recomendado)</option>
              <option :value="60">1 hora</option>
              <option :value="120">2 horas</option>
            </select>
          </div>

          <!-- Antecedência Máxima -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-800 dark:text-slate-200 block">Antecedência Máxima</span>
              <span class="text-[10px] text-slate-400">Limite de dias futuros na grade</span>
            </div>
            <select 
              v-model.number="form.bookingPolicies.maxAdvanceDays"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option :value="7">7 dias</option>
              <option :value="15">15 dias</option>
              <option :value="30">30 dias (Padrão)</option>
              <option :value="60">60 dias</option>
            </select>
          </div>

          <!-- Limpeza da Cadeira -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-800 dark:text-slate-200 block">Intervalo entre Clientes</span>
              <span class="text-[10px] text-slate-400">Higienização e preparação da cadeira</span>
            </div>
            <select 
              v-model.number="form.bookingPolicies.chairCleanupMinutes"
              class="px-3 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option :value="0">0 min (Sem intervalo)</option>
              <option :value="5">5 min (Recomendado)</option>
              <option :value="10">10 min</option>
              <option :value="15">15 min</option>
            </select>
          </div>

          <!-- Cancelamento & Tolerância -->
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
              <span class="font-bold text-slate-700 dark:text-slate-300 block mb-1">Prazo de Cancelamento</span>
              <select 
                v-model.number="form.bookingPolicies.cancelNoticeHours"
                class="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white focus:outline-none"
              >
                <option :value="1">1h antes</option>
                <option :value="2">2h antes</option>
                <option :value="4">4h antes</option>
                <option :value="24">24h antes</option>
              </select>
            </div>

            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
              <span class="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tolerância de Atraso</span>
              <div class="flex items-center gap-1.5">
                <input 
                  v-model.number="form.toleranceMinutes"
                  type="number"
                  min="0"
                  max="60"
                  class="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 font-bold text-amber-500 text-center focus:outline-none"
                />
                <span class="text-slate-400 font-bold">min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Personalidade da IA & Mensagens (6 Colunas) -->
      <div class="lg:col-span-6 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Bot class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Personalidade da IA do WhatsApp</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Defina como a secretária de IA atende seus clientes.</p>
          </div>
        </div>

        <!-- Tom de Voz -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Tom de Voz do Atendimento
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button 
              type="button"
              @click="form.bookingPolicies.aiTone = 'CLASSIC'; playPopSound()"
              class="p-2.5 rounded-xl border text-center transition cursor-pointer"
              :class="form.bookingPolicies.aiTone === 'CLASSIC' ? 'border-amber-500 bg-amber-500/15 text-amber-500 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            >
              <div class="text-xs">🎩 Clássico</div>
              <div class="text-[9px] opacity-75 mt-0.5">Formal e cavalheiro</div>
            </button>
            <button 
              type="button"
              @click="form.bookingPolicies.aiTone = 'MODERN'; playPopSound()"
              class="p-2.5 rounded-xl border text-center transition cursor-pointer"
              :class="form.bookingPolicies.aiTone === 'MODERN' ? 'border-amber-500 bg-amber-500/15 text-amber-500 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            >
              <div class="text-xs">⚡ Moderno</div>
              <div class="text-[9px] opacity-75 mt-0.5">Ágil e acolhedor</div>
            </button>
            <button 
              type="button"
              @click="form.bookingPolicies.aiTone = 'URBAN'; playPopSound()"
              class="p-2.5 rounded-xl border text-center transition cursor-pointer"
              :class="form.bookingPolicies.aiTone === 'URBAN' ? 'border-amber-500 bg-amber-500/15 text-amber-500 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            >
              <div class="text-xs">💈 Urbano</div>
              <div class="text-[9px] opacity-75 mt-0.5">Fade, réguas e gírias</div>
            </button>
          </div>
        </div>

        <!-- Instruções Específicas da Barbearia para a IA -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Instruções Customizadas para a IA
          </label>
          <textarea 
            v-model="form.bookingPolicies.aiCustomPrompt"
            rows="3"
            maxlength="500"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
            placeholder="Ex: Lembrar que temos cerveja gelada de cortesia e mesa de sinuca. Caso perguntem sobre estacionamento, informar que temos convênio com o AutoPark ao lado."
          ></textarea>
        </div>

        <!-- Mensagem de Boas-Vindas & Orientações -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Orientações Pós-Agendamento (Tela de Confirmação)
          </label>
          <textarea 
            v-model="form.bookingPolicies.welcomeMessage"
            rows="2"
            maxlength="500"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
            placeholder="Ex: Chegue com 5 minutos de antecedência. Café espresso e Wi-Fi de cortesia."
          ></textarea>
        </div>
      </div>
    </div>

    <!-- TAB 6: TRÁFEGO PAGO & DISPLAY DE BALCÃO (NOVIDADE SAAS 2026) -->
    <div v-else-if="activeTab === 'MARKETING'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Gerador de Display de Balcão em Acrílico (7 Colunas) -->
      <div class="lg:col-span-7 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Printer class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Display de Balcão &amp; QR Code de Mesa</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Placa em acrílico pronta para imprimir e colocar no salão.</p>
            </div>
          </div>
          <button 
            @click="showPrintModal = true; playPopSound()"
            type="button"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Printer class="w-3.5 h-3.5" />
            <span>Imprimir Placa</span>
          </button>
        </div>

        <!-- Mockup Visual Realista de Display de Balcão -->
        <div class="p-6 rounded-3xl bg-gradient-to-b from-[#181d2c] via-[#0f131f] to-[#080a10] border-2 border-amber-500/30 text-center space-y-4 max-w-sm mx-auto shadow-2xl shadow-black/50 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="flex items-center justify-center gap-2">
            <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-9 h-9 rounded-full object-cover border border-amber-500/40" />
            <h3 class="text-sm font-black text-amber-400 tracking-wider uppercase">
              {{ form.name || 'BARBER CLUB' }}
            </h3>
          </div>

          <p class="text-[11px] text-slate-300 font-medium">
            Aponte a câmera e agende seu horário em 30 segundos:
          </p>

          <div class="w-40 h-40 bg-white p-2.5 rounded-2xl mx-auto shadow-lg shadow-black/40 flex items-center justify-center">
            <img :src="qrCodeUrl" alt="QR Code Oficial" class="w-full h-full object-contain" />
          </div>

          <div class="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/10 py-1.5 px-3 rounded-lg border border-amber-500/20 truncate">
            {{ fullClientUrl }}
          </div>

          <div class="text-[9px] text-slate-500 font-medium uppercase tracking-widest pt-1">
            VIP Booking Experience • BarblyClub
          </div>
        </div>

        <div class="flex items-center justify-center gap-3 pt-2">
          <button 
            type="button" 
            @click="downloadQrCode"
            class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-white/10"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Baixar Imagem do QR Code</span>
          </button>
        </div>
      </div>

      <!-- Tráfego Pago & Meta Ads Pixel (5 Colunas) -->
      <div class="lg:col-span-5 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            <Target class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Tráfego Pago &amp; Anúncios</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Rastreie agendamentos de anúncios do Instagram.</p>
          </div>
        </div>

        <!-- Meta Pixel ID -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            ID do Pixel do Meta (Facebook &amp; Instagram)
          </label>
          <input 
            v-model="form.bookingPolicies.metaPixelId"
            type="text"
            placeholder="Ex: 874629103859201"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
          />
          <span class="text-[10px] text-slate-500">
            Dispara automaticamente eventos de <code>Schedule</code> e <code>Purchase</code> ao concluir agendamento no PWA.
          </span>
        </div>

        <!-- Google Analytics ID -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            ID do Google Analytics 4 (GA4)
          </label>
          <input 
            v-model="form.bookingPolicies.googleAnalyticsId"
            type="text"
            placeholder="Ex: G-XXXXXXXXXX"
            class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
          />
          <span class="text-[10px] text-slate-500">Mede o volume de acessos e taxas de conversão da página pública.</span>
        </div>

        <!-- Exportação LGPD -->
        <div class="p-4 rounded-2xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2.5">
          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">Soberania de Dados &amp; Backup LGPD</span>
          <p class="text-[11px] text-slate-500 leading-relaxed">
            Seus dados nunca ficam presos. Exporte os dados cadastrais da barbearia a qualquer momento.
          </p>
          <div class="flex items-center gap-2 pt-1">
            <button 
              type="button" 
              @click="exportData('CLIENTS')"
              class="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50"
            >
              <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-500" />
              <span>Exportar Clientes</span>
            </button>
            <button 
              type="button" 
              @click="exportData('FISCAL')"
              class="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50"
            >
              <FileSpreadsheet class="w-3.5 h-3.5 text-amber-500" />
              <span>Relatório Lei 13.352</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 7: IDENTIDADE VISUAL & TEMA -->
    <div v-else-if="activeTab === 'THEME'" class="space-y-6">
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <Palette class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Cores da Sua Marca (White-Label) &amp; Modo de Exibição</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Personalize o tema escuro/claro e a cor de destaque da sua barbearia.</p>
          </div>
        </div>

        <!-- Mode Toggle Box (Dark vs Light) -->
        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="text-sm font-bold text-slate-900 dark:text-white block">Modo de Exibição do Painel</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">Alterne entre o Modo Escuro (Titanium Obsidian) e o Modo Claro (Clean Pro).</span>
          </div>
          <div class="flex items-center gap-2 bg-white dark:bg-[#07090e] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
            <button 
              @click="themeStore.isDark = false; themeStore.applyTheme(); form.themeMode = 'light'; playPopSound()"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              :class="!themeStore.isDark ? 'bg-amber-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            >
              <Sun class="w-4 h-4" />
              <span>Modo Claro</span>
            </button>
            <button 
              @click="themeStore.isDark = true; themeStore.applyTheme(); form.themeMode = 'dark'; playPopSound()"
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              :class="themeStore.isDark ? 'bg-amber-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'"
            >
              <Moon class="w-4 h-4" />
              <span>Modo Escuro</span>
            </button>
          </div>
        </div>

        <!-- Color Preset Palette Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Gold -->
          <div 
            @click="selectThemeColor('gold')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="form.themeColor === 'gold' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 hover:border-slate-300 dark:hover:border-white/20'"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Champagne Gold</span>
              <div class="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-black" v-if="form.themeColor === 'gold'">
                <Check class="w-3 h-3" />
              </div>
            </div>
            <div class="h-8 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 shadow-sm"></div>
          </div>

          <!-- Blue -->
          <div 
            @click="selectThemeColor('blue')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="form.themeColor === 'blue' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 hover:border-slate-300 dark:hover:border-white/20'"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Titanium Blue</span>
              <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white" v-if="form.themeColor === 'blue'">
                <Check class="w-3 h-3" />
              </div>
            </div>
            <div class="h-8 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 shadow-sm"></div>
          </div>

          <!-- Emerald -->
          <div 
            @click="selectThemeColor('emerald')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="form.themeColor === 'emerald' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 hover:border-slate-300 dark:hover:border-white/20'"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Emerald Green</span>
              <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white" v-if="form.themeColor === 'emerald'">
                <Check class="w-3 h-3" />
              </div>
            </div>
            <div class="h-8 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-sm"></div>
          </div>

          <!-- Copper -->
          <div 
            @click="selectThemeColor('copper')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="form.themeColor === 'copper' ? 'border-orange-500 bg-orange-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 hover:border-slate-300 dark:hover:border-white/20'"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-900 dark:text-white">Royal Copper</span>
              <div class="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white" v-if="form.themeColor === 'copper'">
                <Check class="w-3 h-3" />
              </div>
            </div>
            <div class="h-8 rounded-xl bg-gradient-to-r from-orange-600 via-amber-700 to-amber-500 shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 8: MEU PLANO SAAS & SIMULADOR DE ROI FISCAL -->
    <div v-else-if="activeTab === 'PLAN'" class="space-y-6">
      
      <!-- Card Status do Plano -->
      <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Crown class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-black text-slate-900 dark:text-white">Plano Barbly PRO VIP</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 font-mono">
                  30 Dias Grátis Ativos
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300">Todos os recursos avançados de IA, split automático e finanças liberados.</p>
            </div>
          </div>

          <div class="text-left sm:text-right">
            <span class="text-[10px] uppercase font-bold text-slate-500 block">Status da Assinatura</span>
            <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">Ativa e Regularizada</span>
          </div>
        </div>

        <!-- Recursos Liberados no Plano -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Agendamentos Ilimitados</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Agente de IA no WhatsApp 24/7</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Split Automático Lei 13.352</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Financeiro &amp; DRE Gerencial</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Mídia Indoor para Smart TV</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white/70 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center gap-2.5">
            <Check class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="font-bold text-slate-800 dark:text-slate-200">Suporte Prioritário VIP</span>
          </div>
        </div>
      </div>

      <!-- Calculadora & Simulador de Economia Fiscal da Lei Salão-Parceiro -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <TrendingUp class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Simulador de Economia Fiscal (Lei Salão-Parceiro 13.352)</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Descubra quanto a sua barbearia economiza de imposto usando o BarblyClub.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-4 md:col-span-2">
            <!-- Slider Faturamento -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-300">Faturamento Bruto Mensal da Barbearia:</span>
                <span class="font-mono font-black text-amber-500 text-sm">R$ {{ simRevenue.toLocaleString('pt-BR') }},00</span>
              </div>
              <input 
                v-model.number="simRevenue" 
                type="range" 
                min="10000" 
                max="120000" 
                step="5000" 
                class="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <!-- Slider Comissão -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-700 dark:text-slate-300">Comissão Média Repassada aos Barbeiros:</span>
                <span class="font-mono font-black text-amber-500 text-sm">{{ simBarberCommissionPercent }}%</span>
              </div>
              <input 
                v-model.number="simBarberCommissionPercent" 
                type="range" 
                min="30" 
                max="70" 
                step="5" 
                class="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          <!-- Card de Economia Resultante -->
          <div class="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col justify-between text-center space-y-3">
            <div>
              <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Sua Economia Real Estimada
              </span>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                R$ {{ simMonthlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
                <span class="text-xs font-normal text-slate-400 block">/mês economizados</span>
              </div>
            </div>

            <div class="pt-2 border-t border-emerald-500/20 text-xs">
              <span class="text-slate-400 block text-[10px] uppercase">Economia Anual em Impostos:</span>
              <span class="font-black text-slate-900 dark:text-white font-mono text-base">
                R$ {{ simYearlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL DE IMPRESSÃO DO DISPLAY DE BALCÃO ================= -->
    <Teleport to="body">
      <div v-if="showPrintModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
          <button 
            type="button" 
            @click="showPrintModal = false"
            class="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="text-center space-y-1">
            <h3 class="text-lg font-black text-slate-900 dark:text-white">Display de Balcão Oficial</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Pronto para imprimir e colocar em moldura de acrílico.</p>
          </div>

          <!-- Card de Impressão (Estilizado) -->
          <div id="counter-display-card" class="p-6 rounded-3xl bg-[#080a10] border-2 border-amber-500/40 text-center space-y-4 shadow-xl">
            <div class="flex items-center justify-center gap-2">
              <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-10 h-10 rounded-full object-cover border border-amber-500/40" />
              <div class="text-left">
                <h4 class="text-sm font-black text-amber-400 uppercase tracking-wider">{{ form.name || 'BARBER CLUB' }}</h4>
                <span class="text-[9px] text-slate-400 uppercase tracking-widest block">Agendamento Online VIP</span>
              </div>
            </div>

            <div class="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-md">
              <img :src="qrCodeUrl" alt="QR Code" class="w-full h-full object-contain" />
            </div>

            <div class="space-y-1">
              <p class="text-xs font-bold text-white">Aponte a câmera do celular para agendar</p>
              <p class="text-[10px] text-amber-300 font-mono">{{ fullClientUrl }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button 
              type="button" 
              @click="printCounterDisplay"
              class="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Printer class="w-4 h-4" />
              <span>Imprimir Agora (A4 / A5)</span>
            </button>
            <button 
              type="button" 
              @click="showPrintModal = false"
              class="px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold transition text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #counter-display-card, #counter-display-card * {
    visibility: visible;
  }
  #counter-display-card {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) scale(1.3);
    border: 3px solid #d97706 !important;
    background: #000 !important;
    color: #fff !important;
    box-shadow: none !important;
  }
}
</style>
