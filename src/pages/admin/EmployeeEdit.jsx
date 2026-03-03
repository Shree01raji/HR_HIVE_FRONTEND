import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiMail, FiBriefcase, FiCalendar, FiLock } from 'react-icons/fi';
import { employeeAPI } from '../../services/api';
import api from '../../services/api';

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const formatApiError = (err) => {
  const detail = err?.response?.data?.detail;
  if (!detail) {
    return err?.message || 'Failed to update employee';
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const loc = Array.isArray(item.loc) ? item.loc.join('.') : item.loc;
        return loc ? `${loc}: ${item.msg}` : item.msg;
      })
      .join('; ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  try {
    return JSON.stringify(detail);
  } catch (e) {
    return 'Failed to update employee';
  }
};

export default function EmployeeEdit() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    personal_email: '',
    department: '',
    designation: '',
    role: 'EMPLOYEE',
    join_date: '',
    manager_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [companyEmailDomain, setCompanyEmailDomain] = useState(
    import.meta.env.VITE_COMPANY_EMAIL_DOMAIN || 'klareit.com'
  );

  // Fetch employee data and settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch employee data
        const employeeData = await employeeAPI.get(parseInt(employeeId));
        
        // Format join_date for date input (YYYY-MM-DD)
        const joinDate = employeeData.join_date 
          ? new Date(employeeData.join_date).toISOString().split('T')[0]
          : '';

        setForm({
          first_name: employeeData.first_name || '',
          last_name: employeeData.last_name || '',
          personal_email: employeeData.personal_email || employeeData.email || '',
          department: employeeData.department || '',
          designation: employeeData.designation || '',
          role: employeeData.role || 'EMPLOYEE',
          join_date: joinDate,
          manager_id: employeeData.manager_id || '',
        });

        // Fetch company email domain from settings
        try {
          const response = await api.get('/settings/');
          if (response.data && response.data.company_email_domain) {
            setCompanyEmailDomain(response.data.company_email_domain);
          }
        } catch (err) {
          console.warn('Failed to fetch settings, using default email domain:', err);
        }

        // Fetch managers (all active employees except current employee)
        try {
          setLoadingManagers(true);
          const managersResponse = await employeeAPI.getAll();
          const filteredManagers = (managersResponse || []).filter(
            (emp) => emp.employee_id !== parseInt(employeeId)
          );
          setManagers(filteredManagers);
        } catch (err) {
          console.error('Failed to fetch managers:', err);
          setManagers([]);
        } finally {
          setLoadingManagers(false);
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchData();
    }
  }, [employeeId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.personal_email.trim() || !form.department.trim() || !form.join_date) {
      setError('First name, last name, personal email, department, and joining date are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        personal_email: form.personal_email.trim(),
        department: form.department.trim(),
        designation: form.designation?.trim() || null,
        role: form.role,
        join_date: form.join_date || null, // YYYY-MM-DD; backend coerces to date
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      };

      const data = await employeeAPI.update(parseInt(employeeId), payload);
      setSuccess(`Employee ${data.first_name} ${data.last_name} updated successfully.`);

      // Give a short delay for the success message then navigate back
      setTimeout(() => {
        navigate(`/admin/employees/${employeeId}`);
      }, 1500);
    } catch (err) {
      // const apiMessage = err.response?.data?.detail || err.message || 'Failed to update employee';
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/admin/employees/${employeeId}`)}
            className="p-2 bg-white shadow rounded-lg text-blue-600 hover:bg-blue-50 transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiEdit className="w-6 h-6 text-blue-600" />
              Edit Employee
            </h1>
            <p className="text-sm text-gray-500">Update employee information and role.</p>
          </div>
        </div>
        <Link
          to={`/admin/employees/${employeeId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Back to Profile
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-8 max-w-3xl mx-auto">
        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 border border-green-200 bg-green-50 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <div className="relative">
                <FiEdit className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                  placeholder="Jane"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                className="w-full px-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                placeholder="Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="email"
                  value={form.personal_email}
                  onChange={(e) => updateField('personal_email', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                  placeholder="jane.doe@gmail.com"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Personal email address for the employee.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
                className="w-full px-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                placeholder="e.g. Engineering"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => updateField('designation', e.target.value)}
                className="w-full px-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                placeholder="e.g. Software Engineer, Product Manager"
              />
              <p className="mt-2 text-xs text-gray-500">Job title shown on the org chart.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <select
                  value={form.role}
                  onChange={(e) => updateField('role', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30 appearance-none"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.role === 'ACCOUNTANT' && (
                <p className="mt-2 text-xs text-blue-600 italic">
                  Note: Accountants will have access to timesheet and payroll modules via RBAC permissions.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="date"
                  value={form.join_date}
                  onChange={(e) => updateField('join_date', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <select
                  value={form.manager_id}
                  onChange={(e) => updateField('manager_id', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30 appearance-none"
                  disabled={loadingManagers}
                >
                  <option value="">No Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.employee_id} value={manager.employee_id}>
                      {manager.first_name} {manager.last_name} {manager.designation ? `(${manager.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Select the employee&apos;s reporting manager for team structure.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/admin/employees/${employeeId}`)}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

