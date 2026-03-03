import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiBarChart,
  FiPieChart, 
  FiTrendingUp, 
  FiUsers, 
  FiCheckCircle,
  FiEye,
  FiDownload,
  FiRefreshCw,
  FiX,
  FiClock,
  FiDollarSign,
  FiBook,
  FiFileText,
  FiCalendar
} from 'react-icons/fi';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { analyticsAPI } from '../../services/api';

const Analytics = () => {
  const { user } = useAuth();
  const [activeChart, setActiveChart] = useState('leave');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'HR_ADMIN';

  // All charts available to all users
  const charts = [
    { id: 'leave', label: 'Leave Analytics', icon: FiCalendar },
    { id: 'employee', label: 'Employee', icon: FiUsers },
    { id: 'recruitment', label: 'Recruitment', icon: FiFileText },
    { id: 'survey', label: 'Survey', icon: FiBarChart },
    { id: 'timesheet', label: 'Timesheet', icon: FiClock },
    { id: 'payroll', label: 'Payroll', icon: FiDollarSign },
    { id: 'learning', label: 'Learning', icon: FiBook }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const fetchAnalytics = async (chartType) => {
    try {
      setLoading(true);
      let data;
      
      switch (chartType) {
        case 'leave':
          data = await analyticsAPI.getLeaveAnalytics();
          break;
        case 'employee':
          data = await analyticsAPI.getEmployeeAnalytics();
          break;
        case 'recruitment':
          data = await analyticsAPI.getRecruitmentAnalytics();
          break;
        case 'survey':
          data = await analyticsAPI.getSurveyAnalytics();
          break;
        case 'timesheet':
          data = await analyticsAPI.getTimesheetAnalytics();
          break;
        case 'payroll':
          data = await analyticsAPI.getPayrollAnalytics();
          break;
        case 'learning':
          data = await analyticsAPI.getLearningAnalytics();
          break;
        default:
          data = {};
      }
      
      setAnalyticsData(prev => ({
        ...prev,
        [chartType]: data
      }));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(activeChart);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics(activeChart);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeChart]);

  const renderChart = () => {
    const data = analyticsData[activeChart];
    
    if (!data) {
      return <div className="text-center py-12">Loading analytics...</div>;
    }

    switch (activeChart) {
      case 'leave':
        const leavePieData = [
          { name: 'Approved', value: data.approved, color: '#181c52' },
          { name: 'Pending', value: data.pending, color: '#ffbd59' },
          { name: 'Rejected', value: data.rejected, color: '#f40c0c' }
        ];
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Leave Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leavePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leavePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Leave Trends (6 Months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiCheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.approved}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FiClock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <FiX className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{data.rejected}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <FiCalendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-600">{data.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
        );

      case 'employee':
        const deptData = data.departments?.map(dept => ({
          name: dept.name,
          employees: dept.count
        })) || [];
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Department Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="employees" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Employee Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: data.active, color: '#00C49F' },
                        { name: 'Inactive', value: data.inactive, color: '#FF8042' },
                        { name: 'On Leave', value: data.on_leave, color: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Active', value: data.active, color: '#00C49F' },
                        { name: 'Inactive', value: data.inactive, color: '#FF8042' },
                        { name: 'On Leave', value: data.on_leave, color: '#FFBB28' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.on_leave}</p>
                <p className="text-sm text-gray-600">On Leave</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-600">{data.inactive}</p>
                <p className="text-sm text-gray-600">Inactive</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{data.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
        );

      case 'recruitment':
        const recruitmentData = [
          { name: 'Jobs', value: data.total_jobs },
          { name: 'Candidates', value: data.total_candidates },
          { name: 'Interviewed', value: data.interviewed },
          { name: 'Hired', value: data.hired }
        ];
        
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Recruitment Pipeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recruitmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiFileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.total_jobs}</p>
                <p className="text-sm text-gray-600">Total Jobs</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.total_candidates}</p>
                <p className="text-sm text-gray-600">Candidates</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FiClock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{data.interviewed}</p>
                <p className="text-sm text-gray-600">Interviewed</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <FiCheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{data.hired}</p>
                <p className="text-sm text-gray-600">Hired</p>
              </div>
            </div>
          </div>
        );

      case 'survey':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Survey Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: data.active_surveys, color: '#00C49F' },
                        { name: 'Total', value: data.total_surveys - data.active_surveys, color: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Active', value: data.active_surveys, color: '#00C49F' },
                        { name: 'Total', value: data.total_surveys - data.active_surveys, color: '#FFBB28' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Response Rate</h3>
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-blue-600 mb-2">{data.response_rate}%</div>
                    <p className="text-gray-600">Response Rate</p>
                    <p className="text-sm text-gray-500 mt-2">{data.total_responses} responses</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiBarChart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.total_surveys}</p>
                <p className="text-sm text-gray-600">Total Surveys</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <FiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.total_responses}</p>
                <p className="text-sm text-gray-600">Responses</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <FiTrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{data.response_rate}%</p>
                <p className="text-sm text-gray-600">Response Rate</p>
              </div>
            </div>
          </div>
        );

      case 'timesheet':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Hours Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Total Hours', value: data.total_hours },
                  { name: 'Overtime Hours', value: data.overtime_hours },
                  { name: 'Pending Approvals', value: data.pending_approvals }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiClock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.total_hours}</p>
                <p className="text-sm text-gray-600">Total Hours</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FiTrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{data.overtime_hours}</p>
                <p className="text-sm text-gray-600">Overtime</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <FiClock className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{data.pending_approvals}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Payroll Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Processed', value: data.processed, color: '#00C49F' },
                        { name: 'Pending', value: data.pending, color: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Processed', value: data.processed, color: '#00C49F' },
                        { name: 'Pending', value: data.pending, color: '#FFBB28' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Total Amount</h3>
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                    ₹{data.total_amount?.toLocaleString()}
                    </div>
                    <p className="text-gray-600">This Month</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <FiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.processed}</p>
                <p className="text-sm text-gray-600">Processed</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FiClock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{data.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.total_employees}</p>
                <p className="text-sm text-gray-600">Total Employees</p>
              </div>
            </div>
          </div>
        );

      case 'learning':
        const learningData = [
          { name: 'Total Courses', value: data.total_courses },
          { name: 'Enrolled', value: data.total_enrollments },
          { name: 'Completed', value: data.completed_enrollments },
          { name: 'In Progress', value: data.active_enrollments }
        ];
        
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={learningData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <FiBook className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{data.total_courses}</p>
                <p className="text-sm text-gray-600">Total Courses</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <FiUsers className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.total_enrollments}</p>
                <p className="text-sm text-gray-600">Enrolled</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <FiCheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{data.completed_enrollments}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FiTrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{data.active_enrollments}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>No data available</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Real-time analytics across all modules and departments
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchAnalytics(activeChart)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
            </div>

      {/* Chart Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 overflow-x-auto">
            {charts.map((chart) => {
              const Icon = chart.icon;
              return (
            <button
                  key={chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeChart === chart.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{chart.label}</span>
            </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default Analytics;