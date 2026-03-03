import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const RealTimeContext = createContext();

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

export const RealTimeProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [realTimeData, setRealTimeData] = useState({
    analytics: null,
    leaves: null,
    timesheet: null,
    performance: null,
    engagement: null
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request permission when user first loads the app
      // This will show a browser prompt
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Desktop notifications enabled');
        } else {
          console.log('⚠️ Desktop notifications denied');
        }
      });
    }
  }, []);

  // Use relative WebSocket URL - works with both dev and production
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Always construct the URL, even if token is not available yet
  const wsBaseUrl = `${wsProtocol}//${window.location.host}/api/ws`;
  
  console.log('🔌 [RealTime] Constructed WebSocket URL:', wsBaseUrl, 'Token available:', !!token);
  
  const { lastMessage, isConnected, sendMessage, error: wsError, reconnect } = useWebSocket(
    wsBaseUrl,
    token
  );

  // Log WebSocket connection status with detailed info
  useEffect(() => {
    const status = {
      isConnected, 
      hasToken: !!token, 
      wsBaseUrl,
      tokenLength: token?.length || 0,
      notificationsCount: notifications.length,
      timestamp: new Date().toISOString()
    };
    console.log('🔌 [RealTime] WebSocket status:', status);
    
    // Warn if not connected
    if (!isConnected && token && wsBaseUrl) {
      console.warn('⚠️ [RealTime] WebSocket is NOT connected! Notifications will not be received.');
      console.warn('⚠️ [RealTime] WebSocket URL:', wsBaseUrl);
      console.warn('⚠️ [RealTime] Token exists:', !!token, 'Token length:', token?.length);
      console.warn('⚠️ [RealTime] Full connection URL would be:', `${wsBaseUrl}/${token}`);
    } else if (isConnected) {
      console.log('✅ [RealTime] WebSocket is connected and ready to receive notifications');
    } else if (!token) {
      console.warn('⚠️ [RealTime] No token available - WebSocket will not connect');
    } else if (!wsBaseUrl) {
      console.warn('⚠️ [RealTime] No WebSocket URL available - WebSocket will not connect');
    }
  }, [isConnected, token, wsBaseUrl, notifications.length]);

  // Handle WebSocket connection errors
  useEffect(() => {
    if (wsError) {
      console.error('RealTime WebSocket Error:', wsError);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: wsError,
        timestamp: new Date().toISOString()
      }]);
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
          // Navigate to task status update page or open modal
          window.dispatchEvent(new CustomEvent('task-status-notification-click', { detail: data }));
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
