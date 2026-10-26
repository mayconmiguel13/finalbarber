<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Building2, 
  ChevronDown, 
  Scissors, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Plus, 
  Bell, 
  Star,
  Loader2,
  RefreshCw,
  Beer,
  ShoppingBag,
  Users,
  Crown,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  User,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Flame,
  Award,
  CircleDot,
  CreditCard,
  Banknote,
  QrCode,
  SlidersHorizontal,
  ChevronRight,
  Smartphone,
  Phone
} from 'lucide-vue-next';
import { api, type DashboardMetrics, type AppointmentItem, type Product, type Barber, type Customer } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

defineEmits<{
  (e: 'open-modal'): void;
}>();

// ================= ESTADO GERAL =================
const loading = ref(true);
const refreshing = ref(false);
const metrics = ref<DashboardMetrics | null>(null);
const appointments = ref<AppointmentItem[]>([]);
const error = ref<string | null>(null);

// Modal de Venda Expressa (Frigobar / Balcão)
const isQuickSaleModalOpen = ref(false);
const quickSaleLoading = ref(false);
const productsList = ref<Product[]>([]);
const barbersList = ref<Barber[]>([]);
const customersList = ref<Customer[]>([]);

// Carrinho da Venda Expressa
const selectedBarberId = ref('');
const selectedCustomerId = ref('');
const selectedPaymentMethod = ref('PIX');
const cart = ref<Record<string, { product: Product; quantity: number }>>({});

