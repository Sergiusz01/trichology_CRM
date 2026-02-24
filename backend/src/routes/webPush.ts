import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import webpush from 'web-push';
import { prisma } from '../prisma';

const router = express.Router();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
} else {
    console.warn('VAPID keys not configured in environment! Web push will not work.');
}

// Get VAPID Public Key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

// Subscribe user to push notifications
router.post('/subscribe', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;
        const subscription = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return res.status(400).json({ error: 'Nieprawidłowa subskrypcja' });
        }

        const newSub = await prisma.pushSubscription.upsert({
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
    } catch (err) {
        next(err);
    }
});

// Test pushing a notification manually
router.post('/test', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        const subs = await prisma.pushSubscription.findMany({
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
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                sentCount++;
            } catch (e: any) {
                if (e.statusCode === 410 || e.statusCode === 404) {
                    // Subscription expired or no longer valid
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                } else {
                    console.error('Błąd wysyłania web-push:', e);
                }
            }
        }

        res.json({ message: `Wysłano ${sentCount} powiadomień testowych` });
    } catch (err) {
        next(err);
    }
});

export default router;
