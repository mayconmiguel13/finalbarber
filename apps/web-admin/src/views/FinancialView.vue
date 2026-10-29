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
  PieChart,
  Sliders,
  Printer,
  Calendar
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

// ================= AUDIO EFFECTS =================
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

// ================= NAVEGAÇÃO DE ABAS =================
const activeFinancialTab = ref<'ENTRIES' | 'DRE' | 'PAYABLES'>('ENTRIES');
function setFinancialTab(tab: 'ENTRIES' | 'DRE' | 'PAYABLES') {
  playPopSound();
  activeFinancialTab.value = tab;
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

// ================= FILTRO DE STATUS (LIVRO CAIXA) =================
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
  link.setAttribute('download', `livro_caixa_${selectedPeriod.value.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Relatório CSV exportado com sucesso!', 'Exportação Concluída');
}

// ================= MODAL DE DETALHES DO LANÇAMENTO =================
const isDetailModalOpen = ref(false);
const selectedEntryForDetail = ref<FinancialEntry | null>(null);

function openEntryDetail(entry: FinancialEntry) {
  playPopSound();
  selectedEntryForDetail.value = entry;
  isDetailModalOpen.value = true;
}

function closeEntryDetail() {
  playPopSound();
  isDetailModalOpen.value = false;
  selectedEntryForDetail.value = null;
}

function copyTransactionId(id: string) {
  playPopSound();
  navigator.clipboard.writeText(id);
  toast.success('ID da transação copiado!', 'Copiado');
}

function printDetailModal() {
  playPopSound();
  window.print();
}

// ================= MODAL DE NOVO LANÇAMENTO (RECEITA / DESPESA) =================
// Modal de Configuração Rápida de Taxas da Maquininha
const isFeeModalOpen = ref(false);
const feeForm = reactive({
  pixFeePercent: 0,
  debitFeePercent: 1.4,
  creditFeePercent: 3.2,
  deductFeeFromSplit: true,
});

function openFeeModal() {
  playPopSound();
  if (summary.value.paymentFees) {
    feeForm.pixFeePercent = Number(summary.value.paymentFees.pixFeePercent) ?? 0;
    feeForm.debitFeePercent = Number(summary.value.paymentFees.debitFeePercent) ?? 1.4;
    feeForm.creditFeePercent = Number(summary.value.paymentFees.creditFeePercent) ?? 3.2;
    feeForm.deductFeeFromSplit = summary.value.paymentFees.deductFeeFromSplit ?? true;
  }
  isFeeModalOpen.value = true;
}

async function handleSaveFees() {
  playPopSound();
  saving.value = true;
  try {
    await api.updatePaymentFees({
      pixFeePercent: Number(feeForm.pixFeePercent) || 0,
      debitFeePercent: Number(feeForm.debitFeePercent) || 0,
      creditFeePercent: Number(feeForm.creditFeePercent) || 0,
      deductFeeFromSplit: Boolean(feeForm.deductFeeFromSplit),
    });
    playSuccessSound();
    toast.success('Taxas da maquininha salvas com sucesso!', 'Economia Aplicada');
    isFeeModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar taxas da maquininha.', 'Falha');
  } finally {
    saving.value = false;
  }
}

// Controle de Categoria Personalizada vs Padrão no Modal de Lançamento
const isCustomCategory = ref(false);

const isEntryModalOpen = ref(false);
const entryForm = reactive({
  type: 'INCOME' as 'INCOME' | 'EXPENSE',
  category: 'CORTES',
  description: '',
  amount: '' as string | number,
  paymentMethod: 'PIX',
  barberId: '',
  barberCommission: '' as string | number,
  status: 'PAID' as 'PAID' | 'PENDING',
  dueDate: ''
});

function openCreateEntryModal(type: 'INCOME' | 'EXPENSE' = 'INCOME') {
  playPopSound();
  entryForm.type = type;
  entryForm.category = type === 'INCOME' ? 'CORTES' : 'ALUGUEL';
  entryForm.description = '';
  entryForm.amount = '';
  entryForm.paymentMethod = 'PIX';
  entryForm.barberId = '';
  entryForm.barberCommission = '';
  entryForm.status = 'PAID';
  entryForm.dueDate = '';
  isCustomCategory.value = false;
  isEntryModalOpen.value = true;
}

// ================= MODAL DE EXCLUSÃO =================
const isDeleteModalOpen = ref(false);
const deleteTargetId = ref<string | null>(null);
const deleteTargetTitle = ref<string>('');

function confirmDeleteEntry(id: string, description: string) {
  playPopSound();
  deleteTargetId.value = id;
  deleteTargetTitle.value = description;
  isDeleteModalOpen.value = true;
}

async function executeDeleteEntry() {
  if (!deleteTargetId.value) return;
  saving.value = true;
  try {
    await api.deleteFinancialEntry(deleteTargetId.value);
    playSuccessSound();
    toast.success('Lançamento excluído com sucesso!', 'Exclusão Concluída');
    isDeleteModalOpen.value = false;
    deleteTargetId.value = null;
    if (isDetailModalOpen.value) {
      isDetailModalOpen.value = false;
      selectedEntryForDetail.value = null;
    }
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao excluir lançamento.', 'Falha');
  } finally {
    saving.value = false;
  }
}

// ================= CARREGAMENTO DE DADOS =================
async function loadAllData() {
  loading.value = true;
  try {
    const range = getActiveDateRange();
    const [summaryRes, entriesRes, barbersRes, customersRes] = await Promise.all([
      api.getFinancialSummary({
        startDate: range.startDate,
        endDate: range.endDate,
      }),
      api.getFinancialEntries({
        startDate: range.startDate,
        endDate: range.endDate,
      }),
      api.getBarbers().catch(() => []),
      api.getCustomers().catch(() => [])
    ]);

    summary.value = summaryRes;
    entries.value = entriesRes;
    barbers.value = barbersRes;
    customers.value = customersRes;
    currentPage.value = 1;
  } catch (err: any) {
    console.error('Erro ao carregar dados financeiros:', err);
    toast.error(err.message || 'Erro ao carregar módulo financeiro', 'Falha');
  } finally {
    loading.value = false;
  }
}

// ================= COMPUTED PROPERTIES: LIVRO CAIXA =================
const distinctEntryCategories = computed(() => {
  const cats = new Set<string>();
  cats.add('Todos');
  entries.value.forEach(e => {
    if (e.category) cats.add(e.category);
  });
  return Array.from(cats);
});

const filteredEntries = computed(() => {
  let list = entries.value;

  if (entryTypeFilter.value !== 'ALL') {
    list = list.filter(e => e.type === entryTypeFilter.value);
  }

  if (entryStatusFilter.value !== 'ALL') {
    if (entryStatusFilter.value === 'PAID') {
      list = list.filter(e => e.status === 'PAID');
    } else if (entryStatusFilter.value === 'PENDING') {
      list = list.filter(e => e.status === 'PENDING');
    } else if (entryStatusFilter.value === 'OVERDUE') {
      list = list.filter(e => e.status === 'PENDING' && isOverdue(e.dueDate));
    }
  }

  if (entryCategoryFilter.value !== 'Todos') {
    list = list.filter(e => e.category === entryCategoryFilter.value);
  }

  if (entrySearchQuery.value.trim()) {
    const q = entrySearchQuery.value.toLowerCase().trim();
    list = list.filter(e => 
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.barberName && e.barberName.toLowerCase().includes(q)) ||
      (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q))
    );
  }

  return list;
});

const sortedEntries = computed(() => {
  const list = [...filteredEntries.value];
  list.sort((a, b) => {
    let fieldA: any = a.paidAt || a.createdAt;
    let fieldB: any = b.paidAt || b.createdAt;

    if (sortColumn.value === 'amount') {
      fieldA = Number(a.amount);
      fieldB = Number(b.amount);
    } else if (sortColumn.value === 'type') {
      fieldA = a.type;
      fieldB = b.type;
    } else if (sortColumn.value === 'category') {
      fieldA = a.category;
      fieldB = b.category;
    }

    if (fieldA < fieldB) return sortDirection.value === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

const totalPages = computed(() => {
  return Math.ceil(sortedEntries.value.length / itemsPerPage.value) || 1;
});

const paginatedEntries = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedEntries.value.slice(start, start + itemsPerPage.value);
});

// ================= COMPUTED PROPERTIES: CONTAS A PAGAR =================
const payablesFilter = ref<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
const payablesSearch = ref('');

const allExpenses = computed(() => {
  return entries.value.filter(e => e.type === 'EXPENSE');
});

const pendingPayables = computed(() => {
  return allExpenses.value.filter(e => e.status === 'PENDING');
});

const overduePayables = computed(() => {
  return pendingPayables.value.filter(e => isOverdue(e.dueDate));
});

const todayPayables = computed(() => {
  return pendingPayables.value.filter(e => isDueToday(e.dueDate));
});

const paidExpenses = computed(() => {
  return allExpenses.value.filter(e => e.status === 'PAID');
});

const totalPendingAmount = computed(() => {
  return pendingPayables.value.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
});

const totalOverdueAmount = computed(() => {
  return overduePayables.value.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
});

const filteredPayables = computed(() => {
  let list = pendingPayables.value;
  if (payablesFilter.value === 'OVERDUE') {
    list = overduePayables.value;
  } else if (payablesFilter.value === 'TODAY') {
    list = todayPayables.value;
  } else if (payablesFilter.value === 'UPCOMING') {
    list = pendingPayables.value.filter(e => !isOverdue(e.dueDate) && !isDueToday(e.dueDate));
  }

  if (payablesSearch.value.trim()) {
    const q = payablesSearch.value.toLowerCase().trim();
    list = list.filter(e => 
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q))
    );
  }

  return list;
});

// ================= HELPERS VISUAIS =================
function formatMoney(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'PIX': return 'Pix Instantâneo';
    case 'CREDIT_CARD': return 'Cartão de Crédito';
    case 'DEBIT_CARD': return 'Cartão de Débito';
    case 'CASH': return 'Dinheiro em Espécie';
    case 'TRANSFER': return 'Transferência Bancária';
    default: return method || 'Outro';
  }
}

async function handleCreateEntrySubmit() {
  if (!entryForm.description.trim()) {
    toast.error('Informe uma descrição para o lançamento.', 'Campo Obrigatório');
    return;
  }
  if (!entryForm.amount || Number(entryForm.amount) <= 0) {
    toast.error('Informe um valor numérico válido.', 'Valor Inválido');
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
            Controle de Caixa &amp; Finanças
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" /> Barbly Financial Suite
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Financeiro &amp; Livro Caixa
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Demonstrativo de receitas, despesas operacionais, fluxo de caixa e gestão de contas da barbearia.
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
    <!-- NAVEGAÇÃO DE ABAS EXECUTIVAS                   -->
    <!-- ============================================== -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3 overflow-x-auto no-scrollbar">
      
      <!-- Aba 1: Livro Caixa & Extrato -->
      <button 
        @click="setFinancialTab('ENTRIES')"
        class="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer whitespace-nowrap"
        :class="activeFinancialTab === 'ENTRIES' 
          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <FileText class="w-4 h-4" />
        <span>Livro Caixa (Extrato)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-black">
          {{ entries.length }}
        </span>
      </button>

      <!-- Aba 2: DRE Gerencial Sintético & Indicadores -->
      <button 
        @click="setFinancialTab('DRE')"
        class="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer whitespace-nowrap"
        :class="activeFinancialTab === 'DRE' 
          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <Calculator class="w-4 h-4" />
        <span>DRE Gerencial &amp; Métricas</span>
        <span 
          class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
          :class="(summary.profitMargin || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'"
        >
          {{ summary.profitMargin || 0 }}% Margem
        </span>
      </button>

      <!-- Aba 3: Contas a Pagar & Prazos -->
      <button 
        @click="setFinancialTab('PAYABLES')"
        class="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer whitespace-nowrap"
        :class="activeFinancialTab === 'PAYABLES' 
          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
      >
        <CalendarClock class="w-4 h-4" />
        <span>Contas a Pagar</span>
        <span 
          v-if="(summary.pendingExpensesCount || 0) > 0" 
          class="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse"
        >
          {{ summary.pendingExpensesCount }}
        </span>
      </button>

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

    <!-- ========================================================================= -->
    <!-- ABA 1: LIVRO CAIXA & EXTRATO DE LANÇAMENTOS                               -->
    <!-- ========================================================================= -->
    <div v-if="activeFinancialTab === 'ENTRIES'" class="space-y-6">
      
      <!-- Top 4 KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <!-- Card 1: Faturamento Bruto (Receitas) -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Faturamento Bruto</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {{ formatMoney(summary.totalIncome) }}
            </div>
            <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 truncate flex items-center gap-1">
              <ArrowUpRight class="w-3.5 h-3.5 shrink-0" />
              <span>Entradas operacionais</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Despesas Totais -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Despesas &amp; Saídas</span>
            <div class="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {{ formatMoney(summary.totalExpense) }}
            </div>
            <div class="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1 truncate flex items-center gap-1">
              <ArrowDownRight class="w-3.5 h-3.5 shrink-0" />
              <span>Custos fixos &amp; variáveis</span>
            </div>
          </div>
        </div>

        <!-- Card 3: Saldo Líquido do Caixa -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Saldo Líquido</span>
            <div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wallet class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div 
              class="text-xl sm:text-2xl font-black truncate"
              :class="summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ formatMoney(summary.netProfit) }}
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1 truncate flex items-center gap-1">
              <span>Margem:</span>
              <span class="font-black" :class="(summary.profitMargin || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                {{ summary.profitMargin || 0 }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Card 4: Contas a Pagar (Atalho clicável) -->
        <div 
          @click="setFinancialTab('PAYABLES')"
          class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border shadow-sm relative overflow-hidden group cursor-pointer transition hover:border-amber-500/50"
          :class="(summary.pendingExpensesCount || 0) > 0 ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-slate-200 dark:border-white/[0.08]'"
          title="Clique para abrir a aba Contas a Pagar"
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
              <span class="font-black text-amber-500">{{ summary.pendingExpensesCount || 0 }}</span> pendente(s) • <span class="text-amber-500 underline font-semibold">Ver aba</span>
            </div>
          </div>
        </div>

      </div>

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

          <!-- Filtro Status de Pagamento -->
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
            title="Visualização em Grade / Cards"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
        </div>

      </div>

      <!-- TABELA / LISTA DE LANÇAMENTOS -->
      <div v-if="entryViewMode === 'LIST'" class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th class="py-3.5 px-4 cursor-pointer select-none hover:text-amber-500" @click="toggleSort('date')">
                  <div class="flex items-center gap-1">
                    <span>Data / Hora</span>
                    <ArrowUpDown class="w-3 h-3" />
                  </div>
                </th>
                <th class="py-3.5 px-4 cursor-pointer select-none hover:text-amber-500" @click="toggleSort('type')">
                  <div class="flex items-center gap-1">
                    <span>Tipo</span>
                    <ArrowUpDown class="w-3 h-3" />
                  </div>
                </th>
                <th class="py-3.5 px-4">Status &amp; Vencimento</th>
                <th class="py-3.5 px-4 cursor-pointer select-none hover:text-amber-500" @click="toggleSort('category')">
                  <div class="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown class="w-3 h-3" />
                  </div>
                </th>
                <th class="py-3.5 px-4">Descrição</th>
                <th class="py-3.5 px-4">Profissional</th>
                <th class="py-3.5 px-4">Forma</th>
                <th class="py-3.5 px-4 text-right cursor-pointer select-none hover:text-amber-500" @click="toggleSort('amount')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Valor</span>
                    <ArrowUpDown class="w-3 h-3" />
                  </div>
                </th>
                <th class="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
              <tr 
                v-for="entry in paginatedEntries" 
                :key="entry.id"
                @click="openEntryDetail(entry)"
                class="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.05] transition cursor-pointer group"
                title="Clique para ver os detalhes completos deste lançamento"
              >
                <!-- Data -->
                <td class="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {{ formatDate(entry.paidAt || entry.createdAt) }}
                </td>

                <!-- Tipo -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <span 
                    class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    :class="entry.type === 'INCOME' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                  >
                    {{ entry.type === 'INCOME' ? 'Receita' : 'Despesa' }}
                  </span>
                </td>

                <!-- Status & Vencimento -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span 
                      class="px-2 py-0.5 rounded-full text-[10px]"
                      :class="getEntryStatusBadge(entry).class"
                    >
                      {{ getEntryStatusBadge(entry).label }}
                    </span>
                    <!-- Botão Dar Baixa Rápida se Pendente -->
                    <button 
                      v-if="entry.status === 'PENDING'"
                      @click.stop="handleSettleEntry(entry)"
                      class="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] transition cursor-pointer shadow-sm"
                      title="Registrar pagamento (Dar Baixa)"
                    >
                      Baixar
                    </button>
                  </div>
                </td>

                <!-- Categoria -->
                <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  <span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-[11px]">
                    {{ entry.category || 'Geral' }}
                  </span>
                </td>

                <!-- Descrição -->
                <td class="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-[240px] truncate" :title="entry.description">
                  <span class="font-medium group-hover:text-amber-500 transition-colors">{{ entry.description }}</span>
                </td>

                <!-- Profissional / Barbeiro -->
                <td class="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  <div v-if="entry.barberName" class="flex items-center gap-1.5">
                    <div class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black">
                      {{ entry.barberName.charAt(0) }}
                    </div>
                    <span class="font-semibold text-[11px]">{{ entry.barberName }}</span>
                  </div>
                  <span v-else class="text-slate-400 text-[11px]">—</span>
                </td>

                <!-- Forma de Pagamento -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <CreditCard class="w-3.5 h-3.5 text-slate-400" />
                    <span class="font-bold text-[11px]">{{ getPaymentMethodLabel(entry.paymentMethod) }}</span>
                  </div>
                </td>

                <!-- Valor -->
                <td class="py-3 px-4 text-right font-black whitespace-nowrap">
                  <span :class="entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ entry.type === 'INCOME' ? '+' : '-' }} {{ formatMoney(entry.amount) }}
                  </span>
                </td>

                <!-- Ações -->
                <td class="py-3 px-4 text-center whitespace-nowrap" @click.stop>
                  <div class="flex items-center justify-center gap-1.5">
                    <button 
                      @click.stop="openEntryDetail(entry)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="Ver detalhes completos"
                    >
                      <FileText class="w-4 h-4" />
                    </button>
                    <button 
                      @click.stop="confirmDeleteEntry(entry.id, entry.description)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredEntries.length === 0">
                <td colspan="9" class="py-12 text-center text-slate-400">
                  <div class="max-w-xs mx-auto space-y-2">
                    <FileText class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
                    <p class="font-bold text-sm text-slate-600 dark:text-slate-300">Nenhum lançamento encontrado</p>
                    <p class="text-xs text-slate-400">Não há registros no período ou filtros selecionados.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div v-if="filteredEntries.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <span>Exibindo <strong>{{ paginatedEntries.length }}</strong> de <strong>{{ filteredEntries.length }}</strong> lançamentos</span>
            <span class="text-slate-300 dark:text-slate-700">|</span>
            <div class="flex items-center gap-1">
              <span>Linhas por página:</span>
              <select 
                :value="itemsPerPage" 
                @change="setItemsPerPage(Number(($event.target as any).value))"
                class="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button 
              @click="currentPage = Math.max(1, currentPage - 1)" 
              :disabled="currentPage === 1"
              class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Anterior
            </button>
            <span class="px-3 py-1 font-bold">Página {{ currentPage }} de {{ totalPages }}</span>
            <button 
              @click="currentPage = Math.min(totalPages, currentPage + 1)" 
              :disabled="currentPage === totalPages"
              class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <!-- CARDS VIEW (SE ATIVADO) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="entry in paginatedEntries" 
          :key="entry.id"
          @click="openEntryDetail(entry)"
          class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 border border-slate-200 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-amber-500/40 dark:hover:border-amber-500/30 transition space-y-3 cursor-pointer group"
          title="Clique para ver detalhes completos"
        >
          <div class="flex items-center justify-between">
            <span 
              class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              :class="entry.type === 'INCOME' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
            >
              {{ entry.type === 'INCOME' ? 'Receita' : 'Despesa' }}
            </span>
            <span class="text-[11px] font-semibold text-slate-400">
              {{ formatDate(entry.paidAt || entry.createdAt) }}
            </span>
          </div>

          <div>
            <div class="text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-1">
              {{ entry.description }}
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {{ entry.category || 'Geral' }}
              </span>
              <span 
                class="px-2 py-0.5 rounded-full text-[10px]"
                :class="getEntryStatusBadge(entry).class"
              >
                {{ getEntryStatusBadge(entry).label }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">Valor</span>
              <span 
                class="text-base font-black"
                :class="entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
              >
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
                @click.stop="confirmDeleteEntry(entry.id, entry.description)"
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
    <!-- ABA 2: DRE GERENCIAL SINTÉTICO & INDICADORES                              -->
    <!-- ========================================================================= -->
    <div v-else-if="activeFinancialTab === 'DRE'" class="space-y-6">
      
      <!-- Top Executive Profitability Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <!-- Faturamento Bruto -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Receita Bruta Total</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black">
              +
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {{ formatMoney(summary.totalIncome) }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1 truncate">
              Base 100% de faturamento
            </div>
          </div>
        </div>

        <!-- Repasses Barbeiros Parceiros -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Quota-Parte Equipe</span>
            <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
              -
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-amber-500 truncate">
              {{ formatMoney(summary.totalCommissionsGenerated) }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1 truncate">
              {{ summary.totalIncome > 0 ? ((summary.totalCommissionsGenerated / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
            </div>
          </div>
        </div>

        <!-- Despesas & Custos -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Despesas Operacionais</span>
            <div class="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black">
              -
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-rose-500 truncate">
              {{ formatMoney(summary.operationalExpenses ?? summary.totalExpense) }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1 truncate">
              {{ summary.totalIncome > 0 ? (((summary.operationalExpenses ?? summary.totalExpense) / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
            </div>
          </div>
        </div>

        <!-- Margem Operacional Líquida % -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Margem Líquida Real</span>
            <div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center font-black">
              =
            </div>
          </div>
          <div class="mt-2">
            <div 
              class="text-xl sm:text-2xl font-black truncate"
              :class="(summary.profitMargin || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'"
            >
              {{ summary.profitMargin || 0 }}%
            </div>
            <div class="text-[11px] font-bold mt-1 truncate" :class="(summary.profitMargin || 0) >= 20 ? 'text-emerald-500' : ((summary.profitMargin || 0) >= 10 ? 'text-amber-500' : 'text-rose-500')">
              {{ (summary.profitMargin || 0) >= 20 ? 'Alta Lucratividade' : ((summary.profitMargin || 0) >= 10 ? 'Margem Estável' : 'Atenção aos Custos') }}
            </div>
          </div>
        </div>

      </div>

      <!-- Grid DRE Sintético + Formas de Pagamento -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- DRE Gerencial Detalhado (lg:col-span-2) -->
        <div class="lg:col-span-2 bg-white dark:bg-[#0e131d] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                <Calculator class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Demonstração do Resultado do Exercício (DRE)</span>
                </h3>
                <p class="text-xs text-slate-400">
                  Visão executiva da lucratividade real e margem líquida retida pela barbearia
                </p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
              Regime de Caixa
            </span>
          </div>

          <div class="space-y-3.5">
            
            <!-- Linha 1: Receita Bruta Total -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">+</span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 block text-xs">Faturamento Bruto Operacional</span>
                  <span class="text-[10px] text-slate-400">Cortes, barbas, combos, produtos e balcão</span>
                </div>
              </div>
              <span class="font-black text-slate-900 dark:text-white text-base">
                {{ formatMoney(summary.totalIncome) }}
              </span>
            </div>

            <!-- Linha 2: Repasses Barbeiros Parceiros -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs">-</span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 block text-xs">Quota-Parte dos Barbeiros Parceiros</span>
                  <span class="text-[10px] text-slate-400">Comissões profissionais conforme Lei 13.352 (Salão-Parceiro)</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-black text-amber-500 text-base block">
                  - {{ formatMoney(summary.totalCommissionsGenerated) }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ summary.totalIncome > 0 ? ((summary.totalCommissionsGenerated / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
                </span>
              </div>
            </div>

            <!-- Linha 2.5: Taxas da Maquininha & Cartão -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/15">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs">-</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 dark:text-slate-200 block text-xs">Taxas da Maquininha &amp; Cartão</span>
                    <button 
                      @click="openFeeModal"
                      class="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-black text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      title="Ajustar taxas da sua maquininha"
                    >
                      <Sliders class="w-2.5 h-2.5" />
                      <span>Ajustar Taxas</span>
                    </button>
                  </div>
                  <span class="text-[10px] text-slate-400">
                    Débito ({{ summary.paymentFees?.debitFeePercent ?? 1.4 }}%) • Crédito ({{ summary.paymentFees?.creditFeePercent ?? 3.2 }}%)
                  </span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-black text-amber-600 dark:text-amber-400 text-base block">
                  - {{ formatMoney(summary.cardFeeTotal || 0) }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ summary.totalIncome > 0 ? (((summary.cardFeeTotal || 0) / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
                </span>
              </div>
            </div>

            <!-- Linha 3: Receita Líquida do Estabelecimento -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center font-black text-xs">=</span>
                <div>
                  <span class="font-black text-blue-700 dark:text-blue-300 block text-xs">Receita Líquida da Barbearia</span>
                  <span class="text-[10px] text-blue-500/80">Valor efetivamente pertencente ao estabelecimento</span>
                </div>
              </div>
              <span class="font-black text-blue-700 dark:text-blue-300 text-base">
                {{ formatMoney(summary.netSalonIncome || (summary.totalIncome - summary.totalCommissionsGenerated)) }}
              </span>
            </div>

            <!-- Linha 4: Despesas Operacionais e Fixas -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center font-black text-xs">-</span>
                <div>
                  <span class="font-bold text-slate-800 dark:text-slate-200 block text-xs">Despesas Fixas &amp; Custos Operacionais</span>
                  <span class="text-[10px] text-slate-400">Aluguel, energia, insumos descartáveis, marketing e taxas</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-black text-rose-500 text-base block">
                  - {{ formatMoney(summary.operationalExpenses ?? summary.totalExpense) }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ summary.totalIncome > 0 ? (((summary.operationalExpenses ?? summary.totalExpense) / summary.totalIncome) * 100).toFixed(1) : 0 }}% do faturamento
                </span>
              </div>
            </div>

            <!-- Linha 5: Resultado Líquido Operacional (Lucro Real) -->
            <div 
              class="flex items-center justify-between p-4 sm:p-5 rounded-2xl border"
              :class="summary.netProfit >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'"
            >
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center font-mono">
                  $
                </span>
                <div>
                  <span class="font-black text-sm sm:text-base uppercase tracking-wider block"
                    :class="summary.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'"
                  >
                    Resultado Líquido do Exercício (Lucro Real)
                  </span>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400">
                    Lucro retido em caixa após todas as despesas e repasses
                  </span>
                </div>
              </div>

              <div class="text-right">
                <span class="text-xl sm:text-2xl font-black block"
                  :class="summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ formatMoney(summary.netProfit) }}
                </span>
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black inline-block mt-1 shadow-sm"
                  :class="summary.netProfit >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'"
                >
                  {{ summary.profitMargin || 0 }}% Margem Líquida
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- Conciliação por Forma de Pagamento (lg:col-span-1) -->
        <div class="bg-white dark:bg-[#0e131d] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <!-- Topo -->
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                  <PieChart class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="text-base font-black text-slate-900 dark:text-white">
                    Formas de Pagamento
                  </h3>
                  <p class="text-xs text-slate-400">
                    Conciliação das entradas no período
                  </p>
                </div>
              </div>
              <button 
                @click="openFeeModal"
                class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-amber-500/15 hover:text-amber-500 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                title="Configurar taxas de cartão"
              >
                <Sliders class="w-3.5 h-3.5" />
                <span>Taxas</span>
              </button>
            </div>

            <!-- Barra Visual Segmentada -->
            <div class="my-5">
              <div class="w-full h-3.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex shadow-inner">
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
            <div class="space-y-2.5 text-xs">
              <div 
                v-for="(data, method) in summary.paymentMethods" 
                :key="method"
                class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]"
              >
                <div class="flex items-center gap-2">
                  <span 
                    class="w-3 h-3 rounded-full shrink-0"
                    :class="{
                      'bg-emerald-500': method === 'PIX',
                      'bg-blue-500': method === 'CREDIT_CARD',
                      'bg-indigo-500': method === 'DEBIT_CARD',
                      'bg-amber-500': method === 'CASH',
                      'bg-slate-400': method === 'TRANSFER'
                    }"
                  ></span>
                  <div>
                    <span class="font-bold text-slate-800 dark:text-slate-200 block">
                      {{ getPaymentMethodLabel(method as string) }}
                    </span>
                    <span class="text-[10px] text-slate-400">
                      {{ data.count }} transação(ões)
                    </span>
                  </div>
                </div>

                <div class="text-right">
                  <span class="font-black text-slate-900 dark:text-white block text-sm">
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

          <div class="pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
            <span>Total Conciliado:</span>
            <span class="font-black text-slate-900 dark:text-white text-sm">{{ formatMoney(summary.totalIncome) }}</span>
          </div>
        </div>

      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- ABA 3: CONTAS A PAGAR & VENCIMENTOS                                       -->
    <!-- ========================================================================= -->
    <div v-else-if="activeFinancialTab === 'PAYABLES'" class="space-y-6">
      
      <!-- Top 3 KPI Cards Contas a Pagar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        <!-- Total a Pagar Pendente -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/[0.02] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total a Pagar (Pendente)</span>
            <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
              <CalendarClock class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
              {{ formatMoney(totalPendingAmount) }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              <span class="font-black text-amber-500">{{ pendingPayables.length }}</span> conta(s) pendente(s)
            </div>
          </div>
        </div>

        <!-- Contas Vencidas -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-rose-500/30 bg-rose-500/[0.02] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-wider">Contas Vencidas</span>
            <div class="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black">
              <AlertTriangle class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
              {{ formatMoney(totalOverdueAmount) }}
            </div>
            <div class="text-[11px] text-rose-500 mt-1 font-bold">
              <span>{{ overduePayables.length }}</span> conta(s) em atraso
            </div>
          </div>
        </div>

        <!-- Contas Pagas no Período -->
        <div class="bg-white dark:bg-[#0e131d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Contas Pagas no Período</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2">
            <div class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {{ formatMoney(paidExpenses.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)) }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              {{ paidExpenses.length }} despesa(s) quitada(s)
            </div>
          </div>
        </div>

      </div>

      <!-- Barra de Filtros e Busca de Contas a Pagar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        
        <!-- Input de Busca -->
        <div class="relative flex-1 max-w-sm">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="payablesSearch" 
            type="text" 
            placeholder="Buscar conta a pagar, fornecedor..."
            class="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <!-- Chips de Vencimento -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button 
            @click="payablesFilter = 'ALL'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="payablesFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            Todas Pendentes ({{ pendingPayables.length }})
          </button>
          <button 
            @click="payablesFilter = 'OVERDUE'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
            :class="payablesFilter === 'OVERDUE' ? 'bg-rose-600 text-white font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <span>Vencidas ({{ overduePayables.length }})</span>
            <span v-if="overduePayables.length > 0" class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </button>
          <button 
            @click="payablesFilter = 'TODAY'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="payablesFilter === 'TODAY' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            Vencendo Hoje ({{ todayPayables.length }})
          </button>
          <button 
            @click="payablesFilter = 'UPCOMING'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="payablesFilter === 'UPCOMING' ? 'bg-blue-600 text-white font-black' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            A Vencer Futuras
          </button>

          <button 
            @click="openCreateEntryModal('EXPENSE')"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-xs hover:opacity-95 transition cursor-pointer ml-auto"
          >
            <Plus class="w-3.5 h-3.5 stroke-[3]" />
            <span>Nova Conta a Pagar</span>
          </button>
        </div>

      </div>

      <!-- Tabela de Contas a Pagar -->
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th class="py-3.5 px-4">Status &amp; Vencimento</th>
                <th class="py-3.5 px-4">Descrição / Fornecedor</th>
                <th class="py-3.5 px-4">Categoria</th>
                <th class="py-3.5 px-4">Forma Prevista</th>
                <th class="py-3.5 px-4 text-right">Valor</th>
                <th class="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
              <tr 
                v-for="payable in filteredPayables" 
                :key="payable.id"
                @click="openEntryDetail(payable)"
                class="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.05] transition cursor-pointer group"
              >
                <!-- Status & Vencimento -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <span 
                    class="px-2.5 py-1 rounded-full text-[10px]"
                    :class="getEntryStatusBadge(payable).class"
                  >
                    {{ getEntryStatusBadge(payable).label }}
                  </span>
                </td>

                <!-- Descrição -->
                <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <span class="group-hover:text-amber-500 transition-colors">{{ payable.description }}</span>
                </td>

                <!-- Categoria -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-[11px] text-slate-600 dark:text-slate-300">
                    {{ payable.category }}
                  </span>
                </td>

                <!-- Forma Prevista -->
                <td class="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {{ getPaymentMethodLabel(payable.paymentMethod) }}
                </td>

                <!-- Valor -->
                <td class="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                  - {{ formatMoney(payable.amount) }}
                </td>

                <!-- Ações -->
                <td class="py-3 px-4 text-center whitespace-nowrap" @click.stop>
                  <div class="flex items-center justify-center gap-2">
                    <button 
                      @click.stop="handleSettleEntry(payable)"
                      class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <Check class="w-3.5 h-3.5 stroke-[3]" />
                      <span>Dar Baixa</span>
                    </button>
                    <button 
                      @click.stop="openEntryDetail(payable)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                      title="Ver detalhes"
                    >
                      <FileText class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredPayables.length === 0">
                <td colspan="6" class="py-16 text-center text-slate-400">
                  <div class="max-w-xs mx-auto space-y-2">
                    <CheckCircle2 class="w-10 h-10 mx-auto text-emerald-500 stroke-1" />
                    <p class="font-bold text-sm text-slate-800 dark:text-slate-200">Tudo em dia!</p>
                    <p class="text-xs text-slate-400">Nenhuma conta pendente para os filtros selecionados.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 1: NOVO LANÇAMENTO (RECEITA / DESPESA) COM PLANO DE CONTAS          -->
    <!-- ========================================================================= -->
    <div v-if="isEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        <!-- Cabeçalho Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-2xl flex items-center justify-center font-black"
              :class="entryForm.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'"
            >
              <Plus class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white">
                Novo Lançamento
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ entryForm.type === 'INCOME' ? 'Registre uma nova entrada de caixa' : 'Registre uma despesa ou custo operacional' }}
              </p>
            </div>
          </div>
          <button 
            @click="isEntryModalOpen = false" 
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Seletor Tipo: Receita vs Despesa -->
        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10">
          <button 
            type="button"
            @click="entryForm.type = 'INCOME'; entryForm.category = 'CORTES'"
            class="py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
            :class="entryForm.type === 'INCOME' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 dark:text-slate-400'"
          >
            + Receita (Entrada)
          </button>
          <button 
            type="button"
            @click="entryForm.type = 'EXPENSE'; entryForm.category = 'ALUGUEL'"
            class="py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
            :class="entryForm.type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'"
          >
            - Despesa (Saída)
          </button>
        </div>

        <!-- Formulário -->
        <div class="space-y-4">
          
          <!-- Plano de Contas Padronizado para Barbearias (optgroup) + Categoria Customizada -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Categoria {{ isCustomCategory ? '(Personalizada)' : '(Plano de Contas)' }}
              </label>
              <button 
                type="button"
                @click="isCustomCategory = !isCustomCategory"
                class="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
              >
                {{ isCustomCategory ? '← Escolher da lista padrão' : '+ Outra Categoria' }}
              </button>
            </div>

            <!-- Input livre para categoria personalizada -->
            <input 
              v-if="isCustomCategory"
              v-model="entryForm.category"
              type="text"
              placeholder="Digite o nome da nova categoria..."
              class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />

            <!-- Select estruturado por optgroup -->
            <select 
              v-else
              v-model="entryForm.category"
              class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <optgroup v-if="entryForm.type === 'INCOME'" label="Receitas Operacionais" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                <option value="CORTES">Cortes de Cabelo</option>
                <option value="BARBA">Barba &amp; Terapia</option>
                <option value="COMBOS">Combos &amp; Pacotes</option>
                <option value="PRODUTOS_POMADAS">Produtos &amp; Pomadas</option>
                <option value="BEBIDAS_FRIGOBAR">Bebidas &amp; Frigobar</option>
                <option value="OUTRAS_RECEITAS">Outras Receitas</option>
              </optgroup>

              <template v-else>
                <optgroup label="Custos Operacionais &amp; Insumos" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                  <option value="INSUMOS_DESCARTAVEIS">Lâminas, Golas &amp; Descartáveis</option>
                  <option value="PRODUTOS_USO_INTERNO">Shampoos &amp; Produtos Lavatório</option>
                  <option value="REPOSICAO_ESTOQUE">Reposição de Pomadas/Produtos Venda</option>
                </optgroup>
                <optgroup label="Despesas Fixas da Barbearia" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                  <option value="ALUGUEL">Aluguel &amp; Condomínio</option>
                  <option value="ENERGIA_AGUA">Energia Elétrica &amp; Água</option>
                  <option value="INTERNET_TELEFONE">Internet &amp; Telefone</option>
                  <option value="SISTEMAS_SOFTWARE">Softwares &amp; Assinaturas</option>
                </optgroup>
                <optgroup label="Marketing &amp; Vendas" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                  <option value="TRAFEGO_PAGO">Tráfego Pago &amp; Anúncios</option>
                  <option value="REDES_SOCIAIS">Social Media &amp; Design</option>
                </optgroup>
                <optgroup label="Pessoal &amp; Sócios" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                  <option value="PRO_LABORE">Pró-labore dos Sócios</option>
                  <option value="ADIANTAMENTOS">Adiantamentos / Vales</option>
                  <option value="BONIFICACOES">Bonificações &amp; Prêmios</option>
                </optgroup>
                <optgroup label="Tributos &amp; Taxas" class="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#121824]">
                  <option value="IMPOSTOS_MEI_SIMPLES">DAS / Simples Nacional / MEI</option>
                  <option value="TAXAS_MAQUINAS">Taxas de Cartão &amp; Bancárias</option>
                </optgroup>
              </template>
            </select>
          </div>

          <!-- Descrição -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Descrição do Lançamento
            </label>
            <input 
              v-model="entryForm.description"
              type="text" 
              placeholder="Ex: Corte degrade com barba, Conta de Luz CEMIG..."
              class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <!-- Grid Valor & Forma de Pagamento -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor Total (R$)
              </label>
              <input 
                v-model="entryForm.amount"
                type="number" 
                step="0.01" 
                min="0"
                placeholder="0,00"
                class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Forma de Pagamento
              </label>
              <select 
                v-model="entryForm.paymentMethod"
                class="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="PIX">Pix Instantâneo</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="CASH">Dinheiro em Espécie</option>
                <option value="TRANSFER">Transferência Bancária</option>
              </select>
            </div>
          </div>

          <!-- Status de Pagamento & Vencimento (Pilar 4) -->
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status do Lançamento
              </label>
              <select 
                v-model="entryForm.status"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="PAID">Pago Imediatamente</option>
                <option value="PENDING">Pendente / A Pagar</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Vencimento
              </label>
              <input 
                v-model="entryForm.dueDate"
                type="date"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <!-- Se Receita: Vínculo opcional com Barbeiro e Comissão -->
          <div v-if="entryForm.type === 'INCOME'" class="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
            <div class="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Split class="w-3.5 h-3.5" />
              <span>Vínculo com Profissional (Salão-Parceiro)</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Barbeiro Executor
                </label>
                <select 
                  v-model="entryForm.barberId"
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none"
                >
                  <option value="">Nenhum (Salão)</option>
                  <option v-for="b in barbers" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Comissão (R$)
                </label>
                <input 
                  v-model="entryForm.barberCommission"
                  type="number" 
                  step="0.01" 
                  min="0"
                  placeholder="0,00"
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-amber-600 dark:text-amber-400 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        <!-- Botões do Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isEntryModalOpen = false" 
            class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleCreateEntrySubmit" 
            :disabled="saving"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>{{ saving ? 'Salvando...' : 'Confirmar Lançamento' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 2: DETALHES COMPLETOS DO LANÇAMENTO                                  -->
    <!-- ========================================================================= -->
    <div v-if="isDetailModalOpen && selectedEntryForDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar print:p-0 print:shadow-none print:max-w-none">
        
        <!-- Cabeçalho do Modal de Detalhes -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08] print:border-b-2 print:border-black">
          <div class="flex items-center gap-3">
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
              :class="selectedEntryForDetail.type === 'INCOME' 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'"
            >
              {{ selectedEntryForDetail.type === 'INCOME' ? '+' : '-' }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  :class="selectedEntryForDetail.type === 'INCOME' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                >
                  {{ selectedEntryForDetail.type === 'INCOME' ? 'Receita Operacional' : 'Despesa / Custo' }}
                </span>
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px]"
                  :class="getEntryStatusBadge(selectedEntryForDetail).class"
                >
                  {{ getEntryStatusBadge(selectedEntryForDetail).label }}
                </span>
              </div>
              <h3 class="text-xl font-black text-slate-900 dark:text-white mt-1">
                Detalhes do Lançamento
              </h3>
            </div>
          </div>

          <button 
            @click="closeEntryDetail" 
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer print:hidden"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Bloco Principal do Valor -->
        <div 
          class="p-6 rounded-3xl border text-center space-y-1 relative overflow-hidden"
          :class="selectedEntryForDetail.type === 'INCOME' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'"
        >
          <span class="text-xs uppercase font-black tracking-widest opacity-80">
            {{ selectedEntryForDetail.type === 'INCOME' ? 'Valor Recebido' : 'Valor a Pagar / Pago' }}
          </span>
          <div class="text-3xl sm:text-4xl font-black font-sans">
            {{ formatMoney(selectedEntryForDetail.amount) }}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Data de competência: {{ formatDate(selectedEntryForDetail.paidAt || selectedEntryForDetail.createdAt) }}
          </p>
        </div>

        <!-- Grade de Metadados -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
            <span class="text-slate-400 font-bold block mb-1">Categoria Contábil</span>
            <span class="font-black text-slate-800 dark:text-slate-200 text-sm">
              {{ selectedEntryForDetail.category || 'Geral' }}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
            <span class="text-slate-400 font-bold block mb-1">Forma de Pagamento</span>
            <span class="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <CreditCard class="w-4 h-4 text-amber-500" />
              {{ getPaymentMethodLabel(selectedEntryForDetail.paymentMethod) }}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] sm:col-span-2">
            <span class="text-slate-400 font-bold block mb-1">Descrição Detalhada</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {{ selectedEntryForDetail.description }}
            </p>
          </div>

          <!-- Vínculo com Barbeiro se houver comissão -->
          <div v-if="selectedEntryForDetail.barberName || (selectedEntryForDetail.barberCommission && selectedEntryForDetail.barberCommission > 0)" class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 sm:col-span-2 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Users class="w-4 h-4" />
                <span>Profissional Parceiro (Lei 13.352)</span>
              </span>
              <span class="font-black text-amber-700 dark:text-amber-400">
                Comissão: {{ formatMoney(selectedEntryForDetail.barberCommission) }}
              </span>
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-300">
              Profissional: <strong>{{ selectedEntryForDetail.barberName || 'Barbeiro Cadastrado' }}</strong>
            </div>
          </div>

          <div v-if="selectedEntryForDetail.dueDate" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
            <span class="text-slate-400 font-bold block mb-1">Data de Vencimento</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">
              {{ formatDate(selectedEntryForDetail.dueDate) }}
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
            <span class="text-slate-400 font-bold block mb-1">ID da Transação</span>
            <div class="flex items-center gap-1">
              <span class="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate">
                {{ selectedEntryForDetail.id }}
              </span>
              <button 
                @click="copyTransactionId(selectedEntryForDetail.id)"
                class="p-1 hover:text-amber-500 transition cursor-pointer shrink-0"
                title="Copiar ID"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        <!-- Botões de Ação Rodapé -->
        <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08] print:hidden">
          <div class="flex items-center gap-2">
            <button 
              @click="printDetailModal"
              class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs transition cursor-pointer"
            >
              <Printer class="w-4 h-4 text-slate-500" />
              <span>Imprimir</span>
            </button>
            
            <button 
              v-if="selectedEntryForDetail.status === 'PENDING'"
              @click="handleSettleEntry(selectedEntryForDetail)"
              class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Dar Baixa (Pagar)</span>
            </button>

            <button 
              @click="confirmDeleteEntry(selectedEntryForDetail.id, selectedEntryForDetail.description)"
              class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold text-xs transition cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
              <span>Excluir</span>
            </button>
          </div>

          <button 
            @click="closeEntryDetail"
            class="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 4: CONFIGURAÇÃO DE TAXAS DA MAQUININHA                              -->
    <!-- ========================================================================= -->
    <div v-if="isFeeModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
              <CreditCard class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900 dark:text-white">
                Taxas da Maquininha de Cartão
              </h3>
              <p class="text-xs text-slate-400">
                Configure as taxas reais da sua operadora (Stone, PagBank, Ton, etc.)
              </p>
            </div>
          </div>
          <button 
            @click="isFeeModalOpen = false" 
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 3 Inputs de Taxas -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Pix (%)</label>
            <div class="relative">
              <input 
                v-model.number="feeForm.pixFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-7 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Geralmente 0%</span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Débito (%)</label>
            <div class="relative">
              <input 
                v-model.number="feeForm.debitFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-7 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Padrão: 1.4%</span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-1">
            <label class="block text-[11px] font-bold text-slate-500 uppercase">Crédito 1x (%)</label>
            <div class="relative">
              <input 
                v-model.number="feeForm.creditFeePercent"
                type="number" 
                step="0.01" 
                min="0" 
                max="100"
                class="w-full px-3 py-2 pr-7 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <span class="text-[10px] text-slate-400">Padrão: 3.2%</span>
          </div>
        </div>

        <!-- Chave Seletora Inteligente (Toggle) -->
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start justify-between gap-4">
          <div class="space-y-1">
            <span class="text-xs font-black text-amber-900 dark:text-amber-300 block">
              Descontar taxa da maquininha da quota-parte dos profissionais?
            </span>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Amparado pela <strong>Lei 13.352 (Salão-Parceiro)</strong>. O repasse do barbeiro é calculado sobre o valor líquido recebido após a taxa da maquininha, evitando que o salão arque sozinho com a taxa.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input 
              v-model="feeForm.deductFeeFromSplit" 
              type="checkbox" 
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <!-- Simulador Didático Visual -->
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2 text-xs">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Simulação Prática (Exemplo: Corte de R$ 60,00 no Crédito 1x)</span>
          <div class="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
            <div class="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
              <span class="text-[10px] text-slate-400 block">Taxa ({{ feeForm.creditFeePercent }}%)</span>
              <span class="font-bold text-rose-500">- R$ {{ ((60 * feeForm.creditFeePercent) / 100).toFixed(2) }}</span>
            </div>
            <div class="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
              <span class="text-[10px] text-slate-400 block">Barbeiro (50%)</span>
              <span class="font-bold text-amber-500">
                R$ {{ feeForm.deductFeeFromSplit ? (((60 - ((60 * feeForm.creditFeePercent) / 100)) * 0.5)).toFixed(2) : '30.00' }}
              </span>
            </div>
            <div class="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5">
              <span class="text-[10px] text-slate-400 block">Barbearia Retém</span>
              <span class="font-bold text-emerald-500">
                R$ {{ feeForm.deductFeeFromSplit ? (((60 - ((60 * feeForm.creditFeePercent) / 100)) * 0.5)).toFixed(2) : (30 - ((60 * feeForm.creditFeePercent) / 100)).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botões do Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isFeeModalOpen = false" 
            class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleSaveFees" 
            :disabled="saving"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>{{ saving ? 'Salvando...' : 'Salvar Taxas' }}</span>
          </button>
        </div>

      </div>
    </div>

        <!-- ========================================================================= -->
    <!-- MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO                                         -->
    <!-- ========================================================================= -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-sm w-full p-6 space-y-5 text-center">
        <div class="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
          <Trash2 class="w-6 h-6" />
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
        <div class="flex items-center justify-center gap-3">
          <button 
            type="button" 
            @click="isDeleteModalOpen = false" 
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="executeDeleteEntry" 
            :disabled="saving"
            class="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            {{ saving ? 'Excluindo...' : 'Sim, Excluir' }}
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
.dark select optgroup {
  background-color: #121824 !important;
  color: #f1f5f9 !important;
}

select option,
select optgroup {
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
  .print\:block, .print\:block * {
    visibility: visible;
  }
}
</style>
