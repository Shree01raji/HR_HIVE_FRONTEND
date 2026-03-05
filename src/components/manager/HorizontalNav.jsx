import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHome,
  FiMessageSquare,
  FiClock,
  FiDollarSign,
  FiCalendar,
  FiTarget,
  FiShoppingBag,
  FiCreditCard,
  FiPieChart,
  FiLogOut,
  FiMenu,
  FiX,
  FiSettings
} from 'react-icons/fi';
import api from '../../services/api';
 
const menuItems = [
  { path: '/manager', icon: FiHome, label: 'Team Overview' },
  { path: '/manager/chat', icon: FiMessageSquare, label: 'Team Chat' },
  { path: '/manager/timesheet', icon: FiClock, label: 'Timesheet' },
  { path: '/manager/payroll', icon: FiDollarSign, label: 'Payroll' },
  { path: '/manager/leaves', icon: FiCalendar, label: 'Leave Management' },
  { path: '/manager/tasks', icon: FiTarget, label: 'Task Management' },
  { path: '/manager/expenses', icon: FiShoppingBag, label: 'Expenses' },
  { path: '/manager/reimbursements', icon: FiCreditCard, label: 'Reimbursements' },
  { path: '/manager/investment-declarations', icon: FiPieChart, label: 'Investments' }
];
 
export default function HorizontalNav() {
  const location = useLocation();
  const { logout } = useAuth();
  const [companyName, setCompanyName] = useState('HR-Hive');
  const [menuOpen, setMenuOpen] = useState(false);
 
  useEffect(() => {
    const fetchCompanyName = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // If no token, skip fetching company name
      try {
        const response = await api.get('/settings/');
        const name = response.data?.company_name;
        if (name && name.trim()) {
          setCompanyName(name.trim());
        }
      } catch (error) {
        console.warn('Could not fetch company name, using default:', error);
      }
    };
 
    fetchCompanyName();
  }, []);
 
  const activePath = useMemo(() => location.pathname, [location.pathname]);
 
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
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="p-2 -ml-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Open menu"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-white leading-tight">{companyName}</h1>
                <p className="text-xs text-gray-300 leading-tight">Manager Portal</p>
              </div>
            </div>
 
            <div className="flex-1 min-w-4" />
 
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => window.location.href = '/manager/settings'}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 font-medium mr-2"
              >
                <FiSettings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
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
 
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#1e3a5f] text-white shadow-xl p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-gray-600/50 pb-3">
              <h2 className="text-lg font-semibold text-white">Manager Menu</h2>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const isActive = activePath === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}