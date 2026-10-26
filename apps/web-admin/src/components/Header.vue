<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Sun, Moon, Calendar, Bell, Plus, Sparkles, Menu, X } from 'lucide-vue-next';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const isMobileSearchOpen = ref(false);

const emit = defineEmits<{
  (e: 'open-appointment-modal'): void;
  (e: 'toggle-sidebar'): void;
}>();
</script>

<template>
  <header class="h-16 sm:h-20 px-3 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#131722]/80 backdrop-blur-md sticky top-0 z-30">
    
    <!-- Left Section: Mobile Menu Trigger + Logo on Mobile + Desktop Search -->
    <div class="flex items-center gap-2.5 sm:gap-4 flex-1">
      <!-- Mobile Hamburger Button -->
      <button 
        @click="emit('toggle-sidebar')"
        class="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer shrink-0"
        title="Abrir menu"
      >
        <Menu class="w-5 h-5" />
      </button>

      <!-- Mobile Emblem Logo -->
      <div class="lg:hidden flex items-center gap-1.5 truncate">
        <img 
          src="/emblem-barblyclub.png" 
          alt="Barbly" 
          class="w-7 h-7 object-contain shrink-0"
          onerror="this.src='/logo-barblyclub.svg'"
        />
        <span class="text-xs font-black tracking-tight text-slate-900 dark:text-white truncate max-w-[110px] sm:max-w-none">
          {{ authStore.organization?.name || 'BarblyClub' }}
        </span>
      </div>

      <!-- Desktop Search Bar -->
      <div class="hidden md:flex relative w-64 lg:w-72">
        <Search class="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Buscar cliente, telefone ou serviço..." 
          class="w-full pl-11 pr-4 py-2 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border-transparent text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-subtle transition"
        />
      </div>

      <!-- Trial Countdown Badge (Desktop) -->
      <div v-if="authStore.isTrial" class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold shrink-0">
        <Sparkles class="w-3.5 h-3.5" />
        <span>{{ authStore.trialDaysRemaining }} dias grátis</span>
      </div>
    </div>

    <!-- Right Actions -->
    <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
      <!-- Mobile Search Toggle -->
      <button 
        @click="isMobileSearchOpen = !isMobileSearchOpen"
        class="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        title="Buscar"
      >
        <Search class="w-4 h-4" />
      </button>

      <!-- Light / Dark Mode Toggle -->
      <button 
        @click="themeStore.toggleTheme" 
        class="p-2 sm:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer" 
        :title="themeStore.isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'"
      >
        <Sun v-if="themeStore.isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>

      <!-- Calendar Quick Link -->
      <router-link
        to="/appointments"
        class="hidden sm:flex p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
        title="Agenda e Calendário"
      >
        <Calendar class="w-4 h-4" />
      </router-link>

      <!-- Notifications (Hidden on very small screens) -->
      <button class="hidden sm:flex relative p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Notificações">
        <Bell class="w-4 h-4" />
        <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand ring-2 ring-white dark:ring-slate-900"></span>
      </button>

      <!-- Primary Action CTA (+ Novo Agendamento) -->
      <button 
        @click="router.push('/appointments?new=true')" 
        class="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-full bg-brand hover:opacity-95 text-white font-bold text-xs transition shadow-brand flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
      >
        <Plus class="w-3.5 h-3.5 stroke-[3]" />
        <span class="hidden sm:inline">+ Novo Agendamento</span>
        <span class="sm:hidden font-black">Agendar</span>
      </button>
    </div>
  </header>

  <!-- Mobile Search Drawer (When open) -->
  <div v-if="isMobileSearchOpen" class="md:hidden p-3 bg-slate-50 dark:bg-[#0e131d] border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
    <div class="relative flex-1">
      <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input 
        type="text" 
        placeholder="Buscar cliente, telefone ou serviço..." 
        class="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
        autofocus
      />
    </div>
    <button @click="isMobileSearchOpen = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
