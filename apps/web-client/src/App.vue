<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Scissors, 
  Clock, 
  User, 
  Calendar, 
  Check, 
  Sparkles, 
  Copy, 
  MessageCircle, 
  ChevronRight, 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Loader2,
  Sun,
  Moon,
  PlusCircle,
  Gift,
  Ticket,
  LogIn,
  QrCode,
  Award,
  Crown,
  KeyRound,
  X,
  Navigation,
  LogOut,
  Smartphone
} from 'lucide-vue-next';

// ================= THEME STATE =================
const isDark = ref(true);

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem('client_theme_mode', isDark.value ? 'dark' : 'light');
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ================= AUTH / WHATSAPP OTP STATE =================
// Verifica se o cliente já está autenticado no localStorage
const isAuthenticated = ref(false);
const showAuthModal = ref(false);
const authPhoneInput = ref('');
const otpCodeInput = ref(['', '', '', '']);
const otpSent = ref(false);
const otpSending = ref(false);
const simulatedCode = ref('4821'); // Código demonstrativo
const showOtpNotification = ref(false);

const clientUser = ref({
  name: 'Arthur Silveira',
  phone: '+55 (11) 98765-4321',
  level: 'Nível Ouro (VIP)',
  cutsCount: 4,
  cutsGoal: 5
});

// ================= APP MODES & TABS =================
// Modes: 'hub' (Área do Cliente com Menus Separados) ou 'booking' (Fluxo de Agendamento)
const currentMode = ref<'hub' | 'booking'>('hub');

// Hub Tabs: 'appointments' (Meus Agendamentos) ou 'benefits' (Clube & Benefícios)
const activeHubTab = ref<'appointments' | 'benefits'>('appointments');

// Booking Wizard Step (1: Serviço, 2: Barbeiro, 3: Data/Hora, 4: Pagamento, 5: Concluído)
const bookingStep = ref<1 | 2 | 3 | 4 | 5>(1);

// ================= BUSINESS DATA =================
function generateDynamicDays() {
  const result = [];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayWeek = weekDays[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    let label = `${dayNum}/${mm}`;
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Amanhã';
    else label = dayWeek;
    result.push({ label, dayNum, dayWeek, date: dateStr });
  }
  return result;
}

const days = ref(generateDynamicDays());

const services = ref<any[]>([
  { id: 'srv-1', name: 'Fade Navalhado / Degradê', duration: 40, price: 50.0, popular: true, desc: 'Acabamento na navalha com toalha refrescante' },
  { id: 'srv-2', name: 'Barboterapia com Toalha Quente', duration: 30, price: 45.0, popular: false, desc: 'Vapor de ozônio, hidratação profunda e alinhamento' },
  { id: 'srv-3', name: 'Combo Completo (Cabelo + Barba)', duration: 60, price: 85.0, popular: true, desc: 'Corte completo, barboterapia e finalização matte' },
]);

const barbers = ref<any[]>([
  { id: 'any', name: 'Qualquer Barbeiro', nickname: 'Mais rápido disponível', rating: '5.0', avatar: '' },
]);

const loadingPublicData = ref(false);

async function loadPublicData() {
  loadingPublicData.value = true;
  try {
    const [srvRes, brbRes] = await Promise.all([
      fetch('/api/services/public').catch(() => null),
      fetch('/api/barbers/public').catch(() => null),
    ]);

    if (srvRes && srvRes.ok) {
      const srvData = await srvRes.json();
      if (Array.isArray(srvData) && srvData.length > 0) {
        services.value = srvData.map((s: any, idx: number) => ({
          id: s.id,
          name: s.name,
          duration: s.durationMinutes || 30,
          price: Number(s.price),
          popular: idx === 0 || s.category === 'Combos',
          desc: s.description || (s.category ? `Especialidade em ${s.category} com acabamento de excelência.` : 'Atendimento profissional de alto padrão.')
        }));
        if (!services.value.some(s => s.id === selectedServiceId.value)) {
          selectedServiceId.value = services.value[0].id;
        }
      }
    }

    if (brbRes && brbRes.ok) {
      const brbData = await brbRes.json();
      if (Array.isArray(brbData) && brbData.length > 0) {
        barbers.value = [
          { id: 'any', name: 'Qualquer Barbeiro', nickname: 'Mais rápido disponível', rating: '5.0', avatar: '' },
          ...brbData.map((b: any) => ({
            id: b.id,
            name: b.name,
            nickname: b.chair ? `${b.nickname || b.name} (${b.chair})` : (b.nickname || b.name),
            rating: '4.9',
            avatar: b.avatarUrl || ''
          }))
        ];
      }
    }
  } catch (err) {
    console.error('Falha ao carregar dados públicos:', err);
  } finally {
    loadingPublicData.value = false;
  }
}

const timeSlotsMorning = ['09:00', '09:45', '10:30', '11:15'];
const timeSlotsAfternoon = ['13:30', '14:15', '15:00', '15:45', '16:30', '17:15'];
const timeSlotsEvening = ['18:00', '18:45', '19:30', '20:15'];

