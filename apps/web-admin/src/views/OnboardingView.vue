<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Scissors, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Users, 
  Sparkles, 
  Copy, 
  Smartphone, 
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Zap,
  Award,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import BarblyClubLogo from '../components/BarblyClubLogo.vue';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const currentStep = ref(1);

// Web Audio API pop sound for micro-interactions
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// ==========================================
// STEP 1: SERVIÇOS, PREÇOS E DURAÇÃO
// ==========================================
interface ServiceItem {
  id?: string;
  name: string;
  price: number;
  durationMinutes: number;
}

const services = ref<ServiceItem[]>([
  { name: 'Corte Tradicional / Fade Degradê', price: 45, durationMinutes: 35 },
  { name: 'Barba Terapia Completa com Toalha Quente', price: 35, durationMinutes: 30 },
  { name: 'Combo Completo Cabelo + Barba', price: 70, durationMinutes: 50 },
  { name: 'Sobrancelha na Navalha', price: 15, durationMinutes: 10 },
]);

const durationPresets = [15, 30, 35, 45, 50, 60];

const newServiceName = ref('');
const newServicePrice = ref<number | null>(null);
const newServiceDuration = ref<number>(30);
const savingServices = ref(false);

async function loadServicesFromApi() {
  if (!authStore.token) return;
  try {
    const res = await fetch('/api/services', {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        services.value = data;
      }
    }
  } catch (e) {
    console.warn('Could not load services from API:', e);
  }
}

function addService() {
  if (!newServiceName.value.trim()) {
    toast.show({
      title: 'Atenção',
      message: 'Informe o nome do serviço para adicionar.',
      type: 'warning',
    });
    return;
  }

  playPopSound();
  services.value.push({
    name: newServiceName.value.trim(),
    price: Number(newServicePrice.value) || 35,
    durationMinutes: Number(newServiceDuration.value) || 30,
  });

  newServiceName.value = '';
  newServicePrice.value = null;
  newServiceDuration.value = 30;

  toast.show({
    title: 'Serviço Adicionado!',
    message: 'Serviço incluído na tabela.',
    type: 'success',
  });
}

function removeService(index: number) {
  playPopSound();
  services.value.splice(index, 1);
}

async function saveStep1AndAdvance() {
  if (services.value.length === 0) {
    toast.show({
      title: 'Tabela Vazia',
      message: 'Cadastre ao menos um serviço para continuar.',
      type: 'warning',
    });
    return;
  }

  playPopSound();
  savingServices.value = true;
  try {
    if (authStore.token) {
      await fetch('/api/services/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ services: services.value }),
      });
    }
  } catch (e) {
    console.warn('Services sync failed, continuing offline:', e);
  } finally {
    savingServices.value = false;
    currentStep.value = 2;
  }
}

// Summary computed stats for services
const totalServices = computed(() => services.value.length);
const avgPrice = computed(() => {
  if (!services.value.length) return 0;
  const sum = services.value.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  return Math.round(sum / services.value.length);
});
const avgDuration = computed(() => {
  if (!services.value.length) return 0;
  const sum = services.value.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
  return Math.round(sum / services.value.length);
});

// ==========================================
// STEP 2: EQUIPE, CADEIRAS & COMISSÃO (SALÃO-PARCEIRO)
// ==========================================
interface BarberItem {
  name: string;
  chair: string;
  commissionRate: number;
  role: string;
}

const barbers = ref<BarberItem[]>([
  { 
    name: authStore.user?.name || authStore.organization?.ownerName || 'Maycon Curty', 
    chair: 'Cadeira Principal (Cadeira 1)', 
    commissionRate: 100,
    role: 'Proprietário & Especialista'
  },
]);

const newBarberName = ref('');
const newBarberChair = ref('');
const newBarberCommission = ref<number>(50);

