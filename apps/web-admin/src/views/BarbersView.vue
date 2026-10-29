<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import {
  Power,
  UserCheck, 
  Plus, 
  Scissors, 
  Sparkles, 
  Search, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Percent, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  Phone, 
  Mail, 
  X, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertTriangle,
  ArrowRight,
  Calculator,
  User,
  Info,
  LayoutGrid,
  List,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  MessageCircle,
  ExternalLink,
  Clock,
  CheckCircle2
} from 'lucide-vue-next';
import { api, type Barber } from '../services/api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

// ================= ESTADO PRINCIPAL =================
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const savingQuickPhoto = ref(false);
const barbers = ref<Barber[]>([]);
const searchQuery = ref('');
const copiedPixId = ref<string | null>(null);

// Alternância entre Cards e Lista (com persistência no LocalStorage)
const viewMode = ref<'CARDS' | 'LIST'>((localStorage.getItem('barbly_barbers_view') as 'CARDS' | 'LIST') || 'CARDS');

function setViewMode(mode: 'CARDS' | 'LIST') {
  playPopSound();
  viewMode.value = mode;
  localStorage.setItem('barbly_barbers_view', mode);
}

// ================= BANCO DE FOTOS DE BARBEIROS (ALTA RESOLUÇÃO) =================
const avatarPresets = [
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    label: 'Corte Moderno',
  },
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    label: 'Barba Alinhada',
  },
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    label: 'Estilo Urbano',
  },
  {
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    label: 'Perfil Clássico',
  },
  {
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    label: 'Barbeiro Master',
  },
  {
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    label: 'Fade & Degradê',
  },
  {
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80',
    label: 'Navalha & Tesoura',
  },
  {
    url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80',
    label: 'Hair Stylist',
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


// ================= STATUS FILTER & OPERACIONAL =================
const selectedStatusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

const inactiveBarbersCount = computed(() => {
  return barbers.value.filter(b => b.active === false).length;
});

async function setOperationalStatus(barber: Barber, status: 'AVAILABLE' | 'BREAK' | 'CLEANING') {
  playPopSound();
  try {
    await api.setBarberOperationalStatus(barber.id, status);
    barber.operationalStatus = status;
    if (status === 'AVAILABLE') {
      barber.operationalMessage = 'Disponível';
      toast.success(`${barber.name} está Disponível na bancada!`, 'Status da Bancada');
    } else if (status === 'BREAK') {
      barber.operationalMessage = 'Em Almoço / Pausa';
      toast.info(`${barber.name} entrou em Almoço / Pausa.`, 'Status da Bancada');
    } else if (status === 'CLEANING') {
      barber.operationalMessage = 'Limpeza de Bancada';
      toast.info(`${barber.name} está em Limpeza de Bancada.`, 'Status da Bancada');
    }
  } catch (err: any) {
    toast.error(err.message || 'Erro ao alterar status operacional da cadeira', 'Erro');
  }
}

async function toggleBarberStatus(barber: Barber) {
  playPopSound();
  try {
    const res = await api.toggleBarberActive(barber.id);
    barber.active = res.active;
    if (res.active) {
      toast.success(`Profissional "${barber.name}" reativado na equipe!`, 'Profissional Ativo');
    } else {
      toast.info(`Profissional "${barber.name}" pausado da equipe.`, 'Profissional Pausado');
    }
  } catch (err: any) {
    toast.error(err.message || 'Erro ao alterar status do profissional', 'Erro');
  }
}

// ================= DATATABLE & PAGINAÇÃO (BARBEIROS) =================
const currentPage = ref(1);
const itemsPerPage = ref(10);
const pageSizeOptions = [5, 10, 20, 50];

type BarberSortField = 'name' | 'chair' | 'commissionRate' | 'active' | 'operationalStatus';
const sortField = ref<BarberSortField>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

function toggleSort(field: BarberSortField) {
  playPopSound();
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

watch([searchQuery, selectedStatusFilter, itemsPerPage], () => {
  currentPage.value = 1;
});

const sortedBarbers = computed(() => {
  const list = [...filteredBarbers.value];
  return list.sort((a, b) => {
    let aVal: any = a[sortField.value];
    let bVal: any = b[sortField.value];

    if (sortField.value === 'commissionRate') {
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
  const total = Math.ceil(sortedBarbers.value.length / itemsPerPage.value);
  return total > 0 ? total : 1;
});

const paginatedBarbers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return sortedBarbers.value.slice(start, start + itemsPerPage.value);
});

const paginationStartIndex = computed(() => {
  if (sortedBarbers.value.length === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage.value + 1;
});

const paginationEndIndex = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, sortedBarbers.value.length);
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

// ================= SIMULADOR LEI SALÃO-PARCEIRO =================
const simServicePrice = ref<number>(60);
const simCommissionRate = ref<number>(50);

const simBarberShare = computed(() => {
  return (simServicePrice.value * simCommissionRate.value) / 100;
});

const simSalonShare = computed(() => {
  return simServicePrice.value - simBarberShare.value;
});

const pricePresets = [40, 60, 80, 120, 150];
const commissionPresets = [40, 50, 60, 70];

// ================= MODAL DE CADASTRO / EDIÇÃO COMPLETO =================
const isFormModalOpen = ref(false);
const isEditing = ref(false);
const editingBarberId = ref<string | null>(null);
const photoTab = ref<'upload' | 'presets' | 'url'>('upload');
const activeModalTab = ref<'GENERAL' | 'SCHEDULE'>('GENERAL');

// Horários de trabalho padrão por dia
const defaultBarberSchedule: Record<string, { open: string; close: string; lunchStart?: string; lunchEnd?: string; closed: boolean }> = {
  monday: { open: '09:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  tuesday: { open: '09:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  wednesday: { open: '09:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  thursday: { open: '09:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  friday: { open: '09:00', close: '19:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  saturday: { open: '08:00', close: '18:00', lunchStart: '12:00', lunchEnd: '13:00', closed: false },
  sunday: { open: '09:00', close: '14:00', lunchStart: '', lunchEnd: '', closed: true },
};

const dayKeyToScheduleKey: Record<string, string> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
};

const scheduleKeyToDayKey: Record<string, string> = {
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
  sunday: 'sun',
};

const form = reactive({
  name: '',
  nickname: '',
  phone: '',
  email: '',
  avatarUrl: '',
  document: '',
  chair: 'Cadeira 1 - Principal',
  commissionRate: 50,
  pixKey: '',
  specialties: 'Degradê Navalhado, Barboterapia',
  workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as string[],
  customSchedule: JSON.parse(JSON.stringify(defaultBarberSchedule)) as Record<string, any>,
  bio: '',
});

function copyMondayToWeek() {
  playPopSound();
  const mon = form.customSchedule.monday;
  ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
    form.customSchedule[day] = { ...mon };
  });
  toast.success('Horários de segunda-feira replicados para terça a sexta!', 'Escala Copiada');
}

function copySalonHours() {
  playPopSound();
  form.customSchedule = JSON.parse(JSON.stringify(defaultBarberSchedule));
  toast.success('Horários restaurados para o padrão do salão!', 'Padrão Restaurado');
}

const totalWeeklyWorkingHours = computed(() => {
  let totalMin = 0;
  for (const day of Object.values(form.customSchedule)) {
    if (!day.closed && day.open && day.close) {
      const [oh, om] = (day.open as string).split(':').map(Number);
      const [ch, cm] = (day.close as string).split(':').map(Number);
      let dayMin = (ch * 60 + cm) - (oh * 60 + om);
      if (day.lunchStart && day.lunchEnd) {
        const [lh1, lm1] = (day.lunchStart as string).split(':').map(Number);
        const [lh2, lm2] = (day.lunchEnd as string).split(':').map(Number);
        dayMin -= (lh2 * 60 + lm2) - (lh1 * 60 + lm1);
      }
      if (dayMin > 0) totalMin += dayMin;
    }
  }
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
});

const commonSpecialties = [
  'Degradê Navalhado',
  'Barboterapia',
  'Corte Clássico',
  'Platinado & Coloração',
  'Pigmentação',
  'Alinhamento de Barba',
  'Corte Infantil',
  'Sobrancelha',
];

const availableChairs = [
  'Cadeira 1 - Principal',
  'Cadeira 2 - Estação VIP',
  'Cadeira 3 - Barboterapia',
  'Cadeira 4 - Master',
  'Cadeira 5 - Express',
];

const daysOfWeek = [
  { key: 'mon', label: 'Seg', full: 'Segunda-feira' },
  { key: 'tue', label: 'Ter', full: 'Terça-feira' },
  { key: 'wed', label: 'Qua', full: 'Quarta-feira' },
  { key: 'thu', label: 'Qui', full: 'Quinta-feira' },
  { key: 'fri', label: 'Sex', full: 'Sexta-feira' },
  { key: 'sat', label: 'Sáb', full: 'Sábado' },
  { key: 'sun', label: 'Dom', full: 'Domingo' },
];

// ================= MODAL RÁPIDO DE FOTO (ATALHO DIRETO) =================
const isQuickPhotoModalOpen = ref(false);
const quickPhotoBarber = ref<Barber | null>(null);
const quickPhotoUrl = ref('');
const quickPhotoTab = ref<'upload' | 'presets' | 'url'>('upload');

function openQuickPhotoModal(barber: Barber) {
  playPopSound();
  quickPhotoBarber.value = barber;
  quickPhotoUrl.value = barber.avatarUrl || '';
  quickPhotoTab.value = 'upload';
  isQuickPhotoModalOpen.value = true;
}

async function handleSaveQuickPhoto() {
  if (!quickPhotoBarber.value) return;
  playPopSound();
  savingQuickPhoto.value = true;
  try {
    await api.updateBarber(quickPhotoBarber.value.id, {
      avatarUrl: quickPhotoUrl.value.trim() || undefined,
    });
    quickPhotoBarber.value.avatarUrl = quickPhotoUrl.value.trim();
    toast.success('Foto de perfil do barbeiro atualizada com sucesso!', 'Foto Atualizada');
    isQuickPhotoModalOpen.value = false;
    await loadBarbers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao atualizar foto do profissional', 'Erro');
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
    playPopSound();
    toast.success('Foto carregada com sucesso!', 'Pronta para Salvar');
  } catch (err) {
    toast.error('Erro ao processar imagem. Tente outro arquivo.', 'Falha no Upload');
  }
}

// ================= MODAL DE CONFIRMAÇÃO DE DESATIVAÇÃO =================
const isDeleteModalOpen = ref(false);
const barberToDelete = ref<Barber | null>(null);

// ================= CARREGAMENTO DE DADOS =================
async function loadBarbers() {
  loading.value = true;
  try {
    const data = await api.getBarbers();
    barbers.value = data;
  } catch (err: any) {
    toast.error(err.message || 'Erro ao carregar profissionais', 'Erro na API');
  } finally {
    loading.value = false;
  }
}

// Filtro de busca e status
const filteredBarbers = computed(() => {
  return barbers.value.filter((b) => {
    if (selectedStatusFilter.value === 'ACTIVE' && b.active === false) return false;
    if (selectedStatusFilter.value === 'INACTIVE' && b.active !== false) return false;

    if (!searchQuery.value.trim()) return true;
    const q = searchQuery.value.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.nickname && b.nickname.toLowerCase().includes(q)) ||
      (b.chair && b.chair.toLowerCase().includes(q)) ||
      (b.specialties && b.specialties.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });
});

// Métricas de topo
const activeBarbersCount = computed(() => {
  return barbers.value.filter(b => b.active !== false).length;
});

const avgCommission = computed(() => {
  if (!barbers.value.length) return 0;
  const sum = barbers.value.reduce((acc, b) => acc + (Number(b.commissionRate) || 0), 0);
  return Math.round(sum / barbers.value.length);
});

// Verifica se o profissional trabalha hoje
function isWorkingToday(workingDaysStr?: string): boolean {
  if (!workingDaysStr) return true;
  const todayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = dayKeys[todayIndex];
  const list = workingDaysStr.toLowerCase().split(',').map(s => s.trim());
  return list.includes(todayKey);
}

// ================= AÇÕES DO FORMULÁRIO PRINCIPAL =================
function openCreateModal() {
  playPopSound();
  isEditing.value = false;
  editingBarberId.value = null;
  activeModalTab.value = 'GENERAL';
  form.name = '';
  form.nickname = '';
  form.phone = '';
  form.email = '';
  form.avatarUrl = '';
  form.document = '';
  form.chair = `Cadeira ${barbers.value.length + 1} - Estação VIP`;
  form.commissionRate = 50;
  form.pixKey = '';
  form.specialties = 'Degradê Navalhado, Barboterapia';
  form.workingDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  form.customSchedule = JSON.parse(JSON.stringify(defaultBarberSchedule));
  form.bio = 'Profissional especialista BarblyClub';
  photoTab.value = 'upload';
  isFormModalOpen.value = true;
}

function openEditModal(barber: Barber) {
  playPopSound();
  isEditing.value = true;
  editingBarberId.value = barber.id;
  activeModalTab.value = 'GENERAL';
  form.name = barber.name || '';
  form.nickname = barber.nickname || '';
  form.phone = barber.phone || '';
  form.email = barber.email || '';
  form.avatarUrl = barber.avatarUrl || '';
  form.document = barber.document || '';
  form.chair = barber.chair || 'Cadeira 1 - Principal';
  form.commissionRate = barber.commissionRate ?? 50;
  form.pixKey = barber.pixKey || barber.phone || '';
  form.specialties = barber.specialties || 'Degradê Navalhado, Barboterapia';
  form.bio = barber.bio || '';
  
  if (barber.customSchedule && typeof barber.customSchedule === 'object') {
    form.customSchedule = {
      ...JSON.parse(JSON.stringify(defaultBarberSchedule)),
      ...barber.customSchedule,
    };
  } else {
    const sched = JSON.parse(JSON.stringify(defaultBarberSchedule));
    const days = barber.workingDays ? barber.workingDays.split(',').map(d => d.trim().toLowerCase()) : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    for (const [sKey, dKey] of Object.entries(scheduleKeyToDayKey)) {
      sched[sKey].closed = !days.includes(dKey);
    }
    form.customSchedule = sched;
  }

  const activeDays: string[] = [];
  for (const [sKey, dKey] of Object.entries(scheduleKeyToDayKey)) {
    if (!form.customSchedule[sKey].closed) {
      activeDays.push(dKey);
    }
  }
  form.workingDays = activeDays;

  photoTab.value = form.avatarUrl ? 'presets' : 'upload';
  isFormModalOpen.value = true;
}

// Upload de foto no formulário principal
async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  try {
    const compressed = await compressImage(target.files[0]);
    form.avatarUrl = compressed;
    playPopSound();
    toast.success('Foto carregada com sucesso!', 'Imagem Selecionada');
  } catch (err) {
    toast.error('Erro ao ler arquivo de foto', 'Erro');
  }
}

function toggleWorkingDay(key: string) {
  playPopSound();
  const schedKey = dayKeyToScheduleKey[key];
  if (schedKey && form.customSchedule[schedKey]) {
    form.customSchedule[schedKey].closed = !form.customSchedule[schedKey].closed;
  }
  const index = form.workingDays.indexOf(key);
  if (index > -1) {
    if (form.workingDays.length > 1) {
      form.workingDays.splice(index, 1);
    }
  } else {
    form.workingDays.push(key);
  }
}

function toggleSpecialtyTag(spec: string) {
  playPopSound();
  const currentList = form.specialties
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  const idx = currentList.indexOf(spec);
  if (idx > -1) {
    currentList.splice(idx, 1);
  } else {
    currentList.push(spec);
  }
  form.specialties = currentList.join(', ');
}

async function handleSaveBarber() {
  if (!form.name.trim()) {
    toast.error('Informe o nome completo do profissional.', 'Campo Obrigatório');
    return;
  }
  if (!form.phone.trim()) {
    toast.error('Informe o telefone / WhatsApp do profissional.', 'Campo Obrigatório');
    return;
  }

  // Sincroniza dias ativos
  const activeDays: string[] = [];
  for (const [sKey, dKey] of Object.entries(scheduleKeyToDayKey)) {
    if (!form.customSchedule[sKey].closed) {
      activeDays.push(dKey);
    }
  }
  form.workingDays = activeDays.length > 0 ? activeDays : ['mon'];

  playPopSound();
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
      avatarUrl: form.avatarUrl.trim() || undefined,
      document: form.document.trim() || undefined,
      pixKey: form.pixKey.trim() || form.phone.trim(),
      commissionRate: Number(form.commissionRate),
      chair: form.chair.trim() || 'Cadeira 1',
      specialties: form.specialties.trim(),
      workingDays: form.workingDays.join(','),
      customSchedule: form.customSchedule,
      bio: form.bio.trim() || undefined,
    };

    if (isEditing.value && editingBarberId.value) {
      const res = await api.updateBarber(editingBarberId.value, payload);
      toast.success(res.message || 'Profissional atualizado com sucesso!', 'Sucesso');
    } else {
      const res = await api.createBarber(payload);
      toast.success(res.message || 'Novo profissional cadastrado com sucesso!', 'Equipe BarblyClub');
    }

    isFormModalOpen.value = false;
    await loadBarbers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao salvar profissional', 'Falha no salvamento');
  } finally {
    saving.value = false;
  }
}

