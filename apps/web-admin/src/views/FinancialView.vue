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
const activeTab = ref<'SUMMARY' | 'SPLITS' | 'PRODUCTS'>(
  (localStorage.getItem('barbly_financial_tab') as 'SUMMARY' | 'SPLITS' | 'PRODUCTS') || 'SUMMARY'
);

function setActiveTab(tab: 'SUMMARY' | 'SPLITS' | 'PRODUCTS') {
  playPopSound();
  activeTab.value = tab;
  localStorage.setItem('barbly_financial_tab', tab);
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

const splitViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_split_view') as 'CARDS' | 'LIST') || 'CARDS'
);
function setSplitViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  splitViewMode.value = mode;
  localStorage.setItem('barbly_split_view', mode);
}

const productViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_product_view') as 'CARDS' | 'LIST') || 'CARDS'
);
function setProductViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  productViewMode.value = mode;
  localStorage.setItem('barbly_product_view', mode);
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

// Filtros de Produtos
const productSearchQuery = ref('');
const productCategoryFilter = ref<string>('Todos');

// Chave Pix copiada
const copiedPixKey = ref<string | null>(null);

// ================= MODAIS =================
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

// 3. Modal Produto (Criar / Editar)
const isProductModalOpen = ref(false);
const isEditingProduct = ref(false);
const editingProductId = ref<string | null>(null);
const productForm = reactive({
  name: '',
  category: 'Frigobar & Bebidas',
  description: '',
  costPrice: 0,
  salePrice: 10,
  stockQuantity: 24,
  minStockAlert: 5,
  commissionPercentage: 0, // padrão 0% para bebidas
  photoUrl: ''
});

// 4. Modal PDV / Venda Rápida de Produto
const isSellModalOpen = ref(false);
const sellForm = reactive({
  productId: '',
  quantity: 1,
  barberId: '',
  customerId: '',
  paymentMethod: 'PIX'
});

// 5. Modal de Confirmação de Exclusão
const isDeleteModalOpen = ref(false);
const deleteTargetType = ref<'ENTRY' | 'PRODUCT' | null>(null);
const deleteTargetId = ref<string | null>(null);
const deleteTargetTitle = ref<string>('');

// Presets de Fotos de Produtos
const productPhotoPresets = [
  { name: 'Heineken Long Neck', url: 'https://images.unsplash.com/photo-1608270192804-d54620ec4221?auto=format&fit=crop&q=80&w=600' },
  { name: 'Corona Extra', url: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&q=80&w=600' },
  { name: 'Coca-Cola Gelada', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600' },
  { name: 'Água Mineral', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Pomada Matte Capilar', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Óleo para Barba Wood', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Shampoo & Balm', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=600' },
  { name: 'Loção Pós-Barba', url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=600' },
];

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

// 2. Splits dos Barbeiros Filtrados
const filteredSplits = computed(() => {
  const q = splitSearchQuery.value.toLowerCase().trim();
  if (!q) return splits.value;
  return splits.value.filter((s) => 
    s.barberName.toLowerCase().includes(q) ||
    s.pixKey?.toLowerCase().includes(q)
  );
});

// 3. Produtos Filtrados
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    if (productCategoryFilter.value !== 'Todos' && p.category !== productCategoryFilter.value) {
      return false;
    }
    const q = productSearchQuery.value.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });
});

// Total de itens em estoque crítico
const lowStockProductsCount = computed(() => {
  return products.value.filter((p) => Number(p.stockQuantity) <= Number(p.minStockAlert || 5)).length;
});

// Produto selecionado no modal PDV
const selectedProductForSale = computed(() => {
  return products.value.find((p) => p.id === sellForm.productId) || null;
});

// Cálculo em tempo real da venda no PDV
const saleTotalAmount = computed(() => {
  if (!selectedProductForSale.value) return 0;
  return Number(selectedProductForSale.value.salePrice) * (Number(sellForm.quantity) || 1);
});

const saleCommissionAmount = computed(() => {
  if (!selectedProductForSale.value || !sellForm.barberId) return 0;
  const rate = Number(selectedProductForSale.value.commissionPercentage) || 0;
  return (saleTotalAmount.value * rate) / 100;
});

// Categorias distintas de lançamentos para filtro
const distinctEntryCategories = computed(() => {
  const cats = new Set<string>();
  entries.value.forEach((e) => {
    if (e.category) cats.add(e.category);
  });
  return ['Todos', ...Array.from(cats)];
});

