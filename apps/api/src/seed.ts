import { prisma } from './db.js';

export async function initDefaultData() {
  console.log('🔄 [Seed] Verificando dados padrão no banco de dados...');

  try {
    // 1. Organização Padrão
    const org = await prisma.organization.upsert({
      where: { slug: 'atelier88' },
      update: {
        name: 'Atelier 88 Barber Lounge',
        phone: '+55 11 98765-4321',
        document: '12.345.678/0001-90',
        address: 'Rua Oscar Freire, 888 - Jardins',
        city: 'São Paulo',
        state: 'SP',
        themeColor: 'gold',
        themeMode: 'dark',
        onlineDiscountActive: true,
        onlineDiscountType: 'PERCENTAGE',
        onlineDiscountValue: 10.0,
      },
      create: {
        name: 'Atelier 88 Barber Lounge',
        slug: 'atelier88',
        phone: '+55 11 98765-4321',
        document: '12.345.678/0001-90',
        address: 'Rua Oscar Freire, 888 - Jardins',
        city: 'São Paulo',
        state: 'SP',
        themeColor: 'gold',
        themeMode: 'dark',
        onlineDiscountActive: true,
        onlineDiscountType: 'PERCENTAGE',
        onlineDiscountValue: 10.0,
      },
    });

    console.log(`✅ [Seed] Organização garantida: ${org.name} (${org.id})`);

    // 2. Serviços Padrão
    const defaultServices = [
      {
        name: 'Fade Navalhado / Degradê',
        description: 'Corte moderno com acabamento na navalha e transição suave.',
        durationMinutes: 40,
        price: 50.0,
      },
      {
        name: 'Barboterapia com Toalha Quente',
        description: 'Tratamento completo com toalha aquecida, óleos essenciais e massagem facial.',
        durationMinutes: 30,
        price: 45.0,
      },
      {
        name: 'Combo Completo (Cabelo + Barba)',
        description: 'O pacote completo: corte fade navalhado + barboterapia relaxante.',
        durationMinutes: 60,
        price: 85.0,
      },
      {
        name: 'Corte Clássico na Tesoura',
        description: 'Corte tradicional estilizado 100% na tesoura para acabamento sofisticado.',
        durationMinutes: 45,
        price: 55.0,
      },
      {
        name: 'Alinhamento & Pigmentação',
        description: 'Correção de falhas e realce da linha da barba ou cabelo.',
        durationMinutes: 25,
        price: 35.0,
      },
    ];

    for (const s of defaultServices) {
      const existing = await prisma.service.findFirst({
        where: { orgId: org.id, name: s.name },
      });

      if (!existing) {
        await prisma.service.create({
          data: {
            orgId: org.id,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            active: true,
          },
        });
      } else {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            active: true,
          },
        });
      }
    }
    console.log(`✅ [Seed] ${defaultServices.length} serviços padrão sincronizados.`);

    // 3. Os 2 Barbeiros (Diego Santos e Lucas Lima)
    const barbers = [
      {
        name: 'Diego Santos',
        email: 'diego@atelier88.com.br',
        phone: '+55 11 98888-0001',
        nickname: 'Fade Master',
        chair: 'Cadeira 1',
        specialties: 'Degradê Navalhado, Fade Moderno & Barboterapia',
        avatarUrl:
          'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600',
        pixKey: 'diego.santos@pix.com',
        document: '123.456.789-01',
        commissionRate: 50.0,
      },
      {
        name: 'Lucas Lima',
        email: 'lucas@atelier88.com.br',
        phone: '+55 11 98888-0002',
        nickname: 'Navalha de Ouro',
        chair: 'Cadeira 2',
        specialties: 'Corte Clássico na Tesoura, Barba Terapia & Pigmentação',
        avatarUrl:
          'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600',
        pixKey: 'lucas.lima@pix.com',
        document: '987.654.321-09',
        commissionRate: 50.0,
      },
    ];

    for (const b of barbers) {
      const user = await prisma.user.upsert({
        where: { email: b.email },
        update: {
          name: b.name,
          phone: b.phone,
          avatarUrl: b.avatarUrl,
          role: 'BARBER',
          active: true,
          orgId: org.id,
        },
        create: {
          orgId: org.id,
          name: b.name,
          email: b.email,
          phone: b.phone,
          passwordHash: '$2a$10$defaultHashForBarbersAtelier88',
          avatarUrl: b.avatarUrl,
          role: 'BARBER',
          active: true,
        },
      });

      await prisma.barberProfile.upsert({
        where: { userId: user.id },
        update: {
          orgId: org.id,
          nickname: b.nickname,
          document: b.document,
          pixKey: b.pixKey,
          commissionRate: b.commissionRate,
          bio: `${b.specialties}. ${b.chair}.`,
          active: true,
        },
        create: {
          userId: user.id,
          orgId: org.id,
          nickname: b.nickname,
          document: b.document,
          pixKey: b.pixKey,
          commissionRate: b.commissionRate,
          bio: `${b.specialties}. ${b.chair}.`,
          active: true,
        },
      });
    }
    console.log(`✅ [Seed] ${barbers.length} barbeiros profissionais cadastrados/atualizados.`);

    // 4. Configurações padrão de WhatsApp (whatsapp_settings)
    await prisma.whatsAppSetting.upsert({
      where: { id: 'default' },
      update: {
        orgId: org.id,
        instanceName: 'barber-ia',
        apiUrl: process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8088',
        webhookUrl: 'http://localhost:3333/api/webhooks/whatsapp',
        connectedPhone: '+55 11 98765-4321',
        status: 'CONNECTED',
        deviceModel: 'iPhone 15 Pro • WhatsApp Business',
        batteryLevel: 88,
        isCharging: true,
        assistantName: 'Sofia',
        aiModel: 'gemini-flash-lite-latest',
        aiTone: 'BARBER_STREET',
        pixDiscountPercent: 10,
        maxLateToleranceMinutes: 15,
        offerComplimentaryBeer: true,
        hasFreeParking: true,
        customInstructions:
          'Sempre mencione que temos cerveja artesanal trincando e café expresso cortesia.',
      },
      create: {
        id: 'default',
        orgId: org.id,
        instanceName: 'barber-ia',
        apiUrl: 'http://127.0.0.1:18080',
        webhookUrl: 'http://localhost:3333/api/webhooks/whatsapp',
        connectedPhone: '+55 11 98765-4321',
        status: 'CONNECTED',
        deviceModel: 'iPhone 15 Pro • WhatsApp Business',
        batteryLevel: 88,
        isCharging: true,
        assistantName: 'Sofia',
        aiModel: 'gemini-flash-lite-latest',
        aiTone: 'BARBER_STREET',
        pixDiscountPercent: 10,
        maxLateToleranceMinutes: 15,
        offerComplimentaryBeer: true,
        hasFreeParking: true,
        customInstructions:
          'Sempre mencione que temos cerveja artesanal trincando e café expresso cortesia.',
      },
    });
    console.log('✅ [Seed] Configurações de WhatsApp (Sofia IA) inicializadas com sucesso.');

    // 5. Os 6 Gatilhos de Notificação Automática (whatsapp_notifications)
    const notifications = [
      {
        id: 'notif-1',
        key: 'REMINDER_2H',
        title: 'Lembrete de Agendamento (2 Horas Antes)',
        description:
          'Envia mensagem automática para o cliente confirmando presença. Reduz faltas (no-show) em até 85%.',
        enabled: true,
        triggerTime: '2 horas antes do horário',
        template:
          'Fala {cliente}! 💈 Lembrando do seu agendamento hoje às {horario} com {barbeiro}. Para confirmar, responda [1]. Se precisar reagendar, responda [2]. Te esperamos!',
        sentThisMonth: 184,
        impactMetric: '97.4% de Presença',
      },
      {
        id: 'notif-2',
        key: 'REMINDER_EVE',
        title: 'Lembrete de Véspera (Noite Anterior)',
        description: 'Disparado às 20h do dia anterior ao corte para evitar esquecimentos.',
        enabled: true,
        triggerTime: 'Às 20:00 da véspera',
        template:
          'Boa noite, {cliente}! Passando para lembrar do seu corte amanhã às {horario} no {barbearia}. Até amanhã!',
        sentThisMonth: 122,
        impactMetric: 'Zero esquecimentos',
      },
      {
        id: 'notif-3',
        key: 'RECOVERY_25D',
        title: 'Recuperação de Cliente Sumido (Anti-Churn)',
        description:
          'Quando o cliente passa de 25 dias sem cortar, a IA dispara um convite com 10% OFF para reativá-lo.',
        enabled: true,
        triggerTime: '25 dias após o último corte',
        template:
          'Fala {cliente}! Já faz 25 dias desde o seu último corte com {barbeiro}. Seu visual já merece aquele trato de respeito! Agende hoje pelo Pix e ganhe 10% OFF.',
        sentThisMonth: 48,
        impactMetric: '41 Clientes Reativados (R$ 2.450)',
      },
      {
        id: 'notif-4',
        key: 'POST_CUT_NPS',
        title: 'Pesquisa de Satisfação & Google Reviews (Pós-Corte)',
        description:
          'Disparo 45 minutos após o corte. Se o cliente der nota 5, convida para avaliar a barbearia no Google!',
        enabled: true,
        triggerTime: '45 minutos após o serviço',
        template:
          'Opa {cliente}! O que achou do atendimento do {barbeiro} hoje? De 1 a 5 estrelas, qual nota você dá para o resultado do seu corte?',
        sentThisMonth: 160,
        impactMetric: 'Nota 4.9 no Google (+32 reviews)',
      },
      {
        id: 'notif-5',
        key: 'BIRTHDAY_GIFT',
        title: 'Aniversariantes do Mês',
        description:
          'Envia um parabéns caloroso com 20% de desconto ou serviço cortesia na semana do aniversário.',
        enabled: true,
        triggerTime: 'Às 09:00 no dia do aniversário',
        template:
          'Parabéns {cliente}! 🎂 A equipe do {barbearia} deseja muita saúde e sucesso! Seu presente da semana: 20% OFF no seu corte ou barba. Vem comemorar!',
        sentThisMonth: 19,
        impactMetric: '14 Aniversariantes Agendaram',
      },
      {
        id: 'notif-6',
        key: 'PIX_CONFIRMED',
        title: 'Confirmação de Pagamento Pix Instantâneo',
        description:
          'Envia o recibo do Pix e os dados da reserva assim que o webhook do banco compensa o pagamento.',
        enabled: true,
        triggerTime: 'Instantâneo após pagamento Pix',
        template:
          'Pagamento Pix recebido com sucesso! ✅ Seu horário com {barbeiro} está bloqueado na agenda. Código de segurança do agendamento: #{codigo}',
        sentThisMonth: 215,
        impactMetric: '100% de Automação',
      },
    ];

    for (const n of notifications) {
      await prisma.whatsAppNotification.upsert({
        where: { key: n.key },
        update: {
          title: n.title,
          description: n.description,
          enabled: n.enabled,
          triggerTime: n.triggerTime,
          template: n.template,
          sentThisMonth: n.sentThisMonth,
          impactMetric: n.impactMetric,
        },
        create: {
          id: n.id,
          key: n.key,
          title: n.title,
          description: n.description,
          enabled: n.enabled,
          triggerTime: n.triggerTime,
          template: n.template,
          sentThisMonth: n.sentThisMonth,
          impactMetric: n.impactMetric,
        },
      });
    }
    console.log(`✅ [Seed] ${notifications.length} gatilhos de WhatsApp cadastrados/atualizados.`);

    console.log('🎉 [Seed] Todos os dados padrão foram garantidos com sucesso no MySQL!');
  } catch (error: any) {
    console.warn('⚠️ [Seed] Aviso ao rodar seed inicial:', error?.message || error);
  }
}

// Execução direta como script de terminal: npx tsx src/seed.ts
if (process.argv[1]?.replace(/\\/g, '/').endsWith('src/seed.ts')) {
  initDefaultData()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
