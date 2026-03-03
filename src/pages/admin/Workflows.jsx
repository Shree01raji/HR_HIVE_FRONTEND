import React, { useEffect, useState } from 'react';
import { workflowAPI } from '../../services/api';
import { WorkflowStatusCard } from '../../components/workflow/WorkflowStatusCard';
import { WorkflowDiagram } from '../../components/workflow/WorkflowDiagram';
import { WorkflowTimeline } from '../../components/workflow/WorkflowTimeline';
import { Search, Filter, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Workflows Management Page
 * Visualizes all workflows with filtering, search, and detailed views
 */
export const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0
  });

  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get definitions first
      const definitions = await workflowAPI.getDefinitions();
      
      // Get all instances
      const instances = await workflowAPI.getInstances();
      
      // Extract unique resource types
      const types = [...new Set(instances.map(w => w.resource_type).filter(Boolean))];
      setResourceTypes(types);
      
      // Calculate stats
      const stats = {
        total: instances.length,
        pending: instances.filter(w => w.status === 'pending').length,
        completed: instances.filter(w => w.status === 'completed').length,
        rejected: instances.filter(w => w.status === 'rejected').length
      };
      setStatsData(stats);
      
      setWorkflows(instances);
      applyFilters(instances);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError('Failed to fetch workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  const applyFilters = (workflowList) => {
    let filtered = workflowList;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(w =>
        (w.resource_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.resource_id?.toString() || '').includes(searchTerm) ||
        (w.status || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Resource type filter
    if (resourceTypeFilter) {
      filtered = filtered.filter(w => w.resource_type === resourceTypeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    setFilteredWorkflows(filtered);
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    applyFilters(workflows);
  }, [searchTerm, resourceTypeFilter, statusFilter]);

  const handleWorkflowAction = async (instanceId, action, data = {}) => {
    try {
      if (action === 'approve') {
        await workflowAPI.approveStep(instanceId, data);
      } else if (action === 'reject') {
        await workflowAPI.rejectStep(instanceId, data);
      }
      
      // Refresh the list
      fetchWorkflows();
    } catch (err) {
      console.error(`Failed to ${action} workflow:`, err);
      setError(`Failed to ${action} workflow: ${err.message}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Workflow Management</h1>
          <p className="text-gray-600">Visualize and manage all workflows across your organization</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Workflows</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statsData.total}</p>
              </div>
              <div className="text-blue-600 text-4xl opacity-20">📋</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statsData.pending}</p>
              </div>
              <div className="text-yellow-600 text-4xl opacity-20">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statsData.completed}</p>
              </div>
              <div className="text-green-600 text-4xl opacity-20">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statsData.rejected}</p>
              </div>
              <div className="text-red-600 text-4xl opacity-20">❌</div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters & Search
            </h2>
            <button
              onClick={fetchWorkflows}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Resource Type Filter */}
            <select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Resource Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && !workflows.length && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading workflows...</p>
            </div>
          </div>
        )}

        {/* Workflows Grid */}
        {!loading && filteredWorkflows.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Workflows ({filteredWorkflows.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow) => (
                <div key={workflow.instance_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <WorkflowStatusCard
                    workflow={workflow}
                    onClick={() => setExpandedWorkflow(
                      expandedWorkflow?.instance_id === workflow.instance_id ? null : workflow
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Workflow Detail */}
        {expandedWorkflow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {expandedWorkflow.resource_type?.toUpperCase()} Workflow
                  </h2>
                  <p className="text-blue-100 mt-1">ID: {expandedWorkflow.instance_id}</p>
                </div>
                <button
                  onClick={() => setExpandedWorkflow(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Workflow Diagram */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Steps</h3>
                  <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    <WorkflowDiagram
                      steps={expandedWorkflow.steps || []}
                      currentStepIndex={expandedWorkflow.current_step_id}
                    />
                  </div>
                </div>

                {/* Workflow Timeline */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline & Events</h3>
                  <WorkflowTimeline
                    events={expandedWorkflow.events || []}
                    steps={expandedWorkflow.steps || []}
                  />
                </div>

                {/* Workflow Details */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Workflow Information</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {expandedWorkflow.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Resource Type</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {expandedWorkflow.resource_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Resource ID</p>
                        <p className="font-medium text-gray-900">
                          {expandedWorkflow.resource_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Created At</p>
                        <p className="font-medium text-gray-900">
                          {new Date(expandedWorkflow.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Risk Assessment</h4>
                    <div className="space-y-3">
                      {expandedWorkflow.risk_score !== null && (
                        <div>
                          <p className="text-sm text-gray-600">Risk Score</p>
                          <p className="font-medium text-gray-900">
                            {expandedWorkflow.risk_score}
                          </p>
                        </div>
                      )}
                      {expandedWorkflow.risk_level && (
                        <div>
                          <p className="text-sm text-gray-600">Risk Level</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {expandedWorkflow.risk_level}
                          </p>
                        </div>
                      )}
                      {expandedWorkflow.governance_action && (
                        <div>
                          <p className="text-sm text-gray-600">Governance Action</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {expandedWorkflow.governance_action}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setExpandedWorkflow(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredWorkflows.length === 0 && workflows.length > 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600 text-lg">No workflows match your filters.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setResourceTypeFilter('');
                  setStatusFilter('');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && workflows.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600 text-lg">No workflows found.</p>
              <p className="text-gray-500 mt-2">Workflows will appear here when they are created.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsPage;
