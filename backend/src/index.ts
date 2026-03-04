import 'dotenv/config';
import app from './app';
import { startReminderWorker } from './services/reminderWorker';
import { prisma } from './prisma';
import { initializeDefaultConsultationTemplate } from './utils/initializeDefaultConsultationTemplate';

const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
      console.log('⚠️ Brak użytkownika admin - pomijam inicjalizację szablonów emaili');
    }

    await initializeDefaultConsultationTemplate(prisma);
    await initializeDefaultLabResultTemplate(prisma);
  } catch (error) {
    console.error('❌ Błąd podczas inicjalizacji domyślnych szablonów:', error);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});


