import { FastifyInstance } from 'fastify';

export async function metricsRoutes(app: FastifyInstance) {
  // GET /api/metrics/dashboard
  app.get('/metrics/dashboard', async () => {
    return {
      activeClients: {
        total: 842,
        change: '+4.2%',
        subtitle: 'Base ativa neste mês',
      },
      todayAppointments: {
        total: 18,
        change: '+4.2%',
        walkIns: 4,
        onlinePix: 14,
      },
      monthlyRevenue: {
        total: 12480.0,
        change: '+3% Crescimento',
        salonShare: 6240.0,
        barberShare: 6240.0,
        taxExemptionConfirmed: true, // Lei do Salão-Parceiro
      },
      productivity: {
        completionPercentage: 85,
        completedServices: 28,
        totalServices: 32,
        noShowRate: 0.0, // Zero faltas com incentivo de Pix
      },
      productStock: [
        { name: 'Pomada Modeladora Efeito Matte', remaining: '8 un. restantes', level: 33, alert: 'warning' },
        { name: 'Espuma de Barbear Refrescante', remaining: '12% (Crítico)', level: 12, alert: 'danger' },
        { name: 'Balm Pós-Barba Toalha Quente', remaining: '5 frascos disponíveis', level: 66, alert: 'normal' },
      ],
      recentCustomers: [
        { name: 'Jordan Hedge', service: 'Coloração de Barba', rating: '4.9/5', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=96&h=96' },
        { name: 'Alexia Tina', service: 'Degradê + Hidratação', rating: '5.0/5', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=96&h=96' },
        { name: 'Sofia Anna', service: 'Corte Tesoura Premium', rating: '4.8/5', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=96&h=96' },
      ],
    };
  });
}
