<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { 
  LayoutDashboard, 
  Calendar,
  Wallet, 
  Menu,
  Plus
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const emit = defineEmits<{
  (e: 'open-menu'): void;
  (e: 'open-appointment-modal'): void;
}>();

function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

function handleTabClick() {
  playPopSound();
}
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0e131d]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 shadow-[0_-4px_25px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
    <div class="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
      
      <!-- 1. Início / Dashboard -->
      <router-link 
        to="/" 
        @click="handleTabClick"
        class="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition"
        :class="route.path === '/' ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'"
      >
        <div class="relative">
          <LayoutDashboard class="w-5 h-5 stroke-[2.2]" />
          <span v-if="route.path === '/'" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </div>
        <span class="text-[10px] mt-1 font-medium">Início</span>
      </router-link>

      <!-- 2. Agenda & Calendário Interativo -->
      <router-link 
        to="/appointments" 
        @click="handleTabClick"
        class="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition"
        :class="route.path === '/appointments' ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'"
      >
        <div class="relative">
          <Calendar class="w-5 h-5 stroke-[2.2]" />
          <span v-if="route.path === '/appointments'" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </div>
        <span class="text-[10px] mt-1 font-medium">Agenda</span>
      </router-link>

      <!-- 3. Botão Central: Novo Agendamento (+) -->
      <div class="flex items-center justify-center -mt-5 px-1">
        <button 
          @click="playPopSound(); router.push('/appointments?new=true')"
          class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/40 flex items-center justify-center active:scale-95 transition transform cursor-pointer border-2 border-white dark:border-[#0e131d]"
          title="Novo Agendamento Rápido"
        >
          <Plus class="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      <!-- 4. Financeiro & Split -->
      <router-link 
        to="/financial" 
        @click="handleTabClick"
        class="flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition"
        :class="route.path === '/financial' ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'"
      >
        <div class="relative">
          <Wallet class="w-5 h-5 stroke-[2.2]" />
          <span v-if="route.path === '/financial'" class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </div>
        <span class="text-[10px] mt-1 font-medium">Financeiro</span>
      </router-link>

      <!-- 5. Menu Mais / Gaveta -->
      <button 
        @click="playPopSound(); emit('open-menu')"
        class="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
      >
        <Menu class="w-5 h-5 stroke-[2.2]" />
        <span class="text-[10px] mt-1 font-medium">Mais</span>
      </button>

    </div>
  </nav>
</template>