// User Booking Form Selections
const selectedServiceId = ref('srv-1');
const selectedBarberId = ref('any');
const selectedDate = ref(days.value[0]?.date || '2026-10-28');
const selectedTime = ref('15:00');
const clientNameInput = ref('');
const clientPhoneInput = ref('');
const payOnlineWithDiscount = ref(true);

const submitting = ref(false);
const confirmedAppointment = ref<any>(null);
const copiedPix = ref(false);

// Histórico de Agendamentos do Usuário
const appointmentsList = ref<any[]>([
  {
    id: 'apt-next',
    isUpcoming: true,
    service: 'Fade Navalhado / Degradê',
    barber: 'Diego Santos',
    chair: 'Cadeira 1',
    date: 'Hoje, 22 de Outubro',
    time: '15:00',
    duration: '40 min',
    price: 45.0,
    status: 'Confirmado (Pix 10% OFF)',
    statusClass: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
  },
  {
    id: 'apt-past-1',
    isUpcoming: false,
    service: 'Corte Clássico na Tesoura',
    barber: 'Lucas Lima',
    chair: 'Cadeira 2',
    date: '08 de Outubro, 2026',
    time: '14:30',
    duration: '45 min',
    price: 49.5,
    status: 'Concluído',
    statusClass: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
  }
]);

// Cupons Disponíveis
const vouchers = [
  { code: 'AMIGO10', title: '10% OFF p/ Indicar Amigo', desc: 'Compartilhe seu link e ganhe 10% no próximo corte.' },
  { code: 'VIPTERCA', title: 'Toalha Quente Grátis', desc: 'Válido para agendamentos realizados às terças-feiras.' },
];

const selectedService = computed(() => {
  return services.value.find(s => s.id === selectedServiceId.value) || services.value[0] || { id: '', name: 'Serviço', price: 50, duration: 30 };
});

const selectedBarber = computed(() => {
  return barbers.value.find(b => b.id === selectedBarberId.value) || barbers.value[0] || { id: 'any', name: 'Qualquer Barbeiro', nickname: '', rating: '5.0', avatar: '' };
});

const discountValue = computed(() => {
  return payOnlineWithDiscount.value ? selectedService.value.price * 0.10 : 0;
});

const finalPrice = computed(() => {
  return selectedService.value.price - discountValue.value;
});

// ================= ACTIONS =================
function startBookingFlow() {
  currentMode.value = 'booking';
  bookingStep.value = 1;
}

function returnToHub(tab: 'appointments' | 'benefits' = 'appointments') {
  currentMode.value = 'hub';
  activeHubTab.value = tab;
}

function copyPixKey() {
  if (!confirmedAppointment.value?.pixCopiaCola) return;
  navigator.clipboard.writeText(confirmedAppointment.value.pixCopiaCola);
  copiedPix.value = true;
  setTimeout(() => { copiedPix.value = false; }, 3000);
}

function showLocation() {
  window.alert('Localização: Rua Oscar Freire, 1024 - Jardins, São Paulo');
}

function joinVipClub() {
  window.alert('Em breve: Adesão direta com cobrança recorrente no cartão via Asaas!');
}

// WhatsApp OTP Auth Logic
function triggerSendOtp() {
  if (!authPhoneInput.value || authPhoneInput.value.length < 8) {
    alert('Por favor, informe seu número de WhatsApp.');
    return;
  }
  otpSending.value = true;
  setTimeout(() => {
    otpSending.value = false;
    otpSent.value = true;
    showOtpNotification.value = true;
    setTimeout(() => { showOtpNotification.value = false; }, 5000);
  }, 1000);
}

function verifyOtp() {
  const entered = otpCodeInput.value.join('');
  if (entered === simulatedCode.value || entered.length === 4) {
    isAuthenticated.value = true;
    localStorage.setItem('barber_user_session', 'true');
    clientUser.value.phone = authPhoneInput.value;
    showAuthModal.value = false;
    otpSent.value = false;
    otpCodeInput.value = ['', '', '', ''];
  } else {
    alert('Código inválido! O código demonstrativo é 4821');
  }
}

function logout() {
  isAuthenticated.value = false;
  localStorage.removeItem('barber_user_session');
}

