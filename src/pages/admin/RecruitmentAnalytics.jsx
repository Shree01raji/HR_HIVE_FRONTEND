import React, { useState, useEffect } from 'react';
import { 
  FiBarChart, FiPieChart, FiTrendingUp, FiUsers, FiClock, FiTarget, 
  FiCalendar, FiDollarSign, FiCheckCircle, FiXCircle, FiRefreshCw,
  FiDownload, FiFilter, FiEye
} from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart
} from 'recharts';
import { recruitmentAPI } from '../../services/api';

const RecruitmentAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({});
  const [dateRange, setDateRange] = useState('30d');
  const [department, setDepartment] = useState('all');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, department]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch all recruitment data
      const [jobs, candidates, interviews, sources] = await Promise.all([
        recruitmentAPI.getJobs(),
        recruitmentAPI.getCandidates(),
        recruitmentAPI.getInterviews(),
        recruitmentAPI.listCandidateSources?.() || Promise.resolve([])
      ]);

      // Process data for analytics
      const processedData = processAnalyticsData(jobs, candidates, interviews, sources);
      setAnalyticsData(processedData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (jobs, candidates, interviews, sources) => {
    // Department-wise stats
    const departmentStats = {};
    jobs.forEach(job => {
      if (!departmentStats[job.department]) {
        departmentStats[job.department] = {
          totalJobs: 0,
          totalApplications: 0,
          hired: 0,
          rejected: 0,
          inProgress: 0
        };
      }
      departmentStats[job.department].totalJobs++;
    });

    candidates.forEach(candidate => {
      const dept = jobs.find(j => j.job_id === candidate.job_id)?.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          totalJobs: 0,
          totalApplications: 0,
          hired: 0,
          rejected: 0,
          inProgress: 0
        };
      }
      departmentStats[dept].totalApplications++;
      
      if (candidate.status === 'Hired') departmentStats[dept].hired++;
      else if (candidate.status === 'Rejected') departmentStats[dept].rejected++;
      else departmentStats[dept].inProgress++;
    });

    // Source effectiveness
    const sourceStats = {};
    sources.forEach(source => {
      if (!sourceStats[source.source_type]) {
        sourceStats[source.source_type] = { count: 0, hired: 0 };
      }
      sourceStats[source.source_type].count++;
      
      // Check if this source led to a hire
      const candidate = candidates.find(c => c.application_id === source.application_id);
      if (candidate?.status === 'Hired') {
        sourceStats[source.source_type].hired++;
      }
    });

    // Monthly trends
    const monthlyData = {};
    candidates.forEach(candidate => {
      const month = new Date(candidate.applied_at).toISOString().substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { applications: 0, hired: 0, rejected: 0 };
      }
      monthlyData[month].applications++;
      if (candidate.status === 'Hired') monthlyData[month].hired++;
      if (candidate.status === 'Rejected') monthlyData[month].rejected++;
    });

    // Interview funnel
    const funnelData = [
      { stage: 'Applications', count: candidates.length },
      { stage: 'Screened', count: candidates.filter(c => ['Qualified', 'Forwarded', 'Shortlisted', 'Interview', 'Offer', 'Hired'].includes(c.status)).length },
      { stage: 'Interviewed', count: candidates.filter(c => ['Interview', 'Offer', 'Hired'].includes(c.status)).length },
      { stage: 'Offered', count: candidates.filter(c => ['Offer', 'Hired'].includes(c.status)).length },
      { stage: 'Hired', count: candidates.filter(c => c.status === 'Hired').length }
    ];

    return {
      departmentStats,
      sourceStats,
      monthlyData,
      funnelData,
      totalStats: {
        totalJobs: jobs.length,
        totalApplications: candidates.length,
        totalInterviews: interviews.length,
        hired: candidates.filter(c => c.status === 'Hired').length,
        rejected: candidates.filter(c => c.status === 'Rejected').length,
        inProgress: candidates.filter(c => !['Hired', 'Rejected'].includes(c.status)).length
      }
    };
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiUsers className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats?.totalApplications || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hired</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats?.hired || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiClock className="text-yellow-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats?.inProgress || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTarget className="text-purple-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hire Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.totalStats?.totalApplications > 0 
                  ? Math.round((analyticsData.totalStats.hired / analyticsData.totalStats.totalApplications) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(analyticsData.departmentStats || {}).map(([dept, stats]) => ({
            department: dept,
            applications: stats.totalApplications,
            hired: stats.hired,
            rejected: stats.rejected
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="applications" fill="#8884d8" name="Applications" />
            <Bar dataKey="hired" fill="#00C49F" name="Hired" />
            <Bar dataKey="rejected" fill="#FF8042" name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={Object.entries(analyticsData.monthlyData || {}).map(([month, data]) => ({
            month,
            applications: data.applications,
            hired: data.hired
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="applications" stackId="1" stroke="#8884d8" fill="#8884d8" />
            <Area type="monotone" dataKey="hired" stackId="2" stroke="#00C49F" fill="#00C49F" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderFunnelTab = () => (
    <div className="space-y-6">
      {/* Recruitment Funnel */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recruitment Funnel</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData.funnelData || []} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="stage" type="category" />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
          <div className="space-y-4">
            {analyticsData.funnelData?.slice(1).map((stage, index) => {
              const prevStage = analyticsData.funnelData[index];
              const rate = prevStage ? Math.round((stage.count / prevStage.count) * 100) : 0;
              return (
                <div key={stage.stage} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{stage.stage}</span>
                  <span className="text-sm font-bold text-gray-900">{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Effectiveness</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={Object.entries(analyticsData.sourceStats || {}).map(([source, stats]) => ({
                  name: source,
                  value: stats.count,
                  hired: stats.hired
                }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
              >
                {Object.entries(analyticsData.sourceStats || {}).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderDepartmentTab = () => (
    <div className="space-y-6">
      {Object.entries(analyticsData.departmentStats || {}).map(([dept, stats]) => (
        <div key={dept} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{dept}</h3>
            <div className="flex space-x-4 text-sm text-gray-600">
              <span>Applications: {stats.totalApplications}</span>
              <span>Hired: {stats.hired}</span>
              <span>Rejected: {stats.rejected}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.totalApplications}</p>
              <p className="text-sm text-gray-600">Total Applications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
              <p className="text-sm text-gray-600">Hired</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Hire Rate</span>
              <span>{stats.totalApplications > 0 ? Math.round((stats.hired / stats.totalApplications) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${stats.totalApplications > 0 ? (stats.hired / stats.totalApplications) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruitment Analytics</h1>
          <p className="text-gray-600">Comprehensive recruitment metrics and insights</p>
        </div>
        
        <div className="flex space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {Object.keys(analyticsData.departmentStats || {}).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiRefreshCw className="mr-2" size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FiBarChart },
            { id: 'funnel', label: 'Recruitment Funnel', icon: FiTarget },
            { id: 'departments', label: 'Departments', icon: FiUsers }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2" size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'funnel' && renderFunnelTab()}
      {activeTab === 'departments' && renderDepartmentTab()}
    </div>
  );
};

export default RecruitmentAnalytics;