// Categorias distintas de produtos para filtro
const distinctProductCategories = computed(() => {
  const cats = new Set<string>();
  products.value.forEach((p) => {
    if (p.category) cats.add(p.category);
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

// ================= AÇÕES DE PRODUTOS & PDV =================
// ABRIR MODAL CRIAR PRODUTO
function openCreateProductModal() {
  playPopSound();
  isEditingProduct.value = false;
  editingProductId.value = null;
  productForm.name = '';
  productForm.category = 'Frigobar & Bebidas';
  productForm.description = '';
  productForm.costPrice = 4.5;
  productForm.salePrice = 12.0;
  productForm.stockQuantity = 24;
  productForm.minStockAlert = 6;
  productForm.commissionPercentage = 0; // cervejas normalmente 0% comissão
  productForm.photoUrl = '';
  isProductModalOpen.value = true;
}

// ABRIR MODAL EDITAR PRODUTO
function openEditProductModal(product: Product) {
  playPopSound();
  isEditingProduct.value = true;
  editingProductId.value = product.id;
  productForm.name = product.name;
  productForm.category = product.category || 'Frigobar & Bebidas';
  productForm.description = product.description || '';
  productForm.costPrice = Number(product.costPrice) || 0;
  productForm.salePrice = Number(product.salePrice) || 0;
  productForm.stockQuantity = Number(product.stockQuantity) || 0;
  productForm.minStockAlert = Number(product.minStockAlert) || 5;
  productForm.commissionPercentage = Number(product.commissionPercentage) || 0;
  productForm.photoUrl = product.photoUrl || '';
  isProductModalOpen.value = true;
}

// UPLOAD DE FOTO DE PRODUTO
async function handleProductFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    productForm.photoUrl = compressed;
    playPopSound();
    toast.success('Foto do produto carregada!', 'Imagem Pronta');
  } catch {
    toast.error('Erro ao ler foto do produto', 'Erro');
  }
}

// SELECIONAR PRESET DE FOTO
function selectProductPreset(url: string) {
  playPopSound();
  productForm.photoUrl = url;
}

// SALVAR PRODUTO
async function handleSaveProduct() {
  if (!productForm.name.trim()) {
    toast.error('Informe o nome do produto.', 'Atenção');
    return;
  }
  if (productForm.salePrice <= 0) {
    toast.error('O preço de venda deve ser maior que zero.', 'Atenção');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    const payload = {
      name: productForm.name.trim(),
      category: productForm.category,
      description: productForm.description.trim() || undefined,
      costPrice: Number(productForm.costPrice),
      salePrice: Number(productForm.salePrice),
      stockQuantity: Number(productForm.stockQuantity),
      minStockAlert: Number(productForm.minStockAlert),
      commissionPercentage: Number(productForm.commissionPercentage),
      photoUrl: productForm.photoUrl.trim() || undefined
    };

    if (isEditingProduct.value && editingProductId.value) {
      await api.updateProduct(editingProductId.value, payload);
      toast.success(`Produto "${productForm.name}" atualizado!`, 'Produto Salvo');
    } else {
      await api.createProduct(payload);
      toast.success(`Produto "${productForm.name}" cadastrado no estoque!`, 'Produto Criado');
    }

    isProductModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar produto.', 'Falha');
  } finally {
    saving.value = false;
  }
}

// ABRIR MODAL VENDA RÁPIDA / PDV
function openSellModal(product?: Product) {
  playPopSound();
  sellForm.productId = product ? product.id : (products.value[0]?.id || '');
  sellForm.quantity = 1;
  sellForm.barberId = '';
  sellForm.customerId = '';
  sellForm.paymentMethod = 'PIX';
  isSellModalOpen.value = true;
}

// EXECUTAR VENDA NO PDV
async function handleConfirmSale() {
  if (!sellForm.productId) {
    toast.error('Selecione o produto que está sendo vendido.', 'Atenção');
    return;
  }
  if (sellForm.quantity <= 0) {
    toast.error('Quantidade inválida.', 'Atenção');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    const res = await api.sellProduct({
      productId: sellForm.productId,
      quantity: Number(sellForm.quantity),
      barberId: sellForm.barberId || undefined,
      customerId: sellForm.customerId || undefined,
      paymentMethod: sellForm.paymentMethod
    });

    toast.success(res.message || 'Venda concluída com sucesso!', 'Caixa Atualizado');
    isSellModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao processar venda no PDV.', 'Falha');
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

function confirmDeleteProduct(product: Product) {
  playPopSound();
  deleteTargetType.value = 'PRODUCT';
  deleteTargetId.value = product.id;
  deleteTargetTitle.value = `Produto: ${product.name} (Estoque: ${product.stockQuantity})`;
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
    } else if (deleteTargetType.value === 'PRODUCT') {
      await api.deleteProduct(deleteTargetId.value);
      toast.success('Produto desativado do catálogo.', 'Excluído');
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
  <div class="p-3.5 sm:p-6 lg:p-10 space-y-5 sm:space-y-8 max-w-7xl mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
    <!-- ============================================== -->
    <!-- CABEÇALHO SUPERIOR & AÇÕES GLOBAIS             -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Gestão Financeira &amp; Split BarblyClub
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" /> Lei Salão-Parceiro nº 13.352
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Financeiro, Repasses &amp; PDV
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Controle completo de receitas, despesas, repasses de comissão por Pix aos barbeiros parceiros e caixa rápido de frigobar e cosméticos.
        </p>
      </div>

      <!-- Botões de Ação Topo -->
      <div class="flex items-center gap-3 shrink-0 flex-wrap">
        <button 
          @click="loadAllData" 
          class="p-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm cursor-pointer"
          title="Recarregar dados"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <!-- Botão Ação Aba 1: Novo Lançamento -->
        <button 
          v-if="activeTab === 'SUMMARY'"
          @click="openCreateEntryModal('INCOME')"
          class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Nova Receita / Despesa</span>
        </button>

        <!-- Botão Ação Aba 3: Novo Produto e Venda PDV -->
        <div v-if="activeTab === 'PRODUCTS'" class="flex items-center gap-2">
          <button 
            @click="openSellModal()"
            class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5"
          >
            <ShoppingBag class="w-4 h-4 stroke-[2.5]" />
            <span>Venda Rápida (PDV)</span>
          </button>

          <button 
            @click="openCreateProductModal"
            class="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- ABAS DE NAVEGAÇÃO SUPERIORES                   -->
    <!-- ============================================== -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] gap-4 overflow-x-auto no-scrollbar">
      <div class="flex items-center gap-2">
        <!-- Aba 1: Resumo & Extrato -->
        <button 
          @click="setActiveTab('SUMMARY')"
          class="flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-bold text-sm tracking-wide transition cursor-pointer whitespace-nowrap"
          :class="activeTab === 'SUMMARY' 
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black' 
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          <DollarSign class="w-4 h-4" />
          <span>Extrato &amp; Fluxo de Caixa</span>
          <span 
            class="px-2 py-0.5 rounded-full text-[10px] font-black"
            :class="activeTab === 'SUMMARY' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500'"
          >
            {{ entries.length }}
          </span>
        </button>

        <!-- Aba 2: Split Salão-Parceiro -->
        <button 
          @click="setActiveTab('SPLITS')"
          class="flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-bold text-sm tracking-wide transition cursor-pointer whitespace-nowrap"
          :class="activeTab === 'SPLITS' 
            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black' 
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          <Split class="w-4 h-4" />
          <span>Split Salão-Parceiro &amp; Pix</span>
          <span 
            class="px-2 py-0.5 rounded-full text-[10px] font-black"
            :class="activeTab === 'SPLITS' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500'"
          >
            {{ splits.length }} Barbeiros
          </span>
        </button>

        <!-- Aba 3: Produtos & PDV -->
        <button 
          @click="setActiveTab('PRODUCTS')"
          class="flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-bold text-sm tracking-wide transition cursor-pointer whitespace-nowrap"
          :class="activeTab === 'PRODUCTS' 
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black' 
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          <Package class="w-4 h-4" />
          <span>Produtos &amp; Frigobar (PDV)</span>
          <span 
            class="px-2 py-0.5 rounded-full text-[10px] font-black"
            :class="activeTab === 'PRODUCTS' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500'"
          >
            {{ products.length }} Itens
          </span>
        </button>
      </div>

      <!-- Alternador Cards vs Lista (de acordo com a aba ativa) -->
      <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
        <template v-if="activeTab === 'SUMMARY'">
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
        </template>

        <template v-else-if="activeTab === 'SPLITS'">
          <button 
            @click="setSplitViewMode('CARDS')" 
            :class="splitViewMode === 'CARDS' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Cards"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button 
            @click="setSplitViewMode('LIST')" 
            :class="splitViewMode === 'LIST' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Lista / Tabela"
          >
            <List class="w-4 h-4" />
          </button>
        </template>

        <template v-else-if="activeTab === 'PRODUCTS'">
          <button 
            @click="setProductViewMode('CARDS')" 
            :class="productViewMode === 'CARDS' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Cards"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button 
            @click="setProductViewMode('LIST')" 
            :class="productViewMode === 'LIST' ? 'bg-white dark:bg-[#121824] shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Visualização em Lista / Tabela"
          >
            <List class="w-4 h-4" />
          </button>
        </template>
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
    <div v-if="activeTab === 'SUMMARY'" class="space-y-6">
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
                <th class="px-5 py-3.5">Data</th>
                <th class="px-5 py-3.5">Tipo</th>
                <th class="px-5 py-3.5">Descrição</th>
                <th class="px-5 py-3.5">Categoria</th>
                <th class="px-5 py-3.5">Barbeiro / Profissional</th>
                <th class="px-5 py-3.5">Forma</th>
                <th class="px-5 py-3.5 text-right">Valor</th>
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
                    @click="confirmDeleteEntry(entry)"
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
              @click="confirmDeleteEntry(entry)"
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
    <!-- ABA 2: SPLIT SALÃO-PARCEIRO & PIX (LEI 13.352)                            -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'SPLITS'" class="space-y-6">
      <!-- Banner Educativo Lei Salão-Parceiro -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-5 h-5 text-emerald-500" />
            <h3 class="font-black text-sm text-slate-900 dark:text-white">
              Split Salão-Parceiro Conforme Lei Federal nº 13.352/2016
            </h3>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">
            A cota repassada ao profissional-parceiro não integra a receita bruta da barbearia, eliminando a bitributação no Simples Nacional e garantindo segurança jurídica total com 1 clique no Pix.
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pendente da Equipe</span>
            <div class="text-xl font-black text-amber-600 dark:text-amber-400">
              {{ formatMoney(summary.pendingCommissions) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Busca de Profissionais -->
      <div class="flex items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="splitSearchQuery" 
            type="text" 
            placeholder="Buscar por nome do barbeiro ou chave Pix..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM CARDS DOS BARBEIROS -->
      <div v-if="splitViewMode === 'CARDS'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="barberSplit in filteredSplits" 
          :key="barberSplit.barberId"
          class="bg-white dark:bg-[#0e131d] rounded-2xl p-6 border border-slate-200 dark:border-white/[0.08] shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition flex flex-col justify-between"
        >
          <div>
            <!-- Cabeçalho do Card: Avatar, Nome, Comissão % -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <img 
                  :src="barberSplit.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'" 
                  :alt="barberSplit.barberName"
                  class="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm"
                />
                <div>
                  <h3 class="font-black text-slate-900 dark:text-white text-base">
                    {{ barberSplit.barberName }}
                  </h3>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {{ barberSplit.commissionRate }}% Comissão Padrão
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dados de Chave Pix com Botão de Copiar -->
            <div class="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2">
              <div class="truncate">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chave Pix Cadastrada</div>
                <div class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                  {{ barberSplit.pixKey || 'Não cadastrada' }}
                </div>
              </div>
              <button 
                v-if="barberSplit.pixKey"
                @click="copyPix(barberSplit.pixKey)"
                class="p-2 rounded-lg bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition cursor-pointer shrink-0"
                :title="copiedPixKey === barberSplit.pixKey ? 'Copiado!' : 'Copiar Chave Pix'"
              >
                <Check v-if="copiedPixKey === barberSplit.pixKey" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Métricas Financeiras do Barbeiro -->
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</div>
                <div class="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {{ formatMoney(barberSplit.totalGrossRevenue) }}
                </div>
                <div class="text-[9px] text-slate-400 mt-0.5">
                  {{ barberSplit.servicesCount }} serv. | {{ barberSplit.productsCount }} prod.
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Cota Barbearia</div>
                <div class="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {{ formatMoney(barberSplit.salonRetainedShare) }}
                </div>
                <div class="text-[9px] text-slate-400 mt-0.5">
                  Estrutura &amp; Cadeira
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Total Ganho</div>
                <div class="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {{ formatMoney(barberSplit.totalCommissionEarned) }}
                </div>
                <div class="text-[9px] text-slate-400 mt-0.5">
                  Comissão acumulada
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Já Repassado</div>
                <div class="text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {{ formatMoney(barberSplit.totalCommissionPaid) }}
                </div>
                <div class="text-[9px] text-slate-400 mt-0.5">
                  Baixas efetuadas
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé do Card: Saldo Pendente e Botão Repassar Pix -->
          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo a Pagar</div>
              <div class="text-lg font-black" :class="barberSplit.pendingPayout > 0 ? 'text-amber-500' : 'text-slate-400'">
                {{ formatMoney(barberSplit.pendingPayout) }}
              </div>
            </div>

            <button 
              @click="openPayoutModal(barberSplit)"
              :disabled="barberSplit.pendingPayout <= 0"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              :class="barberSplit.pendingPayout > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:opacity-95' : 'bg-slate-200 dark:bg-white/10 text-slate-500'"
            >
              <Split class="w-3.5 h-3.5" />
              <span>Dar Baixa Pix</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM TABELA / LISTA DOS BARBEIROS -->
      <div v-else class="bg-white dark:bg-[#0e131d] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-slate-400 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th class="px-5 py-3.5">Profissional</th>
                <th class="px-5 py-3.5">Chave Pix</th>
                <th class="px-5 py-3.5 text-right">Faturamento Bruto</th>
                <th class="px-5 py-3.5 text-right">Comissão Ganha</th>
                <th class="px-5 py-3.5 text-right">Já Pago</th>
                <th class="px-5 py-3.5 text-right">Saldo Pendente</th>
                <th class="px-5 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04]">
              <tr 
                v-for="barberSplit in filteredSplits" 
                :key="barberSplit.barberId"
                class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
              >
                <!-- Profissional -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="barberSplit.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'" 
                      :alt="barberSplit.barberName"
                      class="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white">{{ barberSplit.barberName }}</div>
                      <div class="text-[10px] text-amber-500 font-bold">{{ barberSplit.commissionRate }}% comissão</div>
                    </div>
                  </div>
                </td>

                <!-- Chave Pix -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[11px] text-slate-600 dark:text-slate-300">{{ barberSplit.pixKey || '—' }}</span>
                    <button 
                      v-if="barberSplit.pixKey"
                      @click="copyPix(barberSplit.pixKey)"
                      class="text-slate-400 hover:text-emerald-500 cursor-pointer"
                    >
                      <Copy class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                <!-- Faturamento Bruto -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-bold text-slate-900 dark:text-white">
                  {{ formatMoney(barberSplit.totalGrossRevenue) }}
                </td>

                <!-- Comissão Ganha -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {{ formatMoney(barberSplit.totalCommissionEarned) }}
                </td>

                <!-- Já Pago -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-medium text-slate-500 dark:text-slate-400">
                  {{ formatMoney(barberSplit.totalCommissionPaid) }}
                </td>

                <!-- Saldo Pendente -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-black text-sm" :class="barberSplit.pendingPayout > 0 ? 'text-amber-500' : 'text-slate-400'">
                  {{ formatMoney(barberSplit.pendingPayout) }}
                </td>

                <!-- Ação -->
                <td class="px-5 py-4 whitespace-nowrap text-right">
                  <button 
                    @click="openPayoutModal(barberSplit)"
                    :disabled="barberSplit.pendingPayout <= 0"
                    class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    :class="barberSplit.pendingPayout > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
                  >
                    Pagar Pix
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- ABA 3: PRODUTOS, BEBIDAS & FRIGOBAR (PDV)                                  -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'PRODUCTS'" class="space-y-6">
      <!-- Barra de Filtros e Busca de Produtos -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <!-- Input de Busca -->
        <div class="relative flex-1 max-w-md">
          <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="productSearchQuery" 
            type="text" 
            placeholder="Buscar por cerveja, pomada, refrigerante..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <!-- Categorias e Alerta de Estoque -->
        <div class="flex items-center gap-3 flex-wrap">
          <div v-if="lowStockProductsCount > 0" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
            <AlertTriangle class="w-3.5 h-3.5" />
            <span>{{ lowStockProductsCount }} itens com estoque baixo</span>
          </div>

          <!-- Select Categoria Produto -->
          <select 
            v-model="productCategoryFilter"
            class="px-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
          >
            <option v-for="cat in distinctProductCategories" :key="cat" :value="cat" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
              {{ cat }}
            </option>
          </select>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM CARDS DOS PRODUTOS -->
      <div v-if="productViewMode === 'CARDS'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id"
          class="bg-white dark:bg-[#0e131d] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col justify-between group hover:border-amber-500/40 transition"
        >
          <!-- Foto do Produto -->
          <div class="relative h-44 bg-slate-100 dark:bg-white/[0.02] overflow-hidden">
            <img 
              :src="product.photoUrl || 'https://images.unsplash.com/photo-1608270192804-d54620ec4221?auto=format&fit=crop&q=80&w=600'" 
              :alt="product.name"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            
            <!-- Badges no topo da foto -->
            <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white border border-white/10">
                {{ product.category || 'Geral' }}
              </span>
            </div>

            <!-- Badge Comissão Barbeiro -->
            <div class="absolute top-2.5 right-2.5">
              <span 
                class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md border"
                :class="Number(product.commissionPercentage) > 0 ? 'bg-amber-500/90 text-slate-950 border-amber-400' : 'bg-slate-900/80 text-slate-300 border-white/10'"
              >
                {{ Number(product.commissionPercentage) > 0 ? `${product.commissionPercentage}% Comis.` : 'Sem Comis. (0%)' }}
              </span>
            </div>

            <!-- Alerta Estoque Baixo -->
            <div v-if="Number(product.stockQuantity) <= Number(product.minStockAlert || 5)" class="absolute bottom-2.5 left-2.5 right-2.5">
              <span class="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-600/90 backdrop-blur-md text-white flex items-center justify-center gap-1 shadow-md">
                <AlertTriangle class="w-3 h-3" /> Repor Estoque ({{ product.stockQuantity }} restantes)
              </span>
            </div>
          </div>

          <!-- Informações do Produto -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                {{ product.name }}
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {{ product.description || 'Produto disponível para consumo e venda rápida no balcão.' }}
              </p>
            </div>

            <!-- Dados de Preço e Estoque -->
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">Estoque:</span>
                <span class="font-bold" :class="Number(product.stockQuantity) <= Number(product.minStockAlert || 5) ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'">
                  {{ product.stockQuantity }} un.
                </span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[11px] text-slate-400">Preço de Venda:</span>
                <span class="font-black text-base text-slate-900 dark:text-white">
                  {{ formatMoney(product.salePrice) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Botões de Ação do Card -->
          <div class="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
            <div class="flex items-center gap-1">
              <button 
                @click="openEditProductModal(product)"
                class="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                title="Editar produto"
              >
                <Edit3 class="w-4 h-4" />
              </button>
              <button 
                @click="confirmDeleteProduct(product)"
                class="p-2 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                title="Remover produto"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <button 
              @click="openSellModal(product)"
              :disabled="Number(product.stockQuantity) <= 0"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag class="w-3.5 h-3.5" />
              <span>Vender</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VISUALIZAÇÃO EM TABELA / LISTA DOS PRODUTOS -->
      <div v-else class="bg-white dark:bg-[#0e131d] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] text-slate-400 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th class="px-5 py-3.5">Produto</th>
                <th class="px-5 py-3.5">Categoria</th>
                <th class="px-5 py-3.5 text-right">Estoque</th>
                <th class="px-5 py-3.5 text-right">Custo</th>
                <th class="px-5 py-3.5 text-right">Venda</th>
                <th class="px-5 py-3.5 text-right">Comissão Barbeiro</th>
                <th class="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/[0.04]">
              <tr 
                v-for="product in filteredProducts" 
                :key="product.id"
                class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
              >
                <!-- Produto com Miniatura -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <img 
                      :src="product.photoUrl || 'https://images.unsplash.com/photo-1608270192804-d54620ec4221?auto=format&fit=crop&q=80&w=200'" 
                      :alt="product.name"
                      class="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                    />
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white">{{ product.name }}</div>
                      <div class="text-[11px] text-slate-400 line-clamp-1">{{ product.description }}</div>
                    </div>
                  </div>
                </td>

                <!-- Categoria -->
                <td class="px-5 py-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                    {{ product.category || 'Geral' }}
                  </span>
                </td>

                <!-- Estoque -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-bold" :class="Number(product.stockQuantity) <= Number(product.minStockAlert || 5) ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'">
                  {{ product.stockQuantity }} un.
                </td>

                <!-- Custo -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-medium text-slate-400">
                  {{ formatMoney(product.costPrice) }}
                </td>

                <!-- Venda -->
                <td class="px-5 py-4 whitespace-nowrap text-right font-black text-sm text-slate-900 dark:text-white">
                  {{ formatMoney(product.salePrice) }}
                </td>

                <!-- Comissão Barbeiro -->
                <td class="px-5 py-4 whitespace-nowrap text-right">
                  <span 
                    class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                    :class="Number(product.commissionPercentage) > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
                  >
                    {{ Number(product.commissionPercentage) > 0 ? `${product.commissionPercentage}%` : '0% (Sem comissão)' }}
                  </span>
                </td>

                <!-- Ações -->
                <td class="px-5 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button 
                      @click="openSellModal(product)"
                      :disabled="Number(product.stockQuantity) <= 0"
                      class="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider hover:opacity-90 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Vender
                    </button>
                    <button 
                      @click="openEditProductModal(product)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                    >
                      <Edit3 class="w-4 h-4" />
                    </button>
                    <button 
                      @click="confirmDeleteProduct(product)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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
                <option value="Venda Produto" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Venda de Produto</option>
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
    <!-- MODAL 2: REPASSE PIX AO BARBEIRO (LEI 13.352)                             -->
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
                Split Lei 13.352 para {{ selectedBarberForPayout?.barberName }}
              </p>
            </div>
          </div>
          <button @click="isPayoutModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Chave Pix Destino -->
        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
            <span>Chave Pix do Profissional</span>
            <span class="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black">PIX CADASTRADO</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-black text-sm text-slate-900 dark:text-white truncate">
              {{ selectedBarberForPayout?.pixKey || 'Chave não cadastrada no perfil' }}
            </span>
            <button 
              v-if="selectedBarberForPayout?.pixKey"
              @click="copyPix(selectedBarberForPayout.pixKey)"
              class="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition cursor-pointer shrink-0"
            >
              Copiar Pix
            </button>
          </div>
        </div>

        <!-- Formulário de Pagamento -->
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Valor a Repassar (R$) *
            </label>
            <input 
              v-model.number="payoutForm.amount"
              type="number" 
              step="0.01" 
              min="0.01"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-base font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Saldo total pendente: <span class="font-bold text-slate-700 dark:text-slate-200">{{ formatMoney(selectedBarberForPayout?.pendingPayout) }}</span>
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Método de Transferência
            </label>
            <select 
              v-model="payoutForm.paymentMethod"
              class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="PIX" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Pix Direto</option>
              <option value="CASH" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Dinheiro em Espécie</option>
              <option value="TRANSFER" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Transferência Bancária / TED</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Notas ou Comprovante (Opcional)
            </label>
            <input 
              v-model="payoutForm.notes"
              type="text" 
              placeholder="Ex: TxID Pix #93821, fechamento da semana"
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
            <span>Confirmar Baixa Pix</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 3: CADASTRO / EDIÇÃO DE PRODUTO                                     -->
    <!-- ========================================================================= -->
    <div v-if="isProductModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        <!-- Topo Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
              <Package class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 dark:text-white">
                {{ isEditingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto' }}
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Cosméticos, pomadas, frigobar ou bebidas para venda no caixa
              </p>
            </div>
          </div>
          <button @click="isProductModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Formulário -->
        <div class="space-y-4">
          <!-- Nome e Categoria -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Nome do Produto *
              </label>
              <input 
                v-model="productForm.name"
                type="text" 
                placeholder="Ex: Cerveja Heineken Long Neck 330ml"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select 
                v-model="productForm.category"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="Frigobar & Bebidas" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Frigobar &amp; Bebidas Alcoólicas</option>
                <option value="Bebidas sem Álcool" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Bebidas sem Álcool / Refrigerantes</option>
                <option value="Cosméticos & Pomadas" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cosméticos, Pomadas &amp; Óleos</option>
                <option value="Acessórios & Cuidados" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Acessórios &amp; Pós-Barba</option>
                <option value="Outros" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Outros</option>
              </select>
            </div>
          </div>

          <!-- Preço de Custo, Preço de Venda, Estoque Atual e Mínimo -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Custo (R$)
              </label>
              <input 
                v-model.number="productForm.costPrice"
                type="number" 
                step="0.01" 
                min="0"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                Venda (R$) *
              </label>
              <input 
                v-model.number="productForm.salePrice"
                type="number" 
                step="0.01" 
                min="0.01"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Estoque Inicial
              </label>
              <input 
                v-model.number="productForm.stockQuantity"
                type="number" 
                min="0"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Alerta Mínimo
              </label>
              <input 
                v-model.number="productForm.minStockAlert"
                type="number" 
                min="1"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <!-- COMISSÃO DO BARBEIRO SOBRE ESTE PRODUTO (%) -->
          <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-amber-500" />
                Comissão do Barbeiro na Venda (%)
              </label>
              <span class="text-xs font-black text-amber-600 dark:text-amber-400">
                {{ productForm.commissionPercentage }}%
              </span>
            </div>
            
            <input 
              v-model.number="productForm.commissionPercentage"
              type="range" 
              min="0" 
              max="100" 
              step="5"
              class="w-full accent-amber-500 cursor-pointer"
            />

            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>0% (Bebidas/Frigobar: sem comissão)</span>
              <span>10% a 20% (Cosméticos &amp; Pomadas)</span>
            </div>
          </div>

          <!-- Foto do Produto: Upload ou Presets -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Foto do Produto
            </label>

            <!-- Foto Preview -->
            <div v-if="productForm.photoUrl" class="mb-3 relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group">
              <img :src="productForm.photoUrl" alt="Preview" class="w-full h-full object-cover" />
              <button 
                type="button" 
                @click="productForm.photoUrl = ''" 
                class="absolute inset-0 bg-slate-950/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer">
                <UploadCloud class="w-4 h-4 text-amber-500" />
                <span>Enviar Foto do Computador</span>
                <input type="file" accept="image/*" class="hidden" @change="handleProductFileUpload" />
              </label>
            </div>

            <!-- Presets Rápidos -->
            <div class="mt-3">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ou selecione uma foto pronta:</div>
              <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button 
                  v-for="preset in productPhotoPresets" 
                  :key="preset.name"
                  type="button"
                  @click="selectProductPreset(preset.url)"
                  class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-amber-500 text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap transition cursor-pointer"
                >
                  {{ preset.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Botões Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isProductModalOpen = false"
            class="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleSaveProduct"
            :disabled="saving"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>{{ isEditingProduct ? 'Salvar Alterações' : 'Cadastrar no Estoque' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 4: VENDA RÁPIDA / PDV NO BALCÃO                                     -->
    <!-- ========================================================================= -->
    <div v-if="isSellModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-scrollbar">
      <div class="bg-white dark:bg-[#0e131d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        <!-- Topo Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black">
              <ShoppingBag class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 dark:text-white">
                Venda Rápida (PDV Balcão)
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Baixa automática de estoque e comissão no caixa
              </p>
            </div>
          </div>
          <button @click="isSellModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Formulário PDV -->
        <div class="space-y-4">
          <!-- Seleção do Produto -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Selecione o Produto *
            </label>
            <select 
              v-model="sellForm.productId"
              class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <option v-for="p in products" :key="p.id" :value="p.id" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
                {{ p.name }} — {{ formatMoney(p.salePrice) }} (Estoque: {{ p.stockQuantity }})
              </option>
            </select>
          </div>

          <!-- Quantidade e Barbeiro Vendedor -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Quantidade
              </label>
              <input 
                v-model.number="sellForm.quantity"
                type="number" 
                min="1"
                :max="selectedProductForSale?.stockQuantity || 99"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Barbeiro Vendedor
              </label>
              <select 
                v-model="sellForm.barberId"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Salão direto (Sem comissão)</option>
                <option v-for="b in barbers" :key="b.id" :value="b.id" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
                  {{ b.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Forma de Pagamento e Cliente -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Forma de Pagamento
              </label>
              <select 
                v-model="sellForm.paymentMethod"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="PIX" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Pix Balcão</option>
                <option value="CREDIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Crédito</option>
                <option value="DEBIT_CARD" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Cartão de Débito</option>
                <option value="CASH" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Dinheiro em Espécie</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Cliente (Opcional)
              </label>
              <select 
                v-model="sellForm.customerId"
                class="w-full px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                <option value="" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">Consumidor Avulso</option>
                <option v-for="c in customers" :key="c.id" :value="c.id" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">
                  {{ c.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- RESUMO EM TEMPO REAL DA VENDA -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Total a Cobrar:</span>
              <span class="text-lg font-black text-slate-900 dark:text-white">
                {{ formatMoney(saleTotalAmount) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50 dark:border-white/[0.04]">
              <span class="text-slate-400">Comissão Barbeiro ({{ selectedProductForSale?.commissionPercentage || 0 }}%):</span>
              <span class="font-bold" :class="saleCommissionAmount > 0 ? 'text-amber-500' : 'text-slate-400'">
                {{ formatMoney(saleCommissionAmount) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-slate-400">Cota Retida Barbearia:</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatMoney(saleTotalAmount - saleCommissionAmount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botões Rodapé -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08]">
          <button 
            type="button" 
            @click="isSellModalOpen = false"
            class="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleConfirmSale"
            :disabled="saving"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <span>Concluir Venda no Caixa</span>
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