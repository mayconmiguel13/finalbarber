<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  UserCheck, 
  Package,
  Wallet,
  MessageSquareCode, 
  Settings,
  LogOut,
  Sparkles,
  Smartphone,
  X
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const props = defineProps<{
  isMobileOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  emit('close');
  authStore.logout();
  router.push('/login');
}

function handleLinkClick() {
  emit('close');
}
</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="props.isMobileOpen" 
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
      @click="emit('close')"
    ></div>
  </Transition>

  <!-- Sidebar Content Container -->
  <aside 
    class="border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between p-5 bg-white dark:bg-[#131722] shrink-0 z-50 transition-transform duration-300 ease-out overflow-y-auto no-scrollbar"
    :class="[
      // Desktop: fixed in-flow
      'lg:relative lg:translate-x-0 lg:w-64 lg:flex',
      // Mobile: drawer sliding from left
      'fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl',
      props.isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div>
      <!-- Brand Logo, Organization Name & Mobile Close Button -->
      <div class="px-2 mb-6">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 truncate">
            <img 
              src="/emblem-barblyclub.png" 
              alt="BarblyClub" 
              class="w-10 h-10 object-contain drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)] shrink-0"
              onerror="this.src='/logo-barblyclub.svg'"
            />
            <div class="truncate">
              <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white block truncate">
                {{ authStore.organization?.name || 'BarblyClub' }}
              </span>
              <span class="text-[10px] text-slate-400 font-semibold truncate block">
                barblyclub.com.br/{{ authStore.organization?.slug || 'barbearia' }}
              </span>
            </div>
          </div>

          <!-- Close button on Mobile Drawer -->
          <button 
            @click="emit('close')" 
            class="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition shrink-0 cursor-pointer"
            title="Fechar menu"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 30 Days Trial Pill -->
        <div v-if="authStore.isTrial" class="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]">
          <span class="text-amber-500 font-bold flex items-center gap-1">
            <Sparkles class="w-3 h-3" /> Teste Grátis
          </span>
          <span class="text-amber-500 font-extrabold">
            {{ authStore.trialDaysRemaining }}d restantes
          </span>
        </div>
      </div>

      <!-- Section: GERAL -->
      <div class="mb-6">
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Geral</div>
        <nav class="space-y-1">
          <router-link 
            to="/" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <LayoutDashboard class="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </router-link>

          <router-link 
            to="/appointments" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/appointments' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Calendar class="w-4 h-4" />
              <span>Agendamentos</span>
            </div>
          </router-link>

          <router-link 
            to="/clients" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/clients' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Users class="w-4 h-4" />
              <span>Clientes &amp; CRM</span>
            </div>
          </router-link>

          <router-link 
            to="/services" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/services' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Scissors class="w-4 h-4" />
              <span>Serviços &amp; Galeria</span>
            </div>
          </router-link>

          <router-link 
            to="/barbers" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/barbers' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <UserCheck class="w-4 h-4" />
              <span>Equipe &amp; Barbeiros</span>
            </div>
          </router-link>

          <router-link 
            to="/products" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/products' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Package class="w-4 h-4" />
              <span>Produtos &amp; Estoque</span>
            </div>
          </router-link>
        </nav>
      </div>

      <!-- Section: FINANCE -->
      <div class="mb-6">
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Financeiro &amp; Split</div>
        <nav class="space-y-1">
          <router-link 
            to="/financial" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/financial' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Wallet class="w-4 h-4" />
              <span>Financeiro &amp; Salão-Parceiro</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand text-white uppercase">Lei 13.352</span>
          </router-link>
        </nav>
      </div>

      <!-- Section: AUTOMATION & SETTINGS -->
      <div>
        <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Sistema</div>
        <nav class="space-y-1">
          <router-link 
            to="/whatsapp" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/whatsapp' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <MessageSquareCode class="w-4 h-4 text-emerald-500" />
              <span>WhatsApp IA</span>
            </div>
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </router-link>

          <router-link 
            to="/settings" 
            @click="handleLinkClick"
            class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
            :class="route.path === '/settings' ? 'bg-brand-light text-brand' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'"
          >
            <div class="flex items-center gap-3">
              <Settings class="w-4 h-4" />
              <span>Configurações</span>
            </div>
          </router-link>
        </nav>

        <!-- PWA Mobile App Indicator -->
        <div class="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <div class="font-bold text-amber-500 flex items-center gap-1.5">
            <Smartphone class="w-3.5 h-3.5" />
            <span>App Barbly no Celular</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1 leading-snug">
            Compatível com iPhone e Android. Instale na tela inicial para acesso ágil.
          </p>
        </div>
      </div>
    </div>

    <!-- User Profile & Logout at bottom -->
    <div class="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
      <div class="flex items-center gap-3 truncate">
        <div class="w-9 h-9 rounded-xl bg-brand/10 border border-brand/30 text-brand font-bold text-xs flex items-center justify-center shrink-0">
          {{ authStore.user?.name ? authStore.user.name.charAt(0) : 'U' }}
        </div>
        <div class="truncate">
          <div class="text-xs font-bold text-slate-900 dark:text-white truncate">
            {{ authStore.user?.name || 'Administrador' }}
          </div>
          <div class="text-[11px] text-slate-400 truncate">
            {{ authStore.user?.role === 'OWNER' ? 'Proprietário' : 'Barbeiro' }}
          </div>
        </div>
      </div>
      <button 
        @click="handleLogout" 
        title="Sair da conta" 
        class="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 cursor-pointer"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>