import express from 'express';
import { z } from 'zod';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit';

import crypto from 'crypto';
import { CookieOptions } from 'express';

/**
 * [SEC-10] Cookie configuration for refresh tokens.
 * httpOnly: prevents JavaScript access (XSS protection)
 * secure: only sent over HTTPS
 * sameSite: strict CSRF protection
 * path: only sent to auth endpoints (minimize exposure)
 */
const REFRESH_COOKIE_NAME = 'refreshToken';
const getRefreshCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const maxAgeMs = refreshExpiresIn.endsWith('d')
    ? parseInt(refreshExpiresIn) * 86400000
    : parseInt(refreshExpiresIn) * 1000;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
};

/**
 * [SEC-10] Cookie configuration for access tokens.
 * path: '/' so the cookie is sent with all API requests.
 */
const ACCESS_COOKIE_NAME = 'accessToken';
const getAccessCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  const accessExpiresIn = process.env.JWT_EXPIRES_IN || '5m';
  const maxAgeMs = accessExpiresIn.endsWith('m')
    ? parseInt(accessExpiresIn) * 60000
    : accessExpiresIn.endsWith('h')
    ? parseInt(accessExpiresIn) * 3600000
    : accessExpiresIn.endsWith('d')
    ? parseInt(accessExpiresIn) * 86400000
    : parseInt(accessExpiresIn) * 1000;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
};

const router = express.Router();

/**
 * Hash a refresh token with SHA-256 before storing in DB.
 * We never store raw tokens — only hashes.
 */
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// Auto-cleanup expired refresh tokens from DB every hour
setInterval(async () => {
  try {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // Ignore cleanup errors
  }
}, 60 * 60 * 1000);

// Czas bezczynności po którym sesja wygasa (musi być taki sam jak na frontendzie)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minut

const registerSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane'),
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/, 'Hasło musi zawierać min. 8 znaków, w tym małą i wielką literę oraz cyfrę'),
  role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

// Register (admin only)
router.post('/register', authLimiter, authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const { name, email, password, role } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik o tym adresie email już istnieje' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'DOCTOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Konto zostało dezaktywowane. Skontaktuj się z administratorem.' });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const getClientIp = (r: express.Request) =>
      (r.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || r.ip || '';

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          method: 'POST',
          path: '/api/auth/login',
          ip: getClientIp(req) || undefined,
          userAgent: (req.headers['user-agent'] as string) || undefined,
        },
      });
    } catch {
      /* nie przerywaj logowania przy błędzie audytu */
    }

    // [SEC-10] Set both tokens as httpOnly cookies — JS cannot access them
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', refreshLimiter, async (req, res, next) => {
  try {
    // [SEC-10] Read refresh token from httpOnly cookie (fallback to body for backward compat)
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const { lastActivityTime } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Brak tokenu odświeżającego' });
    }

    // Sprawdź bezczynność użytkownika — jeśli frontend przesłał znacznik czasu
    if (lastActivityTime !== undefined && lastActivityTime !== null) {
      const lastActivity = parseInt(String(lastActivityTime), 10);
      if (!isNaN(lastActivity) && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        return res.status(401).json({ error: 'Sesja wygasła z powodu braku aktywności' });
      }
    }

    // Reject if token has been revoked (e.g. after logout) — check in DB
    const tokenHash = hashToken(refreshToken);
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (existingToken?.revokedAt) {
      return res.status(401).json({ error: 'Token odświeżający został unieważniony' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Revoke old token and store new token in DB (token rotation)
    const oldTokenHash = hashToken(refreshToken);
    const newTokenHash = hashToken(newRefreshToken);
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresMs = refreshExpiresIn.endsWith('d')
      ? parseInt(refreshExpiresIn) * 86400000
      : parseInt(refreshExpiresIn) * 1000;

    // Store the new token
    const newStoredToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + expiresMs),
      },
    });

    // Revoke the old token and link to the new one
    if (existingToken) {
      await prisma.refreshToken.update({
        where: { tokenHash: oldTokenHash },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newStoredToken.id,
        },
      });
    } else {
      // Old token wasn't tracked — create a revoked record for it
      await prisma.refreshToken.upsert({
        where: { tokenHash: oldTokenHash },
        update: { revokedAt: new Date(), replacedByTokenId: newStoredToken.id },
        create: {
          userId: user.id,
          tokenHash: oldTokenHash,
          expiresAt: new Date(),
          revokedAt: new Date(),
          replacedByTokenId: newStoredToken.id,
        },
      });
    }

    // [SEC-10] Set new tokens as httpOnly cookies
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
    res.cookie(ACCESS_COOKIE_NAME, newAccessToken, getAccessCookieOptions());

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Logout - revoke refresh token (persisted in DB)
router.post('/logout', async (req, res) => {
  // [SEC-10] Read from cookie first, then body for backward compat
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  if (refreshToken && typeof refreshToken === 'string') {
    try {
      // Verify token before revoking — prevents polluting DB
      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = hashToken(refreshToken);
      const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
      const expiresMs = refreshExpiresIn.endsWith('d')
        ? parseInt(refreshExpiresIn) * 86400000
        : parseInt(refreshExpiresIn) * 1000;

      await prisma.refreshToken.upsert({
        where: { tokenHash },
        update: { revokedAt: new Date() },
        create: {
          userId: decoded.userId,
          tokenHash,
          expiresAt: new Date(Date.now() + expiresMs),
          revokedAt: new Date(),
        },
      });
    } catch {
      // Invalid or expired token — ignore, session is ending anyway
    }
  }
  // [SEC-10] Clear both httpOnly cookies
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
  });
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
  return res.json({ message: 'Wylogowano pomyślnie' });
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;


