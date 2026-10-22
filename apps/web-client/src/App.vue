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
  Home,
  PlusCircle,
  Gift,
  Ticket,
  LogIn,
  QrCode,
  Award,
  Crown
} from 'lucide-vue-next';

// Theme Management (Light / Dark mode)
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

onMounted(() => {
  const saved = localStorage.getItem('client_theme_mode');
  if (saved === 'light') {
    isDark.value = false;
    document.documentElement.classList.remove('dark');
  } else {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }
});

// App Modes: 'booking' (Fluxo de Agendamento) ou 'hub' (Área do Cliente com Meus Horários & Benefícios)
const currentMode = ref<'booking' | 'hub'>('booking');

// Step in Booking Wizard:
// 1 = Serviço
// 2 = Barbeiro
// 3 = Data & Horários (Manhã, Tarde, Noite)
// 4 = Dados & Pagamento (10% OFF Pix vs Balcão)
// 5 = Confirmação & Pix
const bookingStep = ref<1 | 2 | 3 | 4 | 5>(1);

// Active Tab in Client Hub
const hubTab = ref<'home' | 'appointments' | 'benefits'>('home');

// Services List
const services = [
  { id: 'srv-1', name: 'Fade Navalhado / Degradê', duration: 40, price: 50.0, popular: true, desc: 'Acabamento na navalha com toalha refrescante' },
  { id: 'srv-2', name: 'Barboterapia com Toalha Quente', duration: 30, price: 45.0, popular: false, desc: 'Vapor de ozônio, hidratação profunda e alinhamento' },
  { id: 'srv-3', name: 'Combo Completo (Cabelo + Barba)', duration: 60, price: 85.0, popular: true, desc: 'Corte completo, barboterapia e finalização matte' },
  { id: 'srv-4', name: 'Corte Clássico na Tesoura', duration: 45, price: 55.0, popular: false, desc: 'Corte tradicional executado 100% na tesoura' },
  { id: 'srv-5', name: 'Alinhamento & Pigmentação', duration: 25, price: 35.0, popular: false, desc: 'Realce de linhas da barba ou cabelo' },
];

