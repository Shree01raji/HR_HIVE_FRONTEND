import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export default function Timesheet() {
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);

  const teamMap = useMemo(() => {
    const map = new Map();
    team.forEach((member) => {
      map.set(member.employee_id, `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email);
    });
    return map;
  }, [team]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reports, data] = await Promise.all([
          managerAPI.getDirectReports(),
          managerAPI.getTeamTimesheets()
        ]);
        setTeam(reports || []);
        setEntries(data || []);
        
        // Fetch workflows for each timesheet entry
        const workflowMap = {};
        for (const entry of (data || [])) {
          try {
            const entryWorkflows = await workflowAPI.getInstances('timesheet', entry.entry_id);
            if (entryWorkflows?.length > 0) {
              workflowMap[entry.entry_id] = entryWorkflows[0];
            }
          } catch (err) {
            console.warn(`Failed to fetch workflow for timesheet ${entry.entry_id}:`, err);
          }
        }
        setWorkflows(workflowMap);
      } catch (err) {
        console.error('Failed to load team timesheets:', err);
        setError('Failed to load timesheet entries.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="text-gray-600">Loading timesheets...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Timesheets</h1>
        <p className="text-sm text-gray-600">Review time entries submitted by your team.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Hours</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Workflow</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No timesheet entries found.
                </td>
              </tr>
            )}
            {entries.map((entry) => {
              const workflow = workflows[entry.entry_id];
              return (
                <React.Fragment key={entry.entry_id}>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {teamMap.get(entry.employee_id) || `Employee #${entry.employee_id}`}
                    </td>
                    <td className="px-4 py-3">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">{entry.total_hours?.toFixed?.(2) || entry.total_hours || 0}</td>
                    <td className="px-4 py-3">{entry.status}</td>
                    <td className="px-4 py-3">{entry.project_code || '-'}</td>
                    <td className="px-4 py-3">
                      {workflow && (
                        <button
                          onClick={() => setExpandedWorkflow(expandedWorkflow === entry.entry_id ? null : entry.entry_id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedWorkflow === entry.entry_id && workflow && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="6" className="px-6 py-4">
                        <WorkflowTimeline workflow={workflow} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
