import React, { useState, useEffect } from 'react';
import { FiShield, FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { insuranceAPI, employeeAPI } from '../../services/api';

export default function InsuranceCards() {
  const [cards, setCards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ employee_id: '', insurance_type: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsData, employeesData] = await Promise.all([
        insuranceAPI.getAllCards(filters.employee_id || null, filters.insurance_type || null),
        employeeAPI.getAll()
      ]);
      setCards(Array.isArray(cardsData) ? cardsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load insurance cards');
    } finally {
      setLoading(false);
    }
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
      <h1 className="text-2xl font-bold text-gray-900">Insurance Cards</h1>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Type</label>
            <select
              value={filters.insurance_type}
              onChange={(e) => setFilters(prev => ({ ...prev, insurance_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="health">Health</option>
              <option value="life">Life</option>
              <option value="accidental">Accidental</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.card_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{card.insurance_type}</h3>
                <p className="text-sm text-gray-600">{card.insurance_provider}</p>
              </div>
              {card.is_primary && (
                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-medium">
                  Primary
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div>
                <span className="text-gray-600">Employee:</span>
                <span className="font-medium ml-2">{getEmployeeName(card.employee_id)}</span>
              </div>
              <div>
                <span className="text-gray-600">Policy #:</span>
                <span className="font-medium ml-2">{card.policy_number}</span>
              </div>
              {card.coverage_amount && (
                <div>
                  <span className="text-gray-600">Coverage:</span>
                  <span className="font-medium ml-2">₹{parseFloat(card.coverage_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Valid From:</span>
                <span className="font-medium ml-2">{new Date(card.coverage_start_date).toLocaleDateString()}</span>
              </div>
            </div>
            {card.card_image_path && (
              <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <FiEye className="w-4 h-4" />
                View Card
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
