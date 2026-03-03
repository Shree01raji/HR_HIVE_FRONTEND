import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FiBell, FiSearch, FiUser, FiLogOut, FiSettings, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiUsers, FiFileText, FiShield, FiTarget, FiClock } from 'react-icons/fi';
import ThemeToggle from '../common/ThemeToggle';
import PanelSwitcher from '../common/PanelSwitcher';
import ToastContainer from '../ToastContainer';
import { employeeAPI, documentsAPI } from '../../services/api';
import { createPortal } from 'react-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications, removeNotification, clearNotifications, isConnected, reconnect } = useRealTime();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [toastNotifications, setToastNotifications] = useState([]);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const shownNotificationIds = useRef(new Set());
  
  // Check if user is organization admin
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user?.employee_id || 
                               user?.employee_id === 0 ||
                               (user?.employee_id && user?.department === null);
  
  // Check if user is accountant (has ACCOUNTS RBAC role)
  // CRITICAL: Check RBAC role FIRST, before base role
  // This ensures accountants are identified correctly even if their base role is incorrectly set
  const isAccountantFlag = localStorage.getItem('isAccountant') === 'true';
  const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
  const hasAccountsRole = userRoles.includes('ACCOUNTS') || userRoles.includes('accounts');
  const isAccountant = isAccountantFlag || hasAccountsRole;
  
  // Debug logging
  useEffect(() => {
    console.log('[Header] User role check:', {
      userRole: user?.role,
      isAccountantFlag,
      hasAccountsRole,
      isAccountant,
      userRoles,
      isAccountantFlagValue: localStorage.getItem('isAccountant'),
      userDepartment: user?.department,
      employeeId: user?.employee_id
    });
  }, [user, isAccountant, isAccountantFlag, hasAccountsRole, userRoles]);
  
  // Determine user role display
  // CRITICAL: RBAC role (Accountant) ALWAYS takes precedence over base role
  // Even if base role is HR_MANAGER, if user has ACCOUNTS RBAC role, show as Accountant
  const getUserRoleDisplay = () => {
    // ALWAYS check accountant first - RBAC role takes precedence over base role
    // This works even if department is null or "unassigned"
    if (isAccountant) {
      return 'Accountant';
    }
    // Only show HR Manager if NOT an accountant AND has department
    // Note: Department check is for display purposes only, not for role determination
    if (user?.role?.toLowerCase() === 'hr_manager') {
      // Show department if available, otherwise just "HR Manager"
      return user?.department ? 'HR Manager' : 'HR Manager';
    }
    return `${user?.role?.toLowerCase() || 'employee'} • Admin Portal`;
  };
  
  // HR Manager styling only if NOT an accountant
  // Remove department requirement - check role only
  const isHRManager = user?.role?.toLowerCase() === 'hr_manager' && !isAccountant;
  
  const handleSettingsClick = () => {
    if (isOrganizationAdmin && user?.role === 'ADMIN') {
      // For organization admins, navigate to organizations page
      navigate('/admin/organizations');
    } else {
      // For regular admins, navigate to settings page
      navigate('/admin/settings');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we should still try to clear the user state
      // The AuthContext will handle the navigation
    }
  };

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      const results = [];

      try {
        // Search employees
        const employees = await employeeAPI.getAll();
        if (Array.isArray(employees)) {
          const matchingEmployees = employees
            .filter(emp => {
              const search = searchTerm.toLowerCase();
              return (
                (emp.first_name || '').toLowerCase().includes(search) ||
                (emp.last_name || '').toLowerCase().includes(search) ||
                (emp.email || '').toLowerCase().includes(search) ||
                (emp.department || '').toLowerCase().includes(search)
              );
            })
            .slice(0, 3)
            .map(emp => ({
              type: 'employee',
              id: emp.employee_id,
              title: `${emp.first_name} ${emp.last_name}`,
              subtitle: emp.department || 'No department',
              icon: FiUsers,
              path: `/admin/employees`
            }));
          results.push(...matchingEmployees);
        }
      } catch (err) {
        console.error('Error searching employees:', err);
      }

      try {
        // Search documents
        const documents = await documentsAPI.getDocuments();
        if (Array.isArray(documents)) {
          const matchingDocs = documents
            .filter(doc => {
              const search = searchTerm.toLowerCase();
              return (
                (doc.title || '').toLowerCase().includes(search) ||
                (doc.description || '').toLowerCase().includes(search) ||
                (doc.file_name || '').toLowerCase().includes(search)
              );
            })
            .slice(0, 3)
            .map(doc => ({
              type: 'document',
              id: doc.document_id,
              title: doc.title || doc.file_name || 'Untitled',
              subtitle: doc.category || 'Document',
              icon: FiFileText,
              path: `/admin/documents`
            }));
          results.push(...matchingDocs);
        }
      } catch (err) {
        console.error('Error searching documents:', err);
      }

      // Add quick navigation options
      const quickNav = [
        { path: '/admin/employees', label: 'Employees', icon: FiUsers },
        { path: '/admin/documents', label: 'Documents', icon: FiFileText },
        { path: '/admin/policies', label: 'Policies', icon: FiShield },
        { path: '/admin/tasks', label: 'Tasks', icon: FiTarget },
        { path: '/admin/timesheet', label: 'Timesheet', icon: FiClock }
      ].filter(item => 
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 2).map(item => ({
        type: 'quick-nav',
        title: item.label,
        subtitle: 'Quick navigation',
        icon: item.icon,
        path: item.path
      }));

      results.push(...quickNav);
      setSearchResults(results.slice(0, 8));
      setShowSearchResults(results.length > 0);
      setIsSearching(false);
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSearchResultClick = (result) => {
    navigate(result.path);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  return (
    <>
      {/* Toast Notifications - Top Right (rendered via portal to document body) */}
      <ToastContainer toasts={toastNotifications} onClose={handleToastClose} />

      <header className="bg-[#e8f0f5] dark:bg-gray-800/95 backdrop-blur-sm shadow-sm border-b border-gray-300/50 dark:border-gray-700/50 px-6 py-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
        {/* Left Side - Search */}
        {/* <div className="flex items-center space-x-4 flex-1"> */}
          {/* Search Bar */}
          {/* <div className="flex-1 max-w-md" ref={searchRef}>
            <div className="relative group">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowSearchResults(true)}
                placeholder="Search employees, documents, policies..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
              
              
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f] mx-auto"></div>
                      <p className="mt-2 text-sm">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => {
                        const Icon = result.icon;
                        return (
                          <button
                            key={`${result.type}-${result.id || index}`}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-sm">No results found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div> */}

        {/* Right Side - Panel Switcher, Notifications */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Panel Switcher for Admin/HR with Employee Access */}
          <PanelSwitcher />
          
          {/* Bell Notification */}
          <div className="relative z-50">
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
              onClick={() => navigate('/admin/settings')}
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