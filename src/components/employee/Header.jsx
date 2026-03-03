import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FiBell, FiUser, FiLogOut, FiSettings, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import ThemeToggle from '../common/ThemeToggle';
import PanelSwitcher from '../common/PanelSwitcher';
import ToastContainer from '../ToastContainer';
import { createPortal } from 'react-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications, removeNotification, clearNotifications } = useRealTime();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState([]);
  const shownNotificationIds = useRef(new Set());

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we should still try to clear the user state
      // The AuthContext will handle the navigation
    }
  };

  // Show error and warning notifications as toasts automatically
  useEffect(() => {
    notifications.forEach((notification) => {
      // Only show error and warning notifications as toasts
      // Skip if we've already shown this notification
      if ((notification.type === 'error' || notification.type === 'warning') && 
          !shownNotificationIds.current.has(notification.id)) {
        shownNotificationIds.current.add(notification.id);
        setToastNotifications(prev => [...prev, notification]);
      }
    });
  }, [notifications]);

  const handleToastClose = (notificationId) => {
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <>
      {/* Toast Notifications - Top Right (rendered via portal to document body) */}
      <ToastContainer toasts={toastNotifications} onClose={handleToastClose} />

      <header className="bg-[#e8f0f5] dark:bg-gray-800/95 backdrop-blur-sm shadow-sm border-b border-gray-300/50 dark:border-gray-700/50 px-6 py-4 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Left Side - Empty space for future use */}
        <div className="flex items-center space-x-4 flex-1">
        </div>

        {/* Right Side - Panel Switcher, Notifications */}
        <div className="flex items-center space-x-3">
          {/* Panel Switcher for HR/Admin with Employee Access */}
          <PanelSwitcher />
          
          {/* Bell Notification */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <FiBell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Settings Icon */}
          <div className="relative">
            <button 
              onClick={() => navigate('/employee/profile')}
              className="relative p-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Dropdown */}
        {isNotificationOpen && 
        createPortal(
          <div className="absolute top-14 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
              <div className="flex space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#1e3a5f] dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 px-2 py-1 rounded-lg transition-all duration-200"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-lg transition-all duration-200"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <FiBell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification, index) => (
                    <div
                      key={index}
                      className={`p-4 border-l-4 ${
                        notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
                        notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' :
                        notification.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {notification.type === 'success' ? <FiCheckCircle className="w-5 h-5 text-green-500" /> :
                         notification.type === 'error' ? <FiAlertCircle className="w-5 h-5 text-red-500" /> :
                         notification.type === 'warning' ? <FiAlertTriangle className="w-5 h-5 text-yellow-500" /> :
                         <FiInfo className="w-5 h-5 text-blue-500" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(index)}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
    </>
  );
}
