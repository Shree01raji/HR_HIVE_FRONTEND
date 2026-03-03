import React, { useState, useEffect } from 'react';
import { FiSettings, FiPlus, FiEdit, FiTrash2, FiUsers, FiEye, FiX } from 'react-icons/fi';
import { leavePolicyAPI, employeeAPI } from '../../services/api';

export default function LeavePolicies() {
  const [policies, setPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    policy_name: '',
    description: '',
    leave_type: 'Paid Leave',
    default_days_per_year: 12,
    max_carry_forward_days: 0,
    carry_forward_allowed: false,
    requires_approval: true,
    min_notice_days: 1,
    max_consecutive_days: null,
    requires_medical_certificate: false,
    medical_certificate_required_after_days: 3,
    effective_from: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [policiesData, employeesData] = await Promise.all([
        leavePolicyAPI.getPolicies(),
        employeeAPI.getAll()
      ]);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load leave policies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      let newValue;
      if (type === 'checkbox') {
        newValue = checked;
      } else if (type === 'number') {
        // Convert empty strings to null for optional number fields
        newValue = value === '' ? null : parseFloat(value);
      } else {
        newValue = value;
      }
      return {
        ...prev,
        [name]: newValue
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submission
    
    try {
      setError(null);
      setSubmitting(true);
      
      // Clean the form data: convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        description: formData.description || null,
        max_consecutive_days: formData.max_consecutive_days === '' || formData.max_consecutive_days === null 
          ? null 
          : formData.max_consecutive_days,
        max_carry_forward_days: formData.max_carry_forward_days === '' || formData.max_carry_forward_days === null
          ? 0
          : formData.max_carry_forward_days,
      };
      
      await leavePolicyAPI.createPolicy(cleanedData);
      await fetchData();
      
      // Reset form
      setFormData({
        policy_name: '',
        description: '',
        leave_type: 'Paid Leave',
        default_days_per_year: 12,
        max_carry_forward_days: 0,
        carry_forward_allowed: false,
        requires_approval: true,
        min_notice_days: 1,
        max_consecutive_days: null,
        requires_medical_certificate: false,
        medical_certificate_required_after_days: 3,
        effective_from: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error creating policy:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to create policy. Please check the console for details.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyToEmployees = async (policyId) => {
    if (!window.confirm('Apply this policy to all eligible employees?')) return;
    try {
      setError(null);
      const result = await leavePolicyAPI.applyToEmployees(policyId);
      const message = result?.detail || `Policy applied successfully! ${result?.employees_affected || 0} employees affected.`;
      alert(message);
      await fetchData(); // Refresh the policies list
    } catch (err) {
      console.error('Error applying policy:', err);
      let errorMessage = 'Failed to apply policy';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        // Handle different error formats
        if (Array.isArray(errorData.detail)) {
          // Validation errors - format them nicely
          errorMessage = errorData.detail.map(e => {
            if (typeof e === 'string') return e;
            if (e.msg) return e.msg;
            if (e.loc && e.msg) return `${e.loc.join('.')}: ${e.msg}`;
            return JSON.stringify(e);
          }).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleViewPolicy = async (policyId) => {
    try {
      const policy = await leavePolicyAPI.getPolicy(policyId);
      setSelectedPolicy(policy);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching policy:', err);
      setError('Failed to load policy details');
    }
  };

  const handleEditPolicy = async (policyId) => {
    try {
      const policy = await leavePolicyAPI.getPolicy(policyId);
      setSelectedPolicy(policy);
      // Pre-fill form with policy data
      setFormData({
        policy_name: policy.policy_name || '',
        description: policy.description || '',
        leave_type: policy.leave_type || 'Paid Leave',
        default_days_per_year: policy.default_days_per_year || 12,
        max_carry_forward_days: policy.max_carry_forward_days || 0,
        carry_forward_allowed: policy.carry_forward_allowed || false,
        requires_approval: policy.requires_approval !== undefined ? policy.requires_approval : true,
        min_notice_days: policy.min_notice_days || 1,
        max_consecutive_days: policy.max_consecutive_days || null,
        requires_medical_certificate: policy.requires_medical_certificate || false,
        medical_certificate_required_after_days: policy.medical_certificate_required_after_days || 3,
        effective_from: policy.effective_from ? new Date(policy.effective_from).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('Error fetching policy:', err);
      setError('Failed to load policy for editing');
    }
  };

  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    if (submitting || !selectedPolicy) return;
    
    try {
      setError(null);
      setSubmitting(true);
      
      const cleanedData = {
        ...formData,
        description: formData.description || null,
        max_consecutive_days: formData.max_consecutive_days === '' || formData.max_consecutive_days === null 
          ? null 
          : formData.max_consecutive_days,
        max_carry_forward_days: formData.max_carry_forward_days === '' || formData.max_carry_forward_days === null
          ? 0
          : formData.max_carry_forward_days,
      };
      
      await leavePolicyAPI.updatePolicy(selectedPolicy.policy_id, cleanedData);
      await fetchData();
      
      // Reset form and close modal
      setFormData({
        policy_name: '',
        description: '',
        leave_type: 'Paid Leave',
        default_days_per_year: 12,
        max_carry_forward_days: 0,
        carry_forward_allowed: false,
        requires_approval: true,
        min_notice_days: 1,
        max_consecutive_days: null,
        requires_medical_certificate: false,
        medical_certificate_required_after_days: 3,
        effective_from: new Date().toISOString().split('T')[0]
      });
      setShowEditModal(false);
      setSelectedPolicy(null);
    } catch (err) {
      console.error('Error updating policy:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to update policy. Please check the console for details.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      setError(null);
      await leavePolicyAPI.deletePolicy(selectedPolicy.policy_id);
      await fetchData();
      setShowDeleteConfirm(false);
      setSelectedPolicy(null);
    } catch (err) {
      console.error('Error deleting policy:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to delete policy';
      setError(errorMessage);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Leave Policies</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Create Policy
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create Leave Policy</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name *</label>
                <input type="text" name="policy_name" value={formData.policy_name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select name="leave_type" value={formData.leave_type} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="Paid Leave">Paid Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Per Year *</label>
                <input type="number" name="default_days_per_year" value={formData.default_days_per_year} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry Forward Days</label>
                <input type="number" name="max_carry_forward_days" value={formData.max_carry_forward_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice Days</label>
                <input type="number" name="min_notice_days" value={formData.min_notice_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Days</label>
                <input type="number" name="max_consecutive_days" value={formData.max_consecutive_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Leave empty for no limit" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                <input type="date" name="effective_from" value={formData.effective_from} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" rows="3" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="carry_forward_allowed" checked={formData.carry_forward_allowed} onChange={handleInputChange} />
                  <span className="text-sm font-medium text-gray-700">Allow Carry Forward</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="requires_approval" checked={formData.requires_approval} onChange={handleInputChange} />
                  <span className="text-sm font-medium text-gray-700">Requires Approval</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="requires_medical_certificate" checked={formData.requires_medical_certificate} onChange={handleInputChange} />
                  <span className="text-sm font-medium text-gray-700">Requires Medical Certificate</span>
                </label>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Policy'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }} 
                disabled={submitting}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((policy) => (
            <div key={policy.policy_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{policy.policy_name}</h3>
                  <p className="text-sm text-gray-600">{policy.leave_type}</p>
                </div>
                {policy.is_active ? (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Active</span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">Inactive</span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Days Per Year:</span>
                  <span className="font-medium ml-2">{policy.default_days_per_year}</span>
                </div>
                {policy.carry_forward_allowed && (
                  <div>
                    <span className="text-gray-600">Max Carry Forward:</span>
                    <span className="font-medium ml-2">{policy.max_carry_forward_days} days</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Effective From:</span>
                  <span className="font-medium ml-2">{new Date(policy.effective_from).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => handleViewPolicy(policy.policy_id)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
                  title="View Policy Details"
                >
                  <FiEye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleEditPolicy(policy.policy_id)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-2"
                  title="Edit Policy"
                >
                  <FiEdit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedPolicy(policy);
                    setShowDeleteConfirm(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm flex items-center gap-2"
                  title="Delete Policy"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => handleApplyToEmployees(policy.policy_id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                  title="Apply Policy to Employees"
                >
                  <FiUsers className="w-4 h-4" />
                  Apply to Employees
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Policy Modal */}
      {showViewModal && selectedPolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Policy Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedPolicy(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy Name</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.policy_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.leave_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Days Per Year</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.default_days_per_year}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    {selectedPolicy.is_active ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Active</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective From</label>
                  <p className="mt-1 text-gray-900">{new Date(selectedPolicy.effective_from).toLocaleDateString()}</p>
                </div>
                {selectedPolicy.max_carry_forward_days !== null && selectedPolicy.max_carry_forward_days !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Carry Forward Days</label>
                    <p className="mt-1 text-gray-900">{selectedPolicy.max_carry_forward_days} days</p>
                  </div>
                )}
                {selectedPolicy.min_notice_days !== null && selectedPolicy.min_notice_days !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Notice Days</label>
                    <p className="mt-1 text-gray-900">{selectedPolicy.min_notice_days} days</p>
                  </div>
                )}
                {selectedPolicy.max_consecutive_days !== null && selectedPolicy.max_consecutive_days !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Consecutive Days</label>
                    <p className="mt-1 text-gray-900">{selectedPolicy.max_consecutive_days} days</p>
                  </div>
                )}
              </div>
              
              {selectedPolicy.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Carry Forward Allowed</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.carry_forward_allowed ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requires Approval</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.requires_approval ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requires Medical Certificate</label>
                  <p className="mt-1 text-gray-900">{selectedPolicy.requires_medical_certificate ? 'Yes' : 'No'}</p>
                </div>
                {selectedPolicy.requires_medical_certificate && selectedPolicy.medical_certificate_required_after_days && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medical Certificate Required After</label>
                    <p className="mt-1 text-gray-900">{selectedPolicy.medical_certificate_required_after_days} days</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedPolicy(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showEditModal && selectedPolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Edit Leave Policy</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPolicy(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePolicy} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name *</label>
                  <input type="text" name="policy_name" value={formData.policy_name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                  <select name="leave_type" value={formData.leave_type} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required>
                    <option value="Paid Leave">Paid Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Maternity">Maternity</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days Per Year *</label>
                  <input type="number" name="default_days_per_year" value={formData.default_days_per_year} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry Forward Days</label>
                  <input type="number" name="max_carry_forward_days" value={formData.max_carry_forward_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice Days</label>
                  <input type="number" name="min_notice_days" value={formData.min_notice_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Days</label>
                  <input type="number" name="max_consecutive_days" value={formData.max_consecutive_days || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Leave empty for no limit" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                  <input type="date" name="effective_from" value={formData.effective_from} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" rows="3" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="carry_forward_allowed" checked={formData.carry_forward_allowed} onChange={handleInputChange} />
                    <span className="text-sm font-medium text-gray-700">Allow Carry Forward</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requires_approval" checked={formData.requires_approval} onChange={handleInputChange} />
                    <span className="text-sm font-medium text-gray-700">Requires Approval</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="requires_medical_certificate" checked={formData.requires_medical_certificate} onChange={handleInputChange} />
                    <span className="text-sm font-medium text-gray-700">Requires Medical Certificate</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Updating...' : 'Update Policy'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPolicy(null);
                    setError(null);
                  }} 
                  disabled={submitting}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Policy</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedPolicy(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the policy <strong>"{selectedPolicy.policy_name}"</strong>? 
              This will deactivate the policy. This action cannot be undone.
            </p>
            
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedPolicy(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePolicy}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
