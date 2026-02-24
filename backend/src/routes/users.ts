import express from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { hashPassword } from '../utils/password';

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane').max(100),
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane').max(100).optional(),
  role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']).optional(),
  isActive: z.boolean().optional(),
});

// Middleware to check if user is admin - uses already-authenticated req.user to avoid redundant DB query
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Odmowa dostępu. Wymagane uprawnienia administratora.' });
    }
    next();
};

router.use(authenticate, requireAdmin);

// GET all users
router.get('/', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        next(err);
    }
});

// POST to create a new user
router.post('/', async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);
        const { name, email, password, role } = data;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Użytkownik o tym adresie email już istnieje' });
        }

        const passwordHash = await hashPassword(password);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role || 'DOCTOR'
            },
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        res.status(201).json(newUser);
    } catch (err) {
        next(err);
    }
});

// PUT to update user (role, isActive)
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = updateUserSchema.parse(req.body);

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// POST reset password
router.post('/:id/reset-password', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
            return res.status(400).json({ error: 'Hasło musi mieć od 6 do 128 znaków' });
        }

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
        }

        const passwordHash = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id },
            data: { passwordHash }
        });

        res.json({ message: 'Hasło zostało zmienione' });
    } catch (err) {
        next(err);
    }
});

export default router;
