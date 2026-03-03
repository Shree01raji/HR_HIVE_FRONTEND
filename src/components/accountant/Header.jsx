import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FiBell, FiSearch, FiUser, FiLogOut, FiSettings, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiBriefcase } from 'react-icons/fi';
import PanelSwitcher from '../common/PanelSwitcher';

export default function AccountantHeader() {
  const { user, logout } = useAuth();
  const { notifications, removeNotification, clearNotifications } = useRealTime();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white backdrop-blur-sm shadow-lg border-b border-gray-200 px-6 py-4 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Left Side - Search */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-hover:text-emerald-500 transition-colors duration-200" />
            <input
              type="text"
              placeholder="Search employees, payroll, timesheets..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white hover:bg-gray-50 text-gray-900 placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Panel Switcher for Accountants */}
          <PanelSwitcher />
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-3 text-gray-600 hover:text-emerald-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:shadow-md group"
            >
              <FiBell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute top-14 right-0 w-80 bg-white backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 max-h-96 overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-4 duration-300">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  <div className="flex space-x-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-gray-100 px-2 py-1 rounded-lg transition-all duration-200"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-lg transition-all duration-200"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <FiBell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {notifications.map((notification, index) => (
                        <div
                          key={index}
                          className={`p-4 border-l-4 ${
                            notification.type === 'success' ? 'bg-emerald-50 border-emerald-500' :
                            notification.type === 'error' ? 'bg-red-50 border-red-500' :
                            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                            'bg-blue-50 border-blue-500'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            {notification.type === 'success' ? <FiCheckCircle className="w-5 h-5 text-emerald-600" /> :
                             notification.type === 'error' ? <FiAlertCircle className="w-5 h-5 text-red-600" /> :
                             notification.type === 'warning' ? <FiAlertTriangle className="w-5 h-5 text-yellow-600" /> :
                             <FiInfo className="w-5 h-5 text-blue-600" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => removeNotification(index)}
                              className="text-gray-400 hover:text-gray-600"
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
              <p className="text-sm font-bold text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                <FiBriefcase className="w-3 h-3" />
                <span>Accountant • Finance Portal</span>
              </p>
            </div>
            
            <div className="relative group">
              <button className="flex items-center space-x-2 p-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:shadow-md group">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <FiUser className="w-5 h-5 text-white" />
                </div>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 animate-in fade-in-0 slide-in-from-top-4">
                <div className="py-3">
                  <button 
                    onClick={() => navigate('/accountant/settings')}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-200 group"
                  >
                    <FiUser className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="font-medium">My Profile</span>
                  </button>
                  <button 
                    onClick={() => navigate('/accountant/settings')}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-200 group"
                  >
                    <FiSettings className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="font-medium">Settings</span>
                  </button>
                  <hr className="my-2 border-gray-200" />
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  >
                    <FiLogOut className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
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