function addBarber() {
  if (!newBarberName.value.trim()) {
    toast.show({
      title: 'Atenção',
      message: 'Informe o nome do barbeiro para adicionar.',
      type: 'warning',
    });
    return;
  }

  playPopSound();
  barbers.value.push({
    name: newBarberName.value.trim(),
    chair: newBarberChair.value.trim() || `Cadeira ${barbers.value.length + 1}`,
    commissionRate: Number(newBarberCommission.value) || 50,
    role: 'Barbeiro Parceiro',
  });

  newBarberName.value = '';
  newBarberChair.value = '';
  newBarberCommission.value = 50;

  toast.show({
    title: 'Barbeiro Adicionado!',
    message: 'Novo profissional cadastrado com comissão configurada.',
    type: 'success',
  });
}

function removeBarber(idx: number) {
  if (barbers.value.length === 1) {
    toast.show({
      title: 'Mínimo de 1 Profissional',
      message: 'Você precisa manter ao menos um profissional cadastrado.',
      type: 'warning',
    });
    return;
  }
  playPopSound();
  barbers.value.splice(idx, 1);
}

// ==========================================
// STEP 3: LINK DO INSTAGRAM & ATIVAÇÃO
// ==========================================
const copied = ref(false);
const clientSlug = computed(() => authStore.organization?.slug || 'curtybarber-5azk');
const clientUrl = computed(() => `https://barblyclub.com.br/cliente/${clientSlug.value}`);

function copyClientLink() {
  playPopSound();
  navigator.clipboard.writeText(clientUrl.value);
  copied.value = true;
  toast.show({
    title: 'Link Copiado!',
    message: 'Cole este link na biografia do Instagram da sua barbearia para receber agendamentos.',
    type: 'success',
  });
  setTimeout(() => (copied.value = false), 3500);
}

const completing = ref(false);

async function finishOnboarding() {
  playPopSound();
  completing.value = true;
  try {
    await authStore.completeOnboarding();
    toast.show({
      title: '🚀 Barbearia Ativada com Sucesso!',
      message: 'Seu ambiente BarblyClub está configurado. Bem-vindo ao painel!',
      type: 'success',
      duration: 6000,
    });
    router.push('/');
  } catch (err: any) {
    console.error(err);
    router.push('/');
  } finally {
    completing.value = false;
  }
}

onMounted(() => {
  loadServicesFromApi();
});
</script>

