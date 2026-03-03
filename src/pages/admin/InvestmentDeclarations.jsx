import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiSearch, FiCheckCircle, FiX, FiEye } from 'react-icons/fi';
import { investmentAPI, employeeAPI } from '../../services/api';

export default function InvestmentDeclarations() {
  const [declarations, setDeclarations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    employee_id: '',
    financial_year: ''
  });
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [declarationsData, employeesData] = await Promise.all([
        investmentAPI.getAllDeclarations(filters.employee_id || null, filters.financial_year || null),
        employeeAPI.getAll()
      ]);
      setDeclarations(Array.isArray(declarationsData) ? declarationsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load investment declarations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleVerify = async (declarationId, verificationNotes = '') => {
    try {
      await investmentAPI.verifyDeclaration(declarationId, verificationNotes);
      await fetchData();
      setSelectedDeclaration(null);
      alert('Declaration verified successfully');
    } catch (err) {
      console.error('Error verifying declaration:', err);
      setError(err.response?.data?.detail || 'Failed to verify declaration');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800'
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Investment Declarations</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
            <input
              type="text"
              value={filters.financial_year}
              onChange={(e) => setFilters(prev => ({ ...prev, financial_year: e.target.value }))}
              placeholder="2024-25"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Financial Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section 80C</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section 80D</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {declarations.map((declaration) => (
              <tr key={declaration.declaration_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getEmployeeName(declaration.employee_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {declaration.financial_year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{declaration.section_80c_total?.toLocaleString('en-IN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{declaration.section_80d_total?.toLocaleString('en-IN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-600">
                  ₹{declaration.total_deductions?.toLocaleString('en-IN') || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(declaration.declaration_status)}`}>
                    {declaration.declaration_status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDeclaration(declaration)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    {declaration.declaration_status === 'submitted' && (
                      <button
                        onClick={() => handleVerify(declaration.declaration_id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FiCheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {declarations.length === 0 && (
          <div className="text-center py-12">
            <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No declarations found</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Declaration Details</h2>
              <button onClick={() => setSelectedDeclaration(null)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Employee:</span>
                  <p className="font-medium">{getEmployeeName(selectedDeclaration.employee_id)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Financial Year:</span>
                  <p className="font-medium">{selectedDeclaration.financial_year}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Section 80C:</span>
                  <p className="font-medium">₹{selectedDeclaration.section_80c_total?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Section 80D:</span>
                  <p className="font-medium">₹{selectedDeclaration.section_80d_total?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-gray-600">Total Deductions:</span>
                  <p className="font-medium text-teal-600 text-lg">₹{selectedDeclaration.total_deductions?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>
              {selectedDeclaration.declaration_status === 'submitted' && (
                <button
                  onClick={() => handleVerify(selectedDeclaration.declaration_id)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Verify Declaration
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
