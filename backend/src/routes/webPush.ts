import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import webpush from 'web-push';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

const router = express.Router();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@trichodiagnostic.pl';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
    logger.info('Web Push VAPID skonfigurowany', { subject: vapidSubject });
} else {
    logger.warn('⚠️ VAPID keys not configured in environment! Web push will not work.');
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

        // Delete all old subscriptions for this user first (force fresh)
        await prisma.pushSubscription.deleteMany({
            where: { userId }
        });

        const newSub = await prisma.pushSubscription.create({
            data: {
                userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            }
        });

        logger.info('Push subscription created', { userId, endpoint: subscription.endpoint.substring(0, 60) });
        res.status(201).json({ message: 'Subskrypcja dodana', id: newSub.id });
    } catch (err) {
        logger.error('Push subscribe error', { error: String(err) });
        next(err);
    }
});

// Unsubscribe user from push notifications
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;
        const { endpoint } = req.body;

        if (endpoint) {
            await prisma.pushSubscription.deleteMany({
                where: { userId, endpoint }
            });
        } else {
            await prisma.pushSubscription.deleteMany({
                where: { userId }
            });
        }

        res.json({ message: 'Subskrypcja usunięta' });
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

        logger.info(`🔔 Test push for user ${userId}: found ${subs.length} subscription(s)`);

        if (subs.length === 0) {
            return res.status(404).json({ message: 'Użytkownik nie ma powiązanych urządzeń do powiadomień. Wyłącz i ponownie włącz przełącznik powiadomień Push.' });
        }

        const payload = JSON.stringify({
            title: 'Test powiadomienia',
            body: 'Powiadomienia Push działają poprawnie! 🔔',
            url: '/dashboard'
        });

        let sentCount = 0;
        const errors: string[] = [];

        for (const sub of subs) {
            try {
                logger.info('Sending push notification', { endpoint: sub.endpoint.substring(0, 80) });
                const result = await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                logger.info('Push sent OK', { statusCode: result.statusCode });
                sentCount++;
            } catch (e: any) {
                logger.error('❌ Push send error:', {
                    statusCode: e.statusCode,
                    body: e.body,
                    message: e.message,
                    endpoint: sub.endpoint.substring(0, 80)
                });
                if (e.statusCode === 410 || e.statusCode === 404) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    errors.push(`Subskrypcja wygasła (${e.statusCode}) - usunięta`);
                } else {
                    errors.push(`Błąd ${e.statusCode}: ${e.body || e.message}`);
                }
            }
        }

        res.json({
            message: `Wysłano ${sentCount} powiadomień testowych`,
            total: subs.length,
            sent: sentCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        next(err);
    }
});

export default router;
