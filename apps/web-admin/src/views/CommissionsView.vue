<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Scissors, 
  Split, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  DollarSign, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  RefreshCw, 
  FileText, 
  X, 
  Loader2, 
  Sparkles, 
  LayoutGrid, 
  List, 
  Phone, 
  Mail, 
  Wallet,
  ArrowRight
} from 'lucide-vue-next';
import { api, BarberSplitSummary } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

function playPopSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

const router = useRouter();
const authStore = useAuthStore();

// Estados principais
const loading = ref(false);
const saving = ref(false);
const splits = ref<BarberSplitSummary[]>([]);

// Visualização (Cards vs Tabela)
const viewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_commissions_view') as 'CARDS' | 'LIST') || 'CARDS'
);

function setViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  viewMode.value = mode;
  localStorage.setItem('barbly_commissions_view', mode);
}

// Filtro de Período
type PeriodKey = 'TODAY' | '7D' | 'MONTH' | 'LAST_MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';
const periodFilter = ref<PeriodKey>('MONTH');
const customStartDate = ref('');
const customEndDate = ref('');

const periodOptions = [
  { key: 'TODAY', label: 'Hoje' },
  { key: '7D', label: '7 Dias' },
  { key: 'MONTH', label: 'Este Mês' },
  { key: 'LAST_MONTH', label: 'Mês Anterior' },
  { key: 'YEAR', label: 'Este Ano' },
  { key: 'ALL', label: 'Todo o Período' },
  { key: 'CUSTOM', label: 'Personalizado' },
] as const;

function setPeriod(p: PeriodKey) {
  playPopSound();
  periodFilter.value = p;
  if (p !== 'CUSTOM') {
    loadSplits();
  }
}

function computePeriodDates(): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (periodFilter.value === 'TODAY') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  if (periodFilter.value === '7D') {
    const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: s.toISOString(), endDate: now.toISOString() };
  }
  if (periodFilter.value === 'MONTH') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  if (periodFilter.value === 'LAST_MONTH') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  if (periodFilter.value === 'YEAR') {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  if (periodFilter.value === 'CUSTOM') {
    return {
      startDate: customStartDate.value ? new Date(customStartDate.value + 'T00:00:00').toISOString() : undefined,
      endDate: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59').toISOString() : undefined,
    };
  }
  return {};
}

// Filtros de busca e status
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'PENDING' | 'SETTLED'>('ALL');

// Ordenação na tabela
const sortField = ref<'name' | 'services' | 'products' | 'gross' | 'commission' | 'pending'>('pending');
const sortDirection = ref<'asc' | 'desc'>('desc');

function toggleSort(field: 'name' | 'services' | 'products' | 'gross' | 'commission' | 'pending') {
  playPopSound();
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'desc';
  }
}

// Modais
const isPayoutModalOpen = ref(false);
const selectedBarberForPayout = ref<BarberSplitSummary | null>(null);
const payoutForm = ref({
  amount: 0,
  paymentMethod: 'PIX',
  notes: '',
});

const isReceiptModalOpen = ref(false);
const receiptData = ref<{
  barberName: string;
  pixKey: string;
  chair: string;
  commissionRate: number;
  servicesTotal: number;
  servicesCount: number;
  productsTotal: number;
  productsCount: number;
  totalGross: number;
  salonRetained: number;
  totalCommissions: number;
  amountPaid: number;
  pendingBalance: number;
  date: string;
} | null>(null);

const copiedPix = ref(false);

// Formatação
function formatMoney(val?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
}

// Carregar Dados
async function loadSplits() {
  loading.value = true;
  try {
    const dates = computePeriodDates();
    splits.value = await api.getBarberSplits(dates);
  } catch (err: any) {
    console.error('[Load Splits Error]', err);
    toast.error('Erro ao carregar comissões dos profissionais.');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSplits();
});

// KPIs Computados
const totalTeamGross = computed(() => splits.value.reduce((acc, s) => acc + (Number(s.totalGross) || 0), 0));
const totalSalonRetained = computed(() => splits.value.reduce((acc, s) => acc + (Number(s.salonRetained) || 0), 0));
const totalCommissionsEarned = computed(() => splits.value.reduce((acc, s) => acc + (Number(s.totalCommissions) || 0), 0));
const totalCommissionsPaid = computed(() => splits.value.reduce((acc, s) => acc + (Number(s.totalPaid) || 0), 0));
const totalPendingPayout = computed(() => splits.value.reduce((acc, s) => acc + (Number(s.pendingPayout) || 0), 0));
const barbersWithPendingCount = computed(() => splits.value.filter(s => (Number(s.pendingPayout) || 0) > 0.05).length);

