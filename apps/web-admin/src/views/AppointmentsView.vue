<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  CheckCircle2, 
  MessageCircle, 
  User, 
  Scissors, 
  DollarSign, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Play, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  CalendarDays,
  Beer,
  AlertTriangle,
  Move,
  Globe,
  Store,
  MessageSquare,
  Sparkles,
  Info,
  RotateCcw,
  UserCheck,
  Receipt
} from 'lucide-vue-next';

// FullCalendar imports
import FullCalendar from '@fullcalendar/vue3';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { 
  api, 
  type Appointment, 
  type Barber, 
  type Service, 
  type Customer, 
  type Product 
} from '../services/api';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const route = useRoute();

// Sound feedback helper
function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(550, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

// ================= DATE & CALENDAR MANAGEMENT =================
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const selectedDate = ref<string>(getTodayString());
const selectedBarberId = ref<string>('ALL');
const viewMode = ref<'FULLCALENDAR' | 'LIST'>('FULLCALENDAR');
const fullCalendarRef = ref<any>(null);

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const formatted = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const isToday = computed(() => selectedDate.value === getTodayString());

// ================= STATE & DATA =================
const isLoading = ref(false);
const appointments = ref<Appointment[]>([]);
const barbers = ref<Barber[]>([]);
const services = ref<Service[]>([]);
const customers = ref<Customer[]>([]);
const products = ref<Product[]>([]);

async function loadBarbers() {
  try {
    barbers.value = await api.getBarbers();
  } catch (err) {
    console.error('Erro ao carregar barbeiros:', err);
  }
}

async function loadServices() {
  try {
    services.value = await api.getServices();
  } catch (err) {
    console.error('Erro ao carregar serviços:', err);
  }
}

async function loadCustomers() {
  try {
    customers.value = await api.getCustomers();
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

async function loadProducts() {
  try {
    products.value = await api.getProducts();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

async function loadAppointments() {
  isLoading.value = true;
  try {
    const data = await api.getAppointments({
      date: selectedDate.value,
      barberId: selectedBarberId.value !== 'ALL' ? selectedBarberId.value : undefined
    });
    appointments.value = data;
  } catch (err: any) {
    console.error('Erro ao carregar agendamentos:', err);
    toast.error('Erro ao carregar agendamentos.');
  } finally {
    isLoading.value = false;
  }
}

// Active barbers to display as columns in FullCalendar
const activeBarbers = computed(() => {
  if (selectedBarberId.value !== 'ALL') {
    return barbers.value.filter(b => b.id === selectedBarberId.value);
  }
  return barbers.value.filter(b => b.active);
});

function parseWorkingDaysToNumbers(workingDaysStr?: string): number[] {
  if (!workingDaysStr) return [1, 2, 3, 4, 5, 6];
  const map: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
  };
  return workingDaysStr.toLowerCase().split(',').map(s => map[s.trim()] ?? 1);
}

function computeBarberBusinessHours(barber: Barber) {
  const sched = barber.customSchedule;
  const dayKeyToNumber: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  if (!sched || typeof sched !== 'object') {
    return [
      {
        daysOfWeek: parseWorkingDaysToNumbers(barber.workingDays),
        startTime: '09:00',
        endTime: '12:00',
      },
      {
        daysOfWeek: parseWorkingDaysToNumbers(barber.workingDays),
        startTime: '13:00',
        endTime: '19:00',
      }
    ];
  }

  const result: any[] = [];
  for (const [dayName, config] of Object.entries(sched)) {
    if (!config || config.closed) continue;
    const dayNum = dayKeyToNumber[dayName];
    if (dayNum === undefined) continue;

    const open = config.open || '09:00';
    const close = config.close || '19:00';
    const lunchStart = config.lunchStart;
    const lunchEnd = config.lunchEnd;

    if (lunchStart && lunchEnd && lunchStart < lunchEnd && lunchStart > open && lunchEnd < close) {
      result.push({
        daysOfWeek: [dayNum],
        startTime: open,
        endTime: lunchStart,
      });
      result.push({
        daysOfWeek: [dayNum],
        startTime: lunchEnd,
        endTime: close,
      });
    } else {
      result.push({
        daysOfWeek: [dayNum],
        startTime: open,
        endTime: close,
      });
    }
  }

  return result.length > 0 ? result : false;
}

function isBarberWorkingOnDate(b: Barber, dateStr?: string): boolean {
  if (!dateStr) return true;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayIndex = new Date(y, m - 1, d).getDay();
  const dayIndexToScheduleKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const schedKey = dayIndexToScheduleKey[dayIndex];

  if (b.customSchedule && typeof b.customSchedule === 'object' && b.customSchedule[schedKey]) {
    return !b.customSchedule[schedKey].closed;
  }

  const daysKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = daysKeys[dayIndex];
  return (b.workingDays || 'mon,tue,wed,thu,fri,sat').toLowerCase().split(',').map(s => s.trim()).includes(todayKey);
}

// FullCalendar Resources (Columns per Barber)
const calendarResources = computed(() => {
  return activeBarbers.value.map(b => {
    const isWorkingOnSelectedDate = isBarberWorkingOnDate(b, selectedDate.value);
    const businessHours = computeBarberBusinessHours(b);

    return {
      id: b.id,
      title: b.nickname || b.name,
      businessHours: businessHours,
      extendedProps: {
        fullName: b.name,
        chair: b.chair || 'Cadeira 1',
        avatarUrl: b.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        commissionRate: b.commissionRate || 50,
        isWorkingOnSelectedDate,
        customSchedule: b.customSchedule,
      }
    };
  });
});

// FullCalendar Events mapped from MySQL Appointments
const calendarEvents = computed(() => {
  return appointments.value.map(apt => {
    let bgColor = '#f59e0b'; // Amber default for confirmed
    let borderColor = '#d97706';
    let textColor = '#ffffff';

    if (apt.status === 'COMPLETED') {
      bgColor = '#10b981'; // Emerald
      borderColor = '#059669';
    } else if (apt.status === 'IN_PROGRESS') {
      bgColor = '#3b82f6'; // Blue
      borderColor = '#2563eb';
    } else if (apt.status === 'PENDING_PAYMENT') {
      bgColor = '#f97316'; // Orange
      borderColor = '#ea580c';
    } else if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      bgColor = '#64748b'; // Slate
      borderColor = '#475569';
    }

    return {
      id: apt.id,
      resourceId: apt.barber?.id,
      title: `${apt.customer?.name} - ${apt.service?.name}`,
      start: apt.startsAt,
      end: apt.endsAt,
      backgroundColor: bgColor,
      borderColor: borderColor,
      textColor: textColor,
      extendedProps: {
        appointment: apt,
      }
    };
  });
});

// ================= STATUS & ORIGIN AMIGÁVEIS =================
const APPOINTMENT_STATUS_MAP: Record<string, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotColor: string;
  description: string;
  nextStepTip: string;
}> = {
  CONFIRMED: {
    label: 'Confirmado (Aguardando Chegada)',
    shortLabel: 'Confirmado',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dotColor: 'bg-amber-400',
    description: 'Horário reservado na agenda. O cliente é aguardado na barbearia.',
    nextStepTip: 'Quando o cliente sentar na bancada, clique em "Colocar na Cadeira".',
  },
  IN_PROGRESS: {
    label: 'Em Atendimento (Na Cadeira)',
    shortLabel: 'Na Cadeira',
    badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    dotColor: 'bg-blue-400 animate-ping',
    description: 'O barbeiro está executando o serviço na cadeira neste exato momento.',
    nextStepTip: 'Ao terminar, clique em "Finalizar & Checkout" para adicionar produtos/bebidas e cobrar.',
  },
  COMPLETED: {
    label: 'Finalizado & Concluído',
    shortLabel: 'Concluído',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    description: 'Atendimento concluído com sucesso. Cobrança e repasse do barbeiro lançados no caixa.',
    nextStepTip: 'Comanda finalizada. Comissões e estoque já foram processados.',
  },
  PENDING_PAYMENT: {
    label: 'Aguardando Pagamento',
    shortLabel: 'Aguardando Pix',
    badgeClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    dotColor: 'bg-orange-400 animate-pulse',
    description: 'Aguardando confirmação de Pix ou liberação do pagamento.',
    nextStepTip: 'Clique em Finalizar & Checkout para conferir a cobrança.',
  },
  NO_SHOW: {
    label: 'Não Compareceu (Falta)',
    shortLabel: 'Faltou',
    badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    dotColor: 'bg-rose-400',
    description: 'O cliente não compareceu ao horário agendado e não desmarcou.',
    nextStepTip: 'Horário liberado na agenda para novos encaixes.',
  },
  CANCELLED: {
    label: 'Agendamento Cancelado',
    shortLabel: 'Cancelado',
    badgeClass: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    dotColor: 'bg-slate-400',
    description: 'Atendimento desmarcado previamente pela recepção ou cliente.',
    nextStepTip: 'Horário liberado na grade.',
  },
};

const BOOKING_ORIGIN_MAP: Record<string, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
}> = {
  WHATSAPP_AI: {
    label: 'WhatsApp (Robô IA Barbly)',
    shortLabel: 'WhatsApp IA',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    description: 'Agendado automaticamente pelo robô de IA via WhatsApp.',
  },
  PWA_WEB: {
    label: 'Agendamento Online (Site / PWA)',
    shortLabel: 'Site / Link',
    badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    description: 'Agendado pelo cliente através do aplicativo web ou link da barbearia.',
  },
  COUNTER_WALKIN: {
    label: 'Presencial / Balcão (Encaixe)',
    shortLabel: 'Balcão / Presencial',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    description: 'Encaixe rápido registrado no balcão pelo atendente ou barbeiro.',
  },
};

function getStatusInfo(status?: string) {
  if (!status || !APPOINTMENT_STATUS_MAP[status]) {
    return {
      label: status || 'Agendado',
      shortLabel: status || 'Agendado',
      badgeClass: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
      dotColor: 'bg-slate-400',
      description: 'Status do agendamento.',
      nextStepTip: '',
    };
  }
  return APPOINTMENT_STATUS_MAP[status];
}

function getOriginInfo(origin?: string) {
  if (!origin || !BOOKING_ORIGIN_MAP[origin]) {
    return {
      label: origin || 'Presencial / Balcão',
      shortLabel: origin || 'Balcão',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      description: 'Origem do agendamento.',
    };
  }
  return BOOKING_ORIGIN_MAP[origin];
}

function getBarberDayAppointmentsCount(barberId: string): number {
  return appointments.value.filter(a => a.barber?.id === barberId).length;
}

// FullCalendar Options Configuration
const calendarOptions = computed<any>(() => {
  return {
    schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
    plugins: [resourceTimeGridPlugin, timeGridPlugin, dayGridPlugin, interactionPlugin],
    initialView: 'resourceTimeGridDay',
    initialDate: selectedDate.value,
    locale: ptBrLocale,
    headerToolbar: false, // We control through our custom header
    resources: calendarResources.value,
    events: calendarEvents.value,
    editable: true, // Native Drag & Drop and Resizing!
    eventResizableFromStart: false,
    eventDurationEditable: true,
    nowIndicator: true, // Live line indicating current time
    slotMinTime: '08:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:15:00',
    slotLabelInterval: '01:00:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    eventMinHeight: 44,
    allDaySlot: false,
    height: 'auto',
    expandRows: true,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  };
});

// ================= DRAG & DROP AND RESIZE HANDLERS =================
async function handleEventDrop(info: any) {
  playPopSound();
  const event = info.event;
  const apt = event.extendedProps.appointment as Appointment;
  const newStart = event.start?.toISOString();
  const newEnd = event.end ? event.end.toISOString() : undefined;
  const newResource = event.getResources()[0]?.id;

  if (!apt || !newStart) {
    info.revert();
    return;
  }

  try {
    await api.rescheduleAppointment(apt.id, {
      startsAt: newStart,
      endsAt: newEnd,
      barberId: newResource || undefined,
    });
    toast.success('Horário reagendado com sucesso!');
    await loadAppointments();
  } catch (err: any) {
    info.revert();
    toast.error('Erro ao reagendar atendimento.');
  }
}

async function handleEventResize(info: any) {
  playPopSound();
  const event = info.event;
  const apt = event.extendedProps.appointment as Appointment;
  const newStart = event.start?.toISOString();
  const newEnd = event.end?.toISOString();

  if (!apt || !newStart || !newEnd) {
    info.revert();
    return;
  }

  try {
    await api.rescheduleAppointment(apt.id, {
      startsAt: newStart,
      endsAt: newEnd,
    });
    toast.success('Duração do corte ajustada na grade!');
    await loadAppointments();
  } catch (err: any) {
    info.revert();
    toast.error('Erro ao ajustar duração.');
  }
}

function handleDateClick(info: any) {
  playPopSound();
  const clickedDate = info.dateStr.split('T')[0];
  const clickedTime = info.dateStr.includes('T') 
    ? info.dateStr.split('T')[1].substring(0, 5) 
    : '14:00';
  const resourceId = info.resource?.id;

  if (resourceId) {
    const barber = barbers.value.find(b => b.id === resourceId);
    if (barber) {
      const isWorking = isBarberWorkingOnDate(barber, clickedDate);
      if (!isWorking) {
        toast.info(`Aviso: ${barber.name} está de folga nesta data. Você ainda pode registrar um encaixe manual se desejar.`);
      }
    }
  }

  openCreateModal(resourceId, clickedTime, clickedDate);
}

function handleEventClick(info: any) {
  playPopSound();
  const apt = info.event.extendedProps.appointment as Appointment;
  if (apt) {
    openDetailsModal(apt);
  }
}

// Calendar Date Navigation
function goToPrevDay() {
  playPopSound();
  const cal = fullCalendarRef.value?.getApi();
  if (cal) {
    cal.prev();
    const d = cal.getDate();
    selectedDate.value = d.toISOString().split('T')[0];
    loadAppointments();
  }
}

function goToNextDay() {
  playPopSound();
  const cal = fullCalendarRef.value?.getApi();
  if (cal) {
    cal.next();
    const d = cal.getDate();
    selectedDate.value = d.toISOString().split('T')[0];
    loadAppointments();
  }
}

function goToToday() {
  playPopSound();
  const cal = fullCalendarRef.value?.getApi();
  selectedDate.value = getTodayString();
  if (cal) {
    cal.today();
  }
  loadAppointments();
}

function onDatePickerChange() {
  const cal = fullCalendarRef.value?.getApi();
  if (cal && selectedDate.value) {
    cal.gotoDate(selectedDate.value);
    loadAppointments();
  }
}

// Daily KPIs computed from appointments
const dailyKPIs = computed(() => {
  const total = appointments.value.length;
  const completed = appointments.value.filter(a => a.status === 'COMPLETED').length;
  const inProgress = appointments.value.filter(a => a.status === 'IN_PROGRESS').length;
  const confirmed = appointments.value.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT').length;
  const totalRevenue = appointments.value
    .filter(a => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (Number(a.finalPrice) || 0), 0);
  const estimatedRevenue = appointments.value
    .reduce((sum, a) => sum + (Number(a.finalPrice) || 0), 0);

  return { total, completed, inProgress, confirmed, totalRevenue, estimatedRevenue };
});

// Helper: WhatsApp URL
function getWhatsAppUrl(phone: string, clientName: string, serviceName: string, time: string) {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const validPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const text = encodeURIComponent(
    `Olá ${clientName}! Tudo bem? Passando para confirmar seu horário de *${serviceName}* hoje às *${time}* na BarblyClub. Podemos te aguardar? 💈✂️`
  );
  return `https://wa.me/${validPhone}?text=${text}`;
}

// ================= MODAL: NOVO AGENDAMENTO (CLIENT AUTOCOMPLETE + MÚLTIPLOS SERVIÇOS) =================
const isCreateModalOpen = ref(false);
const isSubmittingAppointment = ref(false);

const clientSearchQuery = ref('');
const isClientDropdownOpen = ref(false);
const selectedCustomerObj = ref<Customer | null>(null);

const selectedServiceIds = ref<string[]>([]);

const newAppointment = reactive<{
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  barberId: string;
  date: string;
  time: string;
  origin: 'COUNTER_WALKIN' | 'WHATSAPP_AI' | 'PWA_WEB';
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';
  paymentMethod: string;
  notes: string;
}>({
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  barberId: '',
  date: getTodayString(),
  time: '14:00',
  origin: 'COUNTER_WALKIN',
  status: 'CONFIRMED',
  paymentMethod: 'PIX',
  notes: '',
});

// Real-time client suggestions autocomplete
const filteredCustomerSuggestions = computed(() => {
  if (!clientSearchQuery.value || clientSearchQuery.value.trim().length < 2) return [];
  const q = clientSearchQuery.value.toLowerCase().trim();
  return customers.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.phone.includes(q)
  ).slice(0, 5);
});

