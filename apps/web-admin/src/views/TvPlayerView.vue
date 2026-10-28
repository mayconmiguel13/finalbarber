<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Scissors,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Tv,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';
import { api, type PublicTvResponse, type TvAd, type TvSettings } from '../services/api';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// ================= ESTADO DO PLAYER =================
const loading = ref(true);
const loadError = ref<string | null>(null);
const orgData = ref<PublicTvResponse['organization'] | null>(null);
const tvSettings = ref<TvSettings | null>(null);
const tvAds = ref<TvAd[]>([]);
const chairs = ref<PublicTvResponse['chairs']>([]);
const upcomingQueue = ref<PublicTvResponse['upcomingQueue']>([]);

const activeTvSlide = ref(0);
const slideProgress = ref(0);
const isTvPaused = ref(false);
const isFullscreen = ref(false);
const videoErrorMap = ref<Record<string, boolean>>({});

let tvProgressTimer: any = null;
let pollTimer: any = null;
let clockTimer: any = null;

// Relógio ao Vivo
const currentClock = ref('');
const currentDateFormatted = ref('');

function updateClock() {
  const now = new Date();
  currentClock.value = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDateFormatted.value = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Determinar o slug da barbearia
const currentSlug = computed(() => {
  if (route.params.slug && typeof route.params.slug === 'string') {
    return route.params.slug;
  }
  if (authStore.organization?.slug) {
    return authStore.organization.slug;
  }
  return 'atelier88';
});

// Slides ativos para o carrossel
const activeSlides = computed(() => {
  const valid = (tvAds.value || []).filter(a => a.active);
  return valid;
});

const currentAd = computed<TvAd | null>(() => {
  const list = activeSlides.value;
  if (!list || list.length === 0) return null;
  return list[activeTvSlide.value % list.length];
});

// Carregar dados públicos da TV
async function fetchTvData(silent = false) {
  try {
    if (!silent) loading.value = true;
    loadError.value = null;

    const res = await api.getPublicTvData(currentSlug.value);
    orgData.value = res.organization;
    tvSettings.value = res.tvSettings;
    tvAds.value = res.ads || [];
    chairs.value = res.chairs || [];
    upcomingQueue.value = res.upcomingQueue || [];
  } catch (err: any) {
    console.error('[TvPlayer] Erro ao carregar dados:', err);
    if (!silent && (!activeSlides.value || activeSlides.value.length === 0)) {
      loadError.value = 'Não foi possível carregar a transmissão desta barbearia.';
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

// Iniciar carrossel com timer suave de 100ms
function startTvCarousel() {
  if (tvProgressTimer) clearInterval(tvProgressTimer);
  slideProgress.value = 0;

  tvProgressTimer = setInterval(() => {
    if (isTvPaused.value) return;
    const currentDurationSec = currentAd.value?.displayDuration || tvSettings.value?.defaultDuration || 14;
    const step = 100 / (currentDurationSec * 10);
    slideProgress.value += step;

    if (slideProgress.value >= 100) {
      slideProgress.value = 0;
      const total = activeSlides.value.length || 1;
      activeTvSlide.value = (activeTvSlide.value + 1) % total;
    }
  }, 100);
}

function nextTvSlide() {
  slideProgress.value = 0;
  const total = activeSlides.value.length || 1;
  activeTvSlide.value = (activeTvSlide.value + 1) % total;
}

function prevTvSlide() {
  slideProgress.value = 0;
  const total = activeSlides.value.length || 1;
  activeTvSlide.value = (activeTvSlide.value - 1 + total) % total;
}

function selectTvSlide(idx: number) {
  slideProgress.value = 0;
  activeTvSlide.value = idx;
}

function toggleTvPause() {
  isTvPaused.value = !isTvPaused.value;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      isFullscreen.value = true;
    }).catch(() => {});
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false;
    }).catch(() => {});
  }
}

function handleVideoError(adId: string) {
  videoErrorMap.value[adId] = true;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    nextTvSlide();
  } else if (e.key === 'ArrowLeft') {
    prevTvSlide();
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    toggleTvPause();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
}

