import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { servicesRoutes } from './routes/services.js';
import { barbersRoutes } from './routes/barbers.js';
import { customersRoutes } from './routes/customers.js';
import { appointmentsRoutes } from './routes/appointments.js';
import { metricsRoutes } from './routes/metrics.js';
import { settingsRoutes } from './routes/settings.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { asaasRoutes } from './routes/asaas.js';
import { galleryRoutes } from './routes/gallery.js';
import { financialRoutes } from './routes/financial.js';
import { tvAdsRoutes } from './routes/tvAds.js';
import { initDefaultData } from './seed.js';
import { notificationScheduler } from './services/notificationScheduler.js';

const app = fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register feature routes
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(servicesRoutes, { prefix: '/api' });
  await app.register(barbersRoutes, { prefix: '/api' });
  await app.register(customersRoutes, { prefix: '/api' });
  await app.register(appointmentsRoutes, { prefix: '/api' });
  await app.register(metricsRoutes, { prefix: '/api' });
  await app.register(settingsRoutes, { prefix: '/api' });
  await app.register(whatsappRoutes, { prefix: '/api' });
  await app.register(asaasRoutes, { prefix: '/api' });
  await app.register(galleryRoutes, { prefix: '/api' });
  await app.register(financialRoutes, { prefix: '/api' });
  await app.register(tvAdsRoutes, { prefix: '/api' });

  // Garantir dados padrão no banco de dados na inicialização
  initDefaultData().catch((err) => {
    app.log.warn(`⚠️ [Seed] Inicialização de dados: ${err.message}`);
  });

  // Iniciar scheduler de notificações em segundo plano
  notificationScheduler.start(60000);

  const port = Number(process.env.PORT) || 3333;
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Barber API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
