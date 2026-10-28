<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Users, 
  Crown, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  UserPlus, 
  RefreshCw, 
  Loader2, 
  MessageCircle, 
  Mail, 
  Phone, 
  Pencil, 
  Trash2, 
  X, 
  Check, 
  Scissors, 
  Clock, 
  LayoutGrid, 
  List, 
  ExternalLink,
  Coffee,
  Calendar,
  AlertCircle,
  Camera,
  UploadCloud,
  CheckCircle2,
  User,
  Cake,
  Beer,
  Gift,
  ShoppingBag,
  Eye,
  Send,
  Copy,
  ChevronRight,
  Star,
  Instagram,
  ArrowUpRight,
  SlidersHorizontal,
  History,
  FileText
} from 'lucide-vue-next';
import { api, type Customer, type Customer360Response } from '../services/api';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const toast = useToastStore();

// ================= ESTADO PRINCIPAL =================
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const savingQuickPhoto = ref(false);
const customers = ref<Customer[]>([]);
const searchQuery = ref('');
const activeFilter = ref<'ALL' | 'VIP' | 'RISK' | 'BIRTHDAYS' | 'RECENT'>('ALL');

// Alternância entre Cards e Tabela (persistente)
const viewMode = ref<'CARDS' | 'TABLE'>(
  (localStorage.getItem('barbly_clients_view') as 'CARDS' | 'TABLE') || 'CARDS'
);

function setViewMode(mode: 'CARDS' | 'TABLE') {
  playSound('click');
  viewMode.value = mode;
  localStorage.setItem('barbly_clients_view', mode);
}

// ================= PRESETS DE ESTILO E FOTOS =================
const stylePreferencePresets = [
  'Degradê Navalhado',
  'Fade Médio',
  'Tesoura Clássica',
  'Barba Terapia Alinhada',
  'Sobrancelha na Lâmina',
  'Pigmentação',
  'Cerveja Gelada',
  'Café Espresso',
  'Atendimento Silencioso',
  'Gosta de Conversar',
  'Pontualidade Britânica',
  'Produtos Barba / Óleo',
];

const customerAvatarPresets = [
  { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', label: 'Executivo' },
  { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', label: 'Fade & Degradê' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', label: 'Barba Alinhada' },
  { url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', label: 'VIP Platinum' },
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', label: 'Estilo Jovem' },
  { url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80', label: 'Social Clássico' },
  { url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80', label: 'Casual Urbano' },
  { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80', label: 'Modern Fade' },
];

// Feedback Sonoro
function playSound(type: 'success' | 'click' | 'delete') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'success') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'delete') {
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {}
}

// Compressão de imagem no navegador
function compressImage(file: File, maxWidth = 500, maxHeight = 500, quality = 0.85): Promise<string> {
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

// ================= MODAL RÁPIDO DE FOTO =================
const isQuickPhotoModalOpen = ref(false);
const quickPhotoCustomer = ref<Customer | null>(null);
const quickPhotoUrl = ref('');
const quickPhotoTab = ref<'upload' | 'presets' | 'url'>('upload');

function openQuickPhotoModal(customer: Customer) {
  playSound('click');
  quickPhotoCustomer.value = customer;
  quickPhotoUrl.value = customer.avatarUrl || '';
  quickPhotoTab.value = 'upload';
  isQuickPhotoModalOpen.value = true;
}

async function handleSaveQuickPhoto() {
  if (!quickPhotoCustomer.value) return;
  playSound('click');
  savingQuickPhoto.value = true;
  try {
    await api.updateCustomer(quickPhotoCustomer.value.id, {
      avatarUrl: quickPhotoUrl.value.trim() || undefined,
    });
    quickPhotoCustomer.value.avatarUrl = quickPhotoUrl.value.trim();
    if (dossierCustomer.value && dossierCustomer.value.id === quickPhotoCustomer.value.id) {
      dossierCustomer.value.avatarUrl = quickPhotoUrl.value.trim();
    }
    toast.success('Foto de perfil do cliente atualizada com sucesso!', 'Foto Atualizada');
    isQuickPhotoModalOpen.value = false;
    await loadCustomers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao atualizar foto do cliente', 'Erro');
  } finally {
    savingQuickPhoto.value = false;
  }
}

async function handleQuickPhotoUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    quickPhotoUrl.value = compressed;
    playSound('success');
    toast.success('Foto carregada com sucesso!', 'Pronta para Salvar');
  } catch (err) {
    toast.error('Erro ao processar imagem. Tente outro arquivo.', 'Falha no Upload');
  }
}

// ================= FORM CADASTRO / EDIÇÃO =================
const showModal = ref(false);
const isEditing = ref(false);
const editingCustomerId = ref<string | null>(null);

const form = ref({
  name: '',
  phone: '',
  email: '',
  birthDate: '',
  instagram: '',
  avatarUrl: '',
  notes: '',
  preferences: [] as string[],
  isVipMember: false,
});

function toggleFormPreference(tag: string) {
  playSound('click');
  const index = form.value.preferences.indexOf(tag);
  if (index >= 0) {
    form.value.preferences.splice(index, 1);
  } else {
    form.value.preferences.push(tag);
  }
}

async function handleFormFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    form.value.avatarUrl = compressed;
    playSound('success');
    toast.success('Foto carregada com sucesso!', 'Imagem Selecionada');
  } catch (err) {
    toast.error('Erro ao ler arquivo de foto', 'Erro');
  }
}

function maskPhoneInput(e: Event) {
  const input = e.target as HTMLInputElement;
  let val = input.value.replace(/\D/g, '');
  if (val.length > 11) val = val.slice(0, 11);

  if (val.length > 6) {
    val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
  } else if (val.length > 2) {
    val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
  } else if (val.length > 0) {
    val = `(${val}`;
  }
  form.value.phone = val;
}

