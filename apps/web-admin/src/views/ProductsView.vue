<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  DollarSign, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Calendar, 
  Barcode, 
  Tag, 
  Sparkles, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  Layers, 
  LayoutGrid, 
  List, 
  Percent, 
  Archive, 
  ArrowUpRight, 
  ArrowDownRight,
  SlidersHorizontal,
  Beer,
  Scissors,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Power,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Boxes
} from 'lucide-vue-next';
import { api, type Product, type Barber, type ProductBatch } from '../services/api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

// Sound feedback helper
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

// ================= ESTADO E CARREGAMENTO =================
const isLoading = ref(false);
const products = ref<Product[]>([]);
const barbers = ref<Barber[]>([]);
const searchQuery = ref('');
const selectedCategory = ref<string>('TODAS');
const stockFilter = ref<'ALL' | 'LOW' | 'ZERO' | 'EXPIRING'>('ALL');
const selectedStatusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const viewMode = ref<'CARDS' | 'LIST'>('CARDS');

// Predefined categories most common in barbershops
const baseCategories = [
  'Frigobar & Bebidas',
  'Pomadas & Finalizadores',
  'Barba & Cuidados',
  'Shampoos & Tratamentos',
  'Perfumaria & Pós-Barba',
  'Químicas & Uso Interno',
  'Acessórios & Vestuário',
];

// Dynamic categories merged with DB products categories
const availableCategories = computed(() => {
  const catSet = new Set<string>(baseCategories);
  products.value.forEach(p => {
    if (p.category && p.category.trim()) {
      catSet.add(p.category.trim());
    }
  });
  return Array.from(catSet);
});

async function loadProducts() {
  isLoading.value = true;
  try {
    const data = await api.getProducts(undefined, true);
    products.value = data;
  } catch (err: any) {
    console.error('Erro ao carregar produtos:', err);
    toast.error('Erro ao carregar produtos.');
  } finally {
    isLoading.value = false;
  }
}

async function loadBarbers() {
  try {
    barbers.value = await api.getBarbers();
  } catch (err) {
    console.error('Erro ao carregar barbeiros:', err);
  }
}

// Helper: Check if expiration date is near or past
function getExpirationStatus(dateStr?: string | null): { status: 'NORMAL' | 'NEAR' | 'EXPIRED' | 'NONE'; days: number; label: string } {
  if (!dateStr) return { status: 'NONE', days: 999, label: 'Sem validade' };
  const exp = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'EXPIRED', days: diffDays, label: `Vencido há ${Math.abs(diffDays)}d` };
  if (diffDays === 0) return { status: 'EXPIRED', days: 0, label: 'Vence hoje' };
  if (diffDays <= 30) return { status: 'NEAR', days: diffDays, label: `Vence em ${diffDays}d` };
  return { status: 'NORMAL', days: diffDays, label: `Vence em ${diffDays}d` };
}

// KPIs
const metrics = computed(() => {
  const totalItems = products.value.length;
  const activeItems = products.value.filter(p => p.active).length;
  const inactiveItems = products.value.filter(p => !p.active).length;
  const totalStockUnits = products.value.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0);
  const totalCostValue = products.value.reduce((acc, p) => acc + ((Number(p.costPrice) || 0) * (Number(p.stockQuantity) || 0)), 0);
  const totalSaleValue = products.value.reduce((acc, p) => acc + ((Number(p.salePrice) || 0) * (Number(p.stockQuantity) || 0)), 0);
  
  const lowStockCount = products.value.filter(p => Number(p.stockQuantity) > 0 && Number(p.stockQuantity) <= Number(p.minStockAlert)).length;
  const zeroStockCount = products.value.filter(p => Number(p.stockQuantity) <= 0).length;
  const expiringCount = products.value.filter(p => {
    const s = getExpirationStatus(p.expirationDate);
    return s.status === 'EXPIRED' || s.status === 'NEAR';
  }).length;

  return {
    totalItems,
    activeItems,
    inactiveItems,
    totalStockUnits,
    totalCostValue,
    totalSaleValue,
    lowStockCount,
    zeroStockCount,
    expiringCount,
    potentialProfit: totalSaleValue - totalCostValue,
  };
});

// Filtered products list
const filteredProducts = computed(() => {
  let list = [...products.value];

  // Status Filter
  if (selectedStatusFilter.value === 'ACTIVE') {
    list = list.filter(p => p.active);
  } else if (selectedStatusFilter.value === 'INACTIVE') {
    list = list.filter(p => !p.active);
  }

  // Category filter
  if (selectedCategory.value !== 'TODAS') {
    list = list.filter(p => p.category === selectedCategory.value);
  }

  // Stock status filter
  if (stockFilter.value === 'LOW') {
    list = list.filter(p => Number(p.stockQuantity) > 0 && Number(p.stockQuantity) <= Number(p.minStockAlert));
  } else if (stockFilter.value === 'ZERO') {
    list = list.filter(p => Number(p.stockQuantity) <= 0);
  } else if (stockFilter.value === 'EXPIRING') {
    list = list.filter(p => {
      const s = getExpirationStatus(p.expirationDate);
      return s.status === 'EXPIRED' || s.status === 'NEAR';
    });
  }

  // Search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.batchCode?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }

  return list;
});

// ================= DATATABLE & PAGINAÇÃO =================
type ProductSortField = 'name' | 'category' | 'stockQuantity' | 'costPrice' | 'salePrice' | 'commissionPercentage' | 'expirationDate' | 'active';
const sortField = ref<ProductSortField>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

function setSort(field: ProductSortField) {
  playPopSound();
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

const currentPage = ref(1);
const itemsPerPage = ref(10);
const pageSizeOptions = [5, 10, 20, 50];

watch([searchQuery, selectedCategory, stockFilter, selectedStatusFilter, itemsPerPage], () => {
  currentPage.value = 1;
});

const sortedProducts = computed(() => {
  const list = [...filteredProducts.value];
  return list.sort((a, b) => {
    let comparison = 0;
    switch (sortField.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '');
        break;
      case 'stockQuantity':
        comparison = (Number(a.stockQuantity) || 0) - (Number(b.stockQuantity) || 0);
        break;
      case 'costPrice':
        comparison = (Number(a.costPrice) || 0) - (Number(b.costPrice) || 0);
        break;
      case 'salePrice':
        comparison = (Number(a.salePrice) || 0) - (Number(b.salePrice) || 0);
        break;
      case 'commissionPercentage':
        comparison = (Number(a.commissionPercentage) || 0) - (Number(b.commissionPercentage) || 0);
        break;
      case 'expirationDate':
        const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : 9999999999999;
        const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : 9999999999999;
        comparison = dateA - dateB;
        break;
      case 'active':
        comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0);
        break;
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const totalPages = computed(() => Math.ceil(sortedProducts.value.length / itemsPerPage.value) || 1);

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedProducts.value.slice(start, start + itemsPerPage.value);
});

const paginationStartIndex = computed(() => {
  if (sortedProducts.value.length === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const paginationEndIndex = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, sortedProducts.value.length);
});

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    playPopSound();
    currentPage.value = page;
  }
}

const displayedPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

// Quick toggle active / paused
async function handleToggleProductActive(prod: Product) {
  playPopSound();
  try {
    const res = await api.toggleProductActive(prod.id);
    prod.active = res.active;
    toast.success(res.message);
  } catch (err: any) {
    toast.error('Erro ao alternar status do produto.');
  }
}

// ================= MODAL: CRIAR / EDITAR PRODUTO =================
const isProductModalOpen = ref(false);
const isEditing = ref(false);
const editingProductId = ref<string | null>(null);
const isSubmitting = ref(false);
const isCustomCategory = ref(false);
const customCategoryName = ref('');

const form = reactive({
  name: '',
  category: 'Frigobar & Bebidas',
  costPrice: 0,
  salePrice: 0,
  stockQuantity: 10,
  minStockAlert: 5,
  commissionPercentage: 0,
  expirationDate: '',
  batchCode: '',
  barcode: '',
  photoUrl: '',
  description: '',
});

function openCreateModal() {
  playPopSound();
  isEditing.value = false;
  editingProductId.value = null;
  isCustomCategory.value = false;
  customCategoryName.value = '';
  
  form.name = '';
  form.category = availableCategories.value[0] || 'Frigobar & Bebidas';
  form.costPrice = 0;
  form.salePrice = 0;
  form.stockQuantity = 10;
  form.minStockAlert = 5;
  form.commissionPercentage = 0;
  form.expirationDate = '';
  form.batchCode = '';
  form.barcode = '';
  form.photoUrl = '';
  form.description = '';

  isProductModalOpen.value = true;
}

function openEditModal(prod: Product) {
  playPopSound();
  isEditing.value = true;
  editingProductId.value = prod.id;
  isCustomCategory.value = false;
  customCategoryName.value = '';

  form.name = prod.name;
  form.category = prod.category || 'Frigobar & Bebidas';
  form.costPrice = Number(prod.costPrice) || 0;
  form.salePrice = Number(prod.salePrice) || 0;
  form.stockQuantity = Number(prod.stockQuantity) || 0;
  form.minStockAlert = Number(prod.minStockAlert) || 5;
  form.commissionPercentage = Number(prod.commissionPercentage) || 0;
  form.expirationDate = prod.expirationDate ? prod.expirationDate.split('T')[0] : '';
  form.batchCode = prod.batchCode || '';
  form.barcode = prod.barcode || '';
  form.photoUrl = prod.photoUrl || '';
  form.description = prod.description || '';

  isProductModalOpen.value = true;
}

