<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { 
  MessageSquareCode, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  Clock,
  Scissors,
  Split,
  ShieldCheck,
  Zap
} from 'lucide-vue-next';

interface ChatMessage {
  id: string;
  sender: 'client' | 'ai';
  text: string;
  time: string;
  bookingData?: any;
  pixCopiaCola?: string;
}

const clientPhone = ref('+55 (11) 98765-4321');
const clientName = ref('Arthur Silveira');
const inputText = ref('');
const sending = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const copiedPix = ref<string | null>(null);

const messages = ref<ChatMessage[]>([
  {
    id: 'msg-1',
    sender: 'ai',
    text: `Olá! 💈 Seja muito bem-vindo ao *Atelier 88 Barber Lounge*!\n\nSou a secretária virtual inteligente da barbearia. Como posso te ajudar hoje?\n\n• Consultar horários livres para hoje ou amanhã\n• Ver tabela de serviços com 10% OFF no Pix\n• Agendar um corte direto comigo`,
    time: '11:15'
  }
]);

const quickPrompts = [
  'Quanto custa o corte e a barba?',
  'Tem horário livre amanhã à tarde com o Diego?',
  'Quero agendar o Combo para hoje às 16:30 com o Lucas',
  'Vocês abrem no sábado?'
];

async function sendMessage(textToSend?: string) {
  const content = textToSend || inputText.value.trim();
  if (!content || sending.value) return;

  inputText.value = '';
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Append user message
  messages.value.push({
    id: `msg-${Date.now()}`,
    sender: 'client',
    text: content,
    time: now,
  });

  scrollToBottom();
  sending.value = true;

  try {
    const res = await fetch('/api/whatsapp/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: clientPhone.value,
        clientName: clientName.value,
        message: content,
      }),
    });

    const data = await res.json();

    // 2. Append AI response
    messages.value.push({
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: data.reply,
      time: data.timestamp || now,
      bookingData: data.bookingData,
      pixCopiaCola: data.pixCopiaCola,
    });
  } catch (err) {
    messages.value.push({
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: 'Desculpe, ocorreu uma instabilidade momentânea na conexão. Pode repetir?',
      time: now,
    });
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function copyPix(code: string) {
  navigator.clipboard.writeText(code);
  copiedPix.value = code;
  setTimeout(() => { copiedPix.value = null; }, 3000);
}

function clearChat() {
  messages.value = [
    {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Olá, ${clientName.value}! 💈 Sou a secretária virtual inteligente do *Atelier 88*. Como posso te ajudar hoje?`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ];
}
</script>

<template>
  <div class="p-8 max-w-6xl space-y-6">
    
    <!-- Top Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Atendente Virtual WhatsApp IA</h1>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Motor IA Ativo 24h
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">Simule e acompanhe como a IA atende seus clientes no WhatsApp, consulta vagas e aplica os 10% de desconto no Pix.</p>
      </div>

      <button 
        @click="clearChat" 
        class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-2 transition"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>Limpar Conversa</span>
      </button>
    </div>

    <!-- Layout Grid: Left Chat Simulator (WhatsApp Phone) + Right Live Analytics & Split Insights -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- 1. WHATSAPP CHAT SIMULATOR (7 cols) -->
      <div class="lg:col-span-7 bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[28px] overflow-hidden soft-card-shadow flex flex-col h-[680px]">
        
        <!-- WhatsApp Header -->
        <div class="p-4 bg-slate-100 dark:bg-[#181D2B] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                <Bot class="w-5 h-5" />
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#181D2B]"></span>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Atelier 88 • Secretária IA
                <span class="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-500 font-bold">VERIFICADA</span>
              </div>
              <div class="text-[10px] text-slate-400 flex items-center gap-1">
                <span>Atendendo: <strong>{{ clientName }}</strong> ({{ clientPhone }})</span>
              </div>
            </div>
          </div>

          <div class="text-[10px] text-slate-400 font-mono-num bg-slate-200/60 dark:bg-slate-800 px-2 py-1 rounded-lg">
            Webhook: /api/webhooks/whatsapp
          </div>
        </div>

        <!-- Messages Area (Simulates WhatsApp Background) -->
        <div 
          ref="chatContainer"
          class="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/70 dark:bg-[#0E1119] scroll-smooth"
        >
          <!-- Encryption note badge -->
          <div class="flex justify-center">
            <span class="text-[10px] text-slate-400 bg-white/80 dark:bg-[#141824] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              🔒 As mensagens são sincronizadas e processadas pelo motor do SaaS.
            </span>
          </div>

          <!-- Chat Bubbles -->
          <div 
            v-for="msg in messages" 
            :key="msg.id"
            class="flex flex-col"
            :class="msg.sender === 'client' ? 'items-end' : 'items-start'"
          >
            <div 
              class="max-w-[85%] rounded-2xl p-4 text-xs shadow-sm space-y-2 relative"
              :class="msg.sender === 'client' 
                ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none' 
                : 'bg-white dark:bg-[#171C28] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-none'"
            >
              <!-- Message Text (Markdown with line breaks) -->
              <div class="whitespace-pre-line leading-relaxed">{{ msg.text }}</div>

              <!-- Extra Booking Card if an appointment was booked by AI -->
              <div 
                v-if="msg.bookingData"
                class="mt-3 p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-[11px] space-y-1.5"
              >
                <div class="flex items-center justify-between font-bold text-amber-500 border-b border-amber-500/20 pb-1">
                  <span class="flex items-center gap-1"><Sparkles class="w-3.5 h-3.5" /> Ação da IA: Agenda Travada</span>
                  <span class="font-mono-num font-bold">10% OFF</span>
                </div>
                <div class="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Barbeiro: <strong>{{ msg.bookingData.barber }}</strong></span>
                  <span>Hoje às <strong>{{ msg.bookingData.time }}</strong></span>
                </div>
                <div class="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Valor com Desconto:</span>
                  <strong class="text-emerald-500 font-mono-num">R$ {{ msg.bookingData.finalPrice.toFixed(2) }}</strong>
                </div>

                <!-- Copy Pix button inside bubble -->
                <button 
                  v-if="msg.pixCopiaCola"
                  @click="copyPix(msg.pixCopiaCola)"
                  class="w-full mt-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Copy class="w-3 h-3" />
                  <span>{{ copiedPix === msg.pixCopiaCola ? 'Pix Copiado!' : 'Copiar Código Pix Copia-e-Cola' }}</span>
                </button>
              </div>

              <!-- Timestamp -->
              <div class="text-[9px] text-right opacity-60 font-mono-num mt-1">
                {{ msg.time }}
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Prompts Chips -->
        <div class="p-2.5 bg-slate-100/80 dark:bg-[#131722] border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
          <button 
            v-for="prompt in quickPrompts" 
            :key="prompt"
            @click="sendMessage(prompt)"
            class="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-[#181D2B] border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 transition shrink-0 active:scale-95"
          >
            {{ prompt }}
          </button>
        </div>

        <!-- Input Box -->
        <div class="p-3.5 bg-white dark:bg-[#151926] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input 
            type="text" 
            v-model="inputText"
            @keydown.enter="sendMessage()"
            placeholder="Digite como se fosse um cliente pelo WhatsApp..."
            class="flex-1 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-[#10131B] border border-transparent focus:border-amber-500 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button 
            @click="sendMessage()"
            :disabled="sending"
            class="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>

      </div>

      <!-- 2. LIVE SPLIT & CAPABILITIES PANEL (5 cols) -->
      <div class="lg:col-span-5 space-y-5">
        
        <!-- Card 1: Como Funciona o Motor de IA -->
        <div class="p-6 rounded-[28px] bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 soft-card-shadow space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Zap class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Automação com Tool Calling</h3>
              <p class="text-[11px] text-slate-400">Inteligência conversacional integrada à API</p>
            </div>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#171C28] border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
              <Check class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong class="text-slate-900 dark:text-white block">Consulta de Grade ao Vivo</strong>
                <span class="text-slate-500 dark:text-slate-400 text-[11px]">Identifica datas relativas ("amanhã", "à tarde", "sábado") e cruza com a agenda dos barbeiros.</span>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#171C28] border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
              <Check class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong class="text-slate-900 dark:text-white block">Oferta Instantânea de 10% OFF no Pix</strong>
                <span class="text-slate-500 dark:text-slate-400 text-[11px]">Envia o código Pix Copia-e-Cola na hora para garantir a reserva e reduzir o no-show a zero.</span>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-[#171C28] border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
              <Check class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong class="text-slate-900 dark:text-white block">Split Automático da Lei do Salão</strong>
                <span class="text-slate-500 dark:text-slate-400 text-[11px]">Calcula em tempo real a comissão do barbeiro parceiro e retém a taxa da sua plataforma SaaS.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Exemplo de Split em Tempo Real -->
        <div class="p-6 rounded-[28px] bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 soft-card-shadow space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <Split class="w-4 h-4 text-amber-500" />
              <h3 class="text-xs font-bold text-slate-900 dark:text-white">Divisão Financeira por Atendimento</h3>
            </div>
            <span class="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Lei 13.352</span>
          </div>

          <div class="space-y-2 text-xs font-mono-num">
            <div class="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Valor Bruto do Corte:</span>
              <span class="text-slate-800 dark:text-slate-200 font-bold">R$ 50,00</span>
            </div>
            <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Desconto Pix Antecipado (10%):</span>
              <span>- R$ 5,00</span>
            </div>
            <div class="flex justify-between text-slate-900 dark:text-white font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Total Pago pelo Cliente:</span>
              <span class="text-amber-500">R$ 45,00</span>
            </div>

            <div class="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
              <div class="flex justify-between text-slate-600 dark:text-slate-400">
                <span>• Cota do Salão (50%):</span>
                <strong class="text-slate-800 dark:text-slate-200">R$ 22,50</strong>
              </div>
              <div class="flex justify-between text-slate-600 dark:text-slate-400">
                <span>• Cota do Barbeiro MEI (50%):</span>
                <strong class="text-slate-800 dark:text-slate-200">R$ 22,50</strong>
              </div>
              <div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                <span>• Taxa Retida da sua Plataforma SaaS:</span>
                <span>R$ 1,49 / transação</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>
