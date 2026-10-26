<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Tv,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  QrCode,
  Eye,
  Clock,
  DollarSign,
  Sparkles,
  Copy,
  Check,
  Tag,
  Share2,
  Maximize2,
  Layers,
  CheckCircle2,
  Video,
  Image as ImageIcon,
  Upload,
  Film,
  Calculator,
  FileText,
  Printer,
  TrendingUp,
  Settings,
  HelpCircle,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-vue-next';
import { api, type TvAd, type TvSettings } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// ================= ESTADO GERAL =================
const loading = ref(true);
const adsList = ref<TvAd[]>([]);
const totalMonthlyRevenue = ref(0);
const activeCount = ref(0);
const toastMessage = ref<string | null>(null);
const copiedProposal = ref(false);

// Configurações da TV & Barbly Ads (Modo Híbrido)
const tvSettings = ref<TvSettings>({
  barblyAdsNetworkEnabled: true,
  tvFooterText: '💼 Quer anunciar sua empresa nesta TV? Fale na recepção da barbearia',
  tvWhatsAppContact: '(31) 98210-5323',
  defaultDuration: 14,
});
const isSettingsModalOpen = ref(false);
const savingSettings = ref(false);

// Calculadora Interativa de Lucro & ROI
const isCalculatorOpen = ref(true);
const calcPartnersCount = ref(4);
const calcPartnerPrice = ref(150);
const saasMonthlyCost = ref(149);

const calcGrossRevenue = computed(() => calcPartnersCount.value * calcPartnerPrice.value);
const calcNetProfit = computed(() => calcGrossRevenue.value - saasMonthlyCost.value);
const calcAnnualProfit = computed(() => calcNetProfit.value * 12);

// Modal de Criação / Edição
const isModalOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const activeEditId = ref<string | null>(null);

// Modal de Termo de Parceria (Contrato em 1 clique)
const isContractModalOpen = ref(false);
const contractAd = ref<TvAd | null>(null);

// Modal de Simulador de TV
const isSimulatorOpen = ref(false);
const simulatorActiveIndex = ref(0);

const form = ref({
  title: '',
  subtitle: '',
  category: 'ALIMENTACAO',
  mediaType: 'VIDEO' as 'IMAGE' | 'VIDEO',
  imageUrl: '',
  videoUrl: '',
  targetUrl: '',
  qrCodeLabel: 'Aponte a câmera do celular',
  priceTag: '',
  partnerMonthlyFee: 150,
  displayDuration: 14,
  active: true,
});

// Presets de Alta Resolução (Vídeos MP4 e Banners)
const presetTemplates = [
  {
    name: '🎥 Vídeo: Burger Artesanal na Brasa',
    mediaType: 'VIDEO',
    category: 'ALIMENTACAO',
    title: 'Garage 66 Smash Burger & Grill',
    subtitle: 'Os melhores smash burgers artesanais da região com queijo derretido e carnes nobres!',
    priceTag: '15% OFF NO COMBO',
    videoUrl: '/videos/sample.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop',
    target: 'https://instagram.com',
    qrLabel: 'Aponte a câmera e garanta 15% OFF',
    duration: 14,
    fee: 150
  },
  {
    name: '🎥 Vídeo: Lavagem & Detailing Automotivo',
    mediaType: 'VIDEO',
    category: 'AUTOMOTIVO',
    title: 'Garage Detail Estética Automotiva',
    subtitle: 'Lavagem técnica detalhada, cera de carnaúba e vitrificação enquanto você cuida do seu visual!',
    priceTag: 'LAVAGEM R$ 50',
    videoUrl: '/videos/sample.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=900&auto=format&fit=crop',
    target: 'https://wa.me',
    qrLabel: 'Agende seu carro pelo WhatsApp',
    duration: 14,
    fee: 180
  },
  {
    name: '🎥 Vídeo: Barbearia & Clube de Assinatura',
    mediaType: 'VIDEO',
    category: 'BARBEARIA',
    title: 'Clube VIP Barbly Club',
    subtitle: 'Cortes ilimitados o mês inteiro e cerveja gelada de cortesia em cada visita ao lounge!',
    priceTag: 'ASSINATURA VIP',
    videoUrl: '/videos/sample.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=900&auto=format&fit=crop',
    target: 'https://barblyclub.com.br',
    qrLabel: 'Conheça os planos no seu celular',
    duration: 12,
    fee: 0
  },
  {
    name: '🎥 Vídeo: Chopp Artesanal Trincando',
    mediaType: 'VIDEO',
    category: 'BEBIDAS',
    title: 'Cervejas Artesanais & Bar do Lounge',
    subtitle: 'Aproveite sua espera relaxando com as melhores cervejas artesanais trincando de geladas!',
    priceTag: 'CHOPP R$ 14',
    videoUrl: '/videos/sample.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=900&auto=format&fit=crop',
    target: 'https://wa.me',
    qrLabel: 'Peça no balcão com seu barbeiro',
    duration: 12,
    fee: 0
  },
  {
    name: '🎥 Vídeo: Estúdio de Tatuagem',
    mediaType: 'VIDEO',
    category: 'TATUAGEM',
    title: 'Black Skull Tattoo Studio',
    subtitle: 'Tatuadores premiados especializados em realismo e fineline ao lado da barbearia!',
    priceTag: 'FLASH R$ 190',
    videoUrl: '/videos/sample.mp4',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=900&auto=format&fit=crop',
    target: 'https://instagram.com',
    qrLabel: 'Veja o portfólio no Instagram',
    duration: 14,
    fee: 200
  },
  {
    name: '🖼️ Banner: Pomada Matte Barbly',
    mediaType: 'IMAGE',
    category: 'BARBEARIA',
    title: 'Pomada Matte Barbly Club',
    subtitle: 'Efeito seco natural e fixação extrema para o dia todo. Leve direto no caixa!',
    priceTag: 'R$ 49,90',
    videoUrl: '',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=900&auto=format&fit=crop',
    target: 'https://barblyclub.com.br',
    qrLabel: 'Compre no caixa ou online',
    duration: 10,
    fee: 0
  }
];

function showToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = null;
  }, 3500);
}

// Carregar Dados da API
async function loadAllData() {
  try {
    loading.value = true;
    const [adsRes, settingsRes] = await Promise.all([
      api.getTvAds(),
      api.getTvSettings().catch(() => null)
    ]);

    adsList.value = adsRes.ads || [];
    totalMonthlyRevenue.value = adsRes.totalMonthlyRevenue ?? adsRes.metrics?.totalMonthlyRevenue ?? 0;
    activeCount.value = adsRes.activeCount ?? adsRes.metrics?.activeCount ?? 0;

    if (settingsRes) {
      tvSettings.value = settingsRes;
    }
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    showToast('Falha ao conectar com o servidor.');
  } finally {
    loading.value = false;
  }
}

// Salvar Configurações da TV
async function saveTvSettingsData() {
  try {
    savingSettings.value = true;
    const res = await api.updateTvSettings(tvSettings.value);
    if (res.settings) {
      tvSettings.value = res.settings;
    }
    showToast('Configurações da TV salvas com sucesso!');
    isSettingsModalOpen.value = false;
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    showToast('Erro ao atualizar configurações da TV.');
  } finally {
    savingSettings.value = false;
  }
}

// Alternar Rede Compartilhada Barbly Ads
async function toggleBarblyNetwork() {
  tvSettings.value.barblyAdsNetworkEnabled = !tvSettings.value.barblyAdsNetworkEnabled;
  try {
    await api.updateTvSettings({ barblyAdsNetworkEnabled: tvSettings.value.barblyAdsNetworkEnabled });
    showToast(
      tvSettings.value.barblyAdsNetworkEnabled 
        ? 'Rede Compartilhada Barbly Ads ATIVADA! (40% de repasse líquido para sua barbearia)' 
        : 'Rede Compartilhada Barbly Ads pausada.'
    );
  } catch {
    showToast('Erro ao atualizar status da rede.');
  }
}

// Abrir Modal para Novo
function openNewModal() {
  isEditing.value = false;
  activeEditId.value = null;
  form.value = {
    title: '',
    subtitle: '',
    category: 'ALIMENTACAO',
    mediaType: 'VIDEO',
    videoUrl: presetTemplates[0].videoUrl,
    imageUrl: presetTemplates[0].imageUrl,
    targetUrl: 'https://instagram.com',
    qrCodeLabel: 'Aponte a câmera e garanta seu benefício',
    priceTag: '15% OFF',
    partnerMonthlyFee: 150,
    displayDuration: 14,
    active: true,
  };
  isModalOpen.value = true;
}

// Abrir Modal para Editar
function openEditModal(ad: TvAd) {
  isEditing.value = true;
  activeEditId.value = ad.id;
  form.value = {
    title: ad.title,
    subtitle: ad.subtitle || '',
    category: ad.category || 'OUTROS',
    mediaType: (ad.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
    imageUrl: ad.imageUrl || '',
    videoUrl: ad.videoUrl || '',
    targetUrl: ad.targetUrl || '',
    qrCodeLabel: ad.qrCodeLabel || 'Aponte a câmera do celular',
    priceTag: ad.priceTag || '',
    partnerMonthlyFee: ad.partnerMonthlyFee || 0,
    displayDuration: ad.displayDuration || 12,
    active: ad.active,
  };
  isModalOpen.value = true;
}

// Abrir Termo de Parceria (Contrato em 1 clique)
function openContractModal(ad: TvAd) {
  contractAd.value = ad;
  isContractModalOpen.value = true;
}

function printContract() {
  window.print();
}

// Aplicar preset rápido no formulário
function applyPreset(p: typeof presetTemplates[0]) {
  form.value.title = p.title;
  form.value.subtitle = p.subtitle;
  form.value.category = p.category;
  form.value.mediaType = p.mediaType as 'IMAGE' | 'VIDEO';
  form.value.videoUrl = p.videoUrl;
  form.value.imageUrl = p.imageUrl;
  form.value.priceTag = p.priceTag;
  form.value.targetUrl = p.target;
  form.value.qrCodeLabel = p.qrLabel;
  form.value.displayDuration = p.duration;
  form.value.partnerMonthlyFee = p.fee;
}

// Salvar Anúncio
async function saveAd() {
  if (!form.value.title.trim()) {
    showToast('Informe o título do anunciante.');
    return;
  }

  try {
    saving.value = true;
    const payload = {
      ...form.value,
      partnerMonthlyFee: Number(form.value.partnerMonthlyFee) || 0,
      displayDuration: Number(form.value.displayDuration) || 12,
    };

    if (isEditing.value && activeEditId.value) {
      await api.updateTvAd(activeEditId.value, payload);
      showToast('Anúncio atualizado com sucesso!');
    } else {
      await api.createTvAd(payload);
      showToast('Novo anunciante cadastrado com sucesso!');
    }
    isModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    console.error('Erro ao salvar anúncio:', err);
    showToast(err.response?.data?.message || err.message || 'Falha ao salvar anúncio.');
  } finally {
    saving.value = false;
  }
}

// Alternar status ativo/pausado
async function toggleStatus(ad: TvAd) {
  try {
    const newStatus = !ad.active;
    await api.updateTvAd(ad.id, { active: newStatus });
    ad.active = newStatus;
    if (newStatus) {
      activeCount.value++;
      totalMonthlyRevenue.value += (ad.partnerMonthlyFee || 0);
      showToast(`Anúncio "${ad.title}" ativado na TV.`);
    } else {
      activeCount.value = Math.max(0, activeCount.value - 1);
      totalMonthlyRevenue.value = Math.max(0, totalMonthlyRevenue.value - (ad.partnerMonthlyFee || 0));
      showToast(`Anúncio "${ad.title}" pausado.`);
    }
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    showToast('Falha ao atualizar status.');
  }
}

// Excluir anúncio
async function removeAd(ad: TvAd) {
  if (!confirm(`Tem certeza que deseja remover o anúncio de "${ad.title}"?`)) return;

  try {
    await api.deleteTvAd(ad.id);
    showToast('Anúncio removido.');
    await loadAllData();
  } catch (err) {
    console.error('Erro ao remover anúncio:', err);
    showToast('Falha ao remover anúncio.');
  }
}

// Upload de imagem local
function handleImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Por favor, envie uma imagem menor que 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      form.value.imageUrl = event.target.result as string;
    }
  };
  reader.readAsDataURL(file);
}

