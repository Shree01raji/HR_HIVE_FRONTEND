import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiClock, FiTrendingUp, FiUsers, FiBarChart, FiPieChart, FiActivity, FiCheckCircle, FiSettings } from 'react-icons/fi';
import { payrollAPI, timesheetAPI } from '../../services/api';

export default function AccountantDashboard() {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalPayroll: 0,
    pendingPayroll: 0,
    totalHours: 0,
    pendingApprovals: 0,
    processedThisMonth: 0,
    accuracy: 100
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch payroll stats
      const payrollData = await payrollAPI.getPayrollRecords();
      const totalPayroll = payrollData.reduce((sum, record) => sum + (record.total_salary || 0), 0);
      const pendingPayroll = payrollData.filter(r => r.status === 'PENDING').length;

      // Fetch timesheet stats
      const timesheetData = await timesheetAPI.getTimesheets();
      const totalHours = timesheetData.reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const pendingApprovals = timesheetData.filter(t => t.status === 'PENDING').length;

      setStats({
        totalPayroll,
        pendingPayroll,
        totalHours,
        pendingApprovals,
        processedThisMonth: payrollData.filter(r => r.status === 'PROCESSED').length,
        accuracy: 100
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Payroll',
      value: `$${stats.totalPayroll.toLocaleString()}`,
      icon: FiDollarSign,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: FiClock,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    {
      title: 'Total Hours',
      value: `${stats.totalHours.toFixed(1)}h`,
      icon: FiActivity,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      title: 'Processed This Month',
      value: stats.processedThisMonth,
      icon: FiCheckCircle,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
            <p className="text-gray-600">Comprehensive financial overview and analytics</p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-emerald-600 font-semibold text-sm">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`px-3 py-1 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                  <span className="text-xs font-semibold text-gray-700">ACTIVE</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Overview */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <FiBarChart className="w-5 h-5 text-emerald-600" />
              <span>Payroll Overview</span>
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <FiDollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Processed</p>
                  <p className="text-lg font-bold text-gray-900">${stats.totalPayroll.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FiClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Reviews</p>
                  <p className="text-lg font-bold text-gray-900">{stats.pendingPayroll}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timesheet Analytics */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <FiPieChart className="w-5 h-5 text-teal-600" />
              <span>Timesheet Analytics</span>
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Hours Tracked</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-lg font-bold text-gray-900">{stats.pendingApprovals}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/accountant/payroll')}
            className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:from-emerald-100 hover:to-teal-100 transition-all duration-200 text-left cursor-pointer"
          >
            <FiDollarSign className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="font-semibold text-gray-900">Process Payroll</p>
            <p className="text-sm text-gray-600">Review and approve salary payments</p>
          </button>
          <button 
            onClick={() => navigate('/accountant/timesheet')}
            className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:from-blue-100 hover:to-cyan-100 transition-all duration-200 text-left cursor-pointer"
          >
            <FiClock className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-semibold text-gray-900">Review Timesheets</p>
            <p className="text-sm text-gray-600">Approve employee hours</p>
          </button>
          <button 
            onClick={() => navigate('/accountant/settings')}
            className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 text-left cursor-pointer"
          >
            <FiSettings className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-semibold text-gray-900">Account Settings</p>
            <p className="text-sm text-gray-600">Manage your profile</p>
          </button>
        </div>
      </div>
    </div>
  );
}