async function submitBooking() {
  const name = clientNameInput.value.trim() || clientUser.value.name;
  const phone = clientPhoneInput.value.trim() || clientUser.value.phone;

  if (!name || !phone) {
    alert('Por favor, informe seu nome e WhatsApp.');
    return;
  }

  submitting.value = true;
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: name,
        clientPhone: phone,
        serviceId: selectedService.value.id,
        servicePrice: selectedService.value.price,
        barberId: selectedBarber.value.id === 'any' ? 'any' : selectedBarber.value.id,
        startsAt: `${selectedDate.value}T${selectedTime.value}:00`,
        origin: 'PWA_WEB',
        payOnlineWithDiscount: payOnlineWithDiscount.value,
      }),
    });

    const data = await res.json();
    confirmedAppointment.value = data;

    // Atualiza histórico do cliente
    appointmentsList.value.unshift({
      id: data.id,
      isUpcoming: true,
      service: selectedService.value.name,
      barber: selectedBarber.value.name,
      chair: 'Cadeira 1',
      date: `${selectedDate.value}`,
      time: `${selectedTime.value}`,
      duration: `${selectedService.value.duration} min`,
      price: finalPrice.value,
      status: payOnlineWithDiscount.value ? 'Pix Confirmado (10% OFF)' : 'Confirmado (Balcão)',
      statusClass: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
    });

    // Incrementa selo de fidelidade se pago
    if (clientUser.value.cutsCount < clientUser.value.cutsGoal) {
      clientUser.value.cutsCount++;
    }

    bookingStep.value = 5;
  } catch (err) {
    alert('Erro ao agendar horário. Tente novamente.');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  const saved = localStorage.getItem('client_theme_mode');
  if (saved === 'light') {
    isDark.value = false;
    document.documentElement.classList.remove('dark');
  } else {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }

  if (localStorage.getItem('barber_user_session') === 'true') {
    isAuthenticated.value = true;
  }

  loadPublicData();
});
</script>

