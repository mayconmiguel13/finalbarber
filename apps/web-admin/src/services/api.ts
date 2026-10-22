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
    name: string;
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

export interface OrgSettings {
  themeColor: 'gold' | 'blue' | 'emerald' | 'copper';
  themeMode: 'dark' | 'light';
  onlineDiscountActive: boolean;
  onlineDiscountType: 'PERCENTAGE' | 'FIXED';
  onlineDiscountValue: number;
}

export const api = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch('/api/metrics/dashboard');
    if (!res.ok) throw new Error('Falha ao carregar métricas');
    return res.json();
  },

  async getTodayAppointments(): Promise<AppointmentItem[]> {
    const res = await fetch('/api/appointments/today');
    if (!res.ok) throw new Error('Falha ao carregar agendamentos');
    return res.json();
  },

  async getSettings(orgId = 'default-org'): Promise<OrgSettings> {
    const res = await fetch(`/api/settings/${orgId}`);
    if (!res.ok) throw new Error('Falha ao carregar configurações');
    return res.json();
  },

  async updateSettings(settings: OrgSettings, orgId = 'default-org'): Promise<{ success: boolean; settings: OrgSettings }> {
    const res = await fetch(`/api/settings/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Falha ao atualizar configurações');
    return res.json();
  },

  async createAppointment(data: {
    clientName: string;
    clientPhone: string;
    serviceId: string;
    servicePrice: number;
    barberId: string;
    barberCommissionRate?: number;
    startsAt: string;
    origin?: 'WHATSAPP_AI' | 'PWA_WEB' | 'COUNTER_WALKIN';
    payOnlineWithDiscount?: boolean;
  }) {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar agendamento');
    return res.json();
  },
};
