<script setup lang="ts">
import { useRoute } from 'vue-router';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  UserCheck, 
  Split, 
  TrendingUp, 
  MessageSquareCode, 
  Settings,
  ChevronDown
} from 'lucide-vue-next';

const route = useRoute();
</script>

<template>
  <aside class="w-64 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between p-5 bg-white dark:bg-[#131722] shrink-0">
    <div>
      <!-- Brand Logo -->
      <div class="flex items-center gap-2.5 px-2 mb-8">
        <div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-brand transition-all">
          <Scissors class="w-5 h-5 -rotate-45" />
        </div>
        <span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">barber.ia</span>
      </div>

      <!-- Section: GERAL -->
      <div class="mb-6">
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Geral</div>
        <nav class="space-y-1">
          <router-link 
            to="/" 
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <LayoutDashboard class="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </router-link>

          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <Calendar class="w-4 h-4" />
              <span>Agendamentos</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">32</span>
          </a>

          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <Users class="w-4 h-4" />
              <span>Clientes</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">1.284</span>
          </a>

          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <Scissors class="w-4 h-4" />
              <span>Serviços & Preços</span>
            </div>
          </a>

          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <UserCheck class="w-4 h-4" />
              <span>Equipe & Barbeiros</span>
            </div>
          </a>
        </nav>
      </div>

      <!-- Section: FINANCE -->
      <div class="mb-6">
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Financeiro & Split</div>
        <nav class="space-y-1">
          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <Split class="w-4 h-4" />
              <span>Split Salão-Parceiro</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand text-white uppercase">Lei 13.352</span>
          </a>

          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <TrendingUp class="w-4 h-4" />
              <span>Repasses & Extratos</span>
            </div>
          </a>
        </nav>
      </div>

      <!-- Section: AUTOMATION & SETTINGS -->
      <div>
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Sistema</div>
        <nav class="space-y-1">
          <a href="#" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium text-xs transition">
            <div class="flex items-center gap-3">
              <MessageSquareCode class="w-4 h-4 text-emerald-500" />
              <span>WhatsApp IA</span>
            </div>
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </a>

          <router-link 
            to="/settings" 
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/settings' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Settings class="w-4 h-4" />
              <span>Configurações & Cores</span>
            </div>
          </router-link>
        </nav>
      </div>
    </div>

    <!-- User Profile at bottom -->
    <div class="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=96&h=96" class="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700">
        <div>
          <div class="text-xs font-bold text-slate-900 dark:text-white">Marcus Lima</div>
          <div class="text-[11px] text-slate-400">Master Barber & Dono</div>
        </div>
      </div>
      <ChevronDown class="w-4 h-4 text-slate-400" />
    </div>
  </aside>
</template>
