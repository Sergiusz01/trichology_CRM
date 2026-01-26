import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';
import labResultRoutes from './routes/labResults';
import scalpPhotoRoutes from './routes/scalpPhotos';
import carePlanRoutes from './routes/carePlans';
import emailRoutes from './routes/email';
import emailTemplateRoutes from './routes/emailTemplates';
import userProfileRoutes from './routes/userProfile';
import exportRoutes from './routes/export';
import { errorHandler } from './middleware/errorHandler';
import { startReminderWorker } from './services/reminderWorker';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (secure route - authentication required in routes)
const uploadsPath = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'storage/uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set CORS headers for images
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Cache images for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/scalp-photos', scalpPhotoRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/export', exportRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Start reminder worker
startReminderWorker();

// Initialize default email templates on startup (if no templates exist)
(async () => {
  try {
    // Wait a bit for database connection to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { initializeDefaultTemplates } = await import('./utils/initializeDefaultTemplates');

    // Get first admin user to use as creator
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (admin && prisma) {
      await initializeDefaultTemplates(admin.id, prisma);
    } else {
      console.log('⚠️ Brak użytkownika admin lub prisma nie jest zainicjalizowane - pomijam inicjalizację szablonów');
    }
  } catch (error) {
    console.error('❌ Błąd podczas inicjalizacji domyślnych szablonów:', error);
    // Don't throw - this is not critical for server startup
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


