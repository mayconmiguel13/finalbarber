<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Split,
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
  ArrowUpDown,
  Sparkles,
  CreditCard,
  Layers,
  FileText,
  Download,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CalendarClock,
  PieChart
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

function playSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

// ================= MODOS DE VISUALIZAÇÃO (CARDS vs LISTA) =================
const entryViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_entry_view') as 'CARDS' | 'LIST') || 'LIST'
);
function setEntryViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  entryViewMode.value = mode;
  localStorage.setItem('barbly_entry_view', mode);
}

// ================= PILARES EXECUTIVOS: DRE, STATUS & CONCILIAÇÃO =================
const isDreOpen = ref(true);
function toggleDre() {
  playPopSound();
  isDreOpen.value = !isDreOpen.value;
}

// Filtro de Status de Pagamento (Pilar 4)
const entryStatusFilter = ref<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');

// Helpers de Status e Vencimento
function isOverdue(dueDateStr?: string | null): boolean {
  if (!dueDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function isDueToday(dueDateStr?: string | null): boolean {
  if (!dueDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

function getEntryStatusBadge(entry: FinancialEntry) {
  if (entry.status === 'PAID') {
    return {
      label: 'Pago',
      class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold',
      isOverdue: false
    };
  }

  if (isOverdue(entry.dueDate)) {
    return {
      label: 'Vencido',
      class: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black animate-pulse',
      isOverdue: true
    };
  }

  if (isDueToday(entry.dueDate)) {
    return {
      label: 'Vence Hoje',
      class: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-black',
      isOverdue: false
    };
  }

  return {
    label: entry.dueDate ? `Vence em ${formatDate(entry.dueDate).slice(0, 5)}` : 'Pendente',
    class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold',
    isOverdue: false
  };
}

// Dar baixa rápida em conta pendente
async function handleSettleEntry(entry: FinancialEntry) {
  playPopSound();
  saving.value = true;
  try {
    await api.settleFinancialEntry(entry.id);
    playSuccessSound();
    toast.success('Lançamento liquidado e registrado como pago!', 'Conta Paga');
    if (selectedEntryForDetail.value && selectedEntryForDetail.value.id === entry.id) {
      selectedEntryForDetail.value.status = 'PAID';
      selectedEntryForDetail.value.paidAt = new Date().toISOString();
    }
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao liquidar lançamento.', 'Falha');
  } finally {
    saving.value = false;
  }
}

// ================= ESTADO GERAL =================
const loading = ref(true);
const saving = ref(false);

const summary = ref<FinancialSummary>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
  netSalonIncome: 0,
  profitMargin: 0,
  totalCommissionsGenerated: 0,
  totalCommissionsPaid: 0,
  pendingCommissions: 0,
  pendingExpensesCount: 0,
  pendingExpensesTotal: 0,
  paymentMethods: {},
  entryCount: 0,
  recentEntries: []
});

const entries = ref<FinancialEntry[]>([]);
const splits = ref<BarberSplitSummary[]>([]);
const products = ref<Product[]>([]);
const barbers = ref<Barber[]>([]);
const customers = ref<Customer[]>([]);

// ================= FILTROS =================
const entrySearchQuery = ref('');
const entryTypeFilter = ref<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
const entryCategoryFilter = ref<string>('Todos');

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
    return {
      startDate: customStartDate.value ? new Date(customStartDate.value + 'T00:00:00').toISOString() : undefined,
      endDate: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59').toISOString() : undefined,
    };
  }

  return {};
}

function setPeriod(period: 'TODAY' | 'WEEK' | 'MONTH' | 'PREV_MONTH' | 'YEAR' | 'ALL' | 'CUSTOM') {
  playPopSound();
  selectedPeriod.value = period;
  if (period !== 'CUSTOM') {
    loadAllData();
  }
}

function applyCustomDateFilter() {
  playPopSound();
  loadAllData();
}

// ================= ORDENAÇÃO E PAGINAÇÃO =================
const sortColumn = ref<'date' | 'type' | 'category' | 'amount'>('date');
const sortDirection = ref<'asc' | 'desc'>('desc');

function toggleSort(col: 'date' | 'type' | 'category' | 'amount') {
  playPopSound();
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = col;
    sortDirection.value = 'desc';
  }
}

