import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';
import consultationTemplateRoutes from './routes/consultationTemplates';
import labResultRoutes from './routes/labResults';
import labResultTemplateRoutes from './routes/labResultTemplates';
import scalpPhotoRoutes from './routes/scalpPhotos';
import carePlanRoutes from './routes/carePlans';
import emailRoutes from './routes/email';
import emailTemplateRoutes from './routes/emailTemplates';
import userProfileRoutes from './routes/userProfile';
import exportRoutes from './routes/export';
import visitRoutes from './routes/visits';
import dashboardRoutes from './routes/dashboard';
import activityRoutes from './routes/activity';
import { errorHandler } from './middleware/errorHandler';
import { startReminderWorker } from './services/reminderWorker';
import { prisma } from './prisma';
import { initializeDefaultConsultationTemplate } from './utils/initializeDefaultConsultationTemplate';
import { apiLimiter, authLimiter, refreshLimiter } from './middleware/rateLimit';

const app = express();

const PORT = process.env.PORT || 3001;

// CORS: allow multiple origins (FRONTEND_URLS comma-separated) or single FRONTEND_URL.
// Always allow localhost for dev. Production: add http://<VPS_IP>, https://<DOMAIN>, etc.
const defaultOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'https://001246.xyz', 'https://www.001246.xyz',
];
const fromEnv = (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);
const corsAllowlist = [...new Set([...defaultOrigins, ...fromEnv])];

// Trust proxy (required for rate limiting behind Nginx)
// 'loopback' = trust 127.0.0.1 only; avoids express-rate-limit validation warning
app.set('trust proxy', 'loopback');

// Middleware – whitelist only; no open CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / non-browser (e.g. curl)
    if (corsAllowlist.includes(origin)) return cb(null, origin);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve uploads directory to an absolute path to ensure consistency
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Legacy /uploads static route with JWT auth (kept for backward compat)
app.use('/uploads', async (req, res, next) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(401).send('Brak tokenu autoryzacyjnego');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET nie jest ustawiony');
    jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).send('Nieprawidłowy lub wygasły token');
  }
}, express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
  },
}));

// Serve static files from public directory (for logo and other assets)
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/public', express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  },
}));

// Rate limiting - apply to all API routes
app.use('/api', apiLimiter);

// Health check (no rate limit) – używaj do diagnostyki i load-balancerów
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'trichology-backend',
    corsOrigins: corsAllowlist.length,
  });
});

// Routes
// Auth routes with specific rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/consultation-templates', consultationTemplateRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/lab-result-templates', labResultTemplateRoutes);
app.use('/api/scalp-photos', scalpPhotoRoutes);
// /api/uploads/secure/:filename → handled by scalpPhotos router (/secure/:filename)
app.use('/api/uploads', scalpPhotoRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS allowlist: ${corsAllowlist.join(', ') || '(none)'}`);
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


