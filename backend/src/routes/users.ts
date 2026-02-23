import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Odmowa dostępu. Wymagane uprawnienia administratora.' });
        }
        next();
    } catch (err) {
        next(err);
    }
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
        const { name, email, password, role } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Użytkownik o tym adresie email już istnieje' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
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
        const { name, role, isActive } = req.body;

        const updated = await prisma.user.update({
            where: { id },
            data: { name, role, isActive },
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

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
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
