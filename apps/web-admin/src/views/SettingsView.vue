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
  HelpCircle
} from 'lucide-vue-next';
import { useThemeStore, colorPresets, type AccentColor } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { api, type OrgSettings, type DaySchedule, type BookingPolicies } from '../services/api';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const toast = useToastStore();

const activeTab = ref<'BUSINESS' | 'LOCATION' | 'HOURS' | 'PAYMENT' | 'POLICIES' | 'THEME' | 'PLAN'>('BUSINESS');
const loading = ref(true);
const saving = ref(false);
const searchingCep = ref(false);
const copiedSlug = ref(false);
const showApiKey = ref(false);
const testingAsaas = ref(false);
const asaasTestResult = ref<{ success: boolean; balance?: number; error?: string } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

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
  
  // Políticas de Agendamento
  bookingPolicies: {
    minAdvanceMinutes: 30,
    maxAdvanceDays: 30,
    chairCleanupMinutes: 5,
    cancelNoticeHours: 2,
    welcomeMessage: 'Bem-vindo ao nosso espaço! Chegue com 5 minutos de antecedência. Café e Wi-Fi de cortesia disponíveis.',
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

const orgId = computed(() => authStore.organization?.id || 'org_y6c0a0ji');
const fullClientUrl = computed(() => `https://barblyclub.com.br/cliente/${form.slug || authStore.organization?.slug || 'barbearia'}`);

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
      message: 'Clique em "Salvar Alterações" no topo para gravar seu logo.',
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

// Busca CEP via ViaCEP (Gratuito e em tempo real)
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
      message: 'Todas as preferências, chaves e políticas foram gravadas no MySQL.',
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
  <div class="p-6 sm:p-10 max-w-6xl mx-auto space-y-8 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors">
    
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
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
          Gerencie identidade da marca, gateways de pagamento, divisão automática (split), regras de agendamento e plano SaaS.
        </p>
      </div>

      <!-- Action Buttons in Top Header -->
      <div class="flex items-center gap-3 shrink-0">
        <button 
          @click="saveAllSettings" 
          :disabled="saving || loading"
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin text-black" />
          <Check v-else class="w-4 h-4 text-black" />
          <span>{{ saving ? 'Salvando no Banco...' : 'Salvar Alterações' }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
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
        <span>Regras da Agenda</span>
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
        <span>Meu Plano SaaS</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 class="w-8 h-8 animate-spin text-amber-500" />
      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando dados da sua barbearia...</span>
    </div>

    <!-- TAB 1: DADOS DA BARBEARIA & LOGO -->
    <div v-else-if="activeTab === 'BUSINESS'" class="space-y-6">
      
      <!-- Bloco de Upload do Logo Oficial -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <ImageIcon class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Logo Oficial da Barbearia</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Exibido na tela inicial do app de agendamento, cabeçalho de recibos e notificações.</p>
          </div>
        </div>

        <div class="flex flex-col md:flex-row items-center gap-6">
          <!-- Circular & Banner Live Previews -->
          <div class="flex items-center gap-4 shrink-0">
            <!-- Circular Preview -->
            <div class="relative group">
              <div class="w-24 h-24 rounded-full border-2 border-amber-500/40 bg-slate-100 dark:bg-[#07090e] flex items-center justify-center overflow-hidden shadow-lg shadow-black/20">
                <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-full h-full object-cover" />
                <Building2 v-else class="w-10 h-10 text-slate-400" />
              </div>
              <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/80 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                App Avatar
              </span>
            </div>

            <!-- Banner Preview -->
            <div class="hidden sm:flex flex-col justify-center px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 w-48 h-24 text-center">
              <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Prévia no Cabeçalho</span>
              <div class="flex items-center justify-center gap-2">
                <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-7 h-7 rounded-full object-cover border border-amber-500/40" />
                <span class="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                  {{ form.name || 'Barbearia VIP' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions & Upload Input -->
          <div class="flex-1 space-y-3 w-full">
            <input 
              ref="fileInputRef" 
              type="file" 
              accept="image/png,image/jpeg,image/webp,image/svg+xml" 
              class="hidden" 
              @change="handleLogoFile" 
            />
            <div class="flex flex-wrap items-center gap-3">
              <button 
                type="button" 
                @click="triggerLogoSelect"
                class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <UploadCloud class="w-4 h-4" />
                <span>{{ form.logoUrl ? 'Trocar Imagem do Logo' : 'Enviar Imagem do Logo' }}</span>
              </button>
              <button 
                v-if="form.logoUrl" 
                type="button" 
                @click="removeLogo"
                class="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer border border-rose-500/20"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Formatos recomendados: PNG transparente ou SVG quadrado. Tamanho máximo de 2MB.
            </p>
          </div>
        </div>
      </div>

      <!-- Informações Comerciais Principais -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
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
      
      <!-- ================= BLOCO 1: PAGAMENTO ONLINE TOGGLE ================= -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Zap class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Pagamento Online no Agendamento</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Permite que seus clientes paguem antecipado via Pix no momento de agendar o horário.</p>
            </div>
          </div>

          <!-- Master Toggle Pagamento Online -->
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              v-model="form.onlinePaymentEnabled" 
              type="checkbox" 
              class="sr-only peer"
              @change="playPopSound"
            />
            <div class="w-14 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div class="p-4 rounded-2xl" :class="form.onlinePaymentEnabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5'">
          <div class="flex items-start gap-3">
            <CheckCircle2 v-if="form.onlinePaymentEnabled" class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <AlertCircle v-else class="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div class="space-y-1">
              <span class="text-xs font-bold text-slate-900 dark:text-white block">
                {{ form.onlinePaymentEnabled ? 'Pagamento Online Habilitado' : 'Pagamento Online Desativado (Apenas Balcão Presencial)' }}
              </span>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {{ form.onlinePaymentEnabled 
                  ? 'Os clientes têm a opção de efetuar o pagamento antecipadamente com Pix no app, garantindo reserva sem no-show e recebimento imediato.' 
                  : 'Quando desativado, o cliente agenda o horário sem ser solicitado a pagar nada antecipadamente. O pagamento do corte é feito 100% presencialmente no salão (Dinheiro, Maquininha ou Pix do Salão).' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= BLOCO 2: DIVISÃO AUTOMÁTICA (SPLIT) ================= -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Sliders class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Divisão de Valores Automática (Split Gateway)</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Separação automática da cota-parte do profissional e do salão pela <strong>Lei Salão-Parceiro (13.352)</strong>.</p>
            </div>
          </div>

          <!-- Split Master Toggle -->
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              v-model="form.autoSplitEnabled" 
              type="checkbox" 
              class="sr-only peer"
              @change="playPopSound"
            />
            <div class="w-14 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <span class="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <Check class="w-4 h-4 text-purple-500" />
              Se Ativado (Split Automático no Gateway):
            </span>
            <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
              O gateway Asaas divide o Pix no ato do pagamento: a comissão cai instantaneamente na subconta do barbeiro cadastrada e o saldo do salão cai na sua conta principal. <strong>Sem bitributação</strong> e sem necessidade de pagar comissão manualmente depois.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-2">
            <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <DollarSign class="w-4 h-4 text-amber-500" />
              Se Desativado (100% no Salão + Repasse Manual):
            </span>
            <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
              100% do valor do agendamento é creditado na conta do salão. A comissão dos barbeiros é calculada pelo sistema e gerenciada com baixa manual no módulo <strong>Financeiro &gt; Contas a Pagar</strong>.
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
            <span class="text-[10px] text-slate-500">Sua chave é armazenada de forma criptografada e segura no MySQL.</span>
          </div>

          <!-- Wallet ID / Subconta -->
          <div class="sm:col-span-12 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Identificador da Conta Asaas (Wallet ID / Subconta Principal)
            </label>
            <input 
              v-model="form.asaasWalletId"
              type="text" 
              placeholder="Ex: c534b077-16b7-4c31-8935-779836336a53"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
            <span class="text-[10px] text-slate-500">Opcional. Identifica a conta mestre do salão quando o split automático estiver ativado.</span>
          </div>
        </div>

        <!-- Passo a Passo Ilustrado -->
        <div class="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs space-y-2">
          <div class="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
            <HelpCircle class="w-4 h-4" />
            <span>Como obter sua chave de API no Asaas?</span>
          </div>
          <ol class="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            <li>Acesse seu painel do Asaas (<a href="https://sandbox.asaas.com" target="_blank" class="text-blue-500 underline font-semibold">sandbox.asaas.com</a> para testes ou <a href="https://www.asaas.com" target="_blank" class="text-blue-500 underline font-semibold">asaas.com</a> para produção).</li>
            <li>No menu lateral esquerdo, clique em <strong>Minha Conta</strong> e depois em <strong>Integrações</strong>.</li>
            <li>Localize a seção <strong>Chave de API</strong>, clique em <strong>Gerar Nova Chave</strong>, copie e cole no campo acima.</li>
            <li>Clique no botão <strong>"Testar Conexão"</strong> para confirmar que a chave está respondendo.</li>
          </ol>
        </div>
      </div>

      <!-- ================= BLOCO 4: TAXAS DA MAQUININHA ================= -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
              <CreditCard class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Taxas da Maquininha Física de Cartão</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Configure as taxas cobradas pela sua operadora de POS física (Stone, PagBank, InfinitePay, etc.)</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Economia Automática
          </span>
        </div>

        <!-- Grid dos 3 Inputs Simples -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Pix na Maquininha (%)</label>
            <div class="relative">
              <input 
                v-model.number="form.paymentFees.pixFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Padrão: 0%</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Cartão de Débito (%)</label>
            <div class="relative">
              <input 
                v-model.number="form.paymentFees.debitFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Padrão: 1.4%</span>
          </div>

          <div class="p-3.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Crédito à Vista (%)</label>
            <div class="relative">
              <input 
                v-model.number="form.paymentFees.creditFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Padrão: 3.2%</span>
          </div>
        </div>

        <!-- Chave Seletora Inteligente (Toggle) -->
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <span class="text-xs font-black text-amber-900 dark:text-amber-300 block">
              Descontar taxa da maquininha da cota-parte dos profissionais?
            </span>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Amparado pela <strong>Lei 13.352 (Salão-Parceiro)</strong>. Quando ativado, a comissão do profissional é calculada sobre o valor líquido recebido após o desconto da taxa da maquininha, evitando que o salão arque sozinho com a taxa bancária.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input 
              v-model="form.paymentFees.deductFeeFromSplit" 
              type="checkbox" 
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <!-- Incentivo Pix Anti No-Show -->
        <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-bold text-slate-900 dark:text-white block">Incentivo de Desconto no Pagamento Online</span>
              <p class="text-xs text-slate-500 dark:text-slate-400">Aplica desconto automático para o cliente pagar na hora pelo app, incentivando zero no-show.</p>
            </div>
            <input 
              v-model="form.onlineDiscountActive" 
              type="checkbox"
              class="w-5 h-5 rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div v-if="form.onlineDiscountActive" class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tipo de Desconto</label>
              <div class="flex gap-2">
                <button 
                  @click="form.discountType = 'PERCENTAGE'"
                  type="button"
                  class="flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  :class="form.discountType === 'PERCENTAGE' ? 'bg-amber-500 text-black shadow' : 'bg-white dark:bg-black/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'"
                >
                  Porcentagem (%)
                </button>
                <button 
                  @click="form.discountType = 'FIXED'"
                  type="button"
                  class="flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  :class="form.discountType === 'FIXED' ? 'bg-amber-500 text-black shadow' : 'bg-white dark:bg-black/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'"
                >
                  Valor Fixo (R$)
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Valor do Desconto ({{ form.discountType === 'PERCENTAGE' ? '%' : 'R$' }})
              </label>
              <input 
                v-model.number="form.discountValue" 
                type="number" 
                min="0"
                class="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <!-- Chave Pix Direta (Para balcão) -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
          <div class="flex items-center gap-2">
            <QrCode class="w-4 h-4 text-emerald-500" />
            <span class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Chave Pix Direta da Barbearia (Balcão Manual)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div class="sm:col-span-4">
              <label class="block text-[11px] font-bold text-slate-500 uppercase">Tipo de Chave</label>
              <select 
                v-model="form.pixKeyType" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PHONE">Telefone Celular</option>
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="EMAIL">E-mail</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
            </div>
            <div class="sm:col-span-8">
              <label class="block text-[11px] font-bold text-slate-500 uppercase">Chave Pix</label>
              <input 
                v-model="form.pixKey" 
                type="text" 
                placeholder="Ex: 31995961342 ou pix@barbearia.com"
                class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: REGRAS DA AGENDA & POLÍTICAS -->
    <div v-else-if="activeTab === 'POLICIES'" class="space-y-6">
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <CalendarClock class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Políticas de Agendamento &amp; Regras da Casa</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Controle a antecedência das reservas, higienização de cadeiras e regras de cancelamento.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <!-- Antecedência Mínima -->
          <div class="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Antecedência Mínima para Agendar
            </label>
            <select 
              v-model.number="form.bookingPolicies.minAdvanceMinutes"
              class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option :value="0">Sem antecedência (Imediato)</option>
              <option :value="15">15 minutos de antecedência</option>
              <option :value="30">30 minutos de antecedência (Recomendado)</option>
              <option :value="60">1 hora de antecedência</option>
              <option :value="120">2 horas de antecedência</option>
            </select>
            <span class="text-[10px] text-slate-500">Evita agendamentos de última hora sem aviso prévio ao profissional.</span>
          </div>

          <!-- Antecedência Máxima -->
          <div class="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Antecedência Máxima da Agenda
            </label>
            <select 
              v-model.number="form.bookingPolicies.maxAdvanceDays"
              class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option :value="7">Até 7 dias à frente</option>
              <option :value="15">Até 15 dias à frente</option>
              <option :value="30">Até 30 dias à frente (Padrão)</option>
              <option :value="60">Até 60 dias à frente</option>
              <option :value="90">Até 90 dias à frente</option>
            </select>
            <span class="text-[10px] text-slate-500">Limita até qual data futura o cliente pode visualizar horários vagos.</span>
          </div>

          <!-- Limpeza / Higienização da Cadeira -->
          <div class="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Intervalo entre Clientes (Higienização)
            </label>
            <select 
              v-model.number="form.bookingPolicies.chairCleanupMinutes"
              class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option :value="0">0 minutos (Clientes em sequência direta)</option>
              <option :value="5">5 minutos (Recomendado para limpeza da cadeira)</option>
              <option :value="10">10 minutos de intervalo</option>
              <option :value="15">15 minutos de intervalo</option>
            </select>
            <span class="text-[10px] text-slate-500">Tempo de respiro adicionado ao término de cada atendimento.</span>
          </div>

          <!-- Prazo Limite de Cancelamento -->
          <div class="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Prazo Limite para Cancelamento
            </label>
            <select 
              v-model.number="form.bookingPolicies.cancelNoticeHours"
              class="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option :value="1">Até 1 hora antes do horário</option>
              <option :value="2">Até 2 horas antes (Padrão)</option>
              <option :value="4">Até 4 horas antes</option>
              <option :value="12">Até 12 horas antes</option>
              <option :value="24">Até 24 horas antes</option>
            </select>
            <span class="text-[10px] text-slate-500">Após esse prazo, o cliente deve ligar diretamente na barbearia.</span>
          </div>

          <!-- Tolerância de Atraso -->
          <div class="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-slate-900 dark:text-white block">Tolerância Máxima de Atraso</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Tempo limite de espera antes que a vaga possa ser liberada para walk-in.</span>
            </div>
            <div class="flex items-center gap-1.5 bg-white dark:bg-[#07090e] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10">
              <input 
                v-model.number="form.toleranceMinutes" 
                type="number" 
                min="0" 
                max="60"
                class="w-10 bg-transparent text-xs font-black text-amber-600 dark:text-amber-400 text-center focus:outline-none"
              />
              <span class="text-xs text-slate-500">min</span>
            </div>
          </div>

          <!-- Mensagem de Boas-Vindas & Orientações -->
          <div class="sm:col-span-2 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Mensagem de Boas-Vindas &amp; Orientações (Exibida pós-agendamento)
            </label>
            <textarea 
              v-model="form.bookingPolicies.welcomeMessage"
              rows="3"
              maxlength="500"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
              placeholder="Ex: Seja muito bem-vindo! Chegue com 5 minutos de antecedência. Café espresso e Wi-Fi de cortesia."
            ></textarea>
            <span class="text-[10px] text-slate-500">Aparece na tela de confirmação e no WhatsApp de lembrete do cliente.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: IDENTIDADE VISUAL & TEMA -->
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

    <!-- TAB 7: MEU PLANO SAAS & ASSINATURA -->
    <div v-else-if="activeTab === 'PLAN'" class="space-y-6">
      <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Crown class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-black text-slate-900 dark:text-white">Plano Barbly PRO Vip</h2>
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

        <!-- Card Suporte & Ajuda -->
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-0.5">
            <span class="text-xs font-bold text-slate-900 dark:text-white block">Precisa de ajuda com sua conta ou migração de dados?</span>
            <span class="text-[11px] text-slate-600 dark:text-slate-400">Nossa equipe técnica atende você diretamente pelo WhatsApp oficial.</span>
          </div>
          <a 
            href="https://wa.me/5531995961342?text=Olá!%20Preciso%20de%20suporte%20no%20Barbly%20Club." 
            target="_blank"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shrink-0 shadow-md"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Falar com Suporte VIP</span>
          </a>
        </div>
      </div>
    </div>

  </div>
</template>