function getCategoryBadge(cat: string) {
  const upper = (cat || '').toUpperCase();
  switch (upper) {
    case 'ALIMENTACAO':
    case 'PARTNER':
      return { label: 'Hamburgueria & Gastronomia', color: 'bg-amber-500/30 text-amber-300 border-amber-500/40' };
    case 'AUTOMOTIVO':
      return { label: 'Estética Automotiva', color: 'bg-blue-500/30 text-blue-300 border-blue-500/40' };
    case 'TATUAGEM':
      return { label: 'Tattoo & Body Art', color: 'bg-purple-500/30 text-purple-300 border-purple-500/40' };
    case 'BEBIDAS':
    case 'BAR':
      return { label: 'Cervejas & Bar', color: 'bg-orange-500/30 text-orange-300 border-orange-500/40' };
    case 'BARBEARIA':
    case 'PRODUCTS':
      return { label: 'Produtos & Clube VIP', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40' };
    case 'MODA':
      return { label: 'Moda Masculina', color: 'bg-rose-500/30 text-rose-300 border-rose-500/40' };
    default:
      return { label: 'Parceiro Local', color: 'bg-slate-700/50 text-slate-300 border-slate-600/50' };
  }
}

onMounted(async () => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);

  window.addEventListener('keydown', handleKeyDown);
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });

  await fetchTvData(false);
  startTvCarousel();

  // Polling a cada 25 segundos para manter status das cadeiras e anúncios atualizados
  pollTimer = setInterval(() => {
    fetchTvData(true);
  }, 25000);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (tvProgressTimer) clearInterval(tvProgressTimer);
  if (pollTimer) clearInterval(pollTimer);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-[#070a12] text-white flex flex-col overflow-hidden select-none font-sans">
    
    <!-- TELA DE CARREGAMENTO -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      <div class="text-center space-y-1">
        <h2 class="text-lg font-black tracking-wide text-white">Iniciando Barbly Lounge TV...</h2>
        <p class="text-xs text-slate-400">Sincronizando cadeiras e anúncios em alta definição</p>
      </div>
    </div>

    <!-- TELA DE ERRO (CASO BARBEARIA NÃO EXISTA) -->
    <div v-else-if="loadError" class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div class="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
        <AlertCircle class="w-8 h-8" />
      </div>
      <div class="space-y-1.5 max-w-md">
        <h2 class="text-xl font-black text-white">Transmissão Indisponível</h2>
        <p class="text-xs text-slate-400">{{ loadError }}</p>
      </div>
      <button 
        @click="fetchTvData(false)" 
        class="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition"
      >
        Tentar Novamente
      </button>
    </div>

    <!-- MODO TV ATIVO -->
    <div v-else class="flex-1 flex flex-col h-full p-4 sm:p-5 lg:p-6 overflow-hidden">
      
      <!-- ============================================================== -->
      <!-- TOPO / CABEÇALHO DA TV -->
      <!-- ============================================================== -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <!-- Logo & Nome da Barbearia -->
        <div class="flex items-center gap-3.5">
          <img 
            v-if="orgData?.logoUrl" 
            :src="orgData.logoUrl" 
            :alt="orgData.name" 
            class="w-11 h-11 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-lg"
          />
          <div v-else class="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg">
            <Scissors class="w-6 h-6 stroke-[2.5]" />
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                {{ orgData?.name || 'Barbearia VIP Lounge' }}
              </h1>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                TV Kiosk
              </span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">
              Monitoramento de Cadeiras &amp; Mídia Indoor em Full HD
            </p>
          </div>
        </div>

        <!-- Relógio Central Gigante -->
        <div class="hidden md:flex flex-col items-center">
          <span class="font-mono text-3xl lg:text-4xl font-black text-amber-400 tracking-wider drop-shadow-md">
            {{ currentClock }}
          </span>
          <span class="text-xs text-slate-300 uppercase font-medium mt-0.5 capitalize">
            {{ currentDateFormatted }}
          </span>
        </div>

        <!-- Ações do Topo: Pausa, Ao Vivo e Tela Cheia -->
        <div class="flex items-center gap-2.5">
          <button 
            @click="toggleTvPause"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer"
            :class="isTvPaused ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/10'"
            :title="isTvPaused ? 'Retomar carrossel' : 'Pausar para escanear QR Code'"
          >
            <Pause v-if="!isTvPaused" class="w-3.5 h-3.5 text-amber-400" />
            <Play v-else class="w-3.5 h-3.5" />
            <span>{{ isTvPaused ? 'Pausado' : 'Pausar' }}</span>
          </button>

          <span class="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hidden lg:inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Ao Vivo
          </span>

          <button 
            @click="toggleFullscreen"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-white/10"
            title="Tela cheia (F11 ou F)"
          >
            <Minimize2 v-if="isFullscreen" class="w-3.5 h-3.5 text-amber-400" />
            <Maximize2 v-else class="w-3.5 h-3.5 text-amber-400" />
            <span class="hidden sm:inline">{{ isFullscreen ? 'Restaurar' : 'Tela Cheia' }}</span>
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- CORPO PRINCIPAL: 28% CADEIRAS / 72% MÍDIA INDOOR GIGANTE -->
      <!-- ============================================================== -->
      <div class="flex-1 flex flex-col lg:flex-row gap-5 mt-4 min-h-0 overflow-hidden">
        
        <!-- ============================================================== -->
        <!-- LADO ESQUERDO (~28%): CADEIRAS EM ATENDIMENTO + FILA DE ESPERA -->
        <!-- ============================================================== -->
        <div class="w-full lg:w-[28%] xl:w-[26%] shrink-0 flex flex-col justify-between space-y-3.5 min-h-0 overflow-hidden">
          
          <!-- Cabeçalho das Cadeiras -->
          <div class="flex items-center justify-between shrink-0">
            <span class="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Scissors class="w-4 h-4 text-amber-400" />
              <span>Cadeiras &amp; Atendimentos</span>
            </span>
            <span class="text-[11px] font-mono text-slate-400">
              {{ chairs.length }} Cadeiras
            </span>
          </div>

          <!-- Lista Vertical de Cadeiras -->
          <div class="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto no-scrollbar">
            <div 
              v-for="chair in chairs" 
              :key="'tv_' + chair.barberId"
              class="rounded-3xl border overflow-hidden shadow-xl transition-all flex flex-col justify-between shrink-0"
              :class="[
                chair.status === 'OCCUPIED'
                  ? 'bg-[#121622] border-amber-500/60 ring-1 ring-amber-500/30'
                  : chair.status === 'BREAK'
                    ? 'bg-[#0f1522] border-sky-500/40'
                    : chair.status === 'CLEANING'
                      ? 'bg-[#131122] border-purple-500/40'
                      : 'bg-[#0e1320] border-white/10'
              ]"
            >
              <!-- Barra de Status Superior -->
              <div 
                class="w-full px-3.5 py-1.5 flex items-center justify-between border-b shrink-0"
                :class="[
                  chair.status === 'OCCUPIED'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black'
                    : chair.status === 'BREAK'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 font-black'
                      : chair.status === 'CLEANING'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-black'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-black'
                ]"
              >
                <div class="flex items-center gap-1.5">
                  <span 
                    class="w-2 h-2 rounded-full" 
                    :class="chair.status === 'OCCUPIED' ? 'bg-slate-950 animate-pulse' : 'bg-emerald-400'"
                  ></span>
                  <span class="text-[11px] uppercase tracking-wider">{{ chair.chair }}</span>
                </div>
                <span class="text-[10px] uppercase font-black tracking-wider">
                  {{ chair.statusLabel }}
                </span>
              </div>

              <!-- Informações do Barbeiro e do Cliente em Atendimento -->
              <div class="p-3.5 space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 min-w-0">
                    <img 
                      v-if="chair.avatarUrl" 
                      :src="chair.avatarUrl" 
                      :alt="chair.barberName"
                      class="w-8 h-8 rounded-xl object-cover border border-white/20 shrink-0"
                    />
                    <div v-else class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                      {{ chair.barberName.charAt(0) }}
                    </div>
                    <div class="truncate">
                      <span class="text-xs font-black text-white block truncate">{{ chair.barberName }}</span>
                      <span class="text-[10px] text-slate-400 font-medium block">Barbeiro Especialista</span>
                    </div>
                  </div>

                  <!-- Badge de Tempo Restante -->
                  <div v-if="chair.currentAppointment" class="text-right shrink-0">
                    <span class="text-[10px] text-amber-400 font-mono font-bold block">
                      ~{{ chair.currentAppointment.remainingMinutes }} min restando
                    </span>
                    <span class="text-[9px] text-slate-400 font-mono">
                      {{ chair.currentAppointment.elapsedMinutes }} min decorridos
                    </span>
                  </div>
                </div>

                <!-- Card de Serviço em Andamento -->
                <div v-if="chair.currentAppointment" class="p-2.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white truncate max-w-[170px]">
                      {{ chair.currentAppointment.serviceName }}
                    </span>
                    <span class="text-[10px] font-mono font-bold text-amber-400">
                      {{ chair.currentAppointment.clientName }}
                    </span>
                  </div>

                  <!-- Barra de Progresso do Corte -->
                  <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                      :style="{ width: `${chair.currentAppointment.progressPercent}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Próximo da Fila nesta Cadeira -->
                <div v-if="chair.nextAppointment" class="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-white/5">
                  <span class="text-slate-400 flex items-center gap-1">
                    <Clock class="w-3 h-3 text-amber-400" /> A seguir:
                  </span>
                  <span class="font-bold truncate max-w-[160px]">
                    {{ chair.nextAppointment.time }} • {{ chair.nextAppointment.clientName }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Fila de Espera dos Próximos Atendimentos -->
          <div class="p-3.5 rounded-3xl bg-[#0e1320] border border-white/10 shadow-lg shrink-0 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-amber-400" />
                <span>Próximos na Fila</span>
              </span>
              <span class="text-[10px] font-mono text-amber-400 font-bold">
                {{ upcomingQueue.length }} Clientes
              </span>
            </div>

            <div v-if="upcomingQueue.length === 0" class="text-[11px] text-slate-400 py-1">
              Sem agendamentos em fila no momento.
            </div>
            <div v-else class="space-y-1.5">
              <div 
                v-for="item in upcomingQueue.slice(0, 3)" 
                :key="'q_' + item.id"
                class="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0"
              >
                <span class="font-bold text-white truncate max-w-[130px]">{{ item.clientName }}</span>
                <span class="text-[10px] text-slate-400 truncate max-w-[100px]">{{ item.serviceName }}</span>
                <span class="text-[11px] font-mono font-bold text-amber-400 shrink-0">{{ item.time }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- ============================================================== -->
        <!-- LADO DIREITO (~72%): THEATER GIGANTE DE MÍDIA INDOOR -->
        <!-- ============================================================== -->
        <div class="flex-1 flex flex-col justify-between min-h-0 overflow-hidden relative">
          
          <!-- Topo da Mídia: Segmento / Tempo Restante -->
          <div class="flex items-center justify-between shrink-0 mb-2">
            <div class="flex items-center gap-2">
              <span 
                v-if="currentAd"
                class="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border backdrop-blur-md"
                :class="getCategoryBadge(currentAd.category).color"
              >
                {{ getCategoryBadge(currentAd.category).label }}
              </span>

              <span 
                v-if="currentAd?.mediaType === 'VIDEO'"
                class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white flex items-center gap-1.5 shadow-md"
              >
                <Video class="w-3 h-3" /> Vídeo HD
              </span>
              <span 
                v-else
                class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-sky-500/80 text-white flex items-center gap-1.5"
              >
                <ImageIcon class="w-3 h-3" /> Flyer HD
              </span>
            </div>

            <div class="flex items-center gap-3">
              <span v-if="currentAd?.priceTag" class="px-3.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md">
                {{ currentAd.priceTag }}
              </span>
              <span class="text-xs font-mono text-slate-400">
                Slide {{ (activeTvSlide % (activeSlides.length || 1)) + 1 }} de {{ activeSlides.length }}
              </span>
            </div>
          </div>

          <!-- THEATER HERO: VÍDEO OU FOTO GIGANTE EM ESCALA ULTRA-WIDE -->
          <div class="relative flex-1 rounded-3xl overflow-hidden my-2 border border-white/15 shadow-2xl bg-black flex items-center justify-center group min-h-[300px]">
            
            <!-- Imagem de Fundo / Fallback -->
            <img 
              :key="'img_' + currentAd?.id"
              :src="currentAd?.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop'"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <!-- Player de Vídeo em Loop (Mudo) -->
            <video 
              v-if="currentAd?.mediaType === 'VIDEO' && currentAd?.videoUrl && !videoErrorMap[currentAd.id]"
              :key="'vid_' + currentAd.id"
              :src="currentAd.videoUrl"
              :poster="currentAd.imageUrl"
              autoplay
              muted
              loop
              playsinline
              @error="handleVideoError(currentAd.id)"
              class="absolute inset-0 w-full h-full object-cover z-10"
            ></video>

            <!-- Vinheta Escura Suave -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-10"></div>

            <!-- Setas de Navegação Manual -->
            <button 
              @click="prevTvSlide"
              class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-2xl border border-white/20"
              title="Slide anterior"
            >
              <ChevronLeft class="w-6 h-6" />
            </button>

            <button 
              @click="nextTvSlide"
              class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shadow-2xl border border-white/20"
              title="Próximo slide"
            >
              <ChevronRight class="w-6 h-6" />
            </button>
          </div>

          <!-- CARD DO ANUNCIANTE & QR CODE GIGANTE -->
          <div class="p-4 sm:p-5 rounded-3xl bg-black/85 border border-white/15 backdrop-blur-2xl flex items-center justify-between gap-6 shrink-0 shadow-2xl my-2">
            <div class="space-y-1.5 flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white truncate drop-shadow-md tracking-tight">
                  {{ currentAd?.title }}
                </h2>
              </div>
              <p class="text-sm sm:text-base text-slate-200 font-medium line-clamp-2 leading-relaxed">
                {{ currentAd?.subtitle }}
              </p>
              <div class="flex items-center gap-2 pt-1 text-xs text-amber-400 font-semibold">
                <span>📲 Aponte a câmera do celular para resgatar este benefício</span>
                <span class="text-slate-400 font-mono text-xs hidden md:inline">• {{ currentAd?.targetUrl || 'barblyclub.com.br' }}</span>
              </div>
            </div>

            <!-- Bloco do QR Code -->
            <div class="flex flex-col items-center gap-1.5 shrink-0">
              <div class="w-28 h-28 sm:w-36 sm:h-36 bg-white p-2.5 rounded-2xl shadow-2xl ring-2 ring-amber-500/60 flex items-center justify-center hover:scale-105 transition-transform">
                <img 
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentAd?.targetUrl || 'https://barblyclub.com.br')}&bgcolor=ffffff&color=060911&margin=4`"
                  alt="QR Code"
                  class="w-full h-full object-contain"
                />
              </div>
              <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider text-center max-w-[140px] truncate">
                {{ currentAd?.qrCodeLabel || 'Escanear Benefício' }}
              </span>
            </div>
          </div>

          <!-- RODAPÉ: BARRA DE PROGRESSO & CHAMADA COMERCIAL -->
          <div class="pt-3 border-t border-white/10 space-y-2 shrink-0">
            <!-- Barra de Progresso Dourada -->
            <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-100 ease-linear"
                :style="{ width: `${slideProgress}%` }"
              ></div>
            </div>

            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-300 flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
                <span>{{ tvSettings?.tvFooterText || 'Quer anunciar sua empresa nesta TV? Fale na recepção da barbearia' }}<span v-if="tvSettings?.tvWhatsAppContact" class="text-amber-400 font-bold ml-1.5">• WhatsApp: {{ tvSettings.tvWhatsAppContact }}</span></span>
              </span>

              <!-- Pontos de Navegação dos Slides -->
              <div class="flex items-center gap-1.5">
                <button 
                  v-for="(item, idx) in activeSlides" 
                  :key="'dot_' + idx"
                  @click="selectTvSlide(idx)"
                  class="w-2.5 h-2.5 rounded-full transition-all cursor-pointer"
                  :class="activeTvSlide === idx ? 'w-7 bg-amber-400 shadow-md' : 'bg-white/30 hover:bg-white/50'"
                ></button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
