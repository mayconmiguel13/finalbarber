import fastify from 'fastify';
import cors from '@fastify/cors';
import { appointmentsRoutes } from './routes/appointments.js';
import { metricsRoutes } from './routes/metrics.js';
import { settingsRoutes } from './routes/settings.js';
import { whatsappRoutes } from './routes/whatsapp.js';

const app = fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, {
    origin: true,
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register feature routes
  await app.register(appointmentsRoutes, { prefix: '/api' });
  await app.register(metricsRoutes, { prefix: '/api' });
  await app.register(settingsRoutes, { prefix: '/api' });
  await app.register(whatsappRoutes, { prefix: '/api' });

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
