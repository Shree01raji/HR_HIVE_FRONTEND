import React, { useState, useEffect } from 'react';
import { FiSave, FiCheckCircle } from 'react-icons/fi';
import { preEmploymentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const INITIAL_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  father_name: '',
  mother_name: '',
  marital_status: '',
  date_of_birth: '',
  date_of_joining: '',
  age: '',
  gender: '',
  blood_group: '',
  employee_code: '',
  // photo_url: '',
  company_email: '',
  personal_email: '',
  personal_phone: '',
  alternate_phone: '',
  location: '',
  family_member_name: '',
  family_relationship: '',
  wedding_date: '',
  nominee_name: '',
  nominee_relation: '',
  allergies: '',
  educational_qualification: '',
  highest_degree: '',
  specialization: '',
  university_name: '',
  previous_experience: '',
  designation: '',
  emergency_contact_phone: '',
  emergency_contact_name: '',
  emergency_contact_relation: '',
  emergency_contact_address: '',
  aadhaar_number: '',
  pan_number: '',
  uan_number: '',
  esi_number: '',
  tax_regime: '',
  medical_insurance_policy_number: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_type: '',
  ifsc_code: '',
  account_holder_name: '',
  current_address: '',
  permanent_address: '',
  state: '',
  city: '',
  pin_code: '',
  expected_ctc: '',
  expected_joining_date: '',
  notice_period_days: '',
  current_employer: '',
  current_designation: '',
  passport_number: ''
};