// Upload de vídeo local
function handleVideoUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    showToast('Para vídeos locais, envie arquivos até 15MB ou cole um link MP4 de alta velocidade.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target?.result) {
      form.value.videoUrl = event.target.result as string;
      form.value.mediaType = 'VIDEO';
    }
  };
  reader.readAsDataURL(file);
}

// Copiar Proposta Comercial para Parceiros
function copyPartnerProposal() {
  const proposalText = `Fala meu amigo! Tudo bem? 💈
Aqui na nossa Barbearia temos uma TV gigante no lounge de espera onde circulam centenas de homens todos os meses (tempo médio de permanência de 35 a 45 minutos no sofá).

Agora estamos exibindo vídeos comerciais e banners em alta definição com QR Code direto para o seu WhatsApp/Instagram!
Sua marca é exibida o dia todo (~1.350 vezes por mês) enquanto o cliente relaxa e aguarda o corte.

O investimento é de apenas R$ 150/mês. Gostaria de garantir uma das poucas vagas para este mês?`;

  navigator.clipboard.writeText(proposalText).then(() => {
    copiedProposal.value = true;
    showToast('Texto da proposta copiado para a área de transferência!');
    setTimeout(() => {
      copiedProposal.value = false;
    }, 3000);
  });
}

function openTvMode() {
  router.push('/?tv=1');
}

