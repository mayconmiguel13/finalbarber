<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
  Phone,
  Tv,
  Minimize2,
  ChevronLeft,
  Play,
  Pause,
  Video
} from 'lucide-vue-next';
import { api, type DashboardMetrics, type AppointmentItem, type Product, type Barber, type Customer, type TvAd, type TvSettings } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const route = useRoute();
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

// Telemetria em Tempo Real (Auto-Sync)
const secondsSinceUpdate = ref(0);
let previousAppointmentsCount = 0;
let autoRefreshTimer: any = null;
let secondsTimer: any = null;

// Carregar Dados da API (com suporte a silent polling em segundo plano)
async function loadData(isRefresh = false, isSilent = false) {
  if (isRefresh) {
    refreshing.value = true;
    playPopSound();
  } else if (!isSilent) {
    loading.value = true;
  }
  error.value = null;

  try {
    const [metricsData, appointmentsData] = await Promise.all([
      api.getDashboardMetrics(),
      api.getTodayAppointments(),
    ]);

    // Notificação sonora/toast suave se um novo agendamento chegou via WhatsApp ou Web
    if (previousAppointmentsCount > 0 && (appointmentsData?.length || 0) > previousAppointmentsCount) {
      playPopSound();
      toast.success('Novo agendamento recebido em tempo real!', 'Cockpit Barbly');
    }
    previousAppointmentsCount = appointmentsData?.length || 0;

    metrics.value = metricsData;
    appointments.value = appointmentsData;
    secondsSinceUpdate.value = 0;

    // Também pré-carrega produtos se vazio para o Frigobar Express
    if (productsList.value.length === 0) {
      api.getProducts().then((p) => productsList.value = p || []).catch(() => {});
      api.getBarbers().then((b) => barbersList.value = b || []).catch(() => {});
    }
  } catch (err: any) {
    if (!isSilent) {
      error.value = err.message || 'Erro ao carregar cockpit operacional';
      toast.error('Falha ao sincronizar dados do dashboard');
    } else {
      console.warn('[Cockpit AutoSync] Erro na sincronização silenciosa:', err.message);
    }
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


// ================= 1. RECURSO: MODO TV / PAINEL KIOSK & MÍDIA INDOOR =================
const isTvMode = ref(false);
const isTvPaused = ref(false);
const videoErrorMap = ref<Record<string, boolean>>({});

function handleVideoError(adId?: string) {
  if (adId) {
    videoErrorMap.value[adId] = true;
  }
}

function formatRemainingMinutes(rem?: number | null) {
  if (rem === null || rem === undefined) return "";
  if (rem <= 0) return "Finalizando corte...";
  return `Resta: ~${rem} min`;
}
const currentClock = ref('');
const currentDateFormatted = ref('');
let clockTimer: any = null;

// Carrossel Dinâmico de Mídia Indoor & Anúncios em Vídeo/Imagem
const tvAds = ref<TvAd[]>([]);
const tvSettings = ref<TvSettings | null>(null);
const activeTvSlide = ref(0);
const slideProgress = ref(0);
let tvProgressTimer: any = null;

// Slides Padrão com Vídeos e Flyers de Alta Resolução
const defaultTvSlides: TvAd[] = [
  {
    id: 'def_1',
    orgId: 'default',
    title: 'Garage 66 Smash Burger & Grill',
    subtitle: 'Os melhores smash burgers artesanais da região com queijo derretido e carnes nobres!',
    category: 'ALIMENTACAO',
    mediaType: 'VIDEO',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-burger-41584-large.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop',
    targetUrl: 'https://instagram.com',
    qrCodeLabel: 'Aponte a câmera e garanta 15% OFF',
    priceTag: '15% OFF NO COMBO',
    partnerMonthlyFee: 150,
    displayDuration: 14,
    active: true,
  },
  {
    id: 'def_2',
    orgId: 'default',
    title: 'Garage Detail Estética Automotiva',
    subtitle: 'Lavagem técnica detalhada e vitrificação enquanto você cuida do seu visual.',
    category: 'AUTOMOTIVO',
    mediaType: 'VIDEO',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cleaning-a-car-with-high-pressure-water-41566-large.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=900&auto=format&fit=crop',
    targetUrl: 'https://wa.me',
    qrCodeLabel: 'Agende seu carro pelo WhatsApp',
    priceTag: 'LAVAGEM R$ 50',
    partnerMonthlyFee: 180,
    displayDuration: 14,
    active: true,
  },
  {
    id: 'def_3',
    orgId: 'default',
    title: 'Clube VIP Barbly Club',
    subtitle: 'Cortes ilimitados o mês inteiro e cerveja gelada de cortesia em cada visita ao lounge!',
    category: 'BARBEARIA',
    mediaType: 'VIDEO',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-barber-cutting-the-hair-of-a-man-with-scissors-41530-large.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=900&auto=format&fit=crop',
    targetUrl: 'https://barblyclub.com.br',
    qrCodeLabel: 'Conheça os planos no seu celular',
    priceTag: 'ASSINATURA VIP',
    partnerMonthlyFee: 0,
    displayDuration: 12,
    active: true,
  },
  {
    id: 'def_4',
    orgId: 'default',
    title: 'Cervejas Artesanais & Chopp Gelado',
    subtitle: 'Aproveite sua espera relaxando com as melhores cervejas artesanais trincando de geladas!',
    category: 'BEBIDAS',
    mediaType: 'VIDEO',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-cold-beer-into-a-glass-41517-large.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=900&auto=format&fit=crop',
    targetUrl: 'https://barblyclub.com.br',
    qrCodeLabel: 'Cardápio digital no seu celular',
    priceTag: 'CHOPP R$ 14',
    partnerMonthlyFee: 0,
    displayDuration: 12,
    active: true,
  },
  {
    id: 'def_5',
    orgId: 'default',
    title: 'Black Skull Tattoo Studio',
    subtitle: 'Tatuadores premiados especializados em realismo e fineline ao lado da barbearia!',
    category: 'TATUAGEM',
    mediaType: 'VIDEO',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tattoo-artist-working-on-a-tattoo-machine-41544-large.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=900&auto=format&fit=crop',
    targetUrl: 'https://instagram.com',
    qrCodeLabel: 'Acesse o portfólio no Instagram',
    priceTag: 'FLASH R$ 190',
    partnerMonthlyFee: 200,
    displayDuration: 14,
    active: true,
  },
  {
    id: 'def_6',
    orgId: 'default',
    title: 'Pomada Matte Barbly Club',
    subtitle: 'Efeito seco natural e fixação extrema para o dia todo. Leve direto no caixa!',
    category: 'BARBEARIA',
    mediaType: 'IMAGE',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=900&auto=format&fit=crop',
    targetUrl: 'https://barblyclub.com.br',
    qrCodeLabel: 'Compre no caixa ou online',
    priceTag: 'R$ 49,90',
    partnerMonthlyFee: 0,
    displayDuration: 10,
    active: true,
  }
];

const activeSlides = computed(() => {
  const validDbAds = (tvAds.value || []).filter(a => a.active);
  return validDbAds.length > 0 ? validDbAds : defaultTvSlides;
});

const currentAd = computed<TvAd | null>(() => {
  const slides = activeSlides.value;
  if (!slides || slides.length === 0) return null;
  return slides[activeTvSlide.value % slides.length];
});

function updateClock() {
  const now = new Date();
  currentClock.value = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDateFormatted.value = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

async function loadTvAds() {
  try {
    const [res, settingsRes] = await Promise.allSettled([
      api.getTvAds(),
      api.getTvSettings()
    ]);
    if (res.status === 'fulfilled' && res.value && res.value.ads) {
      tvAds.value = res.value.ads;
    }
    if (settingsRes.status === 'fulfilled' && settingsRes.value) {
      tvSettings.value = settingsRes.value;
    }
  } catch (err) {
    console.error('Falha ao carregar anúncios da TV:', err);
  }
}

function startTvCarousel() {
  if (tvProgressTimer) clearInterval(tvProgressTimer);
  slideProgress.value = 0;

  // Timer de 100ms para barra de progresso suave
  tvProgressTimer = setInterval(() => {
    if (isTvPaused.value) return; // Pausado para permitir escaneamento do QR Code
    const currentDurationSec = currentAd.value?.displayDuration || 14;
    const step = 100 / (currentDurationSec * 10);
    slideProgress.value += step;

    if (slideProgress.value >= 100) {
      slideProgress.value = 0;
      const total = activeSlides.value.length || 1;
      activeTvSlide.value = (activeTvSlide.value + 1) % total;
    }
  }, 100);
}

function selectTvSlide(index: number) {
  activeTvSlide.value = index;
  slideProgress.value = 0;
}

function nextTvSlide() {
  playPopSound();
  slideProgress.value = 0;
  const total = activeSlides.value.length || 1;
  activeTvSlide.value = (activeTvSlide.value + 1) % total;
}

function prevTvSlide() {
  playPopSound();
  slideProgress.value = 0;
  const total = activeSlides.value.length || 1;
  activeTvSlide.value = (activeTvSlide.value - 1 + total) % total;
}

function toggleTvPause() {
  playPopSound();
  isTvPaused.value = !isTvPaused.value;
}

function toggleTvMode() {
  playPopSound();
  isTvMode.value = !isTvMode.value;
  if (isTvMode.value) {
    updateClock();
    activeTvSlide.value = 0;
    isTvPaused.value = false;
    loadTvAds();
    startTvCarousel();

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    if (tvProgressTimer) clearInterval(tvProgressTimer);
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }
}
// Próximos da fila para a TV (Sem dados financeiros)
const upcomingQueue = computed(() => {
  if (!appointments.value) return [];
  return appointments.value
    .filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT')
    .slice(0, 4);
});

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isTvMode.value) {
    isTvMode.value = false;
  }
}

// ================= 2. RECURSO: ALTERNADOR RÁPIDO DE PERÍODO =================
const selectedPeriod = ref<'today' | 'week' | 'month'>('today');

function selectPeriod(p: 'today' | 'week' | 'month') {
  playPopSound();
  selectedPeriod.value = p;
}

const displayedRevenue = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.totalRevenue || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.totalRevenue || 0;
  return metrics.value?.today?.totalRevenue || 0;
});

