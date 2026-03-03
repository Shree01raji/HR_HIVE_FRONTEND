import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiX, FiEye } from 'react-icons/fi';
import { expensesAPI, employeeAPI } from '../../services/api';
import WorkflowEmbed from '../../components/workflow/WorkflowEmbed';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ employee_id: '', status: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesData, employeesData] = await Promise.all([
        expensesAPI.getAllExpenses(filters.employee_id || null, filters.status || null),
        employeeAPI.getAll()
      ]);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expenseId) => {
    try {
      await expensesAPI.approveExpense(expenseId);
      await fetchData();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error approving expense:', err);
      setError(err.response?.data?.detail || 'Failed to approve expense');
    }
  };

  const handleReject = async (expenseId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await expensesAPI.rejectExpense(expenseId, reason);
      await fetchData();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error rejecting expense:', err);
      setError(err.response?.data?.detail || 'Failed to reject expense');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'bg-gray-100 text-gray-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Paid: 'bg-purple-100 text-purple-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.employee_id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expense Approvals</h1>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={filters.employee_id}
              onChange={(e) => setFilters(prev => ({ ...prev, employee_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {expenses.map((expense) => (
          <div key={expense.expense_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{expense.description}</h3>
                <p className="text-sm text-gray-600">{getEmployeeName(expense.employee_id)} • {expense.category} • {new Date(expense.expense_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-teal-600">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(expense.status)}`}>
                  {expense.status}
                </span>
              </div>
            </div>
            {expense.status === 'Submitted' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(expense.expense_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FiCheckCircle className="w-5 h-5" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(expense.expense_id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <FiX className="w-5 h-5" />
                  Reject
                </button>
              </div>
            )}

            {/* Workflow embed (compact) */}
            <div className="mt-3">
              <WorkflowEmbed resourceType="expenses" resourceId={expense.expense_id} compact={true} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
