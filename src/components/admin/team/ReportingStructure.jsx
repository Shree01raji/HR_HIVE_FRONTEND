import React, { useState, useEffect } from 'react';
import { teamAPI } from '../../../services/api';
import { FiGitBranch, FiUser, FiUsers, FiSearch, FiFilter } from 'react-icons/fi';

export default function ReportingStructure() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [selectedDepartment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await teamAPI.getReportingStructure(null, selectedDepartment || null);
      setData(Array.isArray(result) ? result : [result]);
      // Auto-expand root nodes
      if (Array.isArray(result) && result.length > 0) {
        const rootIds = result.map(emp => emp.employee_id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (err) {
      console.error('Error fetching reporting structure:', err);
      setError(err.response?.data?.detail || 'Failed to load reporting structure');
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

    // Filter by search term
    const name = `${node.employee_name || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) ||
      node.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.department?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch && level === 0) {
      return null;
    }

    return (
      <div key={node.employee_id} className="relative">
        <div className="flex items-start" style={{ marginLeft: `${level * 48}px` }}>
          {/* Tree connector lines */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center" style={{ left: `${level * 48 - 24}px`, width: '24px' }}>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="w-3 h-px bg-gray-300"></div>
            </div>
          )}
          
          {/* Employee Card */}
          <div className="flex-1 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-blue-500 mb-3">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {node.employee_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  
                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {node.employee_name || 'Unknown'}
                      </h3>
                      {node.total_reports > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex-shrink-0">
                          {node.total_reports}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {node.designation || 'N/A'}
                    </p>
                    {node.department && (
                      <p className="text-xs text-gray-400 truncate">
                        {node.department}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                {hasReports && (
                  <button
                    onClick={() => toggleNode(node.employee_id)}
                    className="ml-2 p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <FiUsers className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FiUsers className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Direct Reports */}
        {isExpanded && hasReports && (
          <div className="relative">
            {node.direct_reports.map((report) => (
              <div key={report.employee_id}>
                {renderNode(report, level + 1)}
              </div>
            ))}
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
          <p className="mt-4 text-gray-600">Loading reporting structure...</p>
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FiGitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No reporting structure found</p>
      </div>
    );
  }

  // Get unique departments from data
  const departments = [...new Set(
    data.flatMap(emp => {
      const depts = [];
      const collectDepts = (node) => {
        if (node.department) depts.push(node.department);
        if (node.direct_reports) {
          node.direct_reports.forEach(collectDepts);
        }
      };
      collectDepts(emp);
      return depts;
    })
  )];

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <FiSearch className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, designation, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <FiFilter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reporting Structure Tree */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="space-y-6">
          {data.map((root) => (
            <div key={root.employee_id} className="relative">
              {renderNode(root, 0)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
