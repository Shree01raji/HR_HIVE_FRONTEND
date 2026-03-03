import React, { useState, useEffect } from 'react';
import { FiFileText, FiCheckCircle, FiEye, FiX } from 'react-icons/fi';
import { preEmploymentAPI, employeeAPI } from '../../services/api';

export default function PreEmploymentForms() {
  const [forms, setForms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ candidate_id: '', status: '' });
  const [selectedForm, setSelectedForm] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [formsData, employeesData] = await Promise.all([
        preEmploymentAPI.getAllForms(null, filters.candidate_id || null, filters.status || null),
        employeeAPI.getAll()
      ]);
      setForms(Array.isArray(formsData) ? formsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load pre-employment forms');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (formId) => {
    try {
      await preEmploymentAPI.verifyForm(formId);
      await fetchData();
      setSelectedForm(null);
      alert('Form verified successfully!');
    } catch (err) {
      console.error('Error verifying form:', err);
      setError(err.response?.data?.detail || 'Failed to verify form');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pre-employment Forms</h1>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
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
        {forms.map((form) => (
          <div key={form.form_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{form.first_name} {form.last_name}</h3>
                <p className="text-sm text-gray-600">
                  {form.personal_email} • {form.personal_phone}
                </p>
                {form.expected_ctc && (
                  <p className="text-sm text-teal-600 font-medium mt-1">
                    Expected CTC: ₹{parseFloat(form.expected_ctc).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(form.status)}`}>
                {form.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              {form.pan_number && (
                <div>
                  <span className="text-gray-600">PAN:</span>
                  <span className="font-medium ml-2">{form.pan_number}</span>
                </div>
              )}
              {form.bank_account_number && (
                <div>
                  <span className="text-gray-600">Bank Account:</span>
                  <span className="font-medium ml-2">{form.bank_account_number}</span>
                </div>
              )}
              {form.expected_joining_date && (
                <div>
                  <span className="text-gray-600">Joining Date:</span>
                  <span className="font-medium ml-2">{new Date(form.expected_joining_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedForm(form)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <FiEye className="w-4 h-4" />
                View Details
              </button>
              {form.status === 'submitted' && (
                <button
                  onClick={() => handleVerify(form.form_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Verify
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Form Details</h2>
              <button onClick={() => setSelectedForm(null)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium">{selectedForm.first_name} {selectedForm.last_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium">{selectedForm.personal_email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Phone:</span>
                  <p className="font-medium">{selectedForm.personal_phone}</p>
                </div>
                {selectedForm.expected_ctc && (
                  <div>
                    <span className="text-sm text-gray-600">Expected CTC:</span>
                    <p className="font-medium text-teal-600">₹{parseFloat(selectedForm.expected_ctc).toLocaleString('en-IN')}</p>
                  </div>
                )}
                {selectedForm.pan_number && (
                  <div>
                    <span className="text-sm text-gray-600">PAN:</span>
                    <p className="font-medium">{selectedForm.pan_number}</p>
                  </div>
                )}
                {selectedForm.bank_account_number && (
                  <div>
                    <span className="text-sm text-gray-600">Bank Account:</span>
                    <p className="font-medium">{selectedForm.bank_account_number}</p>
                  </div>
                )}
              </div>
              {selectedForm.status === 'submitted' && (
                <button
                  onClick={() => handleVerify(selectedForm.form_id)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Verify Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