// ================= DESATIVAÇÃO =================
function confirmDelete(barber: Barber) {
  playPopSound();
  barberToDelete.value = barber;
  isDeleteModalOpen.value = true;
}

async function handleDeleteBarber() {
  if (!barberToDelete.value) return;

  playPopSound();
  deleting.value = true;
  try {
    const res = await api.deleteBarber(barberToDelete.value.id);
    toast.success(res.message || 'Profissional desativado com sucesso.', 'Atualizado');
    isDeleteModalOpen.value = false;
    barberToDelete.value = null;
    await loadBarbers();
  } catch (err: any) {
    toast.error(err.message || 'Erro ao desativar profissional', 'Erro');
  } finally {
    deleting.value = false;
  }
}

// ================= UTILITÁRIOS =================
function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function copyPixKey(key: string, id: string) {
  if (!key) return;
  playPopSound();
  navigator.clipboard.writeText(key);
  copiedPixId.value = id;
  toast.success('Chave Pix copiada para a área de transferência!', 'Copiado');
  setTimeout(() => {
    if (copiedPixId.value === id) {
      copiedPixId.value = null;
    }
  }, 2500);
}

function parseWorkingDays(str?: string): string[] {
  if (!str) return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return str.split(',').map(s => s.trim().toLowerCase());
}

