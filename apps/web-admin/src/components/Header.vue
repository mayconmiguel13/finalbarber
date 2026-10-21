<script setup lang="ts">
import { Search, Sun, Moon, Calendar, Bell, Plus } from 'lucide-vue-next';
import { useThemeStore } from '../stores/theme';

const themeStore = useThemeStore();

const emit = defineEmits<{
  (e: 'open-appointment-modal'): void;
}>();
</script>

<template>
  <header class="h-20 px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#131722]/70 backdrop-blur-md sticky top-0 z-30">
    <!-- Search Input -->
    <div class="relative w-72">
      <Search class="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
      <input 
        type="text" 
        placeholder="Buscar cliente, telefone ou serviço..." 
        class="w-full pl-11 pr-4 py-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border-transparent text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-subtle transition"
      />
    </div>

    <!-- Header Actions -->
    <div class="flex items-center gap-3">
      <!-- Calendar View -->
      <button class="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Calendário">
        <Calendar class="w-4 h-4" />
      </button>

      <!-- Notifications -->
      <button class="relative p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Notificações">
        <Bell class="w-4 h-4" />
        <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand ring-2 ring-white dark:ring-slate-900"></span>
      </button>

      <!-- Light / Dark Mode Toggle -->
      <button 
        @click="themeStore.toggleTheme" 
        class="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition" 
        :title="themeStore.isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'"
      >
        <Sun v-if="themeStore.isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>

      <!-- Primary Action CTA (+ Novo Agendamento) -->
      <button 
        @click="emit('open-appointment-modal')" 
        class="px-5 py-2.5 rounded-full bg-brand hover:opacity-95 text-white font-semibold text-xs transition shadow-brand flex items-center gap-2"
      >
        <Plus class="w-4 h-4" />
        <span>+ Novo Agendamento</span>
      </button>
    </div>
  </header>
</template>
