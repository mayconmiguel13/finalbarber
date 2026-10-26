import { prisma } from '../db.js';
import { evolutionManager } from './evolutionApi.js';
import { bookedSlotsStore } from './aiAgent.js';

class NotificationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private sentReminders = new Set<string>(); // Tracks already sent reminders to prevent duplicates
  private isRunning = false;

  public start(intervalMs: number = 60000) {
    if (this.timer) return;
    console.log(`⏱️ [NotificationScheduler] Serviço de disparos automáticos iniciado (ciclo a cada ${intervalMs / 1000}s)`);
    
    // Run initial check after 5s
    setTimeout(() => this.runCheckCycle(), 5000);

    this.timer = setInterval(() => {
      this.runCheckCycle().catch((err) => {
        console.error('[NotificationScheduler] Erro no ciclo de notificações:', err);
      });
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async runCheckCycle() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.check2HourReminders();
      await this.checkPostCutNps();
      await this.checkInactiveCustomersRecovery();
    } catch (err) {
      console.warn('[NotificationScheduler] Erro na verificação periódica:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 1. REMINDER_2H: Disparado 2 horas antes do corte
   */
  private async check2HourReminders() {
    const now = new Date();
    const inTwoHoursMin = new Date(now.getTime() + 105 * 60000); // 1h45m
    const inTwoHoursMax = new Date(now.getTime() + 135 * 60000); // 2h15m

    try {
      // 1. Check in Prisma Database
      const appointments: any = await prisma.appointment.findMany({
        where: {
          startsAt: {
            gte: inTwoHoursMin,
            lte: inTwoHoursMax,
          },
          status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
        },
        include: {
          customer: true,
          barber: { include: { user: true } },
        },
      });

      for (const apt of appointments) {
        const reminderKey = `reminder_2h_${apt.id}`;
        if (this.sentReminders.has(reminderKey)) continue;

        const phone = apt.customer?.phone;
        if (!phone) continue;

        const clientName = apt.customer?.name || 'Cliente';
        const barberName = apt.barber?.user?.name || apt.barber?.nickname || 'seu barbeiro';
        const timeStr = new Date(apt.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const message = `Fala ${clientName}! 💈 Passando para lembrar do seu agendamento hoje às *${timeStr}* com *${barberName}* no Atelier 88.\n\n` +
          `Para confirmar sua presença, responda com *[1]*.\n` +
          `Se precisar reagendar, responda com *[2]*.\n\n` +
          `Cerveja artesanal e café expresso te esperando! 🍻`;

        await evolutionManager.sendEvolutionTextMessage(phone, message);
        evolutionManager.recordIncomingMessage(phone, message, clientName, message);
        this.sentReminders.add(reminderKey);

        // Increment stats
        this.incrementTriggerCount('notif-1');
        console.log(`[NotificationScheduler] Lembrete 2h enviado para ${clientName} (${phone})`);
      }
    } catch (err) {
      // If DB is offline, check in-memory bookedSlotsStore
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      for (const slot of bookedSlotsStore) {
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotTotalMin = slotH * 60 + slotM;
        const nowTotalMin = currentHour * 60 + currentMin;
        const diffMin = slotTotalMin - nowTotalMin;

        // If slot is within 105 to 135 minutes away
        if (diffMin >= 105 && diffMin <= 135) {
          const key = `reminder_2h_slot_${slot.customerPhone}_${slot.time}`;
          if (this.sentReminders.has(key)) continue;

          const message = `Fala amigo! 💈 Lembrando do seu agendamento hoje às *${slot.time}* com o barbeiro no Atelier 88.\n` +
            `Para confirmar sua presença, responda [1]. Te esperamos com cerveja gelada! 🍻`;

          await evolutionManager.sendEvolutionTextMessage(slot.customerPhone, message);
          evolutionManager.recordIncomingMessage(slot.customerPhone, message, 'Cliente', message);
          this.sentReminders.add(key);
        }
      }
    }
  }

  /**
   * 2. POST_CUT_NPS: Disparado 45 minutos após o serviço
   */
  private async checkPostCutNps() {
    const now = new Date();
    const completedMin = new Date(now.getTime() - 65 * 60000);
    const completedMax = new Date(now.getTime() - 40 * 60000);

    try {
      const finishedApts: any = await prisma.appointment.findMany({
        where: {
          endsAt: {
            gte: completedMin,
            lte: completedMax,
          },
          status: 'COMPLETED',
        },
        include: {
          customer: true,
          barber: { include: { user: true } },
        },
      });

      for (const apt of finishedApts) {
        const npsKey = `nps_${apt.id}`;
        if (this.sentReminders.has(npsKey)) continue;

        const phone = apt.customer?.phone;
        if (!phone) continue;

        const clientName = apt.customer.name;
        const barberName = apt.barber?.user?.name || 'nosso profissional';

        const message = `Opa ${clientName}! 💈 O que achou do atendimento do *${barberName}* hoje?\n\n` +
          `De 1 a 5 estrelas, qual nota você dá para o resultado do seu corte?\n` +
          `_(Responda com o número de 1 a 5. Sua opinião é fundamental para nossa equipe!)_ ⭐`;

        await evolutionManager.sendEvolutionTextMessage(phone, message);
        evolutionManager.recordIncomingMessage(phone, message, clientName, message);
        this.sentReminders.add(npsKey);
        this.incrementTriggerCount('notif-4');
      }
    } catch (err) {}
  }

  /**
   * 3. RECOVERY_25D: Recuperação de cliente sumido (+25 dias)
   */
  private async checkInactiveCustomersRecovery() {
    // Only check once a day at 11:00 AM
    const now = new Date();
    if (now.getHours() !== 11 || now.getMinutes() > 5) return;

    try {
      const twentyFiveDaysAgo = new Date(now.getTime() - 25 * 24 * 60 * 60000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60000);

      const inactiveCustomers = await prisma.customer.findMany({
        where: {
          appointments: {
            some: {
              startsAt: {
                gte: thirtyDaysAgo,
                lte: twentyFiveDaysAgo,
              },
            },
            none: {
              startsAt: { gte: twentyFiveDaysAgo },
            },
          },
        },
        take: 10,
      });

      for (const cust of inactiveCustomers) {
        const key = `recovery_25d_${cust.id}_${now.getMonth()}`;
        if (this.sentReminders.has(key)) continue;

        const message = `Fala ${cust.name}! 💈 Já faz quase 1 mês desde seu último corte aqui no Atelier 88!\n\n` +
          `Seu visual já merece aquele trato de respeito. Liberamos um cupom especial de *10% OFF no Pix* para você renovar nesta semana!\n\n` +
          `Gostaria de agendar seu horário hoje? Responda com *"Quero agendar"*! ✂️`;

        await evolutionManager.sendEvolutionTextMessage(cust.phone, message);
        evolutionManager.recordIncomingMessage(cust.phone, message, cust.name, message);
        this.sentReminders.add(key);
        this.incrementTriggerCount('notif-3');
      }
    } catch (err) {}
  }

  private async incrementTriggerCount(notifId: string) {
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE whatsapp_notifications SET sentThisMonth = sentThisMonth + 1, updatedAt = NOW() WHERE id = ?',
        notifId
      );
    } catch (err) {}
  }
}

export const notificationScheduler = new NotificationScheduler();