const displayedServicesRevenue = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.servicesRevenue || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.servicesRevenue || 0;
  return metrics.value?.today?.servicesRevenue || 0;
});

const displayedProductsRevenue = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.productsRevenue || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.productsRevenue || 0;
  return metrics.value?.today?.productsRevenue || 0;
});

const displayedBarberShare = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.barberShare || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.barberShare || 0;
  return metrics.value?.today?.barberShare || 0;
});

const displayedSalonShare = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.salonNetShare || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.salonShare || 0;
  return metrics.value?.today?.salonNetShare || 0;
});

const displayedAppointmentsCount = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.totalAppointments || 0;
  if (selectedPeriod.value === 'month') return metrics.value?.month?.completedAppointments || 0;
  return metrics.value?.today?.totalAppointments || 0;
});

const displayedAverageTicket = computed(() => {
  if (selectedPeriod.value === 'week') return metrics.value?.week?.averageTicket || 0;
  if (selectedPeriod.value === 'month') {
    const total = metrics.value?.month?.totalRevenue || 0;
    const count = metrics.value?.month?.completedAppointments || 1;
    return total > 0 && count > 0 ? total / count : 0;
  }
  return metrics.value?.today?.averageTicket || 0;
});

// ================= 3. RECURSO: STATUS RÁPIDO DE CADEIRA =================
async function changeChairStatus(barberId: string, status: 'AVAILABLE' | 'BREAK' | 'CLEANING') {
  playPopSound();
  try {
    await api.setBarberOperationalStatus(barberId, status);
    toast.success(
      status === 'BREAK'
        ? 'Profissional colocado em Pausa / Almoço.'
        : status === 'CLEANING'
        ? 'Cadeira em Limpeza de Bancada.'
        : 'Cadeira liberada para encaixes!',
      'Status Atualizado'
    );
    await loadData(false, true);
  } catch (err: any) {
    toast.error(err.message || 'Falha ao alterar status da cadeira');
  }
}

