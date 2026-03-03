import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCreditCard, FiSave, FiCheckCircle } from 'react-icons/fi';
import { preEmploymentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function PreEmploymentForm() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    personal_email: '',
    personal_phone: '',
    alternate_phone: '',
    current_address: '',
    permanent_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    expected_ctc: '',
    expected_joining_date: '',
    notice_period_days: '',
    current_employer: '',
    current_designation: '',
    pan_number: '',
    aadhaar_number: '',
    passport_number: '',
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    account_holder_name: ''
  });

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const data = await preEmploymentAPI.getMyForm();
      if (data) {
        setForm(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_name: data.middle_name || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          marital_status: data.marital_status || '',
          personal_email: data.personal_email || '',
          personal_phone: data.personal_phone || '',
          alternate_phone: data.alternate_phone || '',
          current_address: data.current_address || '',
          permanent_address: data.permanent_address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relation: data.emergency_contact_relation || '',
          expected_ctc: data.expected_ctc || '',
          expected_joining_date: data.expected_joining_date || '',
          notice_period_days: data.notice_period_days || '',
          current_employer: data.current_employer || '',
          current_designation: data.current_designation || '',
          pan_number: data.pan_number || '',
          aadhaar_number: data.aadhaar_number || '',
          passport_number: data.passport_number || '',
          bank_name: data.bank_name || '',
          bank_account_number: data.bank_account_number || '',
          ifsc_code: data.ifsc_code || '',
          account_holder_name: data.account_holder_name || ''
        });
      } else {
        // Initialize with user data if available
        if (user) {
          setFormData(prev => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            personal_email: user.email || ''
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching form:', err);
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (form) {
        await preEmploymentAPI.updateForm(form.form_id, formData);
      } else {
        await preEmploymentAPI.createForm(formData);
      }
      await fetchForm();
      alert('Form saved successfully!');
    } catch (err) {
      console.error('Error saving form:', err);
      setError(err.response?.data?.detail || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this form? You won\'t be able to edit it after submission.')) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (!form) {
        await preEmploymentAPI.createForm(formData);
        await fetchForm();
      }
      await preEmploymentAPI.submitForm(form.form_id);
      await fetchForm();
      alert('Form submitted successfully!');
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.detail || 'Failed to submit form');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pre-employment Form</h1>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Basic Details */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUser className="w-5 h-5" />
            Basic Details
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
              <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
              <select name="marital_status" value={formData.marital_status} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiMail className="w-5 h-5" />
            Contact Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email *</label>
              <input type="email" name="personal_email" value={formData.personal_email} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Phone *</label>
              <input type="tel" name="personal_phone" value={formData.personal_phone} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
              <input type="tel" name="alternate_phone" value={formData.alternate_phone} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
              <textarea name="current_address" value={formData.current_address} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" rows="2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
              <textarea name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" rows="2" />
            </div>
          </div>
        </section>

        {/* Employment Details */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Employment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected CTC (₹)</label>
              <input type="number" name="expected_ctc" value={formData.expected_ctc} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Joining Date</label>
              <input type="date" name="expected_joining_date" value={formData.expected_joining_date} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days)</label>
              <input type="number" name="notice_period_days" value={formData.notice_period_days} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Employer</label>
              <input type="text" name="current_employer" value={formData.current_employer} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Designation</label>
              <input type="text" name="current_designation" value={formData.current_designation} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </section>

        {/* Identification */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Identification</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input type="text" name="pan_number" value={formData.pan_number} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" maxLength="10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
              <input type="text" name="aadhaar_number" value={formData.aadhaar_number} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" maxLength="12" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
              <input type="text" name="passport_number" value={formData.passport_number} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCreditCard className="w-5 h-5" />
            Bank Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
              <input type="text" name="account_holder_name" value={formData.account_holder_name} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input type="text" name="bank_account_number" value={formData.bank_account_number} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
              <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleInputChange} disabled={!canEdit} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </section>

        {canEdit && (
          <div className="flex gap-4 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {form && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FiCheckCircle className="w-5 h-5" />
                Submit Form
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
