import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/admin', icon: '📊', label: 'Dashboard' },
  { path: '/admin/employees', icon: '👥', label: 'Employees' },
  { path: '/admin/onboarding', icon: '🧭', label: 'Onboarding' },
  { path: '/admin/leaves', icon: '📅', label: 'Leave Approvals' },
  { path: '/admin/payroll', icon: '💰', label: 'Payroll' },
  { path: '/admin/integrations', icon: '🔄', label: 'Integrations' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="text-2xl font-bold mb-8 p-2">HR Admin</div>
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-lg mb-2 ${
              location.pathname === item.path
                ? 'bg-blue-600'
                : 'hover:bg-gray-700'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
