import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard() {
  const [dashboardData, setDashboardData] = useState({
    leaveBalance: {},
    lastPayroll: null,
    onboardingStatus: {},
    recentLeaves: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [leaveBalance, lastPayroll, onboardingStatus, recentLeaves] = await Promise.all([
        fetch('/api/me/leave_balance', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/me/payroll/latest', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/me/onboarding_status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/me/leave_history?limit=5', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const data = await Promise.all([
        leaveBalance.json(),
        lastPayroll.json(),
        onboardingStatus.json(),
        recentLeaves.json(),
      ]);

      setDashboardData({
        leaveBalance: data[0],
        lastPayroll: data[1],
        onboardingStatus: data[2],
        recentLeaves: data[3],
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Here's your HR dashboard overview</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leave Balance */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Leave Balance</h2>
            <Link
              to="/employee/leave"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Annual Leave</span>
              <span className="font-semibold">{dashboardData.leaveBalance.annual || 0} days</span>
            </div>
            <div className="flex justify-between">
              <span>Sick Leave</span>
              <span className="font-semibold">{dashboardData.leaveBalance.sick || 0} days</span>
            </div>
          </div>
          <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Apply for Leave
          </button>
        </div>

        {/* Latest Payslip */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Latest Payslip</h2>
            <Link
              to="/employee/payroll"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All
            </Link>
          </div>
          {dashboardData.lastPayroll ? (
            <div>
              <p className="text-gray-600">Period: {dashboardData.lastPayroll.period}</p>
              <p className="text-2xl font-bold mt-2">
                ${dashboardData.lastPayroll.net_pay.toFixed(2)}
              </p>
              <button className="mt-4 w-full border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50">
                Download Payslip
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No payslip available</p>
          )}
        </div>

        {/* Onboarding Progress */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Onboarding Progress</h2>
            <Link
              to="/employee/onboarding"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Details
            </Link>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {dashboardData.onboardingStatus.progress || 0}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${dashboardData.onboardingStatus.progress || 0}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {dashboardData.onboardingStatus.remaining_tasks || 0} tasks remaining
            </p>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Leave Requests</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">From</th>
                <th className="text-left py-3 px-4">To</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recentLeaves.map((leave) => (
                <tr key={leave.id} className="border-b">
                  <td className="py-3 px-4">{leave.type}</td>
                  <td className="py-3 px-4">
                    {new Date(leave.start_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {new Date(leave.end_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        leave.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dashboardData.recentLeaves.length === 0 && (
            <p className="text-center py-4 text-gray-500">No recent leave requests</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/employee/chat"
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <span className="text-2xl">💬</span>
            <div>
              <h3 className="font-semibold">Chat with HR</h3>
              <p className="text-sm text-gray-600">Get quick answers</p>
            </div>
          </div>
        </Link>
        <Link
          to="/employee/leave"
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="font-semibold">Request Leave</h3>
              <p className="text-sm text-gray-600">Plan your time off</p>
            </div>
          </div>
        </Link>
        <Link
          to="/employee/payroll"
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <span className="text-2xl">📄</span>
            <div>
              <h3 className="font-semibold">View Payslips</h3>
              <p className="text-sm text-gray-600">Access your records</p>
            </div>
          </div>
        </Link>
        <Link
          to="/employee/onboarding"
          className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="font-semibold">Onboarding Tasks</h3>
              <p className="text-sm text-gray-600">Track your progress</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