function formatCurrency(val: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function getCategoryBadge(cat: string) {
  switch (cat) {
    case 'ALIMENTACAO':
      return { label: 'Hamburgueria & Gastronomia', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    case 'AUTOMOTIVO':
      return { label: 'Estética Automotiva', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'TATUAGEM':
      return { label: 'Tattoo & Body Art', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    case 'BEBIDAS':
      return { label: 'Cervejas & Bar', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    case 'BARBEARIA':
      return { label: 'Produtos & Clube VIP', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'MODA':
      return { label: 'Vestuário & Moda', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    default:
      return { label: 'Parceiro Local', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  }
}

const currentSimAd = computed(() => {
  const list = adsList.value.filter(a => a.active);
  if (list.length === 0) return null;
  return list[simulatorActiveIndex.value % list.length];
});

onMounted(() => {
  loadAllData();
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto">
    <!-- Toast de Notificação -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-4 opacity-0"
    >
      <div 
        v-if="toastMessage" 
        class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md"
      >
        <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- HEADER / TOPO -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <Tv class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Mídia Indoor &amp; TV Lounge</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Video class="w-3 h-3" /> Vídeos &amp; Banners
              </span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monetize a tela do lounge com anúncios locais ou transmita campanhas da Rede Barbly Ads.
            </p>
          </div>
        </div>
      </div>

      <!-- Ações do Topo -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button 
          @click="isSettingsModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
          title="Configurações da TV, rodapé e contato de WhatsApp"
        >
          <Settings class="w-4 h-4 text-slate-400" />
          <span>Configurar TV</span>
        </button>

        <button 
          @click="isSimulatorOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
          title="Pré-visualizar como os anúncios aparecem na TV do lounge"
        >
          <Film class="w-4 h-4 text-amber-500" />
          <span>Simulador de TV</span>
        </button>

        <button 
          @click="copyPartnerProposal"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
          title="Copiar proposta pronta para enviar a parceiros no WhatsApp"
        >
          <Copy v-if="!copiedProposal" class="w-4 h-4 text-slate-400" />
          <Check v-else class="w-4 h-4 text-emerald-500" />
          <span>{{ copiedProposal ? 'Copiado!' : 'Proposta Comercial' }}</span>
        </button>

        <button 
          @click="openTvMode"
          class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer border border-white/10 shadow-lg"
        >
          <Maximize2 class="w-4 h-4 text-amber-400" />
          <span>Abrir Modo TV</span>
        </button>

        <button 
          @click="openNewModal"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Novo Anúncio</span>
        </button>
      </div>
    </div>

    <!-- CARDS DE MÉTRICAS & FATURAMENTO -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Faturamento Mensal Recorrente com Anúncios -->
      <div class="p-5 rounded-3xl bg-white dark:bg-[#131722] border border-amber-500/30 shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider">Faturamento Recorrente</span>
          <span class="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <DollarSign class="w-4 h-4" />
          </span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white">
          {{ formatCurrency(totalMonthlyRevenue) }}
          <span class="text-xs text-slate-400 font-normal">/ mês</span>
        </div>
        <p class="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5 flex items-center gap-1">
          <Sparkles class="w-3.5 h-3.5" /> {{ formatCurrency(totalMonthlyRevenue * 12) }}/ano em renda passiva
        </p>
      </div>

      <!-- Anúncios Ativos na TV -->
      <div class="p-5 rounded-3xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider">Anúncios no Ar</span>
          <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Eye class="w-4 h-4" />
          </span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white">
          {{ activeCount }}
          <span class="text-xs text-slate-400 font-normal">de {{ adsList.length }} parceiros</span>
        </div>
        <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
          <CheckCircle2 class="w-3.5 h-3.5" /> Transmitindo em 1080p Full HD
        </p>
      </div>

      <!-- Telemetria: Exibições Estimadas por Parceiro -->
      <div class="p-5 rounded-3xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider">Mídia Kit • Impacto</span>
          <span class="p-2 rounded-xl bg-sky-500/10 text-sky-500">
            <TrendingUp class="w-4 h-4" />
          </span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white">
          ~1.350
          <span class="text-xs text-slate-400 font-normal">exibições / mês</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium mt-1.5">
          ~45 inserções diárias por parceiro na tela
        </p>
      </div>

      <!-- Slots / Vagas Disponíveis -->
      <div class="p-5 rounded-3xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider">Capacidade Ideal</span>
          <span class="p-2 rounded-xl bg-purple-500/10 text-purple-500">
            <Layers class="w-4 h-4" />
          </span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white">
          {{ Math.max(0, 8 - activeCount) }}
          <span class="text-xs text-slate-400 font-normal">vagas livres (max 8)</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium mt-1.5">
          Potencial total: {{ formatCurrency(8 * 150) }}/mês
        </p>
      </div>
    </div>

    <!-- 1. CALCULADORA INTERATIVA DE LUCRO & ROI (O ARGUMENTO PERFEITO DE VENDA) -->
    <div class="rounded-3xl bg-white dark:bg-[#131722] border border-amber-500/40 p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between cursor-pointer" @click="isCalculatorOpen = !isCalculatorOpen">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
            <Calculator class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>Simulador de Lucro com Anúncios (ROI)</span>
              <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                O Sistema se Paga Sozinho
              </span>
            </h3>
            <p class="text-xs text-slate-400">
              Veja como faturar alto vendendo espaços na sua TV e pagar a mensalidade do sistema com lucro líquido.
            </p>
          </div>
        </div>

        <button class="p-2 rounded-xl text-slate-400 hover:text-white">
          <ChevronUp v-if="isCalculatorOpen" class="w-4 h-4" />
          <ChevronDown v-else class="w-4 h-4" />
        </button>
      </div>

      <div v-if="isCalculatorOpen" class="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <!-- Controles Deslizantes -->
        <div class="md:col-span-7 space-y-4">
          <!-- Slider: Vagas / Parceiros -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-700 dark:text-slate-300">Quantidade de Parceiros Locais na TV:</span>
              <span class="font-mono text-amber-500 font-black text-sm">{{ calcPartnersCount }} anunciantes</span>
            </div>
            <input 
              v-model.number="calcPartnersCount" 
              type="range" 
              min="1" 
              max="8" 
              class="w-full accent-amber-500 cursor-pointer"
            />
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1 parceiro</span>
              <span>4 parceiros (recomendado)</span>
              <span>8 parceiros (máx)</span>
            </div>
          </div>

          <!-- Slider: Mensalidade Cobrada do Parceiro -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-700 dark:text-slate-300">Valor Cobrado por Parceiro (R$/mês):</span>
              <span class="font-mono text-amber-500 font-black text-sm">{{ formatCurrency(calcPartnerPrice) }} / mês</span>
            </div>
            <input 
              v-model.number="calcPartnerPrice" 
              type="range" 
              min="50" 
              max="350" 
              step="10" 
              class="w-full accent-amber-500 cursor-pointer"
            />
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>R$ 50/mês</span>
              <span>R$ 150/mês (mercado)</span>
              <span>R$ 350/mês</span>
            </div>
          </div>
        </div>

        <!-- Box de Resultado do Lucro -->
        <div class="md:col-span-5 p-4 rounded-2xl bg-slate-50 dark:bg-black/50 border border-amber-500/30 space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">Receita Bruta dos Anúncios:</span>
            <span class="font-mono font-bold text-white">{{ formatCurrency(calcGrossRevenue) }} / mês</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">Mensalidade do BarblyClub:</span>
            <span class="font-mono font-bold text-rose-400">- {{ formatCurrency(saasMonthlyCost) }} / mês</span>
          </div>

          <div class="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Lucro Líquido no Caixa:</span>
              <span class="text-xl font-black font-mono text-emerald-400">
                + {{ formatCurrency(calcNetProfit) }} <span class="text-xs font-normal">/ mês</span>
              </span>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Lucro Anual:</span>
              <span class="text-sm font-black font-mono text-emerald-400">
                + {{ formatCurrency(calcAnnualProfit) }} / ano
              </span>
            </div>
          </div>

          <div class="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 shrink-0" />
            <span>100% do valor dos seus anúncios locais fica na sua barbearia!</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. BANNER DA REDE COMPARTILHADA BARBLY ADS (MODO HÍBRIDO) -->
    <div class="p-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Radio class="w-3 h-3 text-blue-400" />
            <span>Rede Compartilhada Barbly Ads</span>
          </span>
          <span class="text-xs font-bold text-emerald-400">Modo Híbrido</span>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          <strong>Como funciona:</strong> Nos seus anúncios locais (hamburgueria, lava-rápido, tattoo), <strong>100% do lucro é seu</strong>. 
          Quando houver vagas ociosas na TV, a <strong>Rede Barbly Ads</strong> exibe campanhas de marcas nacionais 
          e você recebe <strong>40% de repasse líquido no piloto automático</strong> (via PIX ou abatimento na mensalidade), enquanto a rede cuida de 100% da captação comercial!
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <button 
          @click="toggleBarblyNetwork"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-md"
          :class="tvSettings.barblyAdsNetworkEnabled 
            ? 'bg-blue-600 hover:bg-blue-500 text-white' 
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'"
        >
          <span class="w-2 h-2 rounded-full" :class="tvSettings.barblyAdsNetworkEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'"></span>
          <span>{{ tvSettings.barblyAdsNetworkEnabled ? 'Rede Conectada (Ativa)' : 'Ativar Rede Barbly' }}</span>
        </button>
      </div>
    </div>

    <!-- LISTAGEM DE ANÚNCIOS CADASTRADOS -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <span>Anúncios Ativos na Mídia da TV</span>
          <span class="text-xs text-slate-400 font-normal">({{ adsList.length }} anunciantes cadastrados)</span>
        </h2>
        <span class="text-xs text-slate-400 hidden sm:inline">
          Dica: Gere o Termo de Parceria em 1 clique para assinar com os lojistas da rua.
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-slate-400 space-y-3">
        <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-semibold">Carregando anúncios da TV...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="adsList.length === 0" class="p-12 rounded-3xl bg-white dark:bg-[#131722] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl mx-auto">
          <Tv class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-black text-slate-900 dark:text-white">Nenhum anúncio configurado ainda</h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Cadastre seu primeiro parceiro comercial com vídeo ou flyer para exibir na TV do lounge.
          </p>
        </div>
        <button 
          @click="openNewModal"
          class="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-600 transition shadow-lg cursor-pointer"
        >
          + Cadastrar Primeiro Anúncio
        </button>
      </div>

      <!-- Grid de Cards de Anúncios -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div 
          v-for="ad in adsList" 
          :key="ad.id"
          class="rounded-3xl bg-white dark:bg-[#131722] border overflow-hidden shadow-sm flex flex-col justify-between transition-all hover:border-amber-500/50"
          :class="ad.active ? 'border-slate-200 dark:border-slate-800' : 'opacity-60 border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/40'"
        >
          <!-- Topo da Mídia (Vídeo ou Imagem) -->
          <div class="relative h-48 bg-slate-900 overflow-hidden group">
            <video 
              v-if="ad.mediaType === 'VIDEO' && ad.videoUrl"
              :src="ad.videoUrl"
              autoplay
              muted
              loop
              playsinline
              class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
            ></video>
            <img 
              v-else-if="ad.imageUrl" 
              :src="ad.imageUrl" 
              class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              onerror="this.src='https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop'"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
              <Tv class="w-10 h-10" />
            </div>

            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>

            <!-- Badges no Banner -->
            <div class="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span 
                  class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-md"
                  :class="getCategoryBadge(ad.category).color"
                >
                  {{ getCategoryBadge(ad.category).label }}
                </span>

                <span 
                  v-if="ad.mediaType === 'VIDEO'"
                  class="px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-md"
                >
                  <Video class="w-3 h-3" /> Vídeo
                </span>
                <span 
                  v-else
                  class="px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-sky-500/80 text-white backdrop-blur-md flex items-center gap-1"
                >
                  <ImageIcon class="w-3 h-3" /> Imagem
                </span>
              </div>

              <!-- Tag de Preço / Benefício -->
              <span 
                v-if="ad.priceTag"
                class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md"
              >
                {{ ad.priceTag }}
              </span>
            </div>

            <!-- Título Sobreposto na Mídia -->
            <div class="absolute bottom-3 left-3 right-3 text-white">
              <h3 class="font-black text-base leading-tight drop-shadow-md">{{ ad.title }}</h3>
            </div>
          </div>

          <!-- Corpo do Card -->
          <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {{ ad.subtitle || 'Sem descrição cadastrada.' }}
            </p>

            <!-- Detalhes Técnicos e Mídia Kit -->
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">Mensalidade cobrada:</span>
                <span class="font-mono font-black text-amber-500">
                  {{ formatCurrency(ad.partnerMonthlyFee) }} / mês
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">Alcance mensal estimado:</span>
                <span class="font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <TrendingUp class="w-3 h-3" /> ~1.350 exibições
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium">Tempo de tela:</span>
                <span class="font-mono text-slate-700 dark:text-slate-300">
                  {{ ad.displayDuration || 12 }}s por ciclo (~45x/dia)
                </span>
              </div>
              <div v-if="ad.targetUrl" class="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
                <span class="text-slate-400 font-medium truncate flex items-center gap-1">
                  <QrCode class="w-3.5 h-3.5 text-amber-500 shrink-0" /> QR Code:
                </span>
                <a 
                  :href="ad.targetUrl" 
                  target="_blank" 
                  class="text-[11px] text-sky-500 hover:underline truncate max-w-[150px] flex items-center gap-1"
                >
                  <span>{{ ad.targetUrl.replace(/^https?:\/\//, '') }}</span>
                  <ExternalLink class="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            <!-- Botão de Gerar Termo de Parceria / Contrato -->
            <button 
              @click="openContractModal(ad)"
              class="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-500 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <FileText class="w-3.5 h-3.5 text-amber-500" />
              <span>Gerar Termo de Parceria (Contrato)</span>
            </button>

            <!-- Barra de Ações do Card -->
            <div class="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <!-- Switch Ativo/Pausado -->
              <button 
                @click="toggleStatus(ad)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                :class="ad.active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'"
              >
                <span class="w-2 h-2 rounded-full" :class="ad.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
                <span>{{ ad.active ? 'No Ar' : 'Pausado' }}</span>
              </button>

              <div class="flex items-center gap-1">
                <button 
                  @click="openEditModal(ad)"
                  class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                  title="Editar anúncio"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button 
                  @click="removeAd(ad)"
                  class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Excluir anúncio"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CONFIGURAÇÕES DA TV -->
    <div 
      v-if="isSettingsModalOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
              <Settings class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900 dark:text-white">Configurações da TV Lounge</h2>
              <p class="text-[11px] text-slate-400">Personalize a mensagem de rodapé e o contato para novos anunciantes.</p>
            </div>
          </div>
          <button @click="isSettingsModalOpen = false" class="p-2 text-slate-400 hover:text-white">✕</button>
        </div>

        <form @submit.prevent="saveTvSettingsData" class="space-y-4">
          <!-- Texto de Rodapé da TV -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Texto Comercial no Rodapé da TV</label>
            <textarea 
              v-model="tvSettings.tvFooterText" 
              rows="2"
              placeholder="Ex: 💼 Quer sua empresa anunciada nesta TV? Fale na recepção ou chame no WhatsApp"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            ></textarea>
            <span class="text-[10px] text-slate-400">Esta frase aparece na base da TV convidando clientes do sofá a anunciarem.</span>
          </div>

          <!-- WhatsApp de Contato da Barbearia -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp para Captação de Anunciantes</label>
            <input 
              v-model="tvSettings.tvWhatsAppContact" 
              type="text" 
              placeholder="(31) 98210-5323" 
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <!-- Switch da Rede Compartilhada Barbly Ads -->
          <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3">
            <div>
              <span class="text-xs font-black text-blue-400 block">Rede Compartilhada Barbly Ads (Modo Híbrido)</span>
              <p class="text-[11px] text-slate-300 mt-0.5">
                Permite preencher vagas ociosas com marcas parceiras nacionais com divisão 60/40 (40% de repasse líquido para você).
              </p>
            </div>
            <button 
              type="button" 
              @click="tvSettings.barblyAdsNetworkEnabled = !tvSettings.barblyAdsNetworkEnabled"
              class="w-12 h-6 rounded-full transition p-1 cursor-pointer"
              :class="tvSettings.barblyAdsNetworkEnabled ? 'bg-blue-600' : 'bg-slate-700'"
            >
              <div class="w-4 h-4 rounded-full bg-white transition-transform" :class="tvSettings.barblyAdsNetworkEnabled ? 'translate-x-6' : 'translate-x-0'"></div>
            </button>
          </div>

          <div class="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button type="button" @click="isSettingsModalOpen = false" class="px-4 py-2 text-xs font-bold text-slate-400">Cancelar</button>
            <button type="submit" :disabled="savingSettings" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs">
              {{ savingSettings ? 'Salvando...' : 'Salvar Configurações' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE TERMO DE PARCERIA (CONTRATO EM 1 CLIQUE / IMPRESSÃO) -->
    <div 
      v-if="isContractModalOpen && contractAd" 
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white text-slate-950 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8 print:p-0 print:m-0 print:shadow-none print:border-none">
        <!-- Topo com Logo e Título -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
              88
            </div>
            <div>
              <h2 class="text-base font-black uppercase tracking-tight text-slate-900">
                Termo de Veiculação Publicitária &amp; Mídia Indoor
              </h2>
              <span class="text-xs text-slate-500 font-semibold">
                {{ authStore.organization?.name || 'BarblyClub Lounge' }} • BarblyClub Indoor Media
              </span>
            </div>
          </div>
          <button @click="isContractModalOpen = false" class="p-2 text-slate-400 hover:text-slate-900 print:hidden cursor-pointer">✕</button>
        </div>

        <!-- Conteúdo do Contrato -->
        <div class="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Por este instrumento particular, a barbearia <strong>{{ authStore.organization?.name || 'Barbearia Contratada' }}</strong> e a empresa parceira <strong>{{ contractAd.title }}</strong> firmam a presente parceria de veiculação em Mídia Indoor TV Lounge, sob as condições a seguir:
          </p>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div class="flex justify-between">
              <span class="text-slate-500">Parceiro Anunciante:</span>
              <strong class="text-slate-900">{{ contractAd.title }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Formato da Mídia:</span>
              <strong class="text-slate-900">{{ contractAd.mediaType === 'VIDEO' ? 'Vídeo Comercial Full HD (1080p)' : 'Banner Fotográfico Full HD' }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Frequência Estimada:</span>
              <strong class="text-slate-900">~1.350 exibições mensais (~45x ao dia em tela cheia)</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Tempo de Exibição por Ciclo:</span>
              <strong class="text-slate-900">{{ contractAd.displayDuration || 14 }} segundos com QR Code direto</strong>
            </div>
            <div class="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span class="text-slate-700 font-bold">Investimento Mensal Acordado:</span>
              <strong class="text-amber-600 font-mono font-black">{{ formatCurrency(contractAd.partnerMonthlyFee) }} / mês</strong>
            </div>
          </div>

          <div class="space-y-1">
            <h4 class="font-bold text-slate-900 uppercase text-[11px]">Cláusulas Gerais:</h4>
            <ul class="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
              <li>A mídia será veiculada durante todo o horário comercial de funcionamento do estabelecimento.</li>
              <li>O anunciante poderá solicitar a atualização do vídeo, imagem ou link do QR Code a cada ciclo mensal.</li>
              <li>A renovação é mensal, podendo ser cancelada por qualquer das partes mediante aviso prévio de 7 dias.</li>
            </ul>
          </div>

          <!-- Campos de Assinatura -->
          <div class="pt-8 grid grid-cols-2 gap-8 text-center">
            <div class="space-y-1">
              <div class="border-b border-slate-300 w-full mb-1"></div>
              <span class="text-[11px] font-bold block text-slate-900">{{ authStore.organization?.name || 'Barbearia' }}</span>
              <span class="text-[10px] text-slate-400 block">Responsável pelo Espaço</span>
            </div>
            <div class="space-y-1">
              <div class="border-b border-slate-300 w-full mb-1"></div>
              <span class="text-[11px] font-bold block text-slate-900">{{ contractAd.title }}</span>
              <span class="text-[10px] text-slate-400 block">Parceiro Anunciante</span>
            </div>
          </div>
        </div>

        <!-- Botões de Ação do Contrato -->
        <div class="pt-4 flex items-center justify-between border-t border-slate-200 print:hidden">
          <button @click="isContractModalOpen = false" class="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer">Fechar</button>
          <button 
            @click="printContract"
            class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Printer class="w-4 h-4 text-amber-400" />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE CRIAÇÃO / EDIÇÃO DE ANÚNCIO (COM SUPORTE A VÍDEO) -->
    <div 
      v-if="isModalOpen" 
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
              <Tv class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900 dark:text-white">
                {{ isEditing ? 'Editar Anúncio da TV' : 'Cadastrar Anúncio (Vídeo ou Foto)' }}
              </h2>
              <p class="text-[11px] text-slate-400">Configure a mídia, mensagem e QR Code que aparecerão no Modo TV Lounge.</p>
            </div>
          </div>
          <button @click="isModalOpen = false" class="p-2 text-slate-400 hover:text-white">✕</button>
        </div>

        <!-- Presets Rápidos com Vídeos Prontos -->
        <div v-if="!isEditing" class="space-y-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-500" /> Modelos Rápidos (Vídeos em Alta Definição):
          </span>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="preset in presetTemplates" 
              :key="preset.name"
              type="button"
              @click="applyPreset(preset)"
              class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/10 hover:text-amber-500 text-slate-600 dark:text-slate-300 text-xs font-semibold transition border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- Formulário -->
        <form @submit.prevent="saveAd" class="space-y-4">
          <!-- Seletor do Tipo de Mídia: Vídeo vs Imagem -->
          <div class="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1">
            <button 
              type="button"
              @click="form.mediaType = 'VIDEO'"
              class="py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
              :class="form.mediaType === 'VIDEO' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
            >
              <Video class="w-4 h-4" />
              <span>Vídeo em Loop (MP4)</span>
            </button>
            <button 
              type="button"
              @click="form.mediaType = 'IMAGE'"
              class="py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
              :class="form.mediaType === 'IMAGE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
            >
              <ImageIcon class="w-4 h-4" />
              <span>Imagem / Flyer Fotográfico</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Título do Parceiro -->
            <div class="space-y-1 sm:col-span-2">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Nome do Anunciante / Marca *</label>
              <input 
                v-model="form.title" 
                type="text" 
                required 
                placeholder="Ex: Garage 66 Smash Burger" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Categoria -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Segmento / Categoria</label>
              <select 
                v-model="form.category" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALIMENTACAO">Hamburgueria &amp; Gastronomia</option>
                <option value="AUTOMOTIVO">Estética Automotiva / Lava-Rápido</option>
                <option value="TATUAGEM">Estúdio de Tatuagem</option>
                <option value="BEBIDAS">Cervejaria &amp; Bar</option>
                <option value="BARBEARIA">Produtos &amp; Clube da Barbearia</option>
                <option value="MODA">Moda &amp; Acessórios Masculinos</option>
                <option value="OUTROS">Outros Negócios Locais</option>
              </select>
            </div>

            <!-- Destaque / Preço / Tag -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Destaque Promocional / Tag</label>
              <input 
                v-model="form.priceTag" 
                type="text" 
                placeholder="Ex: 15% OFF ou R$ 49,90" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Subtítulo / Descrição da Oferta -->
            <div class="space-y-1 sm:col-span-2">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Texto Promocional (Aparece na TV)</label>
              <textarea 
                v-model="form.subtitle" 
                rows="2" 
                placeholder="Ex: Mostre a foto desta TV ao garçom e ganhe uma porção de batata rústica no seu pedido!" 
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              ></textarea>
            </div>

            <!-- Campo de Vídeo (se mediaType === 'VIDEO') -->
            <div v-if="form.mediaType === 'VIDEO'" class="space-y-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Video class="w-3.5 h-3.5 text-amber-500" /> Link do Vídeo MP4 / WebM
                </label>
                <label class="text-[11px] text-amber-500 hover:underline cursor-pointer font-semibold flex items-center gap-1">
                  <Upload class="w-3 h-3" /> Subir Vídeo (até 15MB)
                  <input type="file" accept="video/mp4,video/webm" class="hidden" @change="handleVideoUpload" />
                </label>
              </div>
              <input 
                v-model="form.videoUrl" 
                type="text" 
                placeholder="/videos/sample.mp4 ou link .mp4" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Campo de Imagem (Poster de fallback ou Banner principal) -->
            <div class="space-y-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {{ form.mediaType === 'VIDEO' ? 'Poster / Imagem de Capa do Vídeo' : 'Imagem do Banner / Flyer' }}
                </label>
                <label class="text-[11px] text-amber-500 hover:underline cursor-pointer font-semibold flex items-center gap-1">
                  <Upload class="w-3 h-3" /> Subir Imagem
                  <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
                </label>
              </div>
              <input 
                v-model="form.imageUrl" 
                type="url" 
                placeholder="https://images.unsplash.com/..." 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Link do QR Code -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Link de Destino do QR Code</label>
              <input 
                v-model="form.targetUrl" 
                type="url" 
                placeholder="https://instagram.com/suamarca" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Texto sob o QR Code -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Instrução do QR Code</label>
              <input 
                v-model="form.qrCodeLabel" 
                type="text" 
                placeholder="Aponte a câmera do celular" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Mensalidade Cobrada do Parceiro -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Valor Mensal Cobrado (R$)</label>
              <input 
                v-model.number="form.partnerMonthlyFee" 
                type="number" 
                step="10" 
                min="0" 
                placeholder="150" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-amber-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <!-- Tempo em Segundos na TV -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Tempo de Exibição (segundos)</label>
              <input 
                v-model.number="form.displayDuration" 
                type="number" 
                min="5" 
                max="60" 
                placeholder="14" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <!-- Preview em Miniatura da Mídia -->
          <div class="p-3 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div class="w-24 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative flex items-center justify-center">
              <video 
                v-if="form.mediaType === 'VIDEO' && form.videoUrl"
                :src="form.videoUrl"
                autoplay
                muted
                loop
                playsinline
                class="w-full h-full object-cover"
              ></video>
              <img 
                v-else-if="form.imageUrl" 
                :src="form.imageUrl" 
                class="w-full h-full object-cover" 
              />
              <div v-else class="text-slate-500 text-xs">Sem mídia</div>
            </div>
            <div class="text-xs truncate flex-1">
              <div class="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <span class="px-1.5 py-0.5 rounded text-[9px] uppercase font-black" :class="form.mediaType === 'VIDEO' ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'">
                  {{ form.mediaType === 'VIDEO' ? 'Vídeo' : 'Imagem' }}
                </span>
                <span class="truncate">{{ form.title || 'Título do anúncio' }}</span>
              </div>
              <span class="text-slate-400 block truncate text-[11px] mt-0.5">{{ form.subtitle || 'Texto promocional' }}</span>
            </div>
          </div>

          <!-- Botões do Rodapé -->
          <div class="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button type="button" @click="isModalOpen = false" class="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition">
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="saving"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles v-if="!saving" class="w-4 h-4" />
              <span>{{ saving ? 'Salvando...' : (isEditing ? 'Atualizar Anúncio' : 'Publicar na TV') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE SIMULADOR DE TV DO LOUNGE -->
    <div 
      v-if="isSimulatorOpen" 
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
    >
      <div class="w-full max-w-5xl bg-[#070b14] border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col space-y-4 p-5 sm:p-6 my-auto">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center">
              <Tv class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-white uppercase tracking-wider">Simulador do Painel da TV</h3>
              <p class="text-[11px] text-slate-400">Prévia de como a mídia aparece ao vivo no televisor do salão.</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button 
              @click="openTvMode" 
              class="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition"
            >
              Tela Cheia Real
            </button>
            <button @click="isSimulatorOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-white">✕</button>
          </div>
        </div>

        <!-- Tela Simulada 16:9 -->
        <div v-if="currentSimAd" class="relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/10 shadow-2xl flex flex-col justify-between p-6">
          <div class="absolute inset-0 z-0">
            <video 
              v-if="currentSimAd.mediaType === 'VIDEO' && currentSimAd.videoUrl"
              :src="currentSimAd.videoUrl"
              autoplay
              muted
              loop
              playsinline
              class="w-full h-full object-cover"
            ></video>
            <img 
              v-else 
              :src="currentSimAd.imageUrl" 
              class="w-full h-full object-cover" 
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25"></div>
          </div>

          <div class="relative z-10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                {{ getCategoryBadge(currentSimAd.category).label }}
              </span>
              <span v-if="currentSimAd.mediaType === 'VIDEO'" class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-500/90 text-white flex items-center gap-1 backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Vídeo Comercial
              </span>
            </div>
            <span v-if="currentSimAd.priceTag" class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase bg-amber-500 text-slate-950 shadow-xl">
              {{ currentSimAd.priceTag }}
            </span>
          </div>

          <div class="relative z-10 p-5 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-xl flex items-center justify-between gap-5">
            <div class="space-y-1 flex-1">
              <h2 class="text-xl sm:text-2xl font-black text-white uppercase drop-shadow">
                {{ currentSimAd.title }}
              </h2>
              <p class="text-xs sm:text-sm text-slate-200 line-clamp-2">
                {{ currentSimAd.subtitle }}
              </p>
              <div class="text-[11px] text-amber-400 font-semibold pt-1 flex items-center gap-1">
                <span>📲 {{ currentSimAd.qrCodeLabel || 'Aponte a câmera do celular para resgatar' }}</span>
              </div>
            </div>

            <div class="w-24 h-24 bg-white p-2 rounded-xl shrink-0 flex items-center justify-center shadow-xl">
              <img 
                :src="`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentSimAd.targetUrl || 'https://barblyclub.com.br')}&bgcolor=ffffff&color=080c14&margin=3`"
                class="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center text-slate-400">
          Nenhum anúncio ativo para simular.
        </div>

        <div class="flex items-center justify-between pt-2">
          <span class="text-xs text-slate-400 font-mono">
            Slide {{ simulatorActiveIndex + 1 }} de {{ adsList.filter(a => a.active).length }}
          </span>
          <div class="flex items-center gap-2">
            <button 
              @click="simulatorActiveIndex = Math.max(0, simulatorActiveIndex - 1)"
              class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
            >
              Anterior
            </button>
            <button 
              @click="simulatorActiveIndex = (simulatorActiveIndex + 1) % adsList.filter(a => a.active).length"
              class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 cursor-pointer"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
