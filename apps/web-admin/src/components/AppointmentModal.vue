<script setup lang="ts">
import { Check, X, Printer, Send } from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-[28px] w-full max-w-lg p-6 sm:p-8 soft-card-shadow relative animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Close Button -->
      <button @click="emit('close')" class="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
        <X class="w-5 h-5" />
      </button>

      <!-- Center Green Success Ring Icon -->
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
          <Check class="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Agendamento Confirmado!</h2>
        <p class="text-xs text-slate-400 mt-1">O horário foi reservado e sincronizado com o WhatsApp do cliente.</p>
      </div>

      <!-- APPOINTMENT SUMMARY CARD -->
      <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-4 mb-6">
        <div class="text-[10px] font-bold text-brand uppercase tracking-wider">Resumo do Atendimento</div>

        <!-- Client info -->
        <div class="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=96&h=96" class="w-10 h-10 rounded-full object-cover">
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Jordan Hedge</div>
            <div class="text-[11px] text-slate-400 font-mono-num">+55 (11) 98765-4321 • jordan@exemplo.com</div>
          </div>
        </div>

        <!-- Service & Stylist Details -->
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">SERVIÇO</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">Coloração de Barba</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">BARBEIRO DESIGNADO</span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=40&h=40" class="w-4 h-4 rounded-full object-cover">
              <span class="font-bold text-slate-800 dark:text-slate-200">Colorista Sofia</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">DATA</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">21 de Outubro, 2026</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold">HORÁRIO & DURAÇÃO</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">11:00 - 12:30 (90 min)</span>
          </div>
        </div>

        <!-- Price Breakdown & Discount Feature -->
        <div class="pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 block">FORMA DE PAGAMENTO</span>
            <span class="text-xs font-bold text-emerald-600 flex items-center gap-1">
              ⚡ Pix Antecipado (10% OFF Aplicado)
            </span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 line-through mr-1 font-mono-num">R$ 140,00</span>
            <span class="text-lg font-extrabold text-brand font-mono-num">R$ 126,00</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <button @click="emit('close')" class="flex-1 py-3 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition">
          <Printer class="w-4 h-4 text-slate-400" />
          <span>Imprimir Ficha</span>
        </button>
        <button @click="emit('close')" class="flex-1 py-3 px-4 rounded-full bg-brand hover:opacity-95 text-white text-xs font-bold shadow-brand flex items-center justify-center gap-2 transition">
          <Send class="w-4 h-4" />
          <span>Enviar via WhatsApp</span>
        </button>
      </div>

    </div>
  </div>
</template>
