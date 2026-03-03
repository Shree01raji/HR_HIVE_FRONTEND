import React from 'react';
import { FiAlertTriangle, FiX, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function NearLimitWarning({ warnings, onDismiss, onUpgrade }) {
  if (!warnings || warnings.length === 0) return null;

  const getLimitLabel = (limitType) => {
    const labels = {
      MAX_EMPLOYEES: 'Employees',
      MAX_PAYROLL_RUNS_PER_MONTH: 'Payroll Runs',
      MAX_DOCUMENTS_STORAGE: 'Documents',
      MAX_RECRUITMENT_POSTINGS: 'Job Postings',
      MAX_LEARNING_COURSES: 'Learning Courses',
      MAX_ENGAGEMENT_SURVEYS: 'Engagement Surveys'
    };
    return labels[limitType] || limitType.replace(/_/g, ' ');
  };

  const getSeverity = (warning) => {
    if (warning.is_at_limit || warning.usage_percent >= 100) {
      return 'critical'; // Red
    } else if (warning.usage_percent >= 90) {
      return 'high'; // Orange
    }
    return 'medium'; // Yellow
  };

  const getColorClasses = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {warnings.map((warning, index) => {
        const severity = getSeverity(warning);
        const colorClasses = getColorClasses(severity);
        
        return (
          <div
            key={`${warning.limit_type}-${index}`}
            className={`border-l-4 rounded-lg p-4 ${colorClasses} shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <FiAlertTriangle className={`w-5 h-5 mt-0.5 ${
                  severity === 'critical' ? 'text-red-600' :
                  severity === 'high' ? 'text-orange-600' :
                  'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold">
                      {warning.is_at_limit || warning.usage_percent >= 100
                        ? 'Limit Reached'
                        : 'Near Limit Warning'}
                    </h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/50">
                      {warning.usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm mb-2">
                    You've used <strong>{warning.current_usage}</strong> of <strong>{warning.limit_value}</strong>{' '}
                    {getLimitLabel(warning.limit_type)} in your current plan.
                  </p>
                  {warning.usage_percent >= 100 ? (
                    <p className="text-sm font-medium">
                      Upgrade your plan to continue using this feature.
                    </p>
                  ) : (
                    <p className="text-sm">
                      You're approaching your limit. Consider upgrading to avoid interruptions.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {onUpgrade && (
                  <button
                    onClick={() => onUpgrade(warning)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                  >
                    <FiTrendingUp className="w-4 h-4" />
                    <span>Upgrade</span>
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(warning)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Dismiss warning"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

