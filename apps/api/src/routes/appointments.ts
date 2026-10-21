import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { calculateSplit } from '../services/splitCalculator.js';

export async function appointmentsRoutes(app: FastifyInstance) {
  // GET /api/appointments/today
  app.get('/appointments/today', async () => {
    return [
      {
        id: 'apt-1',
        time: '09:00',
        clientName: 'Jordan Hedge',
        clientPhone: '+55 11 98765-4321',
        serviceName: 'Coloração de Barba',
        barberName: 'Diego Santos',
        chair: 'Cadeira 1',
        status: 'COMPLETED',
        origin: 'WHATSAPP_AI',
        originalPrice: 80.0,
        discountAmount: 8.0,
        finalPrice: 72.0,
        paymentStatus: 'PAID',
        paymentMethod: 'PIX',
      },
      {
        id: 'apt-2',
        time: '10:00',
        clientName: 'Milo Silva',
        clientPhone: '+55 11 97654-3210',
        serviceName: 'Buzz Cut + Barba Terapia',
        barberName: 'Marcus Barber',
        chair: 'Cadeira 2',
        status: 'IN_PROGRESS',
        origin: 'WHATSAPP_AI',
        originalPrice: 60.0,
        discountAmount: 6.0,
        finalPrice: 54.0,
        paymentStatus: 'PAID',
        paymentMethod: 'PIX',
      },
      {
        id: 'apt-3',
        time: '11:00',
        clientName: 'Luna Costa',
        clientPhone: '+55 11 96543-2109',
        serviceName: 'Design de Sobrancelha',
        barberName: 'Matheus Rocha',
        chair: 'Cadeira 3',
        status: 'CONFIRMED',
        origin: 'COUNTER_WALKIN',
        originalPrice: 35.0,
        discountAmount: 0.0,
        finalPrice: 35.0,
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
      },
      {
        id: 'apt-4',
        time: '12:00',
        clientName: 'Oliver Prado',
        clientPhone: '+55 11 95432-1098',
        serviceName: 'Toalha Quente & Barba',
        barberName: 'Diego Santos',
        chair: 'Cadeira 1',
        status: 'CONFIRMED',
        origin: 'PWA_WEB',
        originalPrice: 50.0,
        discountAmount: 5.0,
        finalPrice: 45.0,
        paymentStatus: 'PAID',
        paymentMethod: 'PIX',
      },
    ];
  });

  // POST /api/appointments
  app.post('/appointments', async (request, reply) => {
    const createSchema = z.object({
      clientName: z.string().min(2),
      clientPhone: z.string().min(8),
      serviceId: z.string(),
      servicePrice: z.number().positive(),
      barberId: z.string(),
      barberCommissionRate: z.number().default(50),
      startsAt: z.string(),
      origin: z.enum(['WHATSAPP_AI', 'PWA_WEB', 'COUNTER_WALKIN']).default('WHATSAPP_AI'),
      payOnlineWithDiscount: z.boolean().default(true),
    });

    const body = createSchema.parse(request.body);

    const split = calculateSplit({
      servicePrice: body.servicePrice,
      onlineDiscountActive: body.payOnlineWithDiscount,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
      barberCommissionRate: body.barberCommissionRate,
    });

    return reply.status(201).send({
      id: `apt-${Date.now()}`,
      clientName: body.clientName,
      startsAt: body.startsAt,
      status: 'CONFIRMED',
      split,
      pixCopiaCola: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540' + split.finalPrice.toFixed(2),
      message: 'Agendamento criado e split calculado com sucesso.',
    });
  });
}
