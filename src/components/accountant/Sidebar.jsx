import React, { useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiDollarSign, 
  FiClock,
  FiSettings,
  FiTrendingUp,
  FiBarChart,
  FiPieChart
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { 
    path: '/accountant', 
    icon: FiHome, 
    label: 'Dashboard',
    description: 'Financial Overview & Analytics'
  },
  { 
    path: '/accountant/timesheet', 
    icon: FiClock, 
    label: 'Timesheet Management',
    description: 'Review & Approve Hours'
  },
  { 
    path: '/accountant/payroll', 
    icon: FiDollarSign, 
    label: 'Payroll Processing',
    description: 'Salary & Benefits Management'
  },
  { 
    path: '/accountant/settings', 
    icon: FiSettings, 
    label: 'Account Settings',
    description: 'Profile & Preferences'
  }
];

export default function AccountantSidebar() {
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const sidebar = sidebarRef.current;
          if (!sidebar) return;

          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          
          const scrollProgress = Math.min(scrollTop / (windowHeight * 0.3), 1);
          const easedProgress = 1 - Math.pow(1 - scrollProgress, 3);
          sidebar.style.transform = `translateY(${easedProgress * 6}px)`;
          
          const navItems = sidebar.querySelectorAll('a');
          navItems.forEach((item, index) => {
            const delay = index * 0.12;
            const waveOffset = Math.sin(scrollProgress * Math.PI * 1.2 + delay) * 2;
            const scaleEffect = 1 + (Math.sin(scrollProgress * Math.PI + delay) * 0.01);
            
            item.style.transform = `translateX(${waveOffset}px) scale(${scaleEffect})`;
            item.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          });
          
          ticking = false;
        });
      }
      ticking = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className="w-72 bg-white shadow-2xl border-r border-gray-200 flex flex-col h-screen sticky top-0 z-40 transition-all duration-300"
    >
      {/* Header with Professional Design */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center space-x-3 mb-2">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FiBarChart className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Finance Portal</h1>
            <p className="text-xs text-gray-600 font-medium">Enterprise Accounting</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">Accountant Access</span>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 text-xs font-semibold rounded-md border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/accountant' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 shadow-lg shadow-emerald-500/10 border border-emerald-500/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-r-full shadow-lg shadow-emerald-400/50"></div>
              )}
              
              {/* Icon */}
              <div className={`relative ${isActive ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full"></div>
                )}
              </div>
              
              {/* Label & Description */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm transition-colors duration-200 ${
                  isActive ? 'text-emerald-700' : 'text-gray-900 group-hover:text-gray-900'
                }`}>
                  {item.label}
                </div>
                <div className={`text-xs mt-0.5 transition-colors duration-200 ${
                  isActive ? 'text-emerald-600/70' : 'text-gray-500 group-hover:text-gray-600'
                }`}>
                  {item.description}
                </div>
              </div>
              
              {/* Active Badge */}
              {isActive && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-400/50 animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <FiTrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-600">Efficiency</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">98%</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <FiPieChart className="w-4 h-4 text-teal-600" />
              <span className="text-xs text-gray-600">Accuracy</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">100%</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

