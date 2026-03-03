import React, { useState, useEffect } from 'react';
import { teamAPI } from '../../../services/api';
import { FiCheckCircle, FiUser, FiFilter, FiSearch, FiArrowDown } from 'react-icons/fi';

export default function ApprovalHierarchy() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await teamAPI.getApprovalHierarchy(null, selectedType || null);
      setData(Array.isArray(result) ? result : [result]);
    } catch (err) {
      console.error('Error fetching approval hierarchy:', err);
      setError(err.response?.data?.detail || 'Failed to load approval hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const getApprovalTypeColor = (type) => {
    const colors = {
      leave: 'bg-green-100 text-green-700 border-green-300',
      expense: 'bg-blue-100 text-blue-700 border-blue-300',
      payroll: 'bg-purple-100 text-purple-700 border-purple-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getApprovalTypeIcon = (type) => {
    return <FiCheckCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approval hierarchy...</p>
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
        <FiCheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No approval hierarchy found</p>
      </div>
    );
  }

  // Filter data by search term
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.employee_name?.toLowerCase().includes(search) ||
      item.approval_type?.toLowerCase().includes(search) ||
      item.hierarchy.some((h) =>
        h.approver_name?.toLowerCase().includes(search) ||
        h.approver_role?.toLowerCase().includes(search)
      )
    );
  });

  // Group by employee
  const groupedByEmployee = filteredData.reduce((acc, item) => {
    if (!acc[item.employee_id]) {
      acc[item.employee_id] = {
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        hierarchies: [],
      };
    }
    acc[item.employee_id].hierarchies.push(item);
    return acc;
  }, {});

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
                placeholder="Search by employee or approver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <FiFilter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="leave">Leave</option>
                <option value="expense">Expense</option>
                <option value="payroll">Payroll</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Hierarchies */}
      <div className="space-y-6">
        {Object.values(groupedByEmployee).map((group) => (
          <div key={group.employee_id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUser className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{group.employee_name}</h3>
                <p className="text-sm text-gray-500">Employee ID: {group.employee_id}</p>
              </div>
            </div>

            <div className="space-y-4">
              {group.hierarchies.map((hierarchy, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getApprovalTypeColor(
                        hierarchy.approval_type
                      )}`}
                    >
                      {getApprovalTypeIcon(hierarchy.approval_type)}
                      <span className="ml-1 capitalize">{hierarchy.approval_type}</span>
                    </span>
                    {hierarchy.current_approver && (
                      <span className="text-xs text-gray-500">
                        Current: {hierarchy.current_approver.approver_name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {hierarchy.hierarchy.map((level, levelIdx) => (
                      <div key={levelIdx} className="flex items-center space-x-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {level.level}
                          </div>
                          {levelIdx < hierarchy.hierarchy.length - 1 && (
                            <FiArrowDown className="w-4 h-4 text-gray-400 my-1" />
                          )}
                        </div>
                        
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <FiUser className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{level.approver_name}</p>
                                <p className="text-xs text-gray-600">
                                  {level.approver_designation || 'N/A'} • {level.approver_role}
                                </p>
                              </div>
                            </div>
                            {level.is_required && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
