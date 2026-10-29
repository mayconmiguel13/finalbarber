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
  CreditCard
} from 'lucide-vue-next';
import { useThemeStore, colorPresets, type AccentColor } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { api, type OrgSettings, type DaySchedule } from '../services/api';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const toast = useToastStore();

const activeTab = ref<'BUSINESS' | 'LOCATION' | 'HOURS' | 'PAYMENT' | 'THEME'>('BUSINESS');
const loading = ref(true);
const saving = ref(false);
const searchingCep = ref(false);
const copiedSlug = ref(false);

// Form State
const form = reactive({
  name: '',
  slug: '',
  ownerName: '',
  phone: '',
  document: '',
  
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
  
  // Pagamento Online
  onlineDiscountActive: true,
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: 10,
  toleranceMinutes: 15,
  pixKey: '',
  pixKeyType: 'PHONE' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM',
  
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
    
    form.onlineDiscountActive = data.onlineDiscountActive ?? true;
    form.discountType = data.onlineDiscountType || 'PERCENTAGE';
    form.discountValue = data.onlineDiscountValue || 10;
    form.toleranceMinutes = data.toleranceMinutes || 15;
    form.pixKey = data.pixKey || '';
    form.pixKeyType = data.pixKeyType || 'PHONE';
    
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
  } catch (err: any) {
    console.warn('Erro ao carregar configurações do banco:', err);
  } finally {
    loading.value = false;
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

function toggleThemeMode() {
  playPopSound();
  themeStore.toggleTheme();
  form.themeMode = themeStore.isDark ? 'dark' : 'light';
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
        postalCode: form.postalCode,
        address: form.address,
        addressNumber: form.addressNumber,
        neighborhood: form.neighborhood,
        complement: form.complement,
        city: form.city,
        state: form.state,
        themeColor: form.themeColor,
        themeMode: form.themeMode,
        onlineDiscountActive: form.onlineDiscountActive,
        onlineDiscountType: form.discountType,
        onlineDiscountValue: Number(form.discountValue),
        toleranceMinutes: Number(form.toleranceMinutes),
        pixKey: form.pixKey,
        pixKeyType: form.pixKeyType,
        openingHours: form.openingHours,
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
      localStorage.setItem('barber_org', JSON.stringify(authStore.organization));
    }

    toast.show({
      title: 'Configurações Salvas!',
      message: 'Todos os dados e horários da sua barbearia foram atualizados no MySQL.',
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
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Configurações da Barbearia
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie as informações comerciais, localização, horários de atendimento da IA e regras financeiras do Pix.
        </p>
      </div>

      <!-- Action Buttons in Top Header -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- Save Button -->
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
        <span>Dados da Barbearia</span>
      </button>

      <button 
        @click="activeTab = 'LOCATION'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'LOCATION' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <MapPin class="w-4 h-4" />
        <span>Localização &amp; Endereço</span>
      </button>

      <button 
        @click="activeTab = 'HOURS'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'HOURS' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Clock class="w-4 h-4" />
        <span>Horários de Funcionamento</span>
      </button>

      <button 
        @click="activeTab = 'PAYMENT'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'PAYMENT' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <DollarSign class="w-4 h-4" />
        <span>Chave Pix &amp; Anti No-Show</span>
      </button>

      <button 
        @click="activeTab = 'THEME'; playPopSound()"
        class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
        :class="activeTab === 'THEME' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Palette class="w-4 h-4" />
        <span>Identidade Visual</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 class="w-8 h-8 animate-spin text-amber-500" />
      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando dados da sua barbearia...</span>
    </div>

    <!-- TAB 1: DADOS DA BARBEARIA -->
    <div v-else-if="activeTab === 'BUSINESS'" class="space-y-6">
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
              placeholder="Ex: CurtyBarber"
            />
          </div>

          <!-- Nome do Proprietário -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome do Proprietário *
            </label>
            <input 
              v-model="form.ownerName"
              type="text" 
              required
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="Ex: Maycon Curty"
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

          <!-- Estado (UF) -->
          <div class="sm:col-span-4 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Estado (UF)</label>
            <input 
              v-model="form.state"
              type="text" 
              maxlength="2"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 uppercase text-center transition"
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
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">Horários de Funcionamento</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">A IA e o agendamento online só oferecem horários dentro dos períodos ativos.</p>
            </div>
          </div>

          <button 
            @click="copyMondayHoursToAll" 
            type="button"
            class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto border border-slate-200 dark:border-white/10"
          >
            <Copy class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Copiar 2ª para a Semana</span>
          </button>
        </div>

        <!-- Weekly Schedule Table -->
        <div class="space-y-3">
          <div 
            v-for="(label, key) in dayLabels" 
            :key="key"
            class="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200/80 dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/40 transition"
          >
            <!-- Day Name & Toggle Closed -->
            <div class="flex items-center justify-between md:justify-start gap-4 md:w-48">
              <span class="text-sm font-bold text-slate-900 dark:text-white">{{ label }}</span>
              <button 
                @click="form.openingHours[key].closed = !form.openingHours[key].closed; playPopSound()"
                type="button"
                class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                :class="form.openingHours[key].closed ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'"
              >
                {{ form.openingHours[key].closed ? 'Fechado' : 'Aberto' }}
              </button>
            </div>

            <!-- Operating Hours & Lunch Break -->
            <div v-if="!form.openingHours[key].closed" class="flex flex-wrap items-center gap-3 text-xs">
              <!-- Turno Principal -->
              <div class="flex items-center gap-1.5 bg-white dark:bg-black/40 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <span class="text-slate-500 dark:text-slate-400">Expediente:</span>
                <input 
                  v-model="form.openingHours[key].open" 
                  type="time" 
                  class="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none"
                />
                <span class="text-slate-400">até</span>
                <input 
                  v-model="form.openingHours[key].close" 
                  type="time" 
                  class="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none"
                />
              </div>

              <!-- Pausa de Almoço -->
              <div class="flex items-center gap-1.5 bg-white dark:bg-black/40 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                <span class="text-slate-500 dark:text-slate-400">Pausa/Almoço:</span>
                <input 
                  v-model="form.openingHours[key].lunchStart" 
                  type="time" 
                  class="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
                />
                <span class="text-slate-400">às</span>
                <input 
                  v-model="form.openingHours[key].lunchEnd" 
                  type="time" 
                  class="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div v-else class="text-xs text-slate-400 italic">
              Nenhum agendamento será aceito neste dia.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: CHAVE PIX & ANTI NO-SHOW -->
    <div v-else-if="activeTab === 'PAYMENT'" class="space-y-6">
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Chave Pix &amp; Regras Anti No-Show</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Configure a chave Pix da barbearia e a política de incentivo de pagamento online.</p>
          </div>
        </div>

        <!-- Chave Pix do Estabelecimento -->
        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Chave Pix da Barbearia para Recebimentos
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <!-- Tipo da Chave -->
            <div class="sm:col-span-4 space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase">Tipo da Chave</label>
              <select 
                v-model="form.pixKeyType"
                class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PHONE">Telefone / Celular</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="RANDOM">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <!-- Chave Pix -->
            <div class="sm:col-span-8 space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase">Chave Pix</label>
              <input 
                v-model="form.pixKey"
                type="text" 
                placeholder="Ex: 31995961342 ou financeiro@barbearia.com"
                class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Taxas da Maquininha & Split Salão-Parceiro -->
        <div class="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-5">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                <CreditCard class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Taxas da Maquininha de Cartão (Adquirência)</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Configure as taxas cobradas pela sua operadora (Stone, PagBank, InfinitePay, etc.)</p>
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
                Descontar taxa da maquininha da quota-parte dos profissionais?
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

          <!-- Simulador Didático Visual -->
          <div class="p-4 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-2 text-xs">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Simulação Prática (Exemplo: Corte de R$ 60,00 no Crédito 1x)</span>
            <div class="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div class="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
                <span class="text-[10px] text-slate-400 block">Taxa Maquininha ({{ form.paymentFees.creditFeePercent }}%)</span>
                <span class="font-bold text-rose-500">- R$ {{ ((60 * form.paymentFees.creditFeePercent) / 100).toFixed(2) }}</span>
              </div>
              <div class="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
                <span class="text-[10px] text-slate-400 block">Barbeiro (50% {{ form.paymentFees.deductFeeFromSplit ? 'Líquido' : 'Bruto' }})</span>
                <span class="font-bold text-amber-500">
                  R$ {{ form.paymentFees.deductFeeFromSplit ? (((60 - ((60 * form.paymentFees.creditFeePercent) / 100)) * 0.5)).toFixed(2) : '30.00' }}
                </span>
              </div>
              <div class="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
                <span class="text-[10px] text-slate-400 block">Barbearia Retém</span>
                <span class="font-bold text-emerald-500">
                  R$ {{ form.paymentFees.deductFeeFromSplit ? (((60 - ((60 * form.paymentFees.creditFeePercent) / 100)) * 0.5)).toFixed(2) : (30 - ((60 * form.paymentFees.creditFeePercent) / 100)).toFixed(2) }}
                </span>
              </div>
            </div>
            <p v-if="!form.paymentFees.deductFeeFromSplit" class="text-[10px] text-rose-500 font-bold">
              Atenção: Com a opção desativada, a barbearia paga R$ {{ ((60 * form.paymentFees.creditFeePercent) / 100).toFixed(2) }} da taxa bancária sozinha!
            </p>
          </div>
        </div>

        <!-- Incentivo Pagamento Online Anti No-Show -->
        <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-bold text-slate-900 dark:text-white block">Incentivo de Pagamento Online Antecipado</span>
              <p class="text-xs text-slate-500 dark:text-slate-400">Oferece um desconto inteligente para o cliente pagar no Pix na hora de agendar, zerando o no-show.</p>
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

        <!-- Tolerância de Atraso -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-slate-900 dark:text-white block">Tolerância Máxima de Atraso</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">Tempo limite de espera antes que o horário seja liberado na agenda.</span>
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
      </div>
    </div>

    <!-- TAB 5: IDENTIDADE VISUAL & TEMA -->
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

  </div>
</template>