<template>
  <div class="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans antialiased relative overflow-x-hidden selection:bg-amber-500 selection:text-black">
    
    <!-- Background Luxury Glows -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-[140px] pointer-events-none rounded-full"></div>
    <div class="fixed bottom-0 right-0 w-80 h-80 bg-amber-500/5 blur-[120px] pointer-events-none rounded-full"></div>

    <!-- TOP HEADER -->
    <header class="h-20 border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between relative z-20 backdrop-blur-xl bg-[#07090e]/85">
      <!-- Logo & Organization Name -->
      <div class="flex items-center gap-4">
        <BarblyClubLogo size="md" :showBadge="false" />
        <div class="h-6 w-px bg-white/10 hidden sm:block"></div>
        <div class="hidden sm:block">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white block">
              {{ authStore.organization?.name || 'Sua Barbearia' }}
            </span>
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 tracking-wider">
              🎁 30 Dias Grátis
            </span>
          </div>
          <span class="text-[10px] text-slate-400 block font-mono">
            barblyclub.com.br/cliente/{{ clientSlug }}
          </span>
        </div>
      </div>

      <!-- Step Counter & Luxury Progress Tracker -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <span class="text-xs font-bold text-amber-400 block">
            Etapa {{ currentStep }} de 3
          </span>
          <span class="text-[10px] text-slate-400">
            {{ currentStep === 1 ? 'Tabela de Serviços' : currentStep === 2 ? 'Equipe & Comissões' : 'Link & Ativação' }}
          </span>
        </div>
        <div class="flex gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-full">
          <div 
            class="h-2 rounded-full transition-all duration-500 cursor-pointer"
            :class="currentStep >= 1 ? 'w-7 bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm shadow-amber-500/30' : 'w-2 bg-white/10'"
            @click="currentStep = 1"
          ></div>
          <div 
            class="h-2 rounded-full transition-all duration-500 cursor-pointer"
            :class="currentStep >= 2 ? 'w-7 bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm shadow-amber-500/30' : 'w-2 bg-white/10'"
            @click="services.length ? currentStep = 2 : null"
          ></div>
          <div 
            class="h-2 rounded-full transition-all duration-500 cursor-pointer"
            :class="currentStep >= 3 ? 'w-7 bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm shadow-amber-500/30' : 'w-2 bg-white/10'"
            @click="services.length ? currentStep = 3 : null"
          ></div>
        </div>
      </div>
    </header>

    <!-- STEPPER PILL BAR -->
    <div class="py-4 border-b border-white/[0.04] bg-[#0a0e17]/60 backdrop-blur-md relative z-10 px-4">
      <div class="max-w-4xl mx-auto flex items-center justify-between text-xs">
        
        <!-- Step 1 Button -->
        <button 
          @click="currentStep = 1"
          class="flex items-center gap-2.5 transition text-left cursor-pointer group"
          :class="currentStep === 1 ? 'text-amber-400 font-bold' : currentStep > 1 ? 'text-emerald-400' : 'text-slate-500'"
        >
          <div 
            class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all"
            :class="currentStep === 1 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : currentStep > 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500 border border-white/5'"
          >
            <Check v-if="currentStep > 1" class="w-3.5 h-3.5" />
            <span v-else>1</span>
          </div>
          <div class="hidden sm:block">
            <span class="block leading-tight font-black uppercase text-[10px] tracking-wider">Passo 1</span>
            <span class="text-xs">Serviços &amp; Preços</span>
          </div>
        </button>

        <div class="w-8 sm:w-16 h-px bg-white/10"></div>

        <!-- Step 2 Button -->
        <button 
          @click="services.length ? currentStep = 2 : null"
          class="flex items-center gap-2.5 transition text-left cursor-pointer group"
          :class="currentStep === 2 ? 'text-amber-400 font-bold' : currentStep > 2 ? 'text-emerald-400' : 'text-slate-500'"
        >
          <div 
            class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all"
            :class="currentStep === 2 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : currentStep > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500 border border-white/5'"
          >
            <Check v-if="currentStep > 2" class="w-3.5 h-3.5" />
            <span v-else>2</span>
          </div>
          <div class="hidden sm:block">
            <span class="block leading-tight font-black uppercase text-[10px] tracking-wider">Passo 2</span>
            <span class="text-xs">Equipe &amp; Comissões</span>
          </div>
        </button>

        <div class="w-8 sm:w-16 h-px bg-white/10"></div>

        <!-- Step 3 Button -->
        <button 
          @click="services.length ? currentStep = 3 : null"
          class="flex items-center gap-2.5 transition text-left cursor-pointer group"
          :class="currentStep === 3 ? 'text-amber-400 font-bold' : 'text-slate-500'"
        >
          <div 
            class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all"
            :class="currentStep === 3 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'bg-white/5 text-slate-500 border border-white/5'"
          >
            <span>3</span>
          </div>
          <div class="hidden sm:block">
            <span class="block leading-tight font-black uppercase text-[10px] tracking-wider">Passo 3</span>
            <span class="text-xs">Link da Bio &amp; Ativação</span>
          </div>
        </button>

      </div>
    </div>

    <!-- MAIN WIZARD CONTAINER -->
    <main class="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
      <div class="w-full max-w-3xl bg-[#0e131d]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-2xl">
        
        <!-- ============================================== -->
        <!-- STEP 1: SERVIÇOS, PREÇOS E DURAÇÃO             -->
        <!-- ============================================== -->
        <div v-if="currentStep === 1" class="space-y-6">
          
          <!-- Header of Step 1 -->
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Scissors class="w-3.5 h-3.5" />
              <span>Cardápio de Atendimento da Barbearia</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Defina os Serviços, Preços e a Duração
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">
              A IA do WhatsApp e o link do Instagram usam essas informações para agendar clientes e calcular o tempo de cadeira de cada barbeiro.
            </p>
          </div>

          <!-- Quick Stats Pill Bar -->
          <div class="grid grid-cols-3 gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <div>
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Serviços Ativos</span>
              <span class="text-lg font-black text-amber-400">{{ totalServices }}</span>
            </div>
            <div class="border-x border-white/5">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Preço Médio</span>
              <span class="text-lg font-black text-emerald-400">R$ {{ avgPrice }},00</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tempo Médio</span>
              <span class="text-lg font-black text-white">{{ avgDuration }} min</span>
            </div>
          </div>

          <!-- Existing Services List (SCROLLBAR HIDDEN AS REQUESTED) -->
          <div class="space-y-2.5 max-h-80 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
            <div 
              v-for="(service, index) in services" 
              :key="index"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#141926]/90 border border-white/[0.08] hover:border-amber-500/40 transition-all gap-3 group"
            >
              <!-- Name & Duration Display/Inputs -->
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <input 
                    v-model="service.name"
                    type="text"
                    class="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-amber-400 w-full"
                    placeholder="Nome do serviço"
                  />
                </div>
                <div class="flex items-center gap-3 text-xs text-slate-400 pl-4">
                  <span class="flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5 text-amber-400" />
                    Duração:
                  </span>
                  <!-- Inline Duration Selector -->
                  <div class="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                    <input 
                      v-model.number="service.durationMinutes"
                      type="number" 
                      min="5" 
                      max="180" 
                      step="5"
                      class="w-10 bg-transparent text-xs font-bold text-slate-200 text-center focus:outline-none"
                    />
                    <span class="text-[10px] text-slate-400">min</span>
                  </div>
                </div>
              </div>

              <!-- Price & Actions -->
              <div class="flex items-center justify-between sm:justify-end gap-3 pl-4 sm:pl-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                <!-- Price Box -->
                <div class="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl">
                  <span class="text-xs font-black text-amber-400">R$</span>
                  <input 
                    v-model.number="service.price" 
                    type="number" 
                    min="0"
                    step="5"
                    class="w-16 bg-transparent text-sm font-black text-amber-300 focus:outline-none text-right"
                  />
                </div>

                <!-- Remove Service -->
                <button 
                  @click="removeService(index)" 
                  title="Remover este serviço"
                  class="p-2 rounded-xl bg-white/[0.03] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add New Service Quick Card -->
          <div class="p-4 sm:p-5 rounded-2xl bg-black/30 border border-dashed border-white/15 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus class="w-3.5 h-3.5" /> Adicionar Novo Serviço
              </span>
              <span class="text-[10px] text-slate-500">Nome + Preço + Duração</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <!-- Name Input -->
              <div class="sm:col-span-5 relative">
                <input 
                  v-model="newServiceName"
                  type="text" 
                  placeholder="Nome (Ex: Platinado / Nevou)"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  @keyup.enter="addService"
                />
              </div>

              <!-- Price Input -->
              <div class="sm:col-span-3 relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">R$</span>
                <input 
                  v-model.number="newServicePrice"
                  type="number" 
                  min="0"
                  placeholder="Valor (R$)"
                  class="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  @keyup.enter="addService"
                />
              </div>

              <!-- Duration Input -->
              <div class="sm:col-span-2 relative">
                <input 
                  v-model.number="newServiceDuration"
                  type="number" 
                  min="5" 
                  step="5"
                  placeholder="30"
                  class="w-full px-2.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-center transition"
                  @keyup.enter="addService"
                />
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">min</span>
              </div>

              <!-- Add Button -->
              <button 
                @click="addService"
                type="button"
                class="sm:col-span-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus class="w-4 h-4" /> Adicionar
              </button>
            </div>

            <!-- Quick Duration Chips -->
            <div class="flex items-center gap-2 pt-1 flex-wrap">
              <span class="text-[10px] text-slate-500 font-bold">Atalhos de Duração:</span>
              <button 
                v-for="preset in durationPresets" 
                :key="preset"
                @click="newServiceDuration = preset; playPopSound()"
                type="button"
                class="px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                :class="newServiceDuration === preset ? 'bg-amber-500 text-black shadow-sm' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'"
              >
                {{ preset }} min
              </button>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span class="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-emerald-400" />
              Você poderá cadastrar mais serviços pelo painel a qualquer momento.
            </span>
            <button 
              @click="saveStep1AndAdvance"
              :disabled="savingServices"
              class="px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider shadow-xl shadow-amber-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="!savingServices">Avançar para Equipe &amp; Comissões</span>
              <span v-else>Salvando serviços no banco...</span>
              <ArrowRight v-if="!savingServices" class="w-4 h-4" />
            </button>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- STEP 2: EQUIPE, CADEIRAS & LEI DO SALÃO-PARCEIRO-->
        <!-- ============================================== -->
        <div v-else-if="currentStep === 2" class="space-y-6">
          
          <!-- Header of Step 2 -->
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Users class="w-3.5 h-3.5" />
              <span>Equipe &amp; Divisão de Ganhos</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cadastre sua Equipe e a Comissão de Cada Um
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">
              O BarblyClub faz a divisão de pagamentos de cada corte automaticamente, protegendo seu negócio dentro da Lei do Salão-Parceiro.
            </p>
          </div>

          <!-- Legal Badge Notice -->
          <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
            <ShieldCheck class="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong class="font-bold text-white block">Em conformidade com a Lei nº 13.352/2016 (Salão-Parceiro):</strong>
              <span>O dinheiro entra direto no Asaas com split: a barbearia retém a cota-parte do salão e o barbeiro recebe a cota-parte dele sem risco de bitributação.</span>
            </div>
          </div>

          <!-- Barbers Team List (SCROLLBAR HIDDEN) -->
          <div class="space-y-2.5 max-h-72 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
            <div 
              v-for="(barber, idx) in barbers" 
              :key="idx"
              class="flex items-center justify-between p-4 rounded-2xl bg-[#141926]/90 border border-white/[0.08] hover:border-amber-500/40 transition-all"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-black text-sm shadow">
                  {{ barber.name.charAt(0) }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white block">{{ barber.name }}</span>
                    <span 
                      v-if="idx === 0" 
                      class="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300"
                    >
                      Dono / Responsável
                    </span>
                  </div>
                  <span class="text-xs text-slate-400">{{ barber.chair }} • {{ barber.role }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <!-- Commission Rate -->
                <div class="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
                  <Percent class="w-3.5 h-3.5 text-emerald-400" />
                  <span class="text-xs font-bold text-slate-300">Comissão:</span>
                  <input 
                    v-model.number="barber.commissionRate" 
                    type="number" 
                    min="0" 
                    max="100"
                    class="w-10 bg-transparent text-xs font-black text-emerald-300 text-right focus:outline-none"
                  />
                  <span class="text-xs font-bold text-emerald-400">%</span>
                </div>

                <button 
                  v-if="idx > 0"
                  @click="removeBarber(idx)"
                  class="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Remover barbeiro"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add Another Barber Form -->
          <div class="p-4 sm:p-5 rounded-2xl bg-black/30 border border-dashed border-white/15 space-y-3">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              + Adicionar Barbeiro Parceiro na Equipe
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input 
                v-model="newBarberName"
                type="text" 
                placeholder="Nome do Barbeiro (Ex: Rafael Fade)"
                class="sm:col-span-5 px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                @keyup.enter="addBarber"
              />
              <input 
                v-model="newBarberChair"
                type="text" 
                placeholder="Cadeira (Ex: Cadeira 2)"
                class="sm:col-span-4 px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                @keyup.enter="addBarber"
              />
              <div class="sm:col-span-3 flex gap-2">
                <div class="relative flex-1">
                  <input 
                    v-model.number="newBarberCommission"
                    type="number" 
                    min="0" 
                    max="100" 
                    placeholder="50"
                    class="w-full px-3 py-2.5 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 pr-7 text-center transition"
                  />
                  <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">%</span>
                </div>
                <button 
                  @click="addBarber"
                  type="button"
                  class="px-4 py-2.5 rounded-xl bg-amber-500 hover:opacity-95 text-black text-xs font-black uppercase tracking-wider transition flex items-center justify-center cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Navigation -->
          <div class="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button 
              @click="currentStep = 1; playPopSound()"
              class="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft class="w-4 h-4" /> Voltar para Serviços
            </button>
            <button 
              @click="currentStep = 3; playPopSound()"
              class="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider shadow-xl shadow-amber-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Avançar para Link &amp; Ativação</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- STEP 3: LINK DO INSTAGRAM & ATIVAÇÃO VIP       -->
        <!-- ============================================== -->
        <div v-else-if="currentStep === 3" class="space-y-6">
          
          <!-- Header of Step 3 -->
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CalendarCheck class="w-3.5 h-3.5" />
              <span>Ambiente Liberado • 30 Dias Grátis Ativos</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tudo Pronto! Sua Barbearia Já Está Pronta para Faturar
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">
              Copie o link abaixo para colocar na bio do Instagram da sua barbearia e compartilhe no WhatsApp dos seus clientes.
            </p>
          </div>

          <!-- Public Link Showcase Card -->
          <div class="p-6 rounded-3xl bg-gradient-to-b from-amber-500/15 via-[#141926] to-[#0a0e17] border-2 border-amber-500/30 space-y-4 shadow-xl">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-amber-400" /> Link Público da Sua Barbearia
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% ONLINE
              </span>
            </div>

            <!-- Copy URL Bar -->
            <div class="flex items-center gap-2 bg-black/60 p-2.5 rounded-2xl border border-white/10">
              <span class="text-xs sm:text-sm font-mono text-amber-200 truncate flex-1 pl-2">
                {{ clientUrl }}
              </span>
              <button 
                @click="copyClientLink"
                class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer"
              >
                <Check v-if="copied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ copied ? 'Copiado!' : 'Copiar Link' }}</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Funciona direto no celular sem instalar nada</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Recebimento Pix antecipado anti no-show</span>
              </div>
            </div>
          </div>

          <!-- WhatsApp AI Status Info Box -->
          <div class="p-4 rounded-2xl bg-[#141926]/80 border border-white/[0.08] flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Smartphone class="w-6 h-6" />
            </div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white block">Conexão WhatsApp BarblyClub (QR Code)</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p class="text-xs text-slate-400">
                Você pode escanear o QR Code da sua barbearia pelo celular dentro do painel a qualquer momento para ativar a secretária de IA.
              </p>
            </div>
          </div>

          <!-- Bottom Navigation & Dashboard Entry -->
          <div class="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button 
              @click="currentStep = 2; playPopSound()"
              class="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft class="w-4 h-4" /> Voltar
            </button>
            <button 
              @click="finishOnboarding"
              :disabled="completing"
              class="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider shadow-2xl shadow-emerald-500/30 transition flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <CheckCircle2 class="w-5 h-5 text-black" />
              <span v-if="!completing">🚀 Concluir Configuração e Entrar no Painel</span>
              <span v-else>Entrando no seu painel VIP...</span>
            </button>
          </div>

        </div>

      </div>
    </main>
  </div>
</template>
