<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Split,
  Package,
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
  User,
  Users,
  ShieldCheck,
  LayoutGrid,
  List,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Sparkles,
  UploadCloud,
  Tag,
  CreditCard,
  Beer,
  Layers,
  FileText
} from 'lucide-vue-next';
import { 
  api, 
  type FinancialSummary, 
  type FinancialEntry, 
  type BarberSplitSummary, 
  type Product, 
  type Barber, 
  type Customer 
} from '../services/api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

// ================= NAVEGAÇÃO DE ABAS =================
// ================= MODOS DE VISUALIZAÇÃO (CARDS vs LISTA) =================
const entryViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_entry_view') as 'CARDS' | 'LIST') || 'LIST'
);
function setEntryViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  entryViewMode.value = mode;
  localStorage.setItem('barbly_entry_view', mode);
}

// ================= ESTADO GERAL =================
const loading = ref(true);
const saving = ref(false);

const summary = ref<FinancialSummary>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
  totalCommissionsGenerated: 0,
  totalCommissionsPaid: 0,
  pendingCommissions: 0,
  entryCount: 0,
  recentEntries: []
});

const entries = ref<FinancialEntry[]>([]);
const splits = ref<BarberSplitSummary[]>([]);
const products = ref<Product[]>([]);
const barbers = ref<Barber[]>([]);
const customers = ref<Customer[]>([]);

// ================= FILTROS =================
// Filtros de Lançamentos
const entrySearchQuery = ref('');
const entryTypeFilter = ref<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
const entryCategoryFilter = ref<string>('Todos');

// Filtros de Splits
const splitSearchQuery = ref('');



// Chave Pix copiada
const copiedPixKey = ref<string | null>(null);

// ================= MODAIS =================

// ================= CONTROLE DE PERÍODO TEMPORAL =================
const selectedPeriod = ref<'TODAY' | 'WEEK' | 'MONTH' | 'PREV_MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('MONTH');
const customStartDate = ref('');
const customEndDate = ref('');

