import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reports, teamLeaves] = await Promise.all([
        managerAPI.getDirectReports(),
        managerAPI.getTeamLeaves()
      ]);
      setTeam(reports || []);
      setLeaves(teamLeaves || []);
      
      // Fetch workflows for each leave request
      const workflowMap = {};
      for (const leave of (teamLeaves || [])) {
        try {
          const leaveWorkflows = await workflowAPI.getInstances('leave', leave.leave_id);
          if (leaveWorkflows?.length > 0) {
            workflowMap[leave.leave_id] = leaveWorkflows[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch workflow for leave ${leave.leave_id}:`, err);
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      console.error('Failed to load team leaves:', err);
      setError('Failed to load team leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (leaveId) => {
    await managerAPI.approveLeave(leaveId);
    await loadData();
  };

  const handleReject = async (leaveId) => {
    const reason = window.prompt('Reason for rejection?');
    if (!reason) return;
    await managerAPI.rejectLeave(leaveId, reason);
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading leave requests...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Leave Management</h1>
        <p className="text-sm text-gray-600">Approve or reject leave requests for your direct reports.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No leave requests found.
                </td>
              </tr>
            )}
            {leaves.map((leave) => {
              const workflow = workflows[leave.leave_id];
              return (
                <React.Fragment key={leave.leave_id}>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {teamMap.get(leave.employee_id) || `Employee #${leave.employee_id}`}
                    </td>
                    <td className="px-4 py-3">{leave.leave_type}</td>
                    <td className="px-4 py-3">{formatDate(leave.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(leave.end_date)}</td>
                    <td className="px-4 py-3">{leave.status}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {leave.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave.leave_id)}
                            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(leave.leave_id)}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {workflow && (
                        <button
                          onClick={() => setExpandedWorkflow(expandedWorkflow === leave.leave_id ? null : leave.leave_id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Workflow
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedWorkflow === leave.leave_id && workflow && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-4">
                          <WorkflowStatusCard workflow={workflow} />
                          <div>
                            <h4 className="font-semibold mb-3 text-sm">Approval Steps</h4>
                            <WorkflowDiagram steps={workflow.steps} compact={true} />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 text-sm">History</h4>
                            <WorkflowTimeline events={workflow.events} steps={workflow.steps} />
                          </div>
                        </div>
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
