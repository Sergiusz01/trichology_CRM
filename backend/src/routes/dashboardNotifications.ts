import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = express.Router();

// GET /api/dashboard-notifications — list recent notifications (unread first)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.dashboardNotification.findMany({
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dashboard-notifications/:id/read — mark single notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const notification = await prisma.dashboardNotification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dashboard-notifications/read-all — mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.dashboardNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'Wszystkie powiadomienia oznaczone jako przeczytane' });
  } catch (err) {
    next(err);
  }
});

export default router;
