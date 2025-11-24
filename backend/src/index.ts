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
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

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

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Start reminder worker
startReminderWorker();

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


