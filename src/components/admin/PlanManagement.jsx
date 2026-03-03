import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiBriefcase,
  FiBookOpen,
  FiHeart,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiSave,
  FiRefreshCw,
  FiBarChart,
  FiCreditCard
} from 'react-icons/fi';
import { subscriptionAPI } from '../../services/api';

export default function PlanManagement({ organizationId, organizationSlug }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usageData, plansData] = await Promise.all([
        subscriptionAPI.getUsage(organizationId),
        subscriptionAPI.listPlans()
      ]);
      
      setUsageStats(usageData);
      setCurrentPlan(usageData.current_plan);
      setPlans(plansData);
    } catch (err) {
      console.error('Failed to fetch plan data:', err);
      setError(err.response?.data?.detail || 'Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedPlanId) return;
    
    try {
      setUpdating(true);
      await subscriptionAPI.assignPlan(organizationId, selectedPlanId);
      await fetchData();
      setShowPlanSelector(false);
      setSelectedPlanId(null);
      alert('Plan updated successfully!');
    } catch (err) {
      console.error('Failed to update plan:', err);
      alert(err.response?.data?.detail || 'Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  const getLimitIcon = (limitType) => {
    const icons = {
      MAX_EMPLOYEES: FiUsers,
      MAX_PAYROLL_RUNS_PER_MONTH: FiDollarSign,
      MAX_DOCUMENTS_STORAGE: FiFileText,
      MAX_RECRUITMENT_POSTINGS: FiBriefcase,
      MAX_LEARNING_COURSES: FiBookOpen,
      MAX_ENGAGEMENT_SURVEYS: FiHeart
    };
    return icons[limitType] || FiBarChart;
  };

  const getLimitLabel = (limitType) => {
    const labels = {
      MAX_EMPLOYEES: 'Employees',
      MAX_PAYROLL_RUNS_PER_MONTH: 'Payroll Runs/Month',
      MAX_DOCUMENTS_STORAGE: 'Documents Storage',
      MAX_RECRUITMENT_POSTINGS: 'Job Postings',
      MAX_LEARNING_COURSES: 'Learning Courses',
      MAX_ENGAGEMENT_SURVEYS: 'Engagement Surveys'
    };
    return labels[limitType] || limitType.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Current Plan</h3>
            <p className="text-sm text-gray-600">Manage your subscription plan</p>
          </div>
          <button
            onClick={() => setShowPlanSelector(!showPlanSelector)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <FiEdit className="w-4 h-4" />
            <span>Change Plan</span>
          </button>
        </div>

        {currentPlan && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{currentPlan.name}</h4>
                <p className="text-sm text-gray-600">{currentPlan.description || 'No description'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">
                  ${currentPlan.price_per_month}/mo
                </div>
                {currentPlan.price_per_year && (
                  <div className="text-xs text-gray-500">
                    ${currentPlan.price_per_year}/yr
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plan Selector */}
        {showPlanSelector && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Select New Plan</h4>
            <div className="space-y-2">
              {plans.map((plan) => (
                <label
                  key={plan.plan_id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPlanId === plan.plan_id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.plan_id}
                      checked={selectedPlanId === plan.plan_id}
                      onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-600">{plan.description || 'No description'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${plan.price_per_month}/mo</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowPlanSelector(false);
                  setSelectedPlanId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePlanChange}
                disabled={!selectedPlanId || updating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span>Update Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Usage Statistics</h3>
            <p className="text-sm text-gray-600">Current usage vs plan limits</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>

        {usageStats && usageStats.usage && usageStats.usage.length > 0 ? (
          <div className="space-y-4">
            {usageStats.usage.map((usage) => {
              const limit = usageStats.limits.find(l => l.limit_type === usage.limit_type);
              if (!limit) return null;

              const usagePercent = (usage.current_usage / limit.limit_value) * 100;
              const isNearLimit = usagePercent >= 80;
              const isAtLimit = usagePercent >= 100;
              const Icon = getLimitIcon(usage.limit_type);

              return (
                <div key={usage.usage_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-gray-900">
                        {getLimitLabel(usage.limit_type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isAtLimit ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                          <FiXCircle className="w-3 h-3" />
                          <span>Limit Reached</span>
                        </span>
                      ) : isNearLimit ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                          <FiAlertCircle className="w-3 h-3" />
                          <span>Near Limit</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center space-x-1">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>OK</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{usage.current_usage} / {limit.limit_value}</span>
                      <span>{Math.round(usagePercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isAtLimit
                            ? 'bg-red-500'
                            : isNearLimit
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FiBarChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No usage data available</p>
          </div>
        )}

        {/* Near Limit Warnings */}
        {usageStats && usageStats.near_limit_warnings && usageStats.near_limit_warnings.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-2">Near Limit Warnings</h4>
                <ul className="space-y-1">
                  {usageStats.near_limit_warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-800">
                      • {getLimitLabel(warning.limit_type)}: {warning.current_usage} / {warning.limit_value} ({warning.usage_percent}% used)
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowPlanSelector(true)}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <FiTrendingUp className="w-4 h-4" />
                  <span>Upgrade Plan</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Limits */}
      {usageStats && usageStats.limits && usageStats.limits.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Plan Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageStats.limits.map((limit) => {
              const Icon = getLimitIcon(limit.limit_type);
              return (
                <div key={limit.limit_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-900">
                      {getLimitLabel(limit.limit_type)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{limit.limit_value}</div>
                  {limit.description && (
                    <div className="text-sm text-gray-600 mt-1">{limit.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

