<script setup lang="ts">
import { ref, computed } from 'vue';
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
  Loader2
} from 'lucide-vue-next';

// Steps: 1: Service & Barber, 2: Date & Time, 3: Details & Payment Choice, 4: Confirmed & Pix
const currentStep = ref<1 | 2 | 3 | 4>(1);

// Services list
const services = [
  { id: 'srv-1', name: 'Fade Navalhado / Degradê', duration: 40, price: 50.0, popular: true },
  { id: 'srv-2', name: 'Barboterapia com Toalha Quente', duration: 30, price: 45.0, popular: false },
  { id: 'srv-3', name: 'Combo Completo (Cabelo + Barba)', duration: 60, price: 85.0, popular: true },
  { id: 'srv-4', name: 'Corte Clássico na Tesoura', duration: 45, price: 55.0, popular: false },
  { id: 'srv-5', name: 'Alinhamento & Pigmentação', duration: 25, price: 35.0, popular: false },
];

// Barbers list
const barbers = [
  { id: 'any', name: 'Qualquer Barbeiro', nickname: 'Mais rápido disponível', avatar: '' },
  { id: 'barber-1', name: 'Diego Santos', nickname: 'Fade Master (Cadeira 1)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=96&h=96' },
  { id: 'barber-2', name: 'Lucas Lima', nickname: 'Navalha de Ouro (Cadeira 2)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=96&h=96' },
  { id: 'barber-3', name: 'Matheus Rocha', nickname: 'Especialista VIP (Cadeira 3)', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=96&h=96' },
];

// Available days (Today + next 4 days)
const days = [
  { label: 'Hoje', dayNum: '22', dayWeek: 'Qui', date: '2026-10-22' },
  { label: 'Amanhã', dayNum: '23', dayWeek: 'Sex', date: '2026-10-23' },
  { label: 'Sábado', dayNum: '24', dayWeek: 'Sáb', date: '2026-10-24' },
  { label: 'Segunda', dayNum: '26', dayWeek: 'Seg', date: '2026-10-26' },
  { label: 'Terça', dayNum: '27', dayWeek: 'Ter', date: '2026-10-27' },
];

const timeSlots = [
  '09:00', '09:45', '10:30', '11:15', '14:00', '14:45', '15:30', '16:15', '17:00', '18:00', '18:45', '19:30'
];

// User Selections
const selectedServiceId = ref('srv-1');
const selectedBarberId = ref('any');
const selectedDate = ref('2026-10-22');
const selectedTime = ref('14:45');

// Customer form
const clientName = ref('');
const clientPhone = ref('');
const payOnlineWithDiscount = ref(true); // Default to the 10% OFF Pix incentive!

// Loading & Final result
const submitting = ref(false);
const confirmedAppointment = ref<any>(null);
const copiedPix = ref(false);

const selectedService = computed(() => {
  return services.find(s => s.id === selectedServiceId.value) || services[0];
});

const selectedBarber = computed(() => {
  return barbers.find(b => b.id === selectedBarberId.value) || barbers[0];
});

// Calculate prices with 10% discount
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
    currentStep.value = 4;
  } catch (err) {
    alert('Erro ao agendar horário. Tente novamente.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#090B10] text-slate-100 flex justify-center p-0 sm:p-4 md:p-6">
    <!-- Mobile App Container (PWA Max Width) -->
    <div class="w-full max-w-md bg-[#11141E] sm:border border-slate-800/80 sm:rounded-[32px] soft-card-shadow flex flex-col min-h-screen sm:min-h-[880px] overflow-hidden relative">

      <!-- 1. TOP HERO HEADER -->
      <header class="relative p-6 pb-5 border-b border-slate-800/80 bg-gradient-to-b from-[#181D2B] to-[#11141E]">
        <div class="flex items-center justify-between mb-4">
          <button 
            v-if="currentStep > 1 && currentStep < 4" 
            @click="currentStep = (currentStep - 1 as any)"
            class="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div v-else class="w-8"></div>

          <!-- Brand Symbol -->
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md shadow-amber-500/20">
              <Scissors class="w-4 h-4 -rotate-45" />
            </div>
            <span class="font-extrabold text-sm tracking-tight text-white uppercase">Atelier 88</span>
          </div>

          <!-- Step Indicator -->
          <span v-if="currentStep < 4" class="text-[11px] font-mono-num font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            Passo {{ currentStep }}/3
          </span>
          <div v-else class="w-8"></div>
        </div>

        <!-- Shop Info Card -->
        <div class="flex items-center gap-3.5">
          <img 
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=140&h=140" 
            class="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/30 shadow-md"
          >
          <div>
            <h1 class="text-base font-bold text-white tracking-tight">Atelier 88 Barber Lounge</h1>
            <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span class="flex items-center gap-1 text-amber-400 font-semibold font-mono-num">
                <Star class="w-3.5 h-3.5 fill-amber-400" /> 4.9
              </span>
              <span>•</span>
              <span class="flex items-center gap-1 text-emerald-400 font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Aberto agora
              </span>
            </div>
            <p class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin class="w-3 h-3 text-slate-400" /> Rua Oscar Freire, 1024 • Jardins
            </p>
          </div>
        </div>
      </header>

      <!-- 2. BODY CONTENT ACCORDING TO STEP -->
      <main class="flex-1 p-5 overflow-y-auto space-y-6">

        <!-- ================= PASSO 1: SERVIÇOS & BARBEIRO ================= -->
        <div v-if="currentStep === 1" class="space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 class="text-sm font-bold text-white tracking-tight">1. Selecione o Serviço</h2>
            <p class="text-xs text-slate-400">Escolha o procedimento desejado hoje:</p>
          </div>

          <!-- Services Radio Cards -->
          <div class="space-y-2.5">
            <div 
              v-for="service in services" 
              :key="service.id"
              @click="selectedServiceId = service.id"
              class="p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between"
              :class="selectedServiceId === service.id 
                ? 'border-amber-500 bg-amber-500/10 shadow-sm' 
                : 'border-slate-800 bg-[#161A26] hover:border-slate-700'"
            >
              <div class="flex-1 pr-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-white">{{ service.name }}</span>
                  <span v-if="service.popular" class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                    Mais Pedido
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock class="w-3 h-3 text-slate-400" />
                  <span>{{ service.duration }} min</span>
                  <span>•</span>
                  <span class="text-emerald-400 font-medium">10% OFF no Pix</span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-sm font-extrabold font-mono-num text-white">
                  R$ {{ service.price.toFixed(2) }}
                </div>
                <div class="text-[10px] font-mono-num text-emerald-400">
                  R$ {{ (service.price * 0.9).toFixed(2) }} c/ Pix
                </div>
              </div>
            </div>
          </div>

          <!-- Choose Barber -->
          <div class="pt-2">
            <h2 class="text-sm font-bold text-white tracking-tight mb-1">Profissional</h2>
            <p class="text-xs text-slate-400 mb-3">Escolha seu barbeiro de preferência:</p>

            <div class="grid grid-cols-2 gap-2.5">
              <div 
                v-for="barber in barbers" 
                :key="barber.id"
                @click="selectedBarberId = barber.id"
                class="p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between"
                :class="selectedBarberId === barber.id 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-slate-800 bg-[#161A26] hover:border-slate-700'"
              >
                <div class="flex items-center gap-2.5">
                  <img 
                    v-if="barber.avatar" 
                    :src="barber.avatar" 
                    class="w-8 h-8 rounded-full object-cover border border-slate-700"
                  >
                  <div v-else class="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                    <User class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-white truncate">{{ barber.name }}</div>
                    <div class="text-[10px] text-slate-400 truncate">{{ barber.nickname }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= PASSO 2: DATA & HORÁRIO ================= -->
        <div v-else-if="currentStep === 2" class="space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 class="text-sm font-bold text-white tracking-tight">2. Escolha o Melhor Horário</h2>
            <p class="text-xs text-slate-400">Selecione o dia e o horário conveniente:</p>
          </div>

          <!-- Horizontal Days Picker -->
          <div class="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <div 
              v-for="day in days" 
              :key="day.date"
              @click="selectedDate = day.date"
              class="flex-1 min-w-[72px] p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-between"
              :class="selectedDate === day.date 
                ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' 
                : 'border-slate-800 bg-[#161A26] text-slate-400 hover:border-slate-700'"
            >
              <span class="text-[10px] uppercase font-bold tracking-wider opacity-80">{{ day.dayWeek }}</span>
              <span class="text-lg font-extrabold font-mono-num my-0.5" :class="selectedDate === day.date ? 'text-slate-950' : 'text-white'">{{ day.dayNum }}</span>
              <span class="text-[10px] font-medium">{{ day.label }}</span>
            </div>
          </div>

          <!-- Time Slots Grid -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-300">Horários Disponíveis</span>
              <span class="text-[11px] text-emerald-400 font-medium">✓ Grade atualizada</span>
            </div>

            <div class="grid grid-cols-3 gap-2.5 font-mono-num">
              <button 
                v-for="time in timeSlots" 
                :key="time"
                @click="selectedTime = time"
                class="py-3 px-2 rounded-xl text-xs font-bold transition border"
                :class="selectedTime === time 
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-2 ring-amber-500/30' 
                  : 'border-slate-800 bg-[#161A26] text-slate-300 hover:border-slate-700'"
              >
                {{ time }}
              </button>
            </div>
          </div>
        </div>

        <!-- ================= PASSO 3: CHECKOUT & OFERTA ANTI NO-SHOW ================= -->
        <div v-else-if="currentStep === 3" class="space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 class="text-sm font-bold text-white tracking-tight">3. Seus Dados & Forma de Pagamento</h2>
            <p class="text-xs text-slate-400">Preencha rapidamente para confirmar sua cadeira:</p>
          </div>

          <!-- Customer Input Fields -->
          <div class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Seu Nome Completo</label>
              <input 
                type="text" 
                v-model="clientName"
                placeholder="Ex: João da Silva" 
                class="w-full px-4 py-3 rounded-2xl bg-[#161A26] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp (para receber lembrete)</label>
              <input 
                type="tel" 
                v-model="clientPhone"
                placeholder="(11) 98765-4321" 
                class="w-full px-4 py-3 rounded-2xl bg-[#161A26] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono-num"
              />
            </div>
          </div>

          <!-- THE KILLER PAYMENT CHOICE (10% OFF NO PIX vs BALCÃO) -->
          <div class="space-y-3 pt-2">
            <span class="text-xs font-bold text-slate-300">Escolha como prefere pagar:</span>

            <!-- Option 1: Pix Antecipado com 10% OFF (Destaque Dourado / Verde) -->
            <div 
              @click="payOnlineWithDiscount = true"
              class="p-4 rounded-2xl border-2 transition cursor-pointer relative overflow-hidden"
              :class="payOnlineWithDiscount 
                ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' 
                : 'border-slate-800 bg-[#161A26] hover:border-slate-700'"
            >
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">⚡ Pagar agora via Pix</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 font-mono">
                      10% OFF
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">Horário 100% blindado na grade, sem fila no balcão.</p>
                </div>
                
                <div class="text-right">
                  <div class="text-xs text-slate-500 line-through font-mono-num">R$ {{ selectedService.price.toFixed(2) }}</div>
                  <div class="text-base font-extrabold font-mono-num text-amber-400">R$ {{ (selectedService.price * 0.9).toFixed(2) }}</div>
                </div>
              </div>

              <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                <span class="flex items-center gap-1"><ShieldCheck class="w-3.5 h-3.5" /> Garantia total de vaga</span>
                <span class="font-bold">Você economiza R$ {{ (selectedService.price * 0.1).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Option 2: Pagar no Balcão (Preço Cheio) -->
            <div 
              @click="payOnlineWithDiscount = false"
              class="p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between"
              :class="!payOnlineWithDiscount 
                ? 'border-slate-400 bg-slate-800/30' 
                : 'border-slate-800 bg-[#161A26] opacity-70 hover:opacity-100'"
            >
              <div>
                <div class="text-xs font-bold text-slate-300">Pagar presencialmente no balcão</div>
                <div class="text-[11px] text-slate-500 mt-0.5">Pagamento após o corte (dinheiro ou cartão).</div>
              </div>
              <div class="text-sm font-bold font-mono-num text-white">
                R$ {{ selectedService.price.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <!-- ================= PASSO 4: CONFIRMAÇÃO & PIX ================= -->
        <div v-else-if="currentStep === 4" class="space-y-6 text-center animate-in zoom-in-95 duration-150">
          
          <!-- Success Ring -->
          <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <Check class="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <h2 class="text-lg font-bold text-white tracking-tight">Horário Reservado com Sucesso!</h2>
            <p class="text-xs text-slate-400 mt-1">
              Olá, <strong>{{ clientName }}</strong>! Seu agendamento para <strong>{{ selectedTime }}</strong> foi registrado.
            </p>
          </div>

          <!-- Pix Payment Card if Online Payment selected -->
          <div v-if="payOnlineWithDiscount" class="p-5 rounded-2xl bg-[#161A26] border border-amber-500/30 text-left space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pagamento via Pix</span>
                <div class="text-xs font-bold text-white">Chave Copia e Cola</div>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500 line-through font-mono-num">R$ {{ selectedService.price.toFixed(2) }}</span>
                <div class="text-base font-extrabold font-mono-num text-emerald-400">R$ {{ finalPrice.toFixed(2) }}</div>
              </div>
            </div>

            <!-- QR Code Simulation -->
            <div class="flex items-center justify-center py-2">
              <div class="p-3 bg-white rounded-2xl shadow-md">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=00020126580014br.gov.bcb.pix0136barber-atelier88-split" class="w-28 h-28">
              </div>
            </div>

            <!-- Copy Key Button -->
            <button 
              @click="copyPixKey" 
              class="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20"
            >
              <Copy class="w-4 h-4" />
              <span>{{ copiedPix ? 'Código Pix Copiado com Sucesso!' : 'Copiar Código Pix Copia-e-Cola' }}</span>
            </button>
            <p class="text-[10px] text-center text-slate-400">Após o pagamento no app do seu banco, a confirmação é imediata.</p>
          </div>

          <!-- Summary Ticket -->
          <div class="p-4 rounded-2xl bg-[#161A26] border border-slate-800 text-left space-y-2 text-xs">
            <div class="flex justify-between text-slate-400">
              <span>Serviço:</span>
              <strong class="text-white">{{ selectedService.name }}</strong>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Barbeiro:</span>
              <strong class="text-white">{{ selectedBarber.name }}</strong>
            </div>
            <div class="flex justify-between text-slate-400 font-mono-num">
              <span>Data & Hora:</span>
              <strong class="text-amber-400">{{ selectedDate }} às {{ selectedTime }}</strong>
            </div>
          </div>

          <!-- WhatsApp Chat Action -->
          <a 
            :href="`https://wa.me/5511987654321?text=Ol%C3%A1%2C%20agendei%20meu%20hor%C3%A1rio%20pelo%20app%20para%20${selectedTime}%20com%20${clientName}!`" 
            target="_blank"
            class="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <MessageCircle class="w-4 h-4" />
            <span>Falar com a Barbearia no WhatsApp</span>
          </a>

        </div>

      </main>

      <!-- 3. BOTTOM FIXED ACTION BAR (Steps 1, 2, 3) -->
      <footer v-if="currentStep < 4" class="p-4 border-t border-slate-800/80 bg-[#141824] flex items-center justify-between gap-3">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Total a Pagar</span>
          <div class="flex items-baseline gap-1.5 font-mono-num">
            <span class="text-lg font-extrabold text-white">R$ {{ finalPrice.toFixed(2) }}</span>
            <span v-if="payOnlineWithDiscount" class="text-[11px] text-emerald-400 font-bold">10% OFF</span>
          </div>
        </div>

        <button 
          v-if="currentStep === 1"
          @click="currentStep = 2"
          class="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-brand"
        >
          <span>Escolher Horário</span>
          <ChevronRight class="w-4 h-4" />
        </button>

        <button 
          v-else-if="currentStep === 2"
          @click="currentStep = 3"
          class="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-brand"
        >
          <span>Avançar para Pagamento</span>
          <ChevronRight class="w-4 h-4" />
        </button>

        <button 
          v-else-if="currentStep === 3"
          @click="submitBooking"
          :disabled="submitting"
          class="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-brand disabled:opacity-50"
        >
          <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
          <span>{{ submitting ? 'Confirmando...' : 'Finalizar Agendamento' }}</span>
        </button>
      </footer>

    </div>
  </div>
</template>