function selectCustomer(cust: Customer) {
  selectedCustomerObj.value = cust;
  newAppointment.clientName = cust.name;
  newAppointment.clientPhone = cust.phone;
  newAppointment.clientEmail = cust.email || '';
  clientSearchQuery.value = cust.name;
  isClientDropdownOpen.value = false;
}

function handlePhoneInput(e: Event) {
  const target = e.target as HTMLInputElement;
  let val = target.value.replace(/\D/g, '');
  if (val.length > 11) val = val.substring(0, 11);
  if (val.length > 6) {
    target.value = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7)}`;
  } else if (val.length > 2) {
    target.value = `(${val.substring(0, 2)}) ${val.substring(2)}`;
  } else {
    target.value = val;
  }
  newAppointment.clientPhone = target.value;
}

function toggleServiceSelection(serviceId: string) {
  if (selectedServiceIds.value.includes(serviceId)) {
    selectedServiceIds.value = selectedServiceIds.value.filter(id => id !== serviceId);
  } else {
    selectedServiceIds.value.push(serviceId);
  }
}

// Calculated totals for multiple services
const comboSummary = computed(() => {
  const selected = services.value.filter(s => selectedServiceIds.value.includes(s.id));
  const totalDuration = selected.reduce((sum, s) => sum + (s.durationMinutes || 30), 0);
  const totalPrice = selected.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  // Calculate estimated end time
  let endTime = '';
  if (newAppointment.time) {
    const [h, m] = newAppointment.time.split(':').map(Number);
    const totalMin = h * 60 + m + totalDuration;
    const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const endM = String(totalMin % 60).padStart(2, '0');
    endTime = `${endH}:${endM}`;
  }

  return {
    count: selected.length,
    services: selected,
    totalDuration,
    totalPrice,
    endTime,
  };
});

function openCreateModal(defaultBarberId?: string, defaultTime?: string, defaultDate?: string) {
  playPopSound();
  clientSearchQuery.value = '';
  selectedCustomerObj.value = null;
  isClientDropdownOpen.value = false;

  newAppointment.clientName = '';
  newAppointment.clientPhone = '';
  newAppointment.clientEmail = '';
  newAppointment.barberId = defaultBarberId || (barbers.value[0]?.id || '');
  newAppointment.date = defaultDate || selectedDate.value;
  newAppointment.time = defaultTime || '14:00';
  newAppointment.origin = 'COUNTER_WALKIN';
  newAppointment.status = 'CONFIRMED';
  newAppointment.paymentMethod = 'PIX';
  newAppointment.notes = '';

  // Select first service by default
  selectedServiceIds.value = services.value.length > 0 ? [services.value[0].id] : [];

  isCreateModalOpen.value = true;
}

async function handleCreateAppointment() {
  if (!newAppointment.clientName.trim()) {
    toast.error('Informe o nome do cliente.');
    return;
  }
  if (!newAppointment.clientPhone.trim() || newAppointment.clientPhone.replace(/\D/g, '').length < 10) {
    toast.error('Informe um WhatsApp válido com DDD.');
    return;
  }
  if (!newAppointment.barberId) {
    toast.error('Selecione o profissional.');
    return;
  }
  if (selectedServiceIds.value.length === 0) {
    toast.error('Selecione ao menos um serviço.');
    return;
  }

  isSubmittingAppointment.value = true;
  try {
    const startsAt = `${newAppointment.date}T${newAppointment.time}:00`;
    await api.createAppointment({
      clientName: newAppointment.clientName.trim(),
      clientPhone: newAppointment.clientPhone,
      clientEmail: newAppointment.clientEmail ? newAppointment.clientEmail.trim() : undefined,
      barberId: newAppointment.barberId,
      serviceIds: selectedServiceIds.value,
      startsAt,
      origin: newAppointment.origin,
      status: newAppointment.status,
      paymentMethod: newAppointment.paymentMethod,
      notes: newAppointment.notes ? newAppointment.notes.trim() : undefined,
    });

    toast.success('Agendamento registrado com sucesso!');
    isCreateModalOpen.value = false;
    await loadAppointments();
  } catch (err: any) {
    console.error('Erro ao criar agendamento:', err);
    toast.error(err.message || 'Erro ao registrar agendamento.');
  } finally {
    isSubmittingAppointment.value = false;
  }
}

// ================= MODAL: DETALHES DO AGENDAMENTO =================
const isDetailsModalOpen = ref(false);
const activeAppointmentDetails = ref<Appointment | null>(null);

function openDetailsModal(apt: Appointment) {
  playPopSound();
  activeAppointmentDetails.value = apt;
  isDetailsModalOpen.value = true;
}

async function handleDetailsQuickStatus(newStatus: string) {
  if (!activeAppointmentDetails.value) return;
  if (newStatus === 'COMPLETED') {
    isDetailsModalOpen.value = false;
    openCheckoutModal(activeAppointmentDetails.value);
    return;
  }

  try {
    await api.updateAppointmentStatus(activeAppointmentDetails.value.id, newStatus);
    toast.success(`Status alterado para "${getStatusInfo(newStatus).shortLabel}"!`);
    activeAppointmentDetails.value.status = newStatus as any;
    await loadAppointments();
  } catch (err: any) {
    toast.error('Erro ao atualizar status.');
  }
}

async function handleDeleteFromDetails() {
  if (!activeAppointmentDetails.value) return;
  if (!confirm(`Deseja realmente remover o agendamento de ${activeAppointmentDetails.value.customer?.name}?`)) return;
  try {
    await api.deleteAppointment(activeAppointmentDetails.value.id);
    toast.success('Agendamento removido.');
    isDetailsModalOpen.value = false;
    await loadAppointments();
  } catch (err: any) {
    toast.error('Erro ao remover.');
  }
}

// ================= MODAL: FINALIZAR ATENDIMENTO & CHECKOUT COM PRODUTOS =================
const isCheckoutModalOpen = ref(false);
const selectedAptForCheckout = ref<Appointment | null>(null);
const checkoutPaymentMethod = ref('PIX');
const isSubmittingCheckout = ref(false);

// Items added to the comanda during checkout
const consumedProductsList = ref<Array<{ product: Product; quantity: number }>>([]);
const comandaSearchQuery = ref('');
const comandaActiveCategory = ref('ALL');

// Dynamic categories for comanda filter
const comandaCategories = computed(() => {
  const cats = new Set<string>();
  products.value.forEach(p => {
    if (p.category) cats.add(p.category);
  });
  return ['ALL', ...Array.from(cats)];
});

// Filtered products for quick-tap grid
const filteredComandaProducts = computed(() => {
  const query = comandaSearchQuery.value.trim().toLowerCase();
  return products.value.filter(p => {
    const matchesCategory = comandaActiveCategory.value === 'ALL' || p.category === comandaActiveCategory.value;
    const matchesQuery = !query || p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });
});

// Helper for product emojis/icons
function getProductIcon(category?: string, name?: string): string {
  const text = ((category || '') + ' ' + (name || '')).toLowerCase();
  if (text.includes('cerveja') || text.includes('heineken') || text.includes('corona') || text.includes('stella') || text.includes('chope') || text.includes('beer')) return '🍺';
  if (text.includes('água') || text.includes('agua') || text.includes('water')) return '💧';
  if (text.includes('refrigerante') || text.includes('coca') || text.includes('pepsi') || text.includes('guaraná') || text.includes('lata')) return '🥤';
  if (text.includes('café') || text.includes('cafe') || text.includes('espresso') || text.includes('nespresso')) return '☕';
  if (text.includes('chiclet') || text.includes('trident') || text.includes('snack') || text.includes('doce') || text.includes('chocolate') || text.includes('bala')) return '🍬';
  if (text.includes('pomada') || text.includes('cera') || text.includes('matte') || text.includes('fixador')) return '💈';
  if (text.includes('óleo') || text.includes('oleo') || text.includes('shampoo') || text.includes('balm') || text.includes('barba')) return '🧴';
  if (text.includes('energético') || text.includes('red bull') || text.includes('monster')) return '⚡';
  return '📦';
}

function getComandaQuantity(prodId: string): number {
  const found = consumedProductsList.value.find(item => item.product.id === prodId);
  return found ? found.quantity : 0;
}

function openCheckoutModal(apt: Appointment) {
  playPopSound();
  selectedAptForCheckout.value = apt;
  checkoutPaymentMethod.value = 'PIX';
  consumedProductsList.value = [];
  comandaSearchQuery.value = '';
  comandaActiveCategory.value = 'ALL';
  isCheckoutModalOpen.value = true;
}

function addProductToComanda(prod: Product) {
  const existing = consumedProductsList.value.find(item => item.product.id === prod.id);
  if (existing) {
    existing.quantity++;
  } else {
    consumedProductsList.value.push({ product: prod, quantity: 1 });
  }
  playPopSound();
}

function decrementProductInComanda(prodId: string) {
  const existing = consumedProductsList.value.find(item => item.product.id === prodId);
  if (!existing) return;
  if (existing.quantity > 1) {
    existing.quantity--;
  } else {
    removeProductFromComanda(prodId);
  }
  playPopSound();
}

function removeProductFromComanda(prodId: string) {
  consumedProductsList.value = consumedProductsList.value.filter(item => item.product.id !== prodId);
  playPopSound();
}

function clearComandaProducts() {
  consumedProductsList.value = [];
  playPopSound();
}

const totalConsumedUnits = computed(() => {
  return consumedProductsList.value.reduce((acc, item) => acc + item.quantity, 0);
});

// Comprehensive Split & Total Calculation
const checkoutTotals = computed(() => {
  if (!selectedAptForCheckout.value) {
    return {
      servicePrice: 0,
      serviceComm: 0,
      productsPrice: 0,
      productsComm: 0,
      totalGross: 0,
      totalBarber: 0,
      totalSalon: 0,
      hasNegativeStock: false,
    };
  }

  const servicePrice = Number(selectedAptForCheckout.value.finalPrice) || 0;
  const barberCommRate = Number(selectedAptForCheckout.value.barber?.commissionRate) || 50;
  const serviceComm = (servicePrice * barberCommRate) / 100;

  let productsPrice = 0;
  let productsComm = 0;
  let hasNegativeStock = false;

  consumedProductsList.value.forEach(item => {
    const itemTotal = (Number(item.product.salePrice) || 0) * item.quantity;
    productsPrice += itemTotal;
    const prodCommRate = Number(item.product.commissionPercentage) || 0;
    productsComm += (itemTotal * prodCommRate) / 100;

    if ((Number(item.product.stockQuantity) - item.quantity) < 0) {
      hasNegativeStock = true;
    }
  });

  const totalGross = servicePrice + productsPrice;
  const totalBarber = serviceComm + productsComm;
  const totalSalon = totalGross - totalBarber;

  return {
    servicePrice,
    serviceComm,
    productsPrice,
    productsComm,
    totalGross,
    totalBarber,
    totalSalon,
    hasNegativeStock,
  };
});

async function handleConfirmCheckout() {
  if (!selectedAptForCheckout.value) return;
  isSubmittingCheckout.value = true;
  try {
    const consumedPayload = consumedProductsList.value.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

    await api.updateAppointmentStatus(
      selectedAptForCheckout.value.id,
      'COMPLETED',
      checkoutPaymentMethod.value,
      consumedPayload.length > 0 ? consumedPayload : undefined
    );

    if (checkoutTotals.value.hasNegativeStock) {
      toast.warning('Atendimento concluído! Atenção: Alguns produtos ficaram com estoque zerado/negativo.');
    } else {
      toast.success('Atendimento concluído, comanda fechada e receita lançada no financeiro!');
    }

    isCheckoutModalOpen.value = false;
    selectedAptForCheckout.value = null;
    await Promise.all([loadAppointments(), loadProducts()]);
  } catch (err: any) {
    toast.error(err.message || 'Erro ao finalizar atendimento.');
  } finally {
    isSubmittingCheckout.value = false;
  }
}

watch(() => route.query.new, (newVal) => {
  if (newVal === 'true') {
    openCreateModal();
  }
});

onMounted(async () => {
  await Promise.all([
    loadBarbers(), 
    loadServices(), 
    loadCustomers(), 
    loadProducts(), 
    loadAppointments()
  ]);

  if (route.query.new === 'true') {
    openCreateModal();
  }
});
</script>

<template>
  <div class="flex-1 flex flex-col p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] w-full mx-auto">
    
    <!-- ================= HEADER: TÍTULO, NAVEGADOR DE DATAS E AÇÕES ================= -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Calendar class="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Agenda &amp; Calendário Interativo
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {{ dailyKPIs.total }} agendamentos
              </span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grade interativa FullCalendar com colunas por barbeiro, suporte a arrastar e soltar (drag &amp; drop) e checkout com comanda.
            </p>
          </div>
        </div>
      </div>

      <!-- Controls: Date Navigator + View Mode + Primary Action -->
      <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <!-- Date Navigator Controls -->
        <div class="flex items-center rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 p-1 shadow-sm">
          <button 
            @click="goToPrevDay" 
            class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            title="Dia Anterior"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <button 
            @click="goToToday"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="isToday ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'"
          >
            Hoje
          </button>

          <!-- Native date picker trigger -->
          <div class="relative flex items-center px-2 py-1">
            <input 
              type="date" 
              v-model="selectedDate" 
              @change="onDatePickerChange" 
              class="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 px-1">
              <CalendarDays class="w-3.5 h-3.5 text-amber-500" />
              <span>{{ formatDisplayDate(selectedDate).split(',')[0] }}</span>
            </span>
          </div>

          <button 
            @click="goToNextDay" 
            class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            title="Próximo Dia"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- View Mode Switcher -->
        <div class="flex items-center rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 p-1 shadow-sm">
          <button 
            @click="playPopSound(); viewMode = 'FULLCALENDAR'" 
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewMode === 'FULLCALENDAR' ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Grade FullCalendar"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Grade FullCalendar</span>
            <span class="sm:hidden text-[11px]">Grade</span>
          </button>

          <button 
            @click="playPopSound(); viewMode = 'LIST'" 
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewMode === 'LIST' ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            title="Visão Lista Linear"
          >
            <List class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Lista</span>
            <span class="sm:hidden text-[11px]">Lista</span>
          </button>
        </div>

        <!-- Primary CTA: + Encaixe / Novo Agendamento -->
        <button 
          @click="openCreateModal()" 
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>+ Encaixe / Agendar</span>
        </button>
      </div>
    </div>

    <!-- ================= METRICS CARDS RIBBON ================= -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agendamentos</span>
          <div class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Calendar class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {{ dailyKPIs.total }}
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Hoje nesta data
        </div>
      </div>

      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concluídos</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-emerald-500">
          {{ dailyKPIs.completed }}
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Cortes finalizados
        </div>
      </div>

      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Em Cadeira</span>
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Scissors class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-2">
          {{ dailyKPIs.inProgress }}
          <span v-if="dailyKPIs.inProgress > 0" class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Em atendimento agora
        </div>
      </div>

      <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faturado Hoje</span>
          <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <DollarSign class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
          R$ {{ dailyKPIs.totalRevenue.toFixed(2).replace('.', ',') }}
        </div>
        <div class="text-[11px] text-slate-400 font-medium mt-1">
          Total previsto: R$ {{ dailyKPIs.estimatedRevenue.toFixed(2).replace('.', ',') }}
        </div>
      </div>
    </div>

    <!-- ================= BARBER FILTER TABS ================= -->
    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      <button 
        @click="playPopSound(); selectedBarberId = 'ALL'; loadAppointments();"
        class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
        :class="selectedBarberId === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'"
      >
        Todas as Cadeiras ({{ barbers.length }})
      </button>

      <button 
        v-for="barber in barbers" 
        :key="barber.id"
        @click="playPopSound(); selectedBarberId = barber.id; loadAppointments();"
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
        :class="selectedBarberId === barber.id ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'"
      >
        <img 
          :src="barber.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'" 
          class="w-4 h-4 rounded-full object-cover" 
        />
        <span>{{ barber.nickname || barber.name.split(' ')[0] }}</span>
        <span class="text-[10px] opacity-70">({{ barber.chair || 'Cadeira 1' }})</span>
      </button>
    </div>

    <!-- ================= VIEW MODE 1: FULLCALENDAR GRADE INTERATIVA ================= -->
    <div v-if="viewMode === 'FULLCALENDAR'" class="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-4 sm:p-6 overflow-hidden">
      
      <!-- Subtle Calendar Info & Legend Bar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 pb-3 mb-3 border-b border-slate-100 dark:border-white/5">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Move class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Arraste e solte para reagendar horários • Clique em qualquer horário vazio para um novo agendamento</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] font-bold">
          <span class="flex items-center gap-1.5 text-blue-400">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span> Na Cadeira
          </span>
          <span class="flex items-center gap-1.5 text-amber-400">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span> Confirmado
          </span>
          <span class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Concluído
          </span>
        </div>
      </div>

      <!-- FullCalendar Component Container -->
      <div class="fullcalendar-custom-theme overflow-x-auto no-scrollbar w-full">
        <FullCalendar 
          ref="fullCalendarRef"
          :options="(calendarOptions as any)"
        >
          <!-- Custom Resource Column Header -->
          <template #resourceLabelContent="arg">
            <div class="flex items-center justify-center gap-2 py-2 px-3 w-full">
              <img 
                :src="arg.resource.extendedProps.avatarUrl" 
                class="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/50 shadow-sm shrink-0"
              />
              <div class="text-left truncate">
                <span class="text-xs font-black text-slate-900 dark:text-white truncate block leading-tight">
                  {{ arg.resource.title }}
                </span>
                <span class="text-[10px] text-amber-500 font-semibold truncate block">
                  {{ arg.resource.extendedProps.chair }}
                </span>
              </div>
              <span 
                v-if="!arg.resource.extendedProps.isWorkingOnSelectedDate"
                class="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold ml-1.5 shrink-0"
              >
                Folga
              </span>
            </div>
          </template>

          <!-- Custom Event Rendering Template (Minimalist Luxury Card) -->
          <template #eventContent="arg">
            <div 
              class="w-full h-full rounded-xl overflow-hidden cursor-pointer select-none border transition-all duration-150 hover:brightness-110 flex flex-col justify-between"
              :class="[
                arg.event.extendedProps.appointment?.status === 'IN_PROGRESS'
                  ? 'bg-blue-950/70 border-blue-500/40 text-blue-100 shadow-sm shadow-blue-500/10'
                  : arg.event.extendedProps.appointment?.status === 'COMPLETED'
                  ? 'bg-emerald-950/60 border-emerald-500/35 text-emerald-100 shadow-sm shadow-emerald-500/10'
                  : arg.event.extendedProps.appointment?.status === 'PENDING_PAYMENT'
                  ? 'bg-orange-950/65 border-orange-500/40 text-orange-100 shadow-sm shadow-orange-500/10'
                  : (arg.event.extendedProps.appointment?.status === 'CANCELLED' || arg.event.extendedProps.appointment?.status === 'NO_SHOW')
                  ? 'bg-slate-900/80 border-slate-700/50 text-slate-400 opacity-60'
                  : 'bg-amber-950/65 border-amber-500/35 text-amber-100 shadow-sm shadow-amber-500/10'
              ]"
              :style="{
                borderLeftWidth: '4px',
                borderLeftColor: 
                  arg.event.extendedProps.appointment?.status === 'IN_PROGRESS' ? '#3b82f6' :
                  arg.event.extendedProps.appointment?.status === 'COMPLETED' ? '#10b981' :
                  arg.event.extendedProps.appointment?.status === 'PENDING_PAYMENT' ? '#f97316' :
                  (arg.event.extendedProps.appointment?.status === 'CANCELLED' || arg.event.extendedProps.appointment?.status === 'NO_SHOW') ? '#64748b' :
                  '#f59e0b'
              }"
            >
              <div class="p-2 flex flex-col justify-between h-full min-w-0">
                
                <!-- Top: Horário + Status -->
                <div class="flex items-center justify-between gap-1 leading-none shrink-0">
                  <span class="font-mono text-[11px] font-bold opacity-90 tracking-tight">
                    {{ arg.timeText }}
                  </span>

                  <span 
                    v-if="arg.event.extendedProps.appointment?.status === 'IN_PROGRESS'" 
                    class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-400"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                    Cadeira
                  </span>
                  <span 
                    v-else-if="arg.event.extendedProps.appointment?.status === 'COMPLETED'" 
                    class="text-[9px] font-bold text-emerald-400 uppercase tracking-wider"
                  >
                    Pago
                  </span>
                  <span 
                    v-else-if="arg.event.extendedProps.appointment?.status === 'CONFIRMED'" 
                    class="text-[9px] font-bold text-amber-400 uppercase tracking-wider"
                  >
                    Confirmado
                  </span>
                </div>

                <!-- Middle: Cliente & Serviço -->
                <div class="truncate my-auto py-0.5 min-w-0">
                  <div class="text-xs font-black text-white truncate tracking-tight">
                    {{ arg.event.extendedProps.appointment?.customer?.name }}
                  </div>
                  <div class="text-[10px] text-slate-300 truncate font-medium mt-0.5">
                    {{ arg.event.extendedProps.appointment?.service?.name }}
                  </div>
                </div>

                <!-- Bottom: Preço + Origem Amigável -->
                <div class="flex items-center justify-between text-[10px] font-bold shrink-0 pt-1 border-t border-white/10">
                  <span class="font-mono text-amber-400 font-extrabold">
                    R$ {{ Number(arg.event.extendedProps.appointment?.finalPrice).toFixed(2).replace('.', ',') }}
                  </span>
                  <span class="text-[9px] text-slate-400 truncate max-w-[90px] font-medium">
                    {{ getOriginInfo(arg.event.extendedProps.appointment?.origin).shortLabel }}
                  </span>
                </div>

              </div>
            </div>
          </template>
        </FullCalendar>
      </div>

    </div>

    <!-- ================= VIEW MODE 2: LISTA LINEAR ================= -->
    <div v-else class="space-y-3">
      <div 
        v-for="apt in appointments" 
        :key="apt.id"
        @click="openDetailsModal(apt)"
        class="bg-white dark:bg-[#121824] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-amber-500/30 cursor-pointer"
      >
        <div class="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div class="w-16 sm:w-20 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center shrink-0">
            <span class="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white block">
              {{ apt.time }}
            </span>
            <span class="text-[10px] text-slate-400 font-semibold block">
              até {{ apt.endTime }}
            </span>
          </div>

          <div class="truncate">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {{ apt.customer?.name }}
              </h4>
              <span 
                class="text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"
                :class="getStatusInfo(apt.status).badgeClass"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="getStatusInfo(apt.status).dotColor"></span>
                {{ getStatusInfo(apt.status).shortLabel }}
              </span>
              <span 
                class="text-[10px] px-2 py-0.5 rounded-md font-bold"
                :class="getOriginInfo(apt.origin).badgeClass"
              >
                {{ getOriginInfo(apt.origin).shortLabel }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ apt.service?.name }}
              </span>
              <span>•</span>
              <span>{{ apt.barber?.name }}</span>
              <span>•</span>
              <span class="font-mono font-bold text-slate-900 dark:text-white">
                R$ {{ Number(apt.finalPrice).toFixed(2).replace('.', ',') }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            @click.stop="openCheckoutModal(apt)"
            v-if="apt.status === 'IN_PROGRESS'"
            class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
          >
            Finalizar &amp; Cobrar
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: NOVO AGENDAMENTO (CLIENT AUTOCOMPLETE + MÚLTIPLOS SERVIÇOS) ================= -->
    <div 
      v-if="isCreateModalOpen" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        
        <!-- Mobile pull pill -->
        <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0"></div>

        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Plus class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                Novo Agendamento &amp; Encaixe
              </h3>
              <p class="text-xs text-slate-400">
                Busca de cliente cadastrado e seleção de múltiplos serviços
              </p>
            </div>
          </div>
          <button @click="isCreateModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateAppointment" class="flex flex-col flex-1 overflow-hidden min-h-0 mt-4">
          <div class="space-y-4 overflow-y-auto flex-1 pr-1 pb-2 no-scrollbar">
          
          <!-- Client Autocomplete Search -->
          <div class="relative">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Buscar ou Cadastrar Cliente *
            </label>
            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="clientSearchQuery" 
                @focus="isClientDropdownOpen = true"
                @input="newAppointment.clientName = clientSearchQuery; isClientDropdownOpen = true"
                type="text" 
                placeholder="Comece a digitar o nome ou WhatsApp do cliente..."
                class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <!-- Autocomplete suggestions dropdown -->
            <div 
              v-if="isClientDropdownOpen && filteredCustomerSuggestions.length > 0" 
              class="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-[#192233] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5"
            >
              <div 
                v-for="cust in filteredCustomerSuggestions" 
                :key="cust.id"
                @click="selectCustomer(cust)"
                class="p-3 hover:bg-amber-500/10 cursor-pointer flex items-center justify-between transition"
              >
                <div>
                  <div class="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User class="w-3.5 h-3.5 text-amber-500" />
                    <span>{{ cust.name }}</span>
                    <span v-if="cust.isVipMember" class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">VIP</span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">{{ cust.phone }}</div>
                </div>
                <div class="text-right text-[10px] text-slate-400">
                  <span>{{ cust.totalAppointments || 0 }} visitas</span>
                </div>
              </div>
            </div>

            <!-- Customer Loyalty Card Banner (if selected) -->
            <div v-if="selectedCustomerObj" class="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-500">
              <span class="font-bold flex items-center gap-1.5">
                <CheckCircle2 class="w-4 h-4" /> Cliente cadastrado: {{ selectedCustomerObj.name }}
              </span>
              <span class="font-semibold">{{ selectedCustomerObj.totalAppointments }} cortes realizados</span>
            </div>
          </div>

          <!-- Phone & Email (if new or manual) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp com DDD *
              </label>
              <input 
                :value="newAppointment.clientPhone" 
                @input="handlePhoneInput"
                type="tel" 
                placeholder="(11) 99999-9999"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail (Opcional)
              </label>
              <input 
                v-model="newAppointment.clientEmail" 
                type="email" 
                placeholder="cliente@email.com"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <!-- Multiple Services Selector (Combos) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Selecione os Serviços (Combos) *
              </label>
              <span class="text-[11px] text-amber-500 font-bold">
                {{ comboSummary.count }} selecionado(s) • {{ comboSummary.totalDuration }} min
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-[#07090e]/50">
              <div 
                v-for="s in services" 
                :key="s.id"
                @click="toggleServiceSelection(s.id)"
                class="p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between"
                :class="selectedServiceIds.includes(s.id) ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white font-bold' : 'border-slate-200 dark:border-white/5 hover:border-amber-500/30 text-slate-600 dark:text-slate-400'"
              >
                <div>
                  <div class="text-xs leading-tight">{{ s.name }}</div>
                  <div class="text-[10px] opacity-70 mt-0.5">{{ s.durationMinutes }} min</div>
                </div>
                <div class="text-right font-mono font-bold text-xs">
                  R$ {{ Number(s.price).toFixed(2).replace('.', ',') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Barber, Date, Time -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barbeiro *
              </label>
              <select 
                v-model="newAppointment.barberId"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              >
                <option v-for="b in barbers" :key="b.id" :value="b.id" class="dark:bg-[#121824] dark:text-white">
                  {{ b.name }} ({{ b.chair || 'Cadeira 1' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data *
              </label>
              <input 
                v-model="newAppointment.date" 
                type="date"
                required
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Início *
              </label>
              <input 
                v-model="newAppointment.time" 
                type="time" 
                required
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <!-- Origem & Status Inicial Amigáveis -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Origem do Agendamento *
              </label>
              <select 
                v-model="newAppointment.origin"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              >
                <option value="COUNTER_WALKIN" class="dark:bg-[#121824] dark:text-white">
                  Presencial / Balcão (Encaixe)
                </option>
                <option value="WHATSAPP_AI" class="dark:bg-[#121824] dark:text-white">
                  WhatsApp (Agendamento Manual)
                </option>
                <option value="PWA_WEB" class="dark:bg-[#121824] dark:text-white">
                  Site / Aplicativo Online
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Inicial *
              </label>
              <select 
                v-model="newAppointment.status"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white dark:[color-scheme:dark]"
              >
                <option value="CONFIRMED" class="dark:bg-[#121824] dark:text-white">
                  Confirmado (Cliente vai chegar)
                </option>
                <option value="IN_PROGRESS" class="dark:bg-[#121824] dark:text-white">
                  Na Cadeira (Já sentou para cortar)
                </option>
              </select>
            </div>
          </div>

          <!-- Time Span & Price Summary Banner -->
          <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <div>
              <span class="text-amber-500 font-bold block">Horário Previsto no Calendário</span>
              <span class="text-[11px] text-slate-400">
                Início: {{ newAppointment.time }} ➔ Término: <b>{{ comboSummary.endTime }}</b> ({{ comboSummary.totalDuration }} min)
              </span>
            </div>
            <div class="text-right">
              <span class="text-base font-black text-amber-500 font-mono">
                R$ {{ comboSummary.totalPrice.toFixed(2).replace('.', ',') }}
              </span>
            </div>
          </div>

          </div> <!-- end scrollable div -->

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
            <button 
              type="button" 
              @click="isCreateModalOpen = false" 
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmittingAppointment"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              <Check v-if="!isSubmittingAppointment" class="w-4 h-4 stroke-[3]" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmittingAppointment ? 'Salvando...' : 'Confirmar Agendamento' }}</span>
            </button>
          </div>

        </form>
      </div>
    </div>

    <!-- ================= MODAL: DETALHES DO AGENDAMENTO AO CLICAR ================= -->
    <div 
      v-if="isDetailsModalOpen && activeAppointmentDetails" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        
        <!-- Mobile pull pill -->
        <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0"></div>

        <!-- Header: Cliente & Botão Fechar -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <img 
              :src="activeAppointmentDetails.customer?.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'" 
              class="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-500/40 shrink-0"
            />
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {{ activeAppointmentDetails.customer?.name }}
              </h3>
              <p class="text-xs text-slate-400 font-mono mt-0.5">
                {{ activeAppointmentDetails.customer?.phone }}
              </p>
            </div>
          </div>
          <button @click="isDetailsModalOpen = false" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 overflow-y-auto flex-1 pr-1 pb-2 no-scrollbar mt-4">

          <!-- 1. ORIGEM AMIGÁVEL DO AGENDAMENTO -->
          <div 
            class="p-3.5 rounded-2xl flex items-center justify-between border transition"
            :class="getOriginInfo(activeAppointmentDetails.origin).badgeClass"
          >
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                <MessageSquare v-if="activeAppointmentDetails.origin === 'WHATSAPP_AI'" class="w-5 h-5 text-emerald-400" />
                <Globe v-else-if="activeAppointmentDetails.origin === 'PWA_WEB'" class="w-5 h-5 text-sky-400" />
                <Store v-else class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider block opacity-75">Origem da Reserva</span>
                <span class="text-xs font-black">{{ getOriginInfo(activeAppointmentDetails.origin).label }}</span>
              </div>
            </div>
            <span class="text-[10px] font-semibold opacity-90 text-right max-w-[190px] hidden sm:inline">
              {{ getOriginInfo(activeAppointmentDetails.origin).description }}
            </span>
          </div>

          <!-- 2. STATUS INFORMATIVO COM ETAPAS E EXPLICAÇÃO -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-3">
            
            <!-- Linha de Status Atual -->
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info class="w-3.5 h-3.5 text-amber-500" />
                Status do Atendimento
              </span>
              <span 
                class="px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5"
                :class="getStatusInfo(activeAppointmentDetails.status).badgeClass"
              >
                <span class="w-2 h-2 rounded-full" :class="getStatusInfo(activeAppointmentDetails.status).dotColor"></span>
                {{ getStatusInfo(activeAppointmentDetails.status).label }}
              </span>
            </div>

            <!-- Stepper Visual das Etapas -->
            <div class="grid grid-cols-3 gap-1.5 pt-1">
              <div 
                class="p-2 rounded-xl text-center border transition"
                :class="[
                  activeAppointmentDetails.status === 'CONFIRMED' 
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-extrabold' 
                    : (activeAppointmentDetails.status === 'IN_PROGRESS' || activeAppointmentDetails.status === 'COMPLETED')
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-white/5 border-white/5 text-slate-500 font-medium'
                ]"
              >
                <span class="text-[10px] block leading-tight">1. Agendado</span>
                <span class="text-[9px] opacity-75">Confirmado</span>
              </div>

              <div 
                class="p-2 rounded-xl text-center border transition"
                :class="[
                  activeAppointmentDetails.status === 'IN_PROGRESS' 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 font-extrabold shadow-sm' 
                    : activeAppointmentDetails.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                    : 'bg-white/5 border-white/5 text-slate-500 font-medium'
                ]"
              >
                <span class="text-[10px] block leading-tight">2. Na Cadeira</span>
                <span class="text-[9px] opacity-75">Cortando</span>
              </div>

              <div 
                class="p-2 rounded-xl text-center border transition"
                :class="[
                  activeAppointmentDetails.status === 'COMPLETED' 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-extrabold shadow-sm' 
                    : 'bg-white/5 border-white/5 text-slate-500 font-medium'
                ]"
              >
                <span class="text-[10px] block leading-tight">3. Concluído</span>
                <span class="text-[9px] opacity-75">Pago / Caixa</span>
              </div>
            </div>

            <!-- Explicação do Status e Próximo Passo -->
            <div class="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
              <p class="text-xs text-slate-600 dark:text-slate-300">
                {{ getStatusInfo(activeAppointmentDetails.status).description }}
              </p>
              <div v-if="getStatusInfo(activeAppointmentDetails.status).nextStepTip" class="flex items-start gap-1.5 text-[11px] text-amber-500 font-semibold pt-1">
                <Sparkles class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><b>Próximo Passo:</b> {{ getStatusInfo(activeAppointmentDetails.status).nextStepTip }}</span>
              </div>
            </div>
          </div>

          <!-- 3. DETALHES DE SERVIÇO, BARBEIRO E VALOR -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-semibold">Serviço Agendado:</span>
              <span class="font-bold text-slate-900 dark:text-white">
                {{ activeAppointmentDetails.service?.name }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-semibold">Profissional &amp; Bancada:</span>
              <span class="font-bold text-amber-500">
                {{ activeAppointmentDetails.barber?.name }} ({{ activeAppointmentDetails.barber?.chair || 'Cadeira 1' }})
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 font-semibold">Horário Previsto:</span>
              <span class="font-mono font-bold text-slate-900 dark:text-white">
                {{ activeAppointmentDetails.time }} até {{ activeAppointmentDetails.endTime }}
              </span>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5">
              <span class="text-slate-400 font-semibold">Valor do Atendimento:</span>
              <span class="font-mono font-black text-amber-500 text-sm">
                R$ {{ Number(activeAppointmentDetails.finalPrice).toFixed(2).replace('.', ',') }}
              </span>
            </div>
          </div>

          <!-- 4. AÇÕES RÁPIDAS DE ATENDIMENTO -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Ações Rápidas de Atendimento:
            </label>

            <div class="grid grid-cols-2 gap-2">
              <!-- Iniciar atendimento (Colocar na cadeira) -->
              <button 
                v-if="activeAppointmentDetails.status === 'CONFIRMED'"
                @click="handleDetailsQuickStatus('IN_PROGRESS')"
                class="py-2.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <Play class="w-3.5 h-3.5 fill-current" />
                <span>Colocar na Cadeira</span>
              </button>

              <!-- Finalizar e Cobrar (Checkout com Comanda) -->
              <button 
                @click="isDetailsModalOpen = false; openCheckoutModal(activeAppointmentDetails)"
                class="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                :class="{ 'col-span-2': activeAppointmentDetails.status === 'IN_PROGRESS' }"
              >
                <Check class="w-4 h-4 stroke-[3]" />
                <span>Finalizar &amp; Checkout com Produtos</span>
              </button>

              <!-- Reverter para Confirmado (se estiver na cadeira e clicou por engano) -->
              <button 
                v-if="activeAppointmentDetails.status === 'IN_PROGRESS'"
                @click="handleDetailsQuickStatus('CONFIRMED')"
                class="py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition col-span-2"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Voltar para Aguardando Chegada</span>
              </button>

              <!-- WhatsApp Direct -->
              <a 
                :href="getWhatsAppUrl(activeAppointmentDetails.customer?.phone || '', activeAppointmentDetails.customer?.name || '', activeAppointmentDetails.service?.name || '', activeAppointmentDetails.time || '')"
                target="_blank"
                class="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                :class="{ 'col-span-2': activeAppointmentDetails.status === 'COMPLETED' }"
              >
                <MessageCircle class="w-3.5 h-3.5" />
                <span>WhatsApp do Cliente</span>
              </a>

              <!-- Marcar Falta (Não Compareceu) -->
              <button 
                v-if="activeAppointmentDetails.status === 'CONFIRMED'"
                @click="handleDetailsQuickStatus('NO_SHOW')"
                class="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <span>Não Compareceu</span>
              </button>

              <!-- Reativar caso cancelado ou no-show -->
              <button 
                v-if="activeAppointmentDetails.status === 'NO_SHOW' || activeAppointmentDetails.status === 'CANCELLED'"
                @click="handleDetailsQuickStatus('CONFIRMED')"
                class="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition col-span-2"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Reativar Agendamento</span>
              </button>
            </div>
          </div>

          </div> <!-- end scrollable div -->

          <!-- Rodapé com Cancelamento Discreto -->
          <div class="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
            <span class="text-slate-400 text-[11px]">ID: {{ activeAppointmentDetails.id.substring(0, 8) }}</span>
            <button 
              @click="handleDeleteFromDetails"
              class="text-rose-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" /> Cancelar agendamento
            </button>
          </div>

      </div>
    </div>

    <!-- ================= MODAL: FINALIZAR ATENDIMENTO & CHECKOUT COM COMANDA DE PRODUTOS ================= -->
    <div 
      v-if="isCheckoutModalOpen && selectedAptForCheckout" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <div class="bg-white dark:bg-[#121824] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col p-5 sm:p-7 shadow-2xl relative animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        
        <!-- Mobile pull pill -->
        <div class="w-12 h-1 bg-slate-300 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-3 sm:hidden shrink-0"></div>

        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
                Finalizar &amp; Comanda de Produtos
              </h3>
              <p class="text-xs text-slate-400">
                Adicione bebidas e produtos consumidos com 1 toque antes de fechar o split
              </p>
            </div>
          </div>
          <button @click="isCheckoutModalOpen = false" class="text-slate-400 hover:text-white p-1">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex flex-col flex-1 overflow-hidden min-h-0 mt-4">
          <div class="space-y-4 overflow-y-auto flex-1 pr-1 pb-2 no-scrollbar">
          <!-- Summary of services -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-400 block font-semibold">Cliente &amp; Atendimento:</span>
              <span class="font-extrabold text-slate-900 dark:text-white block mt-0.5">
                {{ selectedAptForCheckout.customer?.name }}
              </span>
              <span class="text-[11px] text-amber-500 font-semibold">
                {{ selectedAptForCheckout.service?.name }} com {{ selectedAptForCheckout.barber?.name }}
              </span>
            </div>
            <div class="text-right font-mono font-black text-slate-900 dark:text-white text-sm">
              R$ {{ Number(selectedAptForCheckout.finalPrice).toFixed(2).replace('.', ',') }}
            </div>
          </div>

          <!-- ================= COMANDA RÁPIDA: BEBIDAS, SNACKS & PRODUTOS ================= -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-100 dark:border-white/5 space-y-3.5">
            <!-- Cabeçalho da Comanda -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Beer class="w-4 h-4 text-amber-500" /> Bebidas, Snacks &amp; Consumo:
                </span>
                <span 
                  v-if="totalConsumedUnits > 0"
                  class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono"
                >
                  {{ totalConsumedUnits }} un. adicionada(s)
                </span>
              </div>

              <button 
                v-if="consumedProductsList.length > 0"
                type="button" 
                @click="clearComandaProducts"
                class="text-[11px] text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer"
              >
                Limpar comanda
              </button>
            </div>

            <!-- Busca Rápida & Filtros por Categoria -->
            <div class="space-y-2">
              <div class="relative">
                <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  v-model="comandaSearchQuery"
                  type="text" 
                  placeholder="Buscar água, cerveja, chiclete, pomada..."
                  class="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <!-- Filtro de Categorias em Chips -->
              <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                <button 
                  type="button" 
                  @click="comandaActiveCategory = 'ALL'; playPopSound()"
                  class="px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer text-[11px]"
                  :class="comandaActiveCategory === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-400 hover:text-white border border-slate-200 dark:border-white/5'"
                >
                  Todos ({{ products.length }})
                </button>
                <button 
                  v-for="cat in comandaCategories.filter(c => c !== 'ALL')" 
                  :key="cat"
                  type="button" 
                  @click="comandaActiveCategory = cat; playPopSound()"
                  class="px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer text-[11px] flex items-center gap-1"
                  :class="comandaActiveCategory === cat ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-white dark:bg-[#121824] text-slate-400 hover:text-white border border-slate-200 dark:border-white/5'"
                >
                  <span>{{ getProductIcon(cat, '') }}</span>
                  <span>{{ cat }}</span>
                </button>
              </div>
            </div>

            <!-- Grade de Toque Rápido (1 toque = +1 na comanda) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Toque no card para lançar na comanda:</span>
                <span class="text-amber-500 font-semibold normal-case">1 toque = +1 item</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto no-scrollbar p-0.5">
                <div 
                  v-for="p in filteredComandaProducts" 
                  :key="p.id"
                  @click="addProductToComanda(p)"
                  class="relative p-2.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group active:scale-[0.98]"
                  :class="[
                    getComandaQuantity(p.id) > 0 
                      ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white shadow-sm shadow-amber-500/10' 
                      : 'bg-white dark:bg-[#121824] border-slate-200 dark:border-white/10 hover:border-amber-500/40 text-slate-800 dark:text-slate-200'
                  ]"
                >
                  <!-- Card Top: Emoji & Badge de Quantidade -->
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xl leading-none">{{ getProductIcon(p.category, p.name) }}</span>
                    
                    <span 
                      v-if="getComandaQuantity(p.id) > 0" 
                      class="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 font-mono shadow-sm animate-in zoom-in-75 duration-100"
                    >
                      {{ getComandaQuantity(p.id) }}x
                    </span>
                    <span 
                      v-else 
                      class="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center text-xs font-bold text-slate-400 transition"
                    >
                      +
                    </span>
                  </div>

                  <!-- Card Content: Nome & Preço -->
                  <div>
                    <h5 class="text-[11px] font-bold leading-tight line-clamp-1 group-hover:text-amber-500 transition">{{ p.name }}</h5>
                    <div class="flex items-center justify-between mt-1 text-[11px]">
                      <span class="font-mono font-black text-amber-500">
                        R$ {{ Number(p.salePrice).toFixed(2).replace('.', ',') }}
                      </span>
                      <span 
                        class="text-[9px]"
                        :class="p.stockQuantity <= 0 ? 'text-rose-400 font-bold' : 'text-slate-400'"
                      >
                        {{ p.stockQuantity }} un
                      </span>
                    </div>
                  </div>

                  <!-- Stepper no Card se Quantidade > 0 -->
                  <div 
                    v-if="getComandaQuantity(p.id) > 0" 
                    class="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-amber-500/30"
                    @click.stop
                  >
                    <button 
                      type="button" 
                      @click="decrementProductInComanda(p.id)"
                      class="w-5 h-5 rounded bg-black/30 hover:bg-black/50 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Diminuir"
                    >
                      -
                    </button>
                    <span class="font-mono font-black text-xs text-amber-400">{{ getComandaQuantity(p.id) }} un</span>
                    <button 
                      type="button" 
                      @click="addProductToComanda(p)"
                      class="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Adicionar mais 1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Extrato Detalhado da Comanda -->
            <div class="pt-2 border-t border-slate-200/80 dark:border-white/5">
              <div class="flex items-center justify-between text-xs font-bold mb-2 text-slate-700 dark:text-slate-300">
                <span class="flex items-center gap-1.5">
                  <Receipt class="w-3.5 h-3.5 text-amber-500" /> Extrato de Consumo:
                </span>
                <span class="text-amber-500 font-mono font-bold">
                  R$ {{ checkoutTotals.productsPrice.toFixed(2).replace('.', ',') }}
                </span>
              </div>

              <!-- Se houver itens na comanda -->
              <div v-if="consumedProductsList.length > 0" class="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                <div 
                  v-for="item in consumedProductsList" 
                  :key="item.product.id"
                  class="p-2.5 rounded-xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div class="flex items-center gap-2 truncate pr-2">
                    <span class="text-base">{{ getProductIcon(item.product.category, item.product.name) }}</span>
                    <div class="truncate">
                      <span class="font-black text-slate-900 dark:text-white block truncate leading-tight">{{ item.product.name }}</span>
                      <span class="text-[10px] text-slate-400">
                        R$ {{ Number(item.product.salePrice).toFixed(2).replace('.', ',') }} un. 
                        <span v-if="Number(item.product.commissionPercentage) > 0" class="text-emerald-500 font-bold ml-1">
                          (+{{ item.product.commissionPercentage }}% comissão)
                        </span>
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2.5 shrink-0">
                    <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <button 
                        type="button" 
                        @click="decrementProductInComanda(item.product.id)"
                        class="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                      >-</button>
                      <span class="font-mono font-bold text-xs">{{ item.quantity }}</span>
                      <button 
                        type="button" 
                        @click="addProductToComanda(item.product)"
                        class="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                      >+</button>
                    </div>

                    <span class="font-mono font-black text-slate-900 dark:text-white text-xs w-16 text-right">
                      R$ {{ ((Number(item.product.salePrice) || 0) * item.quantity).toFixed(2).replace('.', ',') }}
                    </span>

                    <button 
                      type="button" 
                      @click="removeProductFromComanda(item.product.id)"
                      class="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Remover da comanda"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Se NÃO houver itens na comanda -->
              <div v-else class="p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/5 text-center text-xs text-slate-400">
                <span>Nenhum item adicionado à comanda. Toque nos cards acima para lançar bebidas, snacks ou produtos consumidos.</span>
              </div>
            </div>
          </div>

          <!-- Split Salão-Parceiro Breakdown (Lei 13.352) -->
          <div class="p-4 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-transparent border border-amber-500/20 space-y-2 text-xs">
            <div class="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-between">
              <span>Fechamento da Comanda (Lei 13.352)</span>
              <span class="font-mono text-base font-black text-slate-900 dark:text-white">
                Total: R$ {{ checkoutTotals.totalGross.toFixed(2).replace('.', ',') }}
              </span>
            </div>

            <div class="flex items-center justify-between text-slate-400 pt-1">
              <span>Comissão Barbeiro (Serviços + Produtos):</span>
              <span class="font-mono font-bold text-emerald-500">
                R$ {{ checkoutTotals.totalBarber.toFixed(2).replace('.', ',') }}
              </span>
            </div>

            <div class="flex items-center justify-between text-slate-400">
              <span>Cota Retida pela Barbearia:</span>
              <span class="font-mono font-black text-amber-500">
                R$ {{ checkoutTotals.totalSalon.toFixed(2).replace('.', ',') }}
              </span>
            </div>

            <!-- Option A Warning Banner (if any item is zero/negative) -->
            <div v-if="checkoutTotals.hasNegativeStock" class="pt-2 border-t border-amber-500/20 flex items-center gap-1.5 text-[11px] text-amber-500 font-bold">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
              <span>Aviso: A venda será concluída, mas produtos consumidos ficarão com estoque zerado/negativo.</span>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Forma de Pagamento Recebida *
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                type="button" 
                @click="checkoutPaymentMethod = 'PIX'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                :class="checkoutPaymentMethod === 'PIX' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                ⚡ Pix
              </button>
              <button 
                type="button" 
                @click="checkoutPaymentMethod = 'CARTAO_DEBITO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                :class="checkoutPaymentMethod === 'CARTAO_DEBITO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💳 Débito
              </button>
              <button 
                type="button" 
                @click="checkoutPaymentMethod = 'CARTAO_CREDITO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                :class="checkoutPaymentMethod === 'CARTAO_CREDITO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💳 Crédito
              </button>
              <button 
                type="button" 
                @click="checkoutPaymentMethod = 'DINHEIRO'"
                class="p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                :class="checkoutPaymentMethod === 'DINHEIRO' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500' : 'border-slate-200 dark:border-white/10 text-slate-400'"
              >
                💵 Dinheiro
              </button>
            </div>
          </div>

          </div> <!-- end scrollable body -->

          <!-- Checkout Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
            <button 
              type="button" 
              @click="isCheckoutModalOpen = false" 
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Voltar
            </button>
            <button 
              type="button" 
              @click="handleConfirmCheckout"
              :disabled="isSubmittingCheckout"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Check v-if="!isSubmittingCheckout" class="w-4 h-4 stroke-[3]" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmittingCheckout ? 'Concluindo...' : 'Confirmar & Receber R$ ' + checkoutTotals.totalGross.toFixed(2).replace('.', ',') }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style>
/* FullCalendar Luxury Dark Theme for BarblyClub */
.fullcalendar-custom-theme .fc {
  font-family: inherit;
  --fc-border-color: rgba(255, 255, 255, 0.06);
  --fc-today-bg-color: rgba(245, 158, 11, 0.03);
  --fc-now-indicator-color: #f59e0b;
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: #0f1523;
  --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.04);
}

.fullcalendar-custom-theme .fc-theme-standard th {
  border-color: rgba(255, 255, 255, 0.07) !important;
  background-color: #111726 !important;
  padding: 0 !important;
}

.fullcalendar-custom-theme .fc-col-header-cell,
.fullcalendar-custom-theme .fc-timegrid-col {
  min-width: 200px !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
}

.fullcalendar-custom-theme .fc-timegrid-slot {
  height: 38px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
}

.fullcalendar-custom-theme .fc-timegrid-slot-minor {
  border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
}

.fullcalendar-custom-theme .fc-timegrid-slot-label-cushion {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 2px 8px !important;
}

.fullcalendar-custom-theme .fc-timegrid-event-harness {
  padding: 1px 3px !important;
}

.fullcalendar-custom-theme .fc-event {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  cursor: pointer !important;
}

.fullcalendar-custom-theme .fc-event-main {
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
}

.fullcalendar-custom-theme .fc-non-business {
  background-color: rgba(0, 0, 0, 0.4) !important;
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.015),
    rgba(255, 255, 255, 0.015) 8px,
    transparent 8px,
    transparent 16px
  ) !important;
}

.fullcalendar-custom-theme .fc-now-indicator-line {
  border-color: #f59e0b !important;
  border-width: 2px !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.8) !important;
  z-index: 10 !important;
}

.fullcalendar-custom-theme .fc-now-indicator-arrow {
  border-color: #f59e0b !important;
  border-width: 5px 0 5px 6px !important;
  border-left-color: #f59e0b !important;
}
</style>
