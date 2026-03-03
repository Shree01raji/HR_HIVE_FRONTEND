import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, TrendingUp } from 'lucide-react';

/**
 * WorkflowStatusCard Component
 * Shows summary statistics and status information for a workflow instance
 */
export const WorkflowStatusCard = ({ workflow, onClick }) => {
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-600" />;
      default:
        return <AlertCircle className="w-8 h-8 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getProgress = () => {
    if (!workflow.steps || workflow.steps.length === 0) return 0;
    const completedSteps = workflow.steps.filter(s => s.status === 'completed' || s.approved_at).length;
    return Math.round((completedSteps / workflow.steps.length) * 100);
  };

  const progress = getProgress();
  const status = workflow.status || 'pending';
  const resourceType = workflow.resource_type || 'Unknown';
  const resourceId = workflow.resource_id || 'N/A';
  const createdDate = new Date(workflow.created_at).toLocaleDateString();

  return (
    <div
      onClick={onClick}
      className={`
        border-2 rounded-lg p-6 cursor-pointer transform transition-all duration-200
        hover:shadow-lg hover:scale-105 ${getStatusColor(status)}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(status)}
            <h3 className="text-lg font-semibold text-gray-900">
              {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Workflow
            </h3>
          </div>
          <p className="text-sm text-gray-600">ID: {resourceId}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusBadgeColor(status)}`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">Progress</span>
          <span className="text-xs font-bold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {workflow.steps?.length || 0}
          </p>
          <p className="text-xs text-gray-600">Total Steps</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {workflow.steps?.filter(s => s.status === 'completed' || s.approved_at).length || 0}
          </p>
          <p className="text-xs text-gray-600">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {workflow.steps?.filter(s => s.status === 'pending').length || 0}
          </p>
          <p className="text-xs text-gray-600">Pending</p>
        </div>
      </div>

      {/* Risk Level (if applicable) */}
      {workflow.risk_level && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-white bg-opacity-60 rounded">
          <TrendingUp className="w-4 h-4 text-orange-600" />
          <span className="text-xs text-gray-700">
            Risk Level: <strong>{workflow.risk_level.replace('_', ' ').toUpperCase()}</strong>
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-600 border-t border-gray-200 pt-3">
        <p>Created: {createdDate}</p>
        {workflow.completed_at && (
          <p>Completed: {new Date(workflow.completed_at).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
};

export default WorkflowStatusCard;
