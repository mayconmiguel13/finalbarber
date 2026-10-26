<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Smartphone, Download, X, Share } from 'lucide-vue-next';

const isInstallable = ref(false);
const isIOS = ref(false);
const isDismissed = ref(false);
const isStandalone = ref(false);
let deferredPrompt: any = null;

onMounted(() => {
  // Verificar se já está rodando como app standalone (PWA instalado)
  if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
    isStandalone.value = true;
    return;
  }

  // Verificar se o usuário já dispensou nesta sessão
  if (sessionStorage.getItem('barbly_pwa_dismissed') === 'true') {
    isDismissed.value = true;
  }

  // Detectar iOS Safari
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
  if (isIosDevice) {
    isIOS.value = true;
    isInstallable.value = true;
  }

  // Capturar evento de instalação nativo no Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    isInstallable.value = true;
  });

  window.addEventListener('appinstalled', () => {
    isInstallable.value = false;
    isStandalone.value = true;
    deferredPrompt = null;
  });
});

async function handleInstallClick() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      isInstallable.value = false;
    }
    deferredPrompt = null;
  }
}

function dismissBanner() {
  isDismissed.value = true;
  sessionStorage.setItem('barbly_pwa_dismissed', 'true');
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div 
      v-if="isInstallable && !isDismissed && !isStandalone"
      class="fixed bottom-20 lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 lg:max-w-md z-40 p-4 rounded-2xl bg-[#0e131d]/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-xl animate-fade-in"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
            <Smartphone class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-xs font-black text-white flex items-center gap-1.5">
              <span>Instalar BarblyClub no Celular</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">App PWA</span>
            </h4>
            <p class="text-[11px] text-slate-300 mt-1 leading-snug">
              Tenha o BarblyClub na tela inicial do celular com abertura em tela cheia e acesso rápido para você e sua equipe.
            </p>

            <!-- Instrução iOS Safari -->
            <div v-if="isIOS" class="mt-2 text-[10px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
              <Share class="w-3.5 h-3.5 shrink-0" />
              <span>No Safari: toque em <strong>Compartilhar</strong> e depois em <strong>"Adicionar à Tela de Início"</strong>.</span>
            </div>

            <!-- Botão Android / Chrome -->
            <div v-else class="mt-3">
              <button 
                @click="handleInstallClick"
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Download class="w-3.5 h-3.5 stroke-[3]" />
                <span>Instalar Agora</span>
              </button>
            </div>
          </div>
        </div>

        <button 
          @click="dismissBanner" 
          class="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          title="Fechar"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>
