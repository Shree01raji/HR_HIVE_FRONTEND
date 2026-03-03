import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiUserPlus, FiMail, FiBriefcase, FiCalendar, FiLock } from 'react-icons/fi';
import { employeeAPI } from '../../services/api';
import api from '../../services/api';
import UpgradePrompt from '../../components/admin/UpgradePrompt';
import { useUpgradePrompt } from '../../hooks/useUpgradePrompt';

const defaultFormState = {
  first_name: '',
  last_name: '',
  personal_email: '',
  department: '',
  designation: '',
  role: 'EMPLOYEE',
  joining_date: '',
  password: '',
  manager_id: '',
};

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label:'Manager'}
];
 
const formatApiError = (err) => {
  const detail = err?.response?.data?.detail;
  if (!detail) {
    return err?.message || 'Failed to create employee';
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
    return 'Failed to create employee';
  }
};
 
export default function EmployeeCreate() {
  const navigate = useNavigate();
  const { upgradePrompt, handleError, closePrompt } = useUpgradePrompt();
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [companyEmailDomain, setCompanyEmailDomain] = useState(
    import.meta.env.VITE_COMPANY_EMAIL_DOMAIN || 'klareit.com'
  );
  
  // Fetch company email domain from settings and managers list
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const response = await api.get('/settings/');
        if (response.data && response.data.company_email_domain) {
          setCompanyEmailDomain(response.data.company_email_domain);
        }
      } catch (err) {
        console.warn('Failed to fetch settings, using default email domain:', err);
      }

      // Fetch managers (all active employees)
      try {
        setLoadingManagers(true);
        const managersResponse = await employeeAPI.getAll();
        setManagers(managersResponse || []);
      } catch (err) {
        console.error('Failed to fetch managers:', err);
        setManagers([]);
      } finally {
        setLoadingManagers(false);
      }
    };
    
    fetchData();
  }, []);
  
  const previewEmail = generatePreviewCompanyEmail(form.first_name, form.last_name, companyEmailDomain);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.personal_email.trim() || !form.department.trim() || !form.joining_date) {
      setError('First name, last name, personal email, department, and joining date are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        designation: form.designation?.trim() || null,
        password: form.password.trim(),
        joining_date: new Date(form.joining_date).toISOString(),
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      };

      const data = await employeeAPI.create(payload);
      setSuccess(`Employee ${data.first_name} ${data.last_name} created successfully. Credentials have been emailed to ${form.personal_email}.`);

      // Give a short delay for the success message then navigate back
      setTimeout(() => {
        navigate('/admin/employees');
      }, 1500);
    } catch (err) {
      const apiMessage = err.response?.data?.detail || err.message || 'Failed to create employee';
      
      // Check if it's a limit exceeded error and show upgrade prompt
      const handled = await handleError(err, 'MAX_EMPLOYEES');
      if (!handled) {
        // Not a limit error or couldn't show prompt, show regular error
        setError(apiMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/employees')}
            className="p-2 bg-white shadow rounded-lg text-blue-600 hover:bg-blue-50 transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiUserPlus className="w-6 h-6 text-blue-600" />
              Add New Employee
            </h1>
            <p className="text-sm text-gray-500">Provision access and trigger the onboarding workflow.</p>
          </div>
        </div>
        <Link
          to="/admin/employees"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Back to Employees
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
                <FiUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
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
                Login credentials will be sent to this email address.
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
              <p className="mt-2 text-xs text-gray-500">
                Job title shown on the org chart.
              </p>
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
              <p className="mt-2 text-xs text-gray-500">
                New hires start as preboarding candidates. Once their onboarding is approved, they&apos;ll
                be promoted automatically to this role.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => updateField('joining_date', e.target.value)}
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temporary Password <span className="text-xs text-gray-400">(leave blank to auto-generate)</span>
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50/30"
                  placeholder="Optional temporary password"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                The employee will be prompted to reset their password on first login. Credentials are emailed automatically.
              </p>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-gray-700">
            <p className="font-semibold text-blue-700">Generated company email</p>
            <p className="mt-1">{previewEmail} (final email may include a numeric suffix if needed)</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/employees')}
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
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>

      {/* Upgrade Prompt Modal */}
      {upgradePrompt && (
        <UpgradePrompt
          {...upgradePrompt}
          onClose={closePrompt}
        />
      )}
    </div>
  );
}


function generatePreviewCompanyEmail(firstName, lastName, emailDomain = 'klareit.com') {
  // Use only first name for email generation
  const slug = slugify(firstName.trim());
  return `${slug || 'new.hire'}@${emailDomain}`;
}

function slugify(value) {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
}


