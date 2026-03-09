import React, { useState, useEffect, useMemo } from 'react';
import { documentsAPI } from '../../services/api';
import { 
  FiFileText,
  FiUpload,
  FiSearch,
  FiTrash2,
  FiDownload,
  FiEye,
  FiEdit,
  FiX,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar
} from 'react-icons/fi';

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Policy',
    file: null
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch documents with category filter for policies
      // Try to get documents with category='Policy' first
      let policyDocs = await documentsAPI.getDocuments('Policy', true);
      
      // If no results, try without category filter and filter manually
      if (!policyDocs || policyDocs.length === 0) {
        const allDocs = await documentsAPI.getDocuments(null, true);
        policyDocs = (allDocs || []).filter(doc => 
          doc.category === 'Policy' || 
          doc.category === 'policy' ||
          (doc.title && doc.title.toLowerCase().includes('policy'))
        );
      }
      
      // Ensure it's an array
      if (!Array.isArray(policyDocs)) {
        policyDocs = [];
      }
      
      setPolicies(policyDocs);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setError('Unable to load company policies.');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('File size must be less than 100MB');
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a policy title');
      return;
    }
    
    if (!formData.file) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description || '');
      uploadFormData.append('category', 'Policy');
      uploadFormData.append('is_public', 'true');
      uploadFormData.append('file', formData.file);

      // Use the documents API upload endpoint
      await documentsAPI.uploadDocument(uploadFormData);
      
      alert('Policy document uploaded successfully!');
      setShowUploadModal(false);
      setFormData({ title: '', description: '', category: 'Policy', file: null });
      fetchPolicies();
    } catch (err) {
      console.error('Failed to upload policy:', err);
      setError(err.response?.data?.detail || 'Failed to upload policy document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this policy document?')) {
      return;
    }

    try {
      await documentsAPI.deleteDocument(policyId);
      alert('Policy deleted successfully!');
      fetchPolicies();
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert('Failed to delete policy. Please try again.');
    }
  };

  const handleView = async (policy) => {
    try {
      const viewUrl = await documentsAPI.viewDocument(policy.document_id);
      setDocumentViewUrl(viewUrl);
      setViewingPolicy(policy);
    } catch (err) {
      console.error('Failed to load document:', err);
      alert('Failed to load document for viewing.');
    }
  };

  const handleDownload = async (policy) => {
    try {
      const blob = await documentsAPI.downloadDocument(policy.document_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = policy.file_name || policy.title || 'policy-document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document.');
    }
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setFormData({
      title: policy.title || '',
      description: policy.description || '',
      category: 'Policy',
      file: null
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a policy title');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const updateData = {
        title: formData.title,
        description: formData.description || '',
        category: 'Policy'
      };

      // If a new file is selected, we need to upload it
      if (formData.file) {
        const uploadFormData = new FormData();
        uploadFormData.append('title', formData.title);
        uploadFormData.append('description', formData.description || '');
        uploadFormData.append('category', 'Policy');
        uploadFormData.append('is_public', 'true');
        uploadFormData.append('file', formData.file);
        
        // Delete old document and upload new one
        await documentsAPI.deleteDocument(selectedPolicy.document_id);
        await documentsAPI.uploadDocument(uploadFormData);
      } else {
        // Just update metadata
        await documentsAPI.updateDocument(selectedPolicy.document_id, updateData);
      }
      
      alert('Policy updated successfully!');
      setShowEditModal(false);
      setSelectedPolicy(null);
      setFormData({ title: '', description: '', category: 'Policy', file: null });
      fetchPolicies();
    } catch (err) {
      console.error('Failed to update policy:', err);
      setError(err.response?.data?.detail || 'Failed to update policy. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filteredPolicies = useMemo(() => {
    if (!searchTerm.trim()) {
      return policies;
    }

    const term = searchTerm.toLowerCase();
    return policies.filter(policy => 
      (policy.title && policy.title.toLowerCase().includes(term)) ||
      (policy.description && policy.description.toLowerCase().includes(term)) ||
      (policy.file_name && policy.file_name.toLowerCase().includes(term))
    );
  }, [policies, searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Policies</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and share company policy documents
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ title: '', description: '', category: 'Policy', file: null });
            setShowUploadModal(true);
          }}
          className="bg-[#181c52] text-white px-4 py-2 rounded-lg hover:bg-[#2c2f70] transition-colors text-sm font-medium flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FiFileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Policies</p>
            <p className="text-2xl font-semibold text-gray-900">{policies.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Policies</p>
            <p className="text-2xl font-semibold text-gray-900">{filteredPolicies.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-sm font-semibold text-gray-900">
              {policies.length > 0 
                ? formatDate(policies.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0]?.updated_at || policies[0]?.created_at)
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
          <FiSearch className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search policies by title, description, or filename..."
            className="w-full bg-transparent focus:outline-none text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Policies List */}
      <div className="flex-1 overflow-auto">
        {filteredPolicies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 bg-white rounded-xl border border-gray-200 p-12">
            <FiFileText className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-semibold mb-2">
              {searchTerm ? 'No policies match your search' : 'No policies found'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Get started by uploading your first company policy document'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Add Your First Policy
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map((policy) => (
              <div key={policy.document_id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiFileText className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{policy.title}</h3>
                      </div>
                      {policy.description && (
                        <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {policy.file_name && (
                          <span className="flex items-center gap-1">
                            <FiFileText className="w-3 h-3" />
                            {policy.file_name}
                          </span>
                        )}
                        {policy.created_at && (
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            Created: {formatDate(policy.created_at)}
                          </span>
                        )}
                        {policy.updated_at && policy.updated_at !== policy.created_at && (
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            Updated: {formatDate(policy.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleView(policy)}
                      className="px-3 py-2 text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-2 text-sm transition-colors"
                    >
                      <FiEye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(policy)}
                      className="px-3 py-2 text-green-600 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 flex items-center gap-2 text-sm transition-colors"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleEdit(policy)}
                      className="px-3 py-2 text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-2 text-sm transition-colors"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(policy.document_id)}
                      className="px-3 py-2 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2 text-sm transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Upload Policy Document</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFormData({ title: '', description: '', category: 'Policy', file: null });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Employee Handbook, Code of Conduct"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document File <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT up to 100MB</p>
                    {formData.file && (
                      <p className="text-sm text-green-600 mt-2">{formData.file.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setFormData({ title: '', description: '', category: 'Policy', file: null });
                    setError(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-4 h-4" />
                      Upload Policy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Edit Policy</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPolicy(null);
                    setFormData({ title: '', description: '', category: 'Policy', file: null });
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Replace Document (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>Upload new file</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Leave empty to keep current document</p>
                    {formData.file && (
                      <p className="text-sm text-green-600 mt-2">{formData.file.name}</p>
                    )}
                    {!formData.file && selectedPolicy.file_name && (
                      <p className="text-sm text-gray-500 mt-2">Current: {selectedPolicy.file_name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPolicy(null);
                    setFormData({ title: '', description: '', category: 'Policy', file: null });
                    setError(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      Update Policy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewingPolicy && documentViewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewingPolicy.title}</h2>
                {viewingPolicy.description && (
                  <p className="text-sm text-gray-600 mt-1">{viewingPolicy.description}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setViewingPolicy(null);
                  if (documentViewUrl) {
                    window.URL.revokeObjectURL(documentViewUrl);
                    setDocumentViewUrl(null);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={documentViewUrl} className="w-full h-full" title={viewingPolicy.title} />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end items-center gap-2">
              <button
                onClick={() => handleDownload(viewingPolicy)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  setViewingPolicy(null);
                  if (documentViewUrl) {
                    window.URL.revokeObjectURL(documentViewUrl);
                    setDocumentViewUrl(null);
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

