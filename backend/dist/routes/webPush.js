"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
if (publicVapidKey && privateVapidKey) {
    web_push_1.default.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}
else {
    console.warn('VAPID keys not configured in environment! Web push will not work.');
}
// Get VAPID Public Key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});
// Subscribe user to push notifications
router.post('/subscribe', auth_1.authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subscription = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return res.status(400).json({ error: 'Nieprawidłowa subskrypcja' });
        }
        const newSub = await prisma_1.prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                userId,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            create: {
                userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            }
        });
        res.status(201).json({ message: 'Subskrypcja dodana', id: newSub.id });
    }
    catch (err) {
        next(err);
    }
});
// Test pushing a notification manually
router.post('/test', auth_1.authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subs = await prisma_1.prisma.pushSubscription.findMany({
            where: { userId }
        });
        if (subs.length === 0) {
            return res.status(404).json({ message: 'Użytkownik nie ma powiązanych urządzeń do powiadomień' });
        }
        const payload = JSON.stringify({
            title: 'Test powiadomienia',
            body: 'Powiadomienia Push działają poprawnie w Twojej przeglądarce.',
            url: '/dashboard'
        });
        let sentCount = 0;
        for (const sub of subs) {
            try {
                await web_push_1.default.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                sentCount++;
            }
            catch (e) {
                if (e.statusCode === 410 || e.statusCode === 404) {
                    // Subscription expired or no longer valid
                    await prisma_1.prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                else {
                    console.error('Błąd wysyłania web-push:', e);
                }
            }
        }
        res.json({ message: `Wysłano ${sentCount} powiadomień testowych` });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=webPush.js.map