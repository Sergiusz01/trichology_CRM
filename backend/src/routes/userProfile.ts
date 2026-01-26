import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hashPassword, comparePassword } from '../utils/password';
import { prisma } from '../prisma';

const router = express.Router();

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane').optional(),
  email: z.string().email('Nieprawidłowy adres email').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktualne hasło jest wymagane'),
  newPassword: z.string().min(6, 'Nowe hasło musi mieć co najmniej 6 znaków'),
});

// Get current user profile
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
        updatedAt: true,
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

// Update user profile (name, email)
router.put('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if email is already taken by another user
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Adres email jest już używany przez innego użytkownika' });
      }
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user, message: 'Profil został zaktualizowany' });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/me/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = req.user!.id;

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Aktualne hasło jest nieprawidłowe' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(data.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    res.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    next(error);
  }
});

export default router;

