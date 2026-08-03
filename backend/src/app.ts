/**
 * Express app factory — exported separately from index.ts so tests can import
 * without starting the HTTP server or background workers.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import cookieParser from 'cookie-parser';

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
import webPushRoutes from './routes/webPush';
import reportsRoutes from './routes/reports';
import usersRoutes from './routes/users';
import systemRoutes from './routes/system';
import appointmentActionsRoutes from './routes/appointmentActions';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';

const app = express();

const defaultOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'https://001246.xyz', 'https://www.001246.xyz',
];
const fromEnv = (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '')
  .split(',').map((s: string) => s.trim()).filter(Boolean);
const corsAllowlist = [...new Set([...defaultOrigins, ...fromEnv])];

app.set('trust proxy', 'loopback');

app.use(helmet({
  // API server — no browser rendering needed, so most helmet defaults are fine.
  // Disable contentSecurityPolicy on the API since the frontend handles its own CSP.
  contentSecurityPolicy: false,
  // HSTS: force HTTPS for 1 year (nginx already enforces HTTPS, this adds defence-in-depth)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsAllowlist.includes(origin)) return cb(null, origin);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Legacy /uploads static route with JWT auth
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use('/uploads', async (req, res, next) => {
  try {
    let token: string | undefined;
    // [SEC-10] Prefer httpOnly cookie, fall back to Bearer header, then query string (legacy)
    const cookieToken: string | undefined = req.cookies?.accessToken;
    const authHeader = req.headers.authorization;
    if (cookieToken) {
      token = cookieToken;
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.query.token as string | undefined;
    }
    if (!token) return res.status(401).send('Brak tokenu autoryzacyjnego');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET nie jest ustawiony');
    jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).send('Nieprawidłowy lub wygasły token');
  }
}, express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=86400');
  },
}));

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use('/public', express.static(publicDir));

app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
  // Disable browser caching for all API endpoints to ensure fresh data after creates/edits
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
// [QA-2] Health check with DB connectivity verification
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/consultation-templates', consultationTemplateRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/lab-result-templates', labResultTemplateRoutes);
app.use('/api/scalp-photos', scalpPhotoRoutes);
app.use('/api/uploads', scalpPhotoRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/web-push', webPushRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/appointment-actions', appointmentActionsRoutes);

app.use(errorHandler);

export default app;
