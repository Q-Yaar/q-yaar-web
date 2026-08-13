import { useEffect } from 'react';
import { useGetWebPushKeysQuery, useSubscribeWebPushMutation } from '../apis/notificationApi';
import { urlBase64ToUint8Array } from '../utils/pushNotifications';

export default function PushNotificationManager() {
  const { data: keysData, isSuccess: keysLoaded } = useGetWebPushKeysQuery();
  const [subscribeWebPush] = useSubscribeWebPushMutation();

  useEffect(() => {
    async function setupPush() {
      if (!keysLoaded || !keysData?.vapid_public_key) return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      try {
        // Request permission if not granted
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Register Service Worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        const convertedVapidKey = urlBase64ToUint8Array(keysData.vapid_public_key);

        if (subscription) {
          const currentKey = subscription.options.applicationServerKey;
          if (currentKey) {
            const currentKeyArray = new Uint8Array(currentKey);
            let isSameKey = currentKeyArray.length === convertedVapidKey.length;
            if (isSameKey) {
              for (let i = 0; i < currentKeyArray.length; i++) {
                if (currentKeyArray[i] !== convertedVapidKey[i]) {
                  isSameKey = false;
                  break;
                }
              }
            }
            
            if (!isSameKey) {
              await subscription.unsubscribe();
              subscription = null; // Forces re-subscription below
            }
          }
        }

        if (!subscription) {
          // Subscribe using VAPID key
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        // Send subscription to backend
        const subJson = subscription.toJSON();
        
        // Ensure keys are present before making the request
        if (subJson.endpoint && subJson.keys && subJson.keys.p256dh && subJson.keys.auth) {
          await subscribeWebPush({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
            browser: navigator.userAgent,
          }).unwrap();
        }

      } catch (err) {
        console.error('Error during push notification setup:', err);
      }
    }

    setupPush();
  }, [keysLoaded, keysData, subscribeWebPush]);

  return null;
}
