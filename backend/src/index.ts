import 'dotenv/config';
import app from './app';
import { startReminderWorker } from './services/reminderWorker';
import { prisma } from './prisma';
import { initializeDefaultConsultationTemplate } from './utils/initializeDefaultConsultationTemplate';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

// ── Startup env validation ────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  logger.error(`Brakujące zmienne środowiskowe: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Start reminder worker
startReminderWorker();

// Initialize default email templates and lab result template on startup (if missing)
(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { initializeDefaultTemplates } = await import('./utils/initializeDefaultTemplates');
    const { initializeDefaultLabResultTemplate } = await import('./utils/initializeDefaultLabResultTemplates');

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (admin && prisma) {
      await initializeDefaultTemplates(admin.id, prisma);
    } else {
      logger.info('Brak użytkownika admin - pomijam inicjalizację szablonów emaili');
    }

    await initializeDefaultConsultationTemplate(prisma);
    await initializeDefaultLabResultTemplate(prisma);
  } catch (error) {
    logger.error('Błąd podczas inicjalizacji domyślnych szablonów', { error });
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});