function handleWindowFocus() {
  loadData(false, true);
}

onMounted(() => {
  loadData();
  loadTvAds();

  // Se rota tiver ?tv=1, abrir Modo TV automaticamente
  if (route.query.tv === '1' || route.query.tv === 'true') {
    setTimeout(() => {
      toggleTvMode();
    }, 350);
  }

  // 1. Auto-polling silencioso em segundo plano a cada 15 segundos
  autoRefreshTimer = setInterval(() => {
    loadData(false, true);
  }, 15000);

  // 2. Contador de segundos desde a última sincronização
  secondsTimer = setInterval(() => {
    secondsSinceUpdate.value++;
  }, 1000);

  // 3. Sincronizar na hora ao voltar o foco para a aba do navegador
  window.addEventListener('focus', handleWindowFocus);
  window.addEventListener('keydown', handleKeyDown);
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  if (secondsTimer) clearInterval(secondsTimer);
  window.removeEventListener('focus', handleWindowFocus);
  window.removeEventListener('keydown', handleKeyDown);
  if (clockTimer) clearInterval(clockTimer);
  if (tvProgressTimer) clearInterval(tvProgressTimer);
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] w-full mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">

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

        <!-- 📺 Modo TV / Kiosk -->
        <button 
          @click="toggleTvMode()"
          class="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-95"
          title="Ativar Modo TV em tela cheia para recepção"
        >
          <Tv class="w-4 h-4 text-amber-500" />
          <span>Modo TV</span>
        </button>

        <!-- Novo Agendamento -->
        <button 
          @click="goToAppointments(true)"
          class="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
        >
          <Scissors class="w-4 h-4 stroke-[3]" />
          <span>+ Novo Agendamento</span>
        </button>

        <!-- Sincronizar & Status de Tempo Real -->
        <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shadow-xs">
          <button 
            @click="loadData(true)" 
            :disabled="refreshing"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            title="Clique para sincronizar manualmente agora"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshing }" />
            <span class="font-mono text-[11px]">{{ secondsSinceUpdate }}s</span>
          </button>
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 hidden sm:inline-block" title="Conexão ao vivo com o banco MySQL"></span>
        </div>
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
      
      <!-- ============================================================== -->
      <!-- SELETOR DE PERÍODO (HOJE / ESTA SEMANA / ESTE MÊS)             -->
      <!-- ============================================================== -->
      <div class="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-[#0e131d]/90 border border-slate-200/90 dark:border-white/[0.08] p-2 sm:p-2.5 rounded-3xl shadow-xs">
        <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <button 
            @click="selectPeriod('today')"
            class="px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
            :class="selectedPeriod === 'today' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <span>Hoje</span>
            <span v-if="selectedPeriod === 'today'" class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
          </button>
          <button 
            @click="selectPeriod('week')"
            class="px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
            :class="selectedPeriod === 'week' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <span>Esta Semana</span>
            <span v-if="selectedPeriod === 'week'" class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
          </button>
          <button 
            @click="selectPeriod('month')"
            class="px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
            :class="selectedPeriod === 'month' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <span>Este Mês</span>
            <span v-if="selectedPeriod === 'month'" class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
          </button>
        </div>

        <div class="flex items-center gap-2 pr-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Período Ativo: <strong class="text-slate-900 dark:text-white font-bold">{{ selectedPeriod === 'today' ? 'Hoje (Ao Vivo)' : (selectedPeriod === 'week' ? 'Semana Atual' : 'Mês de Outubro') }}</strong></span>
        </div>
      </div>

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
                {{ formatCurrency(displayedRevenue) }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono-num text-slate-600 dark:text-slate-400">
            <span>✂️ Cortes: {{ formatCurrency(displayedServicesRevenue) }}</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">🍺 Frigobar: {{ formatCurrency(displayedProductsRevenue) }}</span>
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
                {{ formatCurrency(displayedBarberShare) }}
              </span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Lucro Casa: <strong class="text-slate-900 dark:text-white font-mono-num">{{ formatCurrency(displayedSalonShare) }}</strong></span>
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
                {{ metrics?.today?.onlinePixPercentage || 75 }}% Online
              </span>
            </div>
            <div class="mt-2.5 flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white">
                {{ metrics?.today?.totalAppointments || 0 }}
              </span>
              <span class="text-xs text-slate-400 font-medium">cortes hoje</span>
            </div>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ metrics?.today?.completedAppointments || 0 }} Concluídos</span>
            <span>{{ metrics?.today?.confirmedAppointments || 0 }} Agendados</span>
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
                {{ formatCurrency(displayedAverageTicket) }}
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
          :class="(metrics?.chairs?.length || 0) <= 1 ? 'lg:grid-cols-12' : (metrics?.chairs?.length === 2 ? 'md:grid-cols-2' : (metrics?.chairs?.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'))"
        >
          <!-- Cadeira(s) Operacionais com Status 100% no Topo -->
          <div 
            v-for="chair in (metrics?.chairs || [])" 
            :key="chair.barberId"
            class="rounded-3xl border transition-all flex flex-col justify-between shadow-xs overflow-hidden group"
            :class="[
              (metrics?.chairs?.length || 0) <= 1 ? 'lg:col-span-7' : '',
              chair.status === 'OCCUPIED' 
                ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.08] border-amber-400/80 dark:border-amber-500/40 ring-1 ring-amber-400/30' 
                : 'bg-white dark:bg-[#0e131d]/90 border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
            ]"
          >
            <!-- 100% Full-Width Status Header Bar -->
            <div 
              class="w-full px-5 py-3 flex items-center justify-between border-b transition-colors"
              :class="[
                chair.status === 'OCCUPIED'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-500/30 font-black shadow-xs'
                  : chair.status === 'BREAK'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-black'
                    : chair.status === 'CLEANING'
                      ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-black'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-black'
              ]"
            >
              <span class="flex items-center gap-2 text-xs uppercase tracking-wider">
                <span class="w-2.5 h-2.5 rounded-full" :class="[
                  chair.status === 'OCCUPIED' ? 'bg-slate-950 animate-ping' :
                  chair.status === 'BREAK' ? 'bg-sky-500' :
                  chair.status === 'CLEANING' ? 'bg-purple-500' :
                  'bg-emerald-500 animate-pulse'
                ]"></span>
                <span>{{ chair.statusLabel || (chair.status === 'OCCUPIED' ? 'Em Atendimento' : (chair.status === 'BREAK' ? '☕ Em Almoço / Pausa' : (chair.status === 'CLEANING' ? '🧹 Limpeza de Bancada' : 'Disponível • Livre'))) }}</span>
              </span>
              <span class="text-xs font-mono font-bold" :class="chair.status === 'OCCUPIED' ? 'text-slate-950' : 'text-slate-500 dark:text-slate-400'">
                {{ chair.chair }}
              </span>
            </div>

            <!-- Corpo da Cadeira -->
            <div class="p-5 flex-1 flex flex-col justify-between">
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
                        {{ chair.commissionRate }}% comissão
                      </span>
                    </div>
                  </div>

                  <span class="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    {{ chair.chair }}
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
            <div class="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 space-y-2">
              <button 
                v-if="chair.status === 'OCCUPIED'"
                @click="goToAppointments()"
                class="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4 stroke-[3]" />
                <span>Finalizar &amp; Cobrar Comanda</span>
              </button>

              <button 
                v-else-if="chair.status === 'BREAK' || chair.status === 'CLEANING'"
                @click="changeChairStatus(chair.barberId, 'AVAILABLE')"
                class="w-full py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4 stroke-[3]" />
                <span>🟢 Retomar Cadeira (Disponível)</span>
              </button>

              <div v-else class="flex items-center gap-2">
                <button 
                  @click="goToAppointments(true)"
                  class="flex-1 py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Encaixe</span>
                </button>
                <button 
                  @click="changeChairStatus(chair.barberId, 'BREAK')"
                  class="px-3 py-2.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs border border-sky-500/20 transition cursor-pointer"
                  title="Pausa / Almoço"
                >
                  ☕ Pausa
                </button>
                <button 
                  @click="changeChairStatus(chair.barberId, 'CLEANING')"
                  class="px-3 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-500/20 transition cursor-pointer"
                  title="Limpeza de Bancada"
                >
                  🧹 Limpeza
                </button>
              </div>
            </div>
            </div>
          </div>

          <!-- SE FOR 1 CADEIRA: FRIGOBAR EXPRESS AO LADO (Preenche os 5 cols restantes) -->
          <div 
            v-if="(metrics?.chairs?.length || 0) <= 1"
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


    <!-- ============================================== -->
    <!-- RECURSO: MODO TV / PAINEL KIOSK DE ALTA RESOLUÇÃO -->
    <Teleport to="body">
      <div 
        v-if="isTvMode && metrics" 
        class="fixed inset-0 z-[9999] bg-[#05070f] text-slate-100 flex flex-col p-4 sm:p-5 lg:p-6 font-sans antialiased overflow-hidden select-none"
      >
        <!-- TOPO DO MODO TV LOUNGE -->
        <div class="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg shadow-amber-500/25">
              88
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                  {{ authStore.organization?.name || 'Atelier 88 Barber Lounge' }}
                </h1>
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  PAINEL DO LOUNGE AO VIVO
                </span>
              </div>
              <p class="text-[11px] text-slate-400 uppercase tracking-widest mt-0.5 font-medium">
                Monitoramento de Cadeiras &amp; Mídia Indoor em Vídeo
              </p>
            </div>
          </div>

          <!-- Relógio Digital Central Gigante -->
          <div class="hidden md:flex flex-col items-center">
            <span class="font-mono text-3xl lg:text-4xl font-black text-amber-400 tracking-wider">
              {{ currentClock }}
            </span>
            <span class="text-xs text-slate-400 uppercase font-medium mt-0.5">
              {{ currentDateFormatted }}
            </span>
          </div>

          <!-- Ações do Topo: Pausa, Sincronização e Sair -->
          <div class="flex items-center gap-3">
            <button 
              @click="toggleTvPause()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer"
              :class="isTvPaused ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/10'"
              :title="isTvPaused ? 'Retomar carrossel' : 'Pausar slide para escanear QR Code'"
            >
              <Pause v-if="!isTvPaused" class="w-3.5 h-3.5 text-amber-400" />
              <Play v-else class="w-3.5 h-3.5" />
              <span>{{ isTvPaused ? 'Pausado' : 'Pausar' }}</span>
            </button>

            <span class="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hidden lg:inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Sincronizado ao Vivo
            </span>

            <button 
              @click="toggleTvMode()"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-white/10"
              title="Pressione ESC para sair"
            >
              <Minimize2 class="w-3.5 h-3.5" />
              <span>Sair (ESC)</span>
            </button>
          </div>
        </div>

        <!-- CORPO PRINCIPAL: 28% CADEIRAS / 72% MÍDIA INDOOR GIGANTE -->
        <div class="flex-1 flex flex-col lg:flex-row gap-5 mt-4 min-h-0 overflow-hidden">

          <!-- ============================================================== -->
          <!-- LADO ESQUERDO (~28%): CADEIRAS EM ATENDIMENTO + FILA DE ESPERA -->
          <!-- ============================================================== -->
          <div class="w-full lg:w-[28%] xl:w-[26%] shrink-0 flex flex-col justify-between space-y-3.5 min-h-0 overflow-hidden">

            <!-- HEADER DA SEÇÃO DE CADEIRAS -->
            <div class="flex items-center justify-between shrink-0">
              <span class="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Scissors class="w-4 h-4 text-amber-400" />
                <span>Cadeiras &amp; Atendimentos</span>
              </span>
              <span class="text-[11px] font-mono text-slate-400">
                {{ (metrics?.chairs || []).length }} Cadeiras
              </span>
            </div>

            <!-- LISTA VERTICAL DE CADEIRAS (COMPACTA, ROBUSTA E SEM VÃO VAZIO) -->
            <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto no-scrollbar">
              <div 
                v-for="chair in (metrics?.chairs || [])" 
                :key="'tv_' + chair.barberId"
                class="rounded-3xl border overflow-hidden shadow-xl transition-all flex flex-col justify-between shrink-0"
                :class="[
                  chair.status === 'OCCUPIED'
                    ? 'bg-[#121622] border-amber-500/60 ring-1 ring-amber-500/30'
                    : chair.status === 'BREAK'
                      ? 'bg-[#0f1522] border-sky-500/40'
                      : chair.status === 'CLEANING'
                        ? 'bg-[#131122] border-purple-500/40'
                        : 'bg-[#0e1320] border-white/10'
                ]"
              >
                <!-- Barra Superior de Status 100% Colorida -->
                <div 
                  class="w-full px-3.5 py-2 flex items-center justify-between border-b shrink-0"
                  :class="[
                    chair.status === 'OCCUPIED'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black'
                      : chair.status === 'BREAK'
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 font-black'
                        : chair.status === 'CLEANING'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 font-black'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black'
                  ]"
                >
                  <span class="flex items-center gap-1.5 text-xs uppercase tracking-wider font-extrabold">
                    <span class="w-2 h-2 rounded-full" :class="chair.status === 'OCCUPIED' ? 'bg-slate-950 animate-ping' : 'bg-emerald-400 animate-pulse'"></span>
                    <span>{{ chair.statusLabel || (chair.status === 'OCCUPIED' ? 'Em Atendimento' : 'Disponível • Livre') }}</span>
                  </span>
                  <span class="text-xs font-mono font-black">{{ chair.chair }}</span>
                </div>

                <!-- Conteúdo da Cadeira -->
                <div class="p-3.5 space-y-3">
                  <!-- Linha do Barbeiro -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5 truncate">
                      <div class="w-10 h-10 rounded-2xl overflow-hidden ring-2 bg-slate-800 shrink-0" :class="chair.status === 'OCCUPIED' ? 'ring-amber-500' : 'ring-white/20'">
                        <img v-if="chair.avatarUrl" :src="chair.avatarUrl" class="w-full h-full object-cover" />
                        <div v-else class="w-full h-full flex items-center justify-center font-black text-base bg-amber-500 text-slate-950">
                          {{ chair.nickname.charAt(0) }}
                        </div>
                      </div>
                      <div class="truncate">
                        <h3 class="text-sm font-black text-white leading-tight truncate">{{ chair.nickname }}</h3>
                        <span class="text-[11px] text-slate-400 block mt-0.5 truncate">{{ chair.chair }}</span>
                      </div>
                    </div>

                    <span 
                      class="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0"
                      :class="chair.status === 'OCCUPIED' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'"
                    >
                      {{ chair.status === 'OCCUPIED' ? 'Ocupado' : 'Livre' }}
                    </span>
                  </div>

                  <!-- Detalhes do Corte (se ocupado) -->
                  <div v-if="chair.status === 'OCCUPIED' && chair.currentAppointment" class="p-3 rounded-2xl bg-black/60 border border-white/10 space-y-2 shadow-inner">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-white text-xs truncate max-w-[140px]">
                        {{ chair.currentAppointment.clientName }}
                      </span>
                      <span v-if="chair.currentAppointment.isVipMember" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500 text-slate-950 shrink-0">
                        VIP
                      </span>
                    </div>

                    <span class="text-[11px] text-amber-300 font-semibold block truncate">
                      {{ chair.currentAppointment.serviceName }}
                    </span>

                    <!-- Barra de Progresso do Atendimento -->
                    <div class="space-y-1 pt-1 border-t border-white/10">
                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="text-slate-400">Decorrido: {{ chair.currentAppointment.elapsedMinutes }} min</span>
                        <span class="text-amber-400 font-bold">
                          {{ formatRemainingMinutes(chair.currentAppointment.remainingMinutes) }}
                        </span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                          :style="{ width: `${chair.currentAppointment.progressPercent}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <!-- Se em Pausa -->
                  <div v-else-if="chair.status === 'BREAK'" class="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center py-2.5">
                    <span class="text-lg block mb-0.5">☕</span>
                    <span class="text-xs text-sky-300 font-bold block">Pausa / Almoço</span>
                    <span class="text-[10px] text-slate-400 block mt-0.5">Retornando em breve</span>
                  </div>

                  <!-- Se em Limpeza -->
                  <div v-else-if="chair.status === 'CLEANING'" class="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center py-2.5">
                    <span class="text-lg block mb-0.5">🧹</span>
                    <span class="text-xs text-purple-300 font-bold block">Limpeza &amp; Higienização</span>
                    <span class="text-[10px] text-slate-400 block mt-0.5">Preparando bancada</span>
                  </div>

                  <!-- Se Livre -->
                  <div v-else class="p-3 rounded-2xl bg-black/30 border border-dashed border-white/10 text-center py-2.5">
                    <Scissors class="w-4 h-4 text-slate-500 mx-auto mb-1 opacity-60" />
                    <span class="text-xs text-slate-300 font-bold block">Pronto para Encaixe</span>
                    <span class="text-[10px] text-slate-500 block mt-0.5">Atendimento imediato</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- FILA DE ESPERA (RODAPÉ DA SEÇÃO DE CADEIRAS) -->
            <div class="p-3 rounded-3xl bg-[#0e1320] border border-white/10 space-y-2 shrink-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5 text-sky-400" />
                  <span>Próximos a Serem Atendidos</span>
                </span>
                <span class="text-[10px] text-slate-400">Horários</span>
              </div>

              <div v-if="upcomingQueue.length > 0" class="space-y-1.5">
                <div 
                  v-for="(item, idx) in upcomingQueue.slice(0, 3)" 
                  :key="'queue_' + item.id"
                  class="p-2 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 hover:border-amber-500/40 transition"
                >
                  <div class="truncate min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 uppercase shrink-0">
                        #{{ idx + 1 }}
                      </span>
                      <span class="text-xs font-bold text-white truncate">{{ item.clientName }}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 block truncate mt-0.5">{{ item.serviceName }}</span>
                  </div>
                  <span class="font-mono text-xs font-black text-amber-400 shrink-0">
                    {{ item.time }}
                  </span>
                </div>
              </div>

              <div v-else class="py-2 text-center text-xs text-slate-500">
                Nenhum agendamento pendente na fila.
              </div>
            </div>

          </div>

          <!-- ============================================================== -->
          <!-- LADO DIREITO (~72%): MEGA PAINEL CINEMATOGRÁFICO DE MÍDIA    -->
          <!-- ============================================================== -->
          <div class="w-full lg:w-[72%] xl:w-[74%] flex-1 flex flex-col justify-between rounded-3xl bg-gradient-to-b from-[#111726] to-[#070b13] border border-amber-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden min-h-0">

            <!-- TOPO DO ANÚNCIO (BADGE DE CATEGORIA, LIVE STATUS E TAG DE PREÇO) -->
            <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div class="flex items-center gap-2">
                <span class="px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                  <span>{{ currentAd?.category || 'PARCEIRO LOCAL' }}</span>
                </span>

                <span 
                  v-if="currentAd?.mediaType === 'VIDEO' && !videoErrorMap[currentAd.id]"
                  class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/90 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  <span>VÍDEO AO VIVO</span>
                </span>
              </div>

              <div class="flex items-center gap-3">
                <span 
                  v-if="currentAd?.priceTag"
                  class="px-4 py-1.5 rounded-2xl text-xs sm:text-base font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-lg border border-amber-400 flex items-center gap-2"
                >
                  <Tag class="w-4 h-4" />
                  <span>{{ currentAd.priceTag }}</span>
                </span>
                <span class="text-xs font-mono font-bold text-slate-400 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                  Slide {{ activeTvSlide + 1 }}/{{ activeSlides.length }}
                </span>
              </div>
            </div>

            <!-- HERO THEATER: VÍDEO OU FOTO GIGANTE EM ESCALA ULTRA-WIDE -->
            <div class="relative flex-1 rounded-3xl overflow-hidden my-3 border border-white/15 shadow-2xl bg-black flex items-center justify-center group min-h-[300px]">
              <!-- Imagem Base (Sempre Carregada como Garantia Visual) -->
              <img 
                :key="'img_fallback_' + currentAd?.id"
                :src="currentAd?.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop'"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onerror="this.src='https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop'"
              />

              <!-- Player de Vídeo em Loop (Sobreposto com som mutado) -->
              <video 
                v-if="currentAd?.mediaType === 'VIDEO' && currentAd?.videoUrl && !videoErrorMap[currentAd.id]"
                :key="'tv_vid_' + currentAd.id"
                :src="currentAd.videoUrl"
                :poster="currentAd.imageUrl"
                autoplay
                muted
                loop
                playsinline
                @error="handleVideoError(currentAd.id)"
                class="absolute inset-0 w-full h-full object-cover z-10"
              ></video>

              <!-- Gradiente de Vinheta Escuro Suave -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none z-10"></div>

              <!-- Setas de Navegação Manual no Hover -->
              <button 
                @click="prevTvSlide()"
                class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-2xl border border-white/20"
                title="Anúncio anterior"
              >
                <ChevronLeft class="w-6 h-6" />
              </button>

              <button 
                @click="nextTvSlide()"
                class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-2xl border border-white/20"
                title="Próximo anúncio"
              >
                <ChevronRight class="w-6 h-6" />
              </button>
            </div>

            <!-- CARD DO ANUNCIANTE & QR CODE GIGANTE DE ALTO CONTRASTE -->
            <div class="p-4 sm:p-5 rounded-3xl bg-black/85 border border-white/15 backdrop-blur-2xl flex items-center justify-between gap-6 shrink-0 shadow-2xl">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                  <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white truncate drop-shadow-md tracking-tight">
                    {{ currentAd?.title }}
                  </h2>
                </div>
                <p class="text-sm sm:text-base text-slate-200 font-medium line-clamp-2 leading-relaxed">
                  {{ currentAd?.subtitle }}
                </p>
                <div class="flex items-center gap-2 pt-1 text-xs text-amber-400 font-semibold">
                  <span>📲 Aponte a câmera do celular para resgatar este benefício</span>
                  <span class="text-slate-400 font-mono text-xs hidden md:inline">• {{ currentAd?.targetUrl || 'barblyclub.com.br' }}</span>
                </div>
              </div>

              <!-- Bloco do QR Code Gigante -->
              <div class="flex flex-col items-center gap-1.5 shrink-0">
                <div class="w-28 h-28 sm:w-36 sm:h-36 bg-white p-2.5 rounded-2xl shadow-2xl ring-2 ring-amber-500/60 flex items-center justify-center hover:scale-105 transition-transform">
                  <img 
                    :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentAd?.targetUrl || 'https://barblyclub.com.br')}&bgcolor=ffffff&color=060911&margin=4`"
                    alt="QR Code"
                    class="w-full h-full object-contain"
                  />
                </div>
                <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider text-center max-w-[140px] truncate">
                  {{ currentAd?.qrCodeLabel || 'Escanear Benefício' }}
                </span>
              </div>
            </div>

            <!-- RODAPÉ: BARRA DE PROGRESSO, PONTOS E CHAMADA COMERCIAL -->
            <div class="pt-3.5 border-t border-white/10 space-y-2.5 shrink-0">
              <!-- Barra de Progresso Dourada Suave -->
              <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-100 ease-linear"
                  :style="{ width: `${slideProgress}%` }"
                ></div>
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-300 flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-amber-400" />
                  <span>{{ tvSettings?.tvFooterText || 'Quer anunciar sua empresa nesta TV? Fale com a recepção da barbearia' }}<span v-if="tvSettings?.tvWhatsAppContact" class="text-amber-400 font-bold ml-1.5">• WhatsApp: {{ tvSettings.tvWhatsAppContact }}</span></span>
                </span>

                <div class="flex items-center gap-1.5">
                  <button 
                    v-for="(item, idx) in activeSlides" 
                    :key="'dot_' + idx"
                    @click="selectTvSlide(idx)"
                    class="w-2.5 h-2.5 rounded-full transition-all cursor-pointer"
                    :class="activeTvSlide === idx ? 'w-7 bg-amber-400 shadow-md' : 'bg-white/30 hover:bg-white/50'"
                  ></button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>
