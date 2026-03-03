import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, 
  FiCalendar, 
  FiDollarSign, 
  FiUser,
  FiMessageSquare,
  FiClock,
  FiBookOpen,
  FiUsers,
  FiTrendingUp,
  FiFileText,
  FiTarget,
  FiLogOut,
  FiShield
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { useFeatureToggle } from '../../contexts/FeatureToggleContext';
import api from '../../services/api';
import Logo from '../Logo';

const baseMenuItems = [
  { 
    path: '/employee', 
    icon: FiHome, 
    label: 'My Dashboard',
    description: 'Personal Overview'
  },
  { 
    path: '/employee/calendar', 
    icon: FiCalendar, 
    label: 'Calendar',
    description: 'View All Events'
  },
  { 
    path: '/employee/leaves', 
    icon: FiCalendar, 
    label: 'Leave Management',
    description: 'Apply & Track Leaves'
  },
  { 
    path: '/employee/leave-policies', 
    icon: FiFileText, 
    label: 'Leave Policies',
    description: 'View Leave Policies'
  },
  { 
    path: '/employee/payroll', 
    icon: FiDollarSign, 
    label: 'My Payroll',
    description: 'Salary & Payslips'
  },
  { 
    path: '/employee/investment-declaration', 
    icon: FiDollarSign, 
    label: 'Tax Declaration',
    description: 'Investment Declaration'
  },
  { 
    path: '/employee/expenses', 
    icon: FiDollarSign, 
    label: 'Expenses',
    description: 'Submit Expenses'
  },
  { 
    path: '/employee/reimbursements', 
    icon: FiDollarSign, 
    label: 'Reimbursements',
    description: 'Track Reimbursements'
  },
  { 
    path: '/employee/insurance-cards', 
    icon: FiShield, 
    label: 'Insurance Cards',
    description: 'View Insurance Cards'
  },
  { 
    path: '/employee/profile', 
    icon: FiUser, 
    label: 'My Profile',
    description: 'Personal Information'
  },
  { 
    path: '/employee/timesheet', 
    icon: FiClock, 
    label: 'Timesheet',
    description: 'Track Work Hours'
  },
  { 
    path: '/employee/tasks', 
    icon: FiTarget, 
    label: 'My Tasks',
    description: 'Assigned Tasks'
  },
  { 
    path: '/employee/learning', 
    icon: FiBookOpen, 
    label: 'Learning',
    description: 'Skills & Development'
  },
  { 
    path: '/employee/engagement', 
    icon: FiUsers, 
    label: 'Engagement',
    description: 'Surveys & Recognition'
  },
  { 
    path: '/employee/performance', 
    icon: FiTrendingUp, 
    label: 'Performance',
    description: 'Goals & Reviews'
  },
  { 
    path: '/employee/hr-policy', 
    icon: FiFileText, 
    label: 'HR Policy',
    description: 'Company Policies & Documents'
  }
];

export default function Sidebar() {
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useRealTime();
  const { isEnabled } = useFeatureToggle();

  // Map employee paths to feature keys
  const getFeatureKeyForPath = (path) => {
    const featureMap = {
      '/employee': null, // Dashboard - always enabled
      '/employee/leaves': 'enable_leaves', // Leave Management
      '/employee/payroll': 'enable_payroll', // My Payroll
      '/employee/investment-declaration': 'enable_payroll', // Tax Declaration (uses payroll feature)
      '/employee/expenses': 'enable_payroll', // Expenses (uses payroll feature)
      '/employee/reimbursements': 'enable_payroll', // Reimbursements (uses payroll feature)
      '/employee/insurance-cards': 'enable_benefits', // Insurance Cards
      '/employee/profile': null, // My Profile - always enabled
      '/employee/timesheet': 'enable_timesheet', // Timesheet
      '/employee/tasks': 'enable_task_management', // My Tasks
      '/employee/learning': 'enable_learning', // Learning
      '/employee/engagement': 'enable_engagement', // Engagement
      '/employee/performance': 'enable_performance', // Performance
      '/employee/hr-policy': 'enable_policies', // HR Policy
    };
    return featureMap[path];
  };

  const shouldShowOnboarding =
    user?.role === 'EMPLOYEE' &&
    !!user?.employee_id &&
    (user?.is_onboarded === false || !user?.join_date);

  const onboardingMenuItem = useMemo(
    () => baseMenuItems.find((item) => item.path === '/employee/onboarding'),
    []
  );

  // Filter menu items based on feature toggles
  const menuItems = useMemo(() => {
    if (shouldShowOnboarding) {
      return onboardingMenuItem ? [onboardingMenuItem] : [];
    }
    
    // Filter by feature toggles
    return baseMenuItems.filter(item => {
      const featureKey = getFeatureKeyForPath(item.path);
      // If no feature key (Dashboard/Profile), always show
      if (featureKey === null) return true;
      // Check if feature is enabled
      return isEnabled(featureKey);
    });
  }, [shouldShowOnboarding, onboardingMenuItem, isEnabled]);


  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className="flex flex-col w-64 h-screen bg-[#1e3a5f] text-white shadow-xl overflow-hidden"
    >
      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4b5563 #1f2937'
        }}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-600/50">
          <div className="flex justify-center items-center">
            <Link to="/employee">
              <Logo size="sm" showTagline={false} dark={true} />
            </Link>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-600/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <FiUser className="w-6 h-6 text-gray-800" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-300 capitalize">
                {user?.role === 'EMPLOYEE' ? 'Employee' : user?.role || 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isMessages = item.path === '/employee/chat' || item.label.toLowerCase().includes('message');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
              {isMessages && notifications && notifications.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      </div>

      {/* Logout Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-600/50 bg-[#1e3a5f] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium"
        >
          <FiLogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}