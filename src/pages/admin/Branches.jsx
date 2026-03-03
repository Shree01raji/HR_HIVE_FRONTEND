import React, { useEffect, useMemo, useState } from 'react';
import { FiGitBranch, FiPlus, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { branchesAPI } from '../../services/api';

const normalizeCode = (value) => (value || '').trim().toLowerCase();

export default function Branches() {
  const organizationSlug = localStorage.getItem('selectedOrganization') || '';
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [employeeLimit, setEmployeeLimit] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedBranchCode = localStorage.getItem('selectedBranchCode') || '';

  const loadBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await branchesAPI.list();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const canCreate = useMemo(() => {
    return (
      normalizeCode(code).length >= 2 &&
      name.trim().length > 0 &&
      adminEmail.trim().length > 0
    );
  }, [code, name, adminEmail]);

  const handleCreate = async () => {
    setError('');
    const normalized = normalizeCode(code);

    if (!organizationSlug) {
      setError('Please select organization first.');
      return;
    }

    if (!normalized) {
      setError('Branch code is required.');
      return;
    }

    try {
      setSaving(true);
      const created = await branchesAPI.create({
        code: normalized,
        name: name.trim(),
        location: location.trim() || null,
        admin_email: adminEmail.trim(),
        admin_phone: adminPhone.trim() || null,
        employee_limit: Number(employeeLimit) || 0,
      });

      localStorage.setItem('selectedBranchCode', created.code);
      setCode('');
      setName('');
      setLocation('');
      setAdminEmail('');
      setAdminPhone('');
      setEmployeeLimit('0');
      await loadBranches();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create branch');
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = (branchCode) => {
    localStorage.setItem('selectedBranchCode', branchCode);
    setBranches((prev) => [...prev]);
  };

  const handleDelete = async (branchCode) => {
    try {
      await branchesAPI.remove(branchCode);
      const active = localStorage.getItem('selectedBranchCode');
      if (active === branchCode) {
        localStorage.removeItem('selectedBranchCode');
      }
      await loadBranches();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete branch');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-50 border border-gray-200 rounded-2xl shadow-sm text-gray-900 dark:text-gray-900">
      <div className="flex items-center gap-3 mb-6">
        <FiGitBranch className="w-6 h-6 text-[#1e3a5f]" />
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Branch Management</h1>
      </div>

      <div className="bg-white dark:bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-600">
          Organization: <span className="font-medium text-gray-900">{organizationSlug || 'Not selected'}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Active Branch: <span className="font-medium text-gray-900">{selectedBranchCode || 'Not selected'}</span>
        </p>
      </div>

      <div className="bg-white dark:bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create Branch</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Branch code (001, company1)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Branch name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="Branch admin email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
            placeholder="Branch admin phone"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            min="0"
            value={employeeLimit}
            onChange={(e) => setEmployeeLimit(e.target.value)}
            placeholder="Number of employees"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="md:col-span-3">
          <button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg disabled:opacity-50"
          >
            <FiPlus className="w-4 h-4" /> {saving ? 'Creating...' : 'Create'}
          </button>
          </div>
        </div>
        {error ? <p className="text-red-600 text-sm mt-3">{error}</p> : null}
      </div>

      <div className="bg-white dark:bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Branches</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading branches...</p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-gray-500">No branches created yet.</p>
        ) : (
          <div className="space-y-2">
            {branches.map((item) => {
              const isActive = selectedBranchCode === item.code;
              return (
                <div key={item.code} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.code}</p>
                    <p className="text-xs text-gray-500">{item.name || 'No name'}</p>
                    <p className="text-xs text-gray-500">Location: {item.location || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Admin: {item.admin_email}</p>
                    <p className="text-xs text-gray-500">Phone: {item.admin_phone || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Employees: {item.current_employees}/{item.employee_limit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelect(item.code)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#1e3a5f] text-[#1e3a5f] rounded"
                    >
                      {isActive ? <FiCheckCircle className="w-4 h-4" /> : null}
                      {isActive ? 'Selected' : 'Select'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.code)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded"
                    >
                      <FiTrash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

