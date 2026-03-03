import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiFile } from 'react-icons/fi';
import { recruitmentAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function JobApplicationForm() {
  const { organizationSlug, jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : '',
    email: user?.email || '',
    phone: '',
    resumeFile: null,
    keywordsSkills: '',
    previousOrganizations: '',
    degrees: '',
    education: '',
    noticePeriod: '',
    currentCtc: '',
    expectedCtc: '',
    currentLocation: '',
    reasonForJobChange: ''
  });
  
  const [errors, setErrors] = useState({});
  const [resumeFileName, setResumeFileName] = useState('');

  useEffect(() => {
    fetchJobDetails();
  }, [organizationSlug, jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch organization details
      const orgData = await recruitmentAPI.getOrganizationCareers(organizationSlug);
      setOrganization(orgData.organization);
      
      // Find the specific job
      const jobData = orgData.jobs.find(j => j.job_id === parseInt(jobId));
      if (!jobData) {
        setError('Job not found');
        return;
      }
      setJob(jobData);
    } catch (err) {
      console.error('Failed to fetch job details:', err);
      setError('Failed to load job details');
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
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (3MB max)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        resumeFile: `File size exceeds 3MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`
      }));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.jpeg', '.jpg', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setErrors(prev => ({
        ...prev,
        resumeFile: 'Invalid file type. Please upload JPEG, PDF, or DOC file.'
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      resumeFile: file
    }));
    setResumeFileName(file.name);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.resumeFile;
      return newErrors;
    });
  };

  const removeResume = () => {
    setFormData(prev => ({
      ...prev,
      resumeFile: null
    }));
    setResumeFileName('');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'This field is required.';
    if (formData.fullName.length > 50) newErrors.fullName = 'Name must be 50 characters or less.';
    
    if (!formData.email.trim()) newErrors.email = 'This field is required.';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailPattern.test(formData.email)) {
      newErrors.email = 'Invalid email format.';
    }
    
    if (!formData.phone.trim()) newErrors.phone = 'This field is required.';
    if (formData.phone.length > 10) newErrors.phone = 'Phone must be 10 characters or less.';
    
    if (!formData.resumeFile) newErrors.resumeFile = 'Please attach your CV.';
    
    if (!formData.keywordsSkills.trim()) newErrors.keywordsSkills = 'This field is required.';
    if (formData.keywordsSkills.length > 50) newErrors.keywordsSkills = 'Keywords/Skills must be 50 characters or less.';
    
    if (!formData.previousOrganizations.trim()) newErrors.previousOrganizations = 'This field is required.';
    if (formData.previousOrganizations.length > 100) newErrors.previousOrganizations = 'Previous organizations must be 100 characters or less.';
    
    if (!formData.degrees.trim()) newErrors.degrees = 'This field is required.';
    if (formData.degrees.length > 100) newErrors.degrees = 'Degrees must be 100 characters or less.';
    
    if (!formData.education.trim()) newErrors.education = 'This field is required.';
    if (formData.education.length > 100) newErrors.education = 'Education must be 100 characters or less.';
    
    if (!formData.noticePeriod.trim()) newErrors.noticePeriod = 'This field is required.';
    if (formData.noticePeriod.length > 30) newErrors.noticePeriod = 'Notice period must be 30 characters or less.';
    
    if (formData.currentCtc.length > 30) newErrors.currentCtc = 'Current CTC must be 30 characters or less.';
    if (formData.expectedCtc.length > 30) newErrors.expectedCtc = 'Expected CTC must be 30 characters or less.';
    if (formData.currentLocation.length > 30) newErrors.currentLocation = 'Current location must be 30 characters or less.';
    if (formData.reasonForJobChange.length > 30) newErrors.reasonForJobChange = 'Reason must be 30 characters or less.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Build cover letter with all details
      const coverLetter = `Name: ${formData.fullName}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nKeywords/Skills: ${formData.keywordsSkills}\nPrevious Organizations: ${formData.previousOrganizations}\nDegrees: ${formData.degrees}\nEducation: ${formData.education}\nNotice Period: ${formData.noticePeriod}\nCurrent CTC: ${formData.currentCtc || 'Not provided'}\nExpected CTC: ${formData.expectedCtc || 'Not provided'}\nCurrent Location: ${formData.currentLocation || 'Not provided'}\nReason for Job Change: ${formData.reasonForJobChange || 'Not provided'}`;
      
      // Always use public endpoint for careers page applications
      // This allows anyone to apply, even if logged in as admin/employee
      // Ensure name and email are provided (they're required fields, so validation should catch this)
      if (!formData.fullName || !formData.email) {
        setError('Name and email are required fields.');
        return;
      }
      
      console.log('[JobApplicationForm] Submitting with:', {
        jobId: parseInt(jobId),
        name: formData.fullName,
        email: formData.email,
        hasResume: !!formData.resumeFile
      });
      
      await applicationsAPI.applyForJob(
        parseInt(jobId),
        coverLetter,
        formData.resumeFile,
        formData.fullName.trim(),
        formData.email.trim(),
        formData.phone?.trim() || null,
        formData.keywordsSkills?.trim() || null,
        formData.previousOrganizations?.trim() || null,
        formData.degrees?.trim() || null,
        formData.education?.trim() || null,
        formData.noticePeriod?.trim() || null,
        formData.currentCtc?.trim() || null,
        formData.expectedCtc?.trim() || null,
        formData.currentLocation?.trim() || null,
        formData.reasonForJobChange?.trim() || null
      );
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/careers/${organizationSlug}`);
      }, 3000);
    } catch (err) {
      console.error('Failed to submit application:', err);
      setError(err.response?.data?.detail || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/careers/${organizationSlug}`)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Careers
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your application has been submitted successfully. We'll review it and get back to you soon.
          </p>
          <p className="text-sm text-gray-500">Redirecting to careers page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/careers/${organizationSlug}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Apply Job</h1>
        </div>

        {/* Job Title Bar */}
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{job?.title}</h2>
            <p className="text-blue-100 uppercase">{job?.department}</p>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              maxLength={50}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.fullName}</span>
              <span className="text-xs text-gray-500">{formData.fullName.length}/50</span>
            </div>
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            <span className="text-xs text-red-500">{errors.email}</span>
          </div>

          {/* Phone */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              maxLength={10}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your phone number"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.phone}</span>
              <span className="text-xs text-gray-500">{formData.phone.length}/10</span>
            </div>
          </div>

          {/* Attach CV */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach CV
            </label>
            <input
              type="file"
              id="resumeFile"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpeg,.jpg"
              className="hidden"
            />
            {!resumeFileName ? (
              <div>
                <label
                  htmlFor="resumeFile"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <span className="text-lg mr-2">library_add</span>
                  <span>Attach CV</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  File size must be less than or equal to 3MB. JPEG, PDF, DOC.
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">library_add</span>
                  <span className="text-sm text-gray-700">{resumeFileName}</span>
                </div>
                <button
                  type="button"
                  onClick={removeResume}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            )}
            <span className="text-xs text-red-500">{errors.resumeFile}</span>
          </div>

          {/* Keywords/Skills */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords/Skill <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="keywordsSkills"
              value={formData.keywordsSkills}
              onChange={handleInputChange}
              maxLength={50}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.keywordsSkills ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Python, JavaScript, React"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.keywordsSkills}</span>
              <span className="text-xs text-gray-500">
                {formData.keywordsSkills.length}/50 - if more than one make them comma separated
              </span>
            </div>
          </div>

          {/* Previous Organizations */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Previous Organization(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="previousOrganizations"
              value={formData.previousOrganizations}
              onChange={handleInputChange}
              maxLength={100}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.previousOrganizations ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., ABC Corp, XYZ Ltd"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.previousOrganizations}</span>
              <span className="text-xs text-gray-500">
                {formData.previousOrganizations.length}/100 - if more than one make them comma separated
              </span>
            </div>
          </div>

          {/* Degrees */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Degree(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="degrees"
              value={formData.degrees}
              onChange={handleInputChange}
              maxLength={100}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.degrees ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Bachelor of Computer Science, MBA"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.degrees}</span>
              <span className="text-xs text-gray-500">
                {formData.degrees.length}/100 - if more than one make them comma separated
              </span>
            </div>
          </div>

          {/* Education */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Education <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="education"
              value={formData.education}
              onChange={handleInputChange}
              maxLength={100}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.education ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., University of Technology, College of Engineering"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.education}</span>
              <span className="text-xs text-gray-500">
                {formData.education.length}/100 - if more than one make them comma separated
              </span>
            </div>
          </div>

          {/* Notice Period */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notice Period <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="noticePeriod"
              value={formData.noticePeriod}
              onChange={handleInputChange}
              maxLength={30}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.noticePeriod ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 30 days, 2 weeks, Immediate"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.noticePeriod}</span>
              <span className="text-xs text-gray-500">{formData.noticePeriod.length}/30</span>
            </div>
          </div>

          {/* Current CTC */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current CTC
            </label>
            <input
              type="text"
              name="currentCtc"
              value={formData.currentCtc}
              onChange={handleInputChange}
              maxLength={30}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.currentCtc ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 5 LPA, 500000"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.currentCtc}</span>
              <span className="text-xs text-gray-500">{formData.currentCtc.length}/30</span>
            </div>
          </div>

          {/* Expected CTC */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected CTC
            </label>
            <input
              type="text"
              name="expectedCtc"
              value={formData.expectedCtc}
              onChange={handleInputChange}
              maxLength={30}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.expectedCtc ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 7 LPA, 700000"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.expectedCtc}</span>
              <span className="text-xs text-gray-500">{formData.expectedCtc.length}/30</span>
            </div>
          </div>

          {/* Current Location */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Location
            </label>
            <input
              type="text"
              name="currentLocation"
              value={formData.currentLocation}
              onChange={handleInputChange}
              maxLength={30}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.currentLocation ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Mumbai, India"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.currentLocation}</span>
              <span className="text-xs text-gray-500">{formData.currentLocation.length}/30</span>
            </div>
          </div>

          {/* Reason for Job Change */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Job Change
            </label>
            <input
              type="text"
              name="reasonForJobChange"
              value={formData.reasonForJobChange}
              onChange={handleInputChange}
              maxLength={30}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.reasonForJobChange ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Career growth, Better opportunities"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500">{errors.reasonForJobChange}</span>
              <span className="text-xs text-gray-500">{formData.reasonForJobChange.length}/30</span>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => navigate(`/careers/${organizationSlug}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
