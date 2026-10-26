import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { evolutionManager } from '../services/evolutionApi.js';

export async function asaasRoutes(app: FastifyInstance) {

  // 1. Asaas Webhook Endpoint (Receives Real Bank Confirmation)
  app.post('/webhooks/asaas', async (request, reply) => {
    const body: any = request.body;
    const event = body?.event; // 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'
    const payment = body?.payment;

    if (!payment?.id) {
      return reply.status(200).send({ status: 'ignored_no_payment_id' });
    }

    const externalId = payment.id;
    console.log(`[Asaas Webhook] Evento recebido: ${event} para cobrança ${externalId}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      try {
        // Find transaction
        const tx = await prisma.transaction.findFirst({
          where: {
            OR: [
              { externalId },
              { appointmentId: payment.externalReference || externalId },
            ],
          },
          include: {
            appointment: {
              include: {
                customer: true,
                barber: { include: { user: true } },
                service: true,
              },
            },
          },
        });

        if (tx) {
          // Update transaction to PAID
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
            },
          });

          // Confirm appointment
          if (tx.appointmentId) {
            await prisma.appointment.update({
              where: { id: tx.appointmentId },
              data: { status: 'CONFIRMED' },
            });
          }

          // Trigger WhatsApp confirmation message
          const apt = tx.appointment;
          if (apt && apt.customer) {
            const clientPhone = apt.customer.phone;
            const barberName = apt.barber?.user?.name || apt.barber?.nickname || 'seu barbeiro';
            const serviceName = apt.service?.name || 'Corte';
            const dateStr = new Date(apt.startsAt).toLocaleDateString('pt-BR');
            const timeStr = new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const receiptMessage = `✅ *Pagamento Pix Confirmado Instantaneamente!*\n\n` +
              `Recebemos seu Pix no valor de *R$ ${Number(tx.grossAmount).toFixed(2)}* com 10% OFF anti-falta aplicado.\n\n` +
              `📋 *Resumo da Reserva:*\n` +
              `• *Serviço:* ${serviceName}\n` +
              `• *Barbeiro:* ${barberName}\n` +
              `• *Data & Horário:* ${dateStr} às *${timeStr}*\n` +
              `• *Código de Segurança:* #${tx.id.slice(-6).toUpperCase()}\n\n` +
              `Sua vaga está 100% garantida na cadeira. Cerveja artesanal e café expresso te esperando! 🍻💈`;

            // Send via Evolution API
            await evolutionManager.sendEvolutionTextMessage(clientPhone, receiptMessage);

            // Record in Live Chat Inbox
            evolutionManager.recordIncomingMessage(
              clientPhone,
              receiptMessage,
              apt.customer.name,
              receiptMessage
            );

            console.log(`[Asaas Webhook] Recibo Pix enviado via WhatsApp para ${clientPhone}`);
          }
        }
      } catch (err) {
        console.error('[Asaas Webhook] Erro ao processar confirmação de pagamento:', err);
      }
    }

    return reply.status(200).send({ received: true });
  });

  // 2. Simulator: Force Pix Payment Confirmation (Local Dev / QA Testing)
  app.post('/asaas/simulate-paid', async (request, reply) => {
    const body: any = request.body || {};
    const targetPhone = (body?.phone || '5511987654321').replace(/\D/g, '');

    const receiptMessage = `✅ *[SIMULAÇÃO ASAAS]* Pagamento Pix Compensado com Sucesso! 💸\n\n` +
      `Seu agendamento no *Atelier 88 Barber Lounge* está 100% confirmado na agenda do barbeiro.\n` +
      `Cerveja artesanal e café expresso cortesia à sua espera! 🍻💈`;

    await evolutionManager.sendEvolutionTextMessage(targetPhone, receiptMessage);
    evolutionManager.recordIncomingMessage(targetPhone, receiptMessage, body?.clientName || 'Cliente', receiptMessage);

    return {
      success: true,
      status: 'PAYMENT_RECEIVED',
      phone: targetPhone,
      message: 'Pagamento Pix simulado e recibo enviado no WhatsApp.',
    };
  });
}