// Barbers List
const barbers = [
  { id: 'any', name: 'Qualquer Barbeiro', nickname: 'Mais rápido disponível', rating: '4.9', avatar: '' },
  { id: 'barber-1', name: 'Diego Santos', nickname: 'Fade Master (Cadeira 1)', rating: '5.0', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=96&h=96' },
  { id: 'barber-2', name: 'Lucas Lima', nickname: 'Navalha de Ouro (Cadeira 2)', rating: '4.9', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=96&h=96' },
  { id: 'barber-3', name: 'Matheus Rocha', nickname: 'Especialista VIP (Cadeira 3)', rating: '4.8', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=96&h=96' },
];

// Days Picker
const days = [
  { label: 'Hoje', dayNum: '22', dayWeek: 'Qui', date: '2026-10-22' },
  { label: 'Amanhã', dayNum: '23', dayWeek: 'Sex', date: '2026-10-23' },
  { label: 'Sábado', dayNum: '24', dayWeek: 'Sáb', date: '2026-10-24' },
  { label: 'Segunda', dayNum: '26', dayWeek: 'Seg', date: '2026-10-26' },
  { label: 'Terça', dayNum: '27', dayWeek: 'Ter', date: '2026-10-27' },
];

// Time Slots divididos por Manhã, Tarde e Noite
const timeSlotsMorning = ['09:00', '09:45', '10:30', '11:15'];
const timeSlotsAfternoon = ['13:30', '14:15', '15:00', '15:45', '16:30', '17:15'];
const timeSlotsEvening = ['18:00', '18:45', '19:30', '20:15'];

// User Selections
const selectedServiceId = ref('srv-1');
const selectedBarberId = ref('any');
const selectedDate = ref('2026-10-22');
const selectedTime = ref('15:00');

// Customer Form
const clientName = ref('');
const clientPhone = ref('');
const payOnlineWithDiscount = ref(true);

// State & Feedback
const submitting = ref(false);
const confirmedAppointment = ref<any>(null);
const copiedPix = ref(false);

// Client History (Armazena os agendamentos realizados para visualização na Área do Cliente)
const myAppointments = ref<any[]>([
  {
    id: 'apt-prev-1',
    service: 'Fade Navalhado / Degradê',
    barber: 'Diego Santos',
    date: '10 de Outubro, 2026 às 15:30',
    price: 45.0,
    status: 'Realizado',
    statusColor: 'text-emerald-500 bg-emerald-500/10'
  }
]);

const selectedService = computed(() => {
  return services.find(s => s.id === selectedServiceId.value) || services[0];
});

const selectedBarber = computed(() => {
  return barbers.find(b => b.id === selectedBarberId.value) || barbers[0];
});

const discountValue = computed(() => {
  return payOnlineWithDiscount.value ? selectedService.value.price * 0.10 : 0;
});

const finalPrice = computed(() => {
  return selectedService.value.price - discountValue.value;
});

function copyPixKey() {
  if (!confirmedAppointment.value?.pixCopiaCola) return;
  navigator.clipboard.writeText(confirmedAppointment.value.pixCopiaCola);
  copiedPix.value = true;
  setTimeout(() => {
    copiedPix.value = false;
  }, 3000);
}

function startNewBooking() {
  currentMode.value = 'booking';
  bookingStep.value = 1;
}

function openClientHub() {
  currentMode.value = 'hub';
  hubTab.value = 'appointments';
}

async function submitBooking() {
  if (!clientName.value.trim() || !clientPhone.value.trim()) {
    alert('Por favor, informe seu nome e WhatsApp.');
    return;
  }

  submitting.value = true;
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: clientName.value,
        clientPhone: clientPhone.value,
        serviceId: selectedService.value.id,
        servicePrice: selectedService.value.price,
        barberId: selectedBarber.value.id === 'any' ? 'barber-1' : selectedBarber.value.id,
        startsAt: `${selectedDate.value}T${selectedTime.value}:00`,
        origin: 'PWA_WEB',
        payOnlineWithDiscount: payOnlineWithDiscount.value,
      }),
    });

    const data = await res.json();
    confirmedAppointment.value = data;

    // Adiciona ao histórico do cliente
    myAppointments.value.unshift({
      id: data.id,
      service: selectedService.value.name,
      barber: selectedBarber.value.name,
      date: `${selectedDate.value} às ${selectedTime.value}`,
      price: finalPrice.value,
      status: payOnlineWithDiscount.value ? 'Pix Confirmado (10% OFF)' : 'Confirmado (Balcão)',
      statusColor: 'text-amber-500 bg-amber-500/10'
    });

    bookingStep.value = 5;
  } catch (err) {
    alert('Erro ao agendar horário. Tente novamente.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F4F5F9] dark:bg-[#07090E] text-slate-800 dark:text-slate-100 flex justify-center p-0 sm:p-4 md:p-6 transition-colors duration-300">
    
    <!-- Mobile App Container (PWA Max Width) -->
    <div class="w-full max-w-md bg-white dark:bg-[#11141E] sm:border border-slate-200 dark:border-slate-800/80 sm:rounded-[36px] soft-card-shadow flex flex-col min-h-screen sm:min-h-[890px] overflow-hidden relative shadow-2xl">

      <!-- ================= TOP APP BAR ================= -->
      <header class="relative px-5 pt-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#151926]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        
        <!-- Left: Back Button or Brand Logo -->
        <div class="flex items-center gap-2.5">
          <button 
            v-if="currentMode === 'booking' && bookingStep > 1 && bookingStep < 5" 
            @click="bookingStep = (bookingStep - 1 as any)"
            class="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:opacity-80 transition active:scale-95"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          
          <div v-else-if="currentMode === 'hub'" @click="startNewBooking" class="cursor-pointer flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Scissors class="w-4 h-4 -rotate-45" />
            </div>
            <div>
              <div class="font-bold text-xs text-slate-900 dark:text-white leading-tight">Atelier 88</div>
              <div class="text-[10px] text-slate-400">Barber Lounge</div>
            </div>
          </div>

          <div v-else class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Scissors class="w-4 h-4 -rotate-45" />
            </div>
            <span class="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white uppercase">Atelier 88</span>
          </div>
        </div>

        <!-- Center: Step Progress (if in Booking Wizard) -->
        <div v-if="currentMode === 'booking' && bookingStep < 5" class="flex items-center gap-1.5">
          <span 
            v-for="s in 4" 
            :key="s" 
            class="w-2.5 h-1.5 rounded-full transition-all"
            :class="s === bookingStep ? 'w-5 bg-amber-500' : s < bookingStep ? 'bg-amber-500/40' : 'bg-slate-300 dark:bg-slate-700'"
          ></span>
        </div>

        <!-- Right: Light/Dark Toggle & Client Area Button -->
        <div class="flex items-center gap-2">
          <!-- Light / Dark Mode Toggle -->
          <button 
            @click="toggleTheme" 
            class="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:opacity-80 transition"
            :title="isDark ? 'Modo Claro' : 'Modo Escuro'"
          >
            <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
            <Moon v-else class="w-4 h-4 text-slate-700" />
          </button>

          <!-- Toggle Hub / Booking Button -->
          <button 
            v-if="currentMode === 'booking' && bookingStep < 5"
            @click="openClientHub"
            class="px-2.5 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 transition flex items-center gap-1"
            title="Acessar Minha Área"
          >
            <User class="w-3.5 h-3.5 text-amber-500" />
            <span>Entrar</span>
          </button>
        </div>
      </header>

      <!-- ================= MODALIDADE 1: FLUXO DE AGENDAMENTO (WIZARD) ================= -->
      <div v-if="currentMode === 'booking'" class="flex-1 flex flex-col justify-between overflow-hidden">
        
        <!-- SCROLLABLE BODY -->
        <main class="flex-1 p-5 overflow-y-auto space-y-5">

          <!-- Mini Shop Header (apenas nos primeiros passos) -->
          <div v-if="bookingStep <= 2" class="p-4 rounded-2xl bg-slate-100 dark:bg-[#161A26] border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
            <img 
              src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=120&h=120" 
              class="w-12 h-12 rounded-xl object-cover border border-amber-500/40"
            >
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-slate-900 dark:text-white truncate">Atelier 88 Lounge</h3>
                <span class="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                  <Star class="w-3 h-3 fill-amber-400" /> 4.9
                </span>
              </div>
              <p class="text-[11px] text-slate-400 truncate">Rua Oscar Freire, 1024 • Jardins</p>
              <div class="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aberto até 20h
              </div>
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
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-500' 
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
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/10 ring-1 ring-amber-500 shadow-sm' 
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

            <!-- TURNOS DE HORÁRIOS: MANHÃ, TARDE, NOITE -->
            <div class="space-y-4 pt-2">
              
              <!-- 1. Turno Manhã -->
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

              <!-- 2. Turno Tarde -->
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

              <!-- 3. Turno Noite -->
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
                  v-model="clientName"
                  placeholder="Nome completo" 
                  class="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp</label>
                <input 
                  type="tel" 
                  v-model="clientPhone"
                  placeholder="(11) 98765-4321" 
                  class="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono-num"
                />
              </div>
            </div>

            <!-- OPÇÕES DE PAGAMENTO (10% OFF NO PIX vs BALCÃO) -->
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

          <!-- ================= ETAPA 5: CONFIRMAÇÃO & HUB DE CONCLUSÃO ================= -->
          <div v-else-if="bookingStep === 5" class="space-y-5 text-center animate-in zoom-in-95 duration-200 py-2">
            
            <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Check class="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h2 class="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Horário Reservado!</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tudo certo, <strong>{{ clientName }}</strong>! Seu agendamento para <strong>{{ selectedTime }}</strong> foi registrado na barbearia.
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
                <div class="p-2.5 bg-white rounded-2xl shadow-sm">
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

            <!-- AÇÕES PEDIDAS PELO USUÁRIO: VOLTAR AO INÍCIO OU ACESSAR ÁREA DO CLIENTE -->
            <div class="space-y-2.5 pt-2">
              <button 
                @click="openClientHub" 
                class="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-98"
              >
                <User class="w-4 h-4" />
                <span>Acessar Minha Área de Benefícios & Agendamentos</span>
              </button>

              <button 
                @click="startNewBooking" 
                class="w-full py-3 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Voltar ao Menu Principal
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

      <!-- ================= MODALIDADE 2: ÁREA DO CLIENTE & HUB DE BENEFÍCIOS ================= -->
      <div v-else class="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
        
        <!-- HUB SCROLLABLE CONTENT -->
        <main class="flex-1 p-5 overflow-y-auto space-y-6">

          <!-- User Welcome Profile Banner -->
          <div class="p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-100 to-white dark:from-amber-500/15 dark:via-[#161A26] dark:to-[#11141E] border border-amber-500/20 flex items-center justify-between">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-base shadow-md shadow-amber-500/20">
                {{ (clientName || 'Cliente')[0].toUpperCase() }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-extrabold text-slate-900 dark:text-white">{{ clientName || 'Membro VIP' }}</h2>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                    <Crown class="w-2.5 h-2.5" /> Nível Ouro
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono-num">{{ clientPhone || '+55 (11) 98765-4321' }}</p>
              </div>
            </div>

            <button @click="startNewBooking" class="p-2.5 rounded-full bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" title="Novo Agendamento">
              <PlusCircle class="w-5 h-5" />
            </button>
          </div>

          <!-- CARTÃO FIDELIDADE DIGITAL (4 de 5 Cortes Realizados) -->
          <div class="p-5 rounded-3xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 soft-card-shadow space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Award class="w-4 h-4 text-amber-500" />
                <h3 class="text-xs font-bold text-slate-900 dark:text-white">Cartão Fidelidade Digital</h3>
              </div>
              <span class="text-[11px] font-bold text-amber-500 font-mono-num">4 / 5 Cortes</span>
            </div>

            <!-- Selos de Corte -->
            <div class="flex justify-between gap-2 py-2">
              <div v-for="i in 5" :key="i" class="flex-1 h-11 rounded-2xl border flex items-center justify-center transition" :class="i <= 4 ? 'border-amber-500 bg-amber-500/20 text-amber-500' : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 text-slate-400'">
                <Scissors v-if="i <= 4" class="w-4 h-4 -rotate-45" />
                <Gift v-else class="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <p class="text-[11px] text-slate-400 leading-tight">
              Falta apenas <strong>1 corte</strong> para você resgatar uma <strong>Barboterapia Grátis com Toalha Quente</strong>!
            </p>
          </div>

          <!-- MEUS AGENDAMENTOS (Histórico & Próximos) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-900 dark:text-white">Meus Agendamentos</h3>
              <span class="text-[11px] text-slate-400">{{ myAppointments.length }} registros</span>
            </div>

            <div class="space-y-2.5">
              <div 
                v-for="apt in myAppointments" 
                :key="apt.id"
                class="p-4 rounded-2xl bg-white dark:bg-[#161A26] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900 dark:text-white">{{ apt.service }}</div>
                  <div class="text-[11px] text-slate-400 mt-0.5">Barbeiro: {{ apt.barber }}</div>
                  <div class="text-[10px] text-amber-500 font-mono-num font-semibold mt-1">{{ apt.date }}</div>
                </div>

                <div class="text-right">
                  <div class="text-xs font-extrabold font-mono-num text-slate-900 dark:text-white">R$ {{ apt.price.toFixed(2) }}</div>
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1" :class="apt.statusColor">
                    {{ apt.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- CLUBE BLACK VIP DE ASSINATURA (Cortes Ilimitados) -->
          <div class="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-amber-500/40 space-y-3 relative overflow-hidden shadow-xl">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider">
                Clube de Assinatura
              </span>
              <span class="text-sm font-extrabold font-mono-num text-amber-400">R$ 139/mês</span>
            </div>

            <div>
              <h4 class="text-sm font-bold text-white">Cortes Ilimitados no Mês</h4>
              <p class="text-[11px] text-slate-400 mt-0.5">Corte o cabelo quantas vezes quiser, com cerveja gelada na recepção inclusa.</p>
            </div>

            <button class="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20">
              Conhecer o Clube VIP
            </button>
          </div>

        </main>

        <!-- BOTTOM TAB BAR (Estilo App Nativo) -->
        <nav class="h-16 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md px-6 flex items-center justify-around">
          <button 
            @click="startNewBooking" 
            class="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition"
          >
            <PlusCircle class="w-5 h-5" />
            <span class="text-[10px] font-bold">Novo Corte</span>
          </button>

          <button 
            @click="hubTab = 'appointments'" 
            class="flex flex-col items-center gap-1 text-amber-500"
          >
            <Calendar class="w-5 h-5" />
            <span class="text-[10px] font-bold">Horários</span>
          </button>

          <button 
            @click="hubTab = 'benefits'" 
            class="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 transition"
          >
            <Gift class="w-5 h-5" />
            <span class="text-[10px] font-bold">Benefícios</span>
          </button>
        </nav>

      </div>

    </div>
  </div>
</template>
