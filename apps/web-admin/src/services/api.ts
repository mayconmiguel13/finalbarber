// Simple type-safe API client for web-admin

export interface DashboardMetrics {
  activeClients: {
    total: number;
    change: string;
    subtitle: string;
  };
  todayAppointments: {
    total: number;
    change: string;
    walkIns: number;
    onlinePix: number;
  };
  monthlyRevenue: {
    total: number;
    change: string;
    salonShare: number;
    barberShare: number;
    taxExemptionConfirmed: boolean;
  };
  productivity: {
    completionPercentage: number;
    completedServices: number;
    totalServices: number;
    noShowRate: number;
  };
  productStock: Array<{
    id?: string;
    name: string;
    category?: string;
    stockQuantity?: number;
    minStockAlert?: number;
    salePrice?: number;
    remaining: string;
    level: number;
    alert: 'warning' | 'danger' | 'normal';
  }>;
  recentCustomers: Array<{
    name: string;
    service: string;
    rating: string;
    avatar: string;
  }>;
  today?: {
    totalRevenue: number;
    servicesRevenue: number;
    productsRevenue: number;
    barberShare: number;
    salonNetShare: number;
    totalAppointments: number;
    completedAppointments: number;
    inProgressAppointments: number;
    confirmedAppointments: number;
    averageTicket: number;
    onlinePixPercentage: number;
  };
  week?: {
    totalRevenue: number;
    servicesRevenue: number;
    productsRevenue: number;
    salonNetShare: number;
    barberShare: number;
    totalAppointments: number;
    completedAppointments: number;
    averageTicket: number;
  };
  month?: {
    totalRevenue: number;
    servicesRevenue: number;
    productsRevenue: number;
    salonShare: number;
    barberShare: number;
    completedAppointments: number;
    growthPercentage: string;
  };
  chairs?: Array<{
    barberId: string;
    barberName: string;
    nickname: string;
    avatarUrl: string;
    chair: string;
    commissionRate: number;
    status: 'OCCUPIED' | 'AVAILABLE' | 'BREAK' | 'CLEANING';
    statusLabel?: string;
    currentAppointment: {
      id: string;
      clientName: string;
      clientPhone: string;
      clientAvatar: string;
      isVipMember: boolean;
      serviceName: string;
      price: number;
      startsAt: string;
      endsAt: string;
      elapsedMinutes: number;
      remainingMinutes: number;
      progressPercent: number;
    } | null;
    nextAppointment: {
      id: string;
      startsAt: string;
      time: string;
      clientName: string;
      serviceName: string;
    } | null;
  }>;
  barbersRanking?: Array<{
    barberId: string;
    name: string;
    nickname: string;
    avatarUrl: string;
    chair: string;
    commissionRate: number;
    completedCount: number;
    totalRevenue: number;
    barberCommissions: number;
    averageTicket: number;
    rank: number;
  }>;
  criticalStock?: Array<{
    id: string;
    name: string;
    category: string;
    stockQuantity: number;
    minStockAlert: number;
    salePrice: number;
    remaining: string;
    level: number;
    alert: 'warning' | 'danger' | 'normal';
  }>;
  recentActivities?: Array<{
    id: string;
    type: 'CHECKOUT' | 'PRODUCT_SALE' | 'WHATSAPP_APPOINTMENT' | 'NEW_CLIENT';
    title: string;
    subtitle: string;
    value?: number;
    time: string;
    createdAt: string;
  }>;
}

export interface AppointmentItem {
  id: string;
  time: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  barberName: string;
  chair: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'CONFIRMED' | 'PENDING_PAYMENT';
  origin: 'WHATSAPP_AI' | 'PWA_WEB' | 'COUNTER_WALKIN';
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  paymentStatus: 'PAID' | 'PENDING';
  paymentMethod: 'PIX' | 'CASH' | 'CREDIT_CARD';
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  origin: 'WHATSAPP_AI' | 'PWA_WEB' | 'COUNTER_WALKIN';
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  notes?: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string;
  };
  barber: {
    id: string;
    name: string;
    avatarUrl?: string;
    chair?: string;
    commissionRate?: number;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
}

export interface CreateAppointmentPayload {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  barberId: string;
  serviceId?: string;
  serviceIds?: string[];
  startsAt: string;
  notes?: string;
  origin?: 'WHATSAPP_AI' | 'PWA_WEB' | 'COUNTER_WALKIN';
  status?: 'PENDING_PAYMENT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  paymentMethod?: string;
  forceOverlap?: boolean;
}

