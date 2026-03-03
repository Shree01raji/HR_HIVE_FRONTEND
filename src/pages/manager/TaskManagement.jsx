import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI, taskTrackingAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export default function TaskManagement() {
  const [team, setTeam] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [formState, setFormState] = useState({
    employeeId: '',
    title: '',
    description: '',
    priority: 'MEDIUM'
  });

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
      const reports = await managerAPI.getDirectReports();
      setTeam(reports || []);

      if (!reports || reports.length === 0) {
        setTasks([]);
        return;
      }

      const taskResponses = await Promise.all(
        reports.map((member) => taskTrackingAPI.getTasks(member.employee_id))
      );
      const flattened = taskResponses.flat();
      setTasks(flattened);
      
      // Fetch workflows for each task
      const workflowMap = {};
      for (const task of flattened) {
        try {
          const taskWorkflows = await workflowAPI.getInstances('task', task.task_id);
          if (taskWorkflows?.length > 0) {
            workflowMap[task.task_id] = taskWorkflows[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch workflow for task ${task.task_id}:`, err);
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      console.error('Failed to load team tasks:', err);
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!formState.employeeId || !formState.title.trim()) return;

    await taskTrackingAPI.createTask({
      employee_id: Number(formState.employeeId),
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      priority: formState.priority
    });

    setFormState({ employeeId: '', title: '', description: '', priority: 'MEDIUM' });
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading tasks...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Task Management</h1>
        <p className="text-sm text-gray-600">Assign tasks and track progress for your direct reports.</p>
      </div>

      <form onSubmit={handleCreateTask} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={formState.employeeId}
            onChange={(event) => setFormState((prev) => ({ ...prev, employeeId: event.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">Select team member</option>
            {team.map((member) => (
              <option key={member.employee_id} value={member.employee_id}>
                {teamMap.get(member.employee_id)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={formState.title}
            onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Task title"
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
            required
          />
          <select
            value={formState.priority}
            onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <textarea
          value={formState.description}
          onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Task description"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows="2"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#24476f]"
        >
          Assign Task
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Updated</th>
              <th className="px-4 py-3 text-left">Workflow</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No tasks found.
                </td>
              </tr>
            )}
            {tasks.map((task) => {
              const workflow = workflows[task.task_id];
              return (
                <React.Fragment key={task.task_id}>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {teamMap.get(task.employee_id) || teamMap.get(task.user_id) || `User #${task.user_id}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{task.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{task.priority}</td>
                    <td className="px-4 py-3">{task.status}</td>
                    <td className="px-4 py-3">{formatDateTime(task.updated_at)}</td>
                    <td className="px-4 py-3">
                      {workflow && (
                        <button
                          onClick={() => setExpandedWorkflow(expandedWorkflow === task.task_id ? null : task.task_id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedWorkflow === task.task_id && workflow && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-4">
                          <WorkflowStatusCard workflow={workflow} />
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Approval Steps</h4>
                            <WorkflowDiagram steps={workflow.steps} compact={true} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">History</h4>
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
