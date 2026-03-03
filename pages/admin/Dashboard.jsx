import React, { useState, useEffect } from 'react';
import Header from '../../components/admin/Header';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    pendingPayroll: 0,
    activeIntegrations: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="Dashboard" />
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon="👥"
            color="text-blue-600"
          />
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves}
            icon="📅"
            color="text-yellow-600"
          />
          <StatCard
            title="Pending Payroll"
            value={stats.pendingPayroll}
            icon="💰"
            color="text-green-600"
          />
          <StatCard
            title="Active Integrations"
            value={stats.activeIntegrations}
            icon="🔄"
            color="text-purple-600"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
              {/* Activity items would be mapped here */}
              <div className="flex items-center space-x-4 border-b pb-4">
                <div className="text-2xl">📝</div>
                <div>
                  <p className="font-medium">New Leave Request</p>
                  <p className="text-sm text-gray-500">John Doe requested annual leave</p>
                </div>
                <div className="text-sm text-gray-500 ml-auto">2 hours ago</div>
              </div>
              <div className="flex items-center space-x-4 border-b pb-4">
                <div className="text-2xl">👤</div>
                <div>
                  <p className="font-medium">New Employee Added</p>
                  <p className="text-sm text-gray-500">Jane Smith joined the company</p>
                </div>
                <div className="text-sm text-gray-500 ml-auto">5 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
