import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBriefcase, 
  FiPlus, 
  FiSearch, 
  FiEdit, 
  FiEye, 
  FiTrash2, 
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiActivity,
  FiCalendar,
  FiUsers,
  FiGlobe,
  FiMail,
  FiPhone,
  FiMapPin,
  FiFilter,
  FiDownload,
  FiMoreVertical,
  FiStar,
  FiToggleLeft,
  FiToggleRight,
  FiSettings
} from 'react-icons/fi';
import { organizationAPI, subscriptionAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all, active, inactive
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [healthStatus, setHealthStatus] = useState({});
  const [databaseStats, setDatabaseStats] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationAPI.listAllAdmin(0, 1000, true);
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err.response?.data?.detail || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (slug) => {
    try {
      const health = await organizationAPI.getHealth(slug);
      setHealthStatus(prev => ({
        ...prev,
        [slug]: health
      }));
    } catch (err) {
      console.error('Failed to check health:', err);
      setHealthStatus(prev => ({
        ...prev,
        [slug]: { is_healthy: false, error: 'Failed to check health' }
      }));
    }
  };

  const fetchDatabaseStats = async (slug) => {
    try {
      const stats = await organizationAPI.getDatabaseStats(slug);
      setDatabaseStats(prev => ({
        ...prev,
        [slug]: stats
      }));
    } catch (err) {
      console.error('Failed to fetch database stats:', err);
      setDatabaseStats(prev => ({
        ...prev,
        [slug]: { error: 'Failed to load database statistics' }
      }));
    }
  };

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleView = (org) => {
    setSelectedOrg(org);
    setShowDetailModal(true);
    checkHealth(org.slug);
    fetchDatabaseStats(org.slug);
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setShowEditModal(true);
  };

  const handleDeactivate = async (org) => {
    if (!window.confirm(`Are you sure you want to deactivate "${org.name}"? This action can be reversed.`)) {
      return;
    }
    try {
      await organizationAPI.update(org.slug, { is_active: false });
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to deactivate organization:', err);
      alert('Failed to deactivate organization. Please try again.');
    }
  };

  const handleActivate = async (org) => {
    try {
      await organizationAPI.update(org.slug, { is_active: true });
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to activate organization:', err);
      alert('Failed to activate organization. Please try again.');
    }
  };

  const handleUpgrade = async (org) => {
    if (!window.confirm(`Upgrade "${org.name}" from trial to paid account?`)) {
      return;
    }
    try {
      await organizationAPI.upgrade(org.slug);
      alert('Organization upgraded successfully!');
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to upgrade organization:', err);
      alert(err.response?.data?.detail || 'Failed to upgrade organization. Please try again.');
    }
  };

  const handleDowngrade = async (org) => {
    const trialDays = window.prompt(`Downgrade "${org.name}" to trial account.\nEnter number of trial days (1-365):`, '30');
    if (!trialDays || isNaN(trialDays) || parseInt(trialDays) < 1 || parseInt(trialDays) > 365) {
      return;
    }
    try {
      await organizationAPI.downgrade(org.slug, parseInt(trialDays));
      alert('Organization downgraded to trial successfully!');
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to downgrade organization:', err);
      alert(err.response?.data?.detail || 'Failed to downgrade organization. Please try again.');
    }
  };

  const handleDelete = async (org) => {
    // Strong warning for permanent deletion
    const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `You are about to PERMANENTLY DELETE:\n` +
      `• Organization: "${org.name}"\n` +
      `• Database: ${org.database_name}\n` +
      `• ALL employees, data, and records\n\n` +
      `THIS ACTION CANNOT BE UNDONE!\n\n` +
      `Type "${org.name}" to confirm deletion:`;
    
    const confirmation = window.prompt(confirmMessage);
    
    if (confirmation !== org.name) {
      if (confirmation !== null) {
        alert('Deletion cancelled. Organization name did not match.');
      }
      return;
    }
    
    // Final confirmation
    const finalConfirm = window.confirm(
      `FINAL CONFIRMATION\n\n` +
      `Are you absolutely sure you want to PERMANENTLY DELETE "${org.name}"?\n\n` +
      `This will delete:\n` +
      `• The organization record\n` +
      `• The entire database (${org.database_name})\n` +
      `• ALL data including employees, payroll, documents, etc.\n\n` +
      `THIS CANNOT BE UNDONE!`
    );
    
    if (!finalConfirm) {
      return;
    }
    
    try {
      await organizationAPI.delete(org.slug);
      alert(`Organization "${org.name}" has been permanently deleted.`);
      await fetchOrganizations();
    } catch (err) {
      console.error('Failed to delete organization:', err);
      alert(err.response?.data?.detail || 'Failed to delete organization. Please try again.');
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && org.is_active) ||
      (filterActive === 'inactive' && !org.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (loading && organizations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto">
      {/* Action Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchOrganizations}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#1f2466] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Create Organization</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name, slug, industry, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterActive('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filterActive === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterActive('active')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-1 ${
                filterActive === 'active'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiCheckCircle className="w-4 h-4" />
              <span>Active</span>
            </button>
            <button
              onClick={() => setFilterActive('inactive')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-1 ${
                filterActive === 'inactive'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiXCircle className="w-4 h-4" />
              <span>Inactive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Organizations"
          value={organizations.length}
          icon={<FiBriefcase className="w-5 h-5" />}
          color="from-blue-800 to-blue-800"
        />
        <StatCard
          title="Active"
          value={organizations.filter(o => o.is_active).length}
          icon={<FiCheckCircle className="w-5 h-5" />}
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Inactive"
          value={organizations.filter(o => !o.is_active).length}
          icon={<FiXCircle className="w-5 h-5" />}
          color="from-red-500 to-red-600"
        />
        <StatCard
          title="Filtered Results"
          value={filteredOrganizations.length}
          icon={<FiFilter className="w-5 h-5" />}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Health
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FiBriefcase className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-gray-600 font-medium">No organizations found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {searchTerm || filterActive !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'Create your first organization to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <OrganizationRow
                    key={org.organization_id}
                    org={org}
                    onView={() => handleView(org)}
                    onEdit={() => handleEdit(org)}
                    onDelete={() => handleDeactivate(org)}
                    onActivate={() => handleActivate(org)}
                    onCheckHealth={() => checkHealth(org.slug)}
                    healthStatus={healthStatus[org.slug]}
                    onUpgrade={() => handleUpgrade(org)}
                    onDowngrade={() => handleDowngrade(org)}
                    onDeletePermanent={() => handleDelete(org)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrganizations();
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrg && (
        <OrganizationDetailModal
          organization={selectedOrg}
          healthStatus={healthStatus[selectedOrg.slug]}
          databaseStats={databaseStats[selectedOrg.slug]}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrg(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedOrg);
          }}
          onCheckHealth={() => {
            checkHealth(selectedOrg.slug);
            fetchDatabaseStats(selectedOrg.slug);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrg && (
        <EditOrganizationModal
          organization={selectedOrg}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrg(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedOrg(null);
            fetchOrganizations();
          }}
        />
      )}
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

function OrganizationRow({ org, onView, onEdit, onDelete, onActivate, onCheckHealth, healthStatus, onUpgrade, onDowngrade, onDeletePermanent }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);
  const actionsButtonRef = useRef(null);

  // Close actions when clicking outside or pressing Escape
  useEffect(() => {
    if (!showActions) return;
    const onDocClick = (e) => {
      if (!actionsRef.current) return;
      if (actionsRef.current.contains(e.target) || (actionsButtonRef.current && actionsButtonRef.current.contains(e.target))) return;
      setShowActions(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setShowActions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showActions]);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-[#ffbd59] flex items-center justify-center mr-3">
            <FiBriefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{org.name}</div>
            <div className="text-xs text-gray-500">/{org.slug}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {org.industry && (
            <div className="flex items-center space-x-1 mb-1">
              <FiBriefcase className="w-3 h-3 text-gray-400" />
              <span>{org.industry}</span>
            </div>
          )}
          {org.company_size && (
            <div className="flex items-center space-x-1 mb-1">
              <FiUsers className="w-3 h-3 text-gray-400" />
              <span>{org.company_size}</span>
            </div>
          )}
          {org.email && (
            <div className="flex items-center space-x-1">
              <FiMail className="w-3 h-3 text-gray-400" />
              <span className="text-xs">{org.email}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            org.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {org.is_active ? (
            <>
              <FiCheckCircle className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <FiXCircle className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
        </span>
        {org.is_trial && (
          <div className="mt-1 text-xs text-yellow-600">
            Trial
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {healthStatus ? (
          <button
            onClick={onCheckHealth}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              healthStatus.is_healthy
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            <FiActivity className="w-3 h-3 mr-1" />
            {healthStatus.is_healthy ? 'Healthy' : 'Unhealthy'}
          </button>
        ) : (
          <button
            onClick={onCheckHealth}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <FiActivity className="w-3 h-3 mr-1" />
            Check
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="relative inline-block">
          <button
            ref={actionsButtonRef}
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiMoreVertical className="w-5 h-5" />
          </button>
          {showActions && (
            <div ref={actionsRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                <button
                  onClick={() => {
                    setShowActions(false);
                    onView();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiEye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => {
                    setShowActions(false);
                    onEdit();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiEdit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {org.is_active ? (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <FiXCircle className="w-4 h-4" />
                    <span>Deactivate</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onActivate();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Activate</span>
                  </button>
                )}
                <div className="border-t border-gray-200 my-1"></div>
                {org.is_trial ? (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onUpgrade && onUpgrade();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center space-x-2"
                  >
                    <FiStar className="w-4 h-4" />
                    <span>Upgrade to Paid</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onDowngrade && onDowngrade();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 flex items-center space-x-2"
                  >
                    <FiCalendar className="w-4 h-4" />
                    <span>Downgrade to Trial</span>
                  </button>
                )}
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => {
                    setShowActions(false);
                    onDeletePermanent && onDeletePermanent();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2 font-semibold"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </button>
              </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// Create Organization Modal
function CreateOrganizationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    company_size: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    plan_id: null,
    features_config: {
      enable_dashboard: false,
      enable_settings: false,
      enable_finance: false,
      enable_ai_agents: false,
      enable_learning: false,
      enable_engagement: false,
      enable_performance: false,
      enable_recruitment: false,
      enable_timesheet: false,
      enable_agent_monitoring: false,
      enable_analytics: false,
      enable_chat_monitor: false,
      enable_compliance: false,
      enable_documents: false,
      enable_employees: false,  // Can be enabled/disabled
      enable_onboarding: false,
      enable_leaves: false,
      enable_payroll: false,
      enable_policies: false,
      enable_qualified_applications: false,
      enable_question_bank: false,
      enable_test_monitoring: false,
      enable_task_management: false
    }
  });
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const plansData = await subscriptionAPI.listPlans(true); // Include inactive
      setPlans(plansData || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        setError('Organization name is required');
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      // CRITICAL: Send ALL features (both enabled and disabled) to backend
      // This ensures disabled features are saved as false
      console.log('📤 [Create Organization] Sending features_config to backend:', formData.features_config);
      console.log('📤 [Create Organization] Features count:', Object.keys(formData.features_config).length);
      console.log('📤 [Create Organization] Disabled features:', Object.entries(formData.features_config).filter(([k, v]) => v === false).map(([k]) => k));
      
      const orgData = {
        ...formData,
        features_config: formData.features_config // Send ALL features (enabled and disabled) to backend
      };
      
      const organization = await organizationAPI.create(orgData);
      console.log('✅ [Create Organization] Successfully created organization with features_config');
      const selectedPlan = plans.find(p => p.plan_id === formData.plan_id);
      const isPaidPlan = selectedPlan && selectedPlan.price_per_month > 0;
      
      let message = `✅ Organization "${organization.name}" created successfully!\n\n📧 An email with the Company Code has been sent to ${formData.email}.`;
      if (isPaidPlan) {
        message += `\n\n💳 A payment link has also been sent to complete payment for the ${selectedPlan.name} plan (₹${selectedPlan.price_per_month}/mo).`;
      }
      alert(message);
      onSuccess();
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create New Organization</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiXCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Acme Corporation"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your organization"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={formData.company_size}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Street address, City, State, ZIP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Plan
            </label>
            {loadingPlans ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <span className="text-gray-500">Loading plans...</span>
              </div>
            ) : (
              <select
                value={formData.plan_id || ''}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Plan (Default: Free)</option>
                {plans.filter(p => p.is_active).map((plan) => (
                  <option key={plan.plan_id} value={plan.plan_id}>
                    {plan.name} - ₹{plan.price_per_month}/mo {plan.price_per_month > 0 ? '(Paid)' : '(Free)'}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.plan_id ? (
                (() => {
                  const selectedPlan = plans.find(p => p.plan_id === parseInt(formData.plan_id));
                  return selectedPlan && selectedPlan.price_per_month > 0
                    ? 'A payment link will be sent to the organization email for paid plans.'
                    : 'Free plan will be assigned automatically.';
                })()
              ) : (
                'If no plan is selected, Free plan will be assigned by default.'
              )}
            </p>
          </div>

          {/* Feature Toggles Section - Super Admin can toggle any features */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <button
              type="button"
              onClick={() => setShowFeatures(!showFeatures)}
              className="flex items-center justify-between w-full mb-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FiSettings className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Feature Configuration</h3>
              </div>
              <span className="text-sm text-gray-600">
                {showFeatures ? 'Hide' : 'Show'} ({Object.values(formData.features_config).filter(v => v).length} enabled)
              </span>
            </button>
            
            {showFeatures && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  As a super admin, you can enable/disable any features regardless of the selected plan.
                </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
              {Object.entries(formData.features_config).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                  <label className="flex-1 cursor-pointer">
                    <span className="font-medium text-gray-900 capitalize text-sm">
                      {key.replace(/_/g, ' ').replace(/enable /i, '')}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        features_config: {
                          ...formData.features_config,
                          [key]: !enabled
                        }
                      });
                    }}
                    className={`ml-3 flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
                      enabled
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {enabled ? (
                      <>
                        <FiToggleRight className="w-4 h-4" />
                        <span className="text-xs">Enabled</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-4 h-4" />
                        <span className="text-xs">Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
                <p className="mt-2 text-xs text-gray-500">
                  💡 Tip: Features can also be changed later by the organization admin in their Settings page.
                </p>
              </>
            )}
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
              className="px-6 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#1f2466] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiPlus className="w-5 h-5" />
                  <span>Create Organization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Organization Detail Modal
function OrganizationDetailModal({ organization, healthStatus, databaseStats, onClose, onEdit, onCheckHealth }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiXCircle className="w-6 h-6" />
            </button>
          </div>
          
        </div>

        <div className="p-6 space-y-6">
          <>
          {/* Status Badge */}
          <div className="flex items-center space-x-4">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                organization.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {organization.is_active ? (
                <>
                  <FiCheckCircle className="w-4 h-4 mr-2" />
                  Active
                </>
              ) : (
                <>
                  <FiXCircle className="w-4 h-4 mr-2" />
                  Inactive
                </>
              )}
            </span>
            {organization.is_trial && (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                Trial Account
              </span>
            )}
            <button
              onClick={onEdit}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FiEdit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
              <div className="space-y-3">
                <InfoRow label="Slug" value={organization.slug} />
                <InfoRow label="Industry" value={organization.industry || 'N/A'} />
                <InfoRow label="Company Size" value={organization.company_size || 'N/A'} />
                <InfoRow label="Database" value={organization.database_name || 'N/A'} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
              <div className="space-y-3">
                <InfoRow icon={<FiMail className="w-4 h-4" />} label="Email" value={organization.email || 'N/A'} />
                <InfoRow icon={<FiPhone className="w-4 h-4" />} label="Phone" value={organization.phone || 'N/A'} />
                <InfoRow icon={<FiGlobe className="w-4 h-4" />} label="Website" value={organization.website || 'N/A'} />
                <InfoRow icon={<FiMapPin className="w-4 h-4" />} label="Address" value={organization.address || 'N/A'} />
              </div>
            </div>
          </div>

          {/* Description */}
          {organization.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600">{organization.description}</p>
            </div>
          )}

          {/* Database Health & Statistics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Database Health & Statistics</h3>
              <button
                onClick={onCheckHealth}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center space-x-1"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
            
            {/* Health Status */}
            {healthStatus ? (
              <div className={`p-4 rounded-lg ${
                healthStatus.is_healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <FiActivity className={`w-5 h-5 ${healthStatus.is_healthy ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`font-semibold ${healthStatus.is_healthy ? 'text-green-800' : 'text-red-800'}`}>
                    {healthStatus.is_healthy ? 'Database is healthy' : 'Database health check failed'}
                  </span>
                </div>
                {healthStatus.error && (
                  <p className="text-sm text-red-600 mt-2">{healthStatus.error}</p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-gray-600 text-sm">Click "Refresh" to check database health</p>
              </div>
            )}

            {/* Database Statistics */}
            {databaseStats && databaseStats.statistics ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <FiActivity className="w-4 h-4" />
                  <span>Database Activity & Statistics</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatItem label="Total Employees" value={databaseStats.statistics.total_employees || 0} icon={<FiUsers className="w-4 h-4" />} />
                  <StatItem label="Total Users" value={databaseStats.statistics.total_users || 0} icon={<FiUsers className="w-4 h-4" />} />
                  <StatItem label="Leave Records" value={databaseStats.statistics.total_leave_records || 0} icon={<FiCalendar className="w-4 h-4" />} />
                  <StatItem label="Timesheet Entries" value={databaseStats.statistics.total_timesheet_entries || 0} icon={<FiActivity className="w-4 h-4" />} />
                  <StatItem label="Documents" value={databaseStats.statistics.total_documents || 0} icon={<FiBriefcase className="w-4 h-4" />} />
                  <StatItem label="Payroll Records" value={databaseStats.statistics.total_payroll_records || 0} icon={<FiBriefcase className="w-4 h-4" />} />
                </div>
                {databaseStats.statistics.database_size && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Database Size:</span>
                      <span className="text-sm font-semibold text-gray-900">{databaseStats.statistics.database_size}</span>
                    </div>
                    {databaseStats.database_name && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-700">Database Name:</span>
                        <span className="text-sm font-mono text-gray-900">{databaseStats.database_name}</span>
                      </div>
                    )}
                  </div>
                )}
                {databaseStats.last_checked && (
                  <div className="mt-2 text-xs text-gray-500">
                    Last checked: {new Date(databaseStats.last_checked).toLocaleString()}
                  </div>
                )}
              </div>
            ) : databaseStats && databaseStats.error ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{databaseStats.error}</p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-gray-600 text-sm">Click "Refresh" to load database statistics</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
            <InfoRow icon={<FiCalendar className="w-4 h-4" />} label="Created" value={organization.created_at ? new Date(organization.created_at).toLocaleString() : 'N/A'} />
            <InfoRow icon={<FiCalendar className="w-4 h-4" />} label="Last Updated" value={organization.updated_at ? new Date(organization.updated_at).toLocaleString() : 'N/A'} />
            {organization.trial_ends_at && (
              <InfoRow icon={<FiCalendar className="w-4 h-4" />} label="Trial Ends" value={new Date(organization.trial_ends_at).toLocaleString()} />
            )}
          </div>
          </>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start space-x-2">
      {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center space-x-2 mb-1">
        {icon && <div className="text-indigo-600">{icon}</div>}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

// Edit Organization Modal
function EditOrganizationModal({ organization, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: organization.name || '',
    description: organization.description || '',
    industry: organization.industry || '',
    company_size: organization.company_size || '',
    website: organization.website || '',
    email: organization.email || '',
    phone: organization.phone || '',
    address: organization.address || '',
    is_active: organization.is_active !== undefined ? organization.is_active : true
  });
  const [featuresConfig, setFeaturesConfig] = useState({
    enable_ai_agents: false,
    enable_learning: false,
    enable_engagement: false,
    enable_performance: false,
    enable_recruitment: false,
    enable_timesheet: false,
    enable_agent_monitoring: false,
    enable_analytics: false,
    enable_chat_monitor: false,
    enable_compliance: false,
    enable_documents: false,
    enable_employees: true,  // Always enabled by default
    enable_onboarding: false,
    enable_leaves: false,
    enable_payroll: false,
    enable_policies: false,
    enable_qualified_applications: false,
    enable_question_bank: false,
    enable_test_monitoring: false,
    enable_task_management: false
  });
  const [loading, setLoading] = useState(false);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [error, setError] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    fetchAdminSettings();
  }, []);

  const fetchAdminSettings = async () => {
    try {
      setLoadingFeatures(true);
      const settings = await organizationAPI.getAdminSettings(organization.slug);
      if (settings && settings.features_config) {
        const config = settings.features_config;
        // CRITICAL FIX: If backend has a config, missing keys are disabled (false)
        // Only use true if the key exists AND is explicitly true
        const hasBackendConfig = config && Object.keys(config).length > 0;
        setFeaturesConfig({
          enable_dashboard: hasBackendConfig ? (config.enable_dashboard === true) : false,
          enable_settings: hasBackendConfig ? (config.enable_settings === true) : false,
          enable_finance: hasBackendConfig ? (config.enable_finance === true) : false,
          enable_ai_agents: hasBackendConfig ? (config.enable_ai_agents === true) : false,
          enable_learning: hasBackendConfig ? (config.enable_learning === true) : false,
          enable_engagement: hasBackendConfig ? (config.enable_engagement === true) : false,
          enable_performance: hasBackendConfig ? (config.enable_performance === true) : false,
          enable_recruitment: hasBackendConfig ? (config.enable_recruitment === true) : false,
          enable_timesheet: hasBackendConfig ? (config.enable_timesheet === true) : false,
          enable_agent_monitoring: hasBackendConfig ? (config.enable_agent_monitoring === true) : false,
          enable_analytics: hasBackendConfig ? (config.enable_analytics === true) : false,
          enable_chat_monitor: hasBackendConfig ? (config.enable_chat_monitor === true) : false,
          enable_compliance: hasBackendConfig ? (config.enable_compliance === true) : false,
          enable_documents: hasBackendConfig ? (config.enable_documents === true) : false,
          enable_employees: hasBackendConfig ? (config.enable_employees === true) : false,
          enable_onboarding: hasBackendConfig ? (config.enable_onboarding === true) : false,
          enable_leaves: hasBackendConfig ? (config.enable_leaves === true) : false,
          enable_payroll: hasBackendConfig ? (config.enable_payroll === true) : false,
          enable_policies: hasBackendConfig ? (config.enable_policies === true) : false,
          enable_qualified_applications: hasBackendConfig ? (config.enable_qualified_applications === true) : false,
          enable_question_bank: hasBackendConfig ? (config.enable_question_bank === true) : false,
          enable_test_monitoring: hasBackendConfig ? (config.enable_test_monitoring === true) : false,
          enable_task_management: hasBackendConfig ? (config.enable_task_management === true) : false
        });
        console.log('📋 [Organizations] Loaded features_config:', config);
        console.log('📋 [Organizations] Processed featuresConfig:', featuresConfig);
      }
    } catch (err) {
      console.error('Failed to fetch admin settings:', err);
      // Continue with default features if fetch fails
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // CRITICAL: Send ALL features (both enabled and disabled) to backend
      // This ensures disabled features are saved as false
      console.log('📤 [Organizations] Sending features_config to backend:', featuresConfig);
      console.log('📤 [Organizations] Features count:', Object.keys(featuresConfig).length);
      console.log('📤 [Organizations] Disabled features:', Object.entries(featuresConfig).filter(([k, v]) => v === false).map(([k]) => k));
      
      const updateData = {
        ...formData,
        features_config: featuresConfig  // This includes all features with true/false values
      };
      await organizationAPI.update(organization.slug, updateData);
      console.log('✅ [Organizations] Successfully updated organization features');
      onSuccess();
    } catch (err) {
      console.error('Failed to update organization:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Edit Organization</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiXCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={formData.company_size}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          {/* Feature Toggles Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <button
              type="button"
              onClick={() => setShowFeatures(!showFeatures)}
              className="flex items-center justify-between w-full mb-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FiSettings className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Feature Configuration</h3>
              </div>
              {loadingFeatures ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              ) : (
                <span className="text-sm text-gray-600">
                  {showFeatures ? 'Hide' : 'Show'} ({Object.values(featuresConfig).filter(v => v).length} enabled)
                </span>
              )}
            </button>
            
            {showFeatures && !loadingFeatures && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  As a super admin, you can enable/disable any features for this organization.
                </p>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {Object.entries(featuresConfig).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <label className="flex-1 cursor-pointer">
                        <span className="font-medium text-gray-900 capitalize text-sm">
                          {key.replace(/_/g, ' ').replace(/enable /i, '')}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFeaturesConfig({
                            ...featuresConfig,
                            [key]: !enabled
                          });
                        }}
                        className={`ml-3 flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
                          enabled
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {enabled ? (
                          <>
                            <FiToggleRight className="w-4 h-4" />
                            <span className="text-xs">Enabled</span>
                          </>
                        ) : (
                          <>
                            <FiToggleLeft className="w-4 h-4" />
                            <span className="text-xs">Disabled</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                  <FiCheckCircle className="w-5 h-5" />
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

