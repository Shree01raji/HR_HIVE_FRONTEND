import React, { useState, useEffect, useMemo } from 'react';
import { employeeAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import { FiEye, FiSearch, FiFilter, FiCheckCircle, FiAlertCircle, FiClock, FiTrash2 } from 'react-icons/fi';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // CRITICAL: Ensure employees state is always an array - defensive check
  useEffect(() => {
    if (!Array.isArray(employees)) {
      console.error('[Employees] ⚠️ CRITICAL: employees state is not an array! Resetting to empty array.', employees);
      setEmployees([]);
    }
  }, [employees]);
  
  // CRITICAL: Additional safety - ensure employees is always an array before any operations
  const safeEmployees = useMemo(() => {
    if (!Array.isArray(employees)) {
      console.warn('[Employees] ⚠️ employees is not an array, using empty array');
      return [];
    }
    return employees;
  }, [employees]);

  const formatRole = (role) => {
    if (!role) return '—';
    return role
      .toLowerCase()
      .split('_')
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeAPI.getAll();
      
      // Debug logging
      console.log('[Employees] API response type:', typeof data);
      console.log('[Employees] Is array?', Array.isArray(data));
      console.log('[Employees] Data:', data);
      
      // CRITICAL: Ensure data is an array - multiple layers of protection
      let employeesArray = [];
      
      if (data == null) {
        console.warn('[Employees] ⚠️ Data is null/undefined, using empty array');
        employeesArray = [];
      } else if (Array.isArray(data)) {
        employeesArray = data;
      } else if (typeof data === 'object' && Array.isArray(data.data)) {
        console.log('[Employees] ✅ Found nested data array');
        employeesArray = data.data;
      } else if (typeof data === 'object' && Array.isArray(data.employees)) {
        console.log('[Employees] ✅ Found employees array');
        employeesArray = data.employees;
      } else {
        console.error('[Employees] ❌ CRITICAL: Data is not an array and cannot be normalized!', typeof data, data);
        employeesArray = [];
      }
      
      // Additional safety check - filter out any non-object items
      const safeEmployeesArray = employeesArray.filter(item => item != null && typeof item === 'object');
      
      console.log('[Employees] ✅ Safe employees array length:', safeEmployeesArray.length);
      console.log('[Employees] ✅ Final array type check:', Array.isArray(safeEmployeesArray));
      
      // CRITICAL: Final check before setting state
      if (!Array.isArray(safeEmployeesArray)) {
        console.error('[Employees] 🚨 CRITICAL: safeEmployeesArray is still not an array! Forcing to empty array.');
        setEmployees([]);
      } else {
        setEmployees(safeEmployeesArray);
      }
      setLoading(false);
    } catch (err) {
      console.error('[Employees] Error fetching employees:', err);
      setError('Failed to load employees');
      setEmployees([]); // Set empty array on error
      setLoading(false);
    }
  };

  const getEmployeeDocumentStatus = async (employeeId) => {
    try {
      // This would need a new endpoint to get employee's document status
      // For now, we'll use a placeholder
      return 'pending'; // or 'verified', 'active'
    } catch (err) {
      return 'unknown';
    }
  };

  const handleDelete = async (employeeId, employeeName) => {
    const confirmMessage = `Are you sure you want to delete ${employeeName || 'this employee'}? This action will deactivate the employee and cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        await employeeAPI.delete(employeeId);
        
        // Update the employees list in real-time by removing the deleted employee
        setEmployees(prevEmployees => {
          if (!Array.isArray(prevEmployees)) return [];
          return prevEmployees.filter(emp => emp?.employee_id !== employeeId);
        });
        
        // Show success message
        alert(`Employee ${employeeName || 'deleted'} successfully removed from the system.`);
      } catch (err) {
        console.error('Error deleting employee:', err);
        alert(err.response?.data?.detail || 'Failed to delete employee. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') {
      return { text: '✅ Active', color: 'bg-green-100 text-green-800' };
    } else if (status === 'PENDING_DOCS') {
      return { text: '⚠️ Pending Docs', color: 'bg-yellow-100 text-yellow-800' };
    } else if (status === 'ONBOARDING') {
      return { text: '⏳ Onboarding', color: 'bg-blue-100 text-blue-800' };
    }
    return { text: '❌ Inactive', color: 'bg-red-100 text-red-800' };
  };

  const filteredAndSortedEmployees = useMemo(() => {
    // CRITICAL: Use safeEmployees to ensure we always have an array
    const employeesArray = safeEmployees;
    if (!Array.isArray(employeesArray) || employeesArray.length === 0) return [];
    
    return employeesArray
      .filter(emp => {
        if (!emp || typeof emp !== 'object') return false;
        const matchesSearch = 
          (emp.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          `EMP${String(emp.employee_id || '').padStart(3, '0')}`.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
        const matchesStatus = !statusFilter || emp.status === statusFilter;
        
        return matchesSearch && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => {
        let aVal, bVal;
        if (sortBy === 'name') {
          aVal = `${a?.first_name || ''} ${a?.last_name || ''}`;
          bVal = `${b?.first_name || ''} ${b?.last_name || ''}`;
        } else if (sortBy === 'department') {
          aVal = a?.department || '';
          bVal = b?.department || '';
        } else if (sortBy === 'date') {
          aVal = new Date(a?.hire_date || 0);
          bVal = new Date(b?.hire_date || 0);
        } else {
          aVal = a?.[sortBy] || '';
          bVal = b?.[sortBy] || '';
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
  }, [safeEmployees, searchTerm, departmentFilter, statusFilter, sortBy, sortOrder]);

  const departments = [...new Set(safeEmployees.map(emp => emp?.department || 'Unassigned'))].sort();

  const groupedEmployees = useMemo(() => {
    if (!Array.isArray(filteredAndSortedEmployees)) {
      return [];
    }
    
    const groups = filteredAndSortedEmployees.reduce((acc, employee) => {
      if (!employee) return acc;
      const dept = employee.department?.trim() || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(employee);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
      .map(([department, members]) => {
        if (!Array.isArray(members)) {
          return {
            department,
            members: [],
            activeCount: 0,
            preboardingCount: 0,
          };
        }
        
        const sortedMembers = members.sort((a, b) =>
          `${a?.first_name || ''} ${a?.last_name || ''}`.localeCompare(`${b?.first_name || ''} ${b?.last_name || ''}`)
        );

        const activeCount = Array.isArray(sortedMembers) ? sortedMembers.filter((member) => member?.status === 'ACTIVE').length : 0;

        const preboardingCount = Array.isArray(sortedMembers) ? sortedMembers.filter((member) => !member?.is_onboarded).length : 0;

        return {
          department,
          members: sortedMembers,
          activeCount,
          preboardingCount,
        };
      });
  }, [filteredAndSortedEmployees]);

  if (loading) return <div className="p-4">Loading employees...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  
  // Additional safety - if employees state is corrupted, reset it
  if (!Array.isArray(employees)) {
    console.error('[Employees] Employees state is not an array! Resetting...', employees);
    setEmployees([]);
    return <div className="p-4">Loading employees...</div>;
  }

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredAndSortedEmployees.length} employees across {groupedEmployees.length} departments
          </p>
        </div>
        <Link
          to="/admin/employees/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Add Employee
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, ID, email, department..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_DOCS">Pending Docs</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="date-desc">Sort: Newest First</option>
            <option value="date-asc">Sort: Oldest First</option>
            <option value="department-asc">Sort: Department</option>
          </select>
        </div>
      </div>

      {/* Department wise view */}
      <div className="space-y-6">
        {groupedEmployees.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
            No employees match the current filters.
          </div>
        )}

        {groupedEmployees.map(({ department, members, activeCount, preboardingCount }) => (
          <div key={department} className="bg-white rounded-2xl shadow border border-blue-100/40 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-blue-100/50">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{department}</h2>
                <p className="text-sm text-gray-500">
                  {members.length} member{members.length !== 1 ? 's' : ''} · {activeCount} active
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                  {Array.isArray(members) ? members.filter((member) => member?.role === 'ADMIN').length : 0} Admin
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700">
                  {Array.isArray(members) ? members.filter((member) => member?.role === 'HR_MANAGER').length : 0} HR
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                  {Array.isArray(members) ? members.filter((member) => member?.role === 'EMPLOYEE').length : 0} Employees
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                  {preboardingCount} Preboarding
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
              {(Array.isArray(members) ? members : []).map((employee) => {
                const statusBadge = getStatusBadge(employee.status);
                const joiningDate = employee.join_date
                  ? new Date(employee.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—';
                const currentRole = formatRole(employee.role);
                const targetRole =
                  employee.target_role && employee.target_role !== employee.role
                    ? formatRole(employee.target_role)
                    : null;
                
                return (
                  <div key={employee.employee_id} className="border border-blue-100 rounded-xl p-4 hover:shadow-lg transition bg-blue-50/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-blue-500 font-semibold">
                        EMP{String(employee.employee_id).padStart(3, '0')}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900">
                        {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                        {employee.personal_email && (
                          <p className="text-xs text-gray-400">{employee.personal_email}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusBadge.color}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        {currentRole}
                      </span>
                      {targetRole && (
                        <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                          Target: {targetRole}
                        </span>
                      )}
                      <span>Joined: {joiningDate}</span>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <Link
                        to={`/admin/employees/${employee.employee_id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <FiEye className="w-4 h-4" />
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleDelete(employee.employee_id, `${employee.first_name} ${employee.last_name}`)}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        title="Delete Employee"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        ))}
      </div>
    </div>
  );
}