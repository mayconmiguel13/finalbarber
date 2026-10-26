import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { processWhatsAppMessage } from '../services/aiAgent.js';
import { evolutionManager } from '../services/evolutionApi.js';
import { prisma } from '../db.js';

export async function whatsappRoutes(app: FastifyInstance) {
  
  // 1. WhatsApp Webhook (Evolution API / Meta Cloud API)
  app.post('/webhooks/whatsapp', async (request, reply) => {
    const body: any = request.body;

    // Security check: validate webhook secret in production
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const providedSecret = request.headers['x-webhook-secret'] || (request.query as any)?.secret || request.headers['apikey'];
    if (webhookSecret && process.env.NODE_ENV === 'production' && providedSecret !== webhookSecret) {
      return reply.status(401).send({ error: 'Assinatura inválida no Webhook' });
    }

    // Check Evolution API connection event
    if (body?.event === 'CONNECTION_UPDATE') {
      const state = body?.data?.state; // 'open', 'close', 'connecting'
      if (state === 'close') {
        evolutionManager.setConnectionStatus('DISCONNECTED', 'Queda de conexão detectada via Webhook.');
      } else if (state === 'open') {
        evolutionManager.setConnectionStatus('CONNECTED');
      }
      return reply.send({ status: 'connection_event_processed' });
    }

    // Extract phone and message safely from Evolution API payload
    const rawFrom = body?.data?.key?.remoteJid ||
                    body?.from || 
                    body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || 
                    '5511987654321';
    const from = rawFrom.split('@')[0].split(':')[0].replace(/\D/g, '') || rawFrom;
                 
    let messageText = body?.data?.message?.conversation || 
                      body?.data?.message?.extendedTextMessage?.text ||
                      body?.data?.message?.buttonsResponseMessage?.selectedButtonId ||
                      body?.data?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                      body?.message || 
                      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';

    // If audio message is received, provide fallback trigger
    if (!messageText && body?.data?.message?.audioMessage) {
      messageText = 'Quero agendar um corte';
    }

    const contactName = body?.data?.pushName || 
                        body?.contactName || 
                        body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || 
                        'Cliente';

    const contactPhoto = body?.data?.senderPhoto ||
                         body?.data?.profilePictureUrl ||
                         body?.profilePictureUrl ||
                         body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.picture ||
                         null;

    if (!messageText) {
      return reply.status(200).send({ status: 'ignored_no_text' });
    }

    const fromMe = body?.data?.key?.fromMe ?? false;
    if (fromMe) {
      return reply.status(200).send({ status: 'ignored_from_me' });
    }

    // Ignore group messages and broadcast channels (only 1-on-1 customer chats)
    const isGroup = rawFrom.includes('@g.us') || 
                    rawFrom.includes('@broadcast') || 
                    from.startsWith('120363') || 
                    Boolean(body?.data?.isGroup);
    if (isGroup) {
      return reply.status(200).send({ status: 'ignored_group_message' });
    }

    // 1. Get or create conversation in the Live Inbox
    const conv = evolutionManager.getOrCreateConversation(from, contactName, contactPhoto);

    // 2. If barber has assumed this conversation, don't auto-reply with AI
    if (!conv.aiActive) {
      evolutionManager.recordIncomingMessage(from, messageText, contactName, undefined, undefined, undefined, undefined, contactPhoto);
      return {
        status: 'held_for_barber',
        receivedFrom: from,
        customerName: contactName,
        message: messageText,
      };
    }

    // 3. Process with Google Gemini / Grounded DB Agent
    const result = await processWhatsAppMessage(from, messageText, contactName);

    // 4. Send media messages (barber photos) if present
    if (result.mediaToSend && result.mediaToSend.length > 0) {
      for (const media of result.mediaToSend) {
        await evolutionManager.sendEvolutionMediaMessage(from, media.url, media.caption);
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    // 5. Send AI text response directly to customer's WhatsApp
    if (result.reply) {
      await evolutionManager.sendEvolutionTextMessage(from, result.reply);
    }

    // 6. Record both customer message and AI response in Live Inbox
    evolutionManager.recordIncomingMessage(
      from, 
      messageText, 
      contactName, 
      result.reply, 
      result.bookingData, 
      result.pixCopiaCola, 
      result.mediaToSend,
      contactPhoto
    );

    return {
      status: 'success',
      receivedFrom: from,
      aiResponse: result.reply,
      actionTaken: result.actionTaken,
      bookingData: result.bookingData,
      mediaToSend: result.mediaToSend,
    };
  });

  // 2. Interactive Simulator Endpoint
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

    // Also record simulated interactions in the Live Inbox so they appear in real-time
    evolutionManager.recordIncomingMessage(
      clientPhone,
      message,
      clientName,
      response.reply,
      response.bookingData,
      response.pixCopiaCola,
      response.mediaToSend
    );

    return {
      success: true,
      sender: clientPhone,
      clientName,
      messageSent: message,
      reply: response.reply,
      actionTaken: response.actionTaken,
      bookingData: response.bookingData,
      pixCopiaCola: response.pixCopiaCola,
      mediaToSend: response.mediaToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  });

  // 3. Connection State & Telemetry (Grounded on Database & Evolution API)
  app.get('/whatsapp/status', async () => {
    const memoryStatus = await evolutionManager.getStatus();
    try {
      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM whatsapp_settings WHERE id = "default" LIMIT 1');
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          ...memoryStatus,
          status: r.status || memoryStatus.status,
          instanceName: r.instanceName || memoryStatus.instanceName,
          apiUrl: r.apiUrl || memoryStatus.apiUrl,
          webhookUrl: r.webhookUrl || memoryStatus.webhookUrl,
          connectedPhone: r.connectedPhone || memoryStatus.connectedPhone,
          deviceModel: r.deviceModel || memoryStatus.deviceModel,
          batteryLevel: r.batteryLevel ?? memoryStatus.batteryLevel,
          isCharging: Boolean(r.isCharging),
        };
      }
    } catch (err) {
      // Graceful fallback to memory status
    }
    return memoryStatus;
  });

  // 4. Force Connect / Disconnect / Simulate Alert
  app.post('/whatsapp/connection/toggle', async (request) => {
    const body: any = request.body;
    const targetStatus = body?.status; // 'CONNECTED' | 'DISCONNECTED' | 'QR_CODE'
    const reason = body?.reason;
    const result = await evolutionManager.setConnectionStatus(targetStatus, reason);

    try {
      await prisma.$executeRawUnsafe(
        'UPDATE whatsapp_settings SET status = ?, updatedAt = NOW() WHERE id = "default"',
        targetStatus
      );
    } catch (err) {
      // Ignore DB error
    }

    return result;
  });

  // 5. Get QR Code
  app.get('/whatsapp/qrcode', async () => {
    return await evolutionManager.getQrCode();
  });

  // 6. Update Configuration & Save to Database
  app.post('/whatsapp/config', async (request) => {
    const body: any = request.body;
    const updated = evolutionManager.updateConfig(body);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE whatsapp_settings SET 
          apiUrl = ?, instanceName = ?, webhookUrl = ?, updatedAt = NOW() 
        WHERE id = "default"`,
        body.apiUrl || 'http://127.0.0.1:18080',
        body.instanceName || 'barber-ia',
        body.webhookUrl || 'http://localhost:3333/api/webhooks/whatsapp'
      );
    } catch (err) {
      // Ignore DB error
    }

    return updated;
  });

  // 7. Live Conversations (Inbox)
  app.get('/whatsapp/conversations', async () => {
    return await evolutionManager.getConversations();
  });

  // 8. Toggle Human Takeover vs AI
  app.post('/whatsapp/conversations/:id/takeover', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body: any = request.body;
    const aiActive = body?.aiActive ?? true;
    const updated = evolutionManager.toggleAiTakeover(id, aiActive);
    if (!updated) return reply.status(404).send({ error: 'Conversation not found' });
    return updated;
  });

  // 9. Send Message in a Conversation (Human or Client)
  app.post('/whatsapp/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body: any = request.body;
    const text = body?.text || '';
    const sender = body?.sender || 'human';

    if (!text) return reply.status(400).send({ error: 'Message text required' });

    const updated = await evolutionManager.sendMessage(id, text, sender);
    if (!updated) return reply.status(404).send({ error: 'Conversation not found' });
    return updated;
  });

  // 10. Delete a Conversation
  app.delete('/whatsapp/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    evolutionManager.deleteConversation(id);
    return { success: true };
  });

  // 11. Clear All Conversations
  app.delete('/whatsapp/conversations', async () => {
    evolutionManager.clearAllConversations();
    return { success: true };
  });

  // 12. Automated Notifications (Triggers Connected to Database)
  app.get('/whatsapp/notifications', async () => {
    try {
      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM whatsapp_notifications ORDER BY id ASC');
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          key: r.key,
          title: r.title,
          description: r.description,
          enabled: Boolean(r.enabled),
          triggerTime: r.triggerTime,
          template: r.template,
          sentThisMonth: Number(r.sentThisMonth || 0),
          impactMetric: r.impactMetric,
        }));
      }
    } catch (err) {
      // Fallback to memory
    }
    return evolutionManager.getNotifications();
  });

  app.patch('/whatsapp/notifications/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body: any = request.body;

    if (typeof body?.enabled === 'boolean') {
      evolutionManager.toggleNotification(id, body.enabled);
      try {
        await prisma.$executeRawUnsafe(
          'UPDATE whatsapp_notifications SET enabled = ?, updatedAt = NOW() WHERE id = ?',
          body.enabled ? 1 : 0, id
        );
      } catch (err) {}
    }

    if (typeof body?.template === 'string') {
      evolutionManager.updateNotificationTemplate(id, body.template);
      try {
        await prisma.$executeRawUnsafe(
          'UPDATE whatsapp_notifications SET template = ?, updatedAt = NOW() WHERE id = ?',
          body.template, id
        );
      } catch (err) {}
    }

    return { success: true, message: 'Gatilho atualizado no banco de dados com sucesso.' };
  });

  // 13. Test Dispatch a Notification
  app.post('/whatsapp/notifications/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body: any = request.body || {};
    const targetPhone = (body?.phone || '553182105323').replace(/\D/g, '');

    const notifs = await evolutionManager.getNotifications();
    const notif = notifs.find((n) => n.id === id);
    if (!notif) return reply.status(404).send({ error: 'Notificação não encontrada.' });

    // Format message with sample variables
    const sampleMessage = notif.template
      .replace(/{cliente}/g, body?.clientName || 'Maycon Silva')
      .replace(/{barbeiro}/g, 'Diego Santos')
      .replace(/{barbearia}/g, 'Atelier 88 Barber Lounge')
      .replace(/{horario}/g, '15:30')
      .replace(/{codigo}/g, '88-4921');

    // Send via Evolution API
    let sent = false;
    try {
      sent = await evolutionManager.sendEvolutionTextMessage(targetPhone, `🧪 *[TESTE DE NOTIFICAÇÃO]*\n\n${sampleMessage}`);
    } catch (e) {}

    return {
      success: true,
      sentTo: targetPhone,
      messageText: sampleMessage,
      dispatchedViaWhatsApp: sent,
    };
  });

  // 14. Marketing Campaigns (Connected to Database)
  app.get('/whatsapp/campaigns', async () => {
    try {
      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM whatsapp_campaigns ORDER BY createdAt DESC');
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          segment: r.segment,
          totalRecipients: Number(r.totalRecipients || 0),
          deliveredCount: Number(r.deliveredCount || 0),
          repliedCount: Number(r.repliedCount || 0),
          bookingsCount: Number(r.bookingsCount || 0),
          revenueGenerated: Number(r.revenueGenerated || 0),
          status: r.status,
          createdAt: new Date(r.createdAt).toLocaleDateString('pt-BR'),
          messageText: r.messageText,
        }));
      }
    } catch (err) {}
    return evolutionManager.getCampaigns();
  });

  app.post('/whatsapp/campaigns', async (request, reply) => {
    const body: any = request.body;
    const { name, segment, messageText, delaySeconds } = body;

    if (!name || !segment || !messageText) {
      return reply.status(400).send({ error: 'Campos obrigatórios ausentes.' });
    }

    const campaign = evolutionManager.createCampaign({ name, segment, messageText, delaySeconds });

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO whatsapp_campaigns (
          id, name, segment, totalRecipients, deliveredCount, repliedCount, bookingsCount, revenueGenerated, status, messageText, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        campaign.id, campaign.name, campaign.segment, campaign.totalRecipients,
        campaign.deliveredCount, campaign.repliedCount, campaign.bookingsCount,
        campaign.revenueGenerated, campaign.status, campaign.messageText
      );
    } catch (err) {}

    return campaign;
  });

  // 15. AI Agent Personality & Rules Configuration (Database-Backed)
  app.get('/whatsapp/ai-config', async () => {
    try {
      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM whatsapp_settings WHERE id = "default" LIMIT 1');
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          assistantName: r.assistantName || 'Sofia',
          model: r.aiModel || 'gemini-flash-lite-latest',
          tone: r.aiTone || 'BARBER_STREET',
          pixDiscountPercent: Number(r.pixDiscountPercent ?? 10),
          maxLateToleranceMinutes: Number(r.maxLateToleranceMinutes ?? 15),
          offerComplimentaryBeer: Boolean(r.offerComplimentaryBeer),
          hasFreeParking: Boolean(r.hasFreeParking),
          customInstructions: r.customInstructions || '',
        };
      }
    } catch (err) {}

    return {
      assistantName: 'Sofia',
      model: 'gemini-flash-lite-latest',
      tone: 'BARBER_STREET',
      pixDiscountPercent: 10,
      maxLateToleranceMinutes: 15,
      offerComplimentaryBeer: true,
      hasFreeParking: true,
      customInstructions: 'Sempre mencione que temos cerveja artesanal trincando e café expresso cortesia.',
    };
  });

  app.post('/whatsapp/ai-config', async (request, reply) => {
    const body: any = request.body;
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE whatsapp_settings SET 
          assistantName = ?, aiModel = ?, aiTone = ?, pixDiscountPercent = ?,
          maxLateToleranceMinutes = ?, offerComplimentaryBeer = ?, hasFreeParking = ?,
          customInstructions = ?, updatedAt = NOW()
        WHERE id = "default"`,
        body.assistantName || 'Sofia',
        body.model || 'gemini-flash-lite-latest',
        body.tone || 'BARBER_STREET',
        Number(body.pixDiscountPercent ?? 10),
        Number(body.maxLateToleranceMinutes ?? 15),
        body.offerComplimentaryBeer ? 1 : 0,
        body.hasFreeParking ? 1 : 0,
        body.customInstructions || ''
      );

      return {
        success: true,
        message: 'Regras e personalidade da IA salvas com sucesso no banco de dados!',
        aiConfig: body,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao salvar no banco: ' + err.message });
    }
  });

  // 16. Direct WhatsApp Message Test (Live Testing)
  app.post('/whatsapp/send-test', async (request, reply) => {
    const body: any = request.body;
    const phone = (body?.phone || '').replace(/\D/g, '');
    const message = body?.message || '🧪 Olá! Mensagem de teste da barbearia Atelier 88 via Evolution API.';

    if (!phone) return reply.status(400).send({ error: 'Número de telefone é obrigatório.' });

    const sent = await evolutionManager.sendEvolutionTextMessage(phone, message);
    return {
      success: sent,
      recipient: phone,
      message,
      status: sent ? 'Enviado com sucesso via WhatsApp' : 'Falha no envio (verifique se a instância está conectada)',
    };
  });
}
