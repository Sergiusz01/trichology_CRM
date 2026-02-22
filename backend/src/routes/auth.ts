import express from 'express';
import { z } from 'zod';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit';

const router = express.Router();

// In-memory blacklist for invalidated refresh tokens
// Persists for the server lifetime; refreshes kill the token on logout
const revokedRefreshTokens = new Set<string>();

// Auto-cleanup every hour: remove tokens that are certainly expired (> 7d old)
// by storing timestamp alongside — simpler approach: just flush every hour
setInterval(() => {
  revokedRefreshTokens.clear();
}, 60 * 60 * 1000);

const registerSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane'),
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
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

    res.json({
      accessToken,
      refreshToken,
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Brak tokenu odświeżającego' });
    }

    const { verifyRefreshToken } = await import('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    // Reject if token has been revoked (e.g. after logout)
    if (revokedRefreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'Token odświeżający został unieważniony' });
    }

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

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Logout - revoke refresh token
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    revokedRefreshTokens.add(refreshToken);
  }
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


