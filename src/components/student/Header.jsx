import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FiBell, FiSearch, FiUser, FiLogOut, FiSettings, FiHelpCircle, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications, removeNotification, clearNotifications } = useRealTime();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we should still try to clear the user state
      // The AuthContext will handle the navigation
    }
  };

  return (
    <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-md border-b border-teal-200/50 dark:border-gray-700/50 px-6 py-4 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Welcome Message */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
              <FiUser className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome back, {user?.first_name}! 👋
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your courses • Track your progress • Access learning resources
              </p>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          {/* Quick Help */}
          <button className="group flex items-center space-x-2 px-4 py-2 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:shadow-sm">
            <FiHelpCircle className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
            <span className="font-medium">Help</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:shadow-sm group"
            >
              <FiBell className="w-5 h-5 group-hover:scale-105 transition-transform duration-200" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute top-14 right-0 w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-teal-200/50 dark:border-gray-700/50 max-h-96 overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-4 duration-300">
                <div className="p-4 border-b border-teal-200/50 dark:border-gray-700/50 bg-teal-50/50 dark:bg-gray-700/50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  <div className="flex space-x-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-100 dark:hover:bg-gray-700 px-2 py-1 rounded-md transition-all duration-200"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md transition-all duration-200"
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
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {user?.department} • Student
              </p>
            </div>
            
            <div className="relative group">
              <button className="flex items-center space-x-2 p-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-sm group">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
                  <FiUser className="w-5 h-5 text-white" />
                </div>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-teal-200/50 dark:border-gray-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 animate-in fade-in-0 slide-in-from-top-4">
                <div className="py-3">
                  <button 
                    onClick={() => navigate('/student/profile')}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                  >
                    <FiUser className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
                    <span className="font-medium">My Profile</span>
                  </button>
                  <button className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all duration-200 group">
                    <FiSettings className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
                    <span className="font-medium">Settings</span>
                  </button>
                  <hr className="my-2 border-teal-200/50 dark:border-gray-700" />
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                  >
                    <FiLogOut className="w-4 h-4 group-hover:scale-105 transition-transform duration-200" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