export interface Barber {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  nickname: string;
  document: string;
  pixKey: string;
  commissionRate: number;
  chair: string;
  specialties: string;
  workingDays: string;
  customSchedule?: Record<string, DaySchedule> | null;
  bio: string;
  role: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate?: string;
  instagram?: string;
  avatarUrl?: string;
  notes: string;
  preferences?: string[];
  isVipMember: boolean;
  totalAppointments: number;
  totalSpent: number;
  totalSpentServices?: number;
  totalSpentProducts?: number;
  lastAppointment: string | null;
  daysSinceLastVisit: number | null;
  isAtRisk: boolean;
  isBirthdayMonth?: boolean;
  isBirthdayToday?: boolean;
  loyaltyStatus?: 'VIP' | 'EM_RISCO' | 'NOVO' | 'RECORRENTE';
  createdAt: string;
}

export interface Customer360Response {
  customer: Customer;
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    totalProductsCount: number;
    totalServicesSpent: number;
    totalProductsSpent: number;
    totalLTV: number;
    preferredBarber: string | null;
    favoriteProduct: { name: string; count: number; category: string } | null;
    averageDaysBetweenVisits: number | null;
    daysSinceLastVisit: number | null;
    loyaltyStatus: 'VIP' | 'EM_RISCO' | 'NOVO' | 'RECORRENTE';
  };
  appointments: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    finalPrice: number;
    origin: string;
    notes?: string;
    barber?: { id: string; name: string; chair?: string; avatarUrl?: string };
    service?: { id: string; name: string; durationMinutes: number; price: number };
  }>;
  productSales: Array<{
    id: string;
    productId: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
  }>;
}

export interface TvAd {
  id: string;
  orgId?: string;
  title: string;
  subtitle?: string | null;
  category: string;
  mediaType?: 'IMAGE' | 'VIDEO' | string;
  imageUrl: string;
  videoUrl?: string | null;
  targetUrl?: string | null;
  qrCodeLabel?: string | null;
  priceTag?: string | null;
  partnerMonthlyFee?: number | null;
  displayDuration: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface TvSettings {
  barblyAdsNetworkEnabled: boolean;
  tvFooterText: string;
  tvWhatsAppContact: string;
  defaultDuration: number;
}

export interface TvAdsResponse {
  ads: TvAd[];
  totalMonthlyRevenue?: number;
  activeCount?: number;
  metrics?: {
    totalAds: number;
    activeCount: number;
    partnerAdsCount: number;
    totalMonthlyRevenue: number;
  };
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
  category: string;
  photoUrl: string;
}

export interface GalleryItem {
  id: string;
  orgId: string;
  barberId?: string | null;
  serviceId?: string | null;
  title: string;
  description?: string;
  photoUrl: string;
  category?: string;
  tags?: string;
  whatsappAiEnabled?: boolean;
  likesCount?: number;
  createdAt?: string;
  barberName?: string;
  barberAvatar?: string;
  barberChair?: string;
  barberNickname?: string;
}

export interface FinancialEntry {
  id: string;
  orgId?: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  barberId?: string | null;
  barberCommission?: number;
  barberName?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalCommissionsGenerated: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  entryCount: number;
  recentEntries: FinancialEntry[];
}

export interface BarberSplitSummary {
  barberId: string;
  barberName: string;
  avatarUrl: string;
  pixKey: string;
  commissionRate: number;
  totalServicesRevenue: number;
  totalProductsRevenue: number;
  totalGrossRevenue: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingPayout: number;
  salonRetainedShare: number;
  servicesCount: number;
  productsCount: number;
}

export interface Product {
  id: string;
  orgId?: string;
  name: string;
  category: string;
  description?: string | null;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  commissionPercentage: number;
  photoUrl?: string | null;
  active: boolean;
  expirationDate?: string | null;
  batchCode?: string | null;
  barcode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSalePayload {
  productId: string;
  barberId?: string;
  customerId?: string;
  quantity: number;
  paymentMethod?: string;
  forceOverlap?: boolean;
}

export interface DaySchedule {
  open: string;
  close: string;
  lunchStart?: string;
  lunchEnd?: string;
  closed: boolean;
}

export interface OrgSettings {
  id?: string;
  name?: string;
  slug?: string;
  document?: string;
  phone?: string;
  ownerName?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  themeColor: 'gold' | 'blue' | 'emerald' | 'copper';
  themeMode: 'dark' | 'light';
  onlineDiscountActive: boolean;
  onlineDiscountType: 'PERCENTAGE' | 'FIXED';
  onlineDiscountValue: number;
  toleranceMinutes?: number;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  openingHours?: Record<string, DaySchedule>;
  planStatus?: string;
  trialEndsAt?: string;
}

function getAuthHeaders(additional?: Record<string, string>) {
  const token = localStorage.getItem('barber_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...additional,
  };
}

export const api = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch('/api/metrics/dashboard', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar métricas');
    return res.json();
  },

