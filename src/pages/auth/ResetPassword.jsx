import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const defaultState = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

export default function ResetPassword() {
  const { changePassword, user, mustResetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const redirectToDashboard = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const isAccountant = localStorage.getItem('isAccountant') === 'true';
    
    if (user.role === 'ADMIN' || user.role === 'HR_MANAGER') {
      navigate('/admin');
    } else if (user.role === 'CANDIDATE') {
      if (user.employee_id && user.is_onboarded === false) {
        navigate('/candidate/onboarding');
      } else {
        navigate('/candidate');
      }
    } else if (isAccountant) {
      // Accountants should access admin panel (with RBAC restrictions)
      navigate('/admin');
    } else {
      navigate('/employee');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError('Please complete all fields.');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation must match.');
      return;
    }

    try {
      setSubmitting(true);
      await changePassword(form);
      setSuccess('Password updated successfully. Redirecting to your dashboard...');
      setTimeout(() => {
        redirectToDashboard();
      }, 1200);
    } catch (err) {
      const apiMessage = err.response?.data?.detail || err.message || 'Failed to update password';
      setError(apiMessage);
    } finally {
      setSubmitting(false);
      setForm(defaultState);
    }
  };

  return (
        <div className="min-h-screen bg-[#e8f0f5] grid grid-cols-1 lg:grid-cols-[35%_65%] relative overflow-hidden">

      <div className="hidden lg:flex items-center justify-center bg-[#181c52]">
    
       <img
    src="/images/HR-HIVE (1).png"
    alt="HR Hive"
    className="max-w-md w-full object-contain"
  />
      </div>
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 relative">

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-down">
        <h2 className="mt-6 text-center text-3xl font-bold text-[#181c52]  ">
          {mustResetPassword ? 'Set Your New Password' : 'Change Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-black-300">
          {mustResetPassword
            ? 'For security, please update the temporary password you used to sign in.'
            : 'Update your account password.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-[#e8f0f5]  py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-700/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-600 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-600 bg-green-900/20 px-4 py-3 text-sm text-green-300">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#181c52] mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={form.current_password}
                onChange={(e) => updateField('current_password', e.target.value)}
                className="w-full px-3 py-3 border border-gray-600 rounded-xl focus:ring-2 transition-all"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#181c52] mb-2">
                New Password
              </label>
              <input
                type="password"
                value={form.new_password}
                onChange={(e) => updateField('new_password', e.target.value)}
                className="w-full px-3 py-3 border border-gray-600 rounded-xl focus:ring-2 transition-all"
                placeholder="Create a new password"
                required
              />
              <p className="mt-2 text-xs text-gray-400">
                Use at least 8 characters with a mix of letters, numbers, and symbols.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#181c52]  mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
                className="w-full px-3 py-3 border border-gray-600 rounded-xl focus:ring-2 transition-all"
                placeholder="Re-enter the new password"
                required
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#181c52] text-white hover:bg-[#181c52] text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:bg-[#181c52] text-white disabled:opacity-60 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
              {!mustResetPassword && (
                <button
                  type="button"
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-600 rounded-xl text-sm font-semibold text-[#181c52]  transition-all"
                  onClick={redirectToDashboard}
                  disabled={submitting}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}