<template>
  <div class="min-h-screen bg-[#F4F5F9] dark:bg-[#07090E] text-slate-800 dark:text-slate-100 flex justify-center p-0 sm:p-4 md:p-6 transition-colors duration-300">
    
    <!-- Mobile PWA Device Shell -->
    <div class="w-full max-w-md bg-white dark:bg-[#11141E] sm:border border-slate-200 dark:border-slate-800/80 sm:rounded-[36px] soft-card-shadow flex flex-col min-h-screen sm:min-h-[890px] overflow-hidden relative shadow-2xl">

      <!-- ================= SIMULATED WHATSAPP OTP NOTIFICATION (TOAST) ================= -->
      <Transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="-translate-y-8 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="-translate-y-8 opacity-0"
      >
        <div v-if="showOtpNotification" class="absolute top-4 left-4 right-4 z-50 bg-[#121B22] text-white p-3.5 rounded-2xl border border-emerald-500/40 shadow-2xl flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <MessageCircle class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-bold text-emerald-400">WhatsApp • Atelier 88</div>
            <div class="text-xs font-medium truncate">Seu código de acesso é: <strong class="text-white font-mono text-sm underline">{{ simulatedCode }}</strong></div>
          </div>
        </div>
      </Transition>

      <!-- ================= TOP APP BAR ================= -->
      <header class="relative px-5 pt-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#151926]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        
        <!-- Left: Branding or Back Button -->
        <div class="flex items-center gap-2.5">
          <!-- Back button if inside booking flow -->
          <button 
            v-if="currentMode === 'booking' && bookingStep > 1 && bookingStep < 5" 
            @click="bookingStep = (bookingStep - 1 as any)"
            class="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:opacity-80 transition active:scale-95"
            title="Voltar etapa"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>

          <!-- Brand Logo -->
          <div @click="returnToHub('appointments')" class="cursor-pointer flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Scissors class="w-4 h-4 -rotate-45" />
            </div>
            <div>
              <div class="font-extrabold text-xs text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Atelier 88</div>
              <div class="text-[9px] text-slate-400">Barber Lounge</div>
            </div>
          </div>
        </div>

        <!-- Center: Step Indicator (when in booking wizard) -->
        <div v-if="currentMode === 'booking' && bookingStep < 5" class="flex items-center gap-1.5">
          <span 
            v-for="s in 4" 
            :key="s" 
            class="w-2.5 h-1.5 rounded-full transition-all"
            :class="s === bookingStep ? 'w-5 bg-amber-500' : s < bookingStep ? 'bg-amber-500/40' : 'bg-slate-300 dark:bg-slate-700'"
          ></span>
        </div>

        <!-- Right: Actions (Theme Toggle + "Voltar ao Menu" / Auth) -->
        <div class="flex items-center gap-2">
          
          <!-- Botão "Voltar ao Menu" no fluxo de agendamento (Pedido do usuário!) -->
          <button 
            v-if="currentMode === 'booking'" 
            @click="returnToHub('appointments')"
            class="px-2.5 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 transition flex items-center gap-1"
            title="Voltar para a Área Principal"
          >
            <X class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Menu</span>
          </button>

          <!-- Light / Dark Toggle -->
          <button 
            @click="toggleTheme" 
            class="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:opacity-80 transition"
            :title="isDark ? 'Modo Claro' : 'Modo Escuro'"
          >
            <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
            <Moon v-else class="w-4 h-4 text-slate-700" />
          </button>

          <!-- Auth Status Button (OTP WhatsApp) -->
          <button 
            v-if="!isAuthenticated && currentMode === 'hub'"
            @click="showAuthModal = true"
            class="px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 shadow-sm active:scale-95 transition"
          >
            <LogIn class="w-3.5 h-3.5" />
            <span>Acessar</span>
          </button>

          <button 
            v-else-if="isAuthenticated && currentMode === 'hub'"
            @click="logout"
            class="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition"
            title="Sair da Conta"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </header>

      <!-- =================================================================== -->
      <!-- MODALIDADE 1: ÁREA DO CLIENTE COM MENUS SEPARADOS (HUB)            -->
      <!-- =================================================================== -->
      <div v-if="currentMode === 'hub'" class="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
        
        <!-- SCROLLABLE HUB CONTENT -->
        <main class="flex-1 p-5 overflow-y-auto space-y-6">

          <!-- 1. Perfil do Cliente & Status de Login via WhatsApp -->
          <div class="p-4 rounded-3xl bg-slate-100 dark:bg-[#161A26] border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-base shadow-md shadow-amber-500/20">
                {{ clientUser.name[0] }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-slate-900 dark:text-white">{{ clientUser.name }}</h2>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                    <Crown class="w-2.5 h-2.5" /> Ouro
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono-num flex items-center gap-1 mt-0.5">
                  <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
                  {{ clientUser.phone }}
                </p>
              </div>
            </div>

            <button 
              @click="startBookingFlow"
              class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              <PlusCircle class="w-4 h-4" />
              <span>Agendar</span>
            </button>
          </div>

          <!-- 2. NAVEGAÇÃO ENTRE AS ABAS DO HUB: [MEUS AGENDAMENTOS] vs [BENEFÍCIOS] -->
          <div class="flex p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl">
            <button 
              @click="activeHubTab = 'appointments'"
              class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              :class="activeHubTab === 'appointments' ? 'bg-white dark:bg-[#11141E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'"
            >
              <Calendar class="w-4 h-4" :class="activeHubTab === 'appointments' ? 'text-amber-500' : ''" />
              <span>Meus Agendamentos</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500">{{ appointmentsList.length }}</span>
            </button>

            <button 
              @click="activeHubTab = 'benefits'"
              class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              :class="activeHubTab === 'benefits' ? 'bg-white dark:bg-[#11141E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'"
            >
              <Gift class="w-4 h-4" :class="activeHubTab === 'benefits' ? 'text-amber-500' : ''" />
              <span>Clube & Benefícios</span>
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            </button>
          </div>

          <!-- ================= ABA 1: MEUS AGENDAMENTOS ================= -->
          <div v-if="activeHubTab === 'appointments'" class="space-y-4 animate-in fade-in duration-150">
            
            <!-- PRÓXIMO AGENDAMENTO (EM DESTAQUE) -->
            <div v-if="appointmentsList.find(a => a.isUpcoming)" class="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-100 to-white dark:from-amber-500/15 dark:via-[#161A26] dark:to-[#11141E] border border-amber-500/30 space-y-4 relative overflow-hidden shadow-md">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Próximo Atendimento
                </span>
                <span class="text-xs font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                  R$ {{ appointmentsList[0].price.toFixed(2) }}
                </span>
              </div>

              <div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ appointmentsList[0].service }}</h3>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-mono-num">
                  <Clock class="w-3.5 h-3.5 text-amber-500" />
                  <span>{{ appointmentsList[0].date }} às <strong>{{ appointmentsList[0].time }}</strong></span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Profissional: <strong class="text-slate-800 dark:text-slate-200">{{ appointmentsList[0].barber }}</strong> ({{ appointmentsList[0].chair }})
                </div>
              </div>

              <!-- Quick Action: Rota / WhatsApp -->
              <div class="pt-2 flex items-center gap-2">
                <a 
                  :href="`https://wa.me/5511987654321?text=Ol%C3%A1%2C%20gostaria%20de%20confirmar%20meu%20corte%20das%20${appointmentsList[0].time}`" 
                  target="_blank"
                  class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageCircle class="w-4 h-4" />
                  <span>Avisar no WhatsApp</span>
                </a>
                <button 
                  @click="showLocation"
                  class="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                  title="Ver Localização"
                >
                  <Navigation class="w-4 h-4 text-amber-500" />
                </button>
              </div>
            </div>

            <!-- HISTÓRICO DE ATENDIMENTOS PASSADOS -->
            <div class="space-y-3 pt-2">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Histórico de Atendimentos</h4>

              <div class="space-y-2.5">
                <div 
                  v-for="apt in appointmentsList" 
                  :key="apt.id"
                  class="p-4 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-white">{{ apt.service }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">{{ apt.barber }} • {{ apt.date }}</div>
                  </div>

                  <div class="text-right">
                    <div class="text-xs font-extrabold font-mono-num text-slate-900 dark:text-white">R$ {{ apt.price.toFixed(2) }}</div>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1" :class="apt.statusClass">
                      {{ apt.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ================= ABA 2: CLUBE & BENEFÍCIOS ================= -->
          <div v-else-if="activeHubTab === 'benefits'" class="space-y-5 animate-in fade-in duration-150">
            
            <!-- 1. CARTÃO FIDELIDADE DIGITAL (4 de 5 Cortes) -->
            <div class="p-5 rounded-3xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 soft-card-shadow space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Award class="w-4 h-4 text-amber-500" />
                  <h3 class="text-xs font-bold text-slate-900 dark:text-white">Cartão Fidelidade Digital</h3>
                </div>
                <span class="text-xs font-extrabold text-amber-500 font-mono-num">{{ clientUser.cutsCount }} / {{ clientUser.cutsGoal }} Cortes</span>
              </div>

              <!-- Selos de Corte -->
              <div class="flex justify-between gap-2 py-1">
                <div 
                  v-for="i in clientUser.cutsGoal" 
                  :key="i" 
                  class="flex-1 h-12 rounded-2xl border flex flex-col items-center justify-center transition" 
                  :class="i <= clientUser.cutsCount 
                    ? 'border-amber-500 bg-amber-500/20 text-amber-500' 
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 text-slate-400'"
                >
                  <Scissors v-if="i <= clientUser.cutsCount" class="w-4 h-4 -rotate-45" />
                  <Gift v-else class="w-4 h-4 text-slate-400" />
                  <span class="text-[8px] font-bold mt-0.5 font-mono-num">#0{{ i }}</span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                🎉 Falta apenas <strong>1 corte</strong> para você resgatar uma <strong>Barboterapia Completa com Toalha Quente 100% Grátis</strong>!
              </div>
            </div>

            <!-- 2. CLUBE BLACK VIP DE ASSINATURA -->
            <div class="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-amber-500/40 space-y-3.5 relative overflow-hidden shadow-xl">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider">
                  Clube de Assinatura
                </span>
                <span class="text-base font-extrabold font-mono-num text-amber-400">R$ 139<span class="text-xs font-normal">/mês</span></span>
              </div>

              <div>
                <h4 class="text-sm font-bold text-white">Cortes Ilimitados no Mês</h4>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  Corte o cabelo quantas vezes quiser, com cerveja gelada na recepção e horário prioritário na grade.
                </p>
              </div>

              <button 
                @click="joinVipClub"
                class="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 active:scale-95"
              >
                Assinar Clube Black VIP
              </button>
            </div>

            <!-- 3. CUPONS & VOUCHERS DISPONÍVEIS -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Cupons & Descontos</h4>

              <div 
                v-for="v in vouchers" 
                :key="v.code"
                class="p-3.5 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500">
                      {{ v.code }}
                    </span>
                    <span class="text-xs font-bold text-slate-900 dark:text-white">{{ v.title }}</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">{{ v.desc }}</p>
                </div>
              </div>
            </div>

          </div>

        </main>

        <!-- BOTTOM TAB BAR (Padrão de App Nativo Mobile) -->
        <nav class="h-16 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#141824]/95 backdrop-blur-md px-8 flex items-center justify-around">
          <button 
            @click="activeHubTab = 'appointments'" 
            class="flex flex-col items-center gap-1 transition"
            :class="activeHubTab === 'appointments' ? 'text-amber-500 font-bold' : 'text-slate-400'"
          >
            <Calendar class="w-5 h-5" />
            <span class="text-[10px]">Agendamentos</span>
          </button>

          <!-- Botão Central Flutuante: Novo Corte -->
          <button 
            @click="startBookingFlow" 
            class="w-12 h-12 -mt-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-90 transition"
            title="Novo Corte"
          >
            <PlusCircle class="w-6 h-6 stroke-[2.5]" />
          </button>

          <button 
            @click="activeHubTab = 'benefits'" 
            class="flex flex-col items-center gap-1 transition"
            :class="activeHubTab === 'benefits' ? 'text-amber-500 font-bold' : 'text-slate-400'"
          >
            <Gift class="w-5 h-5" />
            <span class="text-[10px]">Benefícios</span>
          </button>
        </nav>

      </div>

      <!-- =================================================================== -->
      <!-- MODALIDADE 2: FLUXO DE AGENDAMENTO PROGRESSIVO (WIZARD)             -->
      <!-- =================================================================== -->
      <div v-else-if="currentMode === 'booking'" class="flex-1 flex flex-col justify-between overflow-hidden">
        
        <!-- SCROLLABLE BODY -->
        <main class="flex-1 p-5 overflow-y-auto space-y-5">

          <!-- Mini Shop Header (apenas nos primeiros passos) -->
          <div v-if="bookingStep <= 2" class="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#161A26] border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
            <img 
              src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=120&h=120" 
              class="w-11 h-11 rounded-xl object-cover border border-amber-500/40"
            >
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-slate-900 dark:text-white truncate">Atelier 88 Lounge</h3>
                <span class="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                  <Star class="w-3 h-3 fill-amber-400" /> 4.9
                </span>
              </div>
              <p class="text-[11px] text-slate-400 truncate">Rua Oscar Freire, 1024 • Jardins</p>
            </div>
          </div>

          <!-- ================= ETAPA 1: ESCOLHA DO SERVIÇO ================= -->
          <div v-if="bookingStep === 1" class="space-y-4 animate-in fade-in duration-200">
            <div>
              <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Etapa 1 de 4</span>
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Escolha o seu Serviço</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Qual procedimento você deseja realizar hoje?</p>
            </div>

            <div class="space-y-2.5">
              <div 
                v-for="service in services" 
                :key="service.id"
                @click="selectedServiceId = service.id"
                class="p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between active:scale-[0.99]"
                :class="selectedServiceId === service.id 
                  ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] hover:border-slate-300 dark:hover:border-slate-700'"
              >
                <div class="flex-1 pr-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900 dark:text-white">{{ service.name }}</span>
                    <span v-if="service.popular" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950 uppercase">
                      Popular
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">{{ service.desc }}</p>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                    <span class="flex items-center gap-1"><Clock class="w-3 h-3 text-slate-400" /> {{ service.duration }} min</span>
                    <span>•</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">⚡ 10% OFF no Pix</span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <div class="text-sm font-extrabold font-mono-num text-slate-900 dark:text-white">
                    R$ {{ service.price.toFixed(2) }}
                  </div>
                  <div class="text-[10px] font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {{ (service.price * 0.9).toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= ETAPA 2: ESCOLHA DO PROFISSIONAL ================= -->
          <div v-else-if="bookingStep === 2" class="space-y-4 animate-in fade-in duration-200">
            <div>
              <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Etapa 2 de 4</span>
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Com quem quer cortar?</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Escolha o barbeiro de sua preferência ou qualquer livre:</p>
            </div>

            <!-- Resumo do Serviço selecionado -->
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span class="text-slate-700 dark:text-slate-300 font-medium">Serviço: <strong>{{ selectedService.name }}</strong></span>
              <span class="font-bold text-amber-600 dark:text-amber-400 font-mono-num">R$ {{ selectedService.price.toFixed(2) }}</span>
            </div>

            <div class="space-y-2.5">
              <div 
                v-for="barber in barbers" 
                :key="barber.id"
                @click="selectedBarberId = barber.id"
                class="p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between active:scale-[0.99]"
                :class="selectedBarberId === barber.id 
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 shadow-sm' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] hover:border-slate-300 dark:hover:border-slate-700'"
              >
                <div class="flex items-center gap-3">
                  <img 
                    v-if="barber.avatar" 
                    :src="barber.avatar" 
                    class="w-11 h-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                  >
                  <div v-else class="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                    <User class="w-5 h-5 text-amber-500" />
                  </div>

                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-slate-900 dark:text-white">{{ barber.name }}</span>
                      <span class="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                        <Star class="w-3 h-3 fill-amber-400" /> {{ barber.rating }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">{{ barber.nickname }}</p>
                  </div>
                </div>

                <div class="w-5 h-5 rounded-full border flex items-center justify-center" :class="selectedBarberId === barber.id ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300 dark:border-slate-700'">
                  <Check v-if="selectedBarberId === barber.id" class="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>

          <!-- ================= ETAPA 3: DATA & HORÁRIOS (MANHÃ, TARDE, NOITE) ================= -->
          <div v-else-if="bookingStep === 3" class="space-y-5 animate-in fade-in duration-200">
            <div>
              <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Etapa 3 de 4</span>
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Data & Horário</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Selecione o melhor turno para seu atendimento:</p>
            </div>

            <!-- Dias Horizontais -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <div 
                v-for="day in days" 
                :key="day.date"
                @click="selectedDate = day.date"
                class="flex-1 min-w-[68px] p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-between"
                :class="selectedDate === day.date 
                  ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'"
              >
                <span class="text-[10px] uppercase font-bold tracking-wider opacity-80">{{ day.dayWeek }}</span>
                <span class="text-base font-extrabold font-mono-num my-0.5" :class="selectedDate === day.date ? 'text-slate-950' : 'text-slate-900 dark:text-white'">{{ day.dayNum }}</span>
                <span class="text-[9px] font-medium">{{ day.label }}</span>
              </div>
            </div>

            <!-- Turnos de Horários -->
            <div class="space-y-4 pt-1">
              <!-- Manhã -->
              <div>
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  <span>🌅 Manhã (09:00 às 12:00)</span>
                </div>
                <div class="grid grid-cols-4 gap-2 font-mono-num">
                  <button 
                    v-for="time in timeSlotsMorning" 
                    :key="time"
                    @click="selectedTime = time"
                    class="py-2.5 rounded-xl text-xs font-bold transition border active:scale-95"
                    :class="selectedTime === time 
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/40' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'"
                  >
                    {{ time }}
                  </button>
                </div>
              </div>

              <!-- Tarde -->
              <div>
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  <span>☀️ Tarde (13:30 às 17:30)</span>
                </div>
                <div class="grid grid-cols-3 gap-2 font-mono-num">
                  <button 
                    v-for="time in timeSlotsAfternoon" 
                    :key="time"
                    @click="selectedTime = time"
                    class="py-2.5 rounded-xl text-xs font-bold transition border active:scale-95"
                    :class="selectedTime === time 
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/40' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'"
                  >
                    {{ time }}
                  </button>
                </div>
              </div>

              <!-- Noite -->
              <div>
                <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  <span>🌙 Noite (18:00 às 20:30)</span>
                </div>
                <div class="grid grid-cols-4 gap-2 font-mono-num">
                  <button 
                    v-for="time in timeSlotsEvening" 
                    :key="time"
                    @click="selectedTime = time"
                    class="py-2.5 rounded-xl text-xs font-bold transition border active:scale-95"
                    :class="selectedTime === time 
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/40' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'"
                  >
                    {{ time }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= ETAPA 4: DADOS & PAGAMENTO (ANTI NO-SHOW) ================= -->
          <div v-else-if="bookingStep === 4" class="space-y-5 animate-in fade-in duration-200">
            <div>
              <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Etapa 4 de 4</span>
              <h2 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Finalizar Reserva</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Preencha seus dados para receber o comprovante no WhatsApp:</p>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Seu Nome</label>
                <input 
                  type="text" 
                  v-model="clientNameInput"
                  :placeholder="clientUser.name || 'Nome completo'" 
                  class="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp</label>
                <input 
                  type="tel" 
                  v-model="clientPhoneInput"
                  :placeholder="clientUser.phone || '(11) 98765-4321'" 
                  class="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono-num"
                />
              </div>
            </div>

            <!-- OPÇÕES DE PAGAMENTO -->
            <div class="space-y-2.5 pt-1">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Forma de Pagamento:</span>

              <!-- Opção 1: Pix com 10% OFF -->
              <div 
                @click="payOnlineWithDiscount = true"
                class="p-4 rounded-2xl border-2 transition cursor-pointer relative overflow-hidden"
                :class="payOnlineWithDiscount 
                  ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] hover:border-slate-300 dark:hover:border-slate-700'"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-slate-900 dark:text-white">⚡ Pagar agora no Pix</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 font-mono">
                        10% OFF
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-1">Horário 100% blindado na grade, sem fila.</p>
                  </div>
                  
                  <div class="text-right">
                    <div class="text-xs text-slate-400 line-through font-mono-num">R$ {{ selectedService.price.toFixed(2) }}</div>
                    <div class="text-base font-extrabold font-mono-num text-amber-500">R$ {{ (selectedService.price * 0.9).toFixed(2) }}</div>
                  </div>
                </div>

                <div class="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span class="flex items-center gap-1"><ShieldCheck class="w-3.5 h-3.5" /> Garantia total da cadeira</span>
                  <span class="font-bold">Economize R$ {{ (selectedService.price * 0.1).toFixed(2) }}</span>
                </div>
              </div>

              <!-- Opção 2: Balcão -->
              <div 
                @click="payOnlineWithDiscount = false"
                class="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between"
                :class="!payOnlineWithDiscount 
                  ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800/40' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161A26] opacity-75'"
              >
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-300">Pagar no balcão após o corte</div>
                  <div class="text-[10px] text-slate-400">Cartão de débito/crédito ou dinheiro físico.</div>
                </div>
                <div class="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                  R$ {{ selectedService.price.toFixed(2) }}
                </div>
              </div>
            </div>
          </div>

          <!-- ================= ETAPA 5: CONFIRMAÇÃO & RETORNO ================= -->
          <div v-else-if="bookingStep === 5" class="space-y-5 text-center animate-in zoom-in-95 duration-200 py-2">
            
            <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Check class="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h2 class="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Horário Reservado!</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Seu agendamento para <strong>{{ selectedTime }}</strong> foi registrado na barbearia.
              </p>
            </div>

            <!-- Card Pix Copia-e-Cola -->
            <div v-if="payOnlineWithDiscount" class="p-4 rounded-2xl bg-slate-50 dark:bg-[#161A26] border border-amber-500/30 text-left space-y-3">
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pix Copia e Cola</span>
                  <div class="text-xs font-bold text-slate-900 dark:text-white">10% OFF Aplicado</div>
                </div>
                <div class="text-right">
                  <div class="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">R$ {{ finalPrice.toFixed(2) }}</div>
                </div>
              </div>

              <div class="flex items-center justify-center py-1">
                <div class="p-2 bg-white rounded-2xl shadow-sm">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=00020126580014br.gov.bcb.pix0136barber-atelier88-split" class="w-24 h-24">
                </div>
              </div>

              <button 
                @click="copyPixKey" 
                class="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-98"
              >
                <Copy class="w-4 h-4" />
                <span>{{ copiedPix ? 'Código Pix Copiado com Sucesso!' : 'Copiar Código Pix Copia-e-Cola' }}</span>
              </button>
            </div>

            <!-- Resumo do Ticket -->
            <div class="p-4 rounded-2xl bg-slate-100 dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-left space-y-1.5 text-xs">
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Serviço:</span>
                <strong class="text-slate-900 dark:text-white">{{ selectedService.name }}</strong>
              </div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Barbeiro:</span>
                <strong class="text-slate-900 dark:text-white">{{ selectedBarber.name }}</strong>
              </div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400 font-mono-num">
                <span>Data & Hora:</span>
                <strong class="text-amber-500">{{ selectedDate }} às {{ selectedTime }}</strong>
              </div>
            </div>

            <!-- BOTÕES PEDIDOS PELO USUÁRIO -->
            <div class="space-y-2.5 pt-2">
              <button 
                @click="returnToHub('appointments')" 
                class="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-98"
              >
                <Calendar class="w-4 h-4" />
                <span>Ver Meus Agendamentos</span>
              </button>

              <button 
                @click="returnToHub('benefits')" 
                class="w-full py-3 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
              >
                <Gift class="w-4 h-4 text-amber-500" />
                <span>Ver Meus Benefícios & Clube</span>
              </button>
            </div>

          </div>

        </main>

        <!-- FOOTER ACTIONS BAR (Passos 1 a 4) -->
        <footer v-if="bookingStep < 5" class="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#141824] flex items-center justify-between gap-3">
          <div>
            <span class="text-[10px] text-slate-400 uppercase font-semibold block">Total a Pagar</span>
            <div class="flex items-baseline gap-1.5 font-mono-num">
              <span class="text-lg font-extrabold text-slate-900 dark:text-white">R$ {{ finalPrice.toFixed(2) }}</span>
              <span v-if="payOnlineWithDiscount" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">10% OFF</span>
            </div>
          </div>

          <button 
            v-if="bookingStep < 4"
            @click="bookingStep = (bookingStep + 1 as any)"
            class="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20 active:scale-95"
          >
            <span>{{ bookingStep === 1 ? 'Escolher Barbeiro' : bookingStep === 2 ? 'Escolher Horário' : 'Ir p/ Pagamento' }}</span>
            <ChevronRight class="w-4 h-4" />
          </button>

          <button 
            v-else-if="bookingStep === 4"
            @click="submitBooking"
            :disabled="submitting"
            class="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <span>{{ submitting ? 'Confirmando...' : 'Confirmar e Gerar Pix' }}</span>
          </button>
        </footer>

      </div>

      <!-- =================================================================== -->
      <!-- MODAL DE ACESSO COM CÓDIGO VERIFICADOR VIA WHATSAPP (OTP)           -->
      <!-- =================================================================== -->
      <div v-if="showAuthModal" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div class="bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-[32px] w-full max-w-sm p-6 soft-card-shadow relative">
          
          <button @click="showAuthModal = false" class="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X class="w-5 h-5" />
          </button>

          <!-- Header do Modal -->
          <div class="flex flex-col items-center text-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3 ring-8 ring-amber-500/10">
              <KeyRound class="w-7 h-7" />
            </div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Acessar Minha Conta</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Sem senhas complicadas. Acesso 100% seguro pelo seu WhatsApp.</p>
          </div>

          <!-- Passo 1: Informar Celular -->
          <div v-if="!otpSent" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Número de Celular / WhatsApp</label>
              <div class="relative">
                <Smartphone class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="tel" 
                  v-model="authPhoneInput"
                  placeholder="(11) 98765-4321" 
                  class="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-xs font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button 
              @click="triggerSendOtp" 
              :disabled="otpSending"
              class="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              <Loader2 v-if="otpSending" class="w-4 h-4 animate-spin" />
              <MessageCircle v-else class="w-4 h-4" />
              <span>{{ otpSending ? 'Enviando Código...' : 'Enviar Código via WhatsApp' }}</span>
            </button>
          </div>

          <!-- Passo 2: Digitar Código de 4 Dígitos -->
          <div v-else class="space-y-5 text-center">
            <div>
              <span class="text-xs text-slate-500 dark:text-slate-400">Digite o código de 4 dígitos enviado para:</span>
              <div class="text-xs font-bold font-mono-num text-slate-900 dark:text-white mt-0.5">{{ authPhoneInput }}</div>
            </div>

            <!-- Inputs de 4 dígitos OTP -->
            <div class="flex justify-center gap-3">
              <input 
                v-for="idx in 4" 
                :key="idx" 
                type="text" 
                maxlength="1"
                v-model="otpCodeInput[idx - 1]"
                class="w-12 h-14 rounded-2xl bg-slate-50 dark:bg-[#161A26] border-2 border-slate-200 dark:border-slate-800 text-center font-mono-num text-lg font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button 
              @click="verifyOtp" 
              class="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <span>Verificar e Entrar</span>
              <Check class="w-4 h-4 stroke-[2.5]" />
            </button>

            <button 
              @click="otpSent = false" 
              class="text-xs text-slate-400 hover:text-amber-500 transition"
            >
              Trocar de número
            </button>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>
