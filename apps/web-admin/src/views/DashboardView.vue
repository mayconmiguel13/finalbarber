<script setup lang="ts">
import { 
  Building2, 
  ChevronDown, 
  Scissors, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Bell, 
  Star 
} from 'lucide-vue-next';

defineEmits<{
  (e: 'open-modal'): void;
}>();
</script>

<template>
  <div class="p-8 space-y-6">

    <!-- Top Title & Filter -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p class="text-xs text-slate-400 mt-0.5">Visão operacional em tempo real</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Building2 class="w-3.5 h-3.5 text-slate-400" />
          <span>Classic Cuts Studio (Matriz)</span>
          <ChevronDown class="w-3 h-3 text-slate-400" />
        </div>
        <div class="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span>Hoje</span>
          <ChevronDown class="w-3 h-3 text-slate-400" />
        </div>
      </div>
    </div>

    <!-- 4 TOP METRIC CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Card 1: DYNAMIC BRAND GRADIENT CARD -->
      <div class="brand-gradient text-white rounded-[22px] p-5 shadow-brand relative overflow-hidden flex flex-col justify-between transition-all">
        <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div>
          <div class="flex items-center gap-2 text-white/90 text-xs font-semibold">
            <Scissors class="w-4 h-4" />
            <span>Clientes Ativos</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold font-mono-num tracking-tight">842</span>
            <span class="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">+4.2%</span>
          </div>
        </div>
        <div class="text-[11px] text-white/80 mt-4">Base ativa neste mês</div>
      </div>

      <!-- Card 2: Today's Appointments -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 soft-card-shadow flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Calendar class="w-4 h-4 text-slate-400" />
            <span>Agendamentos Hoje</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold font-mono-num text-slate-900 dark:text-white">18</span>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">+4.2%</span>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-4 flex items-center justify-between">
          <span>4 Encaixes no Balcão</span>
          <span class="text-brand font-semibold">14 via Pix/IA</span>
        </div>
      </div>

      <!-- Card 3: Monthly Revenue & Split (Salão-Parceiro) -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 soft-card-shadow flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <div class="flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-slate-400" />
              <span>Receita Mensal</span>
            </div>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">+3%</span>
          </div>
          <div class="mt-3 flex items-baseline gap-1">
            <span class="text-3xl font-extrabold font-mono-num text-slate-900 dark:text-white">R$ 12.480</span>
            <span class="text-slate-400 text-sm font-mono-num">,00</span>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-4 flex items-center justify-between">
          <span>Split Casa: <strong>R$ 6.240</strong></span>
          <span class="text-emerald-500 font-semibold">Zero Bitributação</span>
        </div>
      </div>

      <!-- Card 4: New Metric Slot -->
      <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[22px] p-5 flex flex-col items-center justify-center text-center hover:border-brand-subtle hover:bg-brand-light transition cursor-pointer group">
        <div class="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-brand group-hover:scale-105 transition">
          <Plus class="w-5 h-5 stroke-[2.5]" />
        </div>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5">Personalizar Métrica</span>
        <span class="text-[11px] text-slate-400">Adicionar indicador</span>
      </div>

    </div>

    <!-- MIDDLE SECTION: Today's Appointments & Revenue Chart -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- Left: Today's Appointments -->
      <div class="lg:col-span-5 bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4 text-brand" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Agendamentos de Hoje</h3>
          </div>
          <a href="#" class="text-xs font-semibold text-slate-400 hover:text-brand transition">Ver Todos</a>
        </div>

        <!-- List items -->
        <div class="space-y-3 font-mono-num">
          
          <!-- Slot 09:00 -->
          <div class="flex items-start gap-3">
            <span class="text-xs text-slate-400 w-12 pt-1 font-semibold">09:00</span>
            <div class="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">Jordan Hedge</span>
                <span class="text-xs text-slate-400 font-sans"> (Coloração) | C1</span>
              </div>
              <span class="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">Concluído</span>
            </div>
          </div>

          <!-- Slot 10:00 (Active Highlighted Item) -->
          <div class="flex items-start gap-3">
            <span class="text-xs text-brand font-bold w-12 pt-2">10:00</span>
            <div @click="$emit('open-modal')" class="flex-1 p-3.5 rounded-2xl border-2 border-brand bg-brand-light flex items-center justify-between cursor-pointer hover:opacity-95 transition">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-900 dark:text-white font-sans">Milo Silva</span>
                  <span class="text-xs text-brand font-sans font-medium">(Buzz Cut + Barba)</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] bg-brand text-white font-sans font-bold">10% OFF</span>
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Cadeira 2 • Marcus Barber</div>
              </div>
              <span class="text-xs font-bold text-brand font-mono-num">R$ 54,00</span>
            </div>
          </div>

          <!-- Slot 11:00 -->
          <div class="flex items-start gap-3">
            <span class="text-xs text-slate-400 w-12 pt-1 font-semibold">11:00</span>
            <div class="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">Luna Costa</span>
                <span class="text-xs text-slate-400 font-sans"> (Design Sobrancelha) | C3</span>
              </div>
              <span class="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Encaixe</span>
            </div>
          </div>

          <!-- Slot 12:00 -->
          <div class="flex items-start gap-3">
            <span class="text-xs text-slate-400 w-12 pt-1 font-semibold">12:00</span>
            <div class="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">Oliver Prado</span>
                <span class="text-xs text-slate-400 font-sans"> (Toalha Quente & Barba) | C1</span>
              </div>
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono-num">R$ 45,00</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Right: Revenue Statistics Bar Chart -->
      <div class="lg:col-span-7 bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-brand" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Estatísticas de Faturamento</h3>
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-brand"></span> Online (Pix/App)</span>
            <span class="flex items-center gap-1.5 ml-2"><span class="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span> Balcão</span>
          </div>
        </div>

        <!-- Stylized Pillar Bars -->
        <div class="flex items-end justify-between h-48 pt-6 px-4">
          <div v-for="(height, i) in [20, 32, 28, 36, 44, 36, 32, 40, 48, 36, 44, 52]" :key="i" class="flex flex-col items-center gap-2">
            <div class="w-5 h-44 rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden flex flex-col justify-end">
              <div class="w-full bg-brand rounded-full transition-all" :style="{ height: `${height * 1.8}px` }"></div>
            </div>
            <span class="text-[11px] font-semibold text-slate-400">
              {{ ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i] }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- BOTTOM ROW: Donut Gauge, Stock Alerts, Recent Customers -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

      <!-- 1. Productivity Gauge -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Produtividade de Hoje</h3>
          <a href="#" class="text-xs font-semibold text-slate-400 hover:text-brand">Detalhes</a>
        </div>

        <div class="flex flex-col items-center justify-center py-4">
          <div class="relative w-40 h-20 overflow-hidden">
            <div class="w-40 h-40 rounded-full border-[14px] border-slate-100 dark:border-slate-800 absolute top-0 left-0"></div>
            <div class="w-40 h-40 rounded-full border-[14px] border-brand border-b-transparent border-l-transparent absolute top-0 left-0 transform rotate-45"></div>
          </div>
          <div class="text-center -mt-6">
            <div class="text-3xl font-extrabold font-mono-num text-slate-900 dark:text-white">85%</div>
            <div class="text-xs text-slate-400 font-medium">28 de 32 Serviços Realizados</div>
          </div>
        </div>
        <div class="text-center text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30 py-1.5 rounded-xl">
          Faltas registradas hoje: 0 (Zero No-Show)
        </div>
      </div>

      <!-- 2. Product Stock Alerts -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Bell class="w-4 h-4 text-slate-400" />
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Estoque & Produtos</h3>
          </div>
          <a href="#" class="text-xs font-semibold text-slate-400 hover:text-brand">Ver Estoque</a>
        </div>

        <div class="space-y-3.5">
          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700 dark:text-slate-300">Pomada Efeito Matte</span>
              <span class="text-amber-500 font-medium">8 un. restantes</span>
            </div>
            <div class="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full w-1/3"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700 dark:text-slate-300">Espuma de Barbear Refrescante</span>
              <span class="text-rose-500 font-bold">12% (Crítico)</span>
            </div>
            <div class="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-rose-500 rounded-full w-[12%]"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs font-semibold mb-1">
              <span class="text-slate-700 dark:text-slate-300">Balm Pós-Barba Toalha Quente</span>
              <span class="text-emerald-500 font-medium">5 frascos disponíveis</span>
            </div>
            <div class="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full w-2/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Recent Customers -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Últimos Clientes</h3>
          <a href="#" class="text-xs font-semibold text-slate-400 hover:text-brand">Histórico</a>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=96&h=96" class="w-10 h-10 rounded-full object-cover">
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Jordan Hedge</div>
                <div class="text-[11px] text-slate-400">Coloração de Barba</div>
              </div>
            </div>
            <div class="text-xs font-bold text-brand flex items-center gap-1 font-mono-num">
              <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              4.9/5
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=96&h=96" class="w-10 h-10 rounded-full object-cover">
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Alexia Tina</div>
                <div class="text-[11px] text-slate-400">Degradê + Hidratação</div>
              </div>
            </div>
            <div class="text-xs font-bold text-brand flex items-center gap-1 font-mono-num">
              <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              5.0/5
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=96&h=96" class="w-10 h-10 rounded-full object-cover">
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Sofia Anna</div>
                <div class="text-[11px] text-slate-400">Corte Tesoura Premium</div>
              </div>
            </div>
            <div class="text-xs font-bold text-brand flex items-center gap-1 font-mono-num">
              <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              4.8/5
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
