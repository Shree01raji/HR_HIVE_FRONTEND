import React, { useState, useEffect } from 'react';
import { 
  FiBarChart, 
  FiTrendingUp, 
  FiTrendingDown,
  FiClock,
  FiCalendar,
  FiTarget,
  FiAward,
  FiRefreshCw
} from 'react-icons/fi';

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    timesheet: { totalHours: 0, averageHours: 0, attendanceRate: 0 },
    leaves: { totalRequests: 0, approved: 0, pending: 0 },
    performance: { totalGoals: 0, completedGoals: 0, averageRating: 0 },
    engagement: { surveys: 0, recognitions: 0, points: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPersonalAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPersonalAnalytics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPersonalAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch timesheet analytics
      const timesheetResponse = await fetch('/api/timesheet/analytics/personal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (timesheetResponse.ok) {
        const timesheetData = await timesheetResponse.json();
        setAnalytics(prev => ({
          ...prev,
          timesheet: {
            totalHours: timesheetData.total_hours || 0,
            averageHours: timesheetData.average_hours || 0,
            attendanceRate: timesheetData.attendance_rate || 0
          }
        }));
      }

      // Fetch leave analytics
      const leaveResponse = await fetch('/api/leave/analytics/personal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        setAnalytics(prev => ({
          ...prev,
          leaves: {
            totalRequests: leaveData.total_requests || 0,
            approved: leaveData.approved || 0,
            pending: leaveData.pending || 0
          }
        }));
      }

      // Fetch performance analytics
      const performanceResponse = await fetch('/api/performance/analytics/personal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setAnalytics(prev => ({
          ...prev,
          performance: {
            totalGoals: performanceData.total_goals || 0,
            completedGoals: performanceData.completed_goals || 0,
            averageRating: performanceData.average_rating || 0
          }
        }));
      }


      // Fetch engagement analytics
      const engagementResponse = await fetch('/api/engagement/analytics/personal', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (engagementResponse.ok) {
        const engagementData = await engagementResponse.json();
        setAnalytics(prev => ({
          ...prev,
          engagement: {
            surveys: engagementData.surveys || 0,
            recognitions: engagementData.recognitions || 0,
            points: engagementData.points || 0
          }
        }));
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching personal analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchPersonalAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
          <p className="text-gray-600">Personal performance insights and metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Timesheet Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiClock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.timesheet.totalHours}</p>
            </div>
          </div>
        </div>

        {/* Leave Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCalendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leave Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.leaves.totalRequests}</p>
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTarget className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Goals Completed</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.performance.completedGoals}</p>
            </div>
          </div>
        </div>


        {/* Engagement Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiAward className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recognition Points</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.engagement.points}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timesheet Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timesheet Analytics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Hours/Day</span>
              <span className="font-semibold">{analytics.timesheet.averageHours.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Attendance Rate</span>
              <span className="font-semibold">{analytics.timesheet.attendanceRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, analytics.timesheet.attendanceRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Performance Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Goals</span>
              <span className="font-semibold">{analytics.performance.totalGoals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold">
                {analytics.performance.totalGoals > 0 
                  ? ((analytics.performance.completedGoals / analytics.performance.totalGoals) * 100).toFixed(1)
                  : 0
                }%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-semibold">{analytics.performance.averageRating.toFixed(1)}/5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (analytics.performance.completedGoals / Math.max(1, analytics.performance.totalGoals)) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>


        {/* Engagement Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Analytics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Surveys Participated</span>
              <span className="font-semibold">{analytics.engagement.surveys}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recognitions Received</span>
              <span className="font-semibold">{analytics.engagement.recognitions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Points</span>
              <span className="font-semibold text-orange-600">{analytics.engagement.points}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (analytics.engagement.points / 100) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
