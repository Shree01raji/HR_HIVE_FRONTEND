import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';

const RealTimeContext = createContext();

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

export const RealTimeProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [realTimeData, setRealTimeData] = useState({
    analytics: null,
    leaves: null,
    timesheet: null,
    performance: null,
    engagement: null,
    workflows: null
  });

  // Get token from localStorage (AuthContext doesn't export token directly)
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  
  // Listen for token changes in localStorage
  useEffect(() => {
    const checkToken = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken !== token) {
        console.log('🔄 [RealTime] Token changed in localStorage');
        setToken(storedToken);
      }
    };
    
    // Check periodically for token changes
    const interval = setInterval(checkToken, 1000);
    window.addEventListener('storage', checkToken);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkToken);
    };
  }, [token]);

  // Initialize push notifications
  const { requestPermission, isSupported, isRegistered } = usePushNotifications();

  // Request push notification permission when user logs in
  useEffect(() => {
    console.log('🔔 [RealTime] Push notification check:', { 
      hasUser: !!user, 
      hasToken: !!token, 
      isSupported, 
      isRegistered 
    });
    if (user && token && isSupported && !isRegistered) {
      console.log('🔔 [RealTime] Will request push permission in 2 seconds...');
      // Request permission after a short delay to avoid blocking UI
      const timer = setTimeout(() => {
        console.log('🔔 [RealTime] Requesting push permission now...');
        requestPermission().catch(err => {
          console.warn('❌ [RealTime] Failed to request push notification permission:', err);
        });
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      console.log('🔔 [RealTime] Skipping push permission request:', {
        reason: !user ? 'no user' : !token ? 'no token' : !isSupported ? 'not supported' : 'already registered'
      });
    }
  }, [user, token, isSupported, isRegistered, requestPermission]);

  // Use relative WebSocket URL - works with both dev and production
  // Determine WebSocket URL. Prefer explicit env var, then derive from API base, else fallback.
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const envWsUrl = typeof import.meta !== 'undefined' ? import.meta.env.VITE_WS_URL : undefined;
  const envApiUrl = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : undefined;

  let wsBaseUrl = null;
  if (envWsUrl && typeof envWsUrl === 'string' && envWsUrl.trim() !== '') {
    wsBaseUrl = envWsUrl;
    console.log('🔌 [RealTime] Using VITE_WS_URL for WebSocket:', wsBaseUrl);
  } else if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== '') {
    const trimmed = envApiUrl.replace(/\/$/, '');
    // If API base already contains /api, append /ws, else append /api/ws
    if (trimmed.endsWith('/api')) {
      wsBaseUrl = trimmed.replace(/^http/, 'ws') + '/ws';
    } else {
      wsBaseUrl = trimmed.replace(/^http/, 'ws') + '/api/ws';
    }
    console.log('🔌 [RealTime] Derived WebSocket URL from VITE_API_BASE_URL:', wsBaseUrl);
  } else {
    // Fallback: connect directly to backend default port 8000 (dev). This avoids connecting to Vite dev server which returns 403 for WS upgrade.
    wsBaseUrl = `${wsProtocol}//${window.location.hostname}:8000/api/ws`;
    console.warn('⚠️ [RealTime] VITE_WS_URL/VITE_API_BASE_URL not set; falling back to', wsBaseUrl);
  }
  
  // Get organization name from localStorage (required for multi-tenant WebSocket)
  // Use state to track changes and trigger reconnection
  const [organizationName, setOrganizationName] = useState(() => {
    return localStorage.getItem('selectedOrganization');
  });
  
  // Listen for changes to selectedOrganization in localStorage
  useEffect(() => {
    const checkOrganization = () => {
      const org = localStorage.getItem('selectedOrganization');
      if (org !== organizationName) {
        console.log('🔄 [RealTime] Organization changed in localStorage:', org);
        setOrganizationName(org);
      }
    };
    
    // Check on mount and periodically (every 1 second) for changes
    checkOrganization();
    const interval = setInterval(checkOrganization, 1000);
    
    // Also listen for storage events (if set from another tab/window)
    window.addEventListener('storage', checkOrganization);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkOrganization);
    };
  }, [organizationName]);
  
  const { lastMessage, isConnected, sendMessage, error: wsError, reconnect } = useWebSocket(
    wsBaseUrl,
    token,
    organizationName
  );

  // Log WebSocket connection status with detailed info (only when connected or actually trying to connect)
  useEffect(() => {
    // Only log status if we have all required params, or if we're actually connected
    if (!token || !organizationName) {
      // Silently wait for required params - don't spam console
      return;
    }
    
    const status = {
      isConnected, 
      hasToken: !!token, 
      wsBaseUrl,
      tokenLength: token?.length || 0,
      notificationsCount: notifications.length,
      timestamp: new Date().toISOString()
    };
    
    if (isConnected) {
      console.log('✅ [RealTime] WebSocket is connected and ready to receive notifications');
    } else if (token && wsBaseUrl && organizationName) {
      // Only warn if we have all params but still not connected (actual connection issue)
      console.warn('⚠️ [RealTime] WebSocket is NOT connected! Notifications will not be received.');
      console.warn('⚠️ [RealTime] WebSocket URL:', wsBaseUrl);
      console.warn('⚠️ [RealTime] Organization:', organizationName);
    }
  }, [isConnected, token, wsBaseUrl, organizationName, notifications.length]);

  // Handle WebSocket connection errors
  useEffect(() => {
    if (wsError) {
      console.error('RealTime WebSocket Error:', wsError);
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Connection Error',
        message: wsError,
        timestamp: new Date().toISOString()
      });
    }
  }, [wsError]);

  const handleLeaveRequestUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      leaves: { ...prev.leaves, ...data }
    }));
    
    // Add notification for admins/HR when employee submits leave
    if (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER') {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'New Leave Request',
        message: data.employee_name 
          ? `${data.employee_name} has submitted a ${data.leave_type || 'leave'} request${data.start_date ? ` from ${data.start_date}${data.end_date ? ` to ${data.end_date}` : ''}` : ''}`
          : 'A new leave request has been submitted',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleTimesheetUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      timesheet: { ...prev.timesheet, ...data }
    }));
  };

  const handlePerformanceUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      performance: { ...prev.performance, ...data }
    }));
    
    // Trigger performance refresh in components
    window.dispatchEvent(new CustomEvent('performance-update', { detail: data }));
  };


  const handleEnrollmentRequest = (data) => {
    // Trigger enrollment request event for admin components
    window.dispatchEvent(new CustomEvent('enrollment-request', { detail: data }));
  };

  const handleEnrollmentApproval = (data) => {
    // Trigger enrollment approval event for employee components
    window.dispatchEvent(new CustomEvent('enrollment-approved', { detail: data }));
    
    // Add notification for employees
    if (user?.role === 'EMPLOYEE') {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Course Enrollment Approved',
        message: data.message || data.course_name 
          ? `Your enrollment in "${data.course_name}" has been approved`
          : 'Your course enrollment has been approved',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleEnrollmentRejection = (data) => {
    // Trigger enrollment rejection event for employee components
    window.dispatchEvent(new CustomEvent('enrollment-rejected', { detail: data }));
    
    // Add notification for employees
    if (user?.role === 'EMPLOYEE') {
      addNotification({
        id: Date.now(),
        type: 'warning',
        title: 'Course Enrollment Rejected',
        message: data.message || data.course_name
          ? `Your enrollment in "${data.course_name}" has been rejected${data.reason ? `. Reason: ${data.reason}` : ''}`
          : 'Your course enrollment has been rejected',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleEngagementUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      engagement: { ...prev.engagement, ...data }
    }));
  };

  const handleLeaveApprovalUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      leaves: { ...prev.leaves, ...data }
    }));
    
    // Always add notification for leave approval/rejection
    const status = data.status || (data.leave_type ? 'approved' : 'updated');
    const leaveType = data.leave_type || 'leave';
    const startDate = data.start_date || '';
    const endDate = data.end_date || '';
    
    addNotification({
      id: Date.now(),
      type: status === 'approved' || status === 'APPROVED' ? 'success' : status === 'rejected' || status === 'REJECTED' ? 'warning' : 'info',
      title: status === 'approved' || status === 'APPROVED' ? 'Leave Request Approved' : status === 'rejected' || status === 'REJECTED' ? 'Leave Request Rejected' : 'Leave Request Updated',
      message: status === 'approved' || status === 'APPROVED' 
        ? `Your ${leaveType} leave${startDate ? ` from ${startDate}${endDate ? ` to ${endDate}` : ''}` : ''} has been approved`
        : status === 'rejected' || status === 'REJECTED'
        ? `Your ${leaveType} leave${startDate ? ` from ${startDate}${endDate ? ` to ${endDate}` : ''}` : ''} has been rejected${data.reason ? `. Reason: ${data.reason}` : ''}`
        : `Your leave request has been ${status}`,
      timestamp: new Date().toISOString()
    });
  };

  const handlePayrollUpdate = (data) => {
    if (user?.role === 'EMPLOYEE') {
      addNotification({
        type: 'info',
        title: 'Payroll Update',
        message: 'Your payroll has been processed',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleWorkflowUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      workflows: { ...prev.workflows, ...data }
    }));
    
    // Add notification for workflow status changes
    const status = data.status || 'updated';
    const resourceType = data.resource_type || 'workflow';
    const notificationType = status === 'completed' ? 'success' : status === 'rejected' ? 'warning' : 'info';
    
    addNotification({
      id: Date.now(),
      type: notificationType,
      title: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Workflow ${status}`,
      message: data.message || `Workflow has been ${status}`,
      timestamp: new Date().toISOString()
    });
    
    // Dispatch custom event for components listening to workflow changes
    window.dispatchEvent(new CustomEvent('workflow-update', { detail: data }));
  };

  const handleAnalyticsUpdate = (data) => {
    setRealTimeData(prev => ({
      ...prev,
      analytics: { ...prev.analytics, ...data }
    }));
  };

  const handleSystemNotification = (data) => {
    console.log('🔔 [RealTime] Received system notification:', data);
    const notification = {
      id: Date.now(),
      type: data.level || 'info',
      title: data.title || 'System Notification',
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
      task_id: data.task_id,
      action_url: data.action_url
    };
    console.log('🔔 [RealTime] Adding notification:', notification);
    addNotification(notification);
    
    // Show desktop notification if enabled and data has desktop_notification flag
    if (data.desktop_notification && 'Notification' in window) {
      showDesktopNotification(data.title || 'System Notification', data.message, data);
    }
  };
  
  const showDesktopNotification = (title, message, data = {}) => {
    // Request permission if not already granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createNotification(title, message, data);
        }
      });
    } else if (Notification.permission === 'granted') {
      createNotification(title, message, data);
    }
  };
  
  const createNotification = (title, message, data = {}) => {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.task_id ? `task-${data.task_id}` : 'hr-hive-notification',
        requireInteraction: true, // Keep notification visible until user interacts
        silent: false
      });
      
      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (data.action_url) {
          if (data.task_id) {
            window.dispatchEvent(new CustomEvent('task-status-notification-click', { detail: data }));
          } else {
            window.location.href = data.action_url;
          }
        }
        notification.close();
      };
      
      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);
    } catch (error) {
      console.error('Error showing desktop notification:', error);
    }
  };

  const handleAnalyticsRefresh = (data) => {
    // Trigger analytics refresh in components
    window.dispatchEvent(new CustomEvent('analytics-refresh', { detail: data }));
  };

  const handleDashboardUpdate = (data) => {
    // Trigger dashboard refresh in components
    window.dispatchEvent(new CustomEvent('dashboard-update', { detail: data }));
  };

  const handleSettingsUpdate = (data) => {
    // Trigger settings update event for Settings component
    window.dispatchEvent(new CustomEvent('settings-update', { detail: data }));
    
    if (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER') {
      addNotification({
        type: 'info',
        title: 'Settings Updated',
        message: `Settings were updated by ${data.updated_by || 'another admin'}`,
        timestamp: new Date().toISOString()
      });
    }
  };


  const addNotification = (notification) => {
    // Ensure notification has an ID
    const notificationWithId = {
      id: notification.id || Date.now() + Math.random(),
      ...notification
    };
    
    console.log('🔔 [RealTime] Adding notification:', notificationWithId);
    setNotifications(prev => {
      const updated = [notificationWithId, ...prev.slice(0, 9)]; // Keep last 10 notifications
      console.log('🔔 [RealTime] Total notifications after add:', updated.length);
      console.log('🔔 [RealTime] Notification list:', updated.map(n => ({ id: n.id, title: n.title })));
      return updated;
    });
  };

  const removeNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const sendRealTimeMessage = (type, data) => {
    console.log('🚀 Sending real-time message:', { type, data });
    console.log('🔌 WebSocket connected:', isConnected);
    sendMessage({ type, data });
  };

  // Handle incoming real-time messages (moved after handler definitions)
  useEffect(() => {
    if (lastMessage) {
      const { type, data, timestamp } = lastMessage;
      console.log('📨 Received WebSocket message:', { type, data, timestamp });

      switch (type) {
        case 'connection_established':
          console.log('✅ [RealTime] WebSocket connection established:', data);
          // Connection is now fully established and ready to receive messages
          break;
        case 'employee_leave_request':
          handleLeaveRequestUpdate(data);
          break;
        case 'employee_timesheet_update':
          handleTimesheetUpdate(data);
          break;
        case 'employee_performance_update':
          handlePerformanceUpdate(data);
          break;
        case 'employee_engagement_update':
          handleEngagementUpdate(data);
          break;
        case 'admin_leave_approval':
          handleLeaveApprovalUpdate(data);
          break;
        case 'admin_payroll_update':
          handlePayrollUpdate(data);
          break;
        case 'workflow_update':
          handleWorkflowUpdate(data);
          break;
        case 'admin_analytics_update':
          handleAnalyticsUpdate(data);
          break;
        case 'system_notification':
          handleSystemNotification(data);
          break;
        case 'analytics_refresh':
          handleAnalyticsRefresh(data);
          break;
        case 'dashboard_update':
          handleDashboardUpdate(data);
          break;
        case 'performance_update':
          handlePerformanceUpdate(data);
          break;
        case 'employee_enrollment_request':
          handleEnrollmentRequest(data);
          break;
        case 'enrollment_approval':
          handleEnrollmentApproval(data);
          break;
        case 'enrollment_rejection':
          handleEnrollmentRejection(data);
          break;
        case 'settings_update':
          handleSettingsUpdate(data);
          break;
        default:
          // Log unhandled message types for debugging
          console.log('⚠️ Unhandled WebSocket message type:', type, data);
          // Still try to show as system notification if it has title/message
          if (data && (data.title || data.message)) {
            handleSystemNotification(data);
          }
          break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  const value = {
    isConnected,
    notifications,
    realTimeData,
    addNotification,
    removeNotification,
    clearNotifications,
    sendRealTimeMessage,
    wsError,
    reconnect
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};
