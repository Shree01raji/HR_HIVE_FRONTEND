import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { leaveAPI, leavePolicyAPI, workflowAPI } from '../../services/api';
import api from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';
import { FiInfo, FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiX } from 'react-icons/fi';

export default function LeaveManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({});
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [leaveConfig, setLeaveConfig] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [loadingWorkflows, setLoadingWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [activeTab, setActiveTab] = useState('leave');

  const normalizeLeaveType = (value) => String(value || '').trim().toLowerCase();
  const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
  const isApprovedStatus = (value) => normalizeStatus(value) === 'APPROVED';
  const isRejectedStatus = (value) => ['REJECTED', 'DECLINED'].includes(normalizeStatus(value));
  const isPaidLeaveType = (value) => {
    const normalized = normalizeLeaveType(value);
    return normalized.includes('paid') && !normalized.includes('unpaid');
  };
  const isUnpaidLeaveType = (value) => normalizeLeaveType(value).includes('unpaid');
  const isPlOrEarnedLeaveType = (value) => {
    const normalized = normalizeLeaveType(value);
    return normalized.includes('pl or earned leave') || normalized.includes('earned leave');
  };
  const isPermissionType = (value) => normalizeLeaveType(value).includes('permission');

  const getLeaveDurationDays = (leave) => {
    const start = new Date(leave?.start_date);
    const end = new Date(leave?.end_date || leave?.start_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  const extractPermissionHours = (leave) => {
    const explicitHours = Number(leave?.permission_hours);
    if (Number.isFinite(explicitHours) && explicitHours > 0) {
      return explicitHours;
    }

    const notes = String(leave?.notes || '');
    const match = notes.match(/Permission Hours:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return getLeaveDurationDays(leave) * 8;
  };

  const getLeaveDurationHours = (leave) => getLeaveDurationDays(leave) * 8;

  const requestedLeaves = useMemo(
    () => leaveHistory.filter((leave) => ['PENDING', 'REQUESTED'].includes(normalizeStatus(leave?.status))),
    [leaveHistory]
  );

  const approvedLeaves = useMemo(
    () => leaveHistory.filter((leave) => normalizeStatus(leave?.status) === 'APPROVED'),
    [leaveHistory]
  );

  const rejectedLeaves = useMemo(
    () => leaveHistory.filter((leave) => ['REJECTED', 'DECLINED'].includes(normalizeStatus(leave?.status))),
    [leaveHistory]
  );

  const normalizeLeaveConfig = (config) => {
    if (!config || typeof config !== 'object') return {};
    return Object.entries(config).reduce((acc, [key, rawValue]) => {
      const leaveType = String(key || '').trim();
      if (!leaveType) return acc;
      const parsed = Number(rawValue);
      acc[leaveType] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      return acc;
    }, {});
  };

  const getLeaveConfigCacheKey = () => {
    const org = localStorage.getItem('selectedOrganization') || 'default';
    return `leave_config_cache:${org}`;
  };

  const readCachedLeaveConfig = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getLeaveConfigCacheKey()) || '{}');
      return normalizeLeaveConfig(parsed);
    } catch {
      return {};
    }
  };

  const persistLeaveConfigCache = (config) => {
    try {
      localStorage.setItem(getLeaveConfigCacheKey(), JSON.stringify(normalizeLeaveConfig(config)));
    } catch {
      // Ignore cache write errors.
    }
  };

  useEffect(() => {
    fetchLeaveConfig();
  }, []);

  const fetchLeaveConfig = useCallback(async () => {
    try {
      console.log('Fetching leave configuration from settings...');
      // Use the employee-accessible endpoint
      // Protect against a hung request by racing the API call with a timeout fallback
      const timeoutMs = 8000; // 8s
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ __timedout: true }), timeoutMs));
      const response = await Promise.race([api.get('/settings/leave-config'), timeoutPromise]);
      if (response && response.__timedout) {
        console.warn('Leave config request timed out');
        const cached = readCachedLeaveConfig();
        if (Object.keys(cached).length > 0) {
          setLeaveConfig(cached);
          setError(null);
        } else {
          setError('Loading leave configuration timed out. Please try refreshing the page.');
          setLeaveConfig({}); // mark as empty so UI can show a helpful message
        }
        setLoading(false);
        return;
      }
      const data = response.data;
      console.log('Leave config response:', data);
      console.log('leave_config:', data?.leave_config);

      const normalizedConfig = normalizeLeaveConfig(data?.leave_config);
      if (Object.keys(normalizedConfig).length > 0) {
        console.log('Leave config found:', normalizedConfig);
        setLeaveConfig(normalizedConfig);
        persistLeaveConfigCache(normalizedConfig);
        setError(null); // Clear any previous errors
      } else {
        const cached = readCachedLeaveConfig();
        if (Object.keys(cached).length > 0) {
          console.warn('No leave configuration from API, using cached configuration');
          setLeaveConfig(cached);
          setError(null);
        } else {
          // No configuration set - show error
          console.warn('No leave configuration found in settings');
          setError('Leave configuration is not set. Please contact your administrator to configure leave days in the settings.');
          setLeaveConfig({}); // Empty config to prevent calculation
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch leave configuration:', err);
      const cached = readCachedLeaveConfig();
      if (Object.keys(cached).length > 0) {
        setLeaveConfig(cached);
        setError(null);
      } else {
        setError('Failed to load leave configuration. Please contact your administrator.');
        setLeaveConfig({}); // Empty config to prevent calculation
      }
      setLoading(false);
    }
  }, []);

  const fetchLeaveData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching leave data...');
      let history;
      let usingFallbackData = false;

      const getLeaveHistoryCacheKey = () => {
        const org = localStorage.getItem('selectedOrganization') || 'default';
        return `leave_history_cache:${org}`;
      };

      const readCachedLeaveHistory = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(getLeaveHistoryCacheKey()) || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      const persistLeaveHistoryCache = (records) => {
        try {
          localStorage.setItem(getLeaveHistoryCacheKey(), JSON.stringify(Array.isArray(records) ? records : []));
        } catch {
          // Ignore cache write errors.
        }
      };

      const normalizeLeaveHistory = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== 'object') return [];
        if (Array.isArray(payload.records)) return payload.records;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.data)) return payload.data;
        const firstArray = Object.values(payload).find((value) => Array.isArray(value));
        return Array.isArray(firstArray) ? firstArray : [];
      };
      
      try {
        // Get employee's own leave records
        const responseHistory = await leaveAPI.getMyLeaves();
        history = normalizeLeaveHistory(responseHistory);
        console.log('Leave history received from API:', responseHistory);
        console.log('Normalized leave history count:', history.length);
        persistLeaveHistoryCache(history);
      } catch (apiError) {
        console.error('API call failed:', apiError);
        history = readCachedLeaveHistory();
        usingFallbackData = history.length > 0;
      }
      
      setLeaveHistory(history);
      
      setUsingFallbackData(usingFallbackData);
      
      // Check if leave configuration is available
      console.log('Checking leaveConfig in fetchLeaveData:', leaveConfig);
      if (!leaveConfig || Object.keys(leaveConfig).length === 0) {
        console.warn('Leave config is empty, cannot calculate balance');
        setError('Leave configuration is not set. Please contact your administrator to configure leave days in the settings.');
        setLoading(false);
        return;
      }
      
      console.log('Using leave config for calculation:', leaveConfig);
      
      // Calculate actual leave balance based on records
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Calculate used and pending leaves for each type
      const leaveTypes = Object.keys(leaveConfig);
      const calculatedBalance = {};
      
      leaveTypes.forEach(type => {
        // Get configured entitlement for this leave type
        const totalAllowed = Number(leaveConfig[type]) || 0;
        const normalizedType = normalizeLeaveType(type);
        
        // Count only APPROVED leaves as taken.
        // REJECTED/DECLINED and pending/requested leaves do not reduce balance.
        const usedLeaves = history.filter((leave) => {
          const leaveStatus = normalizeStatus(leave?.status);
          if (isRejectedStatus(leaveStatus)) return false;

          return (
          normalizeLeaveType(leave?.leave_type) === normalizedType &&
          isApprovedStatus(leaveStatus) &&
          new Date(leave?.start_date).getFullYear() === currentYear
          );
        });
        
        const totalUsed = usedLeaves.reduce((sum, leave) => sum + getLeaveDurationDays(leave), 0);

        if (isPermissionType(type)) {
          const monthlyApprovedLeaves = usedLeaves.filter((leave) => {
            const leaveDate = new Date(leave?.start_date);
            return leaveDate.getMonth() + 1 === currentMonth;
          });
          const monthlyTakenHours = monthlyApprovedLeaves.reduce((sum, leave) => sum + extractPermissionHours(leave), 0);
          const monthlyAllowedHours = totalAllowed;

          calculatedBalance[type] = {
            remaining: Math.max(0, monthlyAllowedHours - monthlyTakenHours),
            taken: monthlyTakenHours,
            unit: 'hours',
            monthlyTakenHours
          };
          return;
        }

        if (isPlOrEarnedLeaveType(type)) {
          const usedInCurrentMonth = usedLeaves.some((leave) => {
            const leaveDate = new Date(leave?.start_date);
            return leaveDate.getMonth() + 1 === currentMonth;
          });

          calculatedBalance[type] = {
            remaining: usedInCurrentMonth ? 0 : 1,
            taken: usedInCurrentMonth ? 1 : 0,
            unit: 'days',
            monthlyRule: true
          };
          return;
        }

        if (isPaidLeaveType(type)) {
          const annualPaidLeave = totalAllowed > 0 ? totalAllowed : 12;
          const accruedTillCurrentMonth = Math.min(annualPaidLeave, currentMonth);
          const usedTillCurrentMonth = usedLeaves
            .filter((leave) => {
              const leaveDate = new Date(leave?.start_date);
              return leaveDate.getMonth() + 1 <= currentMonth;
            })
            .reduce((sum, leave) => sum + getLeaveDurationDays(leave), 0);

          calculatedBalance[type] = {
            remaining: Math.max(0, accruedTillCurrentMonth - usedTillCurrentMonth),
            taken: usedTillCurrentMonth,
            unit: 'days'
          };
          return;
        }

        if (isUnpaidLeaveType(type)) {
          calculatedBalance[type] = {
            remaining: null,
            taken: totalUsed,
            unit: 'days',
            isAsRequired: true
          };
          return;
        }

        calculatedBalance[type] = {
          remaining: Math.max(0, totalAllowed - totalUsed),
          taken: totalUsed,
          unit: 'days'
        };
      });
      
      setLeaveBalance(calculatedBalance);
      console.log('Calculated leave balance:', calculatedBalance);
    } catch (err) {
      console.error('Failed to fetch leave data:', err);
      
      let errorMessage = `Error: ${err.message}`;
      if (err.response) {
        errorMessage += `\n\nAPI Error: ${err.response.status} - ${err.response.statusText}`;
        if (err.response.data) {
          errorMessage += `\nDetails: ${JSON.stringify(err.response.data)}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [leaveConfig]);

  useEffect(() => {
    if (leaveConfig && Object.keys(leaveConfig).length > 0) {
      console.log('Leave config is ready, fetching leave data...');
      fetchLeaveData();
    } else if (leaveConfig !== null) {
      // leaveConfig is explicitly set to {} (empty), show error
      console.log('Leave config is empty');
    }
  }, [leaveConfig, fetchLeaveData]);

  // Auto-refresh: poll periodically and refresh leave config when the tab becomes visible.
  useEffect(() => {
    // Poll every 30s to pick up admin-side leave configuration changes.
    const interval = setInterval(() => {
      if (!loading) fetchLeaveConfig();
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaveConfig();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLeaveConfig, loading]);

  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      if (event?.detail?.type === 'settings_update') {
        fetchLeaveConfig();
      }
    };

    window.addEventListener('settings-update', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settings-update', handleSettingsUpdate);
    };
  }, [fetchLeaveConfig]);

  const handleViewPolicy = async (leaveType) => {
    try {
      setLoadingPolicy(true);
      setPolicyMessage(null);
      // Always fetch active policies and filter client-side.
      // Backend rejects unknown leave_type query values with 400 for custom leave types.
      const allActivePolicies = await leavePolicyAPI.getPolicies(true);
      const normalizedType = normalizeLeaveType(leaveType);
      const policies = (Array.isArray(allActivePolicies) ? allActivePolicies : []).filter(
        (policy) => normalizeLeaveType(policy?.leave_type) === normalizedType
      );
      
      if (policies && policies.length > 0) {
        // Find the most relevant policy (usually the first one or the most recent)
        const policy = policies[0];
        setSelectedPolicy(policy);
        setShowPolicyModal(true);
      } else {
        setPolicyMessage(`No policy found for ${leaveType}. Please contact HR for more information.`);
      }
    } catch (err) {
      console.error('Error fetching policy:', err);
      setPolicyMessage(`Failed to load policy for ${leaveType}. Please try again later.`);
    } finally {
      setLoadingPolicy(false);
    }
  };

  const fetchWorkflowForLeave = useCallback(async (resourceId, leaveRecord) => {
    if (!resourceId) return null;
    if (workflows[resourceId]) return workflows[resourceId];

    setLoadingWorkflows((prev) => ({ ...prev, [resourceId]: true }));
    try {
      const leaveWorkflows = await workflowAPI.getInstances('leave', resourceId);
      if (leaveWorkflows?.length > 0) {
        const latestWorkflow = leaveWorkflows[0];
        setWorkflows((prev) => ({ ...prev, [resourceId]: latestWorkflow }));
        return latestWorkflow;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch workflow for leave (possible id fields)', err, leaveRecord);
      return null;
    } finally {
      setLoadingWorkflows((prev) => ({ ...prev, [resourceId]: false }));
    }
  }, [workflows]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };


  if (loading) return <div className="text-gray-600 dark:text-gray-400">Loading...</div>;
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Use the HR Assistant chat to apply for leave</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Configuration Required
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
                <p className="mt-2">
                  Please ask your administrator to configure leave days in the <strong>Admin Settings</strong> page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Use the HR Assistant chat to apply for leave</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLeaveConfig}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              title="Reload leave configuration from settings"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reload Config</span>
            </button>
            <button
              onClick={fetchLeaveData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 dark:text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-[#181c52] dark:text-[#181c52]">
              <strong>Need to apply for leave?</strong> Use the HR Assistant chat (bottom right corner) to submit your leave application. The AI will guide you through the process step by step.
            </p>
          </div>
        </div>
      </div>

      {/* Fallback Data Warning */}
      {usingFallbackData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> Displaying cached leave data due to API connection issue. Click refresh to try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {policyMessage && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">{policyMessage}</p>
            <button
              onClick={() => setPolicyMessage(null)}
              className="text-xs px-3 py-1 rounded bg-yellow-100 dark:bg-yellow-800/40 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800/60"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-2">
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: 'leave',
              label: 'Leave',
              activeClass: 'bg-[#ffbd59] text-gray-900',
              inactiveClass: 'bg-white text-gray-800 hover:bg-[#ffbd59]/70'
            },
            {
              key: 'requested',
              label: 'Requested',
              activeClass: 'bg-orange-300 text-orange-900',
              inactiveClass: 'bg-white text-gray-800 hover:bg-orange-200'
            },
            {
              key: 'approved',
              label: 'Approved',
              activeClass: 'bg-green-300 text-green-900',
              inactiveClass: 'bg-white text-gray-800 hover:bg-green-200'
            },
            {
              key: 'rejected',
              label: 'Rejected',
              activeClass: 'bg-red-500 text-white',
              inactiveClass: 'bg-white text-gray-800 hover:bg-red-200'
            }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? tab.activeClass
                  : tab.inactiveClass
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'leave' && (
        <>
          {/* Leave Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(leaveConfig || {}).map(([type, totalAllowed]) => {
              const metrics = leaveBalance[type] || {};
              const unit = metrics.unit || (isPermissionType(type) ? 'hours' : 'days');
              const isAsRequired = Boolean(metrics.isAsRequired);
              const isMonthlyRule = Boolean(metrics.monthlyRule);
              const remaining = Number.isFinite(metrics.remaining) ? metrics.remaining : totalAllowed;
              const taken = Number.isFinite(metrics.taken) ? metrics.taken : Math.max(0, (totalAllowed || 0) - (remaining || 0));
              const monthlyTakenHours = Number.isFinite(metrics.monthlyTakenHours) ? metrics.monthlyTakenHours : 0;

              return (
              <div
                key={type}
                role="button"
                tabIndex={0}
                onClick={() => handleViewPolicy(type)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewPolicy(type);
                  }
                }}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow hover:border-[#ffbd59] border-2 border-transparent cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold dark:text-white">{type}</h3>
                  <FiInfo className="w-5 h-5 text-teal-600 dark:text-teal-400" title="Click to view policy details" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Taken</p>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{taken}</div>
                  </div>
                  {!isAsRequired && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Remaining</p>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{remaining}</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Unit: {unit}</p>
                {isAsRequired && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">As per required</p>
                )}
                {isMonthlyRule && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only 1 day per month. If used this month, you can apply again next month.</p>
                )}
                {isPermissionType(type) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total hours taken this month: {monthlyTakenHours}</p>
                )}
                <p className="text-xs text-[#181c52] dark:text-[#181c52] mt-2 font-medium">Click to view policy →</p>
              </div>
            )})}
          </div>

          {/* Leave History */}
          {/* <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Leave History</h3>
            {leaveHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No leave applications found.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Use the HR Assistant chat to apply for leave.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {leaveHistory.map((leave, index) => {
                      return (
                        <React.Fragment key={leave.leave_id || index}>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{leave.leave_type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {new Date(leave.start_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {new Date(leave.end_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${leave.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                                  leave.status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 
                                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                                {leave.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{leave.notes || 'No reason provided'}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div> */}
        </>
      )}

      {activeTab !== 'leave' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {(() => {
            const currentData = activeTab === 'requested' ? requestedLeaves : activeTab === 'approved' ? approvedLeaves : rejectedLeaves;
            return currentData.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                No {activeTab} leave records found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.map((leave, index) => {
                  const resourceId = leave.leave_id ?? leave.id ?? leave.request_id ?? leave.uuid ?? null;
                  const workflow = resourceId ? workflows[resourceId] : null;
                  const showWorkflowAction = ['approved', 'rejected'].includes(activeTab);

                  return (
                  <div key={leave.leave_id || leave.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{leave.leave_type}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        normalizeStatus(leave.status) === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : ['PENDING', 'REQUESTED'].includes(normalizeStatus(leave.status))
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">From: {new Date(leave.start_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">To: {new Date(leave.end_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">{leave.notes || 'No reason provided'}</p>

                    {showWorkflowAction && (
                      <div className="mt-3">
                        {resourceId ? (
                          <button
                            onClick={async () => {
                              const targetId = resourceId || leave.leave_id;
                              if (!targetId) return;

                              if (expandedWorkflow === targetId) {
                                setExpandedWorkflow(null);
                                return;
                              }

                              const resolvedWorkflow = await fetchWorkflowForLeave(targetId, leave);
                              if (resolvedWorkflow) {
                                setExpandedWorkflow(targetId);
                              } else {
                                setPolicyMessage('Workflow details are not available right now.');
                              }
                            }}
                            disabled={Boolean(loadingWorkflows[resourceId])}
                            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                          >
                            {loadingWorkflows[resourceId] ? 'Loading...' : 'View Workflow'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No workflow</span>
                        )}
                      </div>
                    )}

                    {showWorkflowAction && expandedWorkflow === (resourceId || leave.leave_id) && workflow && (
                      <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                        <WorkflowStatusCard workflow={workflow} />
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Approval Steps</h4>
                          <WorkflowDiagram steps={workflow.steps} compact={true} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">History</h4>
                          <WorkflowTimeline events={workflow.events} steps={workflow.steps} />
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            );
          })()}
        </div>
      )}

      {/* Policy Details Modal */}
      {showPolicyModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Policy Details</h2>
              <button
                onClick={() => {
                  setShowPolicyModal(false);
                  setSelectedPolicy(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Policy Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedPolicy.policy_name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      {selectedPolicy.leave_type}
                    </span>
                  </div>
                </div>
                {selectedPolicy.is_active ? (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <FiCheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <FiXCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedPolicy.description && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300">{selectedPolicy.description}</p>
                </div>
              )}

              {/* Policy Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Days Per Year</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedPolicy.default_days_per_year}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">days</p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Effective From</p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {formatDate(selectedPolicy.effective_from)}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                {selectedPolicy.carry_forward_allowed && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-900 dark:text-green-300">Carry Forward Allowed</p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-400 ml-7">
                      Maximum {selectedPolicy.max_carry_forward_days || 0} days can be carried forward to the next year
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Minimum Notice</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedPolicy.min_notice_days || 0} days
                    </p>
                  </div>
                  {selectedPolicy.max_consecutive_days && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Max Consecutive Days</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedPolicy.max_consecutive_days} days
                      </p>
                    </div>
                  )}
                </div>

                {/* Policy Rules */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Policy Rules</p>
                  <div className="space-y-2">
                    {selectedPolicy.requires_approval && (
                      <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <FiCheckCircle className="w-4 h-4 text-yellow-600" />
                        <span>Requires Manager/HR Approval</span>
                      </div>
                    )}
                    {selectedPolicy.requires_medical_certificate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <FiCheckCircle className="w-4 h-4 text-red-600" />
                        <span>Medical Certificate Required</span>
                        {selectedPolicy.medical_certificate_required_after_days && (
                          <span className="text-xs text-gray-500">
                            (after {selectedPolicy.medical_certificate_required_after_days} days)
                          </span>
                        )}
                      </div>
                    )}
                    {selectedPolicy.accrual_type && selectedPolicy.accrual_type !== 'annual' && (
                      <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <FiClock className="w-4 h-4 text-purple-600" />
                        <span>
                          {selectedPolicy.accrual_type.charAt(0).toUpperCase() + selectedPolicy.accrual_type.slice(1)} Accrual
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPolicy.effective_to && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    Valid until: {formatDate(selectedPolicy.effective_to)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowPolicyModal(false);
                  setSelectedPolicy(null);
                }}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
