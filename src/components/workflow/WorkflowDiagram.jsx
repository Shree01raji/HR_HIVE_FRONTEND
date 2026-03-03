import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, ChevronRight } from 'lucide-react';

/**
 * WorkflowDiagram Component
 * Visualizes workflow steps and their status in a horizontal flow diagram
 */
export const WorkflowDiagram = ({ steps = [], currentStepIndex = 0, compact = false }) => {
  const getStepStatus = (step, index) => {
    if (!step) return 'pending';
    if (step.status === 'completed' || step.approved_at) return 'completed';
    if (step.status === 'rejected' || step.rejection_reason) return 'rejected';
    if (step.status === 'in_progress' || (index === currentStepIndex)) return 'in_progress';
    return 'pending';
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No workflow steps available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${compact ? 'gap-2' : 'gap-4'} flex overflow-x-auto py-4`}>
      {steps.map((step, index) => {
        const status = getStepStatus(step, index);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.instance_step_id || index} className="flex items-center flex-shrink-0">
            {/* Step Box */}
            <div
              className={`
                border-2 rounded-lg p-3 min-w-max
                transition-all duration-200 hover:shadow-md
                ${getStepColor(status)}
              `}
            >
              <div className="flex items-center gap-2">
                {getStepIcon(status)}
                <div className={`${compact ? 'hidden' : ''}`}>
                  <p className="font-medium text-sm text-gray-900">
                    {step.name || `Step ${index + 1}`}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(status)}`}>
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {!compact && step.role_name && (
                <p className="text-xs text-gray-600 mt-2">Role: {step.role_name}</p>
              )}
              {!compact && step.due_at && (
                <p className="text-xs text-gray-600">
                  Due: {new Date(step.due_at).toLocaleDateString()}
                </p>
              )}
              {!compact && step.approved_at && (
                <p className="text-xs text-green-600">
                  Approved: {new Date(step.approved_at).toLocaleDateString()}
                </p>
              )}
              {!compact && step.rejection_reason && (
                <p className="text-xs text-red-600 mt-1">
                  Reason: {step.rejection_reason}
                </p>
              )}
            </div>

            {/* Connector Arrow - Only if not last */}
            {!isLast && (
              <div className={`flex-shrink-0 ${compact ? 'mx-1' : 'mx-3'}`}>
                <ChevronRight className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-gray-400`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowDiagram;
