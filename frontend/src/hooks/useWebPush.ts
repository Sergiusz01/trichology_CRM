import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useWebPush() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setLoading(false);
        }
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking push subscription', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribe = async () => {
        try {
            setLoading(true);

            // Check if notifications are explicitly blocked
            if (Notification.permission === 'denied') {
                alert(
                    '⚠️ Powiadomienia są zablokowane w Twojej przeglądarce.\n\n' +
                    'Aby je włączyć:\n' +
                    '1. Kliknij ikonkę kłódki 🔒 obok adresu strony\n' +
                    '2. Znajdź "Powiadomienia" (Notifications)\n' +
                    '3. Zmień na "Zezwól"\n' +
                    '4. Odśwież stronę i spróbuj ponownie'
                );
                return false;
            }

            // Explicitly request permission first
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert(
                    '⚠️ Musisz zezwolić na powiadomienia, aby ta funkcja działała.\n\n' +
                    'Jeśli przypadkowo kliknąłeś "Blokuj":\n' +
                    '1. Kliknij ikonkę kłódki 🔒 obok adresu strony\n' +
                    '2. Zmień ustawienie powiadomień na "Zezwól"\n' +
                    '3. Odśwież stronę'
                );
                return false;
            }

            // Wait for service worker
            const registration = await navigator.serviceWorker.ready;

            // Get VAPID public key from backend
            const { data } = await api.get('/web-push/vapid-public-key');

            if (!data || !data.publicKey) {
                console.error('VAPID public key is missing from the server request. Ensure backend environment variables are configured.');
                return false;
            }

            const convertedVapidKey = urlBase64ToUint8Array(data.publicKey);

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Send subscription to backend
            await api.post('/web-push/subscribe', subscription);
            setIsSubscribed(true);
            return true;
        } catch (error: any) {
            console.error('Error subscribing to push notifications', error);
            if (error?.name === 'NotAllowedError') {
                alert(
                    '⚠️ Przeglądarka odmówiła dostępu do powiadomień.\n\n' +
                    'Sprawdź:\n' +
                    '1. Ustawienia powiadomień w przeglądarce (kłódka 🔒 obok adresu)\n' +
                    '2. Ustawienia systemowe (macOS: Preferencje → Powiadomienia → Chrome/Edge)\n' +
                    '3. Czy tryb "Nie przeszkadzać" nie jest włączony'
                );
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        try {
            setLoading(true);
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                // Optionally notify backend to remove subscription
                // await api.delete('/web-push/unsubscribe', { data: { endpoint: subscription.endpoint } });
            }
            setIsSubscribed(false);
            return true;
        } catch (error) {
            console.error('Error unsubscribing', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const sendTestNotification = async () => {
        try {
            await api.post('/web-push/test');
            return true;
        } catch (error) {
            console.error('Error sending test notification', error);
            return false;
        }
    };

    return {
        isSupported,
        isSubscribed,
        loading,
        subscribe,
        unsubscribe,
        sendTestNotification
    };
}
