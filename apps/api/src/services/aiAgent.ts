import { calculateSplit } from './splitCalculator.js';

export interface MessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiSession {
  clientPhone: string;
  clientName?: string;
  selectedServiceId?: string;
  selectedBarberId?: string;
  selectedDateTime?: string;
  stage: 'GREETING' | 'CHOOSING_SERVICE' | 'CHOOSING_BARBER' | 'CHOOSING_TIME' | 'CONFIRMING' | 'BOOKED';
  history: MessageContext[];
}

// In-memory sessions store (can be persisted to prisma.whatsAppSession)
const sessions = new Map<string, AiSession>();

// Mock Database of Services & Barbers
const servicesDb = [
  { id: 'srv-1', name: 'Fade Navalhado / Degradê', price: 50.0, duration: 40 },
  { id: 'srv-2', name: 'Barboterapia com Toalha Quente', price: 45.0, duration: 30 },
  { id: 'srv-3', name: 'Combo Completo (Cabelo + Barba)', price: 85.0, duration: 60 },
  { id: 'srv-4', name: 'Corte Clássico na Tesoura', price: 55.0, duration: 45 },
  { id: 'srv-5', name: 'Alinhamento & Pigmentação', price: 35.0, duration: 25 },
];

const barbersDb = [
  { id: 'barber-1', name: 'Diego Santos', nickname: 'Fade Master', chair: 'Cadeira 1' },
  { id: 'barber-2', name: 'Lucas Lima', nickname: 'Navalha de Ouro', chair: 'Cadeira 2' },
  { id: 'barber-3', name: 'Matheus Rocha', nickname: 'Especialista VIP', chair: 'Cadeira 3' },
];

/**
 * Intelligent WhatsApp Barbershop AI Agent.
 * Handles natural language booking, availability lookup, service recommendations,
 * and automatic 10% Pix discount calculation.
 */
export async function processWhatsAppMessage(clientPhone: string, messageText: string, clientName?: string): Promise<{
  reply: string;
  actionTaken?: string;
  bookingData?: any;
  pixCopiaCola?: string;
}> {
  // 1. Get or create session
  let session = sessions.get(clientPhone);
  if (!session) {
    session = {
      clientPhone,
      clientName: clientName || '',
      stage: 'GREETING',
      history: [],
    };
    sessions.set(clientPhone, session);
  }

  const text = messageText.toLowerCase().trim();
  session.history.push({ role: 'user', content: messageText });

  let reply = '';
  let actionTaken: string | undefined;
  let bookingData: any;
  let pixCopiaCola: string | undefined;

  // Pattern detection for barbershop conversations:
  
  // A. Pergunta sobre Preços ou Serviços
  if (text.includes('preço') || text.includes('quanto custa') || text.includes('valor') || text.includes('serviço') || text.includes('tabela')) {
    actionTaken = 'LIST_SERVICES';
    reply = `💈 *Tabela de Serviços — Atelier 88*\n\n` +
      servicesDb.map(s => `• *${s.name}*: R$ ${s.price.toFixed(2)} _(${s.duration} min)_\n  └ ⚡ *R$ ${(s.price * 0.9).toFixed(2)}* pagando no Pix (10% OFF)`).join('\n\n') +
      `\n\nQual desses serviços você gostaria de agendar hoje?`;
  }
  
  // B. Pergunta sobre Horários ou Disponibilidade ("tem horário amanhã", "tem vaga hoje")
  else if (text.includes('horario') || text.includes('horário') || text.includes('vaga') || text.includes('amanhã') || text.includes('hoje') || text.includes('tarde') || text.includes('manhã') || text.includes('noite')) {
    actionTaken = 'CHECK_AVAILABILITY';
    const day = text.includes('amanhã') ? 'Amanhã (Sexta-feira)' : 'Hoje';
    
    reply = `🗓️ *Horários disponíveis para ${day}:*\n\n` +
      `🌅 *Manhã:* 09:45, 10:30, 11:15\n` +
      `☀️ *Tarde:* 14:15, 15:00, 16:30, 17:15\n` +
      `🌙 *Noite:* 18:00, 18:45, 19:30\n\n` +
      `Qual horário fica melhor para você? Você tem preferência de barbeiro *(Diego, Lucas ou Matheus)*?`;
  }

  // C. Intenção de Agendamento com dados ou Confirmação
  else if (text.includes('agendar') || text.includes('marcar') || text.includes('pode ser') || text.includes('quero') || text.includes('15') || text.includes('14') || text.includes('16') || text.includes('17') || text.includes('10')) {
    actionTaken = 'CREATE_APPOINTMENT';

    // Identifica serviço mencionado ou default
    let service = servicesDb[0]; // Fade por padrão
    if (text.includes('barba') && text.includes('cabelo')) service = servicesDb[2]; // Combo
    else if (text.includes('barba')) service = servicesDb[1]; // Barba
    else if (text.includes('tesoura')) service = servicesDb[3];

    // Identifica barbeiro
    let barber = barbersDb[0];
    if (text.includes('lucas')) barber = barbersDb[1];
    else if (text.includes('matheus')) barber = barbersDb[2];

    // Identifica horário
    let time = '15:00';
    const timeMatch = text.match(/(\d{1,2})[h:]?(\d{2})?/);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const min = timeMatch[2] || '00';
      time = `${hour}:${min}`;
    }

    // Calcula Split com 10% OFF no Pix
    const split = calculateSplit({
      servicePrice: service.price,
      onlineDiscountActive: true,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
      barberCommissionRate: 50,
    });

    pixCopiaCola = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${split.finalPrice.toFixed(2)}`;

    bookingData = {
      service: service.name,
      barber: barber.name,
      time,
      originalPrice: service.price,
      finalPrice: split.finalPrice,
      split,
    };

    reply = `✅ *Pré-Reserva Confirmada com Sucesso!*\n\n` +
      `👤 *Cliente:* ${session.clientName || 'Cliente'}\n` +
      `💈 *Serviço:* ${service.name}\n` +
      `✂️ *Barbeiro:* ${barber.name} (${barber.chair})\n` +
      `⏰ *Horário:* Hoje às *${time}*\n\n` +
      `💰 *Valor no balcão:* ~R$ ${service.price.toFixed(2)}~\n` +
      `⚡ *Pagando no Pix agora (10% OFF):* *R$ ${split.finalPrice.toFixed(2)}*\n\n` +
      `Para garantir 100% a sua cadeira sem risco de fila, basta pagar pelo código Pix Copia-e-Cola abaixo:\n\n` +
      `\`${pixCopiaCola}\`\n\n` +
      `_Assim que você fizer o Pix, o sistema confirma o horário na hora na agenda do barbeiro! Se preferir pagar no balcão, responda "Pagar no balcão"._`;
  }

  // D. Cumprimento inicial ou ajuda geral
  else {
    actionTaken = 'GREETING';
    reply = `Olá! 💈 Seja muito bem-vindo ao *Atelier 88 Barber Lounge*!\n\n` +
      `Sou a assistente virtual da barbearia. Como posso te ajudar hoje?\n\n` +
      `1️⃣ Consultar horários livres para hoje ou amanhã\n` +
      `2️⃣ Ver nossa tabela de serviços e preços (com 10% OFF no Pix)\n` +
      `3️⃣ Agendar um corte direto comigo\n\n` +
      `Pode me responder em texto ou mandar um áudio que eu te respondo!`;
  }

  session.history.push({ role: 'assistant', content: reply });
  return { reply, actionTaken, bookingData, pixCopiaCola };
}
