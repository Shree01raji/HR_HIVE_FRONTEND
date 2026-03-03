// Web Push API utilities (Self-Hosted - No Firebase)
// Uses standard Web Push API with VAPID keys

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Convert VAPID key from base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String) {
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
}

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service Worker not supported');
    return null;
  }
};

// Get push subscription
export const getPushSubscription = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser');
      return null;
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.ready;
    
    console.log('🔑 [WebPush] Checking VAPID key:', VAPID_PUBLIC_KEY ? 'Found' : 'Missing');
    if (!VAPID_PUBLIC_KEY) {
      console.warn('❌ [WebPush] VAPID public key not configured - check frontend/.env and rebuild');
      return null;
    }
    console.log('✅ [WebPush] VAPID key loaded, length:', VAPID_PUBLIC_KEY.length);

    // Check if subscription already exists
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      console.log('✅ Push subscription created:', subscription);
    } else {
      console.log('✅ Existing push subscription found');
    }
    
    return subscription;
  } catch (error) {
    console.error('❌ Error getting push subscription:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribePush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error unsubscribing:', error);
    return false;
  }
};

// Convert subscription to JSON for sending to backend
export const subscriptionToJSON = (subscription) => {
  if (!subscription) return null;
  
  const keys = subscription.getKey ? {
    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
    auth: arrayBufferToBase64(subscription.getKey('auth'))
  } : subscription.keys;
  
  return {
    endpoint: subscription.endpoint,
    keys: keys
  };
};

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Check current permission status
export const getPermissionStatus = async () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
};

// Request notification permission
export const requestPermission = async () => {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return await Notification.requestPermission();
};