function maskBirthDateInput(e: Event) {
  const input = e.target as HTMLInputElement;
  let val = input.value.replace(/\D/g, '');
  if (val.length > 4) val = val.slice(0, 4);

  if (val.length > 2) {
    val = `${val.slice(0, 2)}/${val.slice(2)}`;
  }
  form.value.birthDate = val;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    const d = digits.slice(2);
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatCurrency(val: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLastVisit(customer: Customer): string {
  if (!customer.lastAppointment) return 'Sem visitas ainda';
  if (customer.daysSinceLastVisit === null) return 'Data recente';
  if (customer.daysSinceLastVisit === 0) return 'Hoje';
  if (customer.daysSinceLastVisit === 1) return 'Ontem';
  return `Há ${customer.daysSinceLastVisit} dias`;
}

function formatOrigin(origin?: string): { label: string; icon: string } {
  switch (origin) {
    case 'WHATSAPP_AI':
      return { label: 'WhatsApp IA', icon: '🤖' };
    case 'PWA_WEB':
      return { label: 'Agendamento Web', icon: '🌐' };
    case 'COUNTER_WALKIN':
      return { label: 'Balcão / Recepção', icon: '💈' };
    default:
      return { label: 'Balcão Barbly', icon: '💈' };
  }
}

function formatStatus(status?: string): { label: string; badgeClass: string } {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Concluído', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    case 'CONFIRMED':
      return { label: 'Confirmado', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    case 'IN_PROGRESS':
      return { label: 'Em Cadeira', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    case 'CANCELLED':
      return { label: 'Cancelado', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
    case 'NO_SHOW':
      return { label: 'Não Compareceu', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
    case 'PENDING_PAYMENT':
      return { label: 'Aguardando Pagamento', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    default:
      return { label: status || 'Agendado', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
  }
}

// Fetch Customers
async function loadCustomers() {
  loading.value = true;
  try {
    const data = await api.getCustomers();
    customers.value = data || [];
  } catch (err: any) {
    toast.error(err.message || 'Falha ao carregar lista de clientes');
  } finally {
    loading.value = false;
  }
}

// ================= COMPUTED METRICS =================
const totalCount = computed(() => customers.value.length);

const vipCount = computed(() => {
  return customers.value.filter((c) => c.isVipMember).length;
});

const vipPercentage = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((vipCount.value / totalCount.value) * 100);
});

const atRiskCount = computed(() => {
  return customers.value.filter((c) => {
    return c.isAtRisk || (c.daysSinceLastVisit !== null && c.daysSinceLastVisit >= 30);
  }).length;
});

const birthdayCount = computed(() => {
  return customers.value.filter((c) => c.isBirthdayMonth).length;
});

const birthdayTodayCount = computed(() => {
  return customers.value.filter((c) => c.isBirthdayToday).length;
});

const averageLtv = computed(() => {
  if (totalCount.value === 0) return 0;
  const sum = customers.value.reduce((acc, c) => acc + (Number(c.totalSpent) || 0), 0);
  return sum / totalCount.value;
});

const totalLtvAll = computed(() => {
  return customers.value.reduce((acc, c) => acc + (Number(c.totalSpent) || 0), 0);
});

const recentCount = computed(() => {
  return customers.value.filter((c) => {
    if (c.daysSinceLastVisit !== null && c.daysSinceLastVisit <= 14) return true;
    if (c.createdAt) {
      const diffMs = Date.now() - new Date(c.createdAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    return false;
  }).length;
});

// Filtros Inteligentes
const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const cleanQ = q.replace(/\D/g, '');

  return customers.value.filter((c) => {
    // Busca textual
    if (q) {
      const nameMatch = c.name.toLowerCase().includes(q);
      const emailMatch = c.email?.toLowerCase().includes(q);
      const notesMatch = c.notes?.toLowerCase().includes(q);
      const instagramMatch = c.instagram?.toLowerCase().includes(q);
      const phoneDigits = c.phone.replace(/\D/g, '');
      const phoneMatch = cleanQ.length > 0 && phoneDigits.includes(cleanQ);

      if (!nameMatch && !emailMatch && !notesMatch && !phoneMatch && !instagramMatch) {
        return false;
      }
    }

    // Abas de filtro
    if (activeFilter.value === 'VIP') {
      return c.isVipMember;
    }
    if (activeFilter.value === 'RISK') {
      return c.isAtRisk || (c.daysSinceLastVisit !== null && c.daysSinceLastVisit >= 30);
    }
    if (activeFilter.value === 'BIRTHDAYS') {
      return c.isBirthdayMonth;
    }
    if (activeFilter.value === 'RECENT') {
      if (c.daysSinceLastVisit !== null && c.daysSinceLastVisit <= 14) return true;
      if (c.createdAt) {
        const diffMs = Date.now() - new Date(c.createdAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      return false;
    }

    return true;
  });
});

// ================= CRUD CLIENTE =================
function openAddModal() {
  playSound('click');
  isEditing.value = false;
  editingCustomerId.value = null;
  form.value = {
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    instagram: '',
    avatarUrl: '',
    notes: '',
    preferences: [],
    isVipMember: false,
  };
  showModal.value = true;
}

function openEditModal(customer: Customer) {
  playSound('click');
  isEditing.value = true;
  editingCustomerId.value = customer.id;
  
  let formattedBirth = customer.birthDate || '';
  if (formattedBirth.includes('-')) {
    const parts = formattedBirth.split('-');
    if (parts.length === 3) formattedBirth = `${parts[2]}/${parts[1]}`;
    else if (parts.length === 2) formattedBirth = `${parts[1]}/${parts[0]}`;
  }

  form.value = {
    name: customer.name,
    phone: formatPhone(customer.phone),
    email: customer.email || '',
    birthDate: formattedBirth,
    instagram: customer.instagram || '',
    avatarUrl: customer.avatarUrl || '',
    notes: customer.notes || '',
    preferences: Array.isArray(customer.preferences) ? [...customer.preferences] : [],
    isVipMember: customer.isVipMember,
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function handleSaveCustomer() {
  if (!form.value.name.trim()) {
    toast.error('Informe o nome do cliente');
    return;
  }
  const cleanPhone = form.value.phone.replace(/\D/g, '');
  if (cleanPhone.length < 8) {
    toast.error('Informe um telefone ou WhatsApp válido');
    return;
  }

  saving.value = true;
  try {
    const cleanInsta = form.value.instagram.replace(/^@+/, '').trim();
    const payload = {
      name: form.value.name.trim(),
      phone: cleanPhone,
      email: form.value.email.trim() || undefined,
      birthDate: form.value.birthDate.trim() || undefined,
      instagram: cleanInsta ? `@${cleanInsta}` : undefined,
      avatarUrl: form.value.avatarUrl.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
      preferences: form.value.preferences,
      isVipMember: form.value.isVipMember,
    };

    if (isEditing.value && editingCustomerId.value) {
      await api.updateCustomer(editingCustomerId.value, payload);
      toast.success('Cliente atualizado com sucesso!');
      if (dossierCustomer.value && dossierCustomer.value.id === editingCustomerId.value) {
        await openDossier(dossierCustomer.value);
      }
    } else {
      await api.createCustomer(payload);
      toast.success('Novo cliente cadastrado com sucesso!');
    }

    playSound('success');
    showModal.value = false;
    await loadCustomers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar cliente');
  } finally {
    saving.value = false;
  }
}

// ================= EXCLUSÃO =================
const showDeleteModal = ref(false);
const customerToDelete = ref<Customer | null>(null);

function openDeleteModal(customer: Customer) {
  playSound('click');
  customerToDelete.value = customer;
  showDeleteModal.value = true;
}

async function confirmDeleteCustomer() {
  if (!customerToDelete.value) return;

  deleting.value = true;
  try {
    await api.deleteCustomer(customerToDelete.value.id);
    toast.success('Cliente removido com sucesso!');
    playSound('delete');
    showDeleteModal.value = false;
    customerToDelete.value = null;
    if (isDossierOpen.value) isDossierOpen.value = false;
    await loadCustomers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao remover cliente');
  } finally {
    deleting.value = false;
  }
}

// ================= FICHA 360º DO CLIENTE (DOSSIÊ COMPLETO) =================
const isDossierOpen = ref(false);
const dossierLoading = ref(false);
const dossierCustomer = ref<Customer | null>(null);
const dossierData = ref<Customer360Response | null>(null);
const activeDossierTab = ref<'HISTORY' | 'PRODUCTS' | 'PREFERENCES'>('HISTORY');
const dossierNotes = ref('');
const savingDossierNotes = ref(false);

async function openDossier(customer: Customer) {
  playSound('click');
  dossierCustomer.value = customer;
  dossierNotes.value = customer.notes || '';
  activeDossierTab.value = 'HISTORY';
  isDossierOpen.value = true;
  dossierLoading.value = true;

  try {
    const data = await api.getCustomer360(customer.id);
    dossierData.value = data;
    // Sincroniza cliente com os dados atualizados
    dossierCustomer.value = data.customer;
  } catch (err: any) {
    toast.error(err.message || 'Erro ao carregar histórico 360º');
  } finally {
    dossierLoading.value = false;
  }
}

async function saveDossierNotes() {
  if (!dossierCustomer.value) return;
  savingDossierNotes.value = true;
  try {
    await api.updateCustomer(dossierCustomer.value.id, {
      notes: dossierNotes.value.trim() || undefined,
    });
    dossierCustomer.value.notes = dossierNotes.value.trim();
    toast.success('Preferências e notas salvas!', 'Dossiê Atualizado');
    playSound('success');
    await loadCustomers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar notas');
  } finally {
    savingDossierNotes.value = false;
  }
}

async function toggleDossierPreferenceTag(tag: string) {
  if (!dossierCustomer.value) return;
  playSound('click');
  const current = Array.isArray(dossierCustomer.value.preferences) ? [...dossierCustomer.value.preferences] : [];
  const idx = current.indexOf(tag);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(tag);
  }
  dossierCustomer.value.preferences = current;

  try {
    await api.updateCustomer(dossierCustomer.value.id, { preferences: current });
    toast.success(`Preferência "${tag}" atualizada!`);
    await loadCustomers();
  } catch (err: any) {
    toast.error('Erro ao atualizar tag');
  }
}

function handleGoToNewAppointment(customer: Customer) {
  isDossierOpen.value = false;
  router.push({ path: '/appointments', query: { new: 'true', customerId: customer.id, customerName: customer.name } });
}

// ================= MOTOR DE REATIVAÇÃO & ANIVERSÁRIO WHATSAPP =================
const isReactivationModalOpen = ref(false);
const reactivationMode = ref<'INDIVIDUAL' | 'MASS_RISK' | 'MASS_BIRTHDAY'>('INDIVIDUAL');
const reactivationTargetCustomer = ref<Customer | null>(null);
const selectedTemplate = ref<'RECOVERY' | 'BIRTHDAY' | 'MAINTENANCE' | 'VIP_PROMO'>('RECOVERY');
const customMessage = ref('');

function openReactivationModal(mode: 'INDIVIDUAL' | 'MASS_RISK' | 'MASS_BIRTHDAY', customer?: Customer) {
  playSound('click');
  reactivationMode.value = mode;
  reactivationTargetCustomer.value = customer || null;

  if (mode === 'MASS_BIRTHDAY' || (customer && customer.isBirthdayMonth)) {
    selectedTemplate.value = 'BIRTHDAY';
  } else if (mode === 'MASS_RISK' || (customer && customer.isAtRisk)) {
    selectedTemplate.value = 'RECOVERY';
  } else if (customer && customer.isVipMember) {
    selectedTemplate.value = 'VIP_PROMO';
  } else {
    selectedTemplate.value = 'MAINTENANCE';
  }

  isReactivationModalOpen.value = true;
}

const computedMessagePreview = computed(() => {
  const c = reactivationTargetCustomer.value;
  const firstName = c ? c.name.split(' ')[0] : 'Campeão';
  const days = c && c.daysSinceLastVisit !== null ? `${c.daysSinceLastVisit}` : '30';

  if (selectedTemplate.value === 'RECOVERY') {
    return `Fala ${firstName}, tudo bem? 💈\n\nNotamos aqui no BarblyClub que já faz ${days} dias desde seu último corte com a gente. Seu visual merece estar sempre no padrão!\n\nQue tal garantir seu horário para essa semana? Responda aqui ou clique no link para reservar seu horário: https://barber.app/agenda`;
  }
  if (selectedTemplate.value === 'BIRTHDAY') {
    return `Fala ${firstName}, parabéns pelo seu dia! 🎂🎉\n\nEm nome de toda a equipe do BarblyClub, desejamos muitas felicidades e conquistas!\n\nPreparamos uma cortesia especial para comemorar seu aniversário com o visual alinhado: ganhe um produto ou bebida no seu próximo atendimento! Vamos agendar? ✂️🍻`;
  }
  if (selectedTemplate.value === 'MAINTENANCE') {
    return `Olá ${firstName}! ✂️ Passando para lembrar que seu ciclo de manutenção do corte/barba já completou o tempo ideal.\n\nBora garantir aquele degradê alinhado para o fim de semana? Fale com a gente aqui ou reserve online: https://barber.app/agenda`;
  }
  if (selectedTemplate.value === 'VIP_PROMO') {
    return `Olá ${firstName}! 👑 Como membro especial do Clube VIP BarblyClub, você tem prioridade garantida na nossa agenda desta semana.\n\nQual dia e horário você prefere para o seu atendimento VIP? Estamos prontos para te receber! 💈`;
  }
  return customMessage.value || 'Olá! Estamos à disposição no BarblyClub.';
});

function getDirectWhatsAppLink(phone: string, text: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.length <= 11) clean = '55' + clean;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function handleSendWhatsApp(customer: Customer) {
  playSound('click');
  const url = getDirectWhatsAppLink(customer.phone, computedMessagePreview.value);
  window.open(url, '_blank');
}

function copyToClipboard(text: string) {
  playSound('success');
  navigator.clipboard.writeText(text);
  toast.success('Mensagem copiada para a área de transferência!', 'Copiado');
}

onMounted(() => {
  loadCustomers();
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-10 space-y-5 sm:space-y-8 max-w-7xl mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">

    <!-- ============================================== -->
    <!-- TOP HEADER: TITLE & ACTIONS                    -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Inteligência de CRM &amp; Retenção
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Crown class="w-3 h-3 text-amber-500" /> FICHA 360º &amp; LTV
          </span>
          <span v-if="birthdayCount > 0" class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
            <Cake class="w-3 h-3" /> {{ birthdayCount }} Aniversariante{{ birthdayCount > 1 ? 's' : '' }} este Mês
          </span>
        </div>
        <h1 class="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Dossiê 360º &amp; Retorno de Clientes
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Histórico unificado de cortes, consumo do frigobar/comanda, ciclo médio de visitas, disparo de reativação WhatsApp e ficha detalhada de preferências.
        </p>
      </div>

      <div class="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
        <!-- Botão Motor de Reativação Rápida WhatsApp -->
        <button 
          v-if="atRiskCount > 0"
          @click="openReactivationModal('MASS_RISK')"
          class="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-sm active:scale-95"
          title="Abrir motor de mensagens anti-perda para clientes ausentes"
        >
          <Sparkles class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>Reativar {{ atRiskCount }} Ausentes</span>
        </button>

        <!-- Refresh Button -->
        <button 
          @click="loadCustomers" 
          :disabled="loading"
          class="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition hover:border-slate-300 dark:hover:border-white/20 shadow-sm cursor-pointer"
          title="Sincronizar clientes com o banco"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <!-- New Customer Button -->
        <button 
          @click="openAddModal"
          class="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          <UserPlus class="w-4 h-4 stroke-[3]" />
          <span>+ Novo Cliente</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- 5 LUXURY METRICS CARDS                         -->
    <!-- ============================================== -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      
      <!-- Card 1: Total Clientes -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:border-amber-500/30">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Users class="w-3.5 h-3.5 text-slate-400" />
            <span>Cadastrados</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
            Base Ativa
          </span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white">
            {{ totalCount }}
          </span>
          <span class="text-xs text-slate-400 font-medium">clientes</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Sincronizado no MySQL</span>
        </div>
      </div>

      <!-- Card 2: Clientes VIP -->
      <div class="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent bg-white dark:bg-[#0e131d]/90 border border-amber-500/30 dark:border-amber-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:border-amber-500/50 relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Crown class="w-3.5 h-3.5" />
            <span>Clube VIP</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            {{ vipPercentage }}%
          </span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black font-mono-num text-amber-600 dark:text-amber-400">
            {{ vipCount }}
          </span>
          <span class="text-xs text-amber-700 dark:text-amber-300/80 font-medium">membros VIP</span>
        </div>
        <div class="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-2 flex items-center gap-1">
          <Sparkles class="w-3 h-3 shrink-0" />
          <span>Fidelidade premium</span>
        </div>
      </div>

      <!-- Card 3: Clientes em Risco (+30 dias) -->
      <div 
        @click="activeFilter = 'RISK'; playSound('click')"
        class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:border-rose-500/40 cursor-pointer"
        :class="{ 'ring-2 ring-rose-500/50': activeFilter === 'RISK' }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            <AlertTriangle class="w-3.5 h-3.5" />
            <span>Em Risco (30d+)</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Ausentes
          </span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black font-mono-num text-rose-600 dark:text-rose-400">
            {{ atRiskCount }}
          </span>
          <span class="text-xs text-rose-500/80 font-medium">sem retorno</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Clique para filtrar</span>
        </div>
      </div>

      <!-- Card 4: Aniversariantes do Mês -->
      <div 
        @click="activeFilter = 'BIRTHDAYS'; playSound('click')"
        class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:border-purple-500/40 cursor-pointer"
        :class="{ 'ring-2 ring-purple-500/50': activeFilter === 'BIRTHDAYS' }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <Cake class="w-3.5 h-3.5" />
            <span>Aniversariantes</span>
          </div>
          <span v-if="birthdayTodayCount > 0" class="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500 text-white animate-pulse">
            {{ birthdayTodayCount }} HOJE!
          </span>
          <span v-else class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Mês Atual
          </span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-black font-mono-num text-purple-600 dark:text-purple-400">
            {{ birthdayCount }}
          </span>
          <span class="text-xs text-purple-500/80 font-medium">comemorando</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <Gift class="w-3 h-3 text-purple-400 shrink-0" />
          <span>Dispare parabéns com 1 toque</span>
        </div>
      </div>

      <!-- Card 5: LTV Total Acumulado -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:border-emerald-500/30 col-span-2 md:col-span-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <TrendingUp class="w-3.5 h-3.5 text-emerald-500" />
            <span>LTV Médio / Cliente</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Ticket
          </span>
        </div>
        <div class="mt-3 flex items-baseline gap-1.5">
          <span class="text-xl sm:text-2xl font-black font-mono-num text-slate-900 dark:text-white truncate">
            {{ formatCurrency(averageLtv) }}
          </span>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 truncate">
          Total gerado: <strong class="text-emerald-500">{{ formatCurrency(totalLtvAll) }}</strong>
        </div>
      </div>

    </div>

    <!-- ============================================== -->
    <!-- SEARCH BAR & FILTER CHIPS & VIEW SWITCHER      -->
    <!-- ============================================== -->
    <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-3.5 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors">
      
      <!-- Search Input -->
      <div class="relative flex-1 min-w-[240px]">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome, WhatsApp, e-mail, @instagram ou preferências..."
          class="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition shadow-inner"
        />
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''; playSound('click')"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Filter Chips & View Mode Toggle -->
      <div class="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
        
        <!-- Chips -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- All -->
          <button 
            @click="activeFilter = 'ALL'; playSound('click')"
            class="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="activeFilter === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <span>Todos</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === 'ALL' ? 'bg-white/20 dark:bg-black/20' : 'bg-slate-200 dark:bg-white/10'">
              {{ totalCount }}
            </span>
          </button>

          <!-- VIP Club -->
          <button 
            @click="activeFilter = 'VIP'; playSound('click')"
            class="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="activeFilter === 'VIP' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <Crown class="w-3.5 h-3.5" />
            <span>VIPs</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === 'VIP' ? 'bg-black/20 text-slate-950' : 'bg-slate-200 dark:bg-white/10'">
              {{ vipCount }}
            </span>
          </button>

          <!-- In Risk -->
          <button 
            @click="activeFilter = 'RISK'; playSound('click')"
            class="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="activeFilter === 'RISK' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            <span>Em Risco</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === 'RISK' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'">
              {{ atRiskCount }}
            </span>
          </button>

          <!-- Birthdays -->
          <button 
            @click="activeFilter = 'BIRTHDAYS'; playSound('click')"
            class="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="activeFilter === 'BIRTHDAYS' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <Cake class="w-3.5 h-3.5" />
            <span>Aniversários</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === 'BIRTHDAYS' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'">
              {{ birthdayCount }}
            </span>
          </button>

          <!-- Recent -->
          <button 
            @click="activeFilter = 'RECENT'; playSound('click')"
            class="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="activeFilter === 'RECENT' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <Clock class="w-3.5 h-3.5" />
            <span>Recentes</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === 'RECENT' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'">
              {{ recentCount }}
            </span>
          </button>
        </div>

        <!-- Segmented Control: Cards vs Lista -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#07090e] border border-slate-200/80 dark:border-white/10 rounded-2xl shrink-0 shadow-sm ml-2">
          <button 
            @click="setViewMode('CARDS')"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="viewMode === 'CARDS' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Exibir em Grade de Cards CRM"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Cards</span>
          </button>

          <button 
            @click="setViewMode('TABLE')"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            :class="viewMode === 'TABLE' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Exibir em Tabela / Lista Detalhada"
          >
            <List class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Lista</span>
          </button>
        </div>

      </div>

    </div>

    <!-- LOADING STATE -->
    <div v-if="loading && customers.length === 0" class="flex flex-col items-center justify-center py-24 space-y-3">
      <Loader2 class="w-9 h-9 animate-spin text-amber-500" />
      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando inteligência de clientes do BarblyClub...</span>
    </div>

    <!-- EMPTY STATE -->
    <div 
      v-else-if="filteredCustomers.length === 0" 
      class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm space-y-4"
    >
      <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
        <Users class="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Nenhum cliente encontrado</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {{ searchQuery ? 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos.' : 'Sua barbearia ainda não possui clientes cadastrados neste filtro.' }}
        </p>
      </div>
      <div class="flex items-center justify-center gap-3 pt-2">
        <button 
          v-if="searchQuery || activeFilter !== 'ALL'"
          @click="searchQuery = ''; activeFilter = 'ALL'; playSound('click')"
          class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/15 transition cursor-pointer"
        >
          Limpar Filtros
        </button>
        <button 
          @click="openAddModal"
          class="px-5 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition shadow-md shadow-amber-500/20 cursor-pointer"
        >
          Cadastrar Cliente
        </button>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 1: GRADE DE CARDS (FOTOS EM DESTAQUE, AÇÕES E STATUS)     -->
    <!-- ============================================================== -->
    <div 
      v-else-if="viewMode === 'CARDS'" 
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      <div 
        v-for="customer in filteredCustomers" 
        :key="customer.id"
        class="bg-white dark:bg-[#0e131d]/90 border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden group hover:border-amber-500/40 hover:shadow-xl"
        :class="customer.isVipMember ? 'border-amber-500/30' : 'border-slate-200/80 dark:border-white/[0.08]'"
      >
        <!-- Golden Corner Glow for VIP -->
        <div v-if="customer.isVipMember" class="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/15 rounded-full blur-xl pointer-events-none"></div>

        <div class="space-y-4">
          <!-- Top Row: Avatar com Foto + Info + VIP / Status Badge -->
          <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3 min-w-0">
              
              <!-- Avatar Circle com Foto Real e Troca Rápida -->
              <div 
                class="relative group/avatar cursor-pointer shrink-0" 
                @click="openQuickPhotoModal(customer)" 
                title="Clique para trocar a foto de perfil do cliente"
              >
                <div 
                  class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden ring-2 bg-slate-100 dark:bg-black/50 shadow-md transition group-hover/avatar:ring-amber-500"
                  :class="customer.isVipMember ? 'ring-amber-500/50' : 'ring-slate-300 dark:ring-white/10'"
                >
                  <img 
                    v-if="customer.avatarUrl" 
                    :src="customer.avatarUrl" 
                    :alt="customer.name" 
                    class="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                    @error="(e: any) => e.target.style.display = 'none'"
                  />
                  <div 
                    v-else 
                    class="w-full h-full flex items-center justify-center font-black text-lg transition"
                    :class="customer.isVipMember ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-black' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'"
                  >
                    {{ customer.name ? customer.name.charAt(0).toUpperCase() : 'C' }}
                  </div>
                </div>

                <!-- Overlay de Câmera no Hover -->
                <div class="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera class="w-4 h-4 text-amber-400" />
                </div>

                <!-- VIP Mini-Badge sobre o avatar -->
                <span 
                  v-if="customer.isVipMember" 
                  class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs"
                  title="Membro VIP Club"
                >
                  <Crown class="w-2.5 h-2.5" />
                </span>
              </div>

              <!-- Nome e Telefone / Instagram -->
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 
                    @click="openDossier(customer)"
                    class="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate leading-tight cursor-pointer hover:text-amber-500 transition"
                    title="Clique para abrir Ficha 360º"
                  >
                    {{ customer.name }}
                  </h3>
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                  <Phone class="w-3 h-3 shrink-0" />
                  <span class="font-mono-num font-semibold">{{ formatPhone(customer.phone) }}</span>
                </div>
                <div v-if="customer.instagram" class="text-[10px] text-amber-600 dark:text-amber-400/80 flex items-center gap-1 mt-0.5 truncate">
                  <Instagram class="w-2.5 h-2.5 shrink-0" />
                  <span>{{ customer.instagram }}</span>
                </div>
              </div>
            </div>

            <!-- VIP Badge or Status -->
            <div class="shrink-0 flex flex-col items-end gap-1">
              <span 
                v-if="customer.isVipMember" 
                class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1"
              >
                <Crown class="w-2.5 h-2.5" /> VIP
              </span>

              <span 
                v-if="customer.isBirthdayMonth" 
                class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 inline-flex items-center gap-1"
                :class="{ 'animate-pulse bg-purple-500 text-white': customer.isBirthdayToday }"
              >
                <Cake class="w-2.5 h-2.5" /> {{ customer.isBirthdayToday ? 'ANIVERSÁRIO HOJE!' : 'NÍVER MÊS' }}
              </span>

              <span 
                v-else-if="customer.isAtRisk || (customer.daysSinceLastVisit !== null && customer.daysSinceLastVisit >= 30)"
                class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Ausente
              </span>
            </div>
          </div>

          <!-- Metrics Strip: Visits, LTV (Serviços + Bebidas), Last Visit -->
          <div class="grid grid-cols-3 gap-2 py-2 border-b border-slate-100 dark:border-white/5 text-center">
            <div class="bg-slate-50 dark:bg-black/30 p-2 rounded-2xl border border-slate-100 dark:border-white/5">
              <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Cortes</span>
              <span class="text-xs sm:text-sm font-black font-mono-num text-slate-900 dark:text-white">
                {{ customer.totalAppointments }}
              </span>
            </div>

            <div class="bg-slate-50 dark:bg-black/30 p-2 rounded-2xl border border-slate-100 dark:border-white/5">
              <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">LTV Total</span>
              <span class="text-xs sm:text-sm font-black font-mono-num text-amber-600 dark:text-amber-400 truncate block">
                {{ formatCurrency(customer.totalSpent) }}
              </span>
            </div>

            <div class="bg-slate-50 dark:bg-black/30 p-2 rounded-2xl border border-slate-100 dark:border-white/5">
              <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Última Visita</span>
              <span 
                class="text-[10px] font-bold truncate block mt-0.5"
                :class="customer.isAtRisk || (customer.daysSinceLastVisit !== null && customer.daysSinceLastVisit >= 30) ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'"
              >
                {{ formatLastVisit(customer) }}
              </span>
            </div>
          </div>

          <!-- Tags de Preferências / Estilo do Cliente -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <div class="flex items-center gap-1">
                <Coffee class="w-3 h-3 text-amber-500" />
                <span>Preferências de Estilo:</span>
              </div>
              <span v-if="customer.preferences && customer.preferences.length > 0" class="text-amber-500 text-[9px]">
                {{ customer.preferences.length }} tags
              </span>
            </div>

            <!-- Tags Chips Preview -->
            <div v-if="customer.preferences && customer.preferences.length > 0" class="flex flex-wrap gap-1">
              <span 
                v-for="(tag, idx) in customer.preferences.slice(0, 3)" 
                :key="idx"
                class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              >
                {{ tag }}
              </span>
              <span 
                v-if="customer.preferences.length > 3"
                class="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500"
              >
                +{{ customer.preferences.length - 3 }}
              </span>
            </div>

            <p v-else-if="customer.notes" class="text-slate-700 dark:text-slate-300 text-xs italic bg-slate-50 dark:bg-black/30 p-2 rounded-xl border border-slate-100 dark:border-white/5 line-clamp-1">
              "{{ customer.notes }}"
            </p>
            <p v-else class="text-slate-400 text-[10px] italic bg-slate-50/50 dark:bg-white/[0.02] p-1.5 rounded-lg">
              Sem preferências registradas. Clique em Ficha 360º para adicionar.
            </p>
          </div>
        </div>

        <!-- Card Footer Actions: Ficha 360º + WhatsApp + Editar + Excluir -->
        <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 mt-3">
          <!-- Primary: Ficha 360º -->
          <button 
            @click="openDossier(customer)"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer active:scale-95 border border-slate-700/50 dark:border-white/10 shadow-sm"
          >
            <Eye class="w-3.5 h-3.5 text-amber-400" />
            <span>Ficha 360º</span>
          </button>

          <!-- WhatsApp Button (Contextual Engine) -->
          <button 
            @click="openReactivationModal('INDIVIDUAL', customer)"
            class="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
            title="Enviar mensagem personalizada no WhatsApp"
          >
            <MessageCircle class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Whats</span>
          </button>

          <!-- Edit Button -->
          <button 
            @click="openEditModal(customer)"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
            title="Editar cliente"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>

          <!-- Delete Button -->
          <button 
            @click="openDeleteModal(customer)"
            class="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            title="Remover cliente"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: TABELA / LISTA DETALHADA                               -->
    <!-- ============================================================== -->
    <div 
      v-else-if="viewMode === 'TABLE'" 
      class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors"
    >
      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <tr>
              <th class="py-4 px-6">Cliente</th>
              <th class="py-4 px-4">WhatsApp &amp; Instagram</th>
              <th class="py-4 px-4">Estilo &amp; Preferências</th>
              <th class="py-4 px-4 text-center">Atendimentos</th>
              <th class="py-4 px-4 text-right">LTV Total</th>
              <th class="py-4 px-4">Última Visita</th>
              <th class="py-4 px-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5 text-xs sm:text-sm">
            <tr 
              v-for="customer in filteredCustomers" 
              :key="customer.id"
              class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
              @click="openDossier(customer)"
            >
              <!-- Cliente (Foto, Nome e Selo VIP) -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <!-- Avatar com foto ou inicial -->
                  <div 
                    class="relative w-11 h-11 rounded-2xl overflow-hidden ring-2 bg-slate-100 dark:bg-black/50 shrink-0 cursor-pointer group/tblAvatar"
                    :class="customer.isVipMember ? 'ring-amber-500/50' : 'ring-slate-300 dark:ring-white/10'"
                    @click.stop="openQuickPhotoModal(customer)"
                    title="Clique para alterar a foto do cliente"
                  >
                    <img 
                      v-if="customer.avatarUrl" 
                      :src="customer.avatarUrl" 
                      :alt="customer.name" 
                      class="w-full h-full object-cover group-hover/tblAvatar:scale-110 transition"
                      @error="(e: any) => e.target.style.display = 'none'"
                    />
                    <div 
                      v-else 
                      class="w-full h-full flex items-center justify-center font-bold text-sm"
                      :class="customer.isVipMember ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-black' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'"
                    >
                      {{ customer.name ? customer.name.charAt(0).toUpperCase() : 'C' }}
                    </div>
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover/tblAvatar:opacity-100 transition flex items-center justify-center text-white">
                      <Camera class="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>

                  <!-- Name and VIP Badge -->
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition">
                        {{ customer.name }}
                      </span>
                      <span 
                        v-if="customer.isVipMember" 
                        class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 flex items-center gap-0.5"
                      >
                        <Crown class="w-2.5 h-2.5" /> VIP
                      </span>
                      <span 
                        v-if="customer.isBirthdayMonth" 
                        class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 flex items-center gap-0.5"
                        :class="{ 'animate-pulse bg-purple-500 text-white': customer.isBirthdayToday }"
                      >
                        <Cake class="w-2.5 h-2.5" /> {{ customer.isBirthdayToday ? 'HOJE' : 'NÍVER' }}
                      </span>
                    </div>
                    <span class="text-[11px] text-slate-400 block truncate">
                      {{ customer.email || 'Sem e-mail cadastrado' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- WhatsApp & Instagram -->
              <td class="py-4 px-4 whitespace-nowrap" @click.stop>
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono-num font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {{ formatPhone(customer.phone) }}
                    </span>
                    <button 
                      @click="openReactivationModal('INDIVIDUAL', customer)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/20 text-[10px] font-bold transition shrink-0 cursor-pointer"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle class="w-3 h-3" />
                      <span>Whats</span>
                    </button>
                  </div>
                  <div v-if="customer.instagram" class="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Instagram class="w-2.5 h-2.5 shrink-0" />
                    <span>{{ customer.instagram }}</span>
                  </div>
                </div>
              </td>

              <!-- Observações / Preferências -->
              <td class="py-4 px-4 max-w-xs">
                <div v-if="customer.preferences && customer.preferences.length > 0" class="flex flex-wrap gap-1">
                  <span 
                    v-for="(tag, idx) in customer.preferences.slice(0, 2)" 
                    :key="idx"
                    class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="customer.preferences.length > 2" class="text-[9px] text-slate-400">
                    +{{ customer.preferences.length - 2 }}
                  </span>
                </div>
                <div v-else-if="customer.notes" class="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Coffee class="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span class="line-clamp-1 italic text-[11px] text-slate-400">
                    "{{ customer.notes }}"
                  </span>
                </div>
                <span v-else class="text-[11px] text-slate-400 italic">Sem preferências</span>
              </td>

              <!-- Atendimentos -->
              <td class="py-4 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold font-mono-num text-xs">
                  <Scissors class="w-3 h-3 text-slate-400" />
                  <span>{{ customer.totalAppointments }}</span>
                </div>
              </td>

              <!-- LTV Total -->
              <td class="py-4 px-4 text-right whitespace-nowrap">
                <div class="font-mono-num font-black text-slate-900 dark:text-white text-sm">
                  {{ formatCurrency(customer.totalSpent) }}
                </div>
                <span class="text-[10px] text-slate-400 block font-medium">serviços + comanda</span>
              </td>

              <!-- Última Visita -->
              <td class="py-4 px-4 whitespace-nowrap">
                <div v-if="customer.isAtRisk || (customer.daysSinceLastVisit !== null && customer.daysSinceLastVisit >= 30)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span>{{ formatLastVisit(customer) }}</span>
                </div>
                <div v-else-if="customer.lastAppointment" class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <Clock class="w-3.5 h-3.5 text-slate-400" />
                  <span>{{ formatLastVisit(customer) }}</span>
                </div>
                <span v-else class="text-xs text-slate-400 italic">Novo cliente</span>
              </td>

              <!-- Ações -->
              <td class="py-4 px-6 text-right whitespace-nowrap" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button 
                    @click="openDossier(customer)"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Abrir Dossiê 360º"
                  >
                    <Eye class="w-4 h-4 text-amber-500" />
                  </button>
                  <button 
                    @click="openQuickPhotoModal(customer)"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Alterar Foto"
                  >
                    <Camera class="w-4 h-4" />
                  </button>
                  <button 
                    @click="openEditModal(customer)"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Editar cliente"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button 
                    @click="openDeleteModal(customer)"
                    class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Remover cliente"
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

    <!-- ============================================================== -->
    <!-- MODAL / DRAWER: DOSSIÊ 360º COMPLETO DO CLIENTE               -->
    <!-- ============================================================== -->
    <div 
      v-if="isDossierOpen && dossierCustomer"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto no-scrollbar"
      @click.self="isDossierOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden transition-all animate-in fade-in zoom-in-95">
        
        <!-- Header do Dossiê -->
        <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/30 flex items-start justify-between gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <!-- Foto em alta resolução -->
            <div 
              class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden ring-4 bg-slate-200 dark:bg-black/60 shadow-xl shrink-0 cursor-pointer group"
              :class="dossierCustomer.isVipMember ? 'ring-amber-500/50' : 'ring-slate-300 dark:ring-white/10'"
              @click="openQuickPhotoModal(dossierCustomer)"
              title="Trocar Foto"
            >
              <img 
                v-if="dossierCustomer.avatarUrl" 
                :src="dossierCustomer.avatarUrl" 
                :alt="dossierCustomer.name"
                class="w-full h-full object-cover group-hover:scale-110 transition duration-300" 
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-2xl">
                {{ dossierCustomer.name ? dossierCustomer.name.charAt(0).toUpperCase() : 'C' }}
              </div>
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Camera class="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <!-- Dados Principais -->
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {{ dossierCustomer.name }}
                </h2>
                <span 
                  v-if="dossierCustomer.isVipMember"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black flex items-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <Crown class="w-3 h-3" /> VIP CLUB
                </span>
                <span 
                  v-if="dossierCustomer.isBirthdayMonth"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1"
                >
                  <Cake class="w-3 h-3" /> ANIVERSÁRIO {{ dossierCustomer.birthDate || '' }}
                </span>
              </div>

              <!-- Contatos e Redes -->
              <div class="flex items-center gap-3 sm:gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span class="flex items-center gap-1 font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                  <Phone class="w-3.5 h-3.5 text-emerald-500" /> {{ formatPhone(dossierCustomer.phone) }}
                </span>
                <span v-if="dossierCustomer.email" class="flex items-center gap-1">
                  <Mail class="w-3.5 h-3.5 text-slate-400" /> {{ dossierCustomer.email }}
                </span>
                <a 
                  v-if="dossierCustomer.instagram" 
                  :href="`https://instagram.com/${dossierCustomer.instagram.replace('@', '')}`" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold"
                >
                  <Instagram class="w-3.5 h-3.5" /> {{ dossierCustomer.instagram }}
                </a>
              </div>
            </div>
          </div>

          <!-- Botão Fechar -->
          <button 
            @click="isDossierOpen = false" 
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- 6 Micro-Cards Métricas do Cliente -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 bg-slate-100/50 dark:bg-black/40">
          <!-- 1: LTV Total -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">LTV Total Acumulado</span>
            <span class="text-base sm:text-lg font-black font-mono-num text-amber-500 truncate block mt-0.5">
              {{ formatCurrency(dossierData?.metrics.totalLTV || dossierCustomer.totalSpent) }}
            </span>
            <span class="text-[9px] text-slate-400 block mt-0.5">Cortes + Frigobar</span>
          </div>

          <!-- 2: Cortes Feitos -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Cortes Realizados</span>
            <span class="text-base sm:text-lg font-black font-mono-num text-slate-900 dark:text-white truncate block mt-0.5">
              {{ dossierData?.metrics.completedAppointments || dossierCustomer.totalAppointments }}
            </span>
            <span class="text-[9px] text-slate-400 block mt-0.5">
              {{ formatCurrency(dossierData?.metrics.totalServicesSpent || dossierCustomer.totalSpentServices) }}
            </span>
          </div>

          <!-- 3: Frigobar & Produtos -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Frigobar / Comanda</span>
            <span class="text-base sm:text-lg font-black font-mono-num text-emerald-500 truncate block mt-0.5">
              {{ formatCurrency(dossierData?.metrics.totalProductsSpent || dossierCustomer.totalSpentProducts) }}
            </span>
            <span class="text-[9px] text-slate-400 block mt-0.5">
              {{ dossierData?.metrics.totalProductsCount || 0 }} itens consumidos
            </span>
          </div>

          <!-- 4: Barbeiro Favorito -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Barbeiro Preferido</span>
            <span class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate block mt-1">
              {{ dossierData?.metrics.preferredBarber || 'Mais frequente' }}
            </span>
            <span class="text-[9px] text-amber-500 block mt-0.5">Cadeira favorita</span>
          </div>

          <!-- 5: Produto Favorito -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Bebida / Produto Top</span>
            <span class="text-xs font-black text-slate-900 dark:text-white truncate block mt-1" :title="dossierData?.metrics.favoriteProduct?.name">
              {{ dossierData?.metrics.favoriteProduct ? dossierData.metrics.favoriteProduct.name : 'Nenhum ainda' }}
            </span>
            <span v-if="dossierData?.metrics.favoriteProduct" class="text-[9px] text-emerald-500 block mt-0.5">
              {{ dossierData.metrics.favoriteProduct.count }} unidades
            </span>
            <span v-else class="text-[9px] text-slate-400 block mt-0.5">Sem consumo</span>
          </div>

          <!-- 6: Ciclo Médio de Retorno -->
          <div class="bg-white dark:bg-[#0e131d] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Frequência Média</span>
            <span class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate block mt-1">
              {{ dossierData?.metrics.averageDaysBetweenVisits ? `A cada ${dossierData.metrics.averageDaysBetweenVisits} dias` : '1ª visita' }}
            </span>
            <span class="text-[9px] text-slate-400 block mt-0.5">
              {{ formatLastVisit(dossierCustomer) }}
            </span>
          </div>
        </div>

        <!-- Abas do Dossiê -->
        <div class="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 text-xs font-bold">
          <button 
            @click="activeDossierTab = 'HISTORY'; playSound('click')"
            class="pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer"
            :class="activeDossierTab === 'HISTORY' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
          >
            <Scissors class="w-4 h-4" />
            <span>Histórico de Cortes &amp; Serviços ({{ dossierData?.appointments?.length || 0 }})</span>
          </button>

          <button 
            @click="activeDossierTab = 'PRODUCTS'; playSound('click')"
            class="pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer"
            :class="activeDossierTab === 'PRODUCTS' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
          >
            <Beer class="w-4 h-4" />
            <span>Frigobar &amp; Comanda ({{ dossierData?.productSales?.length || 0 }})</span>
          </button>

          <button 
            @click="activeDossierTab = 'PREFERENCES'; playSound('click')"
            class="pb-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer"
            :class="activeDossierTab === 'PREFERENCES' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
          >
            <SlidersHorizontal class="w-4 h-4" />
            <span>Preferências, Estilo &amp; Notas</span>
          </button>
        </div>

        <!-- Corpo das Abas -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
          
          <!-- Loading State no Dossiê -->
          <div v-if="dossierLoading" class="py-16 text-center space-y-3">
            <Loader2 class="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p class="text-xs text-slate-400">Carregando histórico completo do cliente...</p>
          </div>

          <!-- ABA 1: HISTÓRICO DE CORTES & SERVIÇOS -->
          <div v-else-if="activeDossierTab === 'HISTORY'" class="space-y-3">
            <div v-if="!dossierData?.appointments || dossierData.appointments.length === 0" class="text-center py-12 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6">
              <Scissors class="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum atendimento registrado ainda</p>
              <p class="text-[11px] text-slate-400 mt-1">Quando o cliente cortar cabelo ou fizer barba, os atendimentos aparecerão aqui com preço e barbeiro.</p>
              <button 
                @click="handleGoToNewAppointment(dossierCustomer)"
                class="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
              >
                Agendar Primeiro Corte
              </button>
            </div>

            <div v-else class="space-y-2.5">
              <div 
                v-for="apt in dossierData.appointments" 
                :key="apt.id"
                class="p-4 rounded-2xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/30 transition shadow-xs"
              >
                <div class="flex items-start sm:items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Scissors class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="font-bold text-slate-900 dark:text-white text-sm">
                        {{ apt.service?.name || 'Serviço BarblyClub' }}
                      </h4>
                      <span 
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        :class="formatStatus(apt.status).badgeClass"
                      >
                        {{ formatStatus(apt.status).label }}
                      </span>
                    </div>

                    <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span class="flex items-center gap-1 font-mono-num">
                        <Calendar class="w-3.5 h-3.5 text-slate-400" />
                        {{ formatDateTime(apt.startsAt) }}
                      </span>
                      <span v-if="apt.barber" class="flex items-center gap-1 font-medium">
                        <User class="w-3.5 h-3.5 text-amber-500" />
                        Barbeiro: <strong class="text-slate-700 dark:text-slate-200">{{ apt.barber.name }}</strong> ({{ apt.barber.chair || 'Cadeira' }})
                      </span>
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-white/5">
                        <span>{{ formatOrigin(apt.origin).icon }}</span>
                        <span>{{ formatOrigin(apt.origin).label }}</span>
                      </span>
                    </div>

                    <p v-if="apt.notes" class="text-[11px] text-slate-400 italic mt-1">
                      Obs: {{ apt.notes }}
                    </p>
                  </div>
                </div>

                <div class="text-right sm:shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-white/5 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                  <span class="text-xs text-slate-400 sm:hidden">Valor:</span>
                  <span class="text-base font-black font-mono-num text-slate-900 dark:text-white">
                    {{ formatCurrency(apt.finalPrice) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ABA 2: FRIGOBAR & COMANDA (PRODUTOS CONSUMIDOS) -->
          <div v-else-if="activeDossierTab === 'PRODUCTS'" class="space-y-3">
            <div v-if="!dossierData?.productSales || dossierData.productSales.length === 0" class="text-center py-12 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6">
              <Beer class="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum consumo no frigobar ou comanda registrado</p>
              <p class="text-[11px] text-slate-400 mt-1">Quando itens como cerveja, água, chicletes ou pomadas forem adicionados no checkout do atendimento, eles aparecerão aqui com quantidades e valores.</p>
            </div>

            <div v-else class="space-y-2.5">
              <div 
                v-for="sale in dossierData.productSales" 
                :key="sale.id"
                class="p-4 rounded-2xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition shadow-xs"
              >
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Beer v-if="sale.category === 'BEBIDAS'" class="w-5 h-5" />
                    <ShoppingBag v-else class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-bold text-slate-900 dark:text-white text-sm">
                        {{ sale.name }}
                      </h4>
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                        {{ sale.category }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono-num">
                      <span>{{ sale.quantity }}x {{ formatCurrency(sale.unitPrice) }}</span>
                      <span>•</span>
                      <span>{{ formatDateTime(sale.createdAt) }}</span>
                      <span v-if="sale.paymentMethod" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                        {{ sale.paymentMethod }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-base font-black font-mono-num text-emerald-500">
                    {{ formatCurrency(sale.totalAmount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ABA 3: PREFERÊNCIAS, ESTILO & NOTAS -->
          <div v-else-if="activeDossierTab === 'PREFERENCES'" class="space-y-6">
            
            <!-- Tags Interativas de Estilo -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Star class="w-3.5 h-3.5 text-amber-500" />
                  <span>Estilo &amp; Preferências do Barbeiro</span>
                </label>
                <span class="text-[11px] text-slate-400">Clique para ativar ou desativar tags</span>
              </div>

              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="tag in stylePreferencePresets" 
                  :key="tag"
                  type="button"
                  @click="toggleDossierPreferenceTag(tag)"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  :class="dossierCustomer.preferences?.includes(tag) 
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black scale-105' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'"
                >
                  <Check v-if="dossierCustomer.preferences?.includes(tag)" class="w-3.5 h-3.5 stroke-[3]" />
                  <span>{{ tag }}</span>
                </button>
              </div>
            </div>

            <!-- Notas e Observações Livres -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-amber-500" />
                <span>Observações Específicas do Cliente</span>
              </label>
              <textarea 
                v-model="dossierNotes"
                rows="4"
                placeholder="Ex: Não gosta de navalhete na nuca, sempre pede café espresso com 1 adoçante, prefere marcar na quinta-feira após 18h..."
                class="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition resize-none"
              ></textarea>
              <div class="flex justify-end">
                <button 
                  @click="saveDossierNotes"
                  :disabled="savingDossierNotes"
                  class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Loader2 v-if="savingDossierNotes" class="w-3.5 h-3.5 animate-spin" />
                  <Check v-else class="w-3.5 h-3.5 stroke-[3]" />
                  <span>Salvar Notas</span>
                </button>
              </div>
            </div>

            <!-- Aniversário & Instagram -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex items-center gap-3">
                <Cake class="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 font-bold block uppercase">Data de Aniversário</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">
                    {{ dossierCustomer.birthDate || 'Não informada' }}
                  </span>
                </div>
              </div>

              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex items-center gap-3">
                <Instagram class="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 font-bold block uppercase">Instagram</span>
                  <span class="text-xs font-bold text-slate-900 dark:text-white">
                    {{ dossierCustomer.instagram || 'Não informado' }}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Rodapé de Ações do Dossiê -->
        <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button 
              @click="openEditModal(dossierCustomer)"
              class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil class="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>
            <button 
              @click="openDeleteModal(dossierCustomer)"
              class="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              title="Excluir cliente"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div class="flex items-center gap-2.5">
            <button 
              @click="openReactivationModal('INDIVIDUAL', dossierCustomer)"
              class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Chamar WhatsApp</span>
            </button>

            <button 
              @click="handleGoToNewAppointment(dossierCustomer)"
              class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Scissors class="w-4 h-4 stroke-[3]" />
              <span>Agendar Corte</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MOTOR DE REATIVAÇÃO & ANIVERSÁRIO WHATSAPP                     -->
    <!-- ============================================================== -->
    <div 
      v-if="isReactivationModalOpen" 
      class="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-scrollbar"
      @click.self="isReactivationModalOpen = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar space-y-5">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <MessageCircle class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Motor de Reativação WhatsApp
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Disparo de mensagens prontas e personalizadas com 1 clique
              </p>
            </div>
          </div>
          <button 
            @click="isReactivationModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Target Info -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
              <User class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="text-[10px] text-slate-400 font-bold uppercase block">Destinatário:</span>
              <strong class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate block">
                {{ reactivationTargetCustomer ? reactivationTargetCustomer.name : 'Clientes Selecionados' }}
              </strong>
            </div>
          </div>

          <div v-if="reactivationTargetCustomer" class="text-right shrink-0">
            <span class="text-[11px] font-mono-num font-bold text-slate-600 dark:text-slate-300 block">
              {{ formatPhone(reactivationTargetCustomer.phone) }}
            </span>
            <span class="text-[9px] text-amber-500 font-bold block">
              {{ formatLastVisit(reactivationTargetCustomer) }}
            </span>
          </div>
        </div>

        <!-- Escolha do Modelo de Mensagem -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Escolha o Gatilho / Modelo:
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              @click="selectedTemplate = 'RECOVERY'; playSound('click')"
              class="p-3 rounded-xl border text-left transition cursor-pointer"
              :class="selectedTemplate === 'RECOVERY' ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'"
            >
              <div class="flex items-center gap-1.5 text-xs">
                <AlertTriangle class="w-3.5 h-3.5" />
                <span>Ausente / Saudades</span>
              </div>
              <p class="text-[10px] font-normal mt-0.5 opacity-80">+30 dias sem cortar</p>
            </button>

            <button 
              @click="selectedTemplate = 'BIRTHDAY'; playSound('click')"
              class="p-3 rounded-xl border text-left transition cursor-pointer"
              :class="selectedTemplate === 'BIRTHDAY' ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'"
            >
              <div class="flex items-center gap-1.5 text-xs">
                <Cake class="w-3.5 h-3.5" />
                <span>Aniversariante</span>
              </div>
              <p class="text-[10px] font-normal mt-0.5 opacity-80">Parabéns + Cortesia</p>
            </button>

            <button 
              @click="selectedTemplate = 'MAINTENANCE'; playSound('click')"
              class="p-3 rounded-xl border text-left transition cursor-pointer"
              :class="selectedTemplate === 'MAINTENANCE' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'"
            >
              <div class="flex items-center gap-1.5 text-xs">
                <Scissors class="w-3.5 h-3.5" />
                <span>Ciclo do Fade</span>
              </div>
              <p class="text-[10px] font-normal mt-0.5 opacity-80">Manutenção periódica</p>
            </button>

            <button 
              @click="selectedTemplate = 'VIP_PROMO'; playSound('click')"
              class="p-3 rounded-xl border text-left transition cursor-pointer"
              :class="selectedTemplate === 'VIP_PROMO' ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-black' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'"
            >
              <div class="flex items-center gap-1.5 text-xs">
                <Crown class="w-3.5 h-3.5" />
                <span>Aviso VIP Club</span>
              </div>
              <p class="text-[10px] font-normal mt-0.5 opacity-80">Horários exclusivos</p>
            </button>
          </div>
        </div>

        <!-- WhatsApp Preview Bubble (Luxury Chat UI) -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pré-visualização da Mensagem no WhatsApp:
          </label>
          <div class="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] text-[#e9edef] space-y-2 relative shadow-inner">
            <div class="bg-[#005c4b] p-3.5 rounded-2xl rounded-tl-none max-w-md text-xs sm:text-sm leading-relaxed whitespace-pre-line text-white shadow-md">
              {{ computedMessagePreview }}
              <div class="text-[10px] text-white/60 text-right mt-1 flex items-center justify-end gap-1">
                <span>Agora</span>
                <Check class="w-3 h-3 text-sky-400 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        <!-- Ações do Modal de Reativação -->
        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2.5">
          <button 
            @click="copyToClipboard(computedMessagePreview)"
            class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>Copiar Texto</span>
          </button>

          <button 
            v-if="reactivationTargetCustomer"
            @click="handleSendWhatsApp(reactivationTargetCustomer)"
            class="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
          >
            <Send class="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL RÁPIDO: ALTERAR FOTO DE PERFIL DO CLIENTE                -->
    <!-- ============================================================== -->
    <div 
      v-if="isQuickPhotoModalOpen && quickPhotoCustomer" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm no-scrollbar"
      @click.self="isQuickPhotoModalOpen = false"
    >
      <div class="w-full max-w-lg bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl no-scrollbar">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
              <Camera class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Alterar Foto: {{ quickPhotoCustomer.name }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                A foto identifica o cliente na agenda e no CRM da barbearia.
              </p>
            </div>
          </div>
          <button 
            @click="isQuickPhotoModalOpen = false; playSound('click')"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Preview em Destaque -->
        <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10">
          <div class="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-amber-500/30 bg-slate-200 dark:bg-black/60 shrink-0 shadow-md">
            <img 
              v-if="quickPhotoUrl" 
              :src="quickPhotoUrl" 
              alt="Preview" 
              class="w-full h-full object-cover" 
              @error="quickPhotoUrl = ''"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-400 font-black text-2xl">
              {{ quickPhotoCustomer.name ? quickPhotoCustomer.name.charAt(0).toUpperCase() : 'C' }}
            </div>
          </div>

          <div class="space-y-1 flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ quickPhotoCustomer.name }}</h4>
            <p class="text-[11px] text-slate-400 font-mono truncate">{{ formatPhone(quickPhotoCustomer.phone) }}</p>
            <button 
              v-if="quickPhotoUrl" 
              @click="quickPhotoUrl = ''; playSound('click')"
              class="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer block"
            >
              Remover foto atual
            </button>
          </div>
        </div>

        <!-- Abas de Seleção de Foto -->
        <div class="space-y-3">
          <div class="flex border-b border-slate-200 dark:border-white/10 text-xs font-bold">
            <button 
              @click="quickPhotoTab = 'upload'; playSound('click')"
              type="button"
              class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
              :class="quickPhotoTab === 'upload' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
            >
              Upload do Computador
            </button>
            <button 
              @click="quickPhotoTab = 'presets'; playSound('click')"
              type="button"
              class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
              :class="quickPhotoTab === 'presets' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
            >
              Modelos de Estilo
            </button>
            <button 
              @click="quickPhotoTab = 'url'; playSound('click')"
              type="button"
              class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
              :class="quickPhotoTab === 'url' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
            >
              Link / URL
            </button>
          </div>

          <!-- Upload -->
          <div v-if="quickPhotoTab === 'upload'" class="space-y-2">
            <label class="block p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-black/20 text-center cursor-pointer transition">
              <UploadCloud class="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Clique para escolher imagem ou arraste aqui</span>
              <span class="text-[11px] text-slate-400 block mt-1">PNG, JPG ou WEBP (compactada automaticamente)</span>
              <input type="file" accept="image/*" class="hidden" @change="handleQuickPhotoUpload" />
            </label>
          </div>

          <!-- Presets -->
          <div v-else-if="quickPhotoTab === 'presets'" class="space-y-2">
            <div class="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1 no-scrollbar">
              <button 
                v-for="(preset, idx) in customerAvatarPresets" 
                :key="idx"
                @click="quickPhotoUrl = preset.url; playSound('click')"
                type="button"
                class="group relative rounded-xl overflow-hidden aspect-square border-2 transition cursor-pointer"
                :class="quickPhotoUrl === preset.url ? 'border-amber-500 ring-2 ring-amber-500/40 scale-95 shadow-md' : 'border-transparent hover:border-white/40'"
              >
                <img :src="preset.url" :alt="preset.label" class="w-full h-full object-cover group-hover:scale-105 transition" />
                <div class="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-white p-1 text-center font-bold truncate">
                  {{ preset.label }}
                </div>
              </button>
            </div>
          </div>

          <!-- URL -->
          <div v-else-if="quickPhotoTab === 'url'" class="space-y-2">
            <input 
              v-model="quickPhotoUrl"
              type="url" 
              placeholder="https://exemplo.com/foto-cliente.jpg"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- Ações Foto -->
        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2.5">
          <button 
            @click="isQuickPhotoModalOpen = false; playSound('click')"
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            @click="handleSaveQuickPhoto"
            :disabled="savingQuickPhoto"
            type="button"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="savingQuickPhoto" class="w-4 h-4 animate-spin" />
            <Check v-else class="w-4 h-4 stroke-[3]" />
            <span>{{ savingQuickPhoto ? 'Salvando...' : 'Confirmar Foto' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL DE CADASTRO / EDIÇÃO COMPLETO                            -->
    <!-- ============================================================== -->
    <div 
      v-if="showModal" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-scrollbar"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar transition-colors">
        
        <!-- Close Button -->
        <button 
          @click="closeModal" 
          class="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1 rounded-lg cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Modal Header -->
        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-white/5 mb-5">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Crown v-if="form.isVipMember" class="w-6 h-6" />
            <Users v-else class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {{ isEditing ? 'Editar Perfil do Cliente' : 'Cadastrar Novo Cliente' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ isEditing ? 'Atualize as informações de foto, contato, aniversário e preferências.' : 'Preencha os dados para registrar o cliente no CRM do BarblyClub.' }}
            </p>
          </div>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleSaveCustomer" class="space-y-4">
          
          <!-- SEÇÃO DE FOTO DO CLIENTE -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Foto de Perfil do Cliente
              </label>
              <span class="text-[10px] text-slate-400">Identificação visual</span>
            </div>

            <div class="flex items-center gap-4">
              <!-- Preview Circle -->
              <div class="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-amber-500/40 bg-slate-200 dark:bg-black/60 shrink-0 shadow-sm">
                <img 
                  v-if="form.avatarUrl" 
                  :src="form.avatarUrl" 
                  alt="Preview" 
                  class="w-full h-full object-cover" 
                  @error="form.avatarUrl = ''"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                  <User class="w-7 h-7" />
                </div>
              </div>

              <!-- Input e Ações -->
              <div class="flex-1 space-y-2">
                <div class="flex gap-2">
                  <input 
                    v-model="form.avatarUrl"
                    type="url" 
                    placeholder="URL da foto ou escolha abaixo..."
                    class="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <label class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                    <UploadCloud class="w-3.5 h-3.5" />
                    <span class="hidden sm:inline">Upload</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleFormFileUpload" />
                  </label>
                </div>

                <!-- Presets Rápidos de Fotos -->
                <div class="flex items-center gap-2 pt-1">
                  <span class="text-[10px] text-slate-400 font-bold">Modelos:</span>
                  <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                    <button 
                      v-for="(preset, idx) in customerAvatarPresets" 
                      :key="idx"
                      @click="form.avatarUrl = preset.url; playSound('click')"
                      type="button"
                      class="w-7 h-7 rounded-lg overflow-hidden ring-1 transition cursor-pointer shrink-0"
                      :class="form.avatarUrl === preset.url ? 'ring-2 ring-amber-500 scale-110 shadow-sm' : 'ring-white/10 hover:ring-white/30'"
                      :title="preset.label"
                    >
                      <img :src="preset.url" class="w-full h-full object-cover" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Nome Completo -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome Completo *
            </label>
            <input 
              v-model="form.name"
              type="text" 
              required
              placeholder="Ex: Carlos Eduardo Silva"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <!-- Telefone / WhatsApp -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Telefone / WhatsApp *
            </label>
            <div class="relative">
              <Phone class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                :value="form.phone"
                @input="maskPhoneInput"
                type="text" 
                required
                placeholder="(11) 98765-4321"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition font-mono-num"
              />
            </div>
          </div>

          <!-- Aniversário & Instagram (2 colunas) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Aniversário -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Cake class="w-3.5 h-3.5 text-purple-500" />
                <span>Aniversário (DD/MM)</span>
              </label>
              <input 
                :value="form.birthDate"
                @input="maskBirthDateInput"
                type="text" 
                placeholder="Ex: 25/10"
                maxlength="5"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition font-mono-num"
              />
            </div>

            <!-- Instagram -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Instagram class="w-3.5 h-3.5 text-amber-500" />
                <span>Instagram</span>
              </label>
              <input 
                v-model="form.instagram"
                type="text" 
                placeholder="@perfil"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <!-- E-mail (Opcional) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              E-mail <span class="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <div class="relative">
              <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                v-model="form.email"
                type="email" 
                placeholder="cliente@email.com"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <!-- Tags de Preferências / Estilo -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Star class="w-3.5 h-3.5 text-amber-500" />
              <span>Preferências de Corte &amp; Estilo</span>
            </label>
            <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar p-1 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
              <button 
                v-for="tag in stylePreferencePresets" 
                :key="tag"
                type="button"
                @click="toggleFormPreference(tag)"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                :class="form.preferences.includes(tag) 
                  ? 'bg-amber-500 text-black font-black shadow-xs' 
                  : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 hover:border-amber-500/50'"
              >
                <Check v-if="form.preferences.includes(tag)" class="w-3 h-3 stroke-[3]" />
                <span>{{ tag }}</span>
              </button>
            </div>
          </div>

          <!-- VIP Club Membership Toggle -->
          <div 
            @click="form.isVipMember = !form.isVipMember; playSound('click')"
            class="p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3"
            :class="[
              form.isVipMember 
                ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15' 
                : 'bg-slate-50 dark:bg-[#07090e] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            ]"
          >
            <div 
              class="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition"
              :class="form.isVipMember ? 'bg-amber-500 text-slate-950 shadow-sm' : 'border border-slate-300 dark:border-white/20 text-transparent'"
            >
              <Check class="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1.5 font-bold text-xs" :class="form.isVipMember ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'">
                <Crown class="w-3.5 h-3.5" />
                <span>Membro do Clube VIP BarblyClub</span>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Ativa prioridade de atendimento e selo de distinção VIP na barbearia.
              </p>
            </div>
          </div>

          <!-- Observações Gerais -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Coffee class="w-3.5 h-3.5 text-amber-500" />
              <span>Observações Livres</span>
            </label>
            <textarea 
              v-model="form.notes"
              rows="2"
              placeholder="Ex: Gosta de atendimento silencioso, corte com tesoura em cima..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition resize-none"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <button 
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="saving"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span>{{ isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                               -->
    <!-- ============================================================== -->
    <div 
      v-if="showDeleteModal" 
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-scrollbar"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center transition-colors">
        
        <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50 dark:ring-rose-950/30">
          <Trash2 class="w-8 h-8 stroke-[2]" />
        </div>

        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Remover Cliente?</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Tem certeza que deseja remover o cliente <strong class="text-slate-900 dark:text-white font-bold">{{ customerToDelete?.name }}</strong>?
        </p>
        <p class="text-[11px] text-amber-600 dark:text-amber-400 mt-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-center justify-center gap-1.5">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>Clientes com histórico de atendimentos não podem ser excluídos para manter a integridade fiscal e de comissões.</span>
        </p>

        <div class="mt-6 flex items-center justify-center gap-3">
          <button 
            type="button"
            @click="showDeleteModal = false"
            class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button"
            :disabled="deleting"
            @click="confirmDeleteCustomer"
            class="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
            <span>Sim, Excluir</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>