// Lista filtrada e ordenada
const filteredSplits = computed(() => {
  let list = [...splits.value];

  // Busca textual
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(s => 
      s.barberName.toLowerCase().includes(q) ||
      (s.chair && s.chair.toLowerCase().includes(q)) ||
      (s.pixKey && s.pixKey.toLowerCase().includes(q))
    );
  }

  // Filtro de status
  if (statusFilter.value === 'PENDING') {
    list = list.filter(s => (Number(s.pendingPayout) || 0) > 0.05);
  } else if (statusFilter.value === 'SETTLED') {
    list = list.filter(s => (Number(s.pendingPayout) || 0) <= 0.05);
  }

  // Ordenação
  list.sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortField.value) {
      case 'name':
        return sortDirection.value === 'asc' 
          ? a.barberName.localeCompare(b.barberName)
          : b.barberName.localeCompare(a.barberName);
      case 'services':
        aVal = Number(a.servicesTotal) || 0;
        bVal = Number(b.servicesTotal) || 0;
        break;
      case 'products':
        aVal = Number(a.productsTotal) || 0;
        bVal = Number(b.productsTotal) || 0;
        break;
      case 'gross':
        aVal = Number(a.totalGross) || 0;
        bVal = Number(b.totalGross) || 0;
        break;
      case 'commission':
        aVal = Number(a.totalCommissions) || 0;
        bVal = Number(b.totalCommissions) || 0;
        break;
      case 'pending':
      default:
        aVal = Number(a.pendingPayout) || 0;
        bVal = Number(b.pendingPayout) || 0;
        break;
    }

    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return list;
});

// Ações de Pagamento Pix
function openPayoutModal(split: BarberSplitSummary) {
  playPopSound();
  selectedBarberForPayout.value = split;
  payoutForm.value = {
    amount: Number((Number(split.pendingPayout) || 0).toFixed(2)),
    paymentMethod: 'PIX',
    notes: `Acerto de comissão - ${split.barberName}`,
  };
  isPayoutModalOpen.value = true;
}

function setQuickPayout(percentage: number) {
  if (!selectedBarberForPayout.value) return;
  playPopSound();
  const total = Number(selectedBarberForPayout.value.pendingPayout) || 0;
  payoutForm.value.amount = Number(((total * percentage) / 100).toFixed(2));
}

async function copyPix(key: string) {
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    copiedPix.value = true;
    playSuccessSound();
    toast.success('Chave Pix copiada com sucesso!');
    setTimeout(() => { copiedPix.value = false; }, 2500);
  } catch {
    toast.error('Não foi possível copiar a chave Pix.');
  }
}

async function handleConfirmPayout() {
  if (!selectedBarberForPayout.value) return;
  if (!payoutForm.value.amount || payoutForm.value.amount <= 0) {
    toast.error('Informe um valor de repasse válido.');
    return;
  }

  saving.value = true;
  try {
    await api.payBarberSplit(selectedBarberForPayout.value.barberId, {
      amount: payoutForm.value.amount,
      paymentMethod: payoutForm.value.paymentMethod,
      notes: payoutForm.value.notes,
    });

    playSuccessSound();
    toast.success(`Repasse de ${formatMoney(payoutForm.value.amount)} registrado com sucesso!`);
    
    // Preparar dados para o recibo antes de fechar o modal
    const paidBarber = selectedBarberForPayout.value;
    const paidAmount = payoutForm.value.amount;

    isPayoutModalOpen.value = false;
    await loadSplits();

    // Oferecer emissão do comprovante
    openReceipt(paidBarber, paidAmount);
  } catch (err: any) {
    console.error('[Payout error]', err);
    toast.error(err?.message || 'Erro ao registrar repasse.');
  } finally {
    saving.value = false;
  }
}

