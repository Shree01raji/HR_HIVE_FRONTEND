import React, { useState, useEffect } from 'react';
import { teamAPI } from '../../../services/api';
import { FiUsers, FiChevronDown, FiChevronRight, FiFilter, FiMail, FiPhone, FiBriefcase, FiHash } from 'react-icons/fi';

function flattenEmployees(employees) {
  if (!employees?.length) return [];
  let list = [];
  for (const employee of employees) {
    list.push(employee);
    if (employee.direct_reports?.length) {
      list = list.concat(flattenEmployees(employee.direct_reports));
    }
  }
  return list;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrganizationStructure() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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

      const allEmployees = flattenEmployees(result.root_employees || []);
      setSelectedEmployee((prev) => {
        if (!allEmployees.length) return null;
        if (!prev?.employee_id) return allEmployees[0];
        return allEmployees.find((employee) => employee.employee_id === prev.employee_id) || allEmployees[0];
      });
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

  const renderNode = (node, isChild = false) => {
    const isExpanded = expandedNodes.has(node.employee_id);
    const hasReports = node.direct_reports && node.direct_reports.length > 0;
    const isSelected = selectedEmployee?.employee_id === node.employee_id;

    return (
      <div key={node.employee_id} className="flex flex-col items-center min-w-[240px]">
        {isChild && <div className="w-0.5 h-5 bg-gray-300" />}

        <div
          className={`w-56 flex items-center gap-3 p-3 bg-white rounded-lg border transition-all cursor-pointer ${
            isSelected
              ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
              : 'border-gray-200 shadow-sm hover:shadow-md'
          }`}
          onClick={() => setSelectedEmployee(node)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasReports) toggleNode(node.employee_id);
            }}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              hasReports ? 'text-gray-500 hover:bg-gray-100' : 'text-transparent cursor-default'
            }`}
            aria-label={hasReports ? (isExpanded ? 'Collapse node' : 'Expand node') : 'No direct reports'}
            disabled={!hasReports}
          >
            {hasReports ? (isExpanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />) : <FiChevronRight className="w-4 h-4" />}
          </button>
          
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

          {hasReports && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {node.direct_reports.length}
            </span>
          )}
        </div>

        {isExpanded && hasReports && (
          <div className="flex flex-col items-center mt-1">
            <div className="w-0.5 h-6 bg-gray-300" />
            <div className="h-0.5 bg-gray-300 mb-2" style={{ width: `${Math.max(node.direct_reports.length * 240, 240)}px` }} />

            <div className="flex flex-wrap justify-center gap-6">
              {node.direct_reports.map((report) => (
                <div key={report.employee_id} className="flex flex-col items-center">
                  {renderNode(report, true)}
                </div>
              ))}
            </div>
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
                className="border border-gray-300 rounded-lg px-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Organization Tree + Details */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-gray-50 rounded-lg p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Organization Tree</h3>
            <span className="text-xs text-gray-500">Select a node to view details</span>
          </div>

          <div className="min-w-max">
            <div className="flex flex-wrap justify-center gap-8">
              {data.root_employees.map((root) => (
                <div key={root.employee_id} className="flex flex-col items-center">
                  {renderNode(root)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Employee Details</h3>

          {!selectedEmployee ? (
            <div className="text-sm text-gray-500">Select an employee from the tree to view details.</div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-base">
                    {selectedEmployee.first_name?.[0] || selectedEmployee.last_name?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedEmployee.designation || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <FiHash className="w-4 h-4 text-gray-400" />
                    {selectedEmployee.employee_id || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployee.department || 'N/A'}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Designation</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <FiBriefcase className="w-4 h-4 text-gray-400" />
                    {selectedEmployee.designation || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Direct Reports</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedEmployee.direct_reports?.length || 0}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2 break-all">
                    <FiMail className="w-4 h-4 text-gray-400" />
                    {selectedEmployee.email || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <FiPhone className="w-4 h-4 text-gray-400" />
                    {selectedEmployee.phone || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Joining Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedEmployee.join_date)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
