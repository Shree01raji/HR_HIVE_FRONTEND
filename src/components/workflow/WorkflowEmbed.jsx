import React, { useEffect, useState } from 'react';
import { workflowAPI } from '../../services/api';
import WorkflowStatusCard from './WorkflowStatusCard';
import WorkflowDiagram from './WorkflowDiagram';
import WorkflowTimeline from './WorkflowTimeline';

const WorkflowEmbed = ({ resourceType, resourceId, compact = true }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!resourceType || !resourceId) return setWorkflows([]);
      try {
        setLoading(true);
        setError(null);
        const resp = await workflowAPI.getInstances(resourceType, resourceId);
        if (!mounted) return;
        setWorkflows(Array.isArray(resp) ? resp : []);
      } catch (e) {
        console.error('Failed to load workflows for', resourceType, resourceId, e);
        if (mounted) setError('Failed to load workflows');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [resourceType, resourceId]);

  if (loading || error || !workflows || workflows.length === 0) return null;

  const first = workflows[0];

  return (
    <div>
      <div className="inline-block">
        <div onClick={() => setExpanded(first.instance_id)}>
          <WorkflowStatusCard workflow={first} onClick={() => setExpanded(first.instance_id)} />
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{first.resource_type?.toUpperCase()} Workflow — ID {first.instance_id}</h3>
              <button className="text-gray-500" onClick={() => setExpanded(null)}>✕</button>
            </div>

            <div className="mb-6">
              <WorkflowDiagram steps={first.steps || []} currentStepIndex={first.current_step_id} compact={!compact} />
            </div>

            <div>
              <WorkflowTimeline events={first.events || []} steps={first.steps || []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowEmbed;