// Modal de Recibo da Lei Salão-Parceiro
function openReceipt(split: BarberSplitSummary, amount?: number) {
  playPopSound();
  const paidVal = amount !== undefined ? amount : (Number(split.totalPaid) || Number(split.pendingPayout) || 0);
  const remaining = Math.max(0, (Number(split.pendingPayout) || 0) - (amount !== undefined ? amount : 0));

  receiptData.value = {
    barberName: split.barberName,
    pixKey: split.pixKey || '',
    chair: split.chair || 'Cadeira Principal',
    commissionRate: Number(split.commissionRate) || 50,
    servicesTotal: Number(split.servicesTotal) || 0,
    servicesCount: Number(split.servicesCount) || 0,
    productsTotal: Number(split.productsTotal) || 0,
    productsCount: Number(split.productsCount) || 0,
    totalGross: Number(split.totalGross) || 0,
    salonRetained: Number(split.salonRetained) || 0,
    totalCommissions: Number(split.totalCommissions) || 0,
    amountPaid: paidVal,
    pendingBalance: remaining,
    date: new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
  };
  isReceiptModalOpen.value = true;
}

function printReceipt() {
  playPopSound();
  window.print();
}

// Exportar CSV
function exportToCsv() {
  playPopSound();
  const list = filteredSplits.value;
  if (list.length === 0) {
    toast.error('Nenhum profissional para exportar no filtro atual.', 'Atenção');
    return;
  }

  const headers = [
    'Profissional',
    'Cadeira',
    'Chave Pix',
    'Taxa Comissao (%)',
    'Qtd Servicos',
    'Total Servicos (R$)',
    'Qtd Produtos',
    'Total Produtos (R$)',
    'Faturamento Bruto (R$)',
    'Cota Salao Retida (R$)',
    'Comissoes Geradas (R$)',
    'Comissoes Pagas (R$)',
    'Saldo Pendente (R$)',
  ];

  const rows = list.map(s => [
    `"${s.barberName.replace(/"/g, '""')}"`,
    `"${(s.chair || 'Cadeira Principal').replace(/"/g, '""')}"`,
    `"${(s.pixKey || '').replace(/"/g, '""')}"`,
    (Number(s.commissionRate) || 50).toFixed(0),
    Number(s.servicesCount) || 0,
    (Number(s.servicesTotal) || 0).toFixed(2).replace('.', ','),
    Number(s.productsCount) || 0,
    (Number(s.productsTotal) || 0).toFixed(2).replace('.', ','),
    (Number(s.totalGross) || 0).toFixed(2).replace('.', ','),
    (Number(s.salonRetained) || 0).toFixed(2).replace('.', ','),
    (Number(s.totalCommissions) || 0).toFixed(2).replace('.', ','),
    (Number(s.totalPaid) || 0).toFixed(2).replace('.', ','),
    (Number(s.pendingPayout) || 0).toFixed(2).replace('.', ','),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `comissoes_equipe_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Relatório de comissões exportado com sucesso!');
}
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
    
    <!-- ============================================== -->
    <!-- CABEÇALHO DO MÓDULO                            -->
    <!-- ============================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Scissors class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Comissões &amp; Salão-Parceiro
              </h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Lei 13.352/2016
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gestão de repasses da equipe, quitação Pix e emissão de comprovantes formais
            </p>
          </div>
        </div>
      </div>

      <!-- Botões de Ação Topo -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <button 
          @click="loadSplits" 
          :disabled="loading"
          class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-amber-500 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          title="Recarregar saldos"
        >
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin text-amber-500' : ''" />
        </button>

        <button 
          @click="exportToCsv"
          class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-amber-500/50 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          title="Exportar dados para Excel/CSV"
        >
          <Download class="w-4 h-4 text-amber-500" />
          <span class="hidden sm:inline">Exportar CSV</span>
        </button>

        <!-- Atalho para o Fluxo de Caixa Geral -->
        <router-link
          to="/financial"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
        >
          <Wallet class="w-4 h-4 text-emerald-500" />
          <span>Ver Livro Caixa</span>
          <ArrowRight class="w-3.5 h-3.5 text-slate-400" />
        </router-link>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- FILTRO DE PERÍODO (CHIPS)                      -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="opt in periodOptions"
          :key="opt.key"
          @click="setPeriod(opt.key)"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="periodFilter === opt.key
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Datas Personalizadas (quando ativado) -->
      <div v-if="periodFilter === 'CUSTOM'" class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <input 
          v-model="customStartDate" 
          type="date"
          class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <span class="text-xs text-slate-400 font-bold">até</span>
        <input 
          v-model="customEndDate" 
          type="date"
          class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button 
          @click="loadSplits" 
          class="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:opacity-90 transition cursor-pointer"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- CARDS DE RESUMO (KPIS DA EQUIPE)               -->
    <!-- ============================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- KPI 1: Faturamento Bruto da Equipe -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Produção da Equipe
          </span>
          <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Scissors class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {{ formatMoney(totalTeamGross) }}
        </div>
        <p class="text-[11px] text-slate-400 mt-1">
          Serviços + Vendas de Balcão
        </p>
      </div>

      <!-- KPI 2: Cota do Salão (Retida) -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Cota Salão-Parceiro
          </span>
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {{ formatMoney(totalSalonRetained) }}
        </div>
        <p class="text-[11px] text-slate-400 mt-1">
          Retenção legal da barbearia
        </p>
      </div>

      <!-- KPI 3: Comissões Pagas -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            Repasses Já Pagos
          </span>
          <div class="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <CheckCircle class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {{ formatMoney(totalCommissionsPaid) }}
        </div>
        <p class="text-[11px] text-slate-400 mt-1">
          Liquidados no período selecionado
        </p>
      </div>

      <!-- KPI 4: Saldo a Quitar (Destaque Âmbar) -->
      <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-4 sm:p-5 border border-amber-500/30 shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
            Saldo a Quitar (Pendente)
          </span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Clock class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
          {{ formatMoney(totalPendingPayout) }}
        </div>
        <p class="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 font-semibold">
          {{ barbersWithPendingCount }} profissional(is) com saldo em aberto
        </p>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- BARRA DE PESQUISA, FILTROS E MODO DE EXIBIÇÃO  -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08]">
      <div class="flex items-center gap-3 flex-1">
        <!-- Campo de Busca -->
        <div class="relative flex-1 max-w-sm">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nome, cadeira ou Pix..."
            class="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <!-- Filtro Status -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
          <button
            @click="statusFilter = 'ALL'"
            :class="statusFilter === 'ALL' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
          >
            Todos
          </button>
          <button
            @click="statusFilter = 'PENDING'"
            :class="statusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>A Pagar</span>
            <span v-if="barbersWithPendingCount > 0" class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
          </button>
          <button
            @click="statusFilter = 'SETTLED'"
            :class="statusFilter === 'SETTLED' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'"
            class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
          >
            Quitados
          </button>
        </div>
      </div>

      <!-- Alternador Cards vs Lista -->
      <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 shrink-0 self-end sm:self-auto">
        <button 
          @click="setViewMode('CARDS')" 
          :class="viewMode === 'CARDS' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
          class="p-1.5 rounded-lg transition cursor-pointer"
          title="Visualização em Cards"
        >
          <LayoutGrid class="w-4 h-4" />
        </button>
        <button 
          @click="setViewMode('LIST')" 
          :class="viewMode === 'LIST' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
          class="p-1.5 rounded-lg transition cursor-pointer"
          title="Visualização em Tabela / Lista"
        >
          <List class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- ESTADO VAZIO / NENHUM RESULTADO                -->
    <!-- ============================================== -->
    <div v-if="filteredSplits.length === 0" class="p-12 text-center rounded-3xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08]">
      <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
        <Scissors class="w-6 h-6" />
      </div>
      <h3 class="text-base font-black text-slate-900 dark:text-white">Nenhum profissional encontrado</h3>
      <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
        Não há registros de comissões para os filtros selecionados. Tente expandir o período ou alterar a busca.
      </p>
    </div>

    <!-- ============================================== -->
    <!-- VISUALIZAÇÃO A: CARDS                          -->
    <!-- ============================================== -->
    <div v-else-if="viewMode === 'CARDS'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="split in filteredSplits" 
        :key="split.barberId"
        class="bg-white dark:bg-[#0e131d] rounded-3xl p-5 border transition duration-200 hover:shadow-xl flex flex-col justify-between"
        :class="(Number(split.pendingPayout) || 0) > 0.05 
          ? 'border-amber-500/40 dark:border-amber-500/30' 
          : 'border-slate-200 dark:border-white/[0.08]'"
      >
        <div>
          <!-- Topo do Card: Avatar, Nome e Cadeira -->
          <div class="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                <img 
                  v-if="split.avatarUrl" 
                  :src="split.avatarUrl" 
                  :alt="split.barberName"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center font-black text-base text-amber-500 bg-amber-500/10">
                  {{ split.barberName.charAt(0) }}
                </div>
              </div>

              <div>
                <h3 class="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {{ split.barberName }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {{ split.chair || 'Cadeira Principal' }}
                </p>
              </div>
            </div>

            <!-- Badge de Taxa Contratual -->
            <span class="px-2 py-1 rounded-xl text-[10px] font-black bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0" title="Taxa contratual de comissão">
              {{ split.commissionRate || 50 }}% Comiss.
            </span>
          </div>

          <!-- Grade de Produção (Serviços e Produtos) -->
          <div class="grid grid-cols-2 gap-2 my-3.5">
            <div class="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serviços</div>
              <div class="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                {{ formatMoney(split.servicesTotal) }}
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">
                {{ split.servicesCount || 0 }} atendimento(s)
              </div>
            </div>

            <div class="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produtos / PDV</div>
              <div class="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                {{ formatMoney(split.productsTotal) }}
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">
                {{ split.productsCount || 0 }} item(ns)
              </div>
            </div>
          </div>

          <!-- Detalhamento Financeiro -->
          <div class="space-y-1.5 text-xs py-2 border-y border-slate-100 dark:border-white/[0.06]">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Produção Total Bruta:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ formatMoney(split.totalGross) }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Cota Retida do Salão:</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatMoney(split.salonRetained) }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Comissões Geradas:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ formatMoney(split.totalCommissions) }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Já Repassado (Pago):</span>
              <span class="font-bold text-teal-600 dark:text-teal-400">{{ formatMoney(split.totalPaid) }}</span>
            </div>
          </div>

          <!-- Bloco Saldo Pendente a Pagar (Destaque) -->
          <div class="mt-3.5 p-3 rounded-2xl flex items-center justify-between"
            :class="(Number(split.pendingPayout) || 0) > 0.05
              ? 'bg-amber-500/10 border border-amber-500/25'
              : 'bg-emerald-500/10 border border-emerald-500/20'"
          >
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider block"
                :class="(Number(split.pendingPayout) || 0) > 0.05 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
              >
                {{ (Number(split.pendingPayout) || 0) > 0.05 ? 'Saldo a Pagar' : 'Saldo Quitado' }}
              </span>
              <span class="text-sm font-black"
                :class="(Number(split.pendingPayout) || 0) > 0.05 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
              >
                {{ formatMoney(split.pendingPayout) }}
              </span>
            </div>

            <div v-if="split.pixKey" class="text-right">
              <span class="text-[9px] text-slate-400 font-bold block uppercase">Chave Pix</span>
              <span class="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate max-w-[120px] inline-block" :title="split.pixKey">
                {{ split.pixKey }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botões de Ação do Card -->
        <div class="pt-4 mt-3 flex items-center gap-2">
          <!-- Botão Pagar Pix -->
          <button 
            @click="openPayoutModal(split)"
            :disabled="(Number(split.pendingPayout) || 0) <= 0.05"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            :class="(Number(split.pendingPayout) || 0) > 0.05
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95 shadow-emerald-500/20'
              : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
          >
            <Split class="w-3.5 h-3.5" />
            <span>Pagar Pix</span>
          </button>

          <!-- Botão Recibo Formal Lei 13.352 -->
          <button 
            @click="openReceipt(split)"
            class="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-amber-500 bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition cursor-pointer"
            title="Emitir Recibo / Comprovante Lei Salão-Parceiro"
          >
            <FileText class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VISUALIZAÇÃO B: TABELA COMPLETA                -->
    <!-- ============================================== -->
    <div v-else class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th @click="toggleSort('name')" class="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-white">
                Profissional
              </th>
              <th class="py-3.5 px-4 text-center">Taxa</th>
              <th @click="toggleSort('services')" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white">
                Serviços
              </th>
              <th @click="toggleSort('products')" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white">
                Produtos
              </th>
              <th @click="toggleSort('gross')" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white">
                Produção Bruta
              </th>
              <th class="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                Cota Salão
              </th>
              <th @click="toggleSort('commission')" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white">
                Comissão
              </th>
              <th class="py-3.5 px-4 text-right text-teal-600 dark:text-teal-400">
                Já Pago
              </th>
              <th @click="toggleSort('pending')" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white text-amber-500 font-black">
                Saldo a Pagar
              </th>
              <th class="py-3.5 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04]">
            <tr 
              v-for="split in filteredSplits" 
              :key="split.barberId"
              class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
            >
              <!-- Barbeiro -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                    <img v-if="split.avatarUrl" :src="split.avatarUrl" :alt="split.barberName" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center font-black text-xs text-amber-500 bg-amber-500/10">
                      {{ split.barberName.charAt(0) }}
                    </div>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 dark:text-white block leading-tight">
                      {{ split.barberName }}
                    </span>
                    <span class="text-[10px] text-slate-400">
                      {{ split.chair || 'Cadeira Principal' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Taxa -->
              <td class="py-3.5 px-4 text-center">
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                  {{ split.commissionRate || 50 }}%
                </span>
              </td>

              <!-- Serviços -->
              <td class="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                <div>{{ formatMoney(split.servicesTotal) }}</div>
                <div class="text-[9px] text-slate-400">{{ split.servicesCount || 0 }} serv.</div>
              </td>

              <!-- Produtos -->
              <td class="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                <div>{{ formatMoney(split.productsTotal) }}</div>
                <div class="text-[9px] text-slate-400">{{ split.productsCount || 0 }} itens</div>
              </td>

              <!-- Total Bruto -->
              <td class="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                {{ formatMoney(split.totalGross) }}
              </td>

              <!-- Cota Salão -->
              <td class="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatMoney(split.salonRetained) }}
              </td>

              <!-- Comissão -->
              <td class="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                {{ formatMoney(split.totalCommissions) }}
              </td>

              <!-- Já Pago -->
              <td class="py-3.5 px-4 text-right font-medium text-teal-600 dark:text-teal-400">
                {{ formatMoney(split.totalPaid) }}
              </td>

              <!-- Saldo Pendente -->
              <td class="py-3.5 px-4 text-right font-black">
                <span :class="(Number(split.pendingPayout) || 0) > 0.05 ? 'text-amber-500' : 'text-emerald-500'">
                  {{ formatMoney(split.pendingPayout) }}
                </span>
              </td>

              <!-- Ações -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button 
                    @click="openPayoutModal(split)"
                    :disabled="(Number(split.pendingPayout) || 0) <= 0.05"
                    class="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-[11px] transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    title="Dar baixa de repasse Pix"
                  >
                    Pagar Pix
                  </button>

                  <button 
                    @click="openReceipt(split)"
                    class="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer"
                    title="Emitir Comprovante Lei Salão-Parceiro"
                  >
                    <FileText class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: REPASSE PIX AO PROFISSIONAL-PARCEIRO (LEI 13.352)                -->
    <!-- ========================================================================= -->
    <div v-if="isPayoutModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        <!-- Topo Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black">
              <Split class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 dark:text-white">
                Dar Baixa de Repasse Pix
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Lei Salão-Parceiro para {{ selectedBarberForPayout?.barberName }}
              </p>
            </div>
          </div>
          <button @click="isPayoutModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Chave Pix Destino com Cópia Rápida -->
        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
            <span>Chave Pix Cadastrada</span>
            <span class="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black">PIX DESTINO</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-black text-sm text-slate-900 dark:text-white truncate">
              {{ selectedBarberForPayout?.pixKey || 'Chave não cadastrada no perfil' }}
            </span>
            <button 
              v-if="selectedBarberForPayout?.pixKey"
              @click="copyPix(selectedBarberForPayout.pixKey)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition cursor-pointer shrink-0"
            >
              <Check v-if="copiedPix" class="w-3.5 h-3.5 text-emerald-500" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedPix ? 'Copiado!' : 'Copiar Pix' }}</span>
            </button>
          </div>
        </div>

        <!-- Formulário de Pagamento -->
        <div class="space-y-4">
          <!-- Valor a Pagar -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Valor do Repasse (R$) *
              </label>
              <div class="flex items-center gap-1">
                <button 
                  type="button" 
                  @click="setQuickPayout(50)"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                >
                  50%
                </button>
                <button 
                  type="button" 
                  @click="setQuickPayout(100)"
                  class="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition cursor-pointer"
                >
                  100% (Total)
                </button>
              </div>
            </div>

            <input 
              v-model.number="payoutForm.amount"
              type="number" 
              step="0.01" 
              min="0.01"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-lg font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Saldo pendente total: <span class="font-bold text-slate-700 dark:text-slate-200">{{ formatMoney(selectedBarberForPayout?.pendingPayout) }}</span>
            </p>
          </div>

          <!-- Método de Pagamento -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Forma de Quitação
            </label>
            <select 
              v-model="payoutForm.paymentMethod"
              class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="PIX" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Pix Direto (Transferência Instantânea)</option>
              <option value="CASH" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Dinheiro em Espécie (Caixa Físico)</option>
              <option value="TRANSFER" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Transferência Bancária / TED</option>
            </select>
          </div>

          <!-- Observações / TxID -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Observações / Comprovante (Opcional)
            </label>
            <input 
              v-model="payoutForm.notes"
              type="text" 
              placeholder="Ex: TxID #827182, acerto da semana"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <!-- Botões Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isPayoutModalOpen = false"
            class="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleConfirmPayout"
            :disabled="saving"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>Confirmar Quitação Pix</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 2: RECIBO FORMAL DA LEI SALÃO-PARCEIRO (LEI 13.352/2016)             -->
    <!-- ========================================================================= -->
    <div v-if="isReceiptModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto no-scrollbar print:p-0 print:shadow-none print:max-w-none">
        
        <!-- Controles Topo (ocultos na impressão) -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div class="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-wider">
            <ShieldCheck class="w-4 h-4 text-amber-500" />
            <span>Comprovante Salão-Parceiro (Lei 13.352/2016)</span>
          </div>
          <div class="flex items-center gap-2">
            <button 
              @click="printReceipt" 
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-md"
            >
              <Printer class="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button 
              @click="isReceiptModalOpen = false" 
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Conteúdo do Recibo Formal -->
        <div class="space-y-6 text-slate-800 text-xs leading-relaxed" id="printable-receipt">
          
          <!-- Cabeçalho do Estabelecimento -->
          <div class="text-center pb-4 border-b border-slate-200">
            <h2 class="text-xl font-black uppercase tracking-tight text-slate-950">
              {{ authStore.organization?.name || 'Barbearia BarblyClub' }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Salão-Parceiro Homologado sob a Lei Federal nº 13.352/2016
            </p>
            <p class="text-[11px] text-slate-400 mt-1">
              Data de Emissão: {{ receiptData?.date }}
            </p>
          </div>

          <!-- Título do Documento -->
          <div class="bg-slate-100 p-3 rounded-xl text-center">
            <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">
              Recibo de Repasse de Quota-Parte — Profissional-Parceiro
            </h3>
          </div>

          <!-- Dados das Partes -->
          <div class="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <span class="text-[10px] font-black uppercase text-slate-400 block">Salão-Parceiro:</span>
              <span class="font-bold text-slate-900 block text-xs">{{ authStore.organization?.name }}</span>
              <span class="text-[11px] text-slate-500 block">Responsável: {{ authStore.organization?.ownerName || 'Administrador' }}</span>
              <span class="text-[11px] text-slate-500 block">Telefone: {{ authStore.organization?.phone || '(31) 99999-9999' }}</span>
            </div>

            <div>
              <span class="text-[10px] font-black uppercase text-slate-400 block">Profissional-Parceiro:</span>
              <span class="font-bold text-slate-900 block text-xs">{{ receiptData?.barberName }}</span>
              <span class="text-[11px] text-slate-500 block">Função / Cadeira: {{ receiptData?.chair }}</span>
              <span class="text-[11px] text-slate-500 block font-mono">Chave Pix: {{ receiptData?.pixKey || 'Não informada' }}</span>
            </div>
          </div>

          <!-- Discriminação das Quotas e Faturamento -->
          <div class="space-y-2">
            <h4 class="font-black text-xs uppercase tracking-wider text-slate-900">
              Discriminação de Serviços e Produtos
            </h4>

            <table class="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-xs">
              <thead class="bg-slate-100 text-[10px] uppercase font-black text-slate-600">
                <tr>
                  <th class="p-2.5">Descrição</th>
                  <th class="p-2.5 text-center">Qtd</th>
                  <th class="p-2.5 text-right">Faturamento Bruto</th>
                  <th class="p-2.5 text-right">Quota Salão</th>
                  <th class="p-2.5 text-right">Quota Profissional</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr>
                  <td class="p-2.5 font-bold">Serviços de Barbearia / Cabelo</td>
                  <td class="p-2.5 text-center">{{ receiptData?.servicesCount || 0 }}</td>
                  <td class="p-2.5 text-right">{{ formatMoney(receiptData?.servicesTotal) }}</td>
                  <td class="p-2.5 text-right text-emerald-600 font-bold">
                    {{ formatMoney((receiptData?.servicesTotal || 0) * (1 - (receiptData?.commissionRate || 50) / 100)) }}
                  </td>
                  <td class="p-2.5 text-right font-bold">
                    {{ formatMoney((receiptData?.servicesTotal || 0) * ((receiptData?.commissionRate || 50) / 100)) }}
                  </td>
                </tr>
                <tr>
                  <td class="p-2.5 font-bold">Venda de Cosméticos / Frigobar (PDV)</td>
                  <td class="p-2.5 text-center">{{ receiptData?.productsCount || 0 }}</td>
                  <td class="p-2.5 text-right">{{ formatMoney(receiptData?.productsTotal) }}</td>
                  <td class="p-2.5 text-right text-emerald-600 font-bold">
                    {{ formatMoney((receiptData?.productsTotal || 0) - ((receiptData?.totalCommissions || 0) - ((receiptData?.servicesTotal || 0) * ((receiptData?.commissionRate || 50) / 100)))) }}
                  </td>
                  <td class="p-2.5 text-right font-bold">
                    {{ formatMoney((receiptData?.totalCommissions || 0) - ((receiptData?.servicesTotal || 0) * ((receiptData?.commissionRate || 50) / 100))) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 font-black text-xs border-t border-slate-200">
                <tr>
                  <td colspan="2" class="p-2.5 uppercase">Totais Apurados:</td>
                  <td class="p-2.5 text-right">{{ formatMoney(receiptData?.totalGross) }}</td>
                  <td class="p-2.5 text-right text-emerald-600">{{ formatMoney(receiptData?.salonRetained) }}</td>
                  <td class="p-2.5 text-right text-slate-900">{{ formatMoney(receiptData?.totalCommissions) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Total Liquidado neste Recibo -->
          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-black uppercase text-emerald-700 block">Valor Liquidado / Pago neste Recibo:</span>
              <span class="text-xl font-black text-emerald-700">{{ formatMoney(receiptData?.amountPaid) }}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold uppercase text-slate-500 block">Saldo Restante a Quitar:</span>
              <span class="text-sm font-bold text-slate-700">{{ formatMoney(receiptData?.pendingBalance) }}</span>
            </div>
          </div>

          <!-- Base Legal da Lei 13.352/2016 -->
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 text-justify leading-normal">
            <strong>Declaração Legal (Lei nº 13.352/2016):</strong>
            O Profissional-Parceiro acima qualificado declara que recebeu do Salão-Parceiro a quantia especificada a título de repasse de sua quota-parte contratual sobre os serviços executados e produtos comercializados, inexistindo qualquer vínculo empregatício ou relação de subordinação (Art. 1º-A da CLT com redação da Lei 13.352/2016). Os tributos incidentes sobre a quota-parte do profissional-parceiro são de sua exclusiva responsabilidade enquanto contribuinte individual ou Microempreendedor Individual (MEI).
          </div>

          <!-- Assinaturas -->
          <div class="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <div class="border-t border-slate-300 pt-2 font-bold text-slate-800">
                {{ authStore.organization?.name || 'Salão-Parceiro' }}
              </div>
              <span class="text-[10px] text-slate-400">Assinatura do Salão-Parceiro</span>
            </div>

            <div>
              <div class="border-t border-slate-300 pt-2 font-bold text-slate-800">
                {{ receiptData?.barberName }}
              </div>
              <span class="text-[10px] text-slate-400">Assinatura do Profissional-Parceiro</span>
            </div>
          </div>

        </div>

        <!-- Botão Fechar -->
        <div class="flex items-center justify-end pt-4 border-t border-slate-200 print:hidden">
          <button 
            type="button" 
            @click="isReceiptModalOpen = false"
            class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 transition cursor-pointer"
          >
            Fechar
          </button>
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

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}

@media print {
  body * {
    visibility: hidden;
  }
  #printable-receipt, #printable-receipt * {
    visibility: visible;
  }
  #printable-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 20px;
  }
}
</style>
