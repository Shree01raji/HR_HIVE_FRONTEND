import React, { useState, useEffect } from 'react';
import { teamAPI } from '../../../services/api';
import { FiUsers, FiChevronDown, FiChevronRight, FiFilter } from 'react-icons/fi';

export default function OrganizationStructure() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [selectedDepartment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await teamAPI.getOrganizationStructure(selectedDepartment || null);
      setData(result);
      // Auto-expand first level
      if (result.root_employees && result.root_employees.length > 0) {
        const firstLevelIds = result.root_employees.map(emp => emp.employee_id);
        setExpandedNodes(new Set(firstLevelIds));
      }
    } catch (err) {
      console.error('Error fetching organization structure:', err);
      setError(err.response?.data?.detail || 'Failed to load organization structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (employeeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.employee_id);
    const hasReports = node.direct_reports && node.direct_reports.length > 0;
    const indent = level * 24;

    return (
      <div key={node.employee_id} className="mb-2">
        <div
          className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          style={{ marginLeft: `${indent}px` }}
          onClick={() => hasReports && toggleNode(node.employee_id)}
        >
          {hasReports ? (
            isExpanded ? (
              <FiChevronDown className="w-4 h-4 text-gray-400 mr-2" />
            ) : (
              <FiChevronRight className="w-4 h-4 text-gray-400 mr-2" />
            )
          ) : (
            <div className="w-4 mr-2" />
          )}
          
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">
                  {node.first_name?.[0] || node.last_name?.[0] || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {node.first_name} {node.last_name}
                </p>
                <p className="text-sm text-gray-600 truncate">{node.designation || 'N/A'}</p>
                {node.department && (
                  <p className="text-xs text-gray-500 truncate">{node.department}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && hasReports && (
          <div className="mt-1">
            {node.direct_reports.map((report) => renderNode(report, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data || !data.root_employees || data.root_employees.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No organization structure found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters and Stats */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {data.departments?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-800">{data.total_employees}</span> Employees
            </div>
            <div>
              <span className="font-semibold text-gray-800">{data.levels}</span> Levels
            </div>
            <div>
              <span className="font-semibold text-gray-800">{data.departments?.length || 0}</span> Departments
            </div>
          </div>
        </div>
      </div>

      {/* Organization Tree */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Organization Chart</h3>
        <div className="space-y-2">
          {data.root_employees.map((root) => renderNode(root, 0))}
        </div>
      </div>
    </div>
  );
}