function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function formatCurrency(val: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatOrigin(origin?: string): { label: string; icon: string } {
  switch (origin) {
    case 'WHATSAPP_AI':
      return { label: 'WhatsApp IA', icon: '🤖' };
    case 'PWA_WEB':
      return { label: 'Online Web', icon: '🌐' };
    case 'COUNTER_WALKIN':
      return { label: 'Balcão', icon: '💈' };
    default:
      return { label: 'Balcão', icon: '💈' };
  }
}

// Carregar Dados da API
async function loadData(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true;
    playPopSound();
  } else {
    loading.value = true;
  }
  error.value = null;

  try {
    const [metricsData, appointmentsData] = await Promise.all([
      api.getDashboardMetrics(),
      api.getTodayAppointments(),
    ]);
    metrics.value = metricsData;
    appointments.value = appointmentsData;

    // Também pré-carrega produtos se vazio para o Frigobar Express
    if (productsList.value.length === 0) {
      api.getProducts().then((p) => productsList.value = p || []).catch(() => {});
      api.getBarbers().then((b) => barbersList.value = b || []).catch(() => {});
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao carregar cockpit operacional';
    toast.error('Falha ao sincronizar dados do dashboard');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

// Abrir Modal de Venda Expressa
async function openQuickSaleModal(preSelectedProduct?: Product) {
  playPopSound();
  isQuickSaleModalOpen.value = true;
  cart.value = {};
  selectedBarberId.value = '';
  selectedCustomerId.value = '';
  selectedPaymentMethod.value = 'PIX';

  if (productsList.value.length === 0) {
    quickSaleLoading.value = true;
    try {
      const [prods, barbs, custs] = await Promise.all([
        api.getProducts(),
        api.getBarbers(),
        api.getCustomers(),
      ]);
      productsList.value = prods || [];
      barbersList.value = barbs || [];
      customersList.value = custs || [];
      if (barbersList.value.length > 0) {
        selectedBarberId.value = barbersList.value[0].id;
      }
    } catch (err) {
      toast.error('Erro ao carregar catálogo de produtos');
    } finally {
      quickSaleLoading.value = false;
    }
  } else if (barbersList.value.length > 0 && !selectedBarberId.value) {
    selectedBarberId.value = barbersList.value[0].id;
  }

  if (preSelectedProduct) {
    addToCart(preSelectedProduct);
  }
}

// Venda Rápida de 1 Toque Direto no Dashboard (1 click sell)
async function quickSell1Touch(product: Product) {
  playPopSound();
  try {
    let barberId = barbersList.value[0]?.id || undefined;
    await api.sellProduct({
      productId: product.id,
      barberId,
      quantity: 1,
      paymentMethod: 'PIX',
    });
    playSuccessSound();
    toast.success(`1x ${product.name} registrado (+ ${formatCurrency(product.salePrice)})`, 'Venda Confirmada');
    await loadData(true);
  } catch (err: any) {
    toast.error(err.message || 'Erro ao registrar venda expressa');
  }
}

// Manipulação do Carrinho Rápido
function addToCart(product: Product) {
  playPopSound();
  if (cart.value[product.id]) {
    cart.value[product.id].quantity += 1;
  } else {
    cart.value[product.id] = { product, quantity: 1 };
  }
}

function removeFromCart(productId: string) {
  playPopSound();
  if (!cart.value[productId]) return;
  if (cart.value[productId].quantity > 1) {
    cart.value[productId].quantity -= 1;
  } else {
    delete cart.value[productId];
  }
}

const cartTotal = computed(() => {
  return Object.values(cart.value).reduce((acc, item) => {
    return acc + Number(item.product.salePrice) * item.quantity;
  }, 0);
});

const cartCount = computed(() => {
  return Object.values(cart.value).reduce((acc, item) => acc + item.quantity, 0);
});

async function handleConfirmQuickSale() {
  const items = Object.values(cart.value);
  if (items.length === 0) {
    toast.error('Adicione ao menos um item na comanda');
    return;
  }

  quickSaleLoading.value = true;
  try {
    for (const item of items) {
      await api.sellProduct({
        productId: item.product.id,
        barberId: selectedBarberId.value || undefined,
        customerId: selectedCustomerId.value || undefined,
        quantity: item.quantity,
        paymentMethod: selectedPaymentMethod.value,
      });
    }

    playSuccessSound();
    toast.success('Comanda de balcão concluída com sucesso!', 'Venda Registrada');
    isQuickSaleModalOpen.value = false;
    await loadData(true);
  } catch (err: any) {
    toast.error(err.message || 'Erro ao processar venda expressa');
  } finally {
    quickSaleLoading.value = false;
  }
}

function goToAppointments(newAppointment = false) {
  playPopSound();
  if (newAppointment) {
    router.push({ path: '/appointments', query: { new: 'true' } });
  } else {
    router.push('/appointments');
  }
}

function goToClients(riskFilter = false) {
  playPopSound();
  if (riskFilter) {
    router.push({ path: '/clients', query: { filter: 'RISK' } });
  } else {
    router.push('/clients');
  }
}

function getWhatsAppUrl(phone: string, clientName: string) {
  let clean = phone.replace(/\D/g, '');
  if (clean.length <= 11) clean = '55' + clean;
  const msg = `Olá ${clientName.split(' ')[0]}! Tudo bem? Estamos prontos para te receber aqui no BarblyClub! 💈✂️`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

// Quick items for Frigobar Express panel
const quickFrigobarProducts = computed(() => {
  if (productsList.value.length === 0) return [];
  // prioritize drinks or first 4
  const drinks = productsList.value.filter(p => p.category?.toLowerCase().includes('bebida') || p.category?.toLowerCase().includes('frigobar'));
  return drinks.length >= 4 ? drinks.slice(0, 4) : productsList.value.slice(0, 4);
});

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">

    <!-- ============================================== -->
    <!-- TOP HEADER: CONTROL ROOM & INSTANT ACTIONS    -->
    <!-- ============================================== -->
    <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
            <Building2 class="w-3.5 h-3.5 text-amber-500" />
            <span>{{ authStore.organization?.name || 'Atelier 88 Barber Lounge' }}</span>
          </span>

          <span class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>COCKPIT AO VIVO</span>
          </span>

          <span class="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:inline-flex items-center gap-1">
            <ShieldCheck class="w-3 h-3 text-amber-500" />
            <span>LEI 13.352 SALÃO-PARCEIRO</span>
          </span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Sala de Controle &amp; Cockpit Operacional
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Faturamento unificado em tempo real, monitoramento ativo de cadeiras, comissões de parceiros e PDV de balcão.
        </p>
      </div>

      <!-- Ações Rápidas de 1 Toque -->
      <div class="flex items-center gap-2.5 flex-wrap shrink-0">
        <!-- Venda Expressa Frigobar -->
        <button 
          @click="openQuickSaleModal()"
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-95"
          title="Lançamento rápido de cervejas, bebidas e produtos no balcão"
        >
          <Beer class="w-4 h-4 text-emerald-500" />
          <span>+ Venda Frigobar</span>
        </button>

        <!-- Novo Agendamento -->
        <button 
          @click="goToAppointments(true)"
          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
        >
          <Scissors class="w-4 h-4 stroke-[3]" />
          <span>+ Novo Agendamento</span>
        </button>

        <!-- Sincronizar -->
        <button 
          @click="loadData(true)" 
          :disabled="refreshing"
          class="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs"
          title="Sincronizar métricas agora"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': refreshing }" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !metrics" class="flex flex-col items-center justify-center py-24 space-y-3">
      <Loader2 class="w-9 h-9 animate-spin text-amber-500" />
      <span class="text-xs text-slate-400 font-medium">Carregando telemetria operacional da barbearia...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-between">
      <span>{{ error }}</span>
      <button @click="loadData()" class="px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer">Tentar Novamente</button>
    </div>

    <!-- MAIN COCKPIT VIEW -->
    <template v-else-if="metrics">
      
      <!-- ============================================== -->
      <!-- 5 LUXURY METRIC CARDS (REAL-TIME AGGREGATION) -->
      <!-- ============================================== -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        <!-- Card 1: Faturamento de Hoje (Serviços + Frigobar) -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition hover:shadow-md relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <DollarSign class="w-3.5 h-3.5 text-amber-500" /> Faturado Hoje
              </span>
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Ao Vivo
              </span>
            </div>
            <div class="mt-2.5">
              <span class="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white block tracking-tight">
                {{ formatCurrency(metrics.today?.totalRevenue || 0) }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono-num text-slate-600 dark:text-slate-400">
            <span>✂️ Cortes: {{ formatCurrency(metrics.today?.servicesRevenue || 0) }}</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">🍺 Frigobar: {{ formatCurrency(metrics.today?.productsRevenue || 0) }}</span>
          </div>
        </div>

        <!-- Card 2: Split Salão-Parceiro (Lei 13.352) -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition hover:border-emerald-500/40">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" /> Repasse Equipe
              </span>
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Lei 13.352
              </span>
            </div>
            <div class="mt-2.5">
              <span class="text-2xl sm:text-3xl font-black font-mono-num text-emerald-600 dark:text-emerald-400 block tracking-tight">
                {{ formatCurrency(metrics.today?.barberShare || 0) }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Lucro Casa: <strong class="text-slate-900 dark:text-white font-mono-num">{{ formatCurrency(metrics.today?.salonNetShare || 0) }}</strong></span>
            <span class="text-emerald-500 font-semibold">Sem Bitributação</span>
          </div>
        </div>

        <!-- Card 3: Agendamentos de Hoje -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition hover:border-sky-500/40">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-sky-500" /> Atendimentos
              </span>
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {{ metrics.today?.onlinePixPercentage || 75 }}% Online
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white">
                {{ metrics.today?.totalAppointments || 0 }}
              </span>
              <span class="text-xs text-slate-400 font-medium">cortes hoje</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ metrics.today?.completedAppointments || 0 }} Concluídos</span>
            <span>{{ metrics.today?.confirmedAppointments || 0 }} Agendados</span>
          </div>
        </div>

        <!-- Card 4: Ticket Médio do Dia -->
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition hover:border-purple-500/40">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp class="w-3.5 h-3.5 text-purple-500" /> Ticket Médio
              </span>
              <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Por Cliente
              </span>
            </div>
            <div class="mt-2.5">
              <span class="text-xl sm:text-2xl font-black font-mono-num text-slate-900 dark:text-white block tracking-tight">
                {{ formatCurrency(metrics.today?.averageTicket || 0) }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Corte + Comanda Frigobar
          </div>
        </div>

        <!-- Card 5: Base de Clientes VIPs & Ativos -->
        <div 
          @click="goToClients()"
          class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition hover:border-amber-500/50 cursor-pointer col-span-2 md:col-span-1 group"
        >
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Crown class="w-3.5 h-3.5 text-amber-500" /> Clientes VIPs
              </span>
              <span class="text-xs font-bold text-amber-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                CRM <ArrowUpRight class="w-3 h-3" />
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white">
                {{ metrics.activeClients?.total || 0 }}
              </span>
              <span class="text-xs text-amber-500 font-bold">{{ metrics.activeClients?.change }}</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Ficha 360º &amp; Reativação</span>
            <span class="text-amber-500 font-semibold">Abrir &rarr;</span>
          </div>
        </div>

      </div>

      <!-- ============================================================== -->
      <!-- SEÇÃO 2: OCUPAÇÃO DAS CADEIRAS & FRIGOBAR EXPRESS              -->
      <!-- ============================================================== -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Ocupação das Cadeiras da Barbearia
            </h2>
            <span class="text-xs text-slate-400 font-medium hidden sm:inline">• Status operacional em tempo real</span>
          </div>

          <button 
            @click="goToAppointments()"
            class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Agenda Completa</span>
            <ArrowUpRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- GRID ADAPTATIVO: Se tiver 1 cadeira, usa layout HERO + FRIGOBAR EXPRESS -->
        <div 
          class="grid grid-cols-1 gap-4"
          :class="(metrics.chairs?.length || 0) <= 1 ? 'lg:grid-cols-12' : (metrics.chairs?.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3')"
        >
          <!-- Cadeira(s) Operacionais -->
          <div 
            v-for="chair in (metrics.chairs || [])" 
            :key="chair.barberId"
            class="rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-xs"
            :class="[
              (metrics.chairs?.length || 0) <= 1 ? 'lg:col-span-7' : '',
              chair.status === 'OCCUPIED' 
                ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.08] border-amber-400/80 dark:border-amber-500/40 ring-1 ring-amber-400/30' 
                : 'bg-white dark:bg-[#0e131d]/90 border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
            ]"
          >
            <!-- Topo da Cadeira -->
            <div>
              <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5">
                <div class="flex items-center gap-3">
                  <div class="relative w-12 h-12 rounded-2xl overflow-hidden ring-2 bg-slate-200 dark:bg-black/50 shrink-0" :class="chair.status === 'OCCUPIED' ? 'ring-amber-500' : 'ring-slate-300 dark:ring-white/10'">
                    <img v-if="chair.avatarUrl" :src="chair.avatarUrl" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center font-black text-sm bg-amber-500 text-slate-950">
                      {{ chair.nickname.charAt(0) }}
                    </div>
                  </div>
                  <div>
                    <h3 class="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                      {{ chair.nickname }}
                    </h3>
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                      {{ chair.chair }} • {{ chair.commissionRate }}% comissão
                    </span>
                  </div>
                </div>

                <!-- Status Badge -->
                <span 
                  class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  :class="chair.status === 'OCCUPIED' 
                    ? 'bg-amber-500 text-slate-950 shadow-xs animate-pulse' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'"
                >
                  <CircleDot class="w-3 h-3" />
                  <span>{{ chair.status === 'OCCUPIED' ? 'Em Cadeira' : 'Disponível' }}</span>
                </span>
              </div>

              <!-- Meio: Se Ocupada (Detalhes do Corte em Andamento) -->
              <div v-if="chair.status === 'OCCUPIED' && chair.currentAppointment" class="mt-4 space-y-3">
                <div class="p-4 rounded-2xl bg-white dark:bg-black/40 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-black text-slate-900 dark:text-white text-sm">
                        {{ chair.currentAppointment.clientName }}
                      </span>
                      <span v-if="chair.currentAppointment.isVipMember" class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500 text-black">
                        VIP
                      </span>
                    </div>
                    <span class="font-mono-num font-black text-sm text-amber-600 dark:text-amber-400">
                      {{ formatCurrency(chair.currentAppointment.price) }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ chair.currentAppointment.serviceName }}</span>
                    <span class="font-mono-num">{{ formatPhone(chair.currentAppointment.clientPhone) }}</span>
                  </div>

                  <!-- Barra de Progresso com Contagem de Tempo -->
                  <div class="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px] font-mono-num">
                      <span class="text-slate-500 dark:text-slate-400">Decorrido: {{ chair.currentAppointment.elapsedMinutes }} min</span>
                      <span class="text-amber-600 dark:text-amber-400 font-bold">Resta: ~{{ chair.currentAppointment.remainingMinutes }} min</span>
                    </div>
                    <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div 
                        class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        :style="{ width: `${chair.currentAppointment.progressPercent}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Meio: Se Disponível (Próximo Agendamento) -->
              <div v-else class="mt-4 space-y-3">
                <div v-if="chair.nextAppointment" class="p-4 rounded-2xl bg-white dark:bg-black/30 border border-slate-200/90 dark:border-white/10 space-y-1.5">
                  <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Clock class="w-3.5 h-3.5 text-sky-500" />
                    <span>Próximo Atendimento às {{ chair.nextAppointment.time }}:</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {{ chair.nextAppointment.clientName }}
                    </span>
                    <span class="text-xs text-amber-500 font-medium">
                      {{ chair.nextAppointment.serviceName }}
                    </span>
                  </div>
                </div>

                <div v-else class="p-6 rounded-2xl bg-slate-50 dark:bg-black/20 border border-dashed border-slate-200 dark:border-white/10 text-center py-6">
                  <Scissors class="w-6 h-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-bold block">Cadeira Livre para Encaixe</span>
                  <span class="text-[11px] text-slate-400 block mt-0.5">Nenhum cliente em atendimento neste momento</span>
                </div>
              </div>
            </div>

            <!-- Rodapé da Cadeira: Ações Rápidas -->
            <div class="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2.5">
              <button 
                v-if="chair.status === 'OCCUPIED'"
                @click="goToAppointments()"
                class="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4 stroke-[3]" />
                <span>Finalizar &amp; Cobrar Comanda</span>
              </button>

              <button 
                v-else
                @click="goToAppointments(true)"
                class="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus class="w-4 h-4" />
                <span>Iniciar Encaixe de Balcão</span>
              </button>
            </div>
          </div>

          <!-- SE FOR 1 CADEIRA: FRIGOBAR EXPRESS AO LADO (Preenche os 5 cols restantes) -->
          <div 
            v-if="(metrics.chairs?.length || 0) <= 1"
            class="lg:col-span-5 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div class="flex items-center gap-2">
                  <Beer class="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Frigobar Express (Venda em 1 Toque)
                    </h3>
                    <span class="text-[11px] text-slate-400">Toque para adicionar à comanda</span>
                  </div>
                </div>

                <button 
                  @click="openQuickSaleModal()" 
                  class="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  Abrir PDV &rarr;
                </button>
              </div>

              <!-- 4 Itens mais pedidos com botão de 1 toque -->
              <div class="grid grid-cols-2 gap-2.5 mt-3">
                <div 
                  v-for="prod in quickFrigobarProducts" 
                  :key="prod.id"
                  class="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase block truncate">{{ prod.category }}</span>
                    <h4 class="font-bold text-slate-900 dark:text-white text-xs truncate mt-0.5">{{ prod.name }}</h4>
                  </div>

                  <div class="mt-2 flex items-center justify-between gap-1">
                    <span class="text-xs font-black font-mono-num text-emerald-600 dark:text-emerald-400">
                      {{ formatCurrency(prod.salePrice) }}
                    </span>
                    <button 
                      @click="quickSell1Touch(prod)"
                      class="px-2 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-xs"
                      title="Lançar 1 unidade no balcão"
                    >
                      + Vender
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rodapé Frigobar Express -->
            <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Pagamento no PIX / Cartão</span>
              <button @click="openQuickSaleModal()" class="font-bold text-emerald-500 hover:underline cursor-pointer">
                + Outros Produtos
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- SEÇÃO 3: PÓDIO DA EQUIPE & CRONOGRAMA DE HOJE                  -->
      <!-- ============================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

        <!-- Coluna Esquerda (5 cols): Ranking & Pódio da Equipe -->
        <div class="lg:col-span-5 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 mb-4">
              <div class="flex items-center gap-2">
                <Award class="w-5 h-5 text-amber-500" />
                <div>
                  <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Ranking da Equipe de Barbeiros
                  </h3>
                  <span class="text-[11px] text-slate-400">Desempenho acumulado no mês</span>
                </div>
              </div>
              <router-link to="/barbers" class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                Gerenciar
              </router-link>
            </div>

            <!-- Lista de Barbeiros -->
            <div class="space-y-3">
              <div 
                v-for="barber in (metrics.barbersRanking || [])" 
                :key="barber.barberId"
                class="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 transition flex items-center justify-between gap-3"
                :class="barber.rank === 1 ? 'ring-1 ring-amber-500/30 border-amber-500/40' : ''"
              >
                <!-- Posição e Foto -->
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="relative shrink-0">
                    <span 
                      class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm z-10"
                      :class="barber.rank === 1 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : barber.rank === 2 
                        ? 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white' 
                        : 'bg-amber-800 text-white'"
                    >
                      {{ barber.rank }}º
                    </span>
                    <div class="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-slate-200 dark:ring-white/10 bg-slate-200 dark:bg-black/40">
                      <img v-if="barber.avatarUrl" :src="barber.avatarUrl" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center font-bold text-xs bg-amber-500 text-slate-950">
                        {{ barber.nickname.charAt(0) }}
                      </div>
                    </div>
                  </div>

                  <div class="min-w-0">
                    <h4 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {{ barber.name }}
                    </h4>
                    <span class="text-[11px] text-slate-400 block truncate font-mono-num">
                      {{ barber.completedCount }} cortes • {{ barber.chair }}
                    </span>
                  </div>
                </div>

                <!-- Faturamento e Comissão -->
                <div class="text-right shrink-0">
                  <span class="text-xs sm:text-sm font-black font-mono-num text-slate-900 dark:text-white block">
                    {{ formatCurrency(barber.totalRevenue) }}
                  </span>
                  <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block font-mono-num">
                    +{{ formatCurrency(barber.barberCommissions) }} split
                  </span>
                </div>
              </div>

              <!-- Card de Meta / Adicionar Barbeiro se tiver poucos -->
              <div 
                v-if="(metrics.barbersRanking?.length || 0) <= 2"
                @click="router.push('/barbers')"
                class="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-amber-500/50 transition cursor-pointer text-center group"
              >
                <Users class="w-5 h-5 text-slate-400 group-hover:text-amber-500 mx-auto mb-1 transition-colors" />
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block">Expandir Equipe de Barbeiros</span>
                <span class="text-[11px] text-slate-400 block">Cadastre parceiros e defina a comissão da Lei 13.352</span>
              </div>
            </div>
          </div>

          <!-- Totalizador Equipe -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Comissões pagas conforme Lei 13.352</span>
            <span class="text-emerald-500 font-bold">100% Auditado</span>
          </div>
        </div>

        <!-- Coluna Direita (7 cols): Cronograma de Hoje em Tempo Real -->
        <div class="lg:col-span-7 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 mb-4">
              <div class="flex items-center gap-2">
                <Calendar class="w-5 h-5 text-amber-500" />
                <div>
                  <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Cronograma de Hoje
                  </h3>
                  <span class="text-[11px] text-slate-400">Atendimentos agendados, em cadeira e finalizados</span>
                </div>
              </div>
              <router-link to="/appointments" class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                Abrir Calendário
              </router-link>
            </div>

            <!-- Lista de Agendamentos -->
            <div class="space-y-2.5 max-h-96 overflow-y-auto no-scrollbar">
              <div 
                v-if="appointments.length === 0"
                class="py-12 text-center text-slate-400 text-xs italic"
              >
                Nenhum agendamento programado para hoje.
              </div>

              <div 
                v-for="apt in appointments" 
                :key="apt.id"
                class="p-3.5 rounded-2xl transition flex items-center justify-between gap-3"
                :class="apt.status === 'IN_PROGRESS' 
                  ? 'bg-amber-500/[0.06] dark:bg-amber-500/10 border border-amber-400 dark:border-amber-500/40 shadow-xs' 
                  : apt.status === 'COMPLETED'
                  ? 'bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 opacity-85'
                  : 'bg-white dark:bg-black/30 border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'"
              >
                <!-- Horário + Origem -->
                <div class="flex items-center gap-3 min-w-0">
                  <div class="text-center shrink-0 w-12 py-1.5 px-1.5 rounded-xl bg-slate-100 dark:bg-white/10 font-mono-num">
                    <span class="text-xs font-black text-slate-900 dark:text-white block">{{ apt.time }}</span>
                    <span class="text-[9px] text-slate-400 block">{{ formatOrigin(apt.origin).icon }}</span>
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                        {{ apt.clientName }}
                      </span>
                      <span class="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                        ({{ apt.serviceName }})
                      </span>
                    </div>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium mt-0.5">
                      {{ apt.barberName }} • {{ apt.chair }}
                    </span>
                  </div>
                </div>

                <!-- Preço e Status com Ação Rápida -->
                <div class="flex items-center gap-2.5 shrink-0">
                  <div class="text-right">
                    <span class="text-xs sm:text-sm font-black font-mono-num text-slate-900 dark:text-white block">
                      {{ formatCurrency(apt.finalPrice) }}
                    </span>
                    <span 
                      class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-block mt-0.5"
                      :class="apt.status === 'COMPLETED' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : apt.status === 'IN_PROGRESS' 
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs' 
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'"
                    >
                      {{ apt.status === 'COMPLETED' ? 'Concluído' : apt.status === 'IN_PROGRESS' ? 'Em Cadeira' : 'Confirmado' }}
                    </span>
                  </div>

                  <!-- Botão WhatsApp direto -->
                  <a 
                    v-if="apt.clientPhone"
                    :href="getWhatsAppUrl(apt.clientPhone, apt.clientName)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition cursor-pointer"
                    title="Chamar cliente no WhatsApp"
                  >
                    <MessageCircle class="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé do Cronograma -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sincronizado automaticamente com o WhatsApp</span>
            <button @click="goToAppointments(true)" class="text-xs font-bold text-amber-500 hover:underline cursor-pointer">
              + Adicionar Agendamento
            </button>
          </div>
        </div>

      </div>

      <!-- ============================================================== -->
      <!-- SEÇÃO 4: FRIGOBAR & ESTOQUE CRÍTICO + FEED AO VIVO             -->
      <!-- ============================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

        <!-- Frigobar & Estoque (6 cols) -->
        <div class="lg:col-span-6 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xs">
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 mb-4">
            <div class="flex items-center gap-2">
              <Beer class="w-5 h-5 text-amber-500" />
              <div>
                <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Frigobar &amp; Estoque de Produtos
                </h3>
                <span class="text-[11px] text-slate-400">Monitoramento de bebidas e cosméticos</span>
              </div>
            </div>
            <router-link to="/products" class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
              Ver Estoque Completo
            </router-link>
          </div>

          <div class="space-y-3">
            <div 
              v-for="prod in (metrics.criticalStock || [])" 
              :key="prod.id || prod.name"
              class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 space-y-1.5"
            >
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-slate-900 dark:text-white">{{ prod.name }}</span>
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono-num"
                  :class="prod.alert === 'danger' 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : prod.alert === 'warning' 
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
                >
                  {{ prod.remaining }}
                </span>
              </div>

              <!-- Barra de Nível -->
              <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all"
                  :class="prod.alert === 'danger' ? 'bg-rose-500' : prod.alert === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'"
                  :style="{ width: `${prod.level}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feed de Atividades ao Vivo (6 cols) -->
        <div class="lg:col-span-6 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xs">
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 mb-4">
            <div class="flex items-center gap-2">
              <Flame class="w-5 h-5 text-amber-500" />
              <div>
                <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Feed de Atividades ao Vivo
                </h3>
                <span class="text-[11px] text-slate-400">Últimos checkouts e vendas registradas</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500">
              Tempo Real
            </span>
          </div>

          <div class="space-y-2.5 max-h-80 overflow-y-auto no-scrollbar">
            <div 
              v-if="(!metrics.recentActivities || metrics.recentActivities.length === 0)"
              class="py-8 text-center text-slate-400 text-xs italic"
            >
              Nenhuma atividade registrada hoje.
            </div>

            <div 
              v-for="act in (metrics.recentActivities || [])" 
              :key="act.id"
              class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="act.type === 'PRODUCT_SALE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'">
                  <Beer v-if="act.type === 'PRODUCT_SALE'" class="w-4 h-4" />
                  <Scissors v-else class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {{ act.title }}
                  </h4>
                  <span class="text-[10px] text-slate-400 block truncate">
                    {{ act.subtitle }}
                  </span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <span v-if="act.value" class="text-xs font-black font-mono-num text-emerald-500 block">
                  +{{ formatCurrency(act.value) }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono-num block">
                  {{ act.time }}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </template>

    <!-- ============================================================== -->
    <!-- MODAL: VENDA EXPRESSA DE BALCÃO / FRIGOBAR (PDV RÁPIDO)        -->
    <!-- ============================================================== -->
    <div 
      v-if="isQuickSaleModalOpen" 
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-scrollbar"
      @click.self="isQuickSaleModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden space-y-4">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Beer class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Venda Expressa no Balcão / Frigobar
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Lançamento imediato de bebidas, produtos ou comodidades
              </p>
            </div>
          </div>

          <button 
            @click="isQuickSaleModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Seleção de Barbeiro & Cliente -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Barbeiro Atendente (Comissão):
            </label>
            <select 
              v-model="selectedBarberId"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Nenhum (Venda Direta da Casa)</option>
              <option v-for="b in barbersList" :key="b.id" :value="b.id">
                {{ b.name }} ({{ b.nickname }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Cliente (Opcional para LTV):
            </label>
            <select 
              v-model="selectedCustomerId"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Cliente Balcão Avulso</option>
              <option v-for="c in customersList" :key="c.id" :value="c.id">
                {{ c.name }} {{ c.isVipMember ? '👑' : '' }}
              </option>
            </select>
          </div>
        </div>

        <!-- Grade de Produtos com 1 Toque -->
        <div class="flex-1 overflow-y-auto no-scrollbar space-y-2">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Toque no produto para adicionar:
          </label>

          <div v-if="quickSaleLoading" class="py-12 text-center text-xs text-slate-400">
            <Loader2 class="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
            Carregando itens do frigobar...
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 no-scrollbar">
            <button 
              v-for="prod in productsList" 
              :key="prod.id"
              @click="addToCart(prod)"
              class="p-2.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer relative group"
              :class="cart[prod.id] 
                ? 'bg-amber-500/10 border-amber-500 shadow-sm' 
                : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 hover:border-amber-500/40'"
            >
              <!-- Badge de Quantidade -->
              <span 
                v-if="cart[prod.id]"
                class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center shadow-md animate-bounce"
              >
                {{ cart[prod.id].quantity }}
              </span>

              <div>
                <span class="text-[9px] font-bold text-slate-400 block uppercase truncate">{{ prod.category }}</span>
                <h4 class="font-bold text-slate-900 dark:text-white text-xs truncate mt-0.5">{{ prod.name }}</h4>
              </div>

              <div class="mt-2 flex items-center justify-between">
                <span class="font-mono-num font-black text-xs text-amber-500">
                  {{ formatCurrency(prod.salePrice) }}
                </span>
                <span class="text-[9px] text-slate-400 font-medium">
                  {{ prod.stockQuantity }} un.
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Forma de Pagamento -->
        <div class="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Forma de Pagamento:
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button 
              v-for="method in ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH']"
              :key="method"
              type="button"
              @click="selectedPaymentMethod = method; playPopSound()"
              class="py-1.5 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer"
              :class="selectedPaymentMethod === method 
                ? 'bg-amber-500 text-black shadow-xs font-black' 
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'"
            >
              {{ method === 'CREDIT_CARD' ? 'Crédito' : method === 'DEBIT_CARD' ? 'Débito' : method === 'CASH' ? 'Dinheiro' : 'PIX' }}
            </button>
          </div>
        </div>

        <!-- Total e Confirmação -->
        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <div>
            <span class="text-[10px] text-slate-400 font-bold block uppercase">Total da Comanda:</span>
            <span class="text-xl font-black font-mono-num text-emerald-500 block">
              {{ formatCurrency(cartTotal) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              @click="isQuickSaleModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button 
              @click="handleConfirmQuickSale"
              :disabled="quickSaleLoading || cartCount === 0"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="quickSaleLoading" class="w-4 h-4 animate-spin" />
              <Check v-else class="w-4 h-4 stroke-[3]" />
              <span>Confirmar Venda ({{ cartCount }})</span>
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