  async getTodayAppointments(): Promise<AppointmentItem[]> {
    const res = await fetch('/api/appointments/today', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar agendamentos');
    return res.json();
  },

  async getSettings(orgId = 'default-org'): Promise<OrgSettings> {
    const res = await fetch(`/api/settings/${orgId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar configurações');
    return res.json();
  },

  async updateSettings(settings: OrgSettings, orgId = 'default-org'): Promise<{ success: boolean; settings: OrgSettings }> {
    const res = await fetch(`/api/settings/${orgId}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Falha ao atualizar configurações');
    return res.json();
  },

  async getAppointments(params?: { date?: string; startDate?: string; endDate?: string; barberId?: string }): Promise<Appointment[]> {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.barberId) query.append('barberId', params.barberId);

    const url = `/api/appointments${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar agendamentos');
    return res.json();
  },

  async createAppointment(data: CreateAppointmentPayload): Promise<{ success: boolean; message: string; appointment: any }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao criar agendamento');
    return resData;
  },

  async updateAppointmentStatus(
    id: string,
    status: string,
    paymentMethod = 'PIX',
    consumedProducts?: Array<{ productId: string; quantity: number }>
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, paymentMethod, consumedProducts }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar status do agendamento');
    return resData;
  },

  async rescheduleAppointment(
    id: string,
    data: { startsAt: string; endsAt?: string; barberId?: string }
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/appointments/${id}/reschedule`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao reagendar atendimento');
    return resData;
  },

  async deleteAppointment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover agendamento');
    return resData;
  },

