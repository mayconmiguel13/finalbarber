<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Scissors, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowUp,
  ShieldCheck, 
  MessageSquare, 
  Zap, 
  DollarSign, 
  Users, 
  Clock, 
  Star,
  Smartphone,
  Lock,
  Building,
  User,
  Phone,
  Mail,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  BadgeCheck,
  Split,
  Award,
  X,
  Menu,
  Volume2,
  Mic,
  QrCode,
  FileText,
  Sliders,
  HelpCircle,
  ExternalLink,
  Image as ImageIcon,
  CheckCheck
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import BarblyClubLogo from '../components/BarblyClubLogo.vue';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

// --- Sound Effects (Web Audio API) ---
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {}
}

function playPixChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second celebratory high tone (B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(987.77, now + 0.09);
    gain2.gain.setValueAtTime(0.15, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.55);
  } catch (e) {}
}

// --- Registration Form State ---
const ownerName = ref('');
const barberShopName = ref('');
const phone = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

// --- Modal State ---
const isModalOpen = ref(false);

function openRegisterModal() {
  playPopSound();
  isModalOpen.value = true;
}

function closeRegisterModal() {
  isModalOpen.value = false;
  errorMessage.value = '';
}

async function handleRegister() {
  errorMessage.value = '';
  if (!ownerName.value || !barberShopName.value || !phone.value || !email.value || !password.value) {
    errorMessage.value = 'Por favor, preencha todos os campos para ativar seus 30 dias grátis.';
    return;
  }

  loading.value = true;
  try {
    await authStore.register({
      ownerName: ownerName.value,
      barberShopName: barberShopName.value,
      phone: phone.value,
      email: email.value,
      password: password.value,
    });

    toast.show({
      title: '🎉 Bem-vindo ao BarblyClub!',
      message: 'Seus 30 dias grátis estão ativos. Vamos configurar seus primeiros serviços!',
      type: 'success',
      duration: 6000,
    });

    isModalOpen.value = false;
    router.push('/onboarding');
  } catch (err: any) {
    errorMessage.value = err.message || 'Erro ao realizar cadastro. Tente novamente.';
    toast.show({
      title: 'Atenção',
      message: errorMessage.value,
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}

// --- Reading Progress Indicator ---
const scrollProgress = ref(0);

// --- Back to Top Button ---
const showBackToTop = ref(false);

function scrollToTop() {
  playPopSound();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Navbar & ScrollSpy Menu ---
const activeSection = ref('problema');
const hoveredNavId = ref<string | null>(null);
const isMobileMenuOpen = ref(false);

const navItems = [
  { id: 'problema', label: 'O Fim das Faltas' },
  { id: 'tour', label: 'Tour da IA' },
  { id: 'calculadora', label: 'Calculadora de Lucro' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'depoimentos', label: 'Resultados' },
  { id: 'precos', label: 'Planos' },
  { id: 'faq', label: 'Dúvidas' },
];

const navContainerRef = ref<HTMLElement | null>(null);
const navButtonRefs = ref<Record<string, HTMLElement | null>>({});

function setNavButtonRef(el: any, id: string) {
  if (el) {
    navButtonRefs.value[id] = el;
  }
}

const navIndicatorStyle = computed(() => {
  const targetId = hoveredNavId.value || activeSection.value;
  const targetEl = navButtonRefs.value[targetId];
  if (!targetEl || !navContainerRef.value) {
    return {
      opacity: 0,
      transform: 'translateX(0px)',
      width: '0px',
    };
  }
  const left = targetEl.offsetLeft;
  const width = targetEl.offsetWidth;
  return {
    opacity: 1,
    transform: `translateX(${left}px)`,
    width: `${width}px`,
  };
});

function scrollToSection(id: string) {
  playPopSound();
  isMobileMenuOpen.value = false;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    activeSection.value = id;
  }
}

// --- WhatsApp Interactive Simulator with 4 Live Scenarios ---
type PhoneScenario = 'AUDIO' | 'PIX' | 'FOTOS' | 'LEMBRETE';
const activeScenario = ref<PhoneScenario>('AUDIO');
const isSimulatingTyping = ref(false);

function setScenario(sc: PhoneScenario) {
  if (activeScenario.value === sc) return;
  playPopSound();
  isSimulatingTyping.value = true;
  activeScenario.value = sc;
  setTimeout(() => {
    isSimulatingTyping.value = false;
  }, 380);
}

// Voice Note Audio in Scenario 1 (Natural Human Audio File)
const isAudioPlaying = ref(false);
const audioProgress = ref(0);
let audioInstance: HTMLAudioElement | null = null;

function toggleAudio() {
  playPopSound();
  if (isAudioPlaying.value) {
    isAudioPlaying.value = false;
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
    }
  } else {
    isAudioPlaying.value = true;
    audioProgress.value = 0;

    if (!audioInstance) {
      audioInstance = new Audio('/audio/client-voice.mp3');
      audioInstance.addEventListener('timeupdate', () => {
        if (audioInstance && audioInstance.duration) {
          audioProgress.value = (audioInstance.currentTime / audioInstance.duration) * 100;
        }
      });
      audioInstance.addEventListener('ended', () => {
        isAudioPlaying.value = false;
        audioProgress.value = 100;
      });
      audioInstance.addEventListener('pause', () => {
        isAudioPlaying.value = false;
      });
      audioInstance.addEventListener('error', () => {
        isAudioPlaying.value = false;
      });
    }

    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {
      isAudioPlaying.value = false;
    });
  }
}

// Copy Pix in Scenario 2
const copiedPix = ref(false);
function copyPixCode() {
  playPopSound();
  navigator.clipboard.writeText('00020126580014br.gov.bcb.pix0136barblyclub-pix63945820400005303986540563.005802BR5920Barbearia Elite Ltda6009SAO PAULO62070503***6304E2B1');
  copiedPix.value = true;
  toast.show({
    title: '✂️ Pix Copiado!',
    message: 'Código Pix Copia e Cola pronto para colar no app do banco.',
    type: 'success',
  });
  setTimeout(() => {
    copiedPix.value = false;
  }, 2500);
}

// --- Interactive Product Tour Tabs ---
type TourTab = 'IA_WHATSAPP' | 'PIX_CHECKOUT' | 'SALAO_PARCEIRO' | 'PWA_INSTAGRAM';
const activeTourTab = ref<TourTab>('IA_WHATSAPP');

const tourTabs = [
  { id: 'IA_WHATSAPP', label: '1. Secretária IA 24/7', icon: MessageSquare, accent: 'amber' },
  { id: 'PIX_CHECKOUT', label: '2. Pix Anti-Falta', icon: Zap, accent: 'emerald' },
  { id: 'SALAO_PARCEIRO', label: '3. Salão-Parceiro', icon: Split, accent: 'purple' },
  { id: 'PWA_INSTAGRAM', label: '4. Link do Instagram', icon: Smartphone, accent: 'blue' },
] as const;

function selectTourTab(tabId: TourTab) {
  playPopSound();
  activeTourTab.value = tabId;
}

// Split Simulator in Tour Tab 3
const splitServicePrice = ref(70);
const splitBarberPercent = ref(50);
const splitSalonShare = computed(() => {
  return (splitServicePrice.value * (100 - splitBarberPercent.value)) / 100;
});
const splitBarberShare = computed(() => {
  return (splitServicePrice.value * splitBarberPercent.value) / 100;
});

// Interactive Pix Checkout Simulation in Tour Tab 2
const simulatedPixPaid = ref(false);
function simulatePixPayment() {
  playPixChime();
  simulatedPixPaid.value = true;
  toast.show({
    title: '⚡ Notificação Pix Recebida!',
    message: 'R$ 63,00 confirmado em 0.8s via Webhook Asaas. Cadeira travada na agenda!',
    type: 'success',
  });
}

function resetSimulatePix() {
  playPopSound();
  simulatedPixPaid.value = false;
}

// --- Interactive Before / After Comparison Switcher ---
type ComparisonMode = 'SPLIT' | 'BEFORE' | 'AFTER';
const comparisonView = ref<ComparisonMode>('SPLIT');

function setComparisonView(mode: ComparisonMode) {
  playPopSound();
  comparisonView.value = mode;
}

// --- Interactive ROI Calculator State ---
const dailyClients = ref(24);
const averageTicket = ref(45);
const weeklyNoShows = ref(7);

const monthlyLoss = computed(() => {
  return Math.round(weeklyNoShows.value * 4.3 * averageTicket.value);
});

const monthlyRecovered = computed(() => {
  return Math.round(monthlyLoss.value * 0.92);
});

const annualRecovered = computed(() => {
  return monthlyRecovered.value * 12;
});

// --- Pricing Toggle (Monthly vs Annual) ---
const isAnnual = ref(true);

function togglePricing(annual: boolean) {
  playPopSound();
  isAnnual.value = annual;
}

// --- FAQ Accordion State ---
const openFaqIndex = ref<number | null>(0);

function toggleFaq(index: number) {
  playPopSound();
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

const faqs = [
  {
    q: 'Preciso cadastrar cartão de crédito para começar o teste?',
    a: 'Absolutamente não! Você recebe 30 dias de acesso completo sem informar nenhum número de cartão ou dado bancário. Você só assina se comprovar que a IA aumentou o faturamento e eliminou faltas no seu caixa.',
  },
  {
    q: 'Eu já uso meu WhatsApp na barbearia. Vou perder meu número?',
    a: 'De forma alguma. A conexão é feita em menos de 30 segundos apontando a câmera para um QR Code seguro, exatamente como você conecta no WhatsApp Web. Você continua usando seu número normalmente no celular para falar com a família, amigos e clientes.',
  },
  {
    q: 'Como funciona a divisão da Lei do Salão-Parceiro (Lei 13.352)?',
    a: 'O sistema separa automaticamente a parte da barbearia (taxa de rateio de estrutura) e a parte do profissional parceiro. O dono só paga imposto sobre a taxa do salão, economizando até 40% em tributos de forma 100% legal.',
  },
  {
    q: 'Como a IA sabe responder sobre preços, barbeiros e horários livres?',
    a: 'Nossa inteligência artificial é conectada diretamente à sua agenda em tempo real. Ela consulta a disponibilidade de cadeiras, serviços e profissionais em milissegundos e fecha o agendamento em segundos sem você encostar no celular.',
  },
  {
    q: 'E se o cliente mandar áudio com gírias ou falando rápido?',
    a: 'Nossa IA foi treinada especialmente para a rotina de barbearias brasileiras. Ela processa áudios perfeitamente, entende termos reais como "dar um grau", "fade navalhado" ou "corte na régua" e responde com tom educado, amigável e humanizado.',
  },
  {
    q: 'Como o agendamento no Pix elimina o no-show (clientes que faltam)?',
    a: 'Oferecemos 5% a 10% de desconto ou exigimos sinal para quem pagar antecipado no Pix. Como o cliente já investiu o valor, a taxa de comparecimento sobe para 98%. E você não perde a cadeira.',
  },
];

// --- Testimonials Wall ---
const testimonials = [
  {
    name: 'Carlos "Navalha" Mendes',
    role: 'Dono da Barbearia Old School (4 cadeiras)',
    city: 'Belo Horizonte, MG',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    metric: '+ R$ 2.450/mês',
    quote: 'Antes do BarblyClub eu perdia pelo menos 8 cortes todo sábado com clientes que marcavam e não vinham. Hoje com o sinal no Pix antecipado, no-show virou lenda.',
  },
  {
    name: 'Diego Silveira',
    role: 'Sócio-Fundador da Dom Diego Barbershop',
    city: 'Campinas, SP',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    metric: '98% Presença',
    quote: 'A Secretária IA responde os clientes às 23h da noite enquanto estou jantando com a minha família. Acordo no domingo com a agenda da semana toda preenchida.',
  },
  {
    name: 'Lucas Ferreira',
    role: 'Proprietário do Studio Barber Club',
    city: 'Curitiba, PR',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    metric: 'Economia Fiscal',
    quote: 'A divisão automática da Lei do Salão-Parceiro me tirou uma dor de cabeça gigante com contador. Cada barbeiro acompanha sua comissão no próprio celular.',
  },
];

// --- Live Activity Floating Ticker ---
const recentSignups = [
  { name: 'Barbearia Al Capone', city: 'São Paulo, SP', time: 'há 3 minutos', action: 'iniciou o teste de 30 dias' },
  { name: 'Dom Pedro Barber Club', city: 'Belo Horizonte, MG', time: 'há 8 minutos', action: 'recuperou R$ 380 em Pix' },
  { name: 'Navalha Dourada', city: 'Curitiba, PR', time: 'há 14 minutos', action: 'conectou a Secretária IA' },
  { name: 'Vintage Barber House', city: 'Campinas, SP', time: 'há 21 minutos', action: 'iniciou o teste de 30 dias' },
];

const currentTickerIndex = ref(0);
let tickerInterval: any = null;

// --- Sticky Floating Bar on Scroll & ScrollSpy Observer ---
const showStickyCta = ref(false);

function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.value = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
  showStickyCta.value = scrollTop > 550;
  showBackToTop.value = scrollTop > 350;

  // Active section detection
  const sections = ['problema', 'tour', 'calculadora', 'recursos', 'depoimentos', 'precos', 'faq'];
  for (const s of sections) {
    const el = document.getElementById(s);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 240 && rect.bottom >= 240) {
        activeSection.value = s;
        break;
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  tickerInterval = setInterval(() => {
    currentTickerIndex.value = (currentTickerIndex.value + 1) % recentSignups.length;
  }, 6000);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (tickerInterval) clearInterval(tickerInterval);
  if (audioInstance) {
    audioInstance.pause();
    audioInstance = null;
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#07090e] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 font-sans antialiased overflow-x-hidden relative">
    
    <!-- Top Reading Progress Indicator (Sticky 2026 UX) -->
    <div 
      class="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 z-50 transition-all duration-75 ease-out shadow-[0_0_12px_rgba(245,158,11,0.8)]"
      :style="{ width: scrollProgress + '%' }"
    ></div>

    <!-- 2026 Aurora Halos and Mesh Gradients -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[45rem] bg-gradient-to-b from-amber-500/15 via-amber-600/5 to-transparent blur-[160px] pointer-events-none rounded-full"></div>
    <div class="fixed top-1/4 -right-40 w-[32rem] h-[32rem] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full"></div>
    <div class="fixed top-2/3 -left-40 w-[30rem] h-[30rem] bg-amber-600/10 blur-[160px] pointer-events-none rounded-full"></div>

    <!-- Top Urgency Banner -->
    <div class="bg-gradient-to-r from-amber-950/90 via-[#1a1408] to-amber-950/90 border-b border-amber-500/25 py-2.5 px-4 text-center text-xs text-amber-200/90 relative z-40 backdrop-blur-md">
      <div class="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] tracking-wide uppercase animate-pulse">
          ⚡ PROMOÇÃO DE LANÇAMENTO 2026
        </span>
        <span class="font-medium text-[11px] sm:text-xs">
          Ganhe <strong>30 Dias Grátis</strong> com IA no WhatsApp liberada. Sem cartão de crédito!
        </span>
        <button 
          @click="openRegisterModal" 
          class="underline font-bold text-amber-400 hover:text-white transition ml-1 cursor-pointer"
        >
          Garantir Vaga &rarr;
        </button>
      </div>
    </div>

    <!-- Navbar with Smooth Sliding Menu Pill Indicator -->
    <header class="sticky top-0 z-40 backdrop-blur-2xl bg-[#07090e]/85 border-b border-white/[0.08] transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        <!-- BarblyClub Logo -->
        <div @click="scrollToSection('hero')">
          <BarblyClubLogo size="md" />
        </div>

        <!-- Navigation Links with Apple/Linear-Style Sliding Pill -->
        <nav 
          ref="navContainerRef"
          class="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl relative"
          @mouseleave="hoveredNavId = null"
        >
          <!-- The Glowing Sliding Pill Indicator -->
          <div 
            class="absolute top-1.5 bottom-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-400/50 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none -z-0"
            :style="navIndicatorStyle"
          ></div>

          <button 
            v-for="item in navItems" 
            :key="item.id"
            :ref="(el) => setNavButtonRef(el, item.id)"
            @click="scrollToSection(item.id)"
            @mouseenter="hoveredNavId = item.id"
            class="relative z-10 px-4 py-2 rounded-full text-xs font-bold transition-colors duration-200 uppercase tracking-wider cursor-pointer"
            :class="(hoveredNavId || activeSection) === item.id ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'"
          >
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <!-- Right CTAs -->
        <div class="hidden sm:flex items-center gap-3">
          <router-link 
            to="/login" 
            class="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-white/5 transition"
          >
            Entrar
          </router-link>
          <button 
            @click="openRegisterModal"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>30 Dias Grátis</span>
          </button>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button 
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer"
        >
          <X v-if="isMobileMenuOpen" class="w-6 h-6" />
          <Menu v-else class="w-6 h-6" />
        </button>

      </div>

      <!-- Mobile Navigation Drawer with Smooth Slide Transition -->
      <transition 
        enter-active-class="transition duration-200 ease-out" 
        enter-from-class="opacity-0 -translate-y-4" 
        enter-to-class="opacity-100 translate-y-0" 
        leave-active-class="transition duration-150 ease-in" 
        leave-from-class="opacity-100 translate-y-0" 
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div v-if="isMobileMenuOpen" class="lg:hidden bg-[#0a0e17] border-b border-white/[0.08] px-4 pt-2 pb-6 space-y-2">
          <button 
            v-for="item in navItems" 
            :key="item.id"
            @click="scrollToSection(item.id)"
            class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            :class="activeSection === item.id ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-white/5'"
          >
            {{ item.label }}
          </button>
          <div class="pt-3 border-t border-white/[0.08] flex items-center gap-3">
            <router-link to="/login" class="flex-1 text-center py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white">
              Fazer Login
            </router-link>
            <button @click="openRegisterModal" class="flex-1 py-2.5 rounded-xl bg-amber-500 text-[#07090e] text-xs font-black uppercase tracking-wider cursor-pointer">
              30 Dias Grátis
            </button>
          </div>
        </div>
      </transition>
    </header>

    <!-- HERO SECTION: Above the Fold -->
    <section id="hero" class="relative pt-10 pb-20 md:pt-14 md:pb-28 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Live Social Proof Pill -->
        <div class="flex justify-center mb-6">
          <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-slate-300 text-xs font-medium shadow-inner">
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Mais de <strong>420 barbearias</strong> faturando sem faltas</span>
            <span class="text-amber-400 font-bold flex items-center gap-0.5">
              <Star class="w-3.5 h-3.5 fill-amber-400" /> 4.9/5
            </span>
          </div>
        </div>

        <!-- Main Headline -->
        <div class="text-center max-w-4xl mx-auto space-y-5">
          <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]">
            Sua Barbearia no <br class="hidden sm:block">
            <span class="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              Piloto Automático
            </span> com IA no WhatsApp.
          </h1>

          <p class="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            A secretária virtual com <strong>Inteligência Artificial Humanizada</strong> que atende 24h, entende áudios de clientes, recebe no <strong>Pix antecipado</strong> e elimina o no-show enquanto você corta cabelo.
          </p>

          <!-- Core Benefits Pills -->
          <div class="flex items-center justify-center gap-4 sm:gap-6 flex-wrap pt-2 text-xs text-slate-300 font-semibold">
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero No-Show no Pix</span>
            </div>
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sem Cartão de Crédito</span>
            </div>
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Lei do Salão-Parceiro 100% Legal</span>
            </div>
          </div>
        </div>

        <!-- HERO SPLIT: Interactive Quick Signup + WhatsApp Interactive Simulator -->
        <div class="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <!-- LEFT (7 cols): Instant Quick Registration Box -->
          <div class="lg:col-span-7 bg-gradient-to-br from-[#121824] via-[#0d121c] to-[#0a0e17] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-500/5 relative overflow-hidden">
            <div class="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="space-y-4 mb-6">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Sparkles class="w-3.5 h-3.5" />
                <span>30 Dias de Teste Grátis • Ativação em 1 Minuto</span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Comece agora sem pagar nada
              </h2>
              <p class="text-xs sm:text-sm text-slate-400">
                Preencha os dados da sua barbearia para ativar seu link exclusivo e testar a secretária IA no seu WhatsApp:
              </p>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {{ errorMessage }}
            </div>

            <!-- Instant Registration Form (Consistent Dark Themed Inputs) -->
            <form @submit.prevent="handleRegister" class="space-y-3.5">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Seu Nome Completo</label>
                  <div class="relative">
                    <User class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      v-model="ownerName"
                      type="text" 
                      required
                      placeholder="Ex: Diego Silveira"
                      class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Nome da Barbearia</label>
                  <div class="relative">
                    <Building class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      v-model="barberShopName"
                      type="text" 
                      required
                      placeholder="Ex: Barbearia Dom Diego"
                      class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">WhatsApp da Barbearia</label>
                  <div class="relative">
                    <Phone class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      v-model="phone"
                      type="tel" 
                      required
                      placeholder="(11) 98888-7777"
                      class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Seu Melhor E-mail</label>
                  <div class="relative">
                    <Mail class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      v-model="email"
                      type="email" 
                      required
                      placeholder="seu@barbearia.com"
                      class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Crie sua Senha de Acesso</label>
                <div class="relative">
                  <Lock class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    v-model="password"
                    type="password" 
                    required
                    minlength="6"
                    placeholder="Mínimo de 6 dígitos"
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>
              </div>

              <!-- Main Registration CTA -->
              <div class="pt-2">
                <button 
                  type="submit" 
                  :disabled="loading"
                  class="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span v-if="!loading">🚀 Ativar Meus 30 Dias Grátis Agora</span>
                  <span v-else class="flex items-center gap-2">
                    <span class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    Criando seu ambiente seguro...
                  </span>
                  <ArrowRight v-if="!loading" class="w-4 h-4" />
                </button>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                <span class="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck class="w-3.5 h-3.5" /> Sem fidelidade, cancele quando quiser
                </span>
                <span>Sem necessidade de cartão</span>
              </div>
            </form>
          </div>

          <!-- RIGHT (5 cols): WhatsApp Interactive Simulator Sandbox -->
          <div class="lg:col-span-5 flex flex-col items-center">
            
            <!-- Interactive Scenario Switcher Menu Above Phone -->
            <div class="w-full max-w-[340px] mb-3">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 text-center">
                👉 Clique nos botões para testar a IA ao vivo:
              </span>
              <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <button 
                  @click="setScenario('AUDIO')"
                  class="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="activeScenario === 'AUDIO' ? 'bg-amber-500 text-[#07090e] shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'"
                >
                  <Mic class="w-3 h-3" />
                  <span>1. Áudio de Cliente</span>
                </button>

                <button 
                  @click="setScenario('PIX')"
                  class="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="activeScenario === 'PIX' ? 'bg-emerald-500 text-[#07090e] shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
                >
                  <Zap class="w-3 h-3" />
                  <span>2. Pix com Desconto</span>
                </button>

                <button 
                  @click="setScenario('FOTOS')"
                  class="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="activeScenario === 'FOTOS' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-white'"
                >
                  <ImageIcon class="w-3 h-3" />
                  <span>3. Fotos de Cortes</span>
                </button>

                <button 
                  @click="setScenario('LEMBRETE')"
                  class="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  :class="activeScenario === 'LEMBRETE' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'"
                >
                  <CalendarCheck class="w-3 h-3" />
                  <span>4. Lembrete 2h</span>
                </button>
              </div>
            </div>

            <!-- Phone Frame -->
            <div class="w-full max-w-[340px] rounded-[42px] p-3 bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-2xl border-4 border-slate-700/60 relative">
              
              <!-- Dynamic Island / Speaker Notch -->
              <div class="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></span>
              </div>

              <!-- Phone Screen (WhatsApp Interface) -->
              <div class="rounded-[32px] bg-[#0b141a] overflow-hidden border border-white/10 flex flex-col h-[480px]">
                
                <!-- WhatsApp Top Header -->
                <div class="bg-[#202c33] px-3 py-2.5 flex items-center justify-between border-b border-white/5">
                  <div class="flex items-center gap-2">
                    <img 
                      src="/emblem-barblyclub.png" 
                      alt="BarblyClub" 
                      class="w-8 h-8 rounded-full object-contain p-1 bg-amber-500/15 border border-amber-500/40 shadow shrink-0" 
                    />
                    <div>
                      <span class="text-xs font-bold text-white block">Secretária BarblyClub</span>
                      <span class="text-[9px] text-emerald-400 font-medium flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span v-if="!isSimulatingTyping">Online • Resposta em 0.6s</span>
                        <span v-else class="text-amber-300 font-bold">Digitando resposta...</span>
                      </span>
                    </div>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">22:42</span>
                </div>

                <!-- Chat Messages Scroll Area with Smooth Transition -->
                <div class="flex-1 p-3 space-y-3 overflow-y-auto text-[11px]">
                  
                  <!-- Typing indicator when switching scenarios -->
                  <div v-if="isSimulatingTyping" class="flex justify-start animate-fade-in">
                    <div class="bg-[#202c33] text-slate-300 p-2 rounded-xl flex items-center gap-1 text-[10px]">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"></span>
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce delay-100"></span>
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce delay-200"></span>
                    </div>
                  </div>

                  <!-- SCENARIO 1: AUDIO NOTE -->
                  <div v-else-if="activeScenario === 'AUDIO'" class="space-y-3 animate-fade-in">
                    <!-- Client Audio Note -->
                    <div class="flex justify-end">
                      <div class="bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-none w-64 shadow space-y-1.5">
                        <div class="flex items-center gap-2">
                          <button 
                            @click="toggleAudio"
                            class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0 cursor-pointer"
                          >
                            <Pause v-if="isAudioPlaying" class="w-3.5 h-3.5 text-white" />
                            <Play v-else class="w-3.5 h-3.5 text-white ml-0.5" />
                          </button>
                          
                          <!-- Waveform Bars -->
                          <div class="flex-1 flex items-center gap-1 h-5">
                            <span class="w-1 bg-white/70 rounded-full transition-all" :class="isAudioPlaying ? 'h-4 animate-bounce' : 'h-2'"></span>
                            <span class="w-1 bg-white/90 rounded-full transition-all" :class="isAudioPlaying ? 'h-5 animate-pulse' : 'h-3'"></span>
                            <span class="w-1 bg-white/60 rounded-full transition-all" :class="isAudioPlaying ? 'h-3 animate-bounce' : 'h-1.5'"></span>
                            <span class="w-1 bg-white/80 rounded-full transition-all" :class="isAudioPlaying ? 'h-4 animate-pulse' : 'h-2.5'"></span>
                            <span class="w-1 bg-white/50 rounded-full transition-all" :class="isAudioPlaying ? 'h-2 animate-bounce' : 'h-1'"></span>
                            <span class="w-1 bg-white/90 rounded-full transition-all" :class="isAudioPlaying ? 'h-5 animate-pulse' : 'h-3.5'"></span>
                          </div>
                          <span class="text-[9px] text-slate-300 font-mono">0:14</span>
                        </div>

                        <div class="text-[9px] text-emerald-200 bg-black/20 p-1.5 rounded font-sans">
                          🎤 <em>"Opa irmão! Tem horário pro Diego hoje depois das 18h corte e barba?"</em>
                        </div>
                      </div>
                    </div>

                    <!-- AI Transcription & Immediate Offer -->
                    <div class="flex justify-start">
                      <div class="bg-[#202c33] text-white p-2.5 rounded-2xl rounded-tl-none max-w-[88%] space-y-1.5 shadow">
                        <div class="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                          <Sparkles class="w-3 h-3" /> IA BarblyClub (0.6s)
                        </div>
                        <p>
                          Fala Arthur! O Diego tem horário hoje às <strong>18:30</strong> para Combo Cabelo + Barba (R$ 70).
                        </p>
                        <p class="text-emerald-400 font-semibold">
                          ⚡ Pagando no Pix antecipado sai por apenas R$ 63,00!
                        </p>
                        <span class="text-[9px] text-slate-400 block text-right">22:42</span>
                      </div>
                    </div>

                    <!-- Client Confirms -->
                    <div class="flex justify-end">
                      <div class="bg-[#005c4b] text-white p-2 rounded-2xl rounded-tr-none max-w-[80%] shadow">
                        <span>Manda o Pix aí que já pago e garanto minha cadeira!</span>
                        <span class="text-[9px] text-slate-300 block text-right mt-0.5">22:43</span>
                      </div>
                    </div>
                  </div>

                  <!-- SCENARIO 2: PIX CHECKOUT -->
                  <div v-else-if="activeScenario === 'PIX'" class="space-y-3 animate-fade-in">
                    <div class="flex justify-start">
                      <div class="bg-[#202c33] text-white p-2.5 rounded-2xl rounded-tl-none max-w-[92%] space-y-2 border border-emerald-500/30 shadow">
                        <div class="flex items-center justify-between text-emerald-400 font-bold text-[10px]">
                          <span>⚡ PIX COPIA E COLA GERADO</span>
                          <span>R$ 63,00</span>
                        </div>
                        <p class="text-[10px] text-slate-300">
                          Horário reservado por 15 min. Copie o código abaixo e pague no app do seu banco:
                        </p>
                        <div class="bg-[#111b21] p-1.5 rounded-lg font-mono text-[9px] text-slate-400 truncate">
                          00020126580014br.gov.bcb.pix0136barblyclub-pix...
                        </div>
                        <button 
                          @click="copyPixCode" 
                          class="w-full py-1.5 rounded-lg bg-emerald-500 text-[#07090e] font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 hover:opacity-90 transition cursor-pointer"
                        >
                          <Check v-if="copiedPix" class="w-3 h-3" />
                          <Copy v-else class="w-3 h-3" />
                          <span>{{ copiedPix ? 'Código Copiado!' : 'Copiar Chave Pix' }}</span>
                        </button>
                        <span class="text-[9px] text-slate-400 block text-right">22:43</span>
                      </div>
                    </div>

                    <div class="flex justify-start">
                      <div class="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5">
                        <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Pagamento confirmado! Cadeira bloqueada na agenda.</span>
                      </div>
                    </div>
                  </div>

                  <!-- SCENARIO 3: FOTOS DE PORTFÓLIO -->
                  <div v-else-if="activeScenario === 'FOTOS'" class="space-y-3 animate-fade-in">
                    <div class="flex justify-end">
                      <div class="bg-[#005c4b] text-white p-2 rounded-2xl rounded-tr-none max-w-[80%] shadow">
                        <span>Vocês fazem fade navalhado? Manda fotos pra ver!</span>
                        <span class="text-[9px] text-slate-300 block text-right mt-0.5">14:15</span>
                      </div>
                    </div>

                    <div class="flex justify-start">
                      <div class="bg-[#202c33] text-white p-2.5 rounded-2xl rounded-tl-none max-w-[92%] space-y-2 shadow">
                        <div class="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                          <Sparkles class="w-3 h-3" /> IA BarblyClub
                        </div>
                        <p class="text-[10px]">
                          Com certeza! Dá uma olhada nesses 2 trabalhos feitos ontem pelo barbeiro Rafael:
                        </p>
                        <div class="grid grid-cols-2 gap-1.5">
                          <div class="rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&q=80" alt="Degradê" class="w-full h-16 object-cover" />
                            <span class="block text-[8px] font-bold p-1 text-center text-slate-300">Degradê Navalhado</span>
                          </div>
                          <div class="rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            <img src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=200&q=80" alt="Barba Terapia" class="w-full h-16 object-cover" />
                            <span class="block text-[8px] font-bold p-1 text-center text-slate-300">Barboterapia</span>
                          </div>
                        </div>
                        <span class="text-[9px] text-slate-400 block text-right">14:15</span>
                      </div>
                    </div>
                  </div>

                  <!-- SCENARIO 4: LEMBRETE ANTI NO-SHOW -->
                  <div v-else-if="activeScenario === 'LEMBRETE'" class="space-y-3 animate-fade-in">
                    <div class="flex justify-start">
                      <div class="bg-[#202c33] text-white p-2.5 rounded-2xl rounded-tl-none max-w-[90%] space-y-1.5 border border-blue-500/30 shadow">
                        <div class="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                          <Clock class="w-3 h-3" /> Lembrete Automático (2h antes)
                        </div>
                        <p class="text-[10px]">
                          Fala Lucas! Seu corte com Diego está marcado para hoje às <strong>19:00</strong>.
                        </p>
                        <p class="text-[9px] text-slate-300">
                          Responda <strong>1</strong> para Confirmar ou <strong>2</strong> para Remarcar.
                        </p>
                        <span class="text-[9px] text-slate-400 block text-right">17:00</span>
                      </div>
                    </div>

                    <div class="flex justify-end">
                      <div class="bg-[#005c4b] text-white p-2 rounded-2xl rounded-tr-none max-w-[80%] shadow">
                        <span>1 confirmado já tô a caminho!</span>
                        <span class="text-[9px] text-slate-300 block text-right mt-0.5">17:02</span>
                      </div>
                    </div>

                    <div class="flex justify-start">
                      <div class="bg-[#202c33] text-white p-2 rounded-2xl rounded-tl-none max-w-[85%] shadow">
                        <span class="text-[10px]">Show de bola! Te esperamos às 19h com a cerveja gelada. 💈</span>
                        <span class="text-[9px] text-slate-400 block text-right mt-0.5">17:02</span>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- Chat Footer Audio CTA -->
                <div class="p-2.5 bg-[#1f2c34] text-center border-t border-white/5">
                  <button 
                    v-if="activeScenario === 'AUDIO'"
                    @click="toggleAudio"
                    class="text-[10px] text-amber-300 font-bold flex items-center justify-center gap-1.5 w-full hover:text-white transition cursor-pointer"
                  >
                    <Volume2 class="w-3.5 h-3.5 text-amber-400" />
                    <span>{{ isAudioPlaying ? 'Pausar áudio falado' : 'Clique para ouvir o áudio falado pelo cliente' }}</span>
                  </button>
                  <span v-else class="text-[10px] text-slate-400 font-medium">
                    Atendimento inteligente com latência de 0.6s
                  </span>
                </div>
              </div>
            </div>

            <span class="text-[11px] text-slate-400 mt-3 text-center">
              Conexão rápida e segura via QR Code diretamente no seu próprio número.
            </span>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 1: THE NO-SHOW PROBLEM (Antes vs Depois com Switcher Interativo) -->
    <section id="problema" class="py-20 bg-slate-900/40 border-y border-white/[0.06]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
            A Matemática do Prejuízo
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Você sabe quanto dinheiro sua barbearia perde todo mês com clientes que faltam?
          </h2>
          <p class="text-sm sm:text-base text-slate-400">
            No Brasil, a taxa média de no-show em barbearias é de 22%. Um cliente que marca e não aparece custa o corte, a comissão do barbeiro e a cadeira ociosa.
          </p>

          <!-- Interactive View Mode Switcher -->
          <div class="pt-4 flex justify-center">
            <div class="inline-flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] relative">
              <button 
                @click="setComparisonView('SPLIT')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="comparisonView === 'SPLIT' ? 'bg-amber-500 text-[#07090e] shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'"
              >
                Lado a Lado
              </button>
              <button 
                @click="setComparisonView('BEFORE')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="comparisonView === 'BEFORE' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-white'"
              >
                O Jeito Antigo
              </button>
              <button 
                @click="setComparisonView('AFTER')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="comparisonView === 'AFTER' ? 'bg-emerald-500 text-[#07090e] shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
              >
                Com BarblyClub
              </button>
            </div>
          </div>
        </div>

        <!-- Comparison Cards with Transition -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto transition-all">
          
          <!-- O Jeito Antigo -->
          <div 
            v-if="comparisonView === 'SPLIT' || comparisonView === 'BEFORE'"
            class="bg-rose-950/20 border-2 border-dashed border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-5 transition-all duration-300"
            :class="comparisonView === 'BEFORE' ? 'md:col-span-2 max-w-2xl mx-auto' : ''"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                ✕
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">O Jeito Antigo (Sem BarblyClub)</h3>
                <span class="text-xs text-rose-400 font-semibold">Prejuízo silencioso todos os dias</span>
              </div>
            </div>

            <ul class="space-y-3.5 text-xs text-slate-300">
              <li class="flex items-start gap-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span>Cliente manda WhatsApp às 23h, ninguém responde e ele corta no concorrente no dia seguinte.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span>O barbeiro interrompe o corte para ouvir áudios longos de clientes querendo saber preços.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span>O cliente agenda sem compromisso e simplesmente não aparece. Você perde R$ 45 a R$ 90 na hora.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="text-rose-400 font-bold shrink-0">✕</span>
                <span>Sábado à noite é um pesadelo: horas calculando comissão de cada barbeiro na ponta do lápis.</span>
              </li>
            </ul>
          </div>

          <!-- O Jeito BarblyClub -->
          <div 
            v-if="comparisonView === 'SPLIT' || comparisonView === 'AFTER'"
            class="bg-emerald-950/20 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-5 relative shadow-xl shadow-emerald-500/5 transition-all duration-300"
            :class="comparisonView === 'AFTER' ? 'md:col-span-2 max-w-2xl mx-auto' : ''"
          >
            <div class="absolute -top-3 right-6 bg-emerald-500 text-[#07090e] font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full">
              Padrão 2026
            </div>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">O Jeito BarblyClub (Com IA e Pix)</h3>
                <span class="text-xs text-emerald-400 font-semibold">Lucro máximo e zero estresse</span>
              </div>
            </div>

            <ul class="space-y-3.5 text-xs text-slate-200">
              <li class="flex items-start gap-2.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>IA Humanizada responde em 0.6s a qualquer hora, envia fotos dos cortes e fecha a venda.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>O barbeiro trabalha focado com a tesoura enquanto a agenda enche sozinha no automático.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>O cliente paga sinal ou 100% no Pix. Faltas caem em 92% porque o horário já está pago.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Split automático da Lei do Salão-Parceiro: cada um recebe sua parte certinha sem briga.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 2: INTERACTIVE PRODUCT TOUR TABS (Responsive Grid & No Scrollbars) -->
    <section id="tour" class="py-20 bg-[#0a0e17] border-b border-white/[0.06] relative">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
            Tour Interativo do Produto
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Veja a tecnologia trabalhando na prática
          </h2>
          <p class="text-sm text-slate-400">
            Alterne entre as abas abaixo para ver como cada ferramenta funciona dentro da sua barbearia:
          </p>
        </div>

        <!-- Tour Tabs Header: Responsive Grid with Vibrant Active Styling & Zero Horizontal Scrollbar -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 max-w-4xl mx-auto mb-10 p-1.5 rounded-2xl bg-[#0a0e17]/80 border border-white/[0.08] backdrop-blur-xl no-scrollbar">
          <button 
            v-for="tab in tourTabs"
            :key="tab.id"
            @click="selectTourTab(tab.id as TourTab)"
            class="relative px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border"
            :class="activeTourTab === tab.id ? [
              tab.accent === 'amber' ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-[#07090e] font-black border-amber-300 shadow-lg shadow-amber-500/25 scale-[1.02]' : '',
              tab.accent === 'emerald' ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-[#07090e] font-black border-emerald-300 shadow-lg shadow-emerald-500/25 scale-[1.02]' : '',
              tab.accent === 'purple' ? 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600 text-white font-black border-purple-300 shadow-lg shadow-purple-500/25 scale-[1.02]' : '',
              tab.accent === 'blue' ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 text-white font-black border-blue-300 shadow-lg shadow-blue-500/25 scale-[1.02]' : '',
            ] : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06] border-white/[0.05]'"
          >
            <component :is="tab.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tour Tab Contents with Rich Slide Transitions -->
        <transition 
          name="tab-slide"
          mode="out-in"
        >
          
          <!-- TAB 1: IA WhatsApp Details -->
          <div v-if="activeTourTab === 'IA_WHATSAPP'" key="ia" class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs">
                <Sparkles class="w-3.5 h-3.5" /> Inteligência Artificial Especializada em Barbearias
              </span>
              <h3 class="text-2xl font-bold text-white tracking-tight">
                Nunca mais perca um cliente que manda mensagem fora de hora
              </h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Pesquisas mostram que 34% dos agendamentos em barbearias são solicitados à noite ou aos domingos. Com a nossa secretária virtual, o cliente recebe resposta em 1 segundo e tem o corte confirmado na hora.
              </p>
              <ul class="space-y-2 text-xs text-slate-300">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Transcrição automática de áudios de clientes
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Envio de fotos dos cortes dos seus barbeiros
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Lembrete automático 2h antes para confirmar presença
                </li>
              </ul>
              <button @click="openRegisterModal" class="px-6 py-2.5 rounded-xl bg-amber-500 text-[#07090e] font-black text-xs uppercase tracking-wider hover:opacity-95 transition cursor-pointer">
                Testar Secretária IA por 30 Dias
              </button>
            </div>
            
            <div class="bg-slate-900/80 p-5 rounded-2xl border border-white/5 space-y-3 font-mono text-xs shadow-inner">
              <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Console da IA em Tempo Real</span>
                <span class="text-emerald-400">STATUS: CONECTADO</span>
              </div>
              <div class="p-3 bg-black/40 rounded-xl space-y-1.5 border border-white/5 text-[11px]">
                <span class="text-amber-400 font-bold">[Motor de IA]:</span> Áudio do cliente processado: "Corte e barba com Diego".
                <span class="text-slate-400 block">[Consulta de Agenda]: Horário livre confirmado às 18:30 (Cadeira 1).</span>
                <span class="text-emerald-400 block">[Pix Anti-Falta]: Chave Pix Copia e Cola gerada com 10% de desconto.</span>
                <span class="text-purple-400 block">[WhatsApp Conexão]: Resposta enviada ao cliente em 0.6s.</span>
              </div>
            </div>
          </div>

          <!-- TAB 2: Pix Anti No-Show -->
          <div v-else-if="activeTourTab === 'PIX_CHECKOUT'" key="pix" class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                <Zap class="w-3.5 h-3.5" /> Fim do Calote e das Faltas
              </span>
              <h3 class="text-2xl font-bold text-white tracking-tight">
                O cliente paga no Pix e garante o horário com desconto
              </h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Você pode configurar desconto de 5% ou 10% para quem pagar antecipado no Pix, ou exigir uma taxa de reserva (sinal). Como o cliente já pagou, a chance dele faltar cai para menos de 2%.
              </p>
              <div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-semibold space-y-1">
                <span class="block font-bold">💡 Por que funciona tão bem?</span>
                <span>O cliente adora pagar mais barato pelo Pix e você nunca mais tem horário ocioso na sua grade.</span>
              </div>
            </div>

            <!-- Interactive Pix Simulator -->
            <div class="bg-slate-900/90 p-6 rounded-2xl border border-white/10 space-y-4 text-center">
              <span class="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Simulação de Checkout Pix
              </span>
              <div class="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div class="text-sm font-bold text-white">Combo Cabelo + Barba Premium</div>
                <div class="text-2xl font-black text-emerald-400">R$ 63,00 <span class="text-xs text-slate-400 font-normal line-through">R$ 70,00</span></div>
                <div class="text-[10px] text-amber-400 font-bold">10% DE DESCONTO NO PIX APLICADO</div>
              </div>

              <div v-if="!simulatedPixPaid">
                <button 
                  @click="simulatePixPayment"
                  class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
                >
                  ⚡ Simular Pagamento Pix (1 Clique)
                </button>
              </div>
              <div v-else class="space-y-2">
                <div class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 class="w-4 h-4" />
                  <span>PAGO E CONFIRMADO NO BANCO!</span>
                </div>
                <button 
                  @click="resetSimulatePix" 
                  class="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Testar novamente
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 3: Salão-Parceiro Interactive Split -->
          <div v-else-if="activeTourTab === 'SALAO_PARCEIRO'" key="split" class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs">
                <Split class="w-3.5 h-3.5" /> Lei Federal 13.352
              </span>
              <h3 class="text-2xl font-bold text-white tracking-tight">
                Divisão de comissão automática e economia tributária
              </h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Cada barbeiro vê o saldo que tem a receber em tempo real no próprio celular. Na hora do repasse, o sistema emite o extrato detalhado pronto para a contabilidade.
              </p>
              <div class="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-xs text-purple-300 font-semibold space-y-1">
                <span>🛡️ <strong>Segurança Fiscal:</strong> O dono da barbearia só paga imposto sobre a taxa de salão, não sobre o valor bruto do corte.</span>
              </div>
            </div>

            <!-- Split Simulator -->
            <div class="bg-slate-900/90 p-6 rounded-2xl border border-white/10 space-y-4">
              <span class="text-xs font-bold text-slate-400 block uppercase tracking-wider text-center">
                Simulador de Rateio Automático
              </span>

              <div class="space-y-3">
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Valor do Serviço:</span>
                  <strong class="text-white">R$ {{ splitServicePrice }}</strong>
                </div>
                <input v-model.number="splitServicePrice" type="range" min="30" max="150" class="w-full accent-purple-500 cursor-pointer" />

                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Comissão do Barbeiro:</span>
                  <strong class="text-purple-400">{{ splitBarberPercent }}%</strong>
                </div>
                <input v-model.number="splitBarberPercent" type="range" min="30" max="70" class="w-full accent-purple-500 cursor-pointer" />
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
                <div class="p-2.5 bg-black/40 rounded-xl">
                  <span class="text-[10px] text-slate-400 block">Barbearia (Taxa):</span>
                  <strong class="text-sm font-black text-white">R$ {{ splitSalonShare.toFixed(2) }}</strong>
                </div>
                <div class="p-2.5 bg-black/40 rounded-xl">
                  <span class="text-[10px] text-slate-400 block">Barbeiro Parceiro:</span>
                  <strong class="text-sm font-black text-purple-400">R$ {{ splitBarberShare.toFixed(2) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4: Instagram Web App Link -->
          <div v-else-if="activeTourTab === 'PWA_INSTAGRAM'" key="pwa" class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs">
                <Smartphone class="w-3.5 h-3.5" /> Página Web Exclusiva
              </span>
              <h3 class="text-2xl font-bold text-white tracking-tight">
                Seu link de agendamento perfeito para a bio do Instagram
              </h3>
              <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sua barbearia ganha um endereço próprio (ex: <code>barblyclub.com.br/cliente/suabarbearia</code>). O cliente abre no celular, vê os profissionais, escolhe o melhor horário e agenda em menos de 30 segundos sem precisar instalar nada da App Store.
              </p>
              <div class="flex items-center gap-2 text-xs text-blue-400 font-bold">
                <CheckCircle2 class="w-4 h-4" /> 100% responsivo e otimizado para celulares
              </div>
            </div>

            <div class="bg-slate-900/90 p-5 rounded-2xl border border-white/10 text-center space-y-3">
              <span class="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Visualização do Link da sua Barbearia
              </span>
              <div class="p-3 bg-black/50 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs text-amber-300">
                <span class="truncate">barblyclub.com.br/cliente/dom-lucas</span>
                <span class="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-400 font-bold">ONLINE</span>
              </div>
              <p class="text-[11px] text-slate-400">
                Coloque na biografia do Instagram e receba agendamentos no automático todos os dias.
              </p>
            </div>
          </div>

        </transition>

      </div>
    </section>

    <!-- SECTION 3: INTERACTIVE ROI CALCULATOR -->
    <section id="calculadora" class="py-20 relative overflow-hidden">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-b from-[#131926] to-[#0d121c] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
          
          <div class="text-center max-w-2xl mx-auto space-y-2 mb-10">
            <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
              Simulador Financeiro em Tempo Real
            </span>
            <h2 class="text-2xl sm:text-3xl font-black text-white">
              Calcule quanto dinheiro o BarblyClub vai colocar no seu bolso
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">
              Arraste os controles abaixo conforme os números da sua barbearia hoje:
            </p>
          </div>

          <!-- Sliders Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <!-- Slider 1 -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400 font-semibold">Cortes por dia:</span>
                <span class="text-white font-black text-sm">{{ dailyClients }}</span>
              </div>
              <input 
                v-model.number="dailyClients" 
                type="range" 
                min="5" 
                max="80" 
                class="w-full accent-amber-500 cursor-pointer"
              />
              <span class="text-[10px] text-slate-500 block text-right">Média de atendimentos</span>
            </div>

            <!-- Slider 2 -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400 font-semibold">Preço médio do corte:</span>
                <span class="text-amber-400 font-black text-sm">R$ {{ averageTicket }}</span>
              </div>
              <input 
                v-model.number="averageTicket" 
                type="range" 
                min="25" 
                max="120" 
                class="w-full accent-amber-500 cursor-pointer"
              />
              <span class="text-[10px] text-slate-500 block text-right">Valor por cliente</span>
            </div>

            <!-- Slider 3 -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400 font-semibold">Faltas por semana:</span>
                <span class="text-rose-400 font-black text-sm">{{ weeklyNoShows }} clientes</span>
              </div>
              <input 
                v-model.number="weeklyNoShows" 
                type="range" 
                min="1" 
                max="25" 
                class="w-full accent-rose-500 cursor-pointer"
              />
              <span class="text-[10px] text-slate-500 block text-right">No-shows semanais</span>
            </div>
          </div>

          <!-- Calculated Results Highlight Box -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border border-amber-500/30 text-center">
            <div class="p-3">
              <span class="text-[11px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                Prejuízo Atual com Faltas
              </span>
              <strong class="text-2xl sm:text-3xl font-black text-rose-400 block">
                - R$ {{ monthlyLoss.toLocaleString('pt-BR') }}
              </strong>
              <span class="text-[10px] text-slate-400">dinheiro perdido por mês</span>
            </div>

            <div class="p-3 border-y md:border-y-0 md:border-x border-white/10">
              <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Lucro Recuperado com BarblyClub
              </span>
              <strong class="text-2xl sm:text-3xl font-black text-emerald-400 block">
                + R$ {{ monthlyRecovered.toLocaleString('pt-BR') }}
              </strong>
              <span class="text-[10px] text-slate-300 font-semibold">a mais no seu caixa todo mês</span>
            </div>

            <div class="p-3">
              <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Impacto Anual no seu Negócio
              </span>
              <strong class="text-2xl sm:text-3xl font-black text-amber-300 block">
                + R$ {{ annualRecovered.toLocaleString('pt-BR') }}
              </strong>
              <span class="text-[10px] text-slate-400">em 1 ano de uso</span>
            </div>
          </div>

          <!-- Calculator CTA -->
          <div class="mt-8 text-center">
            <button 
              @click="openRegisterModal"
              class="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Quero Recuperar Esse Dinheiro • Testar 30 Dias Grátis</span>
              <ArrowRight class="w-4 h-4" />
            </button>
            <span class="block text-[11px] text-slate-500 mt-2">
              Teste sem custo por 30 dias. A ferramenta se paga logo na primeira semana.
            </span>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 4: BENTO GRID 2026 (Recursos Tecnológicos) -->
    <section id="recursos" class="py-20 bg-slate-900/30 border-y border-white/[0.06]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
            Engenharia de Ponta
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tudo o que sua barbearia precisa em um único sistema
          </h2>
          <p class="text-sm text-slate-400">
            Esqueça 5 ferramentas separadas. Unificamos o WhatsApp, a agenda, os pagamentos Pix e o financeiro em uma plataforma veloz.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- Bento 1: Large Span 2 -->
          <div class="md:col-span-2 bg-[#0e131d] border border-white/[0.08] rounded-3xl p-8 hover:border-amber-500/40 transition group relative overflow-hidden">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
              <MessageSquare class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">
              Secretária Virtual com Inteligência Artificial Humanizada
            </h3>
            <p class="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Nossa IA fala a língua da sua barbearia: entende áudios de clientes, sabe o que é "fade navalhado", "barboterapia" ou "platinado", envia fotos de portfólio dos seus barbeiros e fecha o agendamento em segundos.
            </p>
            <div class="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
              <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">Áudio e Texto 24/7</span>
              <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">Fotos dos Trabalhos</span>
              <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">Latência de 0.6s</span>
            </div>
          </div>

          <!-- Bento 2: Span 1 -->
          <div class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-8 hover:border-emerald-500/40 transition group">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
              <Zap class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">
              Pix Instantâneo Anti No-Show
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              O cliente recebe o Pix Copia e Cola na hora no WhatsApp. O webhook compensa o pagamento em milissegundos e bloqueia o horário na agenda sem você fazer nada.
            </p>
          </div>

          <!-- Bento 3: Span 1 -->
          <div class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-8 hover:border-purple-500/40 transition group">
            <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5">
              <Split class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">
              Lei do Salão-Parceiro Automática
            </h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Cálculo automático do rateio de cada corte. Fim das discussões de comissão e segurança jurídica para o dono não pagar imposto indevido.
            </p>
          </div>

          <!-- Bento 4: Large Span 2 -->
          <div class="md:col-span-2 bg-[#0e131d] border border-white/[0.08] rounded-3xl p-8 hover:border-amber-500/40 transition group">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
              <RotateCcw class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">
              Robô de Recuperação de Clientes Sumidos (Anti-Churn)
            </h3>
            <p class="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Quando o cliente passa de 25 dias sem cortar o cabelo, o sistema dispara automaticamente uma mensagem amigável com um cupom especial para trazê-lo de volta para a cadeira. Em média, 41% dos clientes voltam a agendar.
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 5: SOCIAL PROOF & TESTIMONIALS (Resultados Reais) -->
    <section id="depoimentos" class="py-20 bg-[#07090e] border-b border-white/[0.06] relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
            Quem Usa Recomenda
          </span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Barbearias que dobraram o lucro com o BarblyClub
          </h2>
          <p class="text-sm text-slate-400">
            Mais de 420 donos de barbearia já confiam na nossa IA para gerenciar agendamentos e faturamento:
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div 
            v-for="(t, idx) in testimonials" 
            :key="idx"
            class="bg-[#0e131d] border border-white/[0.08] rounded-3xl p-7 flex flex-col justify-between hover:border-amber-500/30 transition shadow-lg relative group"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1 text-amber-400">
                  <Star v-for="i in 5" :key="i" class="w-4 h-4 fill-amber-400" />
                </div>
                <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {{ t.metric }}
                </span>
              </div>
              
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "{{ t.quote }}"
              </p>
            </div>

            <div class="pt-6 border-t border-white/5 flex items-center gap-3 mt-6">
              <img :src="t.avatar" :alt="t.name" class="w-10 h-10 rounded-full object-cover border border-amber-500/40" />
              <div>
                <strong class="text-xs font-bold text-white block">{{ t.name }}</strong>
                <span class="text-[10px] text-slate-400 block">{{ t.role }}</span>
                <span class="text-[9px] text-amber-400/80">{{ t.city }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- SECTION 6: PRICING WITH ANIMATED SLIDING TOGGLE -->
    <section id="precos" class="py-24 relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span class="text-xs font-bold uppercase tracking-widest text-emerald-400 block">
            Planos Sem Pegadinhas
          </span>
          <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Teste Grátis por 30 Dias.<br>
            Cancele se não dobrar sua tranquilidade.
          </h2>
          <p class="text-sm text-slate-400">
            Você não paga nada hoje. Nenhum centavo será cobrado durante o período de teste.
          </p>

          <!-- Annual vs Monthly Segmented Sliding Toggle (Pixel-Perfect Equal Widths) -->
          <div class="inline-flex items-center p-1 rounded-full bg-[#0a0e17] border border-white/[0.1] mt-4 relative">
            <!-- Sliding Indicator -->
            <div 
              class="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-md shadow-amber-500/25 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              :style="{
                left: isAnnual ? 'calc(50% + 1px)' : '4px',
                width: 'calc(50% - 5px)',
              }"
            ></div>

            <button 
              @click="togglePricing(false)"
              class="relative z-10 w-36 sm:w-44 py-2.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center"
              :class="!isAnnual ? 'text-[#07090e] font-black' : 'text-slate-400 hover:text-white'"
            >
              <span>Mensal</span>
            </button>

            <button 
              @click="togglePricing(true)"
              class="relative z-10 w-36 sm:w-44 py-2.5 rounded-full text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              :class="isAnnual ? 'text-[#07090e] font-black' : 'text-slate-400 hover:text-white'"
            >
              <span>Anual</span>
              <span 
                class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full transition-colors duration-200"
                :class="isAnnual ? 'bg-[#07090e] text-emerald-400 shadow-sm' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'"
              >
                2 Meses Off
              </span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <!-- Plano Solo -->
          <div class="bg-[#0e131d] rounded-3xl border border-white/[0.08] p-8 flex flex-col justify-between hover:border-slate-700 transition">
            <div class="space-y-4">
              <h4 class="text-lg font-bold text-white">Barbeiro Solo</h4>
              <p class="text-xs text-slate-400">Para profissionais autônomos que atendem sozinhos na cadeira.</p>
              
              <div class="py-2">
                <span class="text-4xl font-black text-white">
                  R$ {{ isAnnual ? '49' : '59' }}
                </span>
                <span class="text-xs text-slate-400 font-semibold">/mês após o teste</span>
              </div>

              <ul class="space-y-3 pt-4 border-t border-white/[0.06] text-xs text-slate-300">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> 1 Barbeiro ativo
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Link de Agendamento para Instagram
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Agendamento com Pix integrado
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Lembrete de agendamento por WhatsApp
                </li>
              </ul>
            </div>

            <button 
              @click="openRegisterModal"
              class="mt-8 w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs transition cursor-pointer"
            >
              Testar 30 Dias Grátis
            </button>
          </div>

          <!-- Plano Profissional + IA (Mais Escolhido) -->
          <div class="relative bg-gradient-to-b from-[#182133] to-[#0e131d] rounded-3xl border-2 border-amber-500 p-8 flex flex-col justify-between shadow-2xl shadow-amber-500/15">
            <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-[#07090e] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
              Mais Escolhido por Barbearias
            </div>

            <div class="space-y-4">
              <h4 class="text-lg font-bold text-white">Profissional &amp; IA</h4>
              <p class="text-xs text-slate-400">Para barbearias com equipe que querem automação completa no WhatsApp.</p>
              
              <div class="py-2">
                <span class="text-4xl font-black text-amber-400">
                  R$ {{ isAnnual ? '99' : '119' }}
                </span>
                <span class="text-xs text-slate-400 font-semibold">/mês após o teste</span>
              </div>

              <ul class="space-y-3 pt-4 border-t border-white/[0.08] text-xs text-slate-200">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-amber-400 shrink-0" /> <strong>Até 6 Barbeiros parceiros</strong>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-amber-400 shrink-0" /> <strong>Secretária Virtual com IA Humanizada 24/7</strong>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-amber-400 shrink-0" /> <strong>Divisão Automática Lei Salão-Parceiro</strong>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-amber-400 shrink-0" /> Lembretes 2h antes (Zero No-Show)
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-amber-400 shrink-0" /> Robô de recuperação de clientes sumidos
                </li>
              </ul>
            </div>

            <button 
              @click="openRegisterModal"
              class="mt-8 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              🚀 Experimentar 30 Dias Grátis
            </button>
          </div>

          <!-- Plano Redes & Franquias -->
          <div class="bg-[#0e131d] rounded-3xl border border-white/[0.08] p-8 flex flex-col justify-between hover:border-slate-700 transition">
            <div class="space-y-4">
              <h4 class="text-lg font-bold text-white">Grandes Redes</h4>
              <p class="text-xs text-slate-400">Para barbearias com mais de 7 cadeiras ou múltiplas unidades.</p>
              
              <div class="py-2">
                <span class="text-4xl font-black text-white">
                  R$ {{ isAnnual ? '169' : '199' }}
                </span>
                <span class="text-xs text-slate-400 font-semibold">/mês após o teste</span>
              </div>

              <ul class="space-y-3 pt-4 border-t border-white/[0.06] text-xs text-slate-300">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Barbeiros ilimitados
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Multi-unidades com painel central
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Todas as funções de IA &amp; WhatsApp
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /> Suporte VIP com gerente de contas
                </li>
              </ul>
            </div>

            <button 
              @click="openRegisterModal"
              class="mt-8 w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs transition cursor-pointer"
            >
              Testar 30 Dias Grátis
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 7: FAQ (Quebrando Objeções com Acordeão Suave) -->
    <section id="faq" class="py-20 bg-slate-900/40 border-t border-white/[0.06]">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-3 mb-14">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-400 block">
            Perguntas Frequentes
          </span>
          <h2 class="text-3xl font-black text-white tracking-tight">
            Tire todas as suas dúvidas antes de começar
          </h2>
        </div>

        <div class="space-y-3">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="bg-[#0e131d] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-300"
            :class="openFaqIndex === index ? 'border-amber-500/30' : ''"
          >
            <button 
              @click="toggleFaq(index)"
              class="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-amber-400 transition cursor-pointer"
            >
              <span>{{ faq.q }}</span>
              <ChevronDown 
                class="w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0"
                :class="openFaqIndex === index ? 'rotate-180 text-amber-400' : ''"
              />
            </button>
            
            <transition 
              enter-active-class="transition-all duration-300 ease-out" 
              enter-from-class="max-h-0 opacity-0" 
              enter-to-class="max-h-96 opacity-100" 
              leave-active-class="transition-all duration-200 ease-in" 
              leave-from-class="max-h-96 opacity-100" 
              leave-to-class="max-h-0 opacity-0"
            >
              <div 
                v-if="openFaqIndex === index"
                class="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3 overflow-hidden"
              >
                {{ faq.a }}
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CALL TO ACTION BANNER -->
    <section class="py-20 relative overflow-hidden">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="bg-gradient-to-r from-amber-500/20 via-[#182133] to-amber-500/20 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-14 space-y-6 relative backdrop-blur-xl">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles class="w-3.5 h-3.5" />
            <span>Sem burocracia</span>
          </div>

          <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Pronto para colocar sua barbearia no piloto automático?
          </h2>

          <p class="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Junte-se a centenas de barbearias que já pararam de perder dinheiro com no-shows e agendamentos manuais.
          </p>

          <button 
            @click="openRegisterModal"
            class="px-10 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-sm uppercase tracking-wider shadow-2xl shadow-amber-500/30 transition transform hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Ativar Meus 30 Dias Grátis Agora</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="py-12 border-t border-white/[0.06] text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <BarblyClubLogo size="sm" :showBadge="false" />
          <span class="text-slate-400 hidden sm:inline">•</span>
          <span class="text-slate-400">A Plataforma VIP de Gestão e IA para Barbearias</span>
        </div>
        <div class="text-slate-500 text-center sm:text-right">
          © 2026 BarblyClub Tecnologia Ltda. barblyclub.com.br • Todos os direitos reservados.
        </div>
      </div>
    </footer>

    <!-- STICKY BOTTOM CONVERSION BAR (On Scroll) -->
    <transition 
      enter-active-class="transition duration-300 ease-out" 
      enter-from-class="translate-y-full opacity-0" 
      enter-to-class="translate-y-0 opacity-100" 
      leave-active-class="transition duration-200 ease-in" 
      leave-from-class="translate-y-0 opacity-100" 
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="showStickyCta" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-none">
        <div class="bg-[#0e131d]/95 border border-amber-500/40 rounded-2xl p-3 shadow-2xl shadow-black backdrop-blur-xl flex items-center justify-between gap-3 pointer-events-auto">
          <div class="flex items-center gap-2.5 truncate">
            <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles class="w-4 h-4" />
            </div>
            <div class="truncate">
              <span class="text-xs font-bold text-white block truncate">30 Dias Grátis no BarblyClub</span>
              <span class="text-[10px] text-slate-400 truncate block">Sem cartão de crédito • Liberação imediata</span>
            </div>
          </div>
          <button 
            @click="openRegisterModal"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-md shrink-0 hover:opacity-95 transition cursor-pointer"
          >
            Testar Grátis
          </button>
        </div>
      </div>
    </transition>

    <!-- LIVE ACTIVITY FLOATING TICKER (Bottom-Left) -->
    <div class="fixed bottom-4 left-4 z-40 hidden sm:block pointer-events-none">
      <div class="bg-[#0e131d]/90 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-md flex items-center gap-3 max-w-xs animate-fade-in pointer-events-auto">
        <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
          ✂️
        </div>
        <div class="text-[11px] leading-tight">
          <span class="font-bold text-white block truncate">{{ recentSignups[currentTickerIndex].name }}</span>
          <span class="text-slate-400 text-[10px]">{{ recentSignups[currentTickerIndex].city }} • {{ recentSignups[currentTickerIndex].time }}</span>
          <span class="text-emerald-400 font-semibold block text-[10px] mt-0.5">{{ recentSignups[currentTickerIndex].action }}</span>
        </div>
      </div>
    </div>

    <!-- BACK TO TOP FLOATING BUTTON (Bottom-Right 2026 UX) -->
    <transition 
      enter-active-class="transition duration-300 ease-out" 
      enter-from-class="opacity-0 translate-y-4 scale-75" 
      enter-to-class="opacity-100 translate-y-0 scale-100" 
      leave-active-class="transition duration-200 ease-in" 
      leave-from-class="opacity-100 translate-y-0 scale-100" 
      leave-to-class="opacity-0 translate-y-4 scale-75"
    >
      <button 
        v-if="showBackToTop" 
        @click="scrollToTop" 
        title="Voltar ao Topo"
        class="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-2xl bg-[#0e131d]/90 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-[#07090e] hover:border-amber-400 shadow-xl shadow-black/60 hover:shadow-amber-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 group cursor-pointer backdrop-blur-xl"
      >
        <ArrowUp class="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>
    </transition>

    <!-- QUICK REGISTRATION MODAL -->
    <transition 
      enter-active-class="transition duration-300 ease-out" 
      enter-from-class="opacity-0 scale-95" 
      enter-to-class="opacity-100 scale-100" 
      leave-active-class="transition duration-200 ease-in" 
      leave-from-class="opacity-100 scale-100" 
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="bg-[#0e131d] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-4">
          <button 
            @click="closeRegisterModal"
            class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="space-y-1">
            <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <Sparkles class="w-3 h-3" /> 30 Dias 100% Grátis
            </span>
            <h3 class="text-xl font-bold text-white tracking-tight">
              Cadastre sua Barbearia
            </h3>
            <p class="text-xs text-slate-400">
              Preencha os dados abaixo para receber seu link e acessar o painel agora:
            </p>
          </div>

          <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {{ errorMessage }}
          </div>

          <form @submit.prevent="handleRegister" class="space-y-3">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Seu Nome</label>
              <input v-model="ownerName" type="text" required placeholder="Ex: Diego Santos" class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs focus:ring-1 focus:ring-amber-500" />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Barbearia</label>
                <input v-model="barberShopName" type="text" required placeholder="Ex: Don Corleone" class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs focus:ring-1 focus:ring-amber-500" />
              </div>
              <div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">WhatsApp</label>
                <input v-model="phone" type="tel" required placeholder="(11) 98888-7777" class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs focus:ring-1 focus:ring-amber-500" />
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">E-mail</label>
              <input v-model="email" type="email" required placeholder="seu@email.com" class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs focus:ring-1 focus:ring-amber-500" />
            </div>

            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">Senha</label>
              <input v-model="password" type="password" required minlength="6" placeholder="Mínimo 6 dígitos" class="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-white/[0.12] text-white text-xs focus:ring-1 focus:ring-amber-500" />
            </div>

            <button 
              type="submit" 
              :disabled="loading"
              class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition mt-2 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="!loading">🚀 Ativar Meus 30 Dias Grátis</span>
              <span v-else>Criando seu ambiente...</span>
            </button>
          </form>

          <p class="text-[10px] text-center text-slate-500">
            Ao se cadastrar, você concorda com os termos de uso. Nenhum dado financeiro é solicitado.
          </p>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
/* Smooth Scroll */
html {
  scroll-behavior: smooth;
}

/* Chrome, Safari, Edge autofill override: keep consistent dark styling */
input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #0a0e17 inset !important;
  -webkit-text-fill-color: #ffffff !important;
  caret-color: #f59e0b !important;
  border-color: rgba(245, 158, 11, 0.4) !important;
  transition: background-color 5000s ease-in-out 0s;
}

/* Tour Tab Slide & Blur Transition */
.tab-slide-enter-active,
.tab-slide-leave-active {
  transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-slide-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
  filter: blur(4px);
}

.tab-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
  filter: blur(4px);
}

@keyframes pulseSlow {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.04); }
}

.animate-pulse-slow {
  animation: pulseSlow 4s ease-in-out infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}
</style>