const currentPage = ref(1);
const itemsPerPage = ref(20);

function setItemsPerPage(num: number) {
  playPopSound();
  itemsPerPage.value = num;
  currentPage.value = 1;
}

function exportToCsv() {
  playPopSound();
  const list = sortedEntries.value;
  if (list.length === 0) {
    toast.error('Nenhum lançamento no período selecionado para exportar.', 'Atenção');
    return;
  }

  const headers = ['Data', 'Tipo', 'Status', 'Categoria', 'Descricao', 'Profissional', 'Forma de Pagamento', 'Valor (R$)', 'Comissao Barbeiro (R$)'];
  const rows = list.map(e => [
    formatDate(e.paidAt || e.createdAt),
    e.type === 'INCOME' ? 'Receita' : 'Despesa',
    e.status === 'PAID' ? 'Pago' : 'Pendente',
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${(e.barberName || 'Salão').replace(/"/g, '""')}"`,
    e.paymentMethod || 'PIX',
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
  status: 'PAID' as 'PAID' | 'PENDING',
  dueDate: new Date().toISOString().split('T')[0]
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

// Modal de Confirmação de Exclusão
const isDeleteModalOpen = ref(false);
const deleteTargetId = ref<string | null>(null);
const deleteTargetTitle = ref<string>('');

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
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

// ================= CARREGAMENTO DE DADOS =================
async function loadAllData() {
  loading.value = true;
  try {
    const dateParams = getActiveDateRange();

    const [summaryRes, entriesRes, splitsRes, barbersRes, customersRes] = await Promise.all([
      api.getFinancialSummary(dateParams).catch(() => ({
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        netSalonIncome: 0,
        profitMargin: 0,
        totalCommissionsGenerated: 0,
        totalCommissionsPaid: 0,
        pendingCommissions: 0,
        pendingExpensesCount: 0,
        pendingExpensesTotal: 0,
        paymentMethods: {},
        entryCount: 0,
        recentEntries: []
      })),
      api.getFinancialEntries(dateParams).catch(() => []),
      api.getBarberSplits(dateParams).catch(() => []),
      api.getBarbers().catch(() => []),
      api.getCustomers().catch(() => [])
    ]);

    summary.value = summaryRes;
    entries.value = entriesRes;
    splits.value = splitsRes;
    barbers.value = barbersRes;
    customers.value = customersRes;
  } catch (err) {
    toast.error('Erro ao carregar módulo financeiro', 'Falha');
  } finally {
    loading.value = false;
  }
}

// ================= COMPUTEDS =================
// 1. Lançamentos Filtrados
const filteredEntries = computed(() => {
  return entries.value.filter((entry) => {
    // Filtro por tipo
    if (entryTypeFilter.value !== 'ALL' && entry.type !== entryTypeFilter.value) {
      return false;
    }

    // Filtro por categoria
    if (entryCategoryFilter.value !== 'Todos' && entry.category !== entryCategoryFilter.value) {
      return false;
    }

    // Filtro por status de pagamento (Pilar 4)
    if (entryStatusFilter.value === 'PAID' && entry.status !== 'PAID') {
      return false;
    }
    if (entryStatusFilter.value === 'PENDING' && entry.status !== 'PENDING') {
      return false;
    }
    if (entryStatusFilter.value === 'OVERDUE') {
      if (entry.status !== 'PENDING' || !isOverdue(entry.dueDate)) {
        return false;
      }
    }

    // Busca textual
    if (!entrySearchQuery.value.trim()) return true;

    const q = entrySearchQuery.value.toLowerCase().trim();
    return (
      entry.description?.toLowerCase().includes(q) ||
      entry.category?.toLowerCase().includes(q) ||
      entry.barberName?.toLowerCase().includes(q) ||
      entry.paymentMethod?.toLowerCase().includes(q)
    );
  });
});

// 2. Lançamentos Ordenados
const sortedEntries = computed(() => {
  const list = [...filteredEntries.value];

  return list.sort((a, b) => {
    let comparison = 0;

    if (sortColumn.value === 'date') {
      const dateA = new Date(a.paidAt || a.createdAt).getTime();
      const dateB = new Date(b.paidAt || b.createdAt).getTime();
      comparison = dateA - dateB;
    } else if (sortColumn.value === 'type') {
      comparison = a.type.localeCompare(b.type);
    } else if (sortColumn.value === 'category') {
      comparison = (a.category || '').localeCompare(b.category || '');
    } else if (sortColumn.value === 'amount') {
      comparison = Number(a.amount) - Number(b.amount);
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

// 3. Paginação
const totalPages = computed(() => {
  return Math.ceil(sortedEntries.value.length / itemsPerPage.value) || 1;
});

const paginatedEntries = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedEntries.value.slice(start, end);
});

// Categorias distintas para filtro
const distinctEntryCategories = computed(() => {
  const cats = new Set<string>();
  entries.value.forEach((e) => {
    if (e.category) cats.add(e.category);
  });
  return ['Todos', ...Array.from(cats)];
});

// ================= AÇÕES FINANCEIRAS =================
function openCreateEntryModal(type: 'INCOME' | 'EXPENSE' = 'INCOME') {
  playPopSound();
  entryForm.type = type;
  entryForm.category = type === 'INCOME' ? 'Serviço' : 'Insumos & Descartáveis';
  entryForm.description = '';
  entryForm.amount = 50;
  entryForm.paymentMethod = 'PIX';
  entryForm.barberId = '';
  entryForm.barberCommission = 0;
  entryForm.status = 'PAID';
  entryForm.dueDate = new Date().toISOString().split('T')[0];
  isEntryModalOpen.value = true;
}

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
      status: entryForm.status,
      dueDate: entryForm.dueDate || undefined
    });

    playSuccessSound();
    toast.success('Lançamento registrado com sucesso!', 'Sucesso Financeiro');
    isEntryModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao registrar lançamento.', 'Falha');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteEntry(entry: FinancialEntry) {
  playPopSound();
  deleteTargetId.value = entry.id;
  deleteTargetTitle.value = `${entry.type === 'INCOME' ? 'Receita' : 'Despesa'}: ${entry.description} (${formatMoney(entry.amount)})`;
  isDeleteModalOpen.value = true;
}

async function executeDelete() {
  if (!deleteTargetId.value) return;

  playPopSound();
  saving.value = true;
  try {
    await api.deleteFinancialEntry(deleteTargetId.value);
    toast.success('Lançamento removido do extrato.', 'Excluído');
    isDeleteModalOpen.value = false;
    deleteTargetId.value = null;
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
  <div class="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] w-full mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
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
    <!-- FILTRO DE PERÍODO (CHIPS)                      -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="opt in [
            { key: 'TODAY', label: 'Hoje' },
            { key: 'WEEK', label: '7 Dias' },
            { key: 'MONTH', label: 'Este Mês' },
            { key: 'PREV_MONTH', label: 'Mês Anterior' },
            { key: 'YEAR', label: 'Este Ano' },
            { key: 'ALL', label: 'Todo o Período' },
            { key: 'CUSTOM', label: 'Personalizado' },
          ]"
          :key="opt.key"
          @click="setPeriod(opt.key as any)"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="selectedPeriod === opt.key
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Datas Personalizadas (quando ativado) -->
      <div v-if="selectedPeriod === 'CUSTOM'" class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
          @click="applyCustomDateFilter" 
          class="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:opacity-90 transition cursor-pointer"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- KPI CARDS FINANCEIROS (VISÍVEIS NO TOPO)       -->
    <!-- ============================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Card 1: Faturamento Bruto (Receitas) -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Receitas Totais</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowUpRight class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {{ formatMoney(summary.totalIncome) }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1 truncate">
            <span class="text-emerald-500 font-bold">Entradas</span> serviços &amp; produtos
          </div>
        </div>
      </div>

      <!-- Card 2: Despesas Operacionais -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Despesas &amp; Saídas</span>
          <div class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowDownRight class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
            {{ formatMoney(summary.totalExpense) }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1 truncate">
            Custos fixos e repasses pagos
          </div>
        </div>
      </div>

      <!-- Card 3: Lucro Líquido Real -->
      <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Lucro Líquido Real</span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Wallet class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <div class="text-xl sm:text-2xl font-black truncate" :class="summary.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'">
            {{ formatMoney(summary.netProfit) }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1 truncate">
            Sobrou em caixa no período
          </div>
        </div>
      </div>

      <!-- Card 4: Contas a Pagar / Previsão Pendente (Pilar 4) -->
      <div 
        @click="entryStatusFilter = entryStatusFilter === 'PENDING' ? 'ALL' : 'PENDING'"
        class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border shadow-sm relative overflow-hidden group cursor-pointer transition hover:border-amber-500/50"
        :class="(summary.pendingExpensesCount || 0) > 0 ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-slate-200 dark:border-white/[0.08]'"
        title="Clique para filtrar contas pendentes"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Contas a Pagar</span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <CalendarClock class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <div class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
            {{ formatMoney(summary.pendingExpensesTotal || 0) }}
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1">
            <span class="font-black text-amber-500">{{ summary.pendingExpensesCount || 0 }}</span> conta(s) pendente(s)
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- DRE GERENCIAL SINTÉTICO (PILAR 1) & FORMAS DE PAGAMENTO (PILAR 3)          -->
    <!-- ========================================================================= -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      
      <!-- DRE Gerencial (lg:col-span-2) -->
      <div class="lg:col-span-2 bg-white dark:bg-[#0e131d] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
        <div>
          <!-- Topo do DRE com Botão Recolher/Expandir -->
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                <Calculator class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>DRE Gerencial Sintético</span>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                    Demonstrativo de Resultados
                  </span>
                </h3>
                <p class="text-[11px] text-slate-400">
                  Visão executiva da lucratividade real e margem líquida da operação
                </p>
              </div>
            </div>

            <button 
              @click="toggleDre"
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              <span>{{ isDreOpen ? 'Recolher DRE' : 'Expandir DRE' }}</span>
              <ChevronUp v-if="isDreOpen" class="w-3.5 h-3.5" />
              <ChevronDown v-else class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Conteúdo do DRE (quando aberto) -->
          <div v-show="isDreOpen" class="mt-4 space-y-3">
            
            <!-- Linha 1: Receita Bruta Total -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px]">+</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">Faturamento Bruto (Serviços + Balcão)</span>
              </div>
              <span class="font-black text-slate-900 dark:text-white text-sm">
                {{ formatMoney(summary.totalIncome) }}
              </span>
            </div>

            <!-- Linha 2: Repasses Barbeiros Parceiros -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-[11px]">-</span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 block">Quota-Parte dos Barbeiros (Comissões)</span>
                  <span class="text-[10px] text-slate-400">Salão-Parceiro Lei 13.352</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-black text-amber-500 text-sm block">
                  - {{ formatMoney(summary.totalCommissionsGenerated) }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ summary.totalIncome > 0 ? ((summary.totalCommissionsGenerated / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
                </span>
              </div>
            </div>

            <!-- Linha 3: Receita Líquida do Estabelecimento -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20 text-xs">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center font-black text-[11px]">=</span>
                <span class="font-black text-blue-700 dark:text-blue-300">Receita Líquida da Barbearia</span>
              </div>
              <span class="font-black text-blue-700 dark:text-blue-300 text-sm">
                {{ formatMoney(summary.netSalonIncome || (summary.totalIncome - summary.totalCommissionsGenerated)) }}
              </span>
            </div>

            <!-- Linha 4: Despesas Operacionais e Fixas -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-[11px]">-</span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 block">Despesas Fixas &amp; Custos Operacionais</span>
                  <span class="text-[10px] text-slate-400">Aluguel, energia, insumos, sistemas e outras saídas</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-black text-rose-500 text-sm block">
                  - {{ formatMoney(summary.totalExpense) }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ summary.totalIncome > 0 ? ((summary.totalExpense / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
                </span>
              </div>
            </div>

            <!-- Linha 5: Resultado Líquido Operacional (Lucro Real) -->
            <div 
              class="flex items-center justify-between p-4 rounded-2xl border text-xs"
              :class="summary.netProfit >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'"
            >
              <div class="flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                  $
                </span>
                <div>
                  <span class="font-black text-sm uppercase tracking-wider block"
                    :class="summary.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'"
                  >
                    Resultado Líquido do Exercício (Lucro Real)
                  </span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400">
                    Lucro retido em caixa após todas as despesas e repasses
                  </span>
                </div>
              </div>

              <div class="text-right">
                <span class="text-xl font-black block"
                  :class="summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ formatMoney(summary.netProfit) }}
                </span>
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black inline-block mt-0.5 shadow-sm"
                  :class="summary.netProfit >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'"
                >
                  {{ summary.profitMargin || 0 }}% Margem Líquida
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Conciliação por Forma de Pagamento (lg:col-span-1) -->
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
        <div>
          <!-- Topo -->
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                <PieChart class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-black text-slate-900 dark:text-white">
                  Formas de Pagamento
                </h3>
                <p class="text-[11px] text-slate-400">
                  Conciliação das entradas no período
                </p>
              </div>
            </div>
          </div>

          <!-- Barra Visual Segmentada -->
          <div class="my-4">
            <div class="w-full h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex shadow-inner">
              <div 
                v-if="summary.paymentMethods?.PIX"
                :style="{ width: `${summary.paymentMethods.PIX.percentage}%` }" 
                class="bg-emerald-500 transition-all duration-500" 
                title="Pix"
              ></div>
              <div 
                v-if="summary.paymentMethods?.CREDIT_CARD"
                :style="{ width: `${summary.paymentMethods.CREDIT_CARD.percentage}%` }" 
                class="bg-blue-500 transition-all duration-500" 
                title="Cartão de Crédito"
              ></div>
              <div 
                v-if="summary.paymentMethods?.DEBIT_CARD"
                :style="{ width: `${summary.paymentMethods.DEBIT_CARD.percentage}%` }" 
                class="bg-indigo-500 transition-all duration-500" 
                title="Cartão de Débito"
              ></div>
              <div 
                v-if="summary.paymentMethods?.CASH"
                :style="{ width: `${summary.paymentMethods.CASH.percentage}%` }" 
                class="bg-amber-500 transition-all duration-500" 
                title="Dinheiro"
              ></div>
              <div 
                v-if="summary.paymentMethods?.TRANSFER"
                :style="{ width: `${summary.paymentMethods.TRANSFER.percentage}%` }" 
                class="bg-slate-400 transition-all duration-500" 
                title="Outros"
              ></div>
            </div>
          </div>

          <!-- Lista de Métodos -->
          <div class="space-y-2 text-xs">
            <div 
              v-for="(data, method) in summary.paymentMethods" 
              :key="method"
              class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]"
            >
              <div class="flex items-center gap-2">
                <span 
                  class="w-2.5 h-2.5 rounded-full"
                  :class="{
                    'bg-emerald-500': method === 'PIX',
                    'bg-blue-500': method === 'CREDIT_CARD',
                    'bg-indigo-500': method === 'DEBIT_CARD',
                    'bg-amber-500': method === 'CASH',
                    'bg-slate-400': method !== 'PIX' && method !== 'CREDIT_CARD' && method !== 'DEBIT_CARD' && method !== 'CASH',
                  }"
                ></span>
                <span class="font-bold text-slate-800 dark:text-slate-200">
                  {{ getPaymentMethodLabel(method) }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">({{ data.count }})</span>
              </div>

              <div class="text-right">
                <span class="font-black text-slate-900 dark:text-white block">
                  {{ formatMoney(data.total) }}
                </span>
                <span class="text-[10px] text-slate-400 font-bold">
                  {{ data.percentage }}%
                </span>
              </div>
            </div>

            <div v-if="!summary.paymentMethods || Object.keys(summary.paymentMethods).length === 0" class="text-center py-6 text-slate-400 text-xs">
              Nenhuma entrada no período para conciliar.
            </div>
          </div>
        </div>

        <div class="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] text-[10px] text-slate-400 flex items-center justify-between">
          <span>Total Conciliado:</span>
          <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatMoney(summary.totalIncome) }}</span>
        </div>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- EXTRATO FINANCEIRO & LIVRO CAIXA                                          -->
    <!-- ========================================================================= -->
    <div class="space-y-4">
      
      <!-- Barra de Filtros e Busca de Lançamentos -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        
        <!-- Input de Busca -->
        <div class="relative flex-1 max-w-sm">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="entrySearchQuery" 
            type="text" 
            placeholder="Buscar por descrição, barbeiro, categoria..."
            class="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <!-- Filtros Tipo, Status & Categoria -->
        <div class="flex items-center gap-2 flex-wrap">
          
          <!-- Filtro Tipo -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
            <button 
              @click="entryTypeFilter = 'ALL'" 
              :class="entryTypeFilter === 'ALL' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Todos
            </button>
            <button 
              @click="entryTypeFilter = 'INCOME'" 
              :class="entryTypeFilter === 'INCOME' ? 'bg-emerald-500 text-white font-black shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Receitas
            </button>
            <button 
              @click="entryTypeFilter = 'EXPENSE'" 
              :class="entryTypeFilter === 'EXPENSE' ? 'bg-rose-500 text-white font-black shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Despesas
            </button>
          </div>

          <!-- Filtro Status de Pagamento (Pilar 4) -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
            <button 
              @click="entryStatusFilter = 'ALL'" 
              :class="entryStatusFilter === 'ALL' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Todos Status
            </button>
            <button 
              @click="entryStatusFilter = 'PAID'" 
              :class="entryStatusFilter === 'PAID' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
            >
              Pagos
            </button>
            <button 
              @click="entryStatusFilter = 'PENDING'" 
              :class="entryStatusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
            >
              <span>A Pagar</span>
              <span v-if="(summary.pendingExpensesCount || 0) > 0" class="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            </button>
            <button 
              @click="entryStatusFilter = 'OVERDUE'" 
              :class="entryStatusFilter === 'OVERDUE' ? 'bg-rose-600 text-white font-black shadow-sm animate-pulse' : 'text-slate-500 dark:text-slate-400'"
              class="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
              title="Lançamentos com vencimento ultrapassado"
            >
              Vencidos
            </button>
          </div>

          <!-- Select Categoria -->
          <select 
            v-model="entryCategoryFilter"
            class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option v-for="cat in distinctEntryCategories" :key="cat" :value="cat" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
              {{ cat }}
            </option>
          </select>

          <!-- Botão Exportar CSV -->
          <button 
            @click="exportToCsv"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-amber-500/50 bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
            title="Exportar lançamentos filtrados em CSV"
          >
            <Download class="w-3.5 h-3.5 text-amber-500" />
            <span class="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>

        <!-- Alternador Cards vs Lista -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 shrink-0 self-end sm:self-auto">
          <button 
            @click="setEntryViewMode('LIST')" 
            :class="entryViewMode === 'LIST' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Lista / Tabela"
          >
            <List class="w-4 h-4" />
          </button>
          <button 
            @click="setEntryViewMode('CARDS')" 
            :class="entryViewMode === 'CARDS' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Cards"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
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
                <th class="px-5 py-3.5">Status</th>
                <th class="px-5 py-3.5">Descrição</th>
                <th class="px-5 py-3.5 cursor-pointer hover:text-amber-500 transition" @click="toggleSort('category')">
                  <div class="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5">Profissional</th>
                <th class="px-5 py-3.5">Forma</th>
                <th class="px-5 py-3.5 text-right cursor-pointer hover:text-amber-500 transition" @click="toggleSort('amount')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Valor</span>
                    <ArrowUpDown class="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th class="px-5 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04]">
              <tr v-if="loading" class="text-center">
                <td colspan="9" class="px-5 py-12 text-slate-400">
                  <div class="flex items-center justify-center gap-2">
                    <Loader2 class="w-5 h-5 animate-spin text-amber-500" />
                    <span>Carregando extrato financeiro...</span>
                  </div>
                </td>
              </tr>

              <tr v-else-if="paginatedEntries.length === 0" class="text-center">
                <td colspan="9" class="px-5 py-12 text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <DollarSign class="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p class="font-bold text-slate-600 dark:text-slate-300">Nenhum lançamento encontrado para os filtros ativos.</p>
                    <p class="text-[11px] text-slate-400">Clique em "+ Nova Receita / Despesa" para cadastrar um novo lançamento.</p>
                  </div>
                </td>
              </tr>

              <!-- LINHA DA TABELA: CLICÁVEL PARA ABRIR O MODAL DE DETALHES -->
              <tr 
                v-for="entry in paginatedEntries" 
                :key="entry.id"
                @click="openEntryDetail(entry)"
                class="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.05] transition cursor-pointer group"
                title="Clique para ver os detalhes completos deste lançamento"
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

                <!-- Status Inteligente (Pilar 4) -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span 
                      class="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider inline-block"
                      :class="getEntryStatusBadge(entry).class"
                    >
                      {{ getEntryStatusBadge(entry).label }}
                    </span>
                    <button 
                      v-if="entry.status === 'PENDING'"
                      @click.stop="handleSettleEntry(entry)"
                      class="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 font-black text-[10px] transition cursor-pointer"
                      title="Dar baixa / Marcar como Pago"
                    >
                      Dar Baixa
                    </button>
                  </div>
                </td>

                <!-- Descrição -->
                <td class="px-5 py-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                  {{ entry.description }}
                </td>

                <!-- Categoria -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                    {{ entry.category }}
                  </span>
                </td>

                <!-- Barbeiro -->
                <td class="px-5 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                  <div v-if="entry.barberName" class="flex items-center gap-1.5 font-medium">
                    <User class="w-3.5 h-3.5 text-amber-500" />
                    <span>{{ entry.barberName }}</span>
                    <span v-if="entry.barberCommission" class="text-[10px] text-amber-500 font-bold">
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
                <td class="px-5 py-4 whitespace-nowrap text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button 
                      @click.stop="openEntryDetail(entry)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="Ver detalhes completos"
                    >
                      <FileText class="w-4 h-4" />
                    </button>
                    <button 
                      @click.stop="confirmDeleteEntry(entry)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Controles de Paginação -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-white/[0.06] text-xs">
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>Mostrando página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong> ({{ sortedEntries.length }} lançamentos)</span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Seletor Itens por Página -->
            <div class="flex items-center gap-1 text-slate-500">
              <span>Linhas:</span>
              <button 
                v-for="num in [10, 20, 50, 100]" 
                :key="num"
                @click="setItemsPerPage(num)"
                class="px-2 py-0.5 rounded-md font-bold transition cursor-pointer"
                :class="itemsPerPage === num ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'"
              >
                {{ num }}
              </button>
            </div>

            <!-- Navegação Anterior / Próxima -->
            <div class="flex items-center gap-1">
              <button 
                @click="currentPage = Math.max(1, currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Anterior
              </button>
              <button 
                @click="currentPage = Math.min(totalPages, currentPage + 1)"
                :disabled="currentPage >= totalPages"
                class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM CARDS -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="entry in paginatedEntries" 
          :key="entry.id"
          @click="openEntryDetail(entry)"
          class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 border border-slate-200 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-amber-500/40 dark:hover:border-amber-500/30 transition space-y-3 cursor-pointer group"
          title="Clique para ver detalhes completos"
        >
          <div class="flex items-center justify-between">
            <span 
              class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1"
              :class="entry.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'"
            >
              <component :is="entry.type === 'INCOME' ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />
              {{ entry.type === 'INCOME' ? 'Receita' : 'Despesa' }}
            </span>

            <div class="flex items-center gap-1">
              <span 
                class="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider"
                :class="getEntryStatusBadge(entry).class"
              >
                {{ getEntryStatusBadge(entry).label }}
              </span>
              <button 
                v-if="entry.status === 'PENDING'"
                @click.stop="handleSettleEntry(entry)"
                class="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[9px] uppercase transition cursor-pointer shadow-xs"
                title="Dar baixa / Marcar como Pago"
              >
                Baixar
              </button>
            </div>
          </div>

          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
              {{ entry.description }}
            </h4>
            <div class="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ formatDate(entry.paidAt || entry.createdAt) }}</span>
              <span>•</span>
              <span class="font-bold text-amber-500">{{ entry.category }}</span>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 block uppercase font-bold">Valor</span>
              <span class="text-base font-black" :class="entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                {{ entry.type === 'INCOME' ? '+' : '-' }} {{ formatMoney(entry.amount) }}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button 
                @click.stop="openEntryDetail(entry)"
                class="p-2 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer"
                title="Ver detalhes"
              >
                <FileText class="w-4 h-4" />
              </button>
              <button 
                @click.stop="confirmDeleteEntry(entry)"
                class="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer"
                title="Excluir"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: NOVO LANÇAMENTO (RECEITA OU DESPESA) COM PLANO DE CONTAS (PILAR 5)-->
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
                Registre uma entrada de receita ou custo operacional no livro caixa
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
            @click="entryForm.type = 'EXPENSE'; entryForm.category = 'Insumos & Descartáveis'"
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

          <!-- Categoria Padronizada (Pilar 5) & Valor -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Categoria (Centro de Custo)
              </label>
              <select 
                v-model="entryForm.category"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <optgroup label="Receitas Operacionais">
                  <option value="Serviço">Serviço de Barbearia / Cabelo</option>
                  <option value="Venda de Produto">Venda de Cosméticos / Frigobar</option>
                  <option value="Aporte de Capital">Aporte de Capital / Outras Entradas</option>
                </optgroup>
                <optgroup label="Custos Operacionais & Insumos">
                  <option value="Insumos & Descartáveis">Insumos &amp; Descartáveis (Lâminas, Toalhas)</option>
                  <option value="Manutenção de Equipamentos">Manutenção de Máquinas &amp; Cadeiras</option>
                  <option value="Lavanderia & Limpeza">Lavanderia &amp; Higienização</option>
                  <option value="Compra de Bebidas/Produtos">Compra de Estoque / Fornecedores</option>
                </optgroup>
                <optgroup label="Despesas Fixas">
                  <option value="Aluguel & Condomínio">Aluguel &amp; Condomínio</option>
                  <option value="Energia Elétrica">Energia Elétrica (Luz)</option>
                  <option value="Água & Saneamento">Água &amp; Saneamento</option>
                  <option value="Internet, Telefone & TV">Internet, Telefone &amp; TV a Cabo</option>
                </optgroup>
                <optgroup label="Marketing & Softwares">
                  <option value="Assinatura BarblyClub & Softwares">Assinatura BarblyClub &amp; Softwares</option>
                  <option value="Anúncios Meta (Instagram)">Anúncios Meta (Instagram/Facebook)</option>
                  <option value="Publicidade & Gráfica">Publicidade &amp; Material Impresso</option>
                </optgroup>
                <optgroup label="Pessoal & Sócios">
                  <option value="Pró-Labore dos Sócios">Pró-Labore dos Sócios</option>
                  <option value="Salários Recepção/Apoio">Salários Recepção / Limpeza</option>
                  <option value="Repasse Barbeiro">Repasse Salão-Parceiro</option>
                </optgroup>
                <optgroup label="Tributos & Taxas">
                  <option value="Taxas de Cartão & Maquininha">Taxas de Cartão &amp; Maquininha</option>
                  <option value="Impostos MEI / Simples">MEI / Simples Nacional / Tributos</option>
                </optgroup>
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

          <!-- Status do Lançamento & Vencimento (Pilar 4) -->
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Status da Operação
              </label>
              <select 
                v-model="entryForm.status"
                class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="PAID">Efetivado (Já Pago no Ato)</option>
                <option value="PENDING">A Pagar / Agendado (Pendente)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {{ entryForm.status === 'PAID' ? 'Data de Pagamento' : 'Data de Vencimento *' }}
              </label>
              <input 
                v-model="entryForm.dueDate"
                type="date"
                class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
                <option value="PIX" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Pix Instantâneo</option>
                <option value="CREDIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Crédito</option>
                <option value="DEBIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Débito</option>
                <option value="CASH" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Dinheiro em Espécie</option>
                <option value="TRANSFER" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Transferência Bancária / TED</option>
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
              Este valor será creditado no saldo do barbeiro no módulo de Comissões.
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
    <!-- MODAL 2: DETALHES DO LANÇAMENTO FINANCEIRO                                -->
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
          <div class="flex items-center gap-2">
            <button 
              type="button" 
              @click="confirmDeleteEntry(selectedEntryForDetail); isDetailModalOpen = false;"
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <button 
              v-if="selectedEntryForDetail.status === 'PENDING'"
              type="button" 
              @click="handleSettleEntry(selectedEntryForDetail); isDetailModalOpen = false;"
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
            >
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Dar Baixa (Pagar)</span>
            </button>
          </div>

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
    <!-- MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO                                         -->
    <!-- ========================================================================= -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-sm w-full p-6 space-y-5 text-center">
        <div class="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
          <AlertTriangle class="w-6 h-6" />
        </div>

        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">Confirmar Exclusão</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tem certeza que deseja remover este lançamento do livro caixa?
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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

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

@media print {
  body * {
    visibility: hidden;
  }
  .print\\:block, .print\\:block * {
    visibility: visible;
  }
}
</style>
