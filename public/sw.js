// Service Worker for Web Push Notifications (Self-Hosted)
// This runs in the background even when the browser is closed

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[sw.js] Push notification received:', event);
  
  let notificationData = {
    title: 'HR-Hive Notification',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'hr-hive-notification',
    requireInteraction: false,
    data: {
      url: '/admin/tasks'
    }
  };
  
  // Parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.task_id ? `task-${payload.data.task_id}` : 'hr-hive-notification',
        requireInteraction: payload.data?.requireInteraction || payload.requireInteraction || false,
        data: {
          url: payload.data?.action_url || payload.url || '/admin/tasks',
          task_id: payload.data?.task_id,
          ...payload.data
        },
        actions: payload.data?.task_id ? [
          {
            action: 'update-status',
            title: 'Update Status',
            icon: '/favicon.ico'
          },
          {
            action: 'view',
            title: 'View Task',
            icon: '/favicon.ico'
          }
        ] : []
      };
    } catch (e) {
      console.error('[sw.js] Error parsing push data:', e);
      // Use text data if JSON parsing fails
      if (event.data.text) {
        notificationData.body = event.data.text();
      }
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let url = data.url || '/admin/tasks';
  
  // Handle action buttons
  if (action === 'update-status' && data.task_id) {
    url = `/admin/tasks?task_id=${data.task_id}&action=update-status`;
  } else if (action === 'view' && data.task_id) {
    url = `/admin/tasks?task_id=${data.task_id}`;
  } else if (data.task_id) {
    url = `/admin/tasks?task_id=${data.task_id}`;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
  
  // Dispatch custom event for task status update
  if (data.task_id && action === 'update-status') {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'TASK_STATUS_UPDATE',
            task_id: data.task_id
          });
        });
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[sw.js] Notification closed:', event);
});

