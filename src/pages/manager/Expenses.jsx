import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
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
      const [reports, data] = await Promise.all([
        managerAPI.getDirectReports(),
        managerAPI.getTeamExpenses()
      ]);
      setTeam(reports || []);
      setExpenses(data || []);
      
      // Fetch workflows for each expense
      const workflowMap = {};
      for (const expense of (data || [])) {
        try {
          const expenseWorkflows = await workflowAPI.getInstances('expenses', expense.expense_id);
          if (expenseWorkflows?.length > 0) {
            workflowMap[expense.expense_id] = expenseWorkflows[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch workflow for expense ${expense.expense_id}:`, err);
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      console.error('Failed to load team expenses:', err);
      setError('Failed to load team expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (expenseId) => {
    await managerAPI.approveExpense(expenseId);
    await loadData();
  };

  const handleReject = async (expenseId) => {
    const reason = window.prompt('Reason for rejection?');
    if (!reason) return;
    await managerAPI.rejectExpense(expenseId, reason);
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading expenses...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Expenses</h1>
        <p className="text-sm text-gray-600">Approve or reject submitted expenses.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No expenses found.
                </td>
              </tr>
            )}
            {expenses.map((expense) => {
              const workflow = workflows[expense.expense_id];
              return (
                <React.Fragment key={expense.expense_id}>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {teamMap.get(expense.employee_id) || `Employee #${expense.employee_id}`}
                    </td>
                    <td className="px-4 py-3">{expense.category}</td>
                    <td className="px-4 py-3">{expense.amount}</td>
                    <td className="px-4 py-3">{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-3">{expense.status}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {expense.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense.expense_id)}
                            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(expense.expense_id)}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {workflow && (
                        <button
                          onClick={() => setExpandedWorkflow(expandedWorkflow === expense.expense_id ? null : expense.expense_id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Workflow
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedWorkflow === expense.expense_id && workflow && (
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
