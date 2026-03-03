import { useState, useEffect, useCallback } from 'react';
import { 
  registerServiceWorker, 
  getPushSubscription, 
  unsubscribePush, 
  subscriptionToJSON,
  isPushSupported,
  getPermissionStatus,
  requestPermission as requestNotificationPermission
} from '../utils/webPush';
import { api } from '../services/api';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permission, setPermission] = useState('default');

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);
      
      if (supported) {
        // Register service worker
        await registerServiceWorker();
        
        // Check permission status
        const permStatus = await getPermissionStatus();
        setPermission(permStatus);
        
        // Check for existing subscription
        if (permStatus === 'granted') {
          const sub = await getPushSubscription();
          if (sub) {
            setSubscription(sub);
            setIsRegistered(true);
          }
        }
      } else {
        console.warn('Push notifications are not supported in this browser');
      }
    };
    
    checkSupport();
  }, []);

  // Request permission and subscribe
  const requestPermission = useCallback(async () => {
    console.log('🔔 [PushNotifications] requestPermission called, isSupported:', isSupported);
    if (!isSupported) {
      console.warn('❌ [PushNotifications] Push notifications not supported in this browser');
      return null;
    }

    try {
      console.log('🔔 [PushNotifications] Requesting notification permission...');
      // Request notification permission
      const perm = await requestNotificationPermission();
      console.log('🔔 [PushNotifications] Permission result:', perm);
      setPermission(perm);
      
      if (perm === 'granted') {
        // Get push subscription
        const sub = await getPushSubscription();
        
        if (sub) {
          setSubscription(sub);
          
          // Convert subscription to JSON
          const subscriptionData = subscriptionToJSON(sub);
          
          // Register subscription with backend
          try {
            await api.post('/notifications/push/subscribe', {
              subscription: subscriptionData,  // Send subscription object
              platform: 'web',
              user_agent: navigator.userAgent
            });
            setIsRegistered(true);
            console.log('✅ Push notification subscription registered');
            return subscriptionData;
          } catch (error) {
            console.error('Failed to register push subscription:', error);
          }
        }
      } else {
        console.warn('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
    }
    
    return null;
  }, [isSupported]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    try {
      // Unsubscribe from push manager
      await unsubscribePush();
      
      // Unregister from backend
      if (subscription) {
        const subscriptionData = subscriptionToJSON(subscription);
        try {
          await api.post('/notifications/push/unsubscribe', { 
            subscription: subscriptionData,
            platform: 'web'
          });
        } catch (error) {
          console.error('Failed to unregister from backend:', error);
        }
      }
      
      setSubscription(null);
      setIsRegistered(false);
      console.log('✅ Push notification subscription removed');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }, [subscription]);

  return {
    subscription,
    isSupported,
    isRegistered,
    permission,
    requestPermission,
    unsubscribe
  };
};

