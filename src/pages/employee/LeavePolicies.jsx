import React, { useState, useEffect } from 'react';
import { FiCalendar, FiInfo, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import api, { leavePolicyAPI, leaveTypesAPI } from '../../services/api';

export default function LeavePolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch active policies and configured leave types from settings
      const [policiesData, leaveTypesResponse, leaveConfigResponse] = await Promise.all([
        leavePolicyAPI.getPolicies(true),
        leaveTypesAPI.list().catch(() => null),
        api.get('/settings/leave-config').catch(() => ({ data: { leave_config: {} } }))
      ]);

      const normalizeLeaveType = (value) =>
        String(value || '')
          .trim()
          .toLowerCase()
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ');

      const leaveTypeRows = Array.isArray(leaveTypesResponse)
        ? leaveTypesResponse
        : Array.isArray(leaveTypesResponse?.data)
          ? leaveTypesResponse.data
          : Array.isArray(leaveTypesResponse?.items)
            ? leaveTypesResponse.items
            : [];

      const configuredLeaveTypesFromDb = leaveTypeRows
        .map((row) => String(row?.leave_type || row?.name || row?.type_name || '').trim())
        .filter(Boolean);

      const configuredLeaveTypesFromSettings = Object.keys(leaveConfigResponse?.data?.leave_config || {});
      const configuredLeaveTypes = configuredLeaveTypesFromDb.length > 0
        ? configuredLeaveTypesFromDb
        : configuredLeaveTypesFromSettings;
      const configuredLeaveTypeSet = new Set(configuredLeaveTypes.map(normalizeLeaveType));
      const safePolicies = Array.isArray(policiesData) ? policiesData : [];

      const filteredPolicies = configuredLeaveTypes.length > 0
        ? safePolicies.filter((policy) => configuredLeaveTypeSet.has(normalizeLeaveType(policy?.leave_type)))
        : safePolicies;

      setPolicies(filteredPolicies);
    } catch (err) {
      console.error('Error fetching leave policies:', err);
      setError('Failed to load leave policies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Policies</h1>
          <p className="text-gray-600 mt-1">View your organization's leave policies and entitlements</p>
        </div>
        <button
          onClick={fetchPolicies}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <FiClock className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiInfo className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Leave Policies Available</h3>
          <p className="text-yellow-700">
            There are no active leave policies configured yet. Please contact your HR department for more information.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((policy) => (
            <div key={policy.policy_id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{policy.policy_name}</h3>
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-600">{policy.leave_type}</span>
                  </div>
                </div>
                {policy.is_active ? (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <FiCheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <FiXCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>

              {policy.description && (
                <p className="text-gray-600 text-sm mb-4">{policy.description}</p>
              )}

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Days Per Year</p>
                    <p className="text-lg font-semibold text-gray-900">{policy.default_days_per_year} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Effective From</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(policy.effective_from)}</p>
                  </div>
                </div>

                {policy.carry_forward_allowed && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <FiInfo className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">Carry Forward Allowed</p>
                    </div>
                    <p className="text-xs text-blue-700 ml-6">
                      Maximum {policy.max_carry_forward_days || 0} days can be carried forward to the next year
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Minimum Notice</p>
                    <p className="font-medium text-gray-900">{policy.min_notice_days || 0} days</p>
                  </div>
                  {policy.max_consecutive_days && (
                    <div>
                      <p className="text-gray-600">Max Consecutive Days</p>
                      <p className="font-medium text-gray-900">{policy.max_consecutive_days} days</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  {policy.requires_approval && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Requires Approval
                    </span>
                  )}
                  {policy.requires_medical_certificate && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      Medical Certificate Required
                    </span>
                  )}
                  {policy.accrual_type && policy.accrual_type !== 'annual' && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {policy.accrual_type.charAt(0).toUpperCase() + policy.accrual_type.slice(1)} Accrual
                    </span>
                  )}
                </div>

                {policy.effective_to && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    Valid until: {formatDate(policy.effective_to)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
