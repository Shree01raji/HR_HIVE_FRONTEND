import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { preEmploymentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  // ...add all required fields here
};

export default function PreEmploymentForm() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    setLoading(true);
    try {
      const data = await preEmploymentAPI.getMyForm();
      if (data) {
        setForm(data);
        setFormData({ ...INITIAL_FORM, ...data });
        if (['submitted', 'verified', 'approved'].includes(data.status)) {
          navigate('/employee/onboarding', { replace: true });
        }
      }
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let formId = form?.form_id;
      if (!formId) {
        const created = await preEmploymentAPI.createForm(formData);
        formId = created?.form_id;
      } else {
        await preEmploymentAPI.updateForm(formId, formData);
      }
      await preEmploymentAPI.submitForm(formId);
      // Wait for backend to confirm status
      await fetchForm();
    } catch (err) {
      setError('Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <h2>Pre-Employment Form</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>
        <label>First Name</label>
        <input name="first_name" value={formData.first_name} onChange={handleChange} required />
      </div>
      <div>
        <label>Last Name</label>
        <input name="last_name" value={formData.last_name} onChange={handleChange} required />
      </div>
      {/* Add more fields as needed */}
      <button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</button>
    </form>
  );
}
