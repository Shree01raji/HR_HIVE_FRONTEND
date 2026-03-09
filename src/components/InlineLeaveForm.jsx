import React, { useState } from 'react';
import { leaveAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const InlineLeaveForm = ({ onSubmit, onCancel, leaveConfig = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leave_type: 'Paid Leave',
    start_date: '',
    end_date: '',
    permission_hours: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const fallbackLeaveTypes = [
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Paid Leave', label: 'Paid Leave' },
    { value: 'Unpaid Leave', label: 'Unpaid Leave' },
    { value: 'Permission Required', label: 'Permission Required' },
    { value: 'Casual Leave', label: 'Casual Leave' },
    { value: 'Compensatory Off', label: 'Compensatory Off' },
    { value: 'PL or Earned Leave', label: 'PL or Earned Leave' }
  ];

  const leaveTypes = (() => {
    const configuredTypes = leaveConfig && Object.keys(leaveConfig).length > 0
      ? Object.keys(leaveConfig).map((type) => ({ value: type, label: type }))
      : [];

    const mergedByValue = new Map();
    [...configuredTypes, ...fallbackLeaveTypes].forEach((type) => {
      mergedByValue.set(type.value, type);
    });

    return Array.from(mergedByValue.values());
  })();

  const isPermissionLeave = String(formData.leave_type || '').trim().toLowerCase().includes('permission');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'leave_type' && String(value || '').trim().toLowerCase().includes('permission') && prev.start_date
        ? { end_date: prev.start_date }
        : {}),
      ...(name === 'start_date' && String(prev.leave_type || '').trim().toLowerCase().includes('permission')
        ? { end_date: value }
        : {})
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.leave_type) {
      newErrors.leave_type = 'Please select a leave type';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Please select a start date';
    }
    
    if (!isPermissionLeave && !formData.end_date) {
      newErrors.end_date = 'Please select an end date';
    }

    if (isPermissionLeave) {
      const permissionHours = Number(formData.permission_hours || 0);
      if (!permissionHours || permissionHours <= 0) {
        newErrors.permission_hours = 'Please enter permission hours';
      } else if (permissionHours > 24) {
        newErrors.permission_hours = 'Permission hours cannot exceed 24';
      }
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for leave';
    }
    
    // Validate date range
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date';
      }

      if (isPermissionLeave && endDate.getTime() !== startDate.getTime()) {
        newErrors.end_date = 'Permission leave must be for a single date';
      }
      
      // Check if dates are in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.start_date = 'Start date cannot be in the past';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check for selectedOrganization in localStorage
    const selectedOrganization = localStorage.getItem('selectedOrganization');
    if (!selectedOrganization) {
      setErrors({ submit: 'No organization selected. Please log in again or select an organization before applying for leave.' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const leaveData = {
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: isPermissionLeave ? formData.start_date : formData.end_date,
        permission_hours: isPermissionLeave ? Number(formData.permission_hours) : null,
        notes: formData.reason
      };

      console.log('Submitting leave data:', leaveData);
      console.log('Current user:', user);
      await leaveAPI.apply(leaveData);
      onSubmit({ ...leaveData, reason: formData.reason });

    } catch (error) {
      console.error('Error submitting leave application:', error);
      const response = error?.response;
      let message = 'Failed to submit leave application. Please try again.';
 
      if (response) {
        // Prefer structured error message from backend
        if (response.data && (response.data.detail || response.data.message)) {
          message = response.data.detail || response.data.message;
        } else if (response.statusText) {
          message = `${response.status} ${response.statusText}`;
        } else {
          message = `Request failed with status ${response.status}`;
        }
      } else if (error?.message) {
        message = error.message;
      }
 
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-2">
      {errors.submit && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3">
          {errors.submit}
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-blue-800">📋 Leave Application Form</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-blue-700 mb-2">Paid Leave: one day per month accrual. Permission Required: apply only in hours.</p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Leave Type */}
        <div>
          <label htmlFor="leave_type" className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type *
          </label>
          <select
            id="leave_type"
            name="leave_type"
            value={formData.leave_type}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
              errors.leave_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {leaveTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {errors.leave_type && (
            <p className="text-red-500 text-xs mt-1">{errors.leave_type}</p>
          )}
        </div>

        {isPermissionLeave && (
          <div>
            <label htmlFor="permission_hours" className="block text-sm font-medium text-gray-700 mb-1">
              Permission Hours *
            </label>
            <input
              type="number"
              id="permission_hours"
              name="permission_hours"
              min="0.5"
              max="24"
              step="0.5"
              value={formData.permission_hours}
              onChange={handleInputChange}
              placeholder="e.g., 2"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.permission_hours ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.permission_hours && (
              <p className="text-red-500 text-xs mt-1">{errors.permission_hours}</p>
            )}
          </div>
        )}

        {/* Date Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              min={getMinDate()}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_date && (
              <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              min={formData.start_date || getMinDate()}
              disabled={isPermissionLeave}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && (
              <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
            )}
            {isPermissionLeave && (
              <p className="text-xs text-gray-500 mt-1">Permission leave is single-day. End date will match start date.</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Leave *
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={2}
            placeholder="Please provide a brief description of why you need this leave..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
              errors.reason ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.reason && (
            <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
          )}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-red-600 text-xs">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InlineLeaveForm;

