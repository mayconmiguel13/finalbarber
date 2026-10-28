<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import {
  ChevronsLeft,
  Power,
  Play,
  Scissors, 
  Plus, 
  Search, 
  Clock, 
  Sparkles, 
  Bot, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Tag,
  SlidersHorizontal,
  Flame,
  Camera,
  Layers,
  HelpCircle,
  LayoutGrid,
  List,
  Heart,
  User,
  MessageCircle,
  UploadCloud,
  Eye,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-vue-next';
import { api, type Service, type GalleryItem, type Barber } from '../services/api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

// ================= ABA ATIVA (SERVIÇOS vs GALERIA) =================
const activeTab = ref<'SERVICES' | 'GALLERY'>(
  (localStorage.getItem('barbly_services_tab') as 'SERVICES' | 'GALLERY') || 'SERVICES'
);

function setActiveTab(tab: 'SERVICES' | 'GALLERY') {
  playPopSound();
  activeTab.value = tab;
  localStorage.setItem('barbly_services_tab', tab);
}

// ================= MODO DE VISUALIZAÇÃO (CARDS vs LISTA) =================
const serviceViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_service_view') as 'CARDS' | 'LIST') || 'CARDS'
);

function setServiceViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  serviceViewMode.value = mode;
  localStorage.setItem('barbly_service_view', mode);
}

const galleryViewMode = ref<'CARDS' | 'LIST'>(
  (localStorage.getItem('barbly_gallery_view') as 'CARDS' | 'LIST') || 'CARDS'
);

function setGalleryViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  galleryViewMode.value = mode;
  localStorage.setItem('barbly_gallery_view', mode);
}

// ================= ESTADO GERAL =================
const services = ref<Service[]>([]);
const galleryItems = ref<GalleryItem[]>([]);
const barbers = ref<Barber[]>([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);

// Filtros da aba de Serviços
const searchQuery = ref('');
const selectedCategory = ref<string>('Todos');

// Filtros da aba de Galeria
const gallerySearchQuery = ref('');
const gallerySelectedBarber = ref<string>('ALL');
const gallerySelectedCategory = ref<string>('Todos');

// Modais de Serviço
const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const serviceToDelete = ref<Service | null>(null);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name: '',
  category: 'Cortes',
  price: 45,
  durationMinutes: 30,
  photoUrl: '',
  description: '',
  active: true,
});

// Modais da Galeria de Trabalhos
const isGalleryModalOpen = ref(false);
const isEditingGallery = ref(false);
const editingGalleryId = ref<string | null>(null);
const isDeleteGalleryModalOpen = ref(false);
const galleryItemToDelete = ref<GalleryItem | null>(null);

const galleryForm = reactive({
  title: '',
  barberId: '',
  category: 'Cortes',
  photoUrl: '',
  description: '',
  tags: 'fade,degrade,navalha',
  whatsappAiEnabled: true,
});

// Categorias predefinidas
const categories = [
  'Todos',
  'Cortes',
  'Barba',
  'Combos',
  'Químicas & Tratamentos',
  'Sobrancelha',
  'Pausados',
];

const categoryOptions = [
  { value: 'Cortes', label: 'Cortes' },
  { value: 'Barba', label: 'Barba' },
  { value: 'Combos', label: 'Combos' },
  { value: 'Químicas & Tratamentos', label: 'Químicas & Tratamentos' },
  { value: 'Sobrancelha', label: 'Sobrancelha' },
];

const durationPresets = [15, 30, 45, 60, 90];

// Sugestões de Fotos de Alta Qualidade para Serviços
const samplePhotos = [
  {
    title: 'Degradê / Fade',
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: 'Barba Terapia',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: 'Combo Cabelo + Barba',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: 'Corte Clássico / Pompadour',
    url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=600',
  },
  {
    title: 'Nevou / Platinado',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
  },
];

// Presets para Galeria de Trabalhos
const galleryPresets = [
  {
    title: 'High Fade Americano',
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'Barboterapia & Lâmina',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'Corte Social na Tesoura',
    url: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'Platinado Nevou Perolado',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'Barba Alinhada Degradê',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800',
  },
  {
    title: 'Mid Fade Texturizado',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
  },
];

// Web Audio sound effect
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// Redimensionamento e compressão inteligente de foto no navegador
function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

// ================= CARREGAMENTO DE DADOS =================
async function loadAllData() {
  loading.value = true;
  try {
    const [servicesData, galleryData, barbersData] = await Promise.all([
      api.getServices(),
      api.getGallery(),
      api.getBarbers(),
    ]);
    services.value = servicesData || [];
    galleryItems.value = galleryData || [];
    barbers.value = barbersData || [];
  } catch (err: any) {
    toast.error(err.message || 'Falha ao sincronizar dados', 'Erro de Conexão');
  } finally {
    loading.value = false;
  }
}

// ================= COMPUTED METRICS =================
const totalServices = computed(() => services.value.length);
const totalGalleryItems = computed(() => galleryItems.value.length);

const averagePrice = computed(() => {
  if (services.value.length === 0) return 0;
  const sum = services.value.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  return sum / services.value.length;
});

const averageDuration = computed(() => {
  if (services.value.length === 0) return 0;
  const sum = services.value.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);
  return Math.round(sum / services.value.length);
});

const servicesWithPhotosCount = computed(() => {
  return services.value.filter((s) => s.photoUrl && s.photoUrl.trim().length > 0).length;
});

const whatsappAiPhotosCount = computed(() => {
  return galleryItems.value.filter((g) => g.whatsappAiEnabled).length;
});

// Contagem de serviços por categoria para os chips
function countByCategory(cat: string): number {
  if (cat === 'Todos') return services.value.length;
  if (cat === 'Pausados') return services.value.filter((s) => s.active === false).length;
  return services.value.filter((s) => {
    if (cat === 'Químicas & Tratamentos') {
      return s.category === 'Químicas & Tratamentos' || s.category === 'Químicas' || s.category?.toLowerCase().includes('químic');
    }
    return s.category?.toLowerCase() === cat.toLowerCase();
  }).length;
}

// Filtro e Busca de Serviços
const filteredServices = computed(() => {
  return services.value.filter((service) => {
    const matchesCat = (() => {
      if (selectedCategory.value === 'Todos') return true;
      if (selectedCategory.value === 'Pausados') return service.active === false;
      if (selectedCategory.value === 'Químicas & Tratamentos') {
        return service.category === 'Químicas & Tratamentos' || service.category === 'Químicas' || service.category?.toLowerCase().includes('químic');
      }
      return service.category?.toLowerCase() === selectedCategory.value.toLowerCase();
    })();

    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !query || 
      service.name.toLowerCase().includes(query) || 
      (service.description && service.description.toLowerCase().includes(query)) ||
      (service.category && service.category.toLowerCase().includes(query));

    return matchesCat && matchesSearch;
  });
});

// Filtro e Busca da Galeria de Trabalhos
const filteredGalleryItems = computed(() => {
  return galleryItems.value.filter((item) => {
    // Filtro por Barbeiro
    if (gallerySelectedBarber.value !== 'ALL' && item.barberId !== gallerySelectedBarber.value) {
      return false;
    }

    // Filtro por Categoria
    if (gallerySelectedCategory.value !== 'Todos') {
      if (gallerySelectedCategory.value === 'Químicas & Tratamentos') {
        const isQuim = item.category === 'Químicas & Tratamentos' || item.category === 'Químicas' || item.category?.toLowerCase().includes('químic');
        if (!isQuim) return false;
      } else if (item.category?.toLowerCase() !== gallerySelectedCategory.value.toLowerCase()) {
        return false;
      }
    }

    // Busca de texto
    const query = gallerySearchQuery.value.toLowerCase().trim();
    if (query) {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchTags = item.tags?.toLowerCase().includes(query);
      const matchBarber = item.barberName?.toLowerCase().includes(query) || item.barberNickname?.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query);
      if (!matchTitle && !matchTags && !matchBarber && !matchDesc) return false;
    }

    return true;
  });
});


