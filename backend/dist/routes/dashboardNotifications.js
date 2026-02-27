"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
// GET /api/dashboard-notifications — list recent notifications (unread first)
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const notifications = await prisma_1.prisma.dashboardNotification.findMany({
            orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
            take: 50,
        });
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        res.json({ notifications, unreadCount });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/dashboard-notifications/:id/read — mark single notification as read
router.patch('/:id/read', auth_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.dashboardNotification.update({
            where: { id },
            data: { isRead: true },
        });
        res.json({ notification });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/dashboard-notifications/read-all — mark all as read
router.patch('/read-all', auth_1.authenticate, async (req, res, next) => {
    try {
        await prisma_1.prisma.dashboardNotification.updateMany({
            where: { isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'Wszystkie powiadomienia oznaczone jako przeczytane' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=dashboardNotifications.js.map