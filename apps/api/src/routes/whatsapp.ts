import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { processWhatsAppMessage } from '../services/aiAgent.js';

export async function whatsappRoutes(app: FastifyInstance) {
  
  // 1. WhatsApp Webhook (Meta Cloud API / Evolution API / Z-API compatible)
  // Receives incoming messages from clients in production
  app.post('/webhooks/whatsapp', async (request, reply) => {
    const body: any = request.body;

    // Extract phone and message according to standard webhook payload
    const from = body?.from || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '5511988887777';
    const messageText = body?.message || body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
    const contactName = body?.contactName || body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || 'Cliente';

    if (!messageText) {
      return reply.status(200).send({ status: 'ignored_no_text' });
    }

    const result = await processWhatsAppMessage(from, messageText, contactName);

    // In a live integration, here we would call WhatsApp Cloud API / Evolution API to send `result.reply` back to `from`.
    return {
      status: 'success',
      receivedFrom: from,
      aiResponse: result.reply,
      actionTaken: result.actionTaken,
      bookingData: result.bookingData,
    };
  });

  // 2. Interactive Simulator Endpoint (Used by the Admin Dashboard Live Playground)
  app.post('/whatsapp/simulate', async (request, reply) => {
    const simulateSchema = z.object({
      clientPhone: z.string().default('+55 (11) 98765-4321'),
      clientName: z.string().default('Arthur Silveira'),
      message: z.string().min(1),
    });

    const parse = simulateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.format() });
    }

    const { clientPhone, clientName, message } = parse.data;
    const response = await processWhatsAppMessage(clientPhone, message, clientName);

    return {
      success: true,
      sender: clientPhone,
      clientName,
      messageSent: message,
      reply: response.reply,
      actionTaken: response.actionTaken,
      bookingData: response.bookingData,
      pixCopiaCola: response.pixCopiaCola,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  });
}