function parseSpecialties(str?: string): string[] {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function formatPhoneLink(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  const withDdi = clean.startsWith('55') ? clean : `55${clean}`;
  return `https://wa.me/${withDdi}`;
}

onMounted(() => {
  loadBarbers();
});
</script>

<template>
  <div class="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] w-full mx-auto font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors no-scrollbar">
    
    <!-- ============================================== -->
    <!-- TOP HEADER COM IDENTIDADE BARBLYCLUB           -->
    <!-- ============================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Lei nº 13.352 (Salão-Parceiro)
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 class="w-3 h-3 text-emerald-500" /> Split Automático Ativo
          </span>
        </div>
        <h1 class="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
          Equipe &amp; Barbeiros Parceiros
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Controle completo de fotos de perfil, cadeiras de atendimento, escala semanal, taxa de comissão e repasse Pix.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 shrink-0">
        <button 
          @click="loadBarbers" 
          class="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e131d] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer shadow-sm"
          title="Recarregar profissionais"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button 
          @click="openCreateModal"
          class="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus class="w-4 h-4 text-black stroke-[3]" />
          <span>+ Novo Profissional</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- 4 QUICK STATS CARDS                            -->
    <!-- ============================================== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Stat 1 -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1 transition hover:border-amber-500/30">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Equipe Ativa</span>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-black text-slate-900 dark:text-white">{{ activeBarbersCount }}</span>
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
            <UserCheck class="w-5 h-5" />
          </div>
        </div>
        <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Profissionais com agenda ativa</span>
      </div>

      <!-- Stat 2 -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1 transition hover:border-emerald-500/30">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Comissão Média</span>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ avgCommission }}%</span>
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Percent class="w-5 h-5" />
          </div>
        </div>
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Cota-parte média dos parceiros</span>
      </div>

      <!-- Stat 3 -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1 transition hover:border-blue-500/30">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Cadeiras &amp; Estações</span>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-black text-blue-600 dark:text-blue-400">{{ activeBarbersCount }} / 5</span>
          <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scissors class="w-5 h-5" />
          </div>
        </div>
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Estações ocupadas no salão</span>
      </div>

      <!-- Stat 4 -->
      <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm space-y-1 transition hover:border-amber-500/30">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Isenção Fiscal</span>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-black text-amber-500">100%</span>
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ShieldCheck class="w-5 h-5" />
          </div>
        </div>
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Zero risco de bitributação</span>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- WIDGET SIMULADOR DA LEI DO SALÃO-PARCEIRO      -->
    <!-- ============================================== -->
    <div class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <Calculator class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Simulador de Split (Lei do Salão-Parceiro)</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Divisão transparente de comissão entre a barbearia e os parceiros sem imposto duplicado.</p>
          </div>
        </div>

        <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 self-start md:self-auto">
          Segurança Jurídica Oficial
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <!-- Controles do Simulador -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Preço do Serviço -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs">
              <span class="font-bold text-slate-700 dark:text-slate-300">Valor do Atendimento:</span>
              <span class="font-black text-amber-600 dark:text-amber-400 font-mono-num text-sm">{{ formatCurrency(simServicePrice) }}</span>
            </div>
            <input 
              v-model.number="simServicePrice" 
              type="range" 
              min="20" 
              max="200" 
              step="5" 
              class="w-full h-2 rounded-lg bg-slate-200 dark:bg-white/10 accent-amber-500 cursor-pointer"
            />
            <div class="flex gap-2 flex-wrap pt-1">
              <span class="text-[10px] text-slate-400 font-bold self-center">Atalhos:</span>
              <button 
                v-for="p in pricePresets" 
                :key="p"
                @click="simServicePrice = p; playPopSound()"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                :class="simServicePrice === p ? 'bg-amber-500 text-black shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white'"
              >
                R$ {{ p }}
              </button>
            </div>
          </div>

          <!-- Comissão do Barbeiro -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs">
              <span class="font-bold text-slate-700 dark:text-slate-300">Comissão do Barbeiro Parceiro:</span>
              <span class="font-black text-emerald-600 dark:text-emerald-400 font-mono-num text-sm">{{ simCommissionRate }}%</span>
            </div>
            <input 
              v-model.number="simCommissionRate" 
              type="range" 
              min="10" 
              max="90" 
              step="5" 
              class="w-full h-2 rounded-lg bg-slate-200 dark:bg-white/10 accent-emerald-500 cursor-pointer"
            />
            <div class="flex gap-2 flex-wrap pt-1">
              <span class="text-[10px] text-slate-400 font-bold self-center">Percentuais Comuns:</span>
              <button 
                v-for="c in commissionPresets" 
                :key="c"
                @click="simCommissionRate = c; playPopSound()"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                :class="simCommissionRate === c ? 'bg-emerald-500 text-black shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white'"
              >
                {{ c }}%
              </button>
            </div>
          </div>
        </div>

        <!-- Resultado Visual da Divisão -->
        <div class="lg:col-span-5 grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10">
          <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Barbeiro Recebe</span>
            <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num block">{{ formatCurrency(simBarberShare) }}</span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Direto no Pix (Cota-parte)</span>
          </div>

          <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Barbearia Retém</span>
            <span class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono-num block">{{ formatCurrency(simSalonShare) }}</span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Tributa apenas sua cota</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- TOOLBAR: BUSCA, STATUS FILTER & VIEW TOGGLE    -->
    <!-- ============================================== -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Left: Search Input & Filter Chips -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-2xl">
        <div class="relative flex-1 min-w-[240px]">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar por nome, cadeira, especialidade..."
            class="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-sm"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''; playPopSound()"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Filter Chips: Todos / Ativos / Pausados -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button 
            @click="selectedStatusFilter = 'ALL'; playPopSound()"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
            :class="selectedStatusFilter === 'ALL' ? 'bg-amber-500 text-black shadow-sm font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <span>Todos</span>
            <span class="text-[10px] ml-1 px-1.5 py-0.2 rounded-full" :class="selectedStatusFilter === 'ALL' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10'">
              {{ barbers.length }}
            </span>
          </button>

          <button 
            @click="selectedStatusFilter = 'ACTIVE'; playPopSound()"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
            :class="selectedStatusFilter === 'ACTIVE' ? 'bg-amber-500 text-black shadow-sm font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <span>Ativos</span>
            <span class="text-[10px] ml-1 px-1.5 py-0.2 rounded-full" :class="selectedStatusFilter === 'ACTIVE' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10'">
              {{ activeBarbersCount }}
            </span>
          </button>

          <button 
            @click="selectedStatusFilter = 'INACTIVE'; playPopSound()"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
            :class="selectedStatusFilter === 'INACTIVE' ? 'bg-amber-500 text-black shadow-sm font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            <span>Pausados</span>
            <span class="text-[10px] ml-1 px-1.5 py-0.2 rounded-full" :class="selectedStatusFilter === 'INACTIVE' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10'">
              {{ inactiveBarbersCount }}
            </span>
          </button>
        </div>
      </div>

      <!-- Segmented Control (Cards vs Lista) -->
      <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-2xl self-end sm:self-auto shadow-sm">
        <button 
          @click="setViewMode('CARDS')"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          :class="viewMode === 'CARDS' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          title="Exibir em Grade de Cards"
        >
          <LayoutGrid class="w-4 h-4" />
          <span>Cards</span>
          <span 
            class="text-[10px] px-1.5 py-0.2 rounded-full"
            :class="viewMode === 'CARDS' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-500'"
          >
            {{ filteredBarbers.length }}
          </span>
        </button>

        <button 
          @click="setViewMode('LIST')"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          :class="viewMode === 'LIST' ? 'bg-amber-500 text-black shadow-md font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          title="Exibir em Tabela / Lista Detalhada"
        >
          <List class="w-4 h-4" />
          <span>Lista</span>
          <span 
            class="text-[10px] px-1.5 py-0.2 rounded-full"
            :class="viewMode === 'LIST' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-500'"
          >
            {{ filteredBarbers.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 class="w-8 h-8 animate-spin text-amber-500" />
      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando profissionais da barbearia...</span>
    </div>

    <!-- EMPTY STATE -->
    <div v-else-if="filteredBarbers.length === 0" class="text-center py-16 bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-8 space-y-4">
      <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto">
        <UserCheck class="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Nenhum profissional encontrado</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          {{ searchQuery ? 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos.' : 'Sua equipe ainda não possui profissionais cadastrados.' }}
        </p>
      </div>
      <button 
        v-if="!searchQuery"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition cursor-pointer"
      >
        + Cadastrar Primeiro Barbeiro
      </button>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 1: GRADE DE CARDS (FOTOS EM DESTAQUE, AÇÕES E STATUS)     -->
    <!-- ============================================================== -->
    <div v-else-if="viewMode === 'CARDS'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
      <div 
        v-for="barber in filteredBarbers" 
        :key="barber.id"
        class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-5 shadow-sm hover:border-amber-500/40 hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden"
      >
        <div class="space-y-4">
          <!-- Top Row: Foto do Barbeiro + Informações + Status Hoje -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3.5">
              
              <!-- Avatar Circle com Foto Real e Botão de Troca Rápida de Foto -->
              <div class="relative group/avatar cursor-pointer shrink-0" @click="openQuickPhotoModal(barber)" title="Clique para trocar a foto de perfil">
                <div class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-amber-500/40 bg-slate-100 dark:bg-black/50 shadow-md transition group-hover/avatar:ring-amber-500">
                  <img 
                    v-if="barber.avatarUrl" 
                    :src="barber.avatarUrl" 
                    :alt="barber.name" 
                    class="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                    @error="(e: any) => e.target.style.display = 'none'"
                  />
                  <div 
                    v-else 
                    class="w-full h-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-black text-xl"
                  >
                    {{ barber.name.charAt(0) }}
                  </div>
                </div>

                <!-- Overlay de Câmera no Hover para Troca de Foto -->
                <div class="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera class="w-5 h-5 text-amber-400" />
                </div>

                <!-- Ponto de Status Verde se Ativo Hoje -->
                <span 
                  class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#0e131d]"
                  :class="isWorkingToday(barber.workingDays) ? 'bg-emerald-500' : 'bg-slate-400'"
                  :title="isWorkingToday(barber.workingDays) ? 'Disponível Hoje' : 'Folga Hoje'"
                ></span>
              </div>

              <!-- Nome, Cargo e Cadeira -->
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                    {{ barber.name }}
                  </h3>
                </div>

                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span 
                    class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider"
                    :class="barber.role === 'OWNER' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'"
                  >
                    {{ barber.role === 'OWNER' ? 'Proprietário' : 'Parceiro' }}
                  </span>

                  <span 
                    class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    :class="isWorkingToday(barber.workingDays) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
                  >
                    {{ isWorkingToday(barber.workingDays) ? 'Hoje: Disponível' : 'Hoje: Folga' }}
                  </span>
                </div>

                <span class="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1 truncate">
                  {{ barber.chair || 'Cadeira 1' }}
                </span>

                <!-- Status Operacional Cockpit (Livre, Almoço, Limpeza) -->
                <div class="flex items-center gap-1 mt-2">
                  <button 
                    @click="setOperationalStatus(barber, 'AVAILABLE')"
                    type="button"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'AVAILABLE' || !barber.operationalStatus 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira como Disponível"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Livre</span>
                  </button>

                  <button 
                    @click="setOperationalStatus(barber, 'BREAK')"
                    type="button"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'BREAK' 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira em Almoço / Pausa"
                  >
                    <span>☕</span>
                    <span>Pausa</span>
                  </button>

                  <button 
                    @click="setOperationalStatus(barber, 'CLEANING')"
                    type="button"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'CLEANING' 
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira em Limpeza"
                  >
                    <span>🧹</span>
                    <span>Limpeza</span>
                  </button>
                </div>

              </div>
            </div>

            <!-- Botão de Ação Rápida WhatsApp -->
            <a 
              v-if="barber.phone"
              :href="formatPhoneLink(barber.phone)"
              target="_blank"
              class="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer shrink-0"
              title="Conversar com o barbeiro no WhatsApp"
            >
              <MessageCircle class="w-4 h-4" />
            </a>
          </div>

          <!-- Tags de Especialidades -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            <span 
              v-for="(spec, i) in parseSpecialties(barber.specialties)" 
              :key="i"
              class="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5"
            >
              {{ spec }}
            </span>
          </div>

          <!-- Card de Comissão e Chave Pix -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Comissão (Split):</span>
              <span class="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono-num">
                {{ barber.commissionRate }}% por serviço
              </span>
            </div>

            <!-- Chave Pix -->
            <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
              <span class="text-[11px] text-slate-400 flex items-center gap-1">
                <CreditCard class="w-3.5 h-3.5 text-amber-500" /> Pix:
              </span>
              <div class="flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                <span class="truncate">{{ barber.pixKey || barber.phone || 'Não informada' }}</span>
                <button 
                  v-if="barber.pixKey || barber.phone"
                  @click="copyPixKey(barber.pixKey || barber.phone, barber.id)"
                  class="p-1 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                  title="Copiar Chave Pix"
                >
                  <Check v-if="copiedPixId === barber.id" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Escala Semanal de Trabalho -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Escala Semanal:</span>
              <button 
                @click="openEditModal(barber); activeModalTab = 'SCHEDULE'"
                class="text-amber-500 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
              >
                <Clock class="w-3 h-3" />
                <span>Ver / Editar Horários</span>
              </button>
            </div>
            <div class="flex gap-1">
              <span 
                v-for="d in daysOfWeek" 
                :key="d.key"
                class="flex-1 py-1 text-center text-[10px] font-bold rounded-lg transition"
                :class="parseWorkingDays(barber.workingDays).includes(d.key) ? 'bg-amber-500 text-black shadow-xs' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600'"
                :title="d.full"
              >
                {{ d.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Actions: Editar / Trocar Foto / Desativar -->
        <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <button 
            @click="openQuickPhotoModal(barber)"
            class="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Camera class="w-3.5 h-3.5" />
            <span>Foto</span>
          </button>

          <div class="flex items-center gap-1.5">
            <button 
              v-if="barber.role !== 'OWNER'"
              @click="toggleBarberStatus(barber)"
              class="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold transition cursor-pointer"
              :class="barber.active !== false ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'"
              :title="barber.active !== false ? 'Pausar profissional da equipe' : 'Reativar profissional na equipe'"
            >
              <Power class="w-3.5 h-3.5" />
            </button>

            <button 
              @click="openEditModal(barber)"
              class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button 
              v-if="barber.role !== 'OWNER'"
              @click="confirmDelete(barber)"
              class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
              title="Desativar profissional"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: TABELA / LISTA DETALHADA (DATATABLE COM PAGINAÇÃO)     -->
    <!-- ============================================================== -->
    <div v-else-if="viewMode === 'LIST'" class="bg-white dark:bg-[#0e131d]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
      
      <!-- Datatable Top Bar (Itens por página & Contador) -->
      <div class="px-6 py-3.5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500 dark:text-slate-400">Exibir</span>
          <select
            v-model.number="itemsPerPage"
            class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
          >
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <span class="text-xs text-slate-500 dark:text-slate-400">profissionais por página</span>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>Total:</span>
          <span class="font-bold text-slate-900 dark:text-white font-mono-num">{{ sortedBarbers.length }}</span>
          <span>profissionais</span>
          <span v-if="searchQuery || selectedStatusFilter !== 'ALL'" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold ml-1">
            Filtro ativo
          </span>
        </div>
      </div>

      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <tr>
              <th class="py-4 px-6 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('name')" title="Ordenar por Nome">
                <div class="flex items-center gap-1.5">
                  <span>Profissional</span>
                  <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'name' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                </div>
              </th>
              <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('chair')" title="Ordenar por Cargo/Cadeira">
                <div class="flex items-center gap-1.5">
                  <span>Cargo &amp; Cadeira</span>
                  <ArrowUp v-if="sortField === 'chair' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'chair' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                </div>
              </th>
              <th class="py-4 px-4">Status da Bancada</th>
              <th class="py-4 px-4">WhatsApp</th>
              <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('commissionRate')" title="Ordenar por Comissão">
                <div class="flex items-center gap-1.5">
                  <span>Comissão (Split)</span>
                  <ArrowUp v-if="sortField === 'commissionRate' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowDown v-else-if="sortField === 'commissionRate' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-amber-500" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-400 opacity-50 group-hover/th:opacity-100" />
                </div>
              </th>
              <th class="py-4 px-4">Escala &amp; Hoje</th>
              <th class="py-4 px-4 cursor-pointer select-none hover:text-amber-500 transition group/th" @click="toggleSort('active')" title="Ordenar por Status na Equipe">
                <div class="flex items-center gap-1.5">
                  <span>Status Equipe</span>
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
            <tr v-if="paginatedBarbers.length === 0">
              <td colspan="8" class="py-12 px-6 text-center">
                <div class="flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <UserCheck class="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum profissional encontrado</p>
                    <p class="text-xs text-slate-400 max-w-sm">Tente redefinir a pesquisa ou o filtro de status da equipe.</p>
                  </div>
                  <button
                    v-if="searchQuery || selectedStatusFilter !== 'ALL'"
                    @click="searchQuery = ''; selectedStatusFilter = 'ALL'; playPopSound()"
                    class="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </td>
            </tr>

            <!-- Linhas Paginadas -->
            <tr 
              v-for="barber in paginatedBarbers" 
              :key="barber.id"
              class="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition group"
              :class="{ 'opacity-65': barber.active === false }"
            >
              <!-- Foto + Nome -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div 
                    class="relative w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-amber-500/30 bg-slate-100 dark:bg-black/50 shrink-0 cursor-pointer group/tblAvatar"
                    @click="openQuickPhotoModal(barber)"
                    title="Clique para alterar a foto"
                  >
                    <img 
                      v-if="barber.avatarUrl" 
                      :src="barber.avatarUrl" 
                      :alt="barber.name" 
                      class="w-full h-full object-cover group-hover/tblAvatar:scale-110 transition"
                      @error="(e: any) => e.target.style.display = 'none'"
                    />
                    <div 
                      v-else 
                      class="w-full h-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-black text-sm"
                    >
                      {{ barber.name.charAt(0) }}
                    </div>
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover/tblAvatar:opacity-100 transition flex items-center justify-center text-white">
                      <Camera class="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 dark:text-white block">{{ barber.name }}</span>
                    <span class="text-[11px] text-slate-400">{{ barber.email || barber.phone }}</span>
                  </div>
                </div>
              </td>

              <!-- Cargo & Cadeira -->
              <td class="py-4 px-4">
                <span 
                  class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider block w-fit mb-1"
                  :class="barber.role === 'OWNER' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'"
                >
                  {{ barber.role === 'OWNER' ? 'Proprietário' : 'Parceiro' }}
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ barber.chair }}</span>
              </td>

              <!-- Status Operacional da Bancada (Interativo) -->
              <td class="py-4 px-4">
                <div class="flex items-center gap-1">
                  <button 
                    @click="setOperationalStatus(barber, 'AVAILABLE')"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'AVAILABLE' || !barber.operationalStatus 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira como Disponível"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Livre</span>
                  </button>

                  <button 
                    @click="setOperationalStatus(barber, 'BREAK')"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'BREAK' 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira em Almoço / Pausa"
                  >
                    <span>☕</span>
                    <span>Pausa</span>
                  </button>

                  <button 
                    @click="setOperationalStatus(barber, 'CLEANING')"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    :class="barber.operationalStatus === 'CLEANING' 
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40 font-black' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'"
                    title="Definir cadeira em Limpeza"
                  >
                    <span>🧹</span>
                    <span>Limpeza</span>
                  </button>
                </div>
              </td>

              <!-- Contato / WhatsApp -->
              <td class="py-4 px-4">
                <a 
                  v-if="barber.phone"
                  :href="formatPhoneLink(barber.phone)"
                  target="_blank"
                  class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                  <span>{{ barber.phone }}</span>
                </a>
                <span v-else class="text-slate-400">-</span>
              </td>

              <!-- Comissão & Chave Pix -->
              <td class="py-4 px-4">
                <span class="font-black text-emerald-600 dark:text-emerald-400 font-mono-num text-xs block">
                  {{ barber.commissionRate }}%
                </span>
                <div class="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <span class="truncate max-w-[110px]">{{ barber.pixKey || barber.phone }}</span>
                  <button 
                    v-if="barber.pixKey || barber.phone"
                    @click="copyPixKey(barber.pixKey || barber.phone, barber.id)"
                    class="p-0.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                    title="Copiar Chave Pix"
                  >
                    <Check v-if="copiedPixId === barber.id" class="w-3 h-3 text-emerald-500" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <!-- Escala Semanal e Status Hoje -->
              <td class="py-4 px-4">
                <div class="flex gap-0.5 mb-1">
                  <span 
                    v-for="d in daysOfWeek" 
                    :key="d.key"
                    class="w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded"
                    :class="parseWorkingDays(barber.workingDays).includes(d.key) ? 'bg-amber-500 text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
                    :title="d.full"
                  >
                    {{ d.label.charAt(0) }}
                  </span>
                </div>
                <span 
                  class="text-[9px] font-bold px-1.5 py-0.2 rounded"
                  :class="isWorkingToday(barber.workingDays) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'"
                >
                  {{ isWorkingToday(barber.workingDays) ? 'Disponível Hoje' : 'Folga Hoje' }}
                </span>
              </td>

              <!-- Status na Equipe (Ativo / Pausado) -->
              <td class="py-4 px-4">
                <button 
                  v-if="barber.role !== 'OWNER'"
                  @click="toggleBarberStatus(barber)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  :class="barber.active !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:bg-slate-300/60'"
                  :title="barber.active !== false ? 'Clique para pausar este profissional' : 'Clique para reativar este profissional'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="barber.active !== false ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  {{ barber.active !== false ? 'Ativo' : 'Pausado' }}
                </button>
                <span v-else class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Titular
                </span>
              </td>

              <!-- Ações da Linha -->
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button 
                    @click="openQuickPhotoModal(barber)"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Alterar Foto"
                  >
                    <Camera class="w-4 h-4" />
                  </button>
                  <button 
                    @click="openEditModal(barber); activeModalTab = 'SCHEDULE'"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Configurar Escala e Horários"
                  >
                    <Clock class="w-4 h-4" />
                  </button>
                  <button 
                    @click="openEditModal(barber); activeModalTab = 'GENERAL'"
                    class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                    title="Editar profissional"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button 
                    v-if="barber.role !== 'OWNER'"
                    @click="confirmDelete(barber)"
                    class="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Desativar profissional"
                  >
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
          Mostrando <strong class="text-slate-900 dark:text-white font-mono-num">{{ paginationStartIndex }}</strong> a <strong class="text-slate-900 dark:text-white font-mono-num">{{ paginationEndIndex }}</strong> de <strong class="text-slate-900 dark:text-white font-mono-num">{{ sortedBarbers.length }}</strong> profissionais
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

iv>

    <!-- ============================================================== -->
    <!-- MODAL RÁPIDO: ALTERAR FOTO DE PERFIL DO BARBEIRO               -->
    <!-- ============================================================== -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isQuickPhotoModalOpen && quickPhotoBarber" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm no-scrollbar"
      >
        <div 
          class="w-full max-w-lg bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl no-scrollbar"
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
                <Camera class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                  Alterar Foto: {{ quickPhotoBarber.name }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  A foto aparece para os clientes no agendamento e WhatsApp.
                </p>
              </div>
            </div>

            <button 
              @click="isQuickPhotoModalOpen = false; playPopSound()"
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
                {{ quickPhotoBarber.name.charAt(0) }}
              </div>
            </div>

            <div class="space-y-1 flex-1 min-w-0">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ quickPhotoBarber.name }}</h4>
              <p class="text-[11px] text-slate-400 truncate">{{ quickPhotoBarber.chair }}</p>
              <button 
                v-if="quickPhotoUrl" 
                @click="quickPhotoUrl = ''; playPopSound()"
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
                @click="quickPhotoTab = 'upload'; playPopSound()"
                type="button"
                class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
                :class="quickPhotoTab === 'upload' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
              >
                Upload do Computador
              </button>
              <button 
                @click="quickPhotoTab = 'presets'; playPopSound()"
                type="button"
                class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
                :class="quickPhotoTab === 'presets' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
              >
                Modelos BarblyClub
              </button>
              <button 
                @click="quickPhotoTab = 'url'; playPopSound()"
                type="button"
                class="pb-2.5 px-3 border-b-2 transition cursor-pointer"
                :class="quickPhotoTab === 'url' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'"
              >
                Link / URL
              </button>
            </div>

            <!-- Aba 1: Upload de Arquivo Local -->
            <div v-if="quickPhotoTab === 'upload'" class="space-y-2">
              <label class="block p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-black/20 text-center cursor-pointer transition">
                <UploadCloud class="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 block">Clique para escolher imagem ou arraste aqui</span>
                <span class="text-[11px] text-slate-400 block mt-1">PNG, JPG ou WEBP (compactada automaticamente)</span>
                <input type="file" accept="image/*" class="hidden" @change="handleQuickPhotoUpload" />
              </label>
            </div>

            <!-- Aba 2: Presets Modelos -->
            <div v-else-if="quickPhotoTab === 'presets'" class="space-y-2">
              <div class="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1 no-scrollbar">
                <button 
                  v-for="(preset, idx) in avatarPresets" 
                  :key="idx"
                  @click="quickPhotoUrl = preset.url; playPopSound()"
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

            <!-- Aba 3: URL Direta -->
            <div v-else-if="quickPhotoTab === 'url'" class="space-y-2">
              <input 
                v-model="quickPhotoUrl"
                type="url" 
                placeholder="https://exemplo.com/foto-barbeiro.jpg"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <!-- Ações do Modal de Foto -->
          <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2.5">
            <button 
              @click="isQuickPhotoModalOpen = false; playPopSound()"
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
    </transition>

    <!-- ============================================================== -->
    <!-- MODAL DE CADASTRO / EDIÇÃO COMPLETO                            -->
    <!-- ============================================================== -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isFormModalOpen" 
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm no-scrollbar"
      >
        <div 
          class="w-full max-w-2xl bg-white dark:bg-[#0e131d] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150"
        >
          <!-- Mobile pull pill -->
          <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0"></div>

          <!-- Header do Modal -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
                <UserCheck class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                  {{ isEditing ? 'Editar Perfil do Profissional' : 'Cadastrar Novo Barbeiro Parceiro' }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ isEditing ? 'Altere as informações de atendimento, comissão e chave Pix.' : 'Cadastre um novo parceiro dentro das regras da Lei nº 13.352.' }}
                </p>
              </div>
            </div>

            <button 
              @click="isFormModalOpen = false; playPopSound()"
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Abas de Navegação do Perfil do Barbeiro -->
          <div class="flex border-b border-slate-200 dark:border-white/10 text-xs font-bold gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button 
              type="button" 
              @click="activeModalTab = 'GENERAL'; playPopSound()"
              class="pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              :class="activeModalTab === 'GENERAL' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-white'"
            >
              <UserCheck class="w-4 h-4" />
              <span>1. Dados Gerais &amp; Repasse</span>
            </button>

            <button 
              type="button" 
              @click="activeModalTab = 'SCHEDULE'; playPopSound()"
              class="pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              :class="activeModalTab === 'SCHEDULE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-white'"
            >
              <Clock class="w-4 h-4" />
              <span>2. Escala &amp; Horários</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 font-bold ml-1">
                {{ totalWeeklyWorkingHours }}
              </span>
            </button>
          </div>

          <!-- Formulário -->
          <form @submit.prevent="handleSaveBarber" class="space-y-5">
            
            <!-- ABA 1: DADOS GERAIS & REPASSE -->
            <div v-show="activeModalTab === 'GENERAL'" class="space-y-5">
              <!-- SEÇÃO DE FOTO DO PROFISSIONAL COM PREVIEW AO VIVO -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Foto de Perfil do Barbeiro
                </label>
                <span class="text-[10px] text-slate-400">Exibida no link do cliente e na equipe</span>
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
                      placeholder="Cole o link da foto (URL) ou escolha abaixo..."
                      class="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                    <label class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                      <UploadCloud class="w-3.5 h-3.5" />
                      <span class="hidden sm:inline">Upload</span>
                      <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                    </label>
                  </div>

                  <!-- Presets Rápidos de Fotos -->
                  <div class="flex items-center gap-2 pt-1">
                    <span class="text-[10px] text-slate-400 font-bold">Modelos:</span>
                    <div class="flex gap-1.5 overflow-x-auto no-scrollbar">
                      <button 
                        v-for="(preset, idx) in avatarPresets" 
                        :key="idx"
                        @click="form.avatarUrl = preset.url; playPopSound()"
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

            <!-- Dados Cadastrais -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nome Completo *
                </label>
                <input 
                  v-model="form.name"
                  type="text" 
                  required
                  placeholder="Ex: Rafael Silva Santos"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  WhatsApp / Celular *
                </label>
                <input 
                  v-model="form.phone"
                  type="text" 
                  required
                  placeholder="Ex: 31988887777"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  E-mail de Acesso
                </label>
                <input 
                  v-model="form.email"
                  type="email" 
                  placeholder="Ex: rafael@barblyclub.com.br"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Cadeira / Estação de Atendimento
                </label>
                <select 
                  v-model="form.chair"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option v-for="c in availableChairs" :key="c" :value="c" class="bg-white dark:bg-[#121824] text-slate-900 dark:text-slate-100">{{ c }}</option>
                </select>
              </div>
            </div>

            <!-- Comissão & Chave Pix -->
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Percent class="w-4 h-4 text-emerald-500" />
                  Comissão do Profissional (Lei 13.352)
                </label>
                <span class="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono-num">
                  {{ form.commissionRate }}%
                </span>
              </div>

              <input 
                v-model.number="form.commissionRate" 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                class="w-full h-2 rounded-lg bg-slate-200 dark:bg-black/50 accent-emerald-500 cursor-pointer"
              />

              <div class="space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Chave Pix do Barbeiro (Para Repasse Automático)
                </label>
                <input 
                  v-model="form.pixKey"
                  type="text" 
                  placeholder="Ex: Celular, CPF ou E-mail do profissional"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#07090e] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <!-- Especialidades -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Especialidades do Barbeiro
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button 
                  v-for="spec in commonSpecialties" 
                  :key="spec"
                  @click="toggleSpecialtyTag(spec)"
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                  :class="form.specialties.includes(spec) ? 'bg-amber-500 text-black shadow-xs' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-white'"
                >
                  {{ spec }}
                </button>
              </div>
            </div>

            </div>
            <!-- FIM DA ABA 1 -->

            <!-- ABA 2: ESCALA & HORÁRIOS DE TRABALHO -->
            <div v-show="activeModalTab === 'SCHEDULE'" class="space-y-4">
              <!-- Info Banner & Shortcuts -->
              <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span class="font-bold text-amber-500 block">Grade de Turnos do Profissional</span>
                  <span class="text-[11px] text-slate-400">
                    Os horários fora de turno e o intervalo de almoço serão bloqueados automaticamente na agenda.
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button 
                    type="button"
                    @click="copyMondayToWeek"
                    class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-bold border border-white/10 transition cursor-pointer"
                    title="Copia os horários de segunda-feira para terça, quarta, quinta e sexta"
                  >
                    Replicar Seg p/ Semana
                  </button>
                  <button 
                    type="button"
                    @click="copySalonHours"
                    class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-bold border border-amber-500/30 transition cursor-pointer"
                  >
                    Padrão do Salão
                  </button>
                </div>
              </div>

              <!-- Weekly Schedule Rows (Monday to Sunday) -->
              <div class="space-y-2.5 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
                <div 
                  v-for="day in daysOfWeek" 
                  :key="day.key"
                  class="p-3 sm:p-3.5 rounded-2xl border transition"
                  :class="!form.customSchedule[dayKeyToScheduleKey[day.key]].closed ? 'bg-slate-50 dark:bg-[#07090e] border-slate-200 dark:border-white/10' : 'bg-slate-100/50 dark:bg-black/30 border-dashed border-slate-300 dark:border-white/5 opacity-70'"
                >
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <!-- Day Title & Status Toggle -->
                    <div class="flex items-center justify-between sm:justify-start gap-3 sm:w-44">
                      <span class="text-xs font-black text-slate-900 dark:text-white">
                        {{ day.full }}
                      </span>
                      <button 
                        type="button"
                        @click="form.customSchedule[dayKeyToScheduleKey[day.key]].closed = !form.customSchedule[dayKeyToScheduleKey[day.key]].closed; playPopSound()"
                        class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        :class="!form.customSchedule[dayKeyToScheduleKey[day.key]].closed ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'"
                      >
                        {{ !form.customSchedule[dayKeyToScheduleKey[day.key]].closed ? 'Atende' : 'Folga' }}
                      </button>
                    </div>

                    <!-- Times: Open, Close, Lunch -->
                    <div v-if="!form.customSchedule[dayKeyToScheduleKey[day.key]].closed" class="flex flex-wrap items-center gap-3 text-xs flex-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Turno:</span>
                        <input 
                          v-model="form.customSchedule[dayKeyToScheduleKey[day.key]].open" 
                          type="time" 
                          class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white dark:[color-scheme:dark]"
                        />
                        <span class="text-slate-400 font-bold">até</span>
                        <input 
                          v-model="form.customSchedule[dayKeyToScheduleKey[day.key]].close" 
                          type="time" 
                          class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white dark:[color-scheme:dark]"
                        />
                      </div>

                      <div class="flex items-center gap-1.5 sm:border-l border-slate-200 dark:border-white/10 sm:pl-3">
                        <span class="text-[10px] font-bold text-amber-500 uppercase">Almoço:</span>
                        <input 
                          v-model="form.customSchedule[dayKeyToScheduleKey[day.key]].lunchStart" 
                          type="time" 
                          class="px-2 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white dark:[color-scheme:dark]"
                        />
                        <span class="text-slate-400 font-bold">às</span>
                        <input 
                          v-model="form.customSchedule[dayKeyToScheduleKey[day.key]].lunchEnd" 
                          type="time" 
                          class="px-2 py-1.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div v-else class="text-xs text-slate-400 italic">
                      Dia livre / Sem atendimento
                    </div>

                  </div>
                </div>
              </div>

              <!-- Total Summary Footer -->
              <div class="p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                <span class="text-slate-400">Total semanal de atendimento deste profissional:</span>
                <span class="font-black text-amber-500 font-mono text-sm">{{ totalWeeklyWorkingHours }}</span>
              </div>
            </div>

            <!-- Botões de Ação do Modal -->
            <div class="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
              <button 
                @click="isFormModalOpen = false; playPopSound()"
                type="button"
                class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-[#07090e] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Loader2 v-if="saving" class="w-4 h-4 animate-spin text-black" />
                <Check v-else class="w-4 h-4 text-black stroke-[3]" />
                <span>{{ saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Profissional') }}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </transition>

    <!-- ============================================================== -->
    <!-- MODAL DE CONFIRMAÇÃO DE DESATIVAÇÃO                            -->
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
        v-if="isDeleteModalOpen && barberToDelete" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm no-scrollbar"
      >
        <div class="w-full max-w-md bg-white dark:bg-[#0e131d] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Desativar Barbeiro?</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Essa ação removerá o profissional da agenda online.</p>
            </div>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300">
            Tem certeza que deseja desativar <strong>{{ barberToDelete.name }}</strong> da equipe? A agenda e os serviços vinculados não estarão mais disponíveis para novos agendamentos.
          </p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button 
              @click="isDeleteModalOpen = false; barberToDelete = null"
              type="button"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              @click="handleDeleteBarber"
              :disabled="deleting"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="deleting" class="w-4 h-4 animate-spin" />
              <span>{{ deleting ? 'Desativando...' : 'Sim, Desativar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
