import React, { useState, useEffect, useRef } from 'react';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit3, FiSave, FiX, FiBriefcase, FiDollarSign, FiClock, FiCreditCard, FiCamera, FiUpload, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, employeeAPI } from '../../services/api';

export default function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    department: '',
    position: '',
    employee_id: '',
    join_date: '',
    salary: '',
    manager: '',
    // Bank account details
    bank_account_number: '',
    ifsc_code: '',
    upi_id: '',
    preferred_payment_method: 'BANK_TRANSFER'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoObjectUrl, setPhotoObjectUrl] = useState(null);
  const photoObjectUrlRef = useRef(null);
  // Preview-before-save: select → preview+zoom → Save to upload
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [Editing , setEditing] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch profile photo via authenticated API (img src does not send Authorization header)
  useEffect(() => {
    if (!profilePhoto || !user?.employee_id) {
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current);
        photoObjectUrlRef.current = null;
      }
      setPhotoObjectUrl(null);
      return;
    }
    let cancelled = false;
    employeeAPI.getProfilePhoto(user.employee_id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) { setPhotoObjectUrl(null); return; }
        if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
        const url = URL.createObjectURL(blob);
        photoObjectUrlRef.current = url;
        setPhotoObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPhotoObjectUrl(null);
      });
    return () => {
      cancelled = true;
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current);
        photoObjectUrlRef.current = null;
      }
      setPhotoObjectUrl(null);
    };
  }, [profilePhoto, user?.employee_id]);

  useEffect(() => {
    if (user?.employee_id) {
      fetchEmployeeProfile();
    }
  }, [user?.employee_id]); // Only re-fetch when employee_id changes

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      console.log('Loading employee profile...');
      
      if (user && user.employee_id) {
        // Fetch full employee data from API to get manager information
        const employeeData = await employeeAPI.get(user.employee_id);
        console.log('Employee data from API:', employeeData);
        
        setEmployeeData(employeeData);
        
        // Fetch manager name if manager_id exists
        let managerName = '';
        if (employeeData.manager_id) {
          try {
            // Use allow_manager_access parameter to allow viewing manager's basic info
            const managerData = await employeeAPI.get(employeeData.manager_id, true);
            managerName = `${managerData.first_name || ''} ${managerData.last_name || ''}`.trim();
          } catch (err) {
            console.warn('Could not fetch manager details:', err);
            managerName = 'Manager not found';
          }
        }
        
        // Create enhanced user data with actual values
        const enhancedUserData = {
          first_name: employeeData.first_name || user.first_name || '',
          last_name: employeeData.last_name || user.last_name || '',
          email: employeeData.email || user.email || '',
          phone: employeeData.phone || user.phone || '',
          address: employeeData.address || user.address || '',
          date_of_birth: employeeData.date_of_birth || user.date_of_birth || '',
          department: employeeData.department || user.department || '',
          position: employeeData.designation || user.designation || user.position || '',
          employee_id: employeeData.employee_id || user.employee_id || '',
          join_date: employeeData.join_date || user.join_date || '',
          salary: user.salary || '',
          manager: managerName,
          manager_id: employeeData.manager_id || null,
          profile_photo: employeeData.profile_photo || user.profile_photo || null,
          // Bank account details
          bank_account_number: employeeData.bank_account_number || user.bank_account_number || '',
          ifsc_code: employeeData.ifsc_code || user.ifsc_code || '',
          upi_id: employeeData.upi_id || user.upi_id || '',
          preferred_payment_method: employeeData.preferred_payment_method || 'BANK_TRANSFER'
        };
        
        setFormData(enhancedUserData);
        setProfilePhoto(employeeData.profile_photo || null);
        setError(null);
        
        // Update AuthContext with fresh employee data
        if (updateProfile) {
          updateProfile({
            ...user,
            designation: employeeData.designation,
            department: employeeData.department,
            position: employeeData.designation,
            manager_id: employeeData.manager_id,
            profile_photo: employeeData.profile_photo
          });
        }
        
        // Also refresh the session to get latest data from backend
        if (refreshUser) {
          await refreshUser();
        }
      } else if (user) {
        // Fallback to user data from auth context
        const enhancedUserData = {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          date_of_birth: user.date_of_birth || '',
          department: user.department || '',
          position: user.designation || user.position || '',
          employee_id: user.employee_id || '',
          join_date: user.join_date || '',
          salary: user.salary || '',
          manager: user.manager || '',
          manager_id: user.manager_id || null,
          profile_photo: user.profile_photo || null,
          // Bank account details
          bank_account_number: user.bank_account_number || '',
          ifsc_code: user.ifsc_code || '',
          upi_id: user.upi_id || '',
          preferred_payment_method: 'BANK_TRANSFER'
        };
        setFormData(enhancedUserData);
      } else {
        setError('No user data available');
      }
    } catch (err) {
      console.error('Error loading employee profile:', err);
      setError('Failed to load profile data');
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setError(null);
    if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
    setPendingPhotoFile(file);
    setPendingPhotoPreviewUrl(URL.createObjectURL(file));
    setPreviewZoom(1);
    setPhotoPreviewOpen(true);
  };

  const handleCancelPhotoPreview = () => {
    if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
    setPendingPhotoFile(null);
    setPendingPhotoPreviewUrl(null);
    setPhotoPreviewOpen(false);
    setPreviewZoom(1);
  };

  const handleChooseAnotherPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmPhotoUpload = async () => {
    if (!pendingPhotoFile) return;
    try {
      setUploadingPhoto(true);
      setError(null);
      const updatedEmployee = await employeeAPI.uploadProfilePhoto(pendingPhotoFile);
      setFormData(prev => ({ ...prev, profile_photo: updatedEmployee.profile_photo }));
      setProfilePhoto(updatedEmployee.profile_photo || null);
      if (updateProfile) updateProfile({ ...user, profile_photo: updatedEmployee.profile_photo });
      await fetchEmployeeProfile();
      setSuccess('Profile photo uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
      handleCancelPhotoPreview();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err.response?.data?.detail || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Map position to designation for backend
      // Ensure payment method is always BANK_TRANSFER
      // Only send fields that are in the EmployeeUpdate schema
      const profileDataToSave = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        personal_email: formData.personal_email || formData.email,
        email: formData.email,
        department: formData.department,
        designation: formData.position || formData.designation, // Map position to designation
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth || null,
        preferred_payment_method: 'BANK_TRANSFER',
        bank_account_number: formData.bank_account_number,
        ifsc_code: formData.ifsc_code,
        upi_id: formData.upi_id
      };
      
      // Remove null/undefined/empty string values
      Object.keys(profileDataToSave).forEach(key => {
        if (profileDataToSave[key] === null || profileDataToSave[key] === undefined || profileDataToSave[key] === '') {
          delete profileDataToSave[key];
        }
      });
      
      // Call the API to update the profile
      const updatedProfile = await authAPI.updateProfile(profileDataToSave);
      
      // Update the user context with the new profile data
      if (updateProfile) {
        updateProfile(updatedProfile);
      }
      
      // Refresh form data with updated profile (map designation back to position)
      if (updatedProfile) {
        setFormData(prev => ({
          ...prev,
          position: updatedProfile.designation || prev.position,
          phone: updatedProfile.phone || prev.phone,
          address: updatedProfile.address || prev.address,
          date_of_birth: updatedProfile.date_of_birth || prev.date_of_birth,
          profile_photo: updatedProfile.profile_photo || prev.profile_photo,
          ...updatedProfile
        }));
        // Update profile photo state
        if (updatedProfile.profile_photo) {
          setProfilePhoto(updatedProfile.profile_photo);
        }
      }
      
      // Refresh employee data to get latest from database
      await fetchEmployeeProfile();
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        date_of_birth: user.date_of_birth || '',
        department: user.department || '',
        position: user.designation || user.position || '', // Map designation to position
        employee_id: user.employee_id || '',
        join_date: user.join_date || '',
        salary: user.salary || '',
        manager: user.manager || '',
        // Bank account details
        bank_account_number: user.bank_account_number || '',
        ifsc_code: user.ifsc_code || '',
        upi_id: user.upi_id || '',
        preferred_payment_method: 'BANK_TRANSFER'
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {(isEditing || photoPreviewOpen) && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadingPhoto}
        />
      )}
      {/* Photo preview modal: preview, zoom, then Save */}
      {photoPreviewOpen && pendingPhotoPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={(e) => e.target === e.currentTarget && handleCancelPhotoPreview()}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Preview profile photo</h3>
              <button type="button" onClick={handleCancelPhotoPreview} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex flex-col items-center p-4">
              <div className="w-full flex justify-center overflow-auto rounded-lg bg-gray-100 min-h-[200px] max-h-[50vh]">
                <img
                  src={pendingPhotoPreviewUrl}
                  alt="Preview"
                  className="max-w-full object-contain transition-transform"
                  style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center' }}
                  draggable={false}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <button type="button" onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700" title="Zoom out"><FiZoomOut className="w-5 h-5" /></button>
                <span className="text-sm text-gray-600 min-w-[4rem] text-center">{Math.round(previewZoom * 100)}%</span>
                <button type="button" onClick={() => setPreviewZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700" title="Zoom in"><FiZoomIn className="w-5 h-5" /></button>
                <button type="button" onClick={() => setPreviewZoom(1)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-700">Reset</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button type="button" onClick={handleChooseAnotherPhoto} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <FiUpload className="w-4 h-4" /> Choose another
              </button>
              <button type="button" onClick={handleCancelPhotoPreview} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleConfirmPhotoUpload} disabled={uploadingPhoto} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                <FiSave className="w-4 h-4" /> {uploadingPhoto ? 'Saving...' : 'Save photo'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      {/* ===== FIGMA-STYLE PROFILE HEADER ===== */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 
                py-24 px-10 max-w-4xl mx-auto relative">

  {/* Edit button (top-right, Figma style) */}
  {!isEditing && (
    <button
      onClick={() => setIsEditing(true)}
      className="absolute top-6 right-6 text-gray-600 hover:text-green-600 transition"
      title="Edit Profile"
    >
      <FiEdit3 className="w-8 h-8" />
       

    </button>
  )}

  <div className="flex flex-col items-center relative -translate-y-4 transition-transform">
  {photoObjectUrl ? (
    <img
      src={photoObjectUrl}
      alt={`${user.first_name} ${user.last_name}`}
      className="w-24 h-24 rounded-full object-cover"
    />
  ) : (
    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
      <span className="text-3xl font-bold text-green-700">
        {user.first_name?.charAt(0) || 'E'}
      </span>
    </div>
  )}


  {/* Camera icon BELOW the avatar */}
  {isEditing && (
    <button
      type="button"
      onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
      className="mt-3 flex items-center gap-2 px-3 py-1.5
                 bg-blue-600 text-white rounded-full
                 hover:bg-blue-700 transition shadow"
    >
      <FiCamera className="w-4 h-4" />
      
    </button>
  )}
</div>


  {/* Name */}
  <p className="text-center text-lg text-gray-500">Employee Name</p>
  <h1 className="text-center text-lg font-bold text-gray-900 mb-4">
    {user.first_name} {user.last_name}
  </h1>

  {/* Department */}
  <p className="text-center text-lg text-gray-500">Department</p>
  <p className="text-center text-lg font-bold text-gray-900 mb-6">
    {employeeData?.department || formData.department || 'N/A'}
  </p>

  {/* Grid row (matches Figma layout) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
    <div className="text-center">
      <p className="text-lg text-gray-500">Job Title</p>
      <p className="text-base font-bold text-gray-900">
        {employeeData?.designation || formData.position || 'Employee'}
      </p>
    </div>

    <div className="text-center">
      <p className="text-lg text-gray-500">Employee ID</p>
      <p className="text-base font-bold text-gray-900">
        {user.employee_id || 'N/A'}
      </p>
    </div>
  </div>

  {/* Save / Cancel only in edit mode */}
  {isEditing && (
    <div className="flex justify-center gap-3 mt-8">
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <FiSave className="w-4 h-4" />
        {loading ? 'Saving...' : 'Save'}
      </button>

      <button
        onClick={handleCancel}
        className="flex items-center gap-2 px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
      >
        <FiX className="w-4 h-4" />
        Cancel
      </button>
    </div>
  )}
</div>


      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      <div
  className={`transition-all duration-300 ease-in-out overflow-hidden ${
    isEditing ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
  }`}
>    
   {isEditing && (
    <>
      <div className="space-y-6 mt-2">


      {/* Profile Form */}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiUser className="w-5 h-5 mr-2" />
            Personal Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={!isEditing}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBriefcase className="w-5 h-5 mr-2" />
            Professional Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Join Date
              </label>
              <input
                type="date"
                name="join_date"
                value={formData.join_date}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reporting Manager
              </label>
              <input
                type="text"
                name="manager"
                value={formData.manager || 'No Manager Assigned'}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="No Manager Assigned"
              />
              <p className="mt-1 text-xs text-gray-500">
                Manager can only be updated by HR/Admin
              </p>
            </div>
          </div>
        </div>
      

      {/* Bank Account Details - Always visible, separate section */}
      <div className="col-span-full  bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md border-2 border-green-300 p-6 mt-6 ">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FiCreditCard className="w-6 h-6 mr-3 text-green-600" />
               Bank Account Details
              <span className="ml-3 text-sm text-gray-600 font-normal">(Required for payroll processing)</span>
            </h2>
            {!isEditing && (!formData.bank_account_number || !formData.ifsc_code) && (
              <span className="px-4 py-2 text-sm font-semibold bg-yellow-200 text-yellow-900 rounded-full border-2 border-yellow-400">
                ⚠️ Incomplete - Please Add Details
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Enter bank account number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Enter IFSC code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UPI ID (Optional)
              </label>
              <input
                type="text"
                name="upi_id"
                value={formData.upi_id}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="yourname@upi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          {!isEditing && (!formData.bank_account_number || !formData.ifsc_code) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please add your bank account details to ensure smooth payroll processing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {/* <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiClock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Work Hours</p>
              <p className="text-2xl font-bold text-gray-900">168.5</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiCalendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leave Balance</p>
              <p className="text-2xl font-bold text-gray-900">12 days</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiDollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month's Pay</p>
              <p className="text-2xl font-bold text-gray-900">$5,500</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
    </>
    )}

  </div>
</div>

  );
  
}
