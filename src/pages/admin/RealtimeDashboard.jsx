import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../../services/api';
import { formatToLocalTime, formatToLocalDateTime } from '../../utils/timezone';
import { 
  FiActivity, 
  FiClock, 
  FiMonitor, 
  FiUser, 
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';

export default function RealtimeDashboard() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Error boundary for component errors
  useEffect(() => {
    const errorHandler = (event) => {
      console.error('RealtimeDashboard error:', event.error);
      setHasError(true);
      setError('An unexpected error occurred. Please refresh the page.');
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  useEffect(() => {
    fetchRealtimeActivity();
    
    // Auto-refresh every 5 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchRealtimeActivity();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const fetchRealtimeActivity = async () => {
    try {
      console.log('🔄 [RealtimeDashboard] Fetching real-time activity...');
      setError(null);
      setLoading(true);
      const data = await timesheetAPI.getRealtimeActivity();
      console.log('✅ [RealtimeDashboard] API Response:', data);
      if (Array.isArray(data)) {
        console.log(`✅ [RealtimeDashboard] Received ${data.length} activities`);
        setActivities(data);
      } else {
        console.warn('⚠️ [RealtimeDashboard] Unexpected data format from API:', data);
        setActivities([]);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ [RealtimeDashboard] Error fetching real-time activity:', err);
      console.error('❌ [RealtimeDashboard] Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        statusText: err?.response?.statusText
      });
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load real-time activity. Please check your connection and try again.';
      setError(errorMessage);
      setActivities([]);
    } finally {
      setLoading(false);
      console.log('🏁 [RealtimeDashboard] Fetch complete. Loading:', false, 'Error:', error, 'Activities:', activities.length);
    }
  };

  const getActivityStatus = (activity) => {
    if (activity.is_idle) {
      return { label: 'Idle', color: 'text-yellow-600 bg-yellow-50', icon: FiAlertCircle };
    }
    return { label: 'Active', color: 'text-green-600 bg-green-50', icon: FiCheckCircle };
  };

  const getTimeAgo = (timestamp) => {
    try {
      if (!timestamp) return 'Unknown';
      const now = new Date();
      const time = new Date(timestamp);
      if (isNaN(time.getTime())) return 'Invalid date';
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return 'More than a day ago';
    } catch (err) {
      console.error('Error in getTimeAgo:', err);
      return 'Unknown';
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('📊 [RealtimeDashboard] Component State:', {
      loading,
      error,
      activitiesCount: activities.length,
      hasError,
      autoRefresh
    });
  }, [loading, error, activities.length, hasError, autoRefresh]);

  // Show loading state only on initial load
  if (loading && activities.length === 0 && !error) {
    console.log('⏳ [RealtimeDashboard] Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading real-time activity...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [RealtimeDashboard] Rendering main content. Error:', error, 'Activities:', activities.length);

  return (
    <div className="space-y-6 p-6">
      {/* Debug Info - Remove this after debugging */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-xs font-mono">
        <div className="grid grid-cols-4 gap-2">
          <div>Loading: <span className={loading ? 'text-blue-600 font-bold' : 'text-gray-600'}>{loading ? 'YES' : 'NO'}</span></div>
          <div>Error: <span className={error ? 'text-red-600 font-bold' : 'text-gray-600'}>{error ? 'YES' : 'NO'}</span></div>
          <div>Activities: <span className="text-gray-900 font-bold">{activities.length}</span></div>
          <div>Auto-refresh: <span className={autoRefresh ? 'text-green-600 font-bold' : 'text-gray-600'}>{autoRefresh ? 'ON' : 'OFF'}</span></div>
        </div>
        {error && <div className="mt-2 text-red-600">Error: {error}</div>}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiActivity className="w-6 h-6 mr-2 text-blue-600" />
            Real-Time Activity Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Live view of employee activity (updates every 5 seconds)
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm text-gray-600">
              Auto-refresh
            </label>
          </div>
          <button
            onClick={fetchRealtimeActivity}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-[#181c52] text-white rounded hover:bg-[#2c2f70] disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-sm text-gray-500">
          Last updated: {(() => {
            try {
              return formatToLocalDateTime(lastUpdate);
            } catch (err) {
              console.error('Error formatting date:', err);
              return lastUpdate.toLocaleString();
            }
          })()}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error loading real-time activity</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchRealtimeActivity}
                className="mt-3 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      {!error && activities.length === 0 && !loading ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FiActivity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No recent activity found</p>
          <p className="text-sm text-gray-500 mt-2">
            Activity from the last 5 minutes will appear here
          </p>
        </div>
      ) : !error && activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity, idx) => {
            const status = getActivityStatus(activity);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        Employee #{activity.employee_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimeAgo(activity.last_activity)}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{status.label}</span>
                  </div>
                </div>

                {activity.current_application && (
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <FiMonitor className="w-4 h-4" />
                      <span className="font-medium">Current Application:</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 ml-6">
                      {activity.current_application}
                    </div>
                  </div>
                )}

                {activity.activities && activity.activities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Recent Activity
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {activity.activities.slice(0, 3).map((act, actIdx) => (
                        <div key={actIdx} className="text-xs text-gray-600 flex items-center justify-between">
                          <span className="flex items-center space-x-1">
                            <FiClock className="w-3 h-3" />
                            <span>{act.application || 'Unknown'}</span>
                          </span>
                          <span className="text-gray-400">
                            {(() => {
                              try {
                                return formatToLocalTime(act.timestamp);
                              } catch (err) {
                                console.error('Error formatting time:', err);
                                return act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'N/A';
                              }
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Summary Stats */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Total Active</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {activities.filter(a => !a.is_idle).length}
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium">Total Idle</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">
              {activities.filter(a => a.is_idle).length}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 font-medium">Total Employees</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {activities.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
