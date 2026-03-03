import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle } from 'react-icons/fi';
import { reimbursementAPI, employeeAPI } from '../../services/api';

export default function Reimbursements() {
  const [reimbursements, setReimbursements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ employee_id: '', status: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reimbursementsData, employeesData] = await Promise.all([
        reimbursementAPI.getAllReimbursements(filters.employee_id || null, filters.status || null),
        employeeAPI.getAll()
      ]);
      setReimbursements(Array.isArray(reimbursementsData) ? reimbursementsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reimbursementId) => {
    try {
      await reimbursementAPI.approveReimbursement(reimbursementId);
      await fetchData();
    } catch (err) {
      console.error('Error approving reimbursement:', err);
      setError(err.response?.data?.detail || 'Failed to approve reimbursement');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'bg-gray-100 text-gray-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Processed: 'bg-purple-100 text-purple-800',
      Paid: 'bg-green-100 text-green-800'
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
      <h1 className="text-2xl font-bold text-gray-900">Reimbursements</h1>

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
        {reimbursements.map((reimbursement) => (
          <div key={reimbursement.reimbursement_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{reimbursement.title}</h3>
                <p className="text-sm text-gray-600">#{reimbursement.reimbursement_number} • {getEmployeeName(reimbursement.employee_id)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-teal-600">₹{parseFloat(reimbursement.total_amount).toLocaleString('en-IN')}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(reimbursement.status)}`}>
                  {reimbursement.status}
                </span>
              </div>
            </div>
            {reimbursement.status === 'Submitted' && (
              <button
                onClick={() => handleApprove(reimbursement.reimbursement_id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FiCheckCircle className="w-5 h-5" />
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