function getActiveDateRange(): { startDate?: string; endDate?: string } {
  const now = new Date();
  
  if (selectedPeriod.value === 'TODAY') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  
  if (selectedPeriod.value === 'WEEK') {
    const s = new Date(now);
    s.setDate(now.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  
  if (selectedPeriod.value === 'MONTH') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  
  if (selectedPeriod.value === 'PREV_MONTH') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  
  if (selectedPeriod.value === 'YEAR') {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }
  
  if (selectedPeriod.value === 'CUSTOM') {
    if (customStartDate.value && customEndDate.value) {
      const s = new Date(customStartDate.value + 'T00:00:00');
      const e = new Date(customEndDate.value + 'T23:59:59');
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
  }
  
  return {};
}

function setPeriod(period: typeof selectedPeriod.value) {
  playPopSound();
  selectedPeriod.value = period;
  currentPage.value = 1;
  loadAllData();
}

// ================= PAGINAÇÃO & ORDENAÇÃO =================
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortKey = ref<'date' | 'amount' | 'category' | 'type'>('date');
const sortOrder = ref<'asc' | 'desc'>('desc');

function toggleSort(key: typeof sortKey.value) {
  playPopSound();
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'desc';
  }
  currentPage.value = 1;
}

function exportToCsv() {
  playPopSound();
  const list = sortedEntries.value;
  if (list.length === 0) {
    toast.error('Nenhum lançamento no período selecionado para exportar.', 'Atenção');
    return;
  }

  const headers = ['Data', 'Tipo', 'Categoria', 'Descricao', 'Profissional', 'Forma de Pagamento', 'Status', 'Valor (R$)', 'Comissao Barbeiro (R$)'];
  const rows = list.map(e => [
    formatDate(e.paidAt || e.createdAt),
    e.type === 'INCOME' ? 'Receita' : 'Despesa',
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${(e.barberName || 'Salão').replace(/"/g, '""')}"`,
    e.paymentMethod || 'PIX',
    e.status === 'PAID' ? 'Pago' : 'Pendente',
    (Number(e.amount) || 0).toFixed(2).replace('.', ','),
    (Number(e.barberCommission) || 0).toFixed(2).replace('.', ',')
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `extrato_financeiro_${selectedPeriod.value.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success('Extrato contábil exportado em CSV com sucesso!', 'Exportação Concluída');
}

// 1. Modal Novo Lançamento Financeiro
const isEntryModalOpen = ref(false);
const entryForm = reactive({
  type: 'INCOME' as 'INCOME' | 'EXPENSE',
  category: 'Serviço',
  description: '',
  amount: 50,
  paymentMethod: 'PIX',
  barberId: '',
  barberCommission: 0,
  dueDate: new Date().toISOString().split('T')[0]
});

// 2. Modal Repasse / Pagamento Pix a Barbeiro
const isPayoutModalOpen = ref(false);
const selectedBarberForPayout = ref<BarberSplitSummary | null>(null);
const payoutForm = reactive({
  amount: 0,
  paymentMethod: 'PIX',
  notes: ''
});



// Modal de Detalhes do Lançamento
const isDetailModalOpen = ref(false);
const selectedEntryForDetail = ref<FinancialEntry | null>(null);

function openEntryDetail(entry: FinancialEntry) {
  playPopSound();
  selectedEntryForDetail.value = entry;
  isDetailModalOpen.value = true;
}

function printEntryDetail() {
  playPopSound();
  window.print();
}

async function copyEntryId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success('ID do lançamento copiado!');
  } catch {
    toast.error('Não foi possível copiar o ID.');
  }
}

// 5. Modal de Confirmação de Exclusão
const isDeleteModalOpen = ref(false);
const deleteTargetType = ref<'ENTRY' | null>(null);
const deleteTargetId = ref<string | null>(null);
const deleteTargetTitle = ref<string>('');

// Web Audio sound effect
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(940, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// Compressão inteligente de imagem
function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

// ================= CARREGAMENTO DE DADOS =================
async function loadAllData() {
  loading.value = true;
  try {
    const [summaryRes, entriesRes, splitsRes, productsRes, barbersRes, customersRes] = await Promise.all([
      api.getFinancialSummary().catch(() => ({
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        totalCommissionsGenerated: 0,
        totalCommissionsPaid: 0,
        pendingCommissions: 0,
        entryCount: 0,
        recentEntries: []
      })),
      api.getFinancialEntries().catch(() => []),
      api.getBarberSplits().catch(() => []),
      api.getProducts().catch(() => []),
      api.getBarbers().catch(() => []),
      api.getCustomers().catch(() => [])
    ]);

    summary.value = summaryRes;
    entries.value = entriesRes;
    splits.value = splitsRes;
    products.value = productsRes;
    barbers.value = barbersRes;
    customers.value = customersRes;
  } catch (err: any) {
    toast.error('Erro ao carregar módulo financeiro', 'Falha');
  } finally {
    loading.value = false;
  }
}

// ================= FORMATAÇÃO =================

function getPaymentMethodLabel(method?: string) {
  if (!method) return 'Pix';
  const m = method.toUpperCase();
  if (m === 'PIX') return 'Pix Instantâneo';
  if (m === 'CREDIT_CARD') return 'Cartão de Crédito';
  if (m === 'DEBIT_CARD') return 'Cartão de Débito';
  if (m === 'CASH') return 'Dinheiro em Espécie';
  if (m === 'TRANSFER') return 'Transferência Bancária';
  return method;
}

function formatMoney(value: number | string | undefined): string {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function copyPix(key: string) {
  if (!key) return;
  navigator.clipboard.writeText(key);
  copiedPixKey.value = key;
  playPopSound();
  toast.success('Chave Pix copiada com sucesso!', 'Pix Copiado');
  setTimeout(() => {
    copiedPixKey.value = null;
  }, 3000);
}

// ================= COMPUTED: FILTROS =================
// 1. Entradas Financeiras Filtradas
const filteredEntries = computed(() => {
  return entries.value.filter((entry) => {
    // Tipo
    if (entryTypeFilter.value !== 'ALL' && entry.type !== entryTypeFilter.value) {
      return false;
    }
    // Categoria
    if (entryCategoryFilter.value !== 'Todos' && entry.category !== entryCategoryFilter.value) {
      return false;
    }
    // Busca
    const q = entrySearchQuery.value.toLowerCase().trim();
    if (!q) return true;
    return (
      entry.description?.toLowerCase().includes(q) ||
      entry.category?.toLowerCase().includes(q) ||
      entry.barberName?.toLowerCase().includes(q) ||
      entry.paymentMethod?.toLowerCase().includes(q)
    );
  });
});


const sortedEntries = computed(() => {
  const list = [...filteredEntries.value];
  list.sort((a, b) => {
    let comparison = 0;
    if (sortKey.value === 'date') {
      const dateA = new Date(a.paidAt || a.createdAt).getTime();
      const dateB = new Date(b.paidAt || b.createdAt).getTime();
      comparison = dateA - dateB;
    } else if (sortKey.value === 'amount') {
      comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
    } else if (sortKey.value === 'category') {
      comparison = (a.category || '').localeCompare(b.category || '');
    } else if (sortKey.value === 'type') {
      comparison = (a.type || '').localeCompare(b.type || '');
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
  return list;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(sortedEntries.value.length / itemsPerPage.value));
});

const paginatedEntries = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedEntries.value.slice(start, start + itemsPerPage.value);
});

// 2. Splits dos Barbeiros Filtrados
const filteredSplits = computed(() => {
  const q = splitSearchQuery.value.toLowerCase().trim();
  if (!q) return splits.value;
  return splits.value.filter((s) => 
    s.barberName.toLowerCase().includes(q) ||
    s.pixKey?.toLowerCase().includes(q)
  );
});



// Categorias distintas de lançamentos para filtro
const distinctEntryCategories = computed(() => {
  const cats = new Set<string>();
  entries.value.forEach((e) => {
    if (e.category) cats.add(e.category);
  });
  return ['Todos', ...Array.from(cats)];
});



// ================= AÇÕES FINANCEIRAS =================
// ABRIR MODAL NOVO LANÇAMENTO
function openCreateEntryModal(type: 'INCOME' | 'EXPENSE' = 'INCOME') {
  playPopSound();
  entryForm.type = type;
  entryForm.category = type === 'INCOME' ? 'Serviço' : 'Despesa Geral';
  entryForm.description = '';
  entryForm.amount = 50;
  entryForm.paymentMethod = 'PIX';
  entryForm.barberId = '';
  entryForm.barberCommission = 0;
  entryForm.dueDate = new Date().toISOString().split('T')[0];
  isEntryModalOpen.value = true;
}

// SALVAR LANÇAMENTO
async function handleSaveEntry() {
  if (!entryForm.description.trim()) {
    toast.error('Informe a descrição do lançamento.', 'Atenção');
    return;
  }
  if (entryForm.amount <= 0) {
    toast.error('O valor do lançamento deve ser maior que zero.', 'Atenção');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    await api.createFinancialEntry({
      type: entryForm.type,
      category: entryForm.category,
      description: entryForm.description.trim(),
      amount: Number(entryForm.amount),
      paymentMethod: entryForm.paymentMethod,
      barberId: entryForm.barberId || undefined,
      barberCommission: Number(entryForm.barberCommission) || 0,
      dueDate: entryForm.dueDate || undefined
    });

    toast.success('Lançamento registrado com sucesso!', 'Sucesso Financeiro');
    isEntryModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao registrar lançamento.', 'Falha');
  } finally {
    saving.value = false;
  }
}

// ABRIR MODAL DE REPASSE AO BARBEIRO
function openPayoutModal(split: BarberSplitSummary) {
  playPopSound();
  selectedBarberForPayout.value = split;
  payoutForm.amount = Number(split.pendingPayout) || 0;
  payoutForm.paymentMethod = 'PIX';
  payoutForm.notes = `Repasse comissões Lei 13.352 - ${split.barberName}`;
  isPayoutModalOpen.value = true;
}

// EXECUTAR REPASSE AO BARBEIRO
async function handleConfirmPayout() {
  if (!selectedBarberForPayout.value) return;
  if (payoutForm.amount <= 0) {
    toast.error('O valor do repasse deve ser maior que zero.', 'Atenção');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    await api.payBarberSplit(selectedBarberForPayout.value.barberId, {
      amount: Number(payoutForm.amount),
      paymentMethod: payoutForm.paymentMethod,
      notes: payoutForm.notes.trim() || undefined
    });

    toast.success(
      `Repasse de ${formatMoney(payoutForm.amount)} registrado para ${selectedBarberForPayout.value.barberName}!`,
      'Repasse Efetuado'
    );
    isPayoutModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao processar repasse.', 'Falha');
  } finally {
    saving.value = false;
  }
}



// ================= CONFIRMAÇÃO DE EXCLUSÃO =================
function confirmDeleteEntry(entry: FinancialEntry) {
  playPopSound();
  deleteTargetType.value = 'ENTRY';
  deleteTargetId.value = entry.id;
  deleteTargetTitle.value = `Lançamento: ${entry.description} (${formatMoney(entry.amount)})`;
  isDeleteModalOpen.value = true;
}



async function executeDelete() {
  if (!deleteTargetId.value || !deleteTargetType.value) return;

  playPopSound();
  saving.value = true;
  try {
    if (deleteTargetType.value === 'ENTRY') {
      await api.deleteFinancialEntry(deleteTargetId.value);
      toast.success('Lançamento removido do extrato.', 'Excluído');
    }
    isDeleteModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao excluir item.', 'Falha');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadAllData();
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-10 space-y-5 sm:space-y-8 max-w-[1750px] w-full mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
    <!-- ============================================== -->
    <!-- CABEÇALHO SUPERIOR & AÇÕES GLOBAIS             -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Controle de Caixa &amp; DRE
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" /> Livro Caixa Operacional
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Financeiro &amp; Livro Caixa
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Demonstrativo de receitas, despesas operacionais, fluxo de caixa e conciliação financeira da barbearia.
        </p>
      </div>

      <!-- Botões de Ação Topo -->
      <div class="flex items-center gap-3 shrink-0 flex-wrap">
        <!-- Atalho para Comissões da Equipe -->
        <router-link
          to="/commissions"
          class="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-amber-500/50 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          title="Gestão de Comissões e Repasses da Equipe"
        >
          <Split class="w-4 h-4 text-amber-500" />
          <span class="hidden sm:inline">Comissões da Equipe</span>
          <ArrowRight class="w-3.5 h-3.5 text-slate-400" />
        </router-link>

        <button 
          @click="loadAllData" 
          class="p-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm cursor-pointer"
          title="Recarregar dados"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <!-- Botão Novo Lançamento -->
        <button 
          @click="openCreateEntryModal('INCOME')"
          class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Nova Receita / Despesa</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- KPI CARDS FINANCEIROS (VISÍVEIS NO TOPO)       -->
    <!-- ============================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      <!-- Card 1: Faturamento Bruto (Receitas) -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Receitas Totais</span>
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowUpRight class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div class="mt-2 sm:mt-3">
          <div class="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {{ formatMoney(summary.totalIncome) }}
          </div>
          <div class="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            <span class="text-emerald-500 font-bold">Entradas</span> serviços &amp; produtos
          </div>
        </div>
      </div>

      <!-- Card 2: Despesas Operacionais -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Despesas &amp; Saídas</span>
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowDownRight class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div class="mt-2 sm:mt-3">
          <div class="text-base sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {{ formatMoney(summary.totalExpense) }}
          </div>
          <div class="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Repasses e custos operacionais
          </div>
        </div>
      </div>

      <!-- Card 3: Lucro Líquido Real -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Lucro Líquido</span>
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wallet class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div class="mt-2 sm:mt-3">
          <div class="text-base sm:text-2xl font-black truncate" :class="summary.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
            {{ formatMoney(summary.netProfit) }}
          </div>
          <div class="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Receitas menos custos e split
          </div>
        </div>
      </div>

      <!-- Card 4: Saldo Pendente a Repassar (Split Barbeiros) -->
      <div class="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 dark:from-amber-500/20 dark:to-emerald-500/10 rounded-2xl p-3.5 sm:p-5 border border-amber-500/30 shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider truncate">Repasses Pix</span>
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
            <Split class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div class="mt-2 sm:mt-3">
          <div class="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
            {{ formatMoney(summary.pendingCommissions) }}
          </div>
          <div class="text-[9px] sm:text-[11px] text-slate-600 dark:text-slate-300 mt-1 truncate flex items-center gap-1">
            <span class="font-bold text-amber-500">Lei 13.352:</span> cota barbeiro
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- ABA 1: RESUMO & EXTRATO FINANCEIRO                                        -->
    <!-- ========================================================================= -->
    <div class="space-y-6">
      <!-- Barra de Filtros e Busca de Lançamentos -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <!-- Input de Busca -->
        <div class="relative flex-1 max-w-md">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="entrySearchQuery" 
            type="text" 
            placeholder="Buscar por descrição, barbeiro, categoria..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <!-- Filtros Tipo & Categoria -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Tipo: Todos / Receitas / Despesas -->
          <div class="flex items-center p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold">
            <button 
              @click="entryTypeFilter = 'ALL'"
              :class="entryTypeFilter === 'ALL' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
              class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Todos
            </button>
            <button 
              @click="entryTypeFilter = 'INCOME'"
              :class="entryTypeFilter === 'INCOME' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Receitas (+)
            </button>
            <button 
              @click="entryTypeFilter = 'EXPENSE'"
              :class="entryTypeFilter === 'EXPENSE' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Despesas (-)
            </button>
          </div>

          <!-- Select Categoria -->
          <select 
            v-model="entryCategoryFilter"
            class="px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
          >
            <option v-for="cat in distinctEntryCategories" :key="cat" :value="cat" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
              {{ cat }}
            </option>
          </select>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM TABELA / LISTA -->
      <div v-if="entryViewMode === 'LIST'" class="bg-white dark:bg-[#0e131d] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th class="px-5 py-3.5 cursor-pointer hover:text-amber-500 transition" @click="toggleSort('date')">
                  <div class="flex items-center gap-1">
                    <span>Data</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5 cursor-pointer hover:text-amber-500 transition" @click="toggleSort('type')">
                  <div class="flex items-center gap-1">
                    <span>Tipo</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5">Descrição</th>
                <th class="px-5 py-3.5 cursor-pointer hover:text-amber-500 transition" @click="toggleSort('category')">
                  <div class="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5">Barbeiro / Profissional</th>
                <th class="px-5 py-3.5">Forma</th>
                <th class="px-5 py-3.5 text-right cursor-pointer hover:text-amber-500 transition" @click="toggleSort('amount')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Valor</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04]">
              <tr v-if="loading" class="text-center">
                <td colspan="8" class="px-5 py-12 text-slate-400">
                  <div class="flex items-center justify-center gap-2">
                    <Loader2 class="w-5 h-5 animate-spin text-amber-500" />
                    <span>Carregando extrato financeiro...</span>
                  </div>
                </td>
              </tr>

              <tr v-else-if="filteredEntries.length === 0" class="text-center">
                <td colspan="8" class="px-5 py-12 text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <DollarSign class="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p class="font-bold text-slate-600 dark:text-slate-300">Nenhum lançamento financeiro encontrado.</p>
                    <p class="text-[11px] text-slate-400">Clique em "+ Nova Receita / Despesa" para registrar um lançamento.</p>
                  </div>
                </td>
              </tr>

              <tr 
                v-for="entry in filteredEntries" 
                :key="entry.id"
                class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
              >
                <!-- Data -->
                <td class="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                  {{ formatDate(entry.paidAt || entry.createdAt) }}
                </td>

                <!-- Tipo -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <span 
                    class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1"
                    :class="entry.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'"
                  >
                    <component :is="entry.type === 'INCOME' ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />
                    {{ entry.type === 'INCOME' ? 'Receita' : 'Despesa' }}
                  </span>
                </td>

                <!-- Descrição -->
                <td class="px-5 py-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                  {{ entry.description }}
                </td>

                <!-- Categoria -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                    {{ entry.category }}
                  </span>
                </td>

                <!-- Barbeiro -->
                <td class="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                  <div v-if="entry.barberName" class="flex items-center gap-1.5 font-medium">
                    <User class="w-3.5 h-3.5 text-amber-500" />
                    <span>{{ entry.barberName }}</span>
                    <span v-if="entry.barberCommission" class="text-[10px] text-amber-500">
                      ({{ formatMoney(entry.barberCommission) }})
                    </span>
                  </div>
                  <span v-else class="text-slate-400">—</span>
                </td>

                <!-- Forma Pagamento -->
                <td class="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                  <span class="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-[10px] font-bold">
                    {{ entry.paymentMethod || 'PIX' }}
                  </span>
                </td>

                <!-- Valor -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-black text-sm" :class="entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                  {{ entry.type === 'INCOME' ? '+' : '-' }} {{ formatMoney(entry.amount) }}
                </td>

                <!-- Ações -->
                <td class="px-5 py-4 whitespace-nowrap text-right">
                  <button 
                    @click.stop="confirmDeleteEntry(entry)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                    title="Excluir lançamento"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM CARDS -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="entry in filteredEntries" 
          :key="entry.id"
          class="bg-white dark:bg-[#0e131d] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition"
        >
          <div class="flex items-center justify-between">
            <span 
              class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1"
              :class="entry.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'"
            >
              <component :is="entry.type === 'INCOME' ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />
              {{ entry.type === 'INCOME' ? 'Receita' : 'Despesa' }}
            </span>

            <span class="text-[11px] text-slate-400 font-medium">
              {{ formatDate(entry.paidAt || entry.createdAt) }}
            </span>
          </div>

          <div class="mt-3">
            <h3 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
              {{ entry.description }}
            </h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {{ entry.category }}
              </span>
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <span class="text-[10px] font-bold uppercase text-slate-400">
                {{ entry.paymentMethod || 'PIX' }}
              </span>
            </div>
          </div>

          <div v-if="entry.barberName" class="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs">
            <span class="text-slate-400">Barbeiro:</span>
            <span class="font-bold text-slate-700 dark:text-slate-200">{{ entry.barberName }}</span>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
            <button 
              @click.stop="confirmDeleteEntry(entry)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
              title="Excluir lançamento"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <div class="text-right font-black text-lg" :class="entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
              {{ entry.type === 'INCOME' ? '+' : '-' }} {{ formatMoney(entry.amount) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: NOVO LANÇAMENTO (RECEITA OU DESPESA)                             -->
    <!-- ========================================================================= -->
    <div v-if="isEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        <!-- Topo Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center font-black" :class="entryForm.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'">
              <DollarSign class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 dark:text-white">
                Novo Lançamento Financeiro
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Registre uma entrada de receita ou custo operacional
              </p>
            </div>
          </div>
          <button @click="isEntryModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Seletor Tipo: Receita vs Despesa -->
        <div class="grid grid-cols-2 gap-3">
          <button 
            type="button" 
            @click="entryForm.type = 'INCOME'; entryForm.category = 'Serviço'"
            :class="entryForm.type === 'INCOME' ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-semibold'"
            class="py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowUpRight class="w-4 h-4 stroke-[2.5]" />
            <span>Receita (+)</span>
          </button>

          <button 
            type="button" 
            @click="entryForm.type = 'EXPENSE'; entryForm.category = 'Despesa Geral'"
            :class="entryForm.type === 'EXPENSE' ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-semibold'"
            class="py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowDownRight class="w-4 h-4 stroke-[2.5]" />
            <span>Despesa (-)</span>
          </button>
        </div>

        <!-- Formulário -->
        <div class="space-y-4">
          <!-- Descrição -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Descrição do Lançamento *
            </label>
            <input 
              v-model="entryForm.description"
              type="text" 
              placeholder="Ex: Corte Degrade + Barba, Aluguel do Salão, etc."
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <!-- Categoria & Valor -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select 
                v-model="entryForm.category"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="Serviço" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Serviço de Barbearia</option>
                <option value="Venda de Produto" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Venda de Produto</option>
                <option value="Repasse Barbeiro" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Repasse Salão-Parceiro</option>
                <option value="Aluguel" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Aluguel &amp; Condomínio</option>
                <option value="Energia & Água" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Energia &amp; Água</option>
                <option value="Internet & Telefonia" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Internet &amp; Software</option>
                <option value="Produtos Estoque" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Compra de Estoque / Bebidas</option>
                <option value="Despesa Geral" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Despesa Geral</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Valor Total (R$) *
              </label>
              <input 
                v-model.number="entryForm.amount"
                type="number" 
                step="0.01" 
                min="0.01"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <!-- Forma de Pagamento & Barbeiro -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Forma de Pagamento
              </label>
              <select 
                v-model="entryForm.paymentMethod"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="PIX" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Pix</option>
                <option value="CREDIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Crédito</option>
                <option value="DEBIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Débito</option>
                <option value="CASH" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Dinheiro em Espécie</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Barbeiro Responsável
              </label>
              <select 
                v-model="entryForm.barberId"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Nenhum (Salão direto)</option>
                <option v-for="b in barbers" :key="b.id" :value="b.id" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
                  {{ b.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Comissão do Barbeiro (se houver barbeiro selecionado) -->
          <div v-if="entryForm.barberId && entryForm.type === 'INCOME'">
            <label class="block text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
              Comissão do Barbeiro (R$)
            </label>
            <input 
              v-model.number="entryForm.barberCommission"
              type="number" 
              step="0.01" 
              min="0"
              class="w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 focus:outline-none"
            />
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Este valor será creditado no saldo do barbeiro para repasse via Pix.
            </p>
          </div>
        </div>

        <!-- Botões Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isEntryModalOpen = false"
            class="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleSaveEntry"
            :disabled="saving"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>Salvar Lançamento</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: DETALHES DO LANÇAMENTO FINANCEIRO                                  -->
    <!-- ========================================================================= -->
    <div v-if="isDetailModalOpen && selectedEntryForDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar print:p-0 print:shadow-none print:max-w-none">
        
        <!-- Topo Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08] print:hidden">
          <div class="flex items-center gap-3">
            <div 
              class="w-11 h-11 rounded-2xl flex items-center justify-center font-black shadow-md"
              :class="selectedEntryForDetail.type === 'INCOME' 
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'"
            >
              <ArrowUpRight v-if="selectedEntryForDetail.type === 'INCOME'" class="w-6 h-6" />
              <ArrowDownRight v-else class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  :class="selectedEntryForDetail.type === 'INCOME' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
                >
                  {{ selectedEntryForDetail.type === 'INCOME' ? 'Receita Operacional' : 'Despesa / Saída' }}
                </span>
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  :class="selectedEntryForDetail.status === 'PAID'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'"
                >
                  {{ selectedEntryForDetail.status === 'PAID' ? 'Pago' : 'Pendente' }}
                </span>
              </div>
              <h2 class="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Detalhes do Lançamento
              </h2>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button 
              @click="printEntryDetail"
              class="p-2 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer"
              title="Imprimir / Salvar PDF"
            >
              <FileText class="w-4 h-4" />
            </button>
            <button 
              @click="isDetailModalOpen = false" 
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Card de Destaque com Valor e Descrição -->
        <div 
          class="p-5 rounded-2xl border space-y-2 text-center"
          :class="selectedEntryForDetail.type === 'INCOME'
            ? 'bg-emerald-500/[0.04] border-emerald-500/20'
            : 'bg-rose-500/[0.04] border-rose-500/20'"
        >
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Valor do Lançamento
          </span>
          <div 
            class="text-3xl sm:text-4xl font-black tracking-tight"
            :class="selectedEntryForDetail.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ selectedEntryForDetail.type === 'INCOME' ? '+' : '-' }} {{ formatMoney(selectedEntryForDetail.amount) }}
          </div>
          <p class="text-sm font-bold text-slate-800 dark:text-slate-200 max-w-md mx-auto">
            {{ selectedEntryForDetail.description }}
          </p>
        </div>

        <!-- Grade de Detalhes -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <!-- Categoria -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoria</span>
            <span class="font-bold text-slate-900 dark:text-white mt-1 block">
              {{ selectedEntryForDetail.category }}
            </span>
          </div>

          <!-- Forma de Pagamento -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Forma de Pagamento</span>
            <span class="font-bold text-slate-900 dark:text-white mt-1 block">
              {{ getPaymentMethodLabel(selectedEntryForDetail.paymentMethod) }}
            </span>
          </div>

          <!-- Data do Registro -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data do Lançamento</span>
            <span class="font-bold text-slate-900 dark:text-white mt-1 block">
              {{ formatDate(selectedEntryForDetail.paidAt || selectedEntryForDetail.createdAt) }}
            </span>
          </div>

          <!-- Data de Vencimento -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data de Vencimento</span>
            <span class="font-bold text-slate-900 dark:text-white mt-1 block">
              {{ selectedEntryForDetail.dueDate ? formatDate(selectedEntryForDetail.dueDate) : 'Liquidado no ato' }}
            </span>
          </div>
        </div>

        <!-- Seção Profissional & Comissão (se houver) -->
        <div 
          v-if="selectedEntryForDetail.barberName || (selectedEntryForDetail.barberCommission && selectedEntryForDetail.barberCommission > 0)"
          class="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 space-y-2.5"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Vínculo com Profissional-Parceiro
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Salão-Parceiro
            </span>
          </div>

          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0">
                <User class="w-4 h-4" />
              </div>
              <div>
                <span class="font-black text-slate-900 dark:text-white block">
                  {{ selectedEntryForDetail.barberName || 'Barbeiro Parceiro' }}
                </span>
                <span class="text-[10px] text-slate-400">Comissão apurada no serviço</span>
              </div>
            </div>

            <div class="text-right">
              <span class="text-[10px] text-slate-400 font-bold block uppercase">Comissão Barbeiro</span>
              <span class="font-black text-amber-500 text-sm">
                {{ formatMoney(selectedEntryForDetail.barberCommission) }}
              </span>
            </div>
          </div>

          <div class="pt-2 border-t border-amber-500/15 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cota Líquida da Barbearia:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">
              {{ formatMoney(selectedEntryForDetail.amount - (selectedEntryForDetail.barberCommission || 0)) }}
            </span>
          </div>
        </div>

        <!-- Identificador do Sistema com Botão de Cópia -->
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
          <span class="text-slate-400 font-mono">ID: {{ selectedEntryForDetail.id }}</span>
          <button 
            @click="copyEntryId(selectedEntryForDetail.id)"
            class="text-amber-500 hover:text-amber-400 font-bold transition cursor-pointer flex items-center gap-1"
          >
            <Copy class="w-3 h-3" />
            <span>Copiar ID</span>
          </button>
        </div>

        <!-- Botões de Ação Rodapé -->
        <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08] print:hidden">
          <button 
            type="button" 
            @click="confirmDeleteEntry(selectedEntryForDetail); isDetailModalOpen = false;"
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Trash2 class="w-4 h-4" />
            <span>Excluir Lançamento</span>
          </button>

          <button 
            type="button" 
            @click="isDetailModalOpen = false"
            class="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 5: CONFIRMAÇÃO DE EXCLUSÃO                                         -->
    <!-- ========================================================================= -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-sm w-full p-6 space-y-5 text-center">
        <div class="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
          <AlertTriangle class="w-6 h-6" />
        </div>

        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">Confirmar Exclusão</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tem certeza que deseja remover este item?
          </p>
          <p class="text-xs font-bold text-rose-500 mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10">
            {{ deleteTargetTitle }}
          </p>
        </div>

        <div class="flex items-center justify-center gap-3 pt-2">
          <button 
            @click="isDeleteModalOpen = false"
            class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            @click="executeDelete"
            :disabled="saving"
            class="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-wider hover:bg-rose-700 transition cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Ocultação total de scrollbars em todos os navegadores */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Correção definitiva para selects e opções de dropdown em Dark Mode */
:deep(.dark select),
.dark select,
.dark select option,
.dark option {
  color-scheme: dark !important;
  background-color: #121824 !important;
  color: #f8fafc !important;
}

select option {
  background-color: #ffffff;
  color: #0f172a;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}
</style>