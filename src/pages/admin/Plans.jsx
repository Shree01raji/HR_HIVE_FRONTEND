import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiBriefcase,
  FiBookOpen,
  FiHeart,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiBarChart,
  FiTrendingUp,
  FiAlertCircle
} from 'react-icons/fi';
import { subscriptionAPI } from '../../services/api';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchAnalytics();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionAPI.listPlans(true); // Include inactive
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError(err.response?.data?.detail || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await subscriptionAPI.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const handleCreatePlan = async (planData) => {
    try {
      await subscriptionAPI.createPlan(planData);
      await fetchPlans();
      setShowCreateModal(false);
      alert('Plan created successfully!');
    } catch (err) {
      console.error('Failed to create plan:', err);
      alert(err.response?.data?.detail || 'Failed to create plan');
    }
  };

  const handleUpdatePlan = async (planId, planData) => {
    try {
      await subscriptionAPI.updatePlan(planId, planData);
      await fetchPlans();
      setShowEditModal(false);
      setSelectedPlan(null);
      alert('Plan updated successfully!');
    } catch (err) {
      console.error('Failed to update plan:', err);
      alert(err.response?.data?.detail || 'Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }
    try {
      await subscriptionAPI.deletePlan(planId);
      await fetchPlans();
      alert('Plan deleted successfully!');
    } catch (err) {
      console.error('Failed to delete plan:', err);
      alert(err.response?.data?.detail || 'Failed to delete plan');
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
<div className="h-full p-8 space-y-8 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#181c52]">Plan Management</h1>
            <p className="text-gray-600 mt-1">Manage subscription plans and limits for all organizations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPlans}
              className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#1f2466] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Create Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Organizations"
            value={analytics.summary?.total_organizations || 0}
            icon={<FiUsers className="w-5 h-5" />}
            color="from-indigo-500 to-indigo-600"
          />
          <StatCard
            title="Paid Organizations"
            value={analytics.summary?.paid_organizations || 0}
            icon={<FiDollarSign className="w-5 h-5" />}
            color="from-green-500 to-green-600"
          />
          <StatCard
            title="Conversion Rate"
            value={`${analytics.summary?.conversion_rate || 0}%`}
            icon={<FiTrendingUp className="w-5 h-5" />}
            color="from-purple-500 to-purple-600"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${analytics.summary?.mrr?.toFixed(2) || '0.00'}`}
            icon={<FiBarChart className="w-5 h-5" />}
            color="from-blue-500 to-blue-600"
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {plans.map((plan) => (
          <PlanCard
            key={plan.plan_id}
            plan={plan}
            onEdit={() => {
              setSelectedPlan(plan);
              setShowEditModal(true);
            }}
            onDelete={() => handleDeletePlan(plan.plan_id)}
            onManageLimits={() => {
              setSelectedPlan(plan);
              setShowLimitsModal(true);
            }}
          />
        ))}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreatePlan}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSave={(planData) => handleUpdatePlan(selectedPlan.plan_id, planData)}
        />
      )}

      {/* Manage Limits Modal */}
      {showLimitsModal && selectedPlan && (
        <ManageLimitsModal
          plan={selectedPlan}
          onClose={() => {
            setShowLimitsModal(false);
            setSelectedPlan(null);
          }}
          onUpdate={fetchPlans}
        />
      )}
    </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${color} shadow-md`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete, onManageLimits }) {
  const getPlanColor = (planType) => {
    const colors = {
      FREE: 'from-gray-500 to-gray-600',
      BASIC: 'from-blue-700 to-blue-800',
      PRO: 'from-blue-800 to-blue-900',
      ENTERPRISE: 'from-blue-500 to-blue-600'
    };
    return colors[plan.plan_type] || 'from-gray-500 to-gray-600';
  };

  return (
<div className="
  bg-white
  rounded-2xl
  border border-slate-200
  shadow-sm
  hover:shadow-2xl
  hover:-translate-y-1.5
  transition-transform transition-shadow
  duration-300
  ease-[cubic-bezier(.16,1,.3,1)]
  overflow-hidden
  flex flex-col
">
      <div className={`bg-gradient-to-r ${getPlanColor(plan.plan_type)} p-6 text-white`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-bold">{plan.name}</h3>
            <p className="text-white/80 text-sm mt-1">{plan.description || 'No description'}</p>
          </div>
          {!plan.is_active && (
            <span className="px-2 py-1 bg-red-500 rounded-full text-xs font-semibold">
              Inactive
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold">
            ₹{plan.price_per_month}/mo
          </div>
          {plan.price_per_year && (
            <div className="text-sm text-white/80 mt-1">
              ₹{plan.price_per_year}/yr
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
          {plan.features && Array.isArray(plan.features) && plan.features.length > 0 ? (
            <ul className="space-y-1">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-center space-x-2">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No features listed</p>
          )}
        </div>

        <div className="mt-auto flex space-x-2 pt-4 border-t border-slate-200">
          <button
            onClick={onManageLimits}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center space-x-2"
          >
            <FiBarChart className="w-4 h-4" />
            <span>Limits</span>
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePlanModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    plan_type: 'BASIC',
    description: '',
    price_per_month: 0,
    price_per_year: null,
    is_active: true,
    features: []
  });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create New Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.plan_type}
              onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_month}
                onChange={(e) => setFormData({ ...formData, price_per_month: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_year || ''}
                onChange={(e) => setFormData({ ...formData, price_per_year: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Features
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="Add a feature..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {formData.features.map((feature, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  <span>Create Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPlanModal({ plan, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan.name || '',
    description: plan.description || '',
    price_per_month: plan.price_per_month || 0,
    price_per_year: plan.price_per_year || null,
    is_active: plan.is_active !== undefined ? plan.is_active : true,
    features: plan.features || []
  });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Edit Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_month}
                onChange={(e) => setFormData({ ...formData, price_per_month: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yearly Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_year || ''}
                onChange={(e) => setFormData({ ...formData, price_per_year: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Features
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="Add a feature..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {formData.features.map((feature, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageLimitsModal({ plan, onClose, onUpdate }) {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLimits();
  }, [plan.plan_id]);

  const fetchLimits = async () => {
    try {
      setLoading(true);
      const data = await subscriptionAPI.getPlanLimits(plan.plan_id);
      setLimits(data);
    } catch (err) {
      console.error('Failed to fetch limits:', err);
      alert('Failed to load plan limits');
    } finally {
      setLoading(false);
    }
  };

  const updateLimit = async (limitId, limitValue) => {
    try {
      setSaving(true);
      await subscriptionAPI.updatePlanLimit(plan.plan_id, limitId, { limit_value: limitValue });
      await fetchLimits();
      await onUpdate();
    } catch (err) {
      console.error('Failed to update limit:', err);
      alert(err.response?.data?.detail || 'Failed to update limit');
    } finally {
      setSaving(false);
    }
  };

  const limitTypes = [
    { value: 'MAX_EMPLOYEES', label: 'Max Employees', icon: FiUsers },
    { value: 'MAX_PAYROLL_RUNS_PER_MONTH', label: 'Max Payroll Runs/Month', icon: FiDollarSign },
    { value: 'MAX_DOCUMENTS_STORAGE', label: 'Max Documents', icon: FiFileText },
    { value: 'MAX_RECRUITMENT_POSTINGS', label: 'Max Job Postings', icon: FiBriefcase },
    { value: 'MAX_LEARNING_COURSES', label: 'Max Learning Courses', icon: FiBookOpen },
    { value: 'MAX_ENGAGEMENT_SURVEYS', label: 'Max Engagement Surveys', icon: FiHeart }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Limits - {plan.name}</h2>
              <p className="text-gray-600 text-sm mt-1">Set limits for this plan</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {limitTypes.map((limitType) => {
                const existingLimit = limits.find(l => l.limit_type === limitType.value);
                const Icon = limitType.icon;
                return (
                  <LimitRow
                    key={limitType.value}
                    limitType={limitType}
                    Icon={Icon}
                    existingLimit={existingLimit}
                    onUpdate={(value) => {
                      if (existingLimit) {
                        updateLimit(existingLimit.limit_id, value);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LimitRow({ limitType, Icon, existingLimit, onUpdate }) {
  const [value, setValue] = useState(existingLimit?.limit_value || 0);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(parseInt(value));
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="font-semibold text-gray-900">{limitType.label}</h4>
            {existingLimit?.description && (
              <p className="text-sm text-gray-600">{existingLimit.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FiCheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setValue(existingLimit?.limit_value || 0);
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <FiX className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-gray-900">
                {existingLimit ? existingLimit.limit_value : 'Not set'}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <FiEdit className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

