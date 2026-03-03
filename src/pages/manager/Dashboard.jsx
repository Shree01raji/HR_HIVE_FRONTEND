import React, { useEffect, useState } from 'react';
import { FiUsers, FiCalendar, FiShoppingBag, FiCreditCard, FiPieChart } from 'react-icons/fi';
import { managerAPI } from '../../services/api';

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teamSize: 0,
    pendingLeaves: 0,
    pendingExpenses: 0,
    pendingReimbursements: 0,
    pendingDeclarations: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
  setLoading(false);
}, []);



  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        Loading team overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">
        {error}
      </div>
    );
  }

  const cards = [
    { label: 'Direct Reports', value: stats.teamSize, icon: FiUsers, color: 'bg-blue-500' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: FiCalendar, color: 'bg-indigo-500' },
    { label: 'Pending Expenses', value: stats.pendingExpenses, icon: FiShoppingBag, color: 'bg-emerald-500' },
    { label: 'Pending Reimbursements', value: stats.pendingReimbursements, icon: FiCreditCard, color: 'bg-amber-500' },
    { label: 'Pending Declarations', value: stats.pendingDeclarations, icon: FiPieChart, color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Overview</h1>
        <p className="text-sm text-gray-600">Quick status across your direct reports.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${card.color} text-white flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
