import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, MessageCircle } from 'lucide-react';

/**
 * WorkflowTimeline Component
 * Shows workflow events and history in a timeline format
 */
export const WorkflowTimeline = ({ events = [], steps = [] }) => {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'started':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'approved':
        return 'bg-green-50 border-l-4 border-green-600';
      case 'rejected':
        return 'bg-red-50 border-l-4 border-red-600';
      case 'pending':
        return 'bg-yellow-50 border-l-4 border-yellow-600';
      case 'started':
        return 'bg-blue-50 border-l-4 border-blue-600';
      case 'comment':
        return 'bg-purple-50 border-l-4 border-purple-600';
      default:
        return 'bg-gray-50 border-l-4 border-gray-600';
    }
  };

  // Combine events and steps into a timeline
  const timelineItems = [
    ...events.map(e => ({
      ...e,
      timestamp: e.created_at,
      type: 'event'
    })),
    ...steps.map(s => ({
      ...s,
      timestamp: s.approved_at || s.created_at,
      type: 'step'
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (timelineItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineItems.map((item, index) => (
        <div key={`${item.type}-${item.id || index}`} className="flex gap-4">
          {/* Timeline Dot and Line */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
              {getEventIcon(item.event_type || item.status)}
            </div>
            {index !== timelineItems.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 my-2"></div>
            )}
          </div>

          {/* Event Content */}
          <div className={`flex-1 p-4 rounded-lg ${getEventColor(item.event_type || item.status)}`}>
            {item.type === 'event' ? (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {item.event_type?.replace('_', ' ')}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{item.message}</p>
                {item.actor_user_id && (
                  <p className="text-xs text-gray-600 mt-2">
                    Actor ID: {item.actor_user_id}
                  </p>
                )}
                {item.event_metadata && Object.keys(item.event_metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-900">
                      View Details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto">
                      {JSON.stringify(item.event_metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {item.name || `Step ${item.step_order}`}
                    </h4>
                    <p className="text-xs text-gray-600">{item.role_name || item.approver_type}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-white bg-opacity-60">
                  Status: {item.status?.replace('_', ' ').toUpperCase()}
                </span>
                {item.rejection_reason && (
                  <p className="text-sm text-red-700 mt-2">
                    Reason: {item.rejection_reason}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkflowTimeline;