export default function PreEmploymentForm({ onSubmitted = null, showHeading = true }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(null);
  const [fieldConfigs, setFieldConfigs] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Redirect if already filled (for EMPLOYEE)
  useEffect(() => {
    if (
      user?.role === 'EMPLOYEE' &&
      form &&
      (form.status === 'submitted' || form.status === 'verified' || form.status === 'approved') &&
      location.pathname.startsWith('/employee/onboarding/pre-employment-form')
    ) {
      navigate('/employee/onboarding', { replace: true });
    }
  }, [user, form, location.pathname, navigate]);

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const hydrate = (data) => {
    const hydrated = { ...INITIAL_FORM };
    Object.keys(hydrated).forEach((key) => {
      hydrated[key] = data?.[key] ?? '';
    });
    return hydrated;
  };

  const fetchBootstrap = async () => {
    try {
      setLoading(true);
      const [data, configs] = await Promise.all([
        preEmploymentAPI.getMyForm(),
        preEmploymentAPI.getFieldConfigs(false)
      ]);

      setFieldConfigs(Array.isArray(configs) ? configs : []);

      if (data) {
        setForm(data);
        setFormData(hydrate(data));
        setCustomFieldValues(data.custom_fields || {});
      } else {
        setForm(null);
        setFormData((prev) => ({
          ...prev,
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          personal_email: user?.email || '',
          company_email: user?.email || ''
        }));
        setCustomFieldValues({});
      }
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const getPayload = () => ({
    ...formData,
    custom_fields: customFieldValues
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = getPayload();
      if (form?.form_id) {
        await preEmploymentAPI.updateForm(form.form_id, payload);
      } else {
        await preEmploymentAPI.createForm(payload);
      }
      await fetchBootstrap();
      alert('Form saved successfully!');
    } catch (err) {
      if (Array.isArray(err.response?.data?.detail)) {
        setError(err.response.data.detail.map((d) => d.message || d.msg || JSON.stringify(d)).join('\n'));
      } else {
        setError(err.response?.data?.detail || 'Failed to save form');
      }
    } finally {
      setSaving(false);
    }
  };

  // Simple frontend validation for required, date, number, and integer fields
  const validateForm = () => {
    const errors = [];
    // Required fields (add more as needed)
    const requiredFields = [
      { name: 'first_name', label: 'First Name' },
      { name: 'last_name', label: 'Last Name' },
      { name: 'personal_email', label: 'Personal Email' },
      { name: 'personal_phone', label: 'Contact No' },
    ];
    requiredFields.forEach(f => {
      if (!formData[f.name] || String(formData[f.name]).trim() === '') {
        errors.push(`${f.label} is required.`);
      }
    });

    // Date fields
    const dateFields = ['date_of_birth', 'date_of_joining', 'wedding_date', 'expected_joining_date'];
    dateFields.forEach(f => {
      if (formData[f] && !/^\d{4}-\d{2}-\d{2}$/.test(formData[f])) {
        errors.push(`${f.replace(/_/g, ' ')} should be a valid date (YYYY-MM-DD).`);
      }
    });

    // Number fields
    const numberFields = [
      { name: 'age', label: 'Age', integer: true },
      { name: 'pin_code', label: 'Pin Code', integer: true },
      { name: 'expected_ctc', label: 'Expected CTC', integer: false },
      { name: 'notice_period_days', label: 'Notice Period Days', integer: true },
    ];
    numberFields.forEach(f => {
      if (formData[f.name]) {
        if (f.integer && !/^\d+$/.test(formData[f.name])) {
          errors.push(`${f.label} should be a valid integer.`);
        } else if (!f.integer && isNaN(Number(formData[f.name]))) {
          errors.push(`${f.label} should be a valid number.`);
        }
      }
    });

    // Add more field validations as needed
    return errors;
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this form? You will not be able to edit it after submission.')) {
      return;
    }

    // Run frontend validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = getPayload();

      let formId = form?.form_id;
      if (!formId) {
        const created = await preEmploymentAPI.createForm(payload);
        formId = created?.form_id;
      }

      if (!formId) {
        throw new Error('Unable to determine form ID');
      }

      await preEmploymentAPI.submitForm(formId);
      await fetchBootstrap();
      alert('Form submitted successfully!');
      if (onSubmitted) onSubmitted();
      // If employee, after submit, always go to onboarding status
      if (user?.role === 'EMPLOYEE') {
        navigate('/employee/onboarding', { replace: true });
      }
    } catch (err) {
      if (Array.isArray(err.response?.data?.detail)) {
        setError(err.response.data.detail.map((d) => d.message || d.msg || JSON.stringify(d)).join('\n'));
      } else {
        setError(err.response?.data?.detail || 'Failed to submit form');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const canEdit = !form || form.status === 'draft';

  const parseOptions = (options) => {
    if (!Array.isArray(options)) return [];
    return options.map((item) => {
      if (typeof item === 'string') return { label: item, value: item };
      return {
        label: item?.label ?? item?.value ?? '',
        value: item?.value ?? item?.label ?? ''
      };
    }).filter((item) => item.value !== '');
  };

  const renderCustomField = (config) => {
    const value = customFieldValues?.[config.field_key] ?? '';
    const commonProps = {
      disabled: !canEdit,
      className: 'w-full px-3 py-2 border rounded-lg'
    };

    if (config.field_type === 'textarea') {
      return (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => handleCustomFieldChange(config.field_key, e.target.value)}
          placeholder={config.placeholder || ''}
          {...commonProps}
        />
      );
    }

    if (config.field_type === 'select') {
      const options = parseOptions(config.options);
      return (
        <select
          value={value}
          onChange={(e) => handleCustomFieldChange(config.field_key, e.target.value)}
          {...commonProps}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={`${config.field_key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (config.field_type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => handleCustomFieldChange(config.field_key, e.target.checked)}
          disabled={!canEdit}
          className="h-4 w-4"
        />
      );
    }

    const inputType = config.field_type === 'number' ? 'number' : config.field_type === 'date' ? 'date' : 'text';
    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => handleCustomFieldChange(config.field_key, e.target.value)}
        placeholder={config.placeholder || ''}
        {...commonProps}
      />
    );
  };

  const customSections = fieldConfigs.reduce((acc, config) => {
    const section = config.section || 'Additional Information';
    if (!acc[section]) acc[section] = [];
    acc[section].push(config);
    return acc;
  }, {});

  const input = (name, label, type = 'text', required = false, extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required ? ' *' : ''}</label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        disabled={!canEdit}
        required={required}
        className="w-full px-3 py-2 border rounded-lg"
        {...extra}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {(showHeading || form) && (
        <div className="flex justify-between items-center">
          {showHeading ? <h1 className="text-2xl font-bold text-[#181c52]">Pre-employment Form</h1> : <div />}
          {form && (
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              form.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              form.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
              form.status === 'verified' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {form.status.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {input('first_name', 'First Name', 'text', true)}
            {input('middle_name', 'Middle Name')}
            {input('last_name', 'Last Name', 'text', true)}
            {input('father_name', 'Father Name')}
            {input('mother_name', 'Mother Name')}
            {input('employee_code', 'Employee ID')}
            {input('date_of_birth', 'DOB', 'date')}
            {input('date_of_joining', 'DOJ', 'date')}
            {input('age', 'Age', 'number')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {input('blood_group', 'Blood Group')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
              <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
            {/* {input('photo_url', 'Photo URL', 'url')} */}
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Contact & Address Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('company_email', 'Company Email Address', 'email')}
            {input('personal_email', 'Personal Email Address', 'email', true)}
            {input('personal_phone', 'Contact No', 'tel', true)}
            {input('alternate_phone', 'Alternate Contact No', 'tel')}
            {input('location', 'Location')}
            {input('state', 'State')}
            {input('city', 'City')}
            {input('pin_code', 'Pin Code')}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
              <textarea name="current_address" value={formData.current_address} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" rows="2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
              <textarea name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" rows="2" />
            </div>
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Family Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('family_member_name', 'Name')}
            {input('family_relationship', 'Relationship')}
            {input('wedding_date', 'Wedding Date', 'date')}
            {input('nominee_name', 'Nominee')}
            {input('nominee_relation', 'Nominee Relation')}
            {input('allergies', 'Any Allergy')}
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Education & Experience</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('educational_qualification', 'Educational Qualification')}
            {input('highest_degree', 'Highest Degree')}
            {input('specialization', 'Specialization')}
            {input('university_name', 'University Name')}
            {input('previous_experience', 'Previous Experience')}
            {input('designation', 'Designation')}
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('emergency_contact_phone', 'Emergency Contact Number', 'tel')}
            {input('emergency_contact_name', 'Emergency Contact Name')}
            {input('emergency_contact_relation', 'Emergency Contact Relationship')}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Address</label>
              <textarea name="emergency_contact_address" value={formData.emergency_contact_address} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" rows="2" />
            </div>
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Statutory Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {input('aadhaar_number', 'Aadhar Number', 'text', false, { maxLength: 12, pattern: '\\d*', inputMode: 'numeric' })}
            {input('pan_number', 'PAN Number', 'text', false, { maxLength: 10 })}
            {input('uan_number', 'UAN Number')}
            {input('esi_number', 'ESI Number')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Regime</label>
              <select name="tax_regime" value={formData.tax_regime} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Old">Old</option>
                <option value="New">New</option>
              </select>
            </div>
            {input('medical_insurance_policy_number', 'Medical Insurance Policy Number')}
          </div>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-[#181c52]">Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {input('bank_name', 'Bank Name')}
            {input('account_holder_name', 'Account Holder Name')}
            {input('bank_account_number', 'Account Number')}
            {input('bank_account_type', 'Account Type')}
            {input('ifsc_code', 'IFSC Code')}
          </div>
        </section>

        {Object.keys(customSections).map((sectionName) => (
          <section key={sectionName} className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4 text-[#181c52]">{sectionName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customSections[sectionName].map((config) => (
                <div key={config.field_id} className={config.field_type === 'checkbox' ? 'flex items-center gap-2 pt-6' : ''}>
                  {config.field_type !== 'checkbox' && (
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {config.label}{config.is_required ? ' *' : ''}
                    </label>
                  )}
                  {renderCustomField(config)}
                  {config.field_type === 'checkbox' && (
                    <label className="text-sm font-medium text-gray-700">
                      {config.label}{config.is_required ? ' *' : ''}
                    </label>
                  )}
                  {config.help_text && (
                    <p className="text-xs text-gray-500 mt-1">{config.help_text}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {canEdit && (
          <div className="flex gap-4 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#ffbd59] text-white px-6 py-2 rounded-lg hover:bg-[#e0a800] flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#181c52] text-white px-6 py-2 rounded-lg hover:bg-[#0f1238] flex items-center gap-2 disabled:opacity-50"
            >
              <FiCheckCircle className="w-5 h-5" />
              {saving ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}