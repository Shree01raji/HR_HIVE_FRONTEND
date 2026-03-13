import React, { useState, useEffect } from 'react';
import { FiFileText, FiCheckCircle, FiEye, FiX, FiPlus, FiEdit2 } from 'react-icons/fi';
import { preEmploymentAPI, employeeAPI } from '../../services/api';

export default function PreEmploymentForms() {
  const [forms, setForms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ candidate_id: '', status: '' });
  const [selectedForm, setSelectedForm] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    field_key: '',
    label: '',
    field_type: 'text',
    section: 'Additional Information',
    placeholder: '',
    help_text: '',
    is_required: false,
    is_active: true,
    sort_order: 0,
    options_json: '[]',
    validations_json: '{}'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [formsData, employeesData, fieldConfigsData] = await Promise.all([
        preEmploymentAPI.getAllForms(null, filters.candidate_id || null, filters.status || null),
        employeeAPI.getAll(),
        preEmploymentAPI.getFieldConfigs(true)
      ]);
      setForms(Array.isArray(formsData) ? formsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setFieldConfigs(Array.isArray(fieldConfigsData) ? fieldConfigsData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load pre-employment forms');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (formId) => {
    try {
      await preEmploymentAPI.verifyForm(formId);
      await fetchData();
      setSelectedForm(null);
      alert('Form verified successfully!');
    } catch (err) {
      console.error('Error verifying form:', err);
      setError(err.response?.data?.detail || 'Failed to verify form');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const DetailItem = ({ label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div>
        <span className="text-sm text-gray-600">{label}:</span>
        <p className="font-medium break-words">{String(value)}</p>
      </div>
    );
  };

  const openCreateConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      field_key: '',
      label: '',
      field_type: 'text',
      section: 'Additional Information',
      placeholder: '',
      help_text: '',
      is_required: false,
      is_active: true,
      sort_order: 0,
      options_json: '[]',
      validations_json: '{}'
    });
    setShowConfigModal(true);
  };

  const openEditConfig = (cfg) => {
    setEditingConfig(cfg);
    setConfigForm({
      field_key: cfg.field_key || '',
      label: cfg.label || '',
      field_type: cfg.field_type || 'text',
      section: cfg.section || 'Additional Information',
      placeholder: cfg.placeholder || '',
      help_text: cfg.help_text || '',
      is_required: Boolean(cfg.is_required),
      is_active: Boolean(cfg.is_active),
      sort_order: Number(cfg.sort_order || 0),
      options_json: JSON.stringify(cfg.options || [], null, 2),
      validations_json: JSON.stringify(cfg.validations || {}, null, 2)
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      setError(null);

      let options;
      let validations;
      try {
        options = configForm.options_json ? JSON.parse(configForm.options_json) : null;
      } catch {
        throw new Error('Options must be valid JSON');
      }
      try {
        validations = configForm.validations_json ? JSON.parse(configForm.validations_json) : null;
      } catch {
        throw new Error('Validations must be valid JSON');
      }

      const payload = {
        field_key: configForm.field_key.trim(),
        label: configForm.label.trim(),
        field_type: configForm.field_type,
        section: configForm.section?.trim() || null,
        placeholder: configForm.placeholder?.trim() || null,
        help_text: configForm.help_text?.trim() || null,
        is_required: configForm.is_required,
        is_active: configForm.is_active,
        sort_order: Number(configForm.sort_order || 0),
        options,
        validations
      };

      if (editingConfig) {
        const updatePayload = { ...payload };
        delete updatePayload.field_key;
        await preEmploymentAPI.updateFieldConfig(editingConfig.field_id, updatePayload);
      } else {
        await preEmploymentAPI.createFieldConfig(payload);
      }

      setShowConfigModal(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save field config');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pre-employment Forms</h1>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configurable Pre-employment Fields</h2>
            <p className="text-sm text-gray-600">Add or edit custom fields shown in candidate pre-employment form.</p>
          </div>
          <button
            onClick={openCreateConfig}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Field
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Key</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Label</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Section</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Required</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Active</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldConfigs.map((cfg) => (
                <tr key={cfg.field_id}>
                  <td className="px-4 py-2 text-sm font-mono text-gray-700">{cfg.field_key}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{cfg.label}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{cfg.field_type}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{cfg.section || 'Additional Information'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{cfg.is_required ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{cfg.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openEditConfig(cfg)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit field"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {forms.map((form) => (
          <div key={form.form_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{form.first_name} {form.last_name}</h3>
                <p className="text-sm text-gray-600">
                  {form.personal_email} • {form.personal_phone}
                </p>
                {form.expected_ctc && (
                  <p className="text-sm text-teal-600 font-medium mt-1">
                    Expected CTC: ₹{parseFloat(form.expected_ctc).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(form.status)}`}>
                {form.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              {form.pan_number && (
                <div>
                  <span className="text-gray-600">PAN:</span>
                  <span className="font-medium ml-2">{form.pan_number}</span>
                </div>
              )}
              {form.bank_account_number && (
                <div>
                  <span className="text-gray-600">Bank Account:</span>
                  <span className="font-medium ml-2">{form.bank_account_number}</span>
                </div>
              )}
              {form.expected_joining_date && (
                <div>
                  <span className="text-gray-600">Joining Date:</span>
                  <span className="font-medium ml-2">{new Date(form.expected_joining_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedForm(form)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <FiEye className="w-4 h-4" />
                View Details
              </button>
              {form.status === 'submitted' && (
                <button
                  onClick={() => handleVerify(form.form_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Verify
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Form Details</h2>
              <button onClick={() => setSelectedForm(null)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Name" value={`${selectedForm.first_name || ''} ${selectedForm.middle_name || ''} ${selectedForm.last_name || ''}`.replace(/\s+/g, ' ').trim()} />
                <DetailItem label="Company Email" value={selectedForm.company_email} />
                <DetailItem label="Personal Email" value={selectedForm.personal_email} />
                <DetailItem label="Contact Number" value={selectedForm.personal_phone} />
                <DetailItem label="DOB" value={selectedForm.date_of_birth ? new Date(selectedForm.date_of_birth).toLocaleDateString() : ''} />
                <DetailItem label="DOJ" value={selectedForm.date_of_joining ? new Date(selectedForm.date_of_joining).toLocaleDateString() : ''} />
                <DetailItem label="Gender" value={selectedForm.gender} />
                <DetailItem label="Blood Group" value={selectedForm.blood_group} />
                <DetailItem label="Father Name" value={selectedForm.father_name} />
                <DetailItem label="Mother Name" value={selectedForm.mother_name} />
                <DetailItem label="Emergency Contact Name" value={selectedForm.emergency_contact_name} />
                <DetailItem label="Emergency Contact Number" value={selectedForm.emergency_contact_phone} />
                <DetailItem label="Aadhar" value={selectedForm.aadhaar_number} />
                <DetailItem label="PAN" value={selectedForm.pan_number} />
                <DetailItem label="UAN" value={selectedForm.uan_number} />
                <DetailItem label="ESI" value={selectedForm.esi_number} />
                <DetailItem label="Tax Regime" value={selectedForm.tax_regime} />
                <DetailItem label="Bank Name" value={selectedForm.bank_name} />
                <DetailItem label="Bank Account" value={selectedForm.bank_account_number} />
                <DetailItem label="IFSC" value={selectedForm.ifsc_code} />
                <DetailItem label="Current Address" value={selectedForm.current_address} />
                <DetailItem label="Permanent Address" value={selectedForm.permanent_address} />
                {selectedForm.expected_ctc && (
                  <div>
                    <span className="text-sm text-gray-600">Expected CTC:</span>
                    <p className="font-medium text-teal-600">₹{parseFloat(selectedForm.expected_ctc).toLocaleString('en-IN')}</p>
                  </div>
                )}
                {selectedForm.custom_fields && Object.entries(selectedForm.custom_fields).map(([key, value]) => (
                  <DetailItem key={key} label={`Custom: ${key}`} value={typeof value === 'object' ? JSON.stringify(value) : value} />
                ))}
              </div>
              {selectedForm.status === 'submitted' && (
                <button
                  onClick={() => handleVerify(selectedForm.form_id)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Verify Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingConfig ? 'Edit Field' : 'Add Field'}</h2>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Key</label>
                <input
                  value={configForm.field_key}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, field_key: e.target.value }))}
                  disabled={Boolean(editingConfig)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="example: emergency_email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  value={configForm.label}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={configForm.field_type}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, field_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="select">select</option>
                  <option value="checkbox">checkbox</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input
                  value={configForm.section}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, section: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={configForm.sort_order}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input
                  value={configForm.placeholder}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, placeholder: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
                <input
                  value={configForm.help_text}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, help_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Options JSON (for select)</label>
                <textarea
                  rows={4}
                  value={configForm.options_json}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, options_json: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Validations JSON</label>
                <textarea
                  rows={3}
                  value={configForm.validations_json}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, validations_json: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cfg-required"
                  type="checkbox"
                  checked={configForm.is_required}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, is_required: e.target.checked }))}
                />
                <label htmlFor="cfg-required" className="text-sm text-gray-700">Required</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cfg-active"
                  type="checkbox"
                  checked={configForm.is_active}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="cfg-active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingConfig ? 'Saving...' : 'Save Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}