  async generateAppointmentPixCheckout(
    id: string,
    data: { discount?: number; consumedProducts?: Array<{ productId: string; quantity: number }> }
  ): Promise<{
    success: boolean;
    pix: {
      paymentId: string;
      externalId: string;
      pixCopiaCola: string;
      pixQrCodeUrl?: string;
      finalPrice: number;
      discountAmount: number;
      salonShare: number;
      barberShare: number;
      isMock: boolean;
    };
  }> {
    const res = await fetch(`/api/appointments/${id}/pix-checkout`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao gerar Pix dinâmico');
    return resData;
  },

  async checkAppointmentPixStatus(
    id: string,
    paymentId: string
  ): Promise<{ status: 'PENDING' | 'CONFIRMED' | 'OVERDUE'; paidAt?: string; grossAmount?: number }> {
    const res = await fetch(`/api/appointments/${id}/pix-status/${paymentId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao consultar status do Pix');
    return resData;
  },

  async confirmAppointmentPix(
    id: string,
    data: { paymentId?: string; discount?: number; consumedProducts?: Array<{ productId: string; quantity: number }> }
  ): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`/api/appointments/${id}/pix-confirm`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao confirmar Pix');
    return resData;
  },

  // ================= BARBERS API =================
  async getBarbers(): Promise<Barber[]> {
    const res = await fetch('/api/barbers', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar profissionais');
    return res.json();
  },

  async setBarberOperationalStatus(
    barberId: string,
    status: 'AVAILABLE' | 'BREAK' | 'CLEANING',
    message?: string
  ): Promise<{ success: boolean; barberId: string; status: string; message: string }> {
    const res = await fetch(`/api/barbers/${barberId}/status`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, message }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao alterar status da cadeira');
    return resData;
  },

  async createBarber(data: Partial<Barber>): Promise<{ success: boolean; barber: Barber; message: string }> {
    const res = await fetch('/api/barbers', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao cadastrar profissional');
    return resData;
  },

  async updateBarber(id: string, data: Partial<Barber>): Promise<{ success: boolean; barber: Barber; message: string }> {
    const res = await fetch(`/api/barbers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar profissional');
    return resData;
  },

  async deleteBarber(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/barbers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao desativar profissional');
    return resData;
  },

  // ================= CUSTOMERS API =================
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar clientes');
    return res.json();
  },

  async getCustomer360(id: string): Promise<Customer360Response> {
    const res = await fetch(`/api/customers/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar dossiê 360 do cliente');
    return res.json();
  },

  async createCustomer(data: Partial<Customer>): Promise<{ success: boolean; customer: Customer; message: string }> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao cadastrar cliente');
    return resData;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<{ success: boolean; customer: Customer; message: string }> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar cliente');
    return resData;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover cliente');
    return resData;
  },

  // ================= SERVICES API =================
  async getServices(): Promise<Service[]> {
    const res = await fetch('/api/services', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar serviços');
    return res.json();
  },

  async createService(data: Partial<Service>): Promise<{ success: boolean; service: Service; message: string }> {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao cadastrar serviço');
    return resData;
  },

  async updateService(id: string, data: Partial<Service>): Promise<{ success: boolean; service: Service; message: string }> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar serviço');
    return resData;
  },

  async deleteService(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover serviço');
    return resData;
  },

  // ================= GALLERY / PORTFOLIO API =================
  async getGallery(): Promise<GalleryItem[]> {
    const res = await fetch('/api/gallery', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar galeria de fotos');
    return res.json();
  },

  async createGalleryItem(data: Partial<GalleryItem>): Promise<{ success: boolean; item: GalleryItem; message: string }> {
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao adicionar foto na galeria');
    return resData;
  },

  async updateGalleryItem(id: string, data: Partial<GalleryItem>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar foto da galeria');
    return resData;
  },

  async deleteGalleryItem(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover foto da galeria');
    return resData;
  },

  async likeGalleryItem(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/gallery/${id}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // ================= FINANCIAL & SPLIT API =================
  async getFinancialSummary(): Promise<FinancialSummary> {
    const res = await fetch('/api/financial/summary', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar resumo financeiro');
    return res.json();
  },

  async getFinancialEntries(): Promise<FinancialEntry[]> {
    const res = await fetch('/api/financial/entries', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar lançamentos financeiros');
    return res.json();
  },

  async createFinancialEntry(data: {
    type: 'INCOME' | 'EXPENSE';
    category: string;
    description: string;
    amount: number;
    paymentMethod?: string;
  forceOverlap?: boolean;
    barberId?: string;
    barberCommission?: number;
    dueDate?: string;
  }): Promise<{ success: boolean; entry: FinancialEntry; message: string }> {
    const res = await fetch('/api/financial/entries', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao registrar lançamento');
    return resData;
  },

  async deleteFinancialEntry(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/financial/entries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao excluir lançamento');
    return resData;
  },

  async getBarberSplits(): Promise<BarberSplitSummary[]> {
    const res = await fetch('/api/financial/barber-splits', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar splits dos profissionais');
    return res.json();
  },

  async payBarberSplit(
    barberId: string,
    data: { amount?: number; paymentMethod?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; paidAmount: number }> {
    const res = await fetch(`/api/financial/barber-splits/${barberId}/pay`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao processar repasse');
    return resData;
  },

  // ================= PRODUCTS & PDV API =================
  async getProducts(category?: string): Promise<Product[]> {
    const url = category ? `/api/products?category=${encodeURIComponent(category)}` : '/api/products';
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar lista de produtos');
    return res.json();
  },

  async createProduct(data: Partial<Product>): Promise<{ success: boolean; product: Product; message: string }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao criar produto');
    return resData;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; product: Product; message: string }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar produto');
    return resData;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover produto');
    return resData;
  },

  async sellProduct(data: ProductSalePayload): Promise<{ success: boolean; message: string; sale: any }> {
    const res = await fetch('/api/products/sell', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao concluir venda');
    return resData;
  },
  // ================= TV ADS & MÍDIA INDOOR API =================
  async getTvAds(): Promise<TvAdsResponse> {
    const res = await fetch('/api/tv-ads', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar anúncios da TV');
    return res.json();
  },

  async createTvAd(data: Partial<TvAd>): Promise<{ success: boolean; ad: TvAd; message: string }> {
    const res = await fetch('/api/tv-ads', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao cadastrar anúncio');
    return resData;
  },

  async updateTvAd(id: string, data: Partial<TvAd>): Promise<{ success: boolean; ad: TvAd; message: string }> {
    const res = await fetch(`/api/tv-ads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao atualizar anúncio');
    return resData;
  },

  async deleteTvAd(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/tv-ads/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao remover anúncio');
    return resData;
  },

  async getTvSettings(): Promise<TvSettings> {
    const res = await fetch('/api/tv-ads/settings', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar configurações da TV');
    return res.json();
  },

  async updateTvSettings(settings: Partial<TvSettings>): Promise<{ success: boolean; settings: TvSettings }> {
    const res = await fetch('/api/tv-ads/settings', {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Falha ao salvar configurações da TV');
    return resData;
  },

};