// Preset photo gallery options for fast pick
const photoPresets = [
  { label: 'Cerveja Long Neck', url: 'https://images.unsplash.com/photo-1608270192804-d54620ec4221?auto=format&fit=crop&q=80&w=600' },
  { label: 'Refrigerante Lata', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600' },
  { label: 'Água Mineral', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=600' },
  { label: 'Pomada Matte', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600' },
  { label: 'Óleo para Barba', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&q=80&w=600' },
  { label: 'Shampoo Anticaspa', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=600' },
];

async function handleSaveProduct() {
  if (!form.name.trim()) {
    toast.error('Informe o nome do produto.');
    return;
  }
  if (form.salePrice <= 0) {
    toast.error('O preço de venda deve ser maior que zero.');
    return;
  }

  const finalCategory = isCustomCategory.value && customCategoryName.value.trim() 
    ? customCategoryName.value.trim() 
    : form.category;

  isSubmitting.value = true;
  try {
    const payload: Partial<Product> = {
      name: form.name.trim(),
      category: finalCategory,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      stockQuantity: Number(form.stockQuantity),
      minStockAlert: Number(form.minStockAlert),
      commissionPercentage: Number(form.commissionPercentage),
      expirationDate: form.expirationDate ? form.expirationDate : null,
      batchCode: form.batchCode.trim() || null,
      barcode: form.barcode.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
      description: form.description.trim() || null,
    };

    if (isEditing.value && editingProductId.value) {
      await api.updateProduct(editingProductId.value, payload);
      toast.success('Produto atualizado com sucesso!');
    } else {
      await api.createProduct(payload);
      toast.success('Produto cadastrado no estoque!');
    }

    isProductModalOpen.value = false;
    await loadProducts();
  } catch (err: any) {
    console.error('Erro ao salvar produto:', err);
    toast.error(err.message || 'Erro ao salvar produto.');
  } finally {
    isSubmitting.value = false;
  }
}

// ================= MODAL: ENTRADA DE LOTE / REPOSIÇÃO DE ESTOQUE (FEFO) =================
const isBatchModalOpen = ref(false);
const selectedProductForBatch = ref<Product | null>(null);
const batchForm = reactive({
  quantity: 10,
  costPrice: 0,
  expirationDate: '',
  batchCode: '',
});
const isSubmittingBatch = ref(false);

function openBatchModal(prod?: Product) {
  playPopSound();
  selectedProductForBatch.value = prod || (products.value[0] || null);
  batchForm.quantity = 10;
  batchForm.costPrice = selectedProductForBatch.value ? Number(selectedProductForBatch.value.costPrice) : 0;
  batchForm.expirationDate = '';
  batchForm.batchCode = 'LT-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  isBatchModalOpen.value = true;
}

async function handleConfirmBatchEntry() {
  if (!selectedProductForBatch.value) {
    toast.error('Selecione um produto.');
    return;
  }
  if (batchForm.quantity < 1) {
    toast.error('A quantidade deve ser de pelo menos 1 unidade.');
    return;
  }
  isSubmittingBatch.value = true;
  try {
    const res = await api.addProductBatch(selectedProductForBatch.value.id, {
      quantity: Number(batchForm.quantity),
      costPrice: Number(batchForm.costPrice),
      expirationDate: batchForm.expirationDate ? batchForm.expirationDate : null,
      batchCode: batchForm.batchCode.trim() || null,
    });
    toast.success(res.message);
    isBatchModalOpen.value = false;
    await loadProducts();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao registrar entrada de lote.');
  } finally {
    isSubmittingBatch.value = false;
  }
}

// ================= MODAL: VER HISTÓRICO DE LOTES DO PRODUTO =================
const isBatchListModalOpen = ref(false);
const inspectedProduct = ref<Product | null>(null);
const inspectedBatches = ref<ProductBatch[]>([]);
const isLoadingBatches = ref(false);

async function openBatchListModal(prod: Product) {
  playPopSound();
  inspectedProduct.value = prod;
  inspectedBatches.value = [];
  isLoadingBatches.value = true;
  isBatchListModalOpen.value = true;
  try {
    inspectedBatches.value = await api.getProductBatches(prod.id);
  } catch (err: any) {
    toast.error('Erro ao carregar lotes do produto.');
  } finally {
    isLoadingBatches.value = false;
  }
}

// ================= MODAL: CONFIRMAÇÃO DE EXCLUSÃO ESTILIZADA =================
const isDeleteModalOpen = ref(false);
const productToDelete = ref<Product | null>(null);
const isDeletingProduct = ref(false);

function openDeleteModal(prod: Product) {
  playPopSound();
  productToDelete.value = prod;
  isDeleteModalOpen.value = true;
}

async function confirmDeleteProduct() {
  if (!productToDelete.value) return;
  isDeletingProduct.value = true;
  playPopSound();
  try {
    await api.deleteProduct(productToDelete.value.id);
    toast.success('Produto desativado do catálogo.');
    isDeleteModalOpen.value = false;
    await loadProducts();
  } catch (err: any) {
    toast.error('Erro ao desativar produto.');
  } finally {
    isDeletingProduct.value = false;
  }
}

// ================= MODAL: AJUSTE RÁPIDO DE ESTOQUE (+ / -) =================
const isStockModalOpen = ref(false);
const stockModalProduct = ref<Product | null>(null);
const stockAdjustmentQty = ref<number>(1);
const stockAdjustmentType = ref<'ADD' | 'REMOVE'>('ADD');

function openStockModal(prod: Product) {
  playPopSound();
  stockModalProduct.value = prod;
  stockAdjustmentQty.value = 1;
  stockAdjustmentType.value = 'ADD';
  isStockModalOpen.value = true;
}

async function handleConfirmStockAdjustment() {
  if (!stockModalProduct.value) return;
  const current = Number(stockModalProduct.value.stockQuantity) || 0;
  const diff = Number(stockAdjustmentQty.value) || 0;
  const newStock = stockAdjustmentType.value === 'ADD' ? current + diff : current - diff;

  try {
    await api.updateProduct(stockModalProduct.value.id, {
      stockQuantity: newStock,
    });
    toast.success(`Estoque atualizado para ${newStock} unidades!`);
    isStockModalOpen.value = false;
    await loadProducts();
  } catch (err: any) {
    toast.error('Erro ao ajustar estoque.');
  }
}

// ================= MODAL: VENDA RÁPIDA / PDV NO BALCÃO =================
const isSellModalOpen = ref(false);
const sellProductId = ref<string>('');
const sellBarberId = ref<string>('');
const sellQuantity = ref<number>(1);
const sellPaymentMethod = ref<string>('PIX');
const isSubmittingSell = ref(false);

function openSellModal(defaultProductId?: string) {
  playPopSound();
  sellProductId.value = defaultProductId || (products.value[0]?.id || '');
  sellBarberId.value = '';
  sellQuantity.value = 1;
  sellPaymentMethod.value = 'PIX';
  isSellModalOpen.value = true;
}

const selectedProductForSell = computed(() => {
  return products.value.find(p => p.id === sellProductId.value);
});

const sellCalculatedTotal = computed(() => {
  if (!selectedProductForSell.value) return { total: 0, commission: 0, isNegative: false };
  const price = Number(selectedProductForSell.value.salePrice) || 0;
  const total = price * sellQuantity.value;
  const commRate = Number(selectedProductForSell.value.commissionPercentage) || 0;
  const commission = sellBarberId.value ? (total * commRate) / 100 : 0;
  const isNegative = (Number(selectedProductForSell.value.stockQuantity) - sellQuantity.value) < 0;
  return { total, commission, isNegative };
});

async function handleConfirmSell() {
  if (!sellProductId.value) {
    toast.error('Selecione o produto.');
    return;
  }
  isSubmittingSell.value = true;
  try {
    await api.sellProduct({
      productId: sellProductId.value,
      barberId: sellBarberId.value || undefined,
      quantity: sellQuantity.value,
      paymentMethod: sellPaymentMethod.value,
    });
    
    if (sellCalculatedTotal.value.isNegative) {
      toast.warning('Venda concluída! Atenção: este produto ficou com estoque zerado ou negativo.');
    } else {
      toast.success('Venda concluída e registrada no livro financeiro com baixa FEFO!');
    }
    
    isSellModalOpen.value = false;
    await loadProducts();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao registrar venda.');
  } finally {
    isSubmittingSell.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadBarbers()]);
});
</script>

<template>
  <div class="flex-1 flex flex-col p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
    
    <!-- ================= HEADER: TÍTULO, SUBTÍTULO E AÇÕES ================= -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Package class="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Produtos &amp; Estoque
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {{ metrics.totalItems }} itens ({{ metrics.activeItems }} ativos)
              </span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gestão de frigobar, cosméticos, controle de múltiplos lotes com validade (FEFO) e comissões de equipe.
            </p>
          </div>
        </div>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <!-- View Mode Switcher -->
        <div class="flex items-center rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 p-1 shadow-sm">
          <button 
            @click="playPopSound(); viewMode = 'CARDS'" 
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewMode === 'CARDS' ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Visão em Cards"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Cards</span>
          </button>

          <button 
            @click="playPopSound(); viewMode = 'LIST'" 
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewMode === 'LIST' ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Visão em Lista / Tabela"
          >
            <List class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Tabela</span>
          </button>
        </div>

        <!-- + Entrada de Lote Button -->
        <button 
          @click="openBatchModal()" 
          class="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/30 transition cursor-pointer"
          title="Dar entrada de mercadoria com lote e validade"
        >
          <Boxes class="w-4 h-4" />
          <span>+ Entrada de Lote</span>
        </button>

        <!-- Quick PDV Sell Button -->
        <button 
          @click="openSellModal()" 
          class="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition cursor-pointer"
        >
          <ShoppingBag class="w-4 h-4 text-amber-500" />
          <span>Venda Rápida / PDV</span>
        </button>

        <!-- + Novo Produto Primary CTA -->
        <button 
          @click="openCreateModal()" 
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>+ Cadastrar Produto</span>
        </button>
      </div>
    </div>

    <!-- ================= METRICS CARDS (4 COLS / 2x2 ON MOBILE) ================= -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- 1. Total Unidades em Estoque -->
      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estoque Total</span>
          <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Archive class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {{ metrics.totalStockUnits }} <span class="text-sm font-semibold text-slate-400">unid.</span>
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1 truncate">
          {{ metrics.totalItems }} itens ({{ metrics.activeItems }} ativos)
        </div>
      </div>

      <!-- 2. Valor em Estoque (Preço de Venda) -->
      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor em Prateleira</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <DollarSign class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-emerald-500 font-mono">
          R$ {{ metrics.totalSaleValue.toFixed(2).replace('.', ',') }}
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1 truncate">
          Custo: R$ {{ metrics.totalCostValue.toFixed(2).replace('.', ',') }}
        </div>
      </div>

      <!-- 3. Alertas de Estoque Baixo / Zerado -->
      <div 
        @click="stockFilter = stockFilter === 'LOW' ? 'ALL' : 'LOW'"
        class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm cursor-pointer transition hover:border-amber-500/40"
        :class="{ 'ring-2 ring-amber-500': stockFilter === 'LOW' }"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estoque Baixo / Zero</span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-2">
          {{ metrics.lowStockCount + metrics.zeroStockCount }}
          <span v-if="metrics.zeroStockCount > 0" class="text-xs px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 font-bold">
            {{ metrics.zeroStockCount }} zerados
          </span>
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Clique para filtrar reposição
        </div>
      </div>

      <!-- 4. Validade / Próximos a Vencer -->
      <div 
        @click="stockFilter = stockFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING'"
        class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm cursor-pointer transition hover:border-purple-500/40"
        :class="{ 'ring-2 ring-purple-500': stockFilter === 'EXPIRING' }"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Controle de Validade</span>
          <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Clock class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black" :class="metrics.expiringCount > 0 ? 'text-purple-400' : 'text-slate-900 dark:text-white'">
          {{ metrics.expiringCount }} <span class="text-xs font-semibold text-slate-400">em alerta</span>
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Vencem nos próximos 30 dias (FEFO)
        </div>
      </div>
    </div>

    <!-- ================= FILTERS ROW: CATEGORIAS + STATUS + BUSCA ================= -->
    <div class="space-y-3">
      <!-- Top Categories Pill Row -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button 
          @click="playPopSound(); selectedCategory = 'TODAS'"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="selectedCategory === 'TODAS' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'"
        >
          Todas as Categorias ({{ products.length }})
        </button>

        <button 
          v-for="cat in availableCategories" 
          :key="cat"
          @click="playPopSound(); selectedCategory = cat"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="selectedCategory === cat ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'"
        >
          <span>{{ cat }}</span>
          <span class="text-[10px] opacity-70">
            ({{ products.filter(p => p.category === cat).length }})
          </span>
        </button>
      </div>

      <!-- Search + Alert Status + Active/Inactive Quick Filter -->
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#121824] p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        
        <div class="flex flex-wrap items-center gap-2">
          <!-- Active/Inactive Status Selector Tabs -->
          <div class="flex items-center rounded-xl bg-slate-100 dark:bg-[#07090e] p-1 border border-slate-200/80 dark:border-white/5">
            <button 
              @click="playPopSound(); selectedStatusFilter = 'ALL'"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
              :class="selectedStatusFilter === 'ALL' ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              Todos ({{ metrics.totalItems }})
            </button>
            <button 
              @click="playPopSound(); selectedStatusFilter = 'ACTIVE'"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              :class="selectedStatusFilter === 'ACTIVE' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'"
            >
              <CheckCircle2 class="w-3 h-3" /> Ativos ({{ metrics.activeItems }})
            </button>
            <button 
              @click="playPopSound(); selectedStatusFilter = 'INACTIVE'"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              :class="selectedStatusFilter === 'INACTIVE' ? 'bg-rose-500 text-white font-black shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'"
            >
              <Power class="w-3 h-3" /> Pausados ({{ metrics.inactiveItems }})
            </button>
          </div>

          <!-- Stock Level Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button 
              @click="stockFilter = stockFilter === 'LOW' ? 'ALL' : 'LOW'"
              class="px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1"
              :class="stockFilter === 'LOW' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'text-slate-400 hover:text-amber-500 border border-transparent'"
            >
              <AlertTriangle class="w-3 h-3" /> Estoque Baixo ({{ metrics.lowStockCount }})
            </button>
            <button 
              @click="stockFilter = stockFilter === 'ZERO' ? 'ALL' : 'ZERO'"
              class="px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1"
              :class="stockFilter === 'ZERO' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'text-slate-400 hover:text-rose-500 border border-transparent'"
            >
              Zerados ({{ metrics.zeroStockCount }})
            </button>
            <button 
              @click="stockFilter = stockFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING'"
              class="px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1"
              :class="stockFilter === 'EXPIRING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-purple-400 border border-transparent'"
            >
              <Clock class="w-3 h-3" /> A Vencer ({{ metrics.expiringCount }})
            </button>
          </div>
        </div>

        <!-- Search input -->
        <div class="relative w-full lg:w-80">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por nome, código, lote..." 
            class="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>

    <!-- ================= VIEW MODE 1: CARDS VIEW ================= -->
    <div v-if="viewMode === 'CARDS'">
      <!-- Loading indicator -->
      <div v-if="isLoading" class="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#121824] rounded-3xl border border-slate-200/80 dark:border-white/10">
        <RefreshCw class="w-8 h-8 animate-spin text-amber-500" />
        <span class="text-xs font-bold">Carregando catálogo de produtos e estoque...</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredProducts.length === 0" class="p-12 text-center bg-white dark:bg-[#121824] rounded-3xl border border-slate-200/80 dark:border-white/10">
        <div class="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <Package class="w-8 h-8" />
        </div>
        <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Nenhum produto encontrado</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Nenhum item corresponde ao filtro ou busca selecionada. Cadastre um novo produto para começar.
        </p>
        <button 
          @click="openCreateModal()" 
          class="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
        >
          + Cadastrar Produto
        </button>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div 
          v-for="prod in filteredProducts" 
          :key="prod.id"
          class="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm flex flex-col justify-between transition hover:border-amber-500/30 group"
          :class="{ 'opacity-65': !prod.active }"
        >
          <div>
            <!-- Top Product Image & Category Badge -->
            <div class="relative h-44 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#07090e] mb-3 border border-slate-100 dark:border-white/5">
              <img 
                :src="prod.photoUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'" 
                :alt="prod.name"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              
              <!-- Category Pill Top-Left -->
              <div class="absolute top-2.5 left-2.5">
                <span class="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-amber-400 border border-white/10">
                  {{ prod.category }}
                </span>
              </div>

              <!-- Quick Expiration Warning Badge Top-Right (if any) -->
              <div v-if="getExpirationStatus(prod.expirationDate).status !== 'NORMAL' && getExpirationStatus(prod.expirationDate).status !== 'NONE'" class="absolute top-2.5 right-2.5">
                <span 
                  v-if="getExpirationStatus(prod.expirationDate).status === 'EXPIRED'"
                  class="text-[10px] font-black px-2 py-1 rounded-lg bg-rose-500 text-white shadow-sm flex items-center gap-1"
                >
                  <AlertTriangle class="w-3 h-3" /> VENCIDO
                </span>
                <span 
                  v-else
                  class="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1"
                >
                  <Clock class="w-3 h-3" /> {{ getExpirationStatus(prod.expirationDate).label }}
                </span>
              </div>

              <!-- Inactive Badge Overlay -->
              <div v-if="!prod.active" class="absolute bottom-2.5 left-2.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/80 text-white backdrop-blur-sm">
                  Pausado
                </span>
              </div>
            </div>

            <!-- Title & Barcode/Batch -->
            <div class="mb-3">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2">
                  {{ prod.name }}
                </h3>
                
                <!-- Quick Active Toggle Pill -->
                <button 
                  @click="handleToggleProductActive(prod)"
                  class="shrink-0 p-1 rounded-lg transition cursor-pointer"
                  :class="prod.active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-white/10'"
                  :title="prod.active ? 'Clique para pausar produto' : 'Clique para ativar produto'"
                >
                  <Power class="w-4 h-4" />
                </button>
              </div>
              
              <!-- Batch & Barcode details -->
              <div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                <span v-if="prod.barcode" class="flex items-center gap-0.5">
                  <Barcode class="w-3 h-3" /> {{ prod.barcode }}
                </span>
                <button 
                  @click="openBatchListModal(prod)"
                  class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 hover:bg-amber-500/10 text-amber-500 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Ver todos os lotes deste produto"
                >
                  <Boxes class="w-3 h-3" />
                  <span>{{ prod.activeBatchesCount || 1 }} lote(s)</span>
                </button>
              </div>
            </div>

            <!-- Stock Level Progress Bar & Badge -->
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-100 dark:border-white/5 mb-3">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-[11px] font-bold text-slate-400">Estoque Geral:</span>
                <span 
                  class="font-black font-mono text-xs"
                  :class="[
                    Number(prod.stockQuantity) <= 0 ? 'text-rose-500' :
                    Number(prod.stockQuantity) <= Number(prod.minStockAlert) ? 'text-amber-500' :
                    'text-emerald-500'
                  ]"
                >
                  {{ prod.stockQuantity }} un.
                  <span v-if="Number(prod.stockQuantity) <= 0" class="text-[10px]">(Zerado)</span>
                </span>
              </div>

              <!-- Bar indicator -->
              <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-300"
                  :class="[
                    Number(prod.stockQuantity) <= 0 ? 'bg-rose-500 w-1' :
                    Number(prod.stockQuantity) <= Number(prod.minStockAlert) ? 'bg-amber-500 w-1/3' :
                    'bg-emerald-500 w-full'
                  ]"
                ></div>
              </div>

              <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                <span>Alerta mín: {{ prod.minStockAlert }} un.</span>
                <button 
                  @click="openBatchModal(prod)"
                  class="text-emerald-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Plus class="w-3 h-3" /> Entrada Lote
                </button>
              </div>
            </div>

            <!-- Prices & Margin -->
            <div class="grid grid-cols-2 gap-2 text-xs mb-3">
              <div class="p-2 rounded-xl bg-slate-50 dark:bg-[#07090e]/60 border border-slate-100 dark:border-white/5">
                <span class="text-[10px] text-slate-400 block font-semibold">Custo</span>
                <span class="font-mono font-bold text-slate-700 dark:text-slate-300">
                  R$ {{ Number(prod.costPrice).toFixed(2).replace('.', ',') }}
                </span>
              </div>

              <div class="p-2 rounded-xl bg-slate-50 dark:bg-[#07090e]/60 border border-slate-100 dark:border-white/5">
                <span class="text-[10px] text-slate-400 block font-semibold">Venda</span>
                <span class="font-mono font-black text-slate-900 dark:text-white">
                  R$ {{ Number(prod.salePrice).toFixed(2).replace('.', ',') }}
                </span>
              </div>
            </div>

            <!-- Commission Info -->
            <div class="flex items-center justify-between text-[11px] px-1 mb-3">
              <span class="text-slate-400 font-medium">Comissão Barbeiro:</span>
              <span 
                class="font-bold font-mono"
                :class="Number(prod.commissionPercentage) > 0 ? 'text-emerald-500' : 'text-slate-400'"
              >
                {{ Number(prod.commissionPercentage) }}% 
                <span v-if="Number(prod.commissionPercentage) > 0">
                  (R$ {{ ((Number(prod.salePrice) * Number(prod.commissionPercentage)) / 100).toFixed(2).replace('.', ',') }})
                </span>
                <span v-else>(Sem comissão)</span>
              </span>
            </div>
          </div>

          <!-- Bottom Card Action Buttons -->
          <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
            <!-- Sell Button -->
            <button 
              @click="openSellModal(prod.id)"
              :disabled="!prod.active"
              class="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Vender no balcão"
            >
              <ShoppingBag class="w-3.5 h-3.5" />
              <span>Vender</span>
            </button>

            <!-- Lotes Button -->
            <button 
              @click="openBatchListModal(prod)"
              class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
              title="Inspecionar lotes e validades"
            >
              <Boxes class="w-4 h-4" />
            </button>

            <!-- Edit Button -->
            <button 
              @click="openEditModal(prod)"
              class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Editar dados"
            >
              <Edit3 class="w-4 h-4" />
            </button>

            <!-- Delete Button -->
            <button 
              @click="openDeleteModal(prod)"
              class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              title="Desativar produto"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ================= VIEW MODE 2: DATATABLE COM PAGINAÇÃO E ORDENAÇÃO ================= -->
    <div v-else class="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
      <!-- Loading indicator -->
      <div v-if="isLoading" class="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw class="w-8 h-8 animate-spin text-amber-500" />
        <span class="text-xs font-bold">Carregando catálogo de produtos...</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="sortedProducts.length === 0" class="p-12 text-center">
        <div class="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <Package class="w-7 h-7" />
        </div>
        <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Nenhum produto encontrado</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Tente ajustar os filtros de categoria, status ou o termo de busca.
        </p>
      </div>

      <!-- Datatable -->
      <div v-else class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#07090e]/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              
              <!-- Produto -->
              <th @click="setSort('name')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Produto</span>
                  <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'name' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Categoria -->
              <th @click="setSort('category')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Categoria</span>
                  <ArrowUp v-if="sortField === 'category' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'category' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Estoque -->
              <th @click="setSort('stockQuantity')" class="p-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-center gap-1.5">
                  <span>Estoque</span>
                  <ArrowUp v-if="sortField === 'stockQuantity' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'stockQuantity' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Lotes -->
              <th class="p-4 text-center">
                <span>Lotes (FEFO)</span>
              </th>

              <!-- Custo -->
              <th @click="setSort('costPrice')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Custo</span>
                  <ArrowUp v-if="sortField === 'costPrice' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'costPrice' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Venda -->
              <th @click="setSort('salePrice')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Venda</span>
                  <ArrowUp v-if="sortField === 'salePrice' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'salePrice' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Comissão Barbeiro -->
              <th @click="setSort('commissionPercentage')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Comissão</span>
                  <ArrowUp v-if="sortField === 'commissionPercentage' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'commissionPercentage' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Validade Próxima -->
              <th @click="setSort('expirationDate')" class="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1.5">
                  <span>Validade</span>
                  <ArrowUp v-if="sortField === 'expirationDate' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'expirationDate' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Status Ativo -->
              <th @click="setSort('active')" class="p-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  <ArrowUp v-if="sortField === 'active' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'active' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3.5 h-3.5 opacity-40" />
                </div>
              </th>

              <!-- Ações -->
              <th class="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-white/5 text-xs">
            <tr 
              v-for="prod in paginatedProducts" 
              :key="prod.id"
              class="hover:bg-amber-500/[0.02] transition"
              :class="{ 'opacity-60': !prod.active }"
            >
              <!-- Name & Photo -->
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <img 
                    :src="prod.photoUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100'" 
                    class="w-10 h-10 rounded-xl object-cover shrink-0" 
                  />
                  <div>
                    <div class="font-extrabold text-slate-900 dark:text-white leading-tight">
                      {{ prod.name }}
                    </div>
                    <div v-if="prod.barcode" class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Barcode class="w-3 h-3" /> {{ prod.barcode }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td class="p-4">
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {{ prod.category }}
                </span>
              </td>

              <!-- Stock Quantity & Status -->
              <td class="p-4 text-center">
                <div class="font-mono font-black" :class="Number(prod.stockQuantity) <= 0 ? 'text-rose-500' : Number(prod.stockQuantity) <= Number(prod.minStockAlert) ? 'text-amber-500' : 'text-emerald-500'">
                  {{ prod.stockQuantity }} un.
                </div>
                <div class="text-[10px] text-slate-400">
                  Mín: {{ prod.minStockAlert }}
                </div>
              </td>

              <!-- Lotes Ativos -->
              <td class="p-4 text-center">
                <button 
                  @click="openBatchListModal(prod)"
                  class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-amber-500/10 text-amber-500 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                  title="Ver lotes deste produto"
                >
                  <Boxes class="w-3 h-3" />
                  <span>{{ prod.activeBatchesCount || 1 }}</span>
                </button>
              </td>

              <!-- Cost -->
              <td class="p-4 font-mono font-semibold text-slate-500 dark:text-slate-400">
                R$ {{ Number(prod.costPrice).toFixed(2).replace('.', ',') }}
              </td>

              <!-- Sale Price -->
              <td class="p-4 font-mono font-black text-slate-900 dark:text-white">
                R$ {{ Number(prod.salePrice).toFixed(2).replace('.', ',') }}
              </td>

              <!-- Commission -->
              <td class="p-4 font-mono font-bold" :class="Number(prod.commissionPercentage) > 0 ? 'text-emerald-500' : 'text-slate-400'">
                {{ Number(prod.commissionPercentage) }}%
              </td>

              <!-- Expiration & Batch -->
              <td class="p-4">
                <div v-if="prod.expirationDate" class="text-xs">
                  <span 
                    class="font-semibold block"
                    :class="getExpirationStatus(prod.expirationDate).status === 'EXPIRED' ? 'text-rose-500 font-bold' : getExpirationStatus(prod.expirationDate).status === 'NEAR' ? 'text-amber-500 font-bold' : 'text-slate-400'"
                  >
                    {{ prod.expirationDate.split('T')[0].split('-').reverse().join('/') }}
                  </span>
                  <span v-if="prod.batchCode" class="text-[10px] text-slate-400 block truncate max-w-[120px]">
                    Lote: {{ prod.batchCode }}
                  </span>
                </div>
                <span v-else class="text-slate-400 text-[11px]">—</span>
              </td>

              <!-- Status Toggle -->
              <td class="p-4 text-center">
                <button 
                  @click="handleToggleProductActive(prod)"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer"
                  :class="prod.active ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'"
                  :title="prod.active ? 'Clique para pausar produto' : 'Clique para ativar produto'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="prod.active ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                  <span>{{ prod.active ? 'Ativo' : 'Pausado' }}</span>
                </button>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button 
                    @click="openSellModal(prod.id)"
                    :disabled="!prod.active"
                    class="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Vender item no balcão"
                  >
                    Vender
                  </button>
                  <button 
                    @click="openBatchModal(prod)"
                    class="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 font-bold text-xs transition cursor-pointer"
                    title="+ Entrada de lote"
                  >
                    + Lote
                  </button>
                  <button 
                    @click="openEditModal(prod)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button 
                    @click="openDeleteModal(prod)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= DATATABLE PAGINATION FOOTER ================= -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#07090e]/40 text-xs">
        <!-- Results counter & Page size selector -->
        <div class="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span>
            Mostrando 
            <strong class="text-slate-900 dark:text-white">{{ paginationStartIndex }}</strong> 
            a 
            <strong class="text-slate-900 dark:text-white">{{ paginationEndIndex }}</strong> 
            de 
            <strong class="text-slate-900 dark:text-white">{{ sortedProducts.length }}</strong> 
            produtos
          </span>

          <span class="text-slate-300 dark:text-white/10">|</span>

          <div class="flex items-center gap-1.5">
            <span>Exibir:</span>
            <select 
              v-model.number="itemsPerPage" 
              class="px-2 py-1 rounded-lg bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <!-- Page navigation buttons -->
        <div class="flex items-center gap-1">
          <!-- First -->
          <button 
            @click="goToPage(1)" 
            :disabled="currentPage === 1"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Primeira página"
          >
            <ChevronsLeft class="w-4 h-4" />
          </button>

          <!-- Prev -->
          <button 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage === 1"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Página anterior"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <!-- Pages -->
          <template v-for="(p, idx) in displayedPages" :key="idx">
            <span v-if="p === '...'" class="px-1.5 text-slate-400">...</span>
            <button 
              v-else 
              @click="goToPage(Number(p))"
              class="min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono"
              :class="currentPage === p ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
            >
              {{ p }}
            </button>
          </template>

          <!-- Next -->
          <button 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Próxima página"
          >
            <ChevronRight class="w-4 h-4" />
          </button>

          <!-- Last -->
          <button 
            @click="goToPage(totalPages)" 
            :disabled="currentPage === totalPages"
            class="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Última página"
          >
            <ChevronsRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: CADASTRAR / EDITAR PRODUTO ================= -->
    <div 
      v-if="isProductModalOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        
        <!-- Mobile pull pill -->
        <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Package class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                {{ isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto' }}
              </h3>
              <p class="text-xs text-slate-400">
                Preencha os dados de estoque, preço e comissão
              </p>
            </div>
          </div>
          <button 
            @click="isProductModalOpen = false" 
            class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSaveProduct" class="flex flex-col flex-1 overflow-hidden min-h-0 mt-4">
          <div class="space-y-4 overflow-y-auto flex-1 pr-1 pb-2 no-scrollbar">
          
          <!-- Name & Category -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Produto *
              </label>
              <input 
                v-model="form.name" 
                type="text" 
                placeholder="Ex: Cerveja Corona Extra 330ml / Pomada Efeito Matte 120g"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <!-- Category Selector with Custom Category Toggle -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Categoria *
                </label>
                <button 
                  type="button" 
                  @click="isCustomCategory = !isCustomCategory"
                  class="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                >
                  {{ isCustomCategory ? 'Selecionar existente' : '+ Nova categoria' }}
                </button>
              </div>

              <!-- Input for custom category -->
              <input 
                v-if="isCustomCategory"
                v-model="customCategoryName"
                type="text"
                placeholder="Digite a nova categoria..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <!-- Dropdown for existing categories -->
              <select 
                v-else
                v-model="form.category"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:[color-scheme:dark]"
              >
                <option v-for="cat in availableCategories" :key="cat" :value="cat" class="dark:bg-[#121824] dark:text-white">
                  {{ cat }}
                </option>
              </select>
            </div>

            <!-- Barcode / EAN -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código de Barras / EAN
              </label>
              <input 
                v-model="form.barcode" 
                type="text" 
                placeholder="Ex: 7891234567890"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- Prices & Commission -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Preço de Custo (R$)
              </label>
              <input 
                v-model.number="form.costPrice" 
                type="number" 
                step="0.01" 
                min="0"
                placeholder="0.00"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Preço de Venda (R$) *
              </label>
              <input 
                v-model.number="form.salePrice" 
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="15.00"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Comissão Barbeiro (%)
              </label>
              <input 
                v-model.number="form.commissionPercentage" 
                type="number" 
                step="0.5" 
                min="0"
                max="100"
                placeholder="Ex: 10"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- Stock & Alert -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade Inicial em Estoque *
              </label>
              <input 
                v-model.number="form.stockQuantity" 
                type="number" 
                step="1" 
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alerta de Estoque Mínimo
              </label>
              <input 
                v-model.number="form.minStockAlert" 
                type="number" 
                step="1" 
                min="0"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- Batch Code & Expiration Date -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número / Código do Lote Inicial
              </label>
              <input 
                v-model="form.batchCode" 
                type="text" 
                placeholder="Ex: LT-2026-X8"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Validade
              </label>
              <input 
                v-model="form.expirationDate" 
                type="date" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <!-- Photo URL & Quick Presets -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              URL da Imagem do Produto
            </label>
            <input 
              v-model="form.photoUrl" 
              type="url" 
              placeholder="https://exemplo.com/foto-produto.jpg"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            
            <!-- Quick Preset Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap mt-2">
              <span class="text-[10px] text-slate-400">Presets rápidos:</span>
              <button 
                v-for="preset in photoPresets" 
                :key="preset.label"
                type="button" 
                @click="form.photoUrl = preset.url"
                class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition cursor-pointer"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descrição / Observações
            </label>
            <textarea 
              v-model="form.description" 
              rows="2"
              placeholder="Ex: Long neck gelada / Pomada à base de água para finalização matte..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            ></textarea>
          </div>

          <!-- Profit Margin Calculation Preview -->
          <div v-if="form.salePrice > 0" class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <div>
              <span class="text-amber-500 font-bold block">Margem Bruta Estimada</span>
              <span class="text-[11px] text-slate-400">
                Lucro unitário: R$ {{ (form.salePrice - form.costPrice).toFixed(2).replace('.', ',') }}
              </span>
            </div>
            <div class="text-right">
              <span class="text-base font-black text-amber-500 font-mono">
                {{ form.costPrice > 0 ? (((form.salePrice - form.costPrice) / form.costPrice) * 100).toFixed(0) + '%' : '100%' }}
              </span>
            </div>
          </div>

          </div> <!-- end scrollable div -->

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
            <button 
              type="button" 
              @click="isProductModalOpen = false" 
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              <Check v-if="!isSubmitting" class="w-4 h-4 stroke-[3]" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Cadastrar Produto' }}</span>
            </button>
          </div>

        </form>
      </div>
    </div>

    <!-- ================= MODAL: ENTRADA DE LOTE / REPOSIÇÃO (FEFO) ================= -->
    <div 
      v-if="isBatchModalOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Boxes class="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Entrada de Estoque / Lote
              </h3>
              <p class="text-xs text-slate-400">
                Reposição de mercadoria com rastreabilidade de validade (FEFO)
              </p>
            </div>
          </div>
          <button @click="isBatchModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleConfirmBatchEntry" class="mt-4 space-y-4">
          <!-- Produto -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Produto para Reposição *
            </label>
            <select 
              v-model="selectedProductForBatch"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
            >
              <option v-for="p in products" :key="p.id" :value="p">
                {{ p.name }} (Estoque atual: {{ p.stockQuantity }} un.)
              </option>
            </select>
          </div>

          <!-- Quantidade e Custo -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Qtd. de Entrada (un.) *
              </label>
              <input 
                v-model.number="batchForm.quantity" 
                type="number" 
                min="1" 
                step="1"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custo Unitário (R$)
              </label>
              <input 
                v-model.number="batchForm.costPrice" 
                type="number" 
                step="0.01" 
                min="0"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <!-- Código do Lote & Validade -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Identificador / Código do Lote
              </label>
              <input 
                v-model="batchForm.batchCode" 
                type="text" 
                placeholder="Ex: LT-2026-04"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Validade
              </label>
              <input 
                v-model="batchForm.expirationDate" 
                type="date" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <!-- FEFO Explanatory Notice -->
          <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
            <Sparkles class="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Inteligência FEFO Ativa:</strong> Nas próximas vendas ou atendimentos com este produto, o BarblyClub consumirá primeiro os lotes mais próximos de vencer.
            </span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button 
              type="button" 
              @click="isBatchModalOpen = false" 
              class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmittingBatch"
              class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Check v-if="!isSubmittingBatch" class="w-4 h-4 stroke-[3]" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>Confirmar Entrada</span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- ================= MODAL: INSPECIONAR LOTES DO PRODUTO ================= -->
    <div 
      v-if="isBatchListModalOpen && inspectedProduct" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Lotes &amp; Validades: {{ inspectedProduct.name }}
            </h3>
            <p class="text-xs text-slate-400">
              Estoque total atual: <strong class="text-amber-500">{{ inspectedProduct.stockQuantity }} un.</strong> • Ordenados por data de vencimento (FEFO)
            </p>
          </div>
          <button @click="isBatchListModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Batches List -->
        <div class="my-4 overflow-y-auto flex-1 no-scrollbar space-y-3">
          <div v-if="isLoadingBatches" class="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw class="w-6 h-6 animate-spin text-amber-500" />
            <span class="text-xs">Carregando lotes...</span>
          </div>

          <div v-else-if="inspectedBatches.length === 0" class="py-8 text-center text-slate-400">
            <Boxes class="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-60" />
            <p class="text-xs">Nenhum lote registrado individualmente para este produto ainda.</p>
            <button 
              @click="isBatchListModalOpen = false; openBatchModal(inspectedProduct)"
              class="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              + Dar Entrada de Lote
            </button>
          </div>

          <div 
            v-else 
            v-for="batch in inspectedBatches" 
            :key="batch.id"
            class="p-4 rounded-2xl border transition"
            :class="batch.currentQuantity > 0 ? 'bg-slate-50/80 dark:bg-[#07090e]/80 border-slate-200 dark:border-white/10' : 'bg-slate-100/40 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-60'"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-extrabold text-sm text-slate-900 dark:text-white">
                    {{ batch.batchCode || 'LOTE-PADRÃO' }}
                  </span>
                  <span 
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    :class="batch.currentQuantity > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-400'"
                  >
                    {{ batch.currentQuantity > 0 ? 'Com Estoque' : 'Esgotado' }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1">
                  Entrada: {{ new Date(batch.createdAt).toLocaleDateString('pt-BR') }} • Custo unitário: R$ {{ Number(batch.costPrice).toFixed(2).replace('.', ',') }}
                </div>
              </div>

              <!-- Saldo e Validade -->
              <div class="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                <div class="text-xs">
                  <span class="text-slate-400">Saldo: </span>
                  <strong class="font-mono text-sm text-slate-900 dark:text-white">{{ batch.currentQuantity }}</strong>
                  <span class="text-slate-400"> / {{ batch.initialQuantity }} un.</span>
                </div>

                <div>
                  <span 
                    v-if="batch.expirationDate"
                    class="text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1"
                    :class="[
                      getExpirationStatus(batch.expirationDate).status === 'EXPIRED' ? 'bg-rose-500/15 text-rose-500' :
                      getExpirationStatus(batch.expirationDate).status === 'NEAR' ? 'bg-amber-500/15 text-amber-500' :
                      'bg-slate-100 dark:bg-white/5 text-slate-400'
                    ]"
                  >
                    <Clock class="w-3 h-3" />
                    <span>Validade: {{ batch.expirationDate.split('T')[0].split('-').reverse().join('/') }} ({{ getExpirationStatus(batch.expirationDate).label }})</span>
                  </span>
                  <span v-else class="text-[11px] text-slate-400 italic">Sem data de validade</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10 shrink-0">
          <button 
            @click="isBatchListModalOpen = false; openBatchModal(inspectedProduct)"
            class="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Entrada para este Produto</span>
          </button>

          <button 
            type="button" 
            @click="isBatchListModalOpen = false" 
            class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white/10 text-white font-bold text-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>

    <!-- ================= MODAL: EXCLUSÃO / DESATIVAÇÃO ESTILIZADA ================= -->
    <div 
      v-if="isDeleteModalOpen && productToDelete" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle class="w-6 h-6 stroke-[2.2]" />
        </div>

        <h3 class="text-base font-black text-slate-900 dark:text-white">
          Remover Produto?
        </h3>
        
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Deseja realmente desativar o produto <strong class="text-slate-900 dark:text-white">"{{ productToDelete.name }}"</strong> do catálogo?
        </p>

        <p class="text-[11px] text-slate-400 mt-1">
          O histórico de vendas passadas, faturamento e relatórios contábeis permanecerão intactos.
        </p>

        <div class="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100 dark:border-white/10">
          <button 
            type="button" 
            @click="isDeleteModalOpen = false" 
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          
          <button 
            type="button" 
            @click="confirmDeleteProduct"
            :disabled="isDeletingProduct"
            class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20 disabled:opacity-50"
          >
            <Trash2 v-if="!isDeletingProduct" class="w-4 h-4" />
            <RefreshCw v-else class="w-4 h-4 animate-spin" />
            <span>{{ isDeletingProduct ? 'Removendo...' : 'Sim, Remover' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ================= MODAL: AJUSTE RÁPIDO DE ESTOQUE ================= -->
    <div 
      v-if="isStockModalOpen && stockModalProduct" 
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">
            Ajustar Estoque
          </h3>
          <button @click="isStockModalOpen = false" class="text-slate-400 hover:text-white">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="my-4 space-y-3">
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-[#07090e] text-xs">
            <span class="text-slate-400 block font-semibold">Produto:</span>
            <span class="font-extrabold text-slate-900 dark:text-white block mt-0.5">{{ stockModalProduct.name }}</span>
            <span class="text-amber-500 font-mono font-bold mt-1 block">Estoque atual: {{ stockModalProduct.stockQuantity }} un.</span>
          </div>

          <!-- Type: Entry / Exit -->
          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              @click="stockAdjustmentType = 'ADD'"
              class="py-2 rounded-xl text-xs font-bold transition border cursor-pointer"
              :class="stockAdjustmentType === 'ADD' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
            >
              + Entrada (Chegada)
            </button>

            <button 
              type="button" 
              @click="stockAdjustmentType = 'REMOVE'"
              class="py-2 rounded-xl text-xs font-bold transition border cursor-pointer"
              :class="stockAdjustmentType === 'REMOVE' ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
            >
              - Saída (Perda / Ajuste)
            </button>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1">Quantidade a movimentar:</label>
            <input 
              v-model.number="stockAdjustmentQty" 
              type="number" 
              min="1" 
              step="1"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
          <button 
            type="button" 
            @click="isStockModalOpen = false" 
            class="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleConfirmStockAdjustment"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Confirmar Ajuste
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: VENDA RÁPIDA / PDV NO BALCÃO ================= -->
    <div 
      v-if="isSellModalOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        
        <!-- Mobile pull pill -->
        <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0"></div>

        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <ShoppingBag class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                Venda Rápida / PDV
              </h3>
              <p class="text-xs text-slate-400">
                Lançar venda direta de frigobar ou cosmético no balcão
              </p>
            </div>
          </div>
          <button @click="isSellModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleConfirmSell" class="flex flex-col flex-1 overflow-hidden min-h-0 mt-4">
          <div class="space-y-4 overflow-y-auto flex-1 pr-1 pb-2 no-scrollbar">
          <!-- Select Product -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Selecione o Produto *
            </label>
            <select 
              v-model="sellProductId" 
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:[color-scheme:dark]"
            >
              <option v-for="p in products" :key="p.id" :value="p.id" class="dark:bg-[#121824] dark:text-white">
                {{ p.name }} — R$ {{ Number(p.salePrice).toFixed(2).replace('.', ',') }} ({{ p.stockQuantity }} un.)
              </option>
            </select>
          </div>

          <!-- Quantity & Barber -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade *
              </label>
              <input 
                v-model.number="sellQuantity" 
                type="number" 
                min="1" 
                step="1"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barbeiro (Comissão)
              </label>
              <select 
                v-model="sellBarberId"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              >
                <option value="" class="dark:bg-[#121824] dark:text-white">Nenhum (Venda da Casa)</option>
                <option v-for="b in barbers" :key="b.id" :value="b.id" class="dark:bg-[#121824] dark:text-white">
                  {{ b.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Payment Method -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Forma de Pagamento
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                @click="sellPaymentMethod = 'PIX'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="sellPaymentMethod === 'PIX' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                ⚡ Pix
              </button>
              <button 
                type="button" 
                @click="sellPaymentMethod = 'CARTAO_DEBITO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="sellPaymentMethod === 'CARTAO_DEBITO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💳 Débito
              </button>
              <button 
                type="button" 
                @click="sellPaymentMethod = 'CARTAO_CREDITO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="sellPaymentMethod === 'CARTAO_CREDITO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💳 Crédito
              </button>
              <button 
                type="button" 
                @click="sellPaymentMethod = 'DINHEIRO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                :class="sellPaymentMethod === 'DINHEIRO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💵 Dinheiro
              </button>
            </div>
          </div>

          <!-- Total Preview & Warning -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-transparent border border-amber-500/20 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Total a Pagar:</span>
              <span class="text-base font-black text-amber-500 font-mono">
                R$ {{ sellCalculatedTotal.total.toFixed(2).replace('.', ',') }}
              </span>
            </div>
            <div v-if="sellCalculatedTotal.commission > 0" class="flex items-center justify-between text-[11px] text-emerald-500 font-semibold">
              <span>Comissão Barbeiro:</span>
              <span class="font-mono">R$ {{ sellCalculatedTotal.commission.toFixed(2).replace('.', ',') }}</span>
            </div>
            <!-- Option A Warning: Stock Zero / Negative -->
            <div v-if="sellCalculatedTotal.isNegative" class="pt-1.5 border-t border-amber-500/20 flex items-center gap-1.5 text-[11px] text-amber-500 font-bold">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
              <span>Atenção: A venda será permitida, mas o estoque ficará zerado/negativo.</span>
            </div>
          </div>

          </div> <!-- end scrollable div -->

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
            <button 
              type="button" 
              @click="isSellModalOpen = false" 
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmittingSell"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Check v-if="!isSubmittingSell" class="w-4 h-4 stroke-[3]" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmittingSell ? 'Concluindo...' : 'Concluir Venda' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

  </div>
</template>
