import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatureToggle } from '../../contexts/FeatureToggleContext';
import {
  FiHome,
  FiCalendar,
  FiDollarSign,
  FiUser,
  FiClock,
  FiBookOpen,
  FiUsers,
  FiTrendingUp,
  FiFileText,
  FiTarget,
  FiLogOut,
  FiPieChart,
  FiCreditCard,
  FiShield,
  FiShoppingBag,
  FiGitBranch,
  FiMenu,
  FiX
} from 'react-icons/fi';
import Logo from '../Logo';
import api from '../../services/api';

const menuItems = [
  { 
    path: '/employee', 
    icon: FiHome, 
    label: 'My Dashboard'
  },
  { 
    path: '/employee/leaves', 
    icon: FiCalendar, 
    label: 'Leave Management'
  },
  { 
    path: '/employee/payroll', 
    icon: FiDollarSign, 
    label: 'My Payroll'
  },
  { 
    path: '/employee/profile', 
    icon: FiUser, 
    label: 'My Profile'
  },
  { 
    path: '/employee/timesheet', 
    icon: FiClock, 
    label: 'Timesheet'
  },
  { 
    path: '/employee/tasks', 
    icon: FiTarget, 
    label: 'My Tasks'
  },
  { 
    path: '/employee/learning', 
    icon: FiBookOpen, 
    label: 'Learning'
  },
  { 
    path: '/employee/engagement', 
    icon: FiUsers, 
    label: 'Engagement'
  },
  { 
    path: '/employee/performance', 
    icon: FiTrendingUp, 
    label: 'Performance'
  },
  { 
    path: '/employee/hr-policy', 
    icon: FiFileText, 
    label: 'HR Policy'
  },
  { 
    path: '/employee/investment-declaration', 
    icon: FiPieChart, 
    label: 'Investment'
  },
  { 
    path: '/employee/expenses', 
    icon: FiShoppingBag, 
    label: 'Expenses'
  },
  { 
    path: '/employee/reimbursements', 
    icon: FiCreditCard, 
    label: 'Reimbursements'
  },
  { 
    path: '/employee/insurance-cards', 
    icon: FiShield, 
    label: 'Insurance'
  },
  { 
    path: '/employee/org-chart', 
    icon: FiGitBranch, 
    label: 'Org Chart'
  }
];

export default function HorizontalNav() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isEnabled } = useFeatureToggle();
  const [companyName, setCompanyName] = useState('HR-Hive');
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch organization company name
  useEffect(() => {
    const fetchCompanyName = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // If no token, skip fetching company name
      try {
        const response = await api.get('/settings/');
        const companyNameFromSettings = response.data?.company_name;
        if (companyNameFromSettings && companyNameFromSettings.trim()) {
          setCompanyName(companyNameFromSettings.trim());
        }
      } catch (error) {
        console.warn('Could not fetch company name, using default:', error);
        // Keep default 'HR-Hive'
      }
    };
    
    fetchCompanyName();
  }, []);

  // Map employee paths to feature keys
  const getFeatureKeyForPath = (path) => {
    const featureMap = {
      '/employee': null, // Dashboard - always enabled
      '/employee/leaves': 'enable_leaves', // Leave Management
      '/employee/payroll': 'enable_payroll', // My Payroll
      '/employee/profile': null, // My Profile - always enabled
      '/employee/timesheet': 'enable_timesheet', // Timesheet
      '/employee/tasks': 'enable_task_management', // My Tasks
      '/employee/learning': 'enable_learning', // Learning
      '/employee/engagement': 'enable_engagement', // Engagement
      '/employee/performance': 'enable_performance', // Performance
      '/employee/hr-policy': 'enable_policies', // HR Policy
      '/employee/investment-declaration': 'enable_payroll', // Investment (uses payroll feature)
      '/employee/expenses': 'enable_payroll', // Expenses (uses payroll feature)
      '/employee/reimbursements': 'enable_payroll', // Reimbursements (uses payroll feature)
      '/employee/insurance-cards': 'enable_benefits', // Insurance Cards
      '/employee/org-chart': null, // Org Chart - always enabled
    };
    return featureMap[path];
  };

  // Filter menu items based on feature toggles
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const featureKey = getFeatureKeyForPath(item.path);
      // If no feature key (Dashboard/Profile), always show
      if (featureKey === null) return true;
      // Check if feature is enabled
      return isEnabled(featureKey);
    });
  }, [isEnabled]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <nav className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Hamburger */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Open menu"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              {/* <div className="flex items-center space-x-2">
                <svg width="36" height="36" viewBox="0 0 100 100" className="flex-shrink-0">
                  <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#ffffff" strokeWidth="4" />
                  <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  <polygon points="50,25 70,35 70,65 50,75 30,65 30,35" fill="none" stroke="#ffffff" strokeWidth="2" />
                  <polygon points="50,35 60,40 60,60 50,65 40,60 40,40" fill="#d4af37" stroke="#b8941f" strokeWidth="1" />
                </svg>
                <img src="/images/bee.png" alt="" className="w-8 h-8 object-contain hidden sm:block" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white leading-tight">{companyName}</h1>
                <p className="text-xs text-gray-300 leading-tight">Powered by HR-Hive</p>
              </div> */}
            </div>

            {/* Spacer */}
            <div className="flex-1 min-w-4" />

            {/* Logout */}
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Drawer: tabs shown only when hamburger is touched */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-[#1e3a5f] text-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="font-semibold text-white">Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
