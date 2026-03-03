import React, { useState, useEffect } from 'react';
import { FiX, FiTrendingUp, FiCheckCircle, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { subscriptionAPI } from '../../services/api';

export default function UpgradePrompt({ 
  isOpen, 
  onClose, 
  organizationId,
  limitType,
  currentUsage,
  limitValue,
  errorMessage,
  upgradeInfo
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const plansData = await subscriptionAPI.listPlans();
      setPlans(plansData.filter(p => p.is_active && p.price_per_month > 0));
      
      // Auto-select the recommended plan if available
      if (upgradeInfo && upgradeInfo.next_plan) {
        setSelectedPlan(upgradeInfo.next_plan.plan_id);
      } else if (plansData.length > 0) {
        // Select the cheapest paid plan
        const paidPlans = plansData.filter(p => p.is_active && p.price_per_month > 0);
        if (paidPlans.length > 0) {
          setSelectedPlan(paidPlans[0].plan_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || !organizationId) return;
    
    try {
      setLoading(true);
      // For now, just assign the plan (payment integration can be added later)
      await subscriptionAPI.assignPlan(organizationId, selectedPlan);
      alert('Plan upgraded successfully!');
      onClose();
      window.location.reload(); // Refresh to show new limits
    } catch (err) {
      console.error('Failed to upgrade plan:', err);
      alert(err.response?.data?.detail || 'Failed to upgrade plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getLimitLabel = (limitType) => {
    const labels = {
      MAX_EMPLOYEES: 'employees',
      MAX_PAYROLL_RUNS_PER_MONTH: 'payroll runs per month',
      MAX_DOCUMENTS_STORAGE: 'documents',
      MAX_RECRUITMENT_POSTINGS: 'job postings',
      MAX_LEARNING_COURSES: 'learning courses',
      MAX_ENGAGEMENT_SURVEYS: 'engagement surveys'
    };
    return labels[limitType] || limitType.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiAlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Plan Limit Reached</h2>
                <p className="text-sm text-gray-600">Upgrade to continue using this feature</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">{errorMessage}</p>
                <p className="text-sm text-red-700 mt-1">
                  Current usage: {currentUsage} / {limitValue} {getLimitLabel(limitType)}
                </p>
              </div>
            </div>
          </div>

          {/* Upgrade Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
            <div className="space-y-3">
              {plans.map((plan) => (
                <label
                  key={plan.plan_id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPlan === plan.plan_id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.plan_id}
                      checked={selectedPlan === plan.plan_id}
                      onChange={(e) => setSelectedPlan(parseInt(e.target.value))}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-600">{plan.description || 'No description'}</div>
                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {plan.features.slice(0, 3).map((feature, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">₹{plan.price_per_month}/mo</div>
                    {plan.price_per_year && (
                      <div className="text-xs text-gray-500">
                        ₹{plan.price_per_year}/yr
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2">Benefits of Upgrading:</h4>
            <ul className="space-y-1 text-sm text-indigo-800">
              <li className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4" />
                <span>Higher limits for all features</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4" />
                <span>Advanced features and modules</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4" />
                <span>No usage restrictions</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={!selectedPlan || loading}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Upgrading...</span>
                </>
              ) : (
                <>
                  <FiTrendingUp className="w-4 h-4" />
                  <span>Upgrade Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