// ================= DATATABLE & PAGINAÇÃO DE SERVIÇOS =================
const currentPage = ref(1);
const itemsPerPage = ref(10);
const pageSizeOptions = [5, 10, 20, 50];

type ServiceSortField = 'name' | 'category' | 'durationMinutes' | 'price' | 'active';
const sortField = ref<ServiceSortField>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(field: ServiceSortField) {
  playPopSound();
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

watch([searchQuery, selectedCategory, itemsPerPage], () => {
  currentPage.value = 1;
});

const sortedServices = computed(() => {
  const list = [...filteredServices.value];
  return list.sort((a, b) => {
    let aVal: any = a[sortField.value];
    let bVal: any = b[sortField.value];

    if (sortField.value === 'price' || sortField.value === 'durationMinutes') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (sortField.value === 'active') {
      aVal = a.active !== false ? 1 : 0;
      bVal = b.active !== false ? 1 : 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const totalPages = computed(() => {
  const total = Math.ceil(sortedServices.value.length / itemsPerPage.value);
  return total > 0 ? total : 1;
});

const paginatedServices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedServices.value.slice(start, start + itemsPerPage.value);
});

const paginationStartIndex = computed(() => {
  if (sortedServices.value.length === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const paginationEndIndex = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, sortedServices.value.length);
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

// ================= DATATABLE & PAGINAÇÃO DE GALERIA =================
const galleryCurrentPage = ref(1);
const galleryItemsPerPage = ref(10);
const galleryPageSizeOptions = [5, 10, 20, 50];

type GallerySortField = 'title' | 'barberName' | 'category' | 'likesCount' | 'whatsappAiEnabled';
const gallerySortField = ref<GallerySortField>('title');
const gallerySortOrder = ref<'asc' | 'desc'>('asc');

function toggleGallerySort(field: GallerySortField) {
  playPopSound();
  if (gallerySortField.value === field) {
    gallerySortOrder.value = gallerySortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    gallerySortField.value = field;
    gallerySortOrder.value = 'asc';
  }
}

watch([gallerySearchQuery, gallerySelectedBarber, gallerySelectedCategory, galleryItemsPerPage], () => {
  galleryCurrentPage.value = 1;
});

const sortedGalleryItems = computed(() => {
  const list = [...filteredGalleryItems.value];
  return list.sort((a, b) => {
    let aVal: any = a[gallerySortField.value];
    let bVal: any = b[gallerySortField.value];

    if (gallerySortField.value === 'likesCount') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (gallerySortField.value === 'whatsappAiEnabled') {
      aVal = a.whatsappAiEnabled ? 1 : 0;
      bVal = b.whatsappAiEnabled ? 1 : 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return gallerySortOrder.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return gallerySortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const galleryTotalPages = computed(() => {
  const total = Math.ceil(sortedGalleryItems.value.length / galleryItemsPerPage.value);
  return total > 0 ? total : 1;
});

const paginatedGalleryItems = computed(() => {
  const start = (galleryCurrentPage.value - 1) * galleryItemsPerPage.value;
  return sortedGalleryItems.value.slice(start, start + galleryItemsPerPage.value);
});

const galleryPaginationStartIndex = computed(() => {
  if (sortedGalleryItems.value.length === 0) return 0;
  return (galleryCurrentPage.value - 1) * galleryItemsPerPage.value + 1;
});

const galleryPaginationEndIndex = computed(() => {
  return Math.min(galleryCurrentPage.value * galleryItemsPerPage.value, sortedGalleryItems.value.length);
});

function goToGalleryPage(page: number) {
  if (page >= 1 && page <= galleryTotalPages.value) {
    playPopSound();
    galleryCurrentPage.value = page;
  }
}

const galleryDisplayedPages = computed(() => {
  const total = galleryTotalPages.value;
  const current = galleryCurrentPage.value;
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

// ================= CRUD SERVIÇOS =================

async function toggleServiceStatus(service: Service) {
  playPopSound();
  try {
    const res = await api.toggleServiceActive(service.id);
    service.active = res.service.active;
    if (res.service.active) {
      toast.success(`Serviço "${service.name}" ativado com sucesso!`, 'Serviço Ativo');
    } else {
      toast.info(`Serviço "${service.name}" pausado do cardápio online e IA.`, 'Serviço Pausado');
    }
  } catch (err: any) {
    toast.error(err.message || 'Erro ao alterar status do serviço', 'Erro');
  }
}

function openCreateModal() {
  playPopSound();
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.category = 'Cortes';
  form.price = 45;
  form.durationMinutes = 35;
  form.photoUrl = '';
  form.description = '';
  form.active = true;
  isEditModalOpen.value = true;
}

function openEditModal(service: Service) {
  playPopSound();
  isEditing.value = true;
  editingId.value = service.id;
  form.name = service.name;
  form.category = service.category || 'Cortes';
  form.price = Number(service.price) || 0;
  form.durationMinutes = Number(service.durationMinutes) || 30;
  form.photoUrl = service.photoUrl || '';
  form.description = service.description || '';
  form.active = service.active !== false;
  isEditModalOpen.value = true;
}

async function handleServiceFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    form.photoUrl = compressed;
    playPopSound();
    toast.success('Foto carregada com sucesso!', 'Imagem Selecionada');
  } catch (err) {
    toast.error('Erro ao ler arquivo de foto', 'Erro');
  }
}

async function handleSaveService() {
  if (!form.name.trim()) {
    toast.error('Informe o nome do serviço para continuar.', 'Atenção');
    return;
  }
  if (form.price < 0) {
    toast.error('O valor do serviço não pode ser negativo.', 'Atenção');
    return;
  }
  if (form.durationMinutes < 5) {
    toast.error('A duração mínima deve ser de pelo menos 5 minutos.', 'Atenção');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      durationMinutes: Number(form.durationMinutes),
      photoUrl: form.photoUrl.trim() || undefined,
      description: form.description.trim() || undefined,
    };

    if (isEditing.value && editingId.value) {
      await api.updateService(editingId.value, payload);
      toast.success(`Serviço "${form.name}" atualizado com sucesso!`, 'Serviço Salvo');
    } else {
      await api.createService(payload);
      toast.success(`Serviço "${form.name}" cadastrado com sucesso!`, 'Serviço Criado');
    }

    isEditModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Ocorreu um erro ao salvar o serviço', 'Erro ao Salvar');
  } finally {
    saving.value = false;
  }
}

function promptDeleteService(service: Service) {
  playPopSound();
  serviceToDelete.value = service;
  isDeleteModalOpen.value = true;
}

async function confirmDeleteService() {
  if (!serviceToDelete.value) return;
  playPopSound();
  deleting.value = true;
  try {
    await api.deleteService(serviceToDelete.value.id);
    toast.success(`Serviço "${serviceToDelete.value.name}" removido com sucesso.`, 'Serviço Removido');
    isDeleteModalOpen.value = false;
    serviceToDelete.value = null;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Não foi possível remover este serviço.', 'Erro ao Excluir');
  } finally {
    deleting.value = false;
  }
}

// ================= CRUD GALERIA DE TRABALHOS (PORTFÓLIO & IA) =================
function openCreateGalleryModal() {
  playPopSound();
  isEditingGallery.value = false;
  editingGalleryId.value = null;
  galleryForm.title = '';
  galleryForm.barberId = barbers.value[0]?.id || '';
  galleryForm.category = 'Cortes';
  galleryForm.photoUrl = '';
  galleryForm.description = '';
  galleryForm.tags = 'fade,degrade,navalha';
  galleryForm.whatsappAiEnabled = true;
  isGalleryModalOpen.value = true;
}

function openEditGalleryModal(item: GalleryItem) {
  playPopSound();
  isEditingGallery.value = true;
  editingGalleryId.value = item.id;
  galleryForm.title = item.title;
  galleryForm.barberId = item.barberId || '';
  galleryForm.category = item.category || 'Cortes';
  galleryForm.photoUrl = item.photoUrl || '';
  galleryForm.description = item.description || '';
  galleryForm.tags = item.tags || '';
  galleryForm.whatsappAiEnabled = item.whatsappAiEnabled !== false;
  isGalleryModalOpen.value = true;
}

async function handleGalleryFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    galleryForm.photoUrl = compressed;
    playPopSound();
    toast.success('Foto do corte carregada com sucesso!', 'Imagem Pronta');
  } catch (err) {
    toast.error('Erro ao ler imagem', 'Erro');
  }
}

async function handleSaveGalleryItem() {
  if (!galleryForm.title.trim()) {
    toast.error('Informe um título para este trabalho de corte.', 'Atenção');
    return;
  }
  if (!galleryForm.photoUrl.trim()) {
    toast.error('Selecione ou envie uma foto para a galeria.', 'Foto Obrigatória');
    return;
  }

  playPopSound();
  saving.value = true;
  try {
    const payload = {
      title: galleryForm.title.trim(),
      barberId: galleryForm.barberId || null,
      category: galleryForm.category,
      photoUrl: galleryForm.photoUrl.trim(),
      description: galleryForm.description.trim() || undefined,
      tags: galleryForm.tags.trim() || undefined,
      whatsappAiEnabled: galleryForm.whatsappAiEnabled,
    };

    if (isEditingGallery.value && editingGalleryId.value) {
      await api.updateGalleryItem(editingGalleryId.value, payload);
      toast.success('Trabalho da galeria atualizado com sucesso!', 'Galeria Atualizada');
    } else {
      await api.createGalleryItem(payload);
      toast.success('Novo corte adicionado ao portfólio da barbearia!', 'Foto Adicionada');
    }

    isGalleryModalOpen.value = false;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar item na galeria', 'Erro');
  } finally {
    saving.value = false;
  }
}

function promptDeleteGalleryItem(item: GalleryItem) {
  playPopSound();
  galleryItemToDelete.value = item;
  isDeleteGalleryModalOpen.value = true;
}

async function confirmDeleteGalleryItem() {
  if (!galleryItemToDelete.value) return;
  playPopSound();
  deleting.value = true;
  try {
    await api.deleteGalleryItem(galleryItemToDelete.value.id);
    toast.success('Foto removida da galeria com sucesso.', 'Atualizado');
    isDeleteGalleryModalOpen.value = false;
    galleryItemToDelete.value = null;
    await loadAllData();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao remover foto da galeria', 'Erro');
  } finally {
    deleting.value = false;
  }
}

// ================= LIGHTBOX (VISUALIZADOR DE FOTO EM TELA CHEIA) =================
const isLightboxOpen = ref(false);
const lightboxIndex = ref(0);

const lightboxItem = computed(() => {
  if (filteredGalleryItems.value.length === 0) return null;
  return filteredGalleryItems.value[lightboxIndex.value] || null;
});

function openLightbox(item: GalleryItem) {
  playPopSound();
  const idx = filteredGalleryItems.value.findIndex(g => g.id === item.id);
  lightboxIndex.value = idx >= 0 ? idx : 0;
  isLightboxOpen.value = true;
}

function nextLightboxPhoto() {
  playPopSound();
  if (filteredGalleryItems.value.length === 0) return;
  lightboxIndex.value = (lightboxIndex.value + 1) % filteredGalleryItems.value.length;
}

function prevLightboxPhoto() {
  playPopSound();
  if (filteredGalleryItems.value.length === 0) return;
  lightboxIndex.value = (lightboxIndex.value - 1 + filteredGalleryItems.value.length) % filteredGalleryItems.value.length;
}

function closeLightbox() {
  isLightboxOpen.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (!isLightboxOpen.value) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextLightboxPhoto();
  if (e.key === 'ArrowLeft') prevLightboxPhoto();
}

onMounted(() => {
  loadAllData();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-10 space-y-5 sm:space-y-8 max-w-7xl mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
    <!-- ============================================== -->
    <!-- TOP HEADER: TITLE & GLOBAL ACTIONS             -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Catálogo &amp; Portfólio BarblyClub
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Bot class="w-3 h-3 text-emerald-500" /> Sincronizado com IA do WhatsApp
          </span>
        </div>
        <h1 class="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Serviços &amp; Galeria de Trabalhos
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Gerencie seu cardápio de preços de atendimento e o portfólio real de cortes executados por cada barbeiro da equipe.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 shrink-0">
        <button 
          @click="loadAllData" 
          class="p-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm cursor-pointer"
          title="Recarregar catálogo e galeria"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button 
          v-if="activeTab === 'SERVICES'"
          @click="openCreateModal"
          class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>+ Novo Serviço</span>
        </button>

        <button 
          v-else
          @click="openCreateGalleryModal"
          class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5"
        >
          <Camera class="w-4 h-4 stroke-[2.5]" />
          <span>+ Adicionar Foto à Galeria</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SELETOR DE ABAS PRINCIPAL (TABS)               -->
    <!-- ============================================== -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-px gap-4">
      <div class="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        <!-- Aba 1: Cardápio de Serviços -->
        <button 
          @click="setActiveTab('SERVICES')"
          type="button"
          class="pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer"
          :class="activeTab === 'SERVICES' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'"
        >
          <Scissors class="w-4 h-4" />
          <span>Cardápio de Serviços</span>
          <span 
            class="text-[10px] px-2 py-0.5 rounded-full"
            :class="activeTab === 'SERVICES' ? 'bg-amber-500 text-black font-black' : 'bg-slate-200 dark:bg-white/10 text-slate-500'"
          >
            {{ totalServices }}
          </span>
        </button>

        <!-- Aba 2: Galeria de Trabalhos & IA -->
        <button 
          @click="setActiveTab('GALLERY')"
          type="button"
          class="pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer"
          :class="activeTab === 'GALLERY' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'"
        >
          <Camera class="w-4 h-4" />
          <span>Galeria de Trabalhos &amp; IA do WhatsApp</span>
          <span 
            class="text-[10px] px-2 py-0.5 rounded-full"
            :class="activeTab === 'GALLERY' ? 'bg-amber-500 text-black font-black' : 'bg-slate-200 dark:bg-white/10 text-slate-500'"
          >
            {{ totalGalleryItems }}
          </span>
        </button>
      </div>

      <!-- Pill explicativo do WhatsApp -->
      <div class="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
        <Bot class="w-3.5 h-3.5" />
        <span>A IA envia fotos desta galeria automaticamente aos clientes</span>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- CONTEÚDO DA ABA 1: CARDÁPIO DE SERVIÇOS                        -->
    <!-- ============================================================== -->
    <div v-if="activeTab === 'SERVICES'" class="space-y-6">
      
      <!-- 4 Quick Stats Cards de Serviços -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1">
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Serviços Cadastrados</span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-slate-900 dark:text-white">{{ totalServices }}</span>
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers class="w-5 h-5" />
            </div>
          </div>
          <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Disponíveis no agendamento</span>
        </div>

        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1">
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Preço Médio</span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-slate-900 dark:text-white font-mono-num">{{ formatCurrency(averagePrice) }}</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign class="w-5 h-5" />
            </div>
          </div>
          <span class="text-[11px] text-slate-400 font-medium block">Ticket médio do cardápio</span>
        </div>

        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1">
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Tempo Médio na Cadeira</span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono-num">{{ averageDuration }} min</span>
            <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock class="w-5 h-5" />
            </div>
          </div>
          <span class="text-[11px] text-slate-400 font-medium block">Duração padrão calculada</span>
        </div>

        <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1">
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Fotos no Cardápio</span>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-black text-amber-500">{{ servicesWithPhotosCount }} / {{ totalServices }}</span>
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Camera class="w-5 h-5" />
            </div>
          </div>
          <span class="text-[11px] text-slate-400 font-medium block">Fotos ilustrativas de capa</span>
        </div>
      </div>

      <!-- Toolbar: Busca, Categorias e Alternância Cards/Lista -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <!-- Search -->
        <div class="relative flex-1 min-w-[240px]">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Buscar serviço por nome, descrição ou categoria..."
            class="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
          />
          <button v-if="searchQuery" @click="searchQuery = ''; playPopSound()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Categorias e Modo de Visualização -->
        <div class="flex items-center justify-between sm:justify-end gap-3 overflow-x-auto no-scrollbar">
          <!-- Chips de Categoria -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button 
              v-for="cat in categories" 
              :key="cat"
              @click="selectedCategory = cat; playPopSound()"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
              :class="selectedCategory === cat ? 'bg-amber-500 text-black shadow-sm font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
            >
              <span>{{ cat }}</span>
              <span class="text-[10px] ml-1 px-1.5 py-0.2 rounded-full" :class="selectedCategory === cat ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10'">
                {{ countByCategory(cat) }}
              </span>
            </button>
          </div>

          <!-- Segmented Toggle (Cards vs Lista) -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#07090e] border border-slate-200/80 dark:border-white/10 rounded-2xl shrink-0 shadow-sm">
            <button 
              @click="setServiceViewMode('CARDS')"
              type="button"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              :class="serviceViewMode === 'CARDS' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Exibir em Grade de Cards"
            >
              <LayoutGrid class="w-4 h-4" />
              <span>Cards</span>
            </button>

            <button 
              @click="setServiceViewMode('LIST')"
              type="button"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              :class="serviceViewMode === 'LIST' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Exibir em Tabela / Lista"
            >
              <List class="w-4 h-4" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW 1: CARDS DE SERVIÇOS -->
      <div v-if="serviceViewMode === 'CARDS'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="service in filteredServices" 
          :key="service.id"
          class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm hover:border-amber-500/40 hover:shadow-xl transition-all flex flex-col justify-between group"
        >
          <!-- Imagem de Capa do Serviço -->
          <div class="relative h-44 bg-slate-100 dark:bg-black/50 overflow-hidden">
            <img 
              v-if="service.photoUrl" 
              :src="service.photoUrl" 
              :alt="service.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              @error="(e: any) => e.target.style.display = 'none'"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Scissors class="w-10 h-10 stroke-[1.5]" />
              <span class="text-[11px] font-semibold">Sem foto cadastrada</span>
            </div>

            <!-- Category Badge -->
            <span class="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-amber-400 text-[10px] font-black uppercase tracking-wider border border-white/10">
              {{ service.category || 'Cortes' }}
            </span>

            <!-- Duration Badge -->
            <span class="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1 border border-white/10 font-mono-num">
              <Clock class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ service.durationMinutes }} min</span>
            </span>

            <!-- Status Badge (Ativo / Pausado) -->
            <span 
              class="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border flex items-center gap-1 shadow-sm"
              :class="service.active !== false ? 'bg-emerald-500/85 text-white border-emerald-400/40' : 'bg-amber-500/85 text-black border-amber-400/40'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="service.active !== false ? 'bg-white animate-pulse' : 'bg-black'"></span>
              {{ service.active !== false ? 'Ativo' : 'Pausado' }}
            </span>
          </div>

          <!-- Dados do Serviço -->
          <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-1">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-black text-slate-900 dark:text-white text-base leading-snug">
                  {{ service.name }}
                </h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ service.description || 'Atendimento profissional de alto padrão com produtos premium BarblyClub.' }}
              </p>
            </div>

            <!-- Preço e Ações -->
            <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Valor</span>
                <span class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono-num">
                  {{ formatCurrency(Number(service.price)) }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <button 
                  @click="toggleServiceStatus(service)"
                  class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold transition cursor-pointer"
                  :class="service.active !== false ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'"
                  :title="service.active !== false ? 'Pausar serviço (ocultar do cardápio online e IA)' : 'Ativar serviço'"
                >
                  <Power class="w-4 h-4" />
                </button>
                <button 
                  @click="openEditModal(service)"
                  class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                  title="Editar serviço"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button 
                  @click="promptDeleteService(service)"
                  class="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  title="Excluir serviço"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: LISTA / TABELA DE SERVIÇOS (DATATABLE COM PAGINAÇÃO) -->
      <div v-else-if="serviceViewMode === 'LIST'" class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm transition-colors">
        
        <!-- Datatable Top Controls (Itens por página & Contador) -->
        <div class="px-6 py-3.5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400">Exibir</span>
            <select
              v-model.number="itemsPerPage"
              class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
            >
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <span class="text-xs text-slate-500 dark:text-slate-400">serviços por página</span>
          </div>

          <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Total:</span>
            <span class="font-bold text-slate-900 dark:text-white font-mono-num">{{ sortedServices.length }}</span>
            <span>serviços</span>
            <span v-if="searchQuery || selectedCategory !== 'Todos'" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold ml-1">
              Filtro ativo
            </span>
          </div>
        </div>

        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th class="py-4 px-6 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('name')" title="Clique para ordenar por Nome">
                  <div class="flex items-center gap-1.5">
                    <span>Serviço</span>
                    <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="sortField === 'name' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('category')" title="Clique para ordenar por Categoria">
                  <div class="flex items-center gap-1.5">
                    <span>Categoria</span>
                    <ArrowUp v-if="sortField === 'category' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="sortField === 'category' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('durationMinutes')" title="Clique para ordenar por Duração">
                  <div class="flex items-center gap-1.5">
                    <span>Duração</span>
                    <ArrowUp v-if="sortField === 'durationMinutes' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="sortField === 'durationMinutes' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('price')" title="Clique para ordenar por Preço">
                  <div class="flex items-center gap-1.5">
                    <span>Preço</span>
                    <ArrowUp v-if="sortField === 'price' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="sortField === 'price' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4">Foto no Cardápio</th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('active')" title="Clique para ordenar por Status">
                  <div class="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUp v-if="sortField === 'active' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="sortField === 'active' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <!-- Empty State -->
              <tr v-if="paginatedServices.length === 0">
                <td colspan="7" class="py-12 px-6 text-center">
                  <div class="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                      <Scissors class="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum serviço encontrado</p>
                      <p class="text-xs text-slate-400 max-w-sm">Tente redefinir os filtros ou a busca para localizar seus serviços.</p>
                    </div>
                    <button
                      v-if="searchQuery || selectedCategory !== 'Todos'"
                      @click="searchQuery = ''; selectedCategory = 'Todos'; playPopSound()"
                      class="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Linhas Paginadas -->
              <tr v-for="service in paginatedServices" :key="service.id" class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10 bg-slate-100 dark:bg-black/50 shrink-0">
                      <img v-if="service.photoUrl" :src="service.photoUrl" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                        <Scissors class="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <span class="font-bold text-slate-900 dark:text-white block">{{ service.name }}</span>
                      <span class="text-[11px] text-slate-400 line-clamp-1">{{ service.description || 'Sem descrição' }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px] uppercase">
                    {{ service.category || 'Cortes' }}
                  </span>
                </td>
                <td class="py-4 px-4 font-mono-num font-bold text-slate-700 dark:text-slate-300">
                  {{ service.durationMinutes }} min
                </td>
                <td class="py-4 px-4 font-black text-amber-600 dark:text-amber-400 font-mono-num text-sm">
                  {{ formatCurrency(Number(service.price)) }}
                </td>
                <td class="py-4 px-4">
                  <span v-if="service.photoUrl" class="text-emerald-500 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 class="w-3.5 h-3.5" /> Com Foto
                  </span>
                  <span v-else class="text-slate-400 text-[11px] italic">Sem foto</span>
                </td>
                <td class="py-4 px-4">
                  <button 
                    @click="toggleServiceStatus(service)"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer"
                    :class="service.active !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:bg-slate-300/60'"
                    :title="service.active !== false ? 'Clique para pausar este serviço' : 'Clique para ativar este serviço'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="service.active !== false ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                    {{ service.active !== false ? 'Ativo' : 'Pausado' }}
                  </button>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button @click="openEditModal(service)" class="p-2 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer" title="Editar">
                      <Edit3 class="w-4 h-4" />
                    </button>
                    <button @click="promptDeleteService(service)" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer" title="Excluir">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Datatable Pagination Footer -->
        <div class="p-4 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
          <div class="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1 text-center sm:text-left">
            Mostrando <strong class="text-slate-900 dark:text-white font-mono-num">{{ paginationStartIndex }}</strong> a <strong class="text-slate-900 dark:text-white font-mono-num">{{ paginationEndIndex }}</strong> de <strong class="text-slate-900 dark:text-white font-mono-num">{{ sortedServices.length }}</strong> serviços
          </div>

          <!-- Page Navigation Buttons -->
          <div class="flex items-center gap-1.5 order-1 sm:order-2">
            <!-- Primeira Página -->
            <button
              @click="goToPage(1)"
              :disabled="currentPage === 1"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Primeira Página"
            >
              <ChevronsLeft class="w-4 h-4" />
            </button>

            <!-- Página Anterior -->
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>

            <!-- Números de Página -->
            <div class="flex items-center gap-1">
              <template v-for="(p, idx) in displayedPages" :key="idx">
                <span v-if="p === '...'" class="px-2 text-slate-400 select-none text-xs">...</span>
                <button
                  v-else
                  @click="goToPage(Number(p))"
                  class="min-w-[32px] h-8 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono-num"
                  :class="currentPage === p 
                    ? 'bg-amber-500 text-black font-black shadow-md' 
                    : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
                >
                  {{ p }}
                </button>
              </template>
            </div>

            <!-- Próxima Página -->
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Próxima Página"
            >
              <ChevronRight class="w-4 h-4" />
            </button>

            <!-- Última Página -->
            <button
              @click="goToPage(totalPages)"
              :disabled="currentPage === totalPages"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Última Página"
            >
              <ChevronsRight class="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- CONTEÚDO DA ABA 2: GALERIA DE TRABALHOS & IA DO WHATSAPP       -->
    <!-- ============================================================== -->
    <div v-else class="space-y-6">
      
      <!-- Banner Estratégico da IA -->
      <div class="relative overflow-hidden rounded-3xl p-6 border bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border-amber-500/25 dark:border-amber-500/30">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 font-black">
              <Bot class="w-6 h-6 animate-pulse" />
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Como funciona no WhatsApp da Barbearia
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {{ whatsappAiPhotosCount }} fotos prontas para envio
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-3xl leading-relaxed">
                Quando o cliente perguntar no WhatsApp: <em>"Gostaria de ver fotos de cortes do Maycon"</em> ou <em>"Tem foto de platinado?"</em>, a assistente de IA consulta este portfólio filtrando pelo barbeiro correspondente ou pelas hashtags das fotos e envia na conversa!
              </p>
            </div>
          </div>

          <button 
            @click="openCreateGalleryModal"
            class="px-5 py-2.5 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-md hover:bg-amber-400 transition cursor-pointer shrink-0"
          >
            + Adicionar Trabalho Real
          </button>
        </div>
      </div>

      <!-- Toolbar: Busca, Filtro por Barbeiro, Categoria e Alternância Cards/Lista -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <!-- Search -->
        <div class="relative flex-1 min-w-[220px]">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="gallerySearchQuery"
            type="text"
            placeholder="Buscar por corte, estilo, tag (#fade) ou barbeiro..."
            class="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
          />
          <button v-if="gallerySearchQuery" @click="gallerySearchQuery = ''; playPopSound()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Filtros de Barbeiro e Categoria -->
        <div class="flex items-center justify-between sm:justify-end gap-3 overflow-x-auto no-scrollbar">
          <!-- Filtro por Barbeiro -->
          <div class="flex items-center gap-1.5 shrink-0">
            <label class="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <User class="w-3.5 h-3.5" /> Barbeiro:
            </label>
            <select 
              v-model="gallerySelectedBarber"
              @change="playPopSound"
              class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos os Barbeiros</option>
              <option v-for="b in barbers" :key="b.id" :value="b.id">{{ b.name }} ({{ b.chair || 'Barbeiro' }})</option>
            </select>
          </div>

          <!-- Segmented Toggle (Cards vs Lista) -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#07090e] border border-slate-200/80 dark:border-white/10 rounded-2xl shrink-0 shadow-sm">
            <button 
              @click="setGalleryViewMode('CARDS')"
              type="button"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              :class="galleryViewMode === 'CARDS' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Exibir em Grade de Cards"
            >
              <LayoutGrid class="w-4 h-4" />
              <span>Cards</span>
            </button>

            <button 
              @click="setGalleryViewMode('LIST')"
              type="button"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              :class="galleryViewMode === 'LIST' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Exibir em Tabela / Lista"
            >
              <List class="w-4 h-4" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW 1: CARDS ESTILO FEED / PORTFÓLIO DA GALERIA -->
      <div v-if="galleryViewMode === 'CARDS'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="item in filteredGalleryItems" 
          :key="item.id"
          class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm hover:border-amber-500/40 hover:shadow-2xl transition-all flex flex-col justify-between group"
        >
          <!-- Foto do Trabalho em Destaque (Clique para abrir Lightbox) -->
          <div 
            @click="openLightbox(item)" 
            class="relative aspect-[4/3] bg-slate-100 dark:bg-black/50 overflow-hidden cursor-pointer group/photoContainer"
            title="Clique para ver a foto em alta resolução"
          >
            <img 
              :src="item.photoUrl" 
              :alt="item.title"
              class="w-full h-full object-cover group-hover/photoContainer:scale-105 transition-transform duration-500"
              @error="(e: any) => e.target.style.display = 'none'"
            />

            <!-- Hover Overlay de Zoom -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/photoContainer:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span class="px-4 py-2 rounded-2xl bg-black/70 text-white font-bold text-xs flex items-center gap-2 border border-white/20 shadow-xl transform -translate-y-2 group-hover/photoContainer:translate-y-0 transition-transform">
                <Maximize2 class="w-4 h-4 text-amber-400" />
                <span>Clique para Ampliar</span>
              </span>
            </div>

            <!-- Badge do Barbeiro Autor -->
            <div class="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-lg z-10">
              <div class="w-6 h-6 rounded-full overflow-hidden ring-1 ring-amber-400 bg-amber-500 text-black flex items-center justify-center font-bold text-[10px] shrink-0">
                <img v-if="item.barberAvatar" :src="item.barberAvatar" class="w-full h-full object-cover" />
                <span v-else>{{ (item.barberName || 'B').charAt(0) }}</span>
              </div>
              <span class="text-xs font-bold truncate max-w-[120px]">{{ item.barberName || 'Barbeiro da Barbearia' }}</span>
            </div>

            <!-- WhatsApp AI Badge -->
            <div 
              v-if="item.whatsappAiEnabled" 
              class="absolute top-3 right-3 px-2 py-1 rounded-xl bg-emerald-500/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md z-10"
              title="A IA do WhatsApp envia esta foto aos clientes quando pedirem para ver trabalhos"
            >
              <Bot class="w-3 h-3" /> IA Ativa
            </div>

            <!-- Botão de Ver em Tela Cheia / Ampliar -->
            <button 
              @click.stop="openLightbox(item)"
              class="absolute bottom-3 right-3 px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md text-white hover:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/10 shadow-lg z-10"
              title="Visualizar em tela cheia"
            >
              <Eye class="w-3.5 h-3.5 text-amber-400" />
              <span>Ampliar</span>
            </button>
          </div>

          <!-- Informações e Tags da IA -->
          <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h3 class="font-black text-slate-900 dark:text-white text-base leading-snug">
                  {{ item.title }}
                </h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                  {{ item.category || 'Cortes' }}
                </span>
              </div>

              <p v-if="item.description" class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ item.description }}
              </p>

              <!-- Tags da IA -->
              <div class="flex flex-wrap gap-1 pt-1">
                <span 
                  v-for="(tag, i) in (item.tags || '').split(',').map(t => t.trim()).filter(Boolean)" 
                  :key="i"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>

            <!-- Footer: Ações -->
            <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCheck class="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Ready
              </span>

              <div class="flex items-center gap-1.5">
                <button 
                  @click="openEditGalleryModal(item)"
                  class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                  title="Editar foto"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button 
                  @click="promptDeleteGalleryItem(item)"
                  class="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  title="Excluir da galeria"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: LISTA / TABELA DA GALERIA (DATATABLE COM PAGINAÇÃO) -->
      <div v-else-if="galleryViewMode === 'LIST'" class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm transition-colors">
        
        <!-- Datatable Top Controls (Itens por página & Contador) -->
        <div class="px-6 py-3.5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400">Exibir</span>
            <select
              v-model.number="galleryItemsPerPage"
              class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
            >
              <option v-for="opt in galleryPageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <span class="text-xs text-slate-500 dark:text-slate-400">fotos por página</span>
          </div>

          <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Total:</span>
            <span class="font-bold text-slate-900 dark:text-white font-mono-num">{{ sortedGalleryItems.length }}</span>
            <span>fotos</span>
            <span v-if="gallerySearchQuery || gallerySelectedCategory !== 'Todos' || gallerySelectedBarber !== 'ALL'" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold ml-1">
              Filtro ativo
            </span>
          </div>
        </div>

        <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th class="py-4 px-6 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleGallerySort('title')" title="Clique para ordenar por Título">
                  <div class="flex items-center gap-1.5">
                    <span>Foto &amp; Título</span>
                    <ArrowUp v-if="gallerySortField === 'title' && gallerySortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="gallerySortField === 'title' && gallerySortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleGallerySort('barberName')" title="Clique para ordenar por Barbeiro">
                  <div class="flex items-center gap-1.5">
                    <span>Barbeiro Autor</span>
                    <ArrowUp v-if="gallerySortField === 'barberName' && gallerySortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="gallerySortField === 'barberName' && gallerySortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleGallerySort('category')" title="Clique para ordenar por Categoria">
                  <div class="flex items-center gap-1.5">
                    <span>Estilo / Categoria</span>
                    <ArrowUp v-if="gallerySortField === 'category' && gallerySortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="gallerySortField === 'category' && gallerySortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4">Tags para IA</th>
                <th class="py-4 px-4 text-center cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleGallerySort('whatsappAiEnabled')" title="Clique para ordenar por Envio WhatsApp">
                  <div class="flex items-center justify-center gap-1.5">
                    <span>Envio WhatsApp</span>
                    <ArrowUp v-if="gallerySortField === 'whatsappAiEnabled' && gallerySortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowDown v-else-if="gallerySortField === 'whatsappAiEnabled' && gallerySortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                    <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                  </div>
                </th>
                <th class="py-4 px-4 text-center">Visualização</th>
                <th class="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <!-- Empty State -->
              <tr v-if="paginatedGalleryItems.length === 0">
                <td colspan="7" class="py-12 px-6 text-center">
                  <div class="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                      <ImageIcon class="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum trabalho na galeria encontrado</p>
                      <p class="text-xs text-slate-400 max-w-sm">Tente redefinir a busca ou cadastre novas fotos do portfólio.</p>
                    </div>
                    <button
                      v-if="gallerySearchQuery || gallerySelectedCategory !== 'Todos' || gallerySelectedBarber !== 'ALL'"
                      @click="gallerySearchQuery = ''; gallerySelectedCategory = 'Todos'; gallerySelectedBarber = 'ALL'; playPopSound()"
                      class="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Linhas Paginadas da Galeria -->
              <tr v-for="item in paginatedGalleryItems" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div 
                      @click="openLightbox(item)"
                      class="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10 bg-slate-100 dark:bg-black/50 shrink-0 cursor-pointer group/tblImg relative shadow-xs"
                      title="Clique para ampliar a foto"
                    >
                      <img :src="item.photoUrl" class="w-full h-full object-cover group-hover/tblImg:scale-110 transition duration-300" />
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover/tblImg:opacity-100 transition flex items-center justify-center text-white">
                        <Eye class="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                    <div>
                      <span 
                        @click="openLightbox(item)"
                        class="font-bold text-slate-900 dark:text-white block hover:text-amber-500 cursor-pointer transition"
                      >
                        {{ item.title }}
                      </span>
                      <span class="text-[11px] text-slate-400 line-clamp-1">{{ item.description || 'Sem descrição' }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-amber-500 text-black flex items-center justify-center font-bold text-[10px]">
                      <img v-if="item.barberAvatar" :src="item.barberAvatar" class="w-full h-full object-cover" />
                      <span v-else>{{ (item.barberName || 'B').charAt(0) }}</span>
                    </div>
                    <span class="font-bold text-slate-900 dark:text-white">{{ item.barberName || 'Geral' }}</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px] uppercase">
                    {{ item.category || 'Cortes' }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-wrap gap-1 max-w-xs">
                    <span 
                      v-for="(tag, i) in (item.tags || '').split(',').slice(0, 3)" 
                      :key="i"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                    >
                      #{{ tag.trim() }}
                    </span>
                  </div>
                </td>
                <td class="py-4 px-4 text-center">
                  <span v-if="item.whatsappAiEnabled" class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Ativo
                  </span>
                  <span v-else class="text-slate-400 text-[10px]">Inativo</span>
                </td>
                <td class="py-4 px-4 text-center">
                  <button 
                    @click="openLightbox(item)"
                    class="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-amber-500 hover:text-black text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                    title="Abrir foto em alta resolução"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    <span>Ampliar</span>
                  </button>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button @click="openLightbox(item)" class="p-2 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer" title="Visualizar Foto">
                      <Eye class="w-4 h-4" />
                    </button>
                    <button @click="openEditGalleryModal(item)" class="p-2 rounded-xl text-slate-400 hover:text-amber-500 transition cursor-pointer" title="Editar">
                      <Edit3 class="w-4 h-4" />
                    </button>
                    <button @click="promptDeleteGalleryItem(item)" class="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer" title="Excluir">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Datatable Pagination Footer (Galeria) -->
        <div class="p-4 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.01]">
          <div class="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1 text-center sm:text-left">
            Mostrando <strong class="text-slate-900 dark:text-white font-mono-num">{{ galleryPaginationStartIndex }}</strong> a <strong class="text-slate-900 dark:text-white font-mono-num">{{ galleryPaginationEndIndex }}</strong> de <strong class="text-slate-900 dark:text-white font-mono-num">{{ sortedGalleryItems.length }}</strong> fotos
          </div>

          <!-- Page Navigation Buttons -->
          <div class="flex items-center gap-1.5 order-1 sm:order-2">
            <!-- Primeira Página -->
            <button
              @click="goToGalleryPage(1)"
              :disabled="galleryCurrentPage === 1"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Primeira Página"
            >
              <ChevronsLeft class="w-4 h-4" />
            </button>

            <!-- Página Anterior -->
            <button
              @click="goToGalleryPage(galleryCurrentPage - 1)"
              :disabled="galleryCurrentPage === 1"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>

            <!-- Números de Página -->
            <div class="flex items-center gap-1">
              <template v-for="(p, idx) in galleryDisplayedPages" :key="idx">
                <span v-if="p === '...'" class="px-2 text-slate-400 select-none text-xs">...</span>
                <button
                  v-else
                  @click="goToGalleryPage(Number(p))"
                  class="min-w-[32px] h-8 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono-num"
                  :class="galleryCurrentPage === p 
                    ? 'bg-amber-500 text-black font-black shadow-md' 
                    : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'"
                >
                  {{ p }}
                </button>
              </template>
            </div>

            <!-- Próxima Página -->
            <button
              @click="goToGalleryPage(galleryCurrentPage + 1)"
              :disabled="galleryCurrentPage === galleryTotalPages"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Próxima Página"
            >
              <ChevronRight class="w-4 h-4" />
            </button>

            <!-- Última Página -->
            <button
              @click="goToGalleryPage(galleryTotalPages)"
              :disabled="galleryCurrentPage === galleryTotalPages"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Última Página"
            >
              <ChevronsRight class="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL: CADASTRAR / EDITAR SERVIÇO                              -->
    <!-- ============================================================== -->
    <div 
      v-if="isEditModalOpen" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-scrollbar"
      @click.self="isEditModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar transition-colors">
        
        <button @click="isEditModalOpen = false" class="absolute right-6 top-6 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
          <X class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-white/5 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Scissors class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {{ isEditing ? 'Editar Serviço' : 'Cadastrar Novo Serviço' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Defina o nome, valor de atendimento, tempo de cadeira e foto ilustrativa.
            </p>
          </div>
        </div>

        <form @submit.prevent="handleSaveService" class="space-y-4">
          <!-- Nome -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome do Serviço *
            </label>
            <input 
              v-model="form.name"
              type="text" 
              required
              placeholder="Ex: Degradê Navalhado com Toalha Quente"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <!-- Categoria e Preço -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Categoria
              </label>
              <select 
                v-model="form.category"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Preço (R$) *
              </label>
              <input 
                v-model.number="form.price"
                type="number" 
                step="0.5" 
                min="0"
                required
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white font-mono-num font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <!-- Duração -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Duração na Cadeira (Minutos)
              </label>
              <span class="text-xs font-bold text-amber-500 font-mono-num">{{ form.durationMinutes }} minutos</span>
            </div>
            <div class="flex gap-2">
              <button 
                v-for="d in durationPresets" 
                :key="d"
                type="button"
                @click="form.durationMinutes = d; playPopSound()"
                class="flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer"
                :class="form.durationMinutes === d ? 'bg-amber-500 text-black border-amber-500 shadow-sm' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-amber-500/40'"
              >
                {{ d }}m
              </button>
            </div>
          </div>

          <!-- Foto Ilustrativa de Capa -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Foto de Capa do Serviço
              </label>
              <span class="text-[10px] text-slate-400">Exibida no cardápio online</span>
            </div>

            <div class="flex gap-2">
              <input 
                v-model="form.photoUrl"
                type="url" 
                placeholder="Cole a URL da foto ou faça upload..."
                class="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <label class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <UploadCloud class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Upload</span>
                <input type="file" accept="image/*" class="hidden" @change="handleServiceFileUpload" />
              </label>
            </div>

            <!-- Sugestões de Fotos Rápidas -->
            <div class="flex items-center gap-2 pt-1">
              <span class="text-[10px] text-slate-400 font-bold">Sugestões:</span>
              <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button 
                  v-for="(photo, idx) in samplePhotos" 
                  :key="idx"
                  @click="form.photoUrl = photo.url; playPopSound()"
                  type="button"
                  class="w-7 h-7 rounded-lg overflow-hidden ring-1 transition cursor-pointer shrink-0"
                  :class="form.photoUrl === photo.url ? 'ring-2 ring-amber-500 scale-110 shadow-sm' : 'ring-white/10 hover:ring-white/30'"
                  :title="photo.title"
                >
                  <img :src="photo.url" class="w-full h-full object-cover" />
                </button>
              </div>
            </div>
          </div>

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Descrição do Serviço
            </label>
            <textarea 
              v-model="form.description"
              rows="2"
              placeholder="Ex: Finalização com toalha quente, navalha descartável e loção pós-barba importada."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
            ></textarea>
          </div>

          <!-- Status Ativo / Pausado -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">Status do Serviço</span>
              <span class="text-[11px] text-slate-400">Serviços pausados não aparecem no cardápio online nem na IA do WhatsApp</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="form.active" class="sr-only peer" />
              <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <!-- Ações -->
          <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <button 
              type="button"
              @click="isEditModalOpen = false"
              class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="saving"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span>{{ isEditing ? 'Salvar Alterações' : 'Cadastrar Serviço' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL: CADASTRAR / EDITAR FOTO DA GALERIA & IA DO WHATSAPP     -->
    <!-- ============================================================== -->
    <div 
      v-if="isGalleryModalOpen" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-scrollbar"
      @click.self="isGalleryModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar transition-colors">
        
        <button @click="isGalleryModalOpen = false" class="absolute right-6 top-6 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
          <X class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-white/5 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Camera class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {{ isEditingGallery ? 'Editar Trabalho da Galeria' : 'Novo Trabalho no Portfólio' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Vincule o corte ao Barbeiro autor e defina tags para a IA do WhatsApp sugerir aos clientes.
            </p>
          </div>
        </div>

        <form @submit.prevent="handleSaveGalleryItem" class="space-y-4">
          <!-- Título do Trabalho -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Título do Trabalho de Corte *
            </label>
            <input 
              v-model="galleryForm.title"
              type="text" 
              required
              placeholder="Ex: Degradê High Fade Navalhado com Risco"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <!-- Barbeiro Autor e Categoria -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Barbeiro Autor (Profissional)
              </label>
              <select 
                v-model="galleryForm.barberId"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Geral da Barbearia</option>
                <option v-for="b in barbers" :key="b.id" :value="b.id">{{ b.name }} ({{ b.chair || 'Barbeiro' }})</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Estilo / Categoria
              </label>
              <select 
                v-model="galleryForm.category"
                class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <!-- Tags para a IA do WhatsApp -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Bot class="w-3.5 h-3.5 text-emerald-500" />
              <span>Tags para Busca da IA no WhatsApp (Separadas por vírgula)</span>
            </label>
            <input 
              v-model="galleryForm.tags"
              type="text" 
              placeholder="Ex: fade, degrade, navalhado, americano, maycon"
              class="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
            />
            <span class="text-[11px] text-slate-400 block">A IA usa essas palavras-chave para enviar a foto quando o cliente pedir sugestões no WhatsApp.</span>
          </div>

          <!-- Foto do Trabalho -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Foto Real do Trabalho *
              </label>
              <span class="text-[10px] text-slate-400">Resolução nítida para encantar</span>
            </div>

            <div class="flex gap-2">
              <input 
                v-model="galleryForm.photoUrl"
                type="url" 
                required
                placeholder="Cole a URL da foto ou selecione do computador..."
                class="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <label class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <UploadCloud class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Upload</span>
                <input type="file" accept="image/*" class="hidden" @change="handleGalleryFileUpload" />
              </label>
            </div>

            <!-- Presets da Galeria -->
            <div class="flex items-center gap-2 pt-1">
              <span class="text-[10px] text-slate-400 font-bold">Modelos:</span>
              <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button 
                  v-for="(photo, idx) in galleryPresets" 
                  :key="idx"
                  @click="galleryForm.photoUrl = photo.url; playPopSound()"
                  type="button"
                  class="w-8 h-8 rounded-lg overflow-hidden ring-1 transition cursor-pointer shrink-0"
                  :class="galleryForm.photoUrl === photo.url ? 'ring-2 ring-amber-500 scale-110 shadow-sm' : 'ring-white/10 hover:ring-white/30'"
                  :title="photo.title"
                >
                  <img :src="photo.url" class="w-full h-full object-cover" />
                </button>
              </div>
            </div>
          </div>

          <!-- Ativar para IA do WhatsApp -->
          <div 
            @click="galleryForm.whatsappAiEnabled = !galleryForm.whatsappAiEnabled; playPopSound()"
            class="p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3.5"
            :class="[
              galleryForm.whatsappAiEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-500/15' 
                : 'bg-slate-50 dark:bg-[#07090e] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            ]"
          >
            <div 
              class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition"
              :class="galleryForm.whatsappAiEnabled ? 'bg-emerald-500 text-white shadow-sm' : 'border border-slate-300 dark:border-white/20 text-transparent'"
            >
              <Check class="w-4 h-4 stroke-[3]" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm" :class="galleryForm.whatsappAiEnabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'">
                <Bot class="w-4 h-4" />
                <span>Permitir envio automático pela IA do WhatsApp</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Quando o cliente pedir fotos de cortes do profissional no WhatsApp, a IA pode enviar essa foto diretamente.
              </p>
            </div>
          </div>

          <!-- Ações -->
          <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <button 
              type="button"
              @click="isGalleryModalOpen = false"
              class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="saving"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span>{{ isEditingGallery ? 'Salvar Alterações' : 'Adicionar ao Portfólio' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL DE EXCLUSÃO DE SERVIÇO                                   -->
    <!-- ============================================================== -->
    <div 
      v-if="isDeleteModalOpen && serviceToDelete" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-scrollbar"
      @click.self="isDeleteModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center transition-colors">
        <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50 dark:ring-rose-950/30">
          <Trash2 class="w-8 h-8 stroke-[2]" />
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Remover Serviço?</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Tem certeza que deseja remover <strong>{{ serviceToDelete.name }}</strong> do cardápio da barbearia?
        </p>
        <div class="mt-6 flex items-center justify-center gap-3">
          <button @click="isDeleteModalOpen = false" class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer">
            Cancelar
          </button>
          <button :disabled="deleting" @click="confirmDeleteService" class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
            <span>Sim, Remover</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL DE EXCLUSÃO DA GALERIA                                   -->
    <!-- ============================================================== -->
    <div 
      v-if="isDeleteGalleryModalOpen && galleryItemToDelete" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-scrollbar"
      @click.self="isDeleteGalleryModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center transition-colors">
        <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50 dark:ring-rose-950/30">
          <Trash2 class="w-8 h-8 stroke-[2]" />
        </div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Remover Foto da Galeria?</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Tem certeza que deseja remover a foto <strong>{{ galleryItemToDelete.title }}</strong>? A IA do WhatsApp não enviará mais esta imagem para clientes.
        </p>
        <div class="mt-6 flex items-center justify-center gap-3">
          <button @click="isDeleteGalleryModalOpen = false" class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer">
            Cancelar
          </button>
          <button :disabled="deleting" @click="confirmDeleteGalleryItem" class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
            <span>Sim, Remover</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- LIGHTBOX MODAL: VISUALIZAÇÃO EM TELA CHEIA DA FOTO DO CORTE    -->
    <!-- ============================================================== -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="isLightboxOpen && lightboxItem" 
        class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 no-scrollbar"
        @click.self="closeLightbox"
      >
        <!-- Modal Container -->
        <div class="relative w-full max-w-5xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[92vh] no-scrollbar">
          
          <!-- Lado Esquerdo: Foto em Alta Resolução com Navegação Anterior/Próxima -->
          <div class="relative flex-1 bg-black flex items-center justify-center min-h-[350px] lg:min-h-[550px] overflow-hidden select-none">
            <img 
              :src="lightboxItem.photoUrl" 
              :alt="lightboxItem.title"
              class="max-h-[85vh] w-full object-contain"
            />

            <!-- Botão Foto Anterior -->
            <button 
              v-if="filteredGalleryItems.length > 1"
              @click.stop="prevLightboxPhoto"
              class="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-amber-500 text-white hover:text-black transition flex items-center justify-center border border-white/20 cursor-pointer shadow-xl z-20"
              title="Foto anterior (Seta esquerda)"
            >
              <ChevronLeft class="w-6 h-6 stroke-[2.5]" />
            </button>

            <!-- Botão Próxima Foto -->
            <button 
              v-if="filteredGalleryItems.length > 1"
              @click.stop="nextLightboxPhoto"
              class="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-amber-500 text-white hover:text-black transition flex items-center justify-center border border-white/20 cursor-pointer shadow-xl z-20"
              title="Próxima foto (Seta direita)"
            >
              <ChevronRight class="w-6 h-6 stroke-[2.5]" />
            </button>

            <!-- Contador de Fotos -->
            <div class="absolute bottom-4 left-4 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/15 font-mono-num z-10">
              {{ lightboxIndex + 1 }} de {{ filteredGalleryItems.length }}
            </div>
          </div>

          <!-- Lado Direito: Informações e Metadados do Trabalho -->
          <div class="w-full lg:w-96 p-6 sm:p-7 flex flex-col justify-between space-y-6 overflow-y-auto no-scrollbar border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e131d]">
            <div class="space-y-5">
              <!-- Top Header com Fechar -->
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Visualização em Alta Definição
                </span>
                <button 
                  @click="closeLightbox"
                  class="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <!-- Cartão do Barbeiro Autor -->
              <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10">
                <div class="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-amber-500/40 bg-amber-500 text-black flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                  <img v-if="lightboxItem.barberAvatar" :src="lightboxItem.barberAvatar" class="w-full h-full object-cover" />
                  <span v-else>{{ (lightboxItem.barberName || 'B').charAt(0) }}</span>
                </div>
                <div class="min-w-0">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block">Barbeiro que Executou</span>
                  <h4 class="text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                    {{ lightboxItem.barberName || 'Profissional da Barbearia' }}
                  </h4>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate block">{{ lightboxItem.barberChair || 'Equipe BarblyClub' }}</span>
                </div>
              </div>

              <!-- Título e Categoria -->
              <div class="space-y-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                    {{ lightboxItem.category || 'Cortes' }}
                  </span>
                  <span v-if="lightboxItem.whatsappAiEnabled" class="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Bot class="w-3 h-3" /> IA WhatsApp Ativa
                  </span>
                </div>
                <h3 class="text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {{ lightboxItem.title }}
                </h3>
                <p v-if="lightboxItem.description" class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {{ lightboxItem.description }}
                </p>
              </div>

              <!-- Tags da IA do WhatsApp -->
              <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Bot class="w-3.5 h-3.5 text-emerald-500" />
                  Hashtags de Busca da IA:
                </span>
                <div class="flex flex-wrap gap-1.5">
                  <span 
                    v-for="(tag, i) in (lightboxItem.tags || '').split(',').map(t => t.trim()).filter(Boolean)" 
                    :key="i"
                    class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Rodapé com Ações -->
            <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
              <button 
                @click="openEditGalleryModal(lightboxItem); closeLightbox()"
                class="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 class="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button 
                @click="closeLightbox"
                class="py-2.5 px-5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider hover:bg-amber-400 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>

        </div>
      </div>
    </transition>

  </div>
</template>
