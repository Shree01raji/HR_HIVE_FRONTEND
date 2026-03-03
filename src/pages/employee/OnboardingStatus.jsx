import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FiFileText, FiUpload, FiDownload, FiTrash2, FiX, FiEye } from 'react-icons/fi';

export default function OnboardingStatus() {
  const [documentStatus, setDocumentStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRequiredDoc, setSelectedRequiredDoc] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const sortedDocumentStatus = [...documentStatus].sort((a, b) => {
    if (a.status === 'APPROVED' && b.status !== 'APPROVED') return 1;
    if (a.status !== 'APPROVED' && b.status === 'APPROVED') return -1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.document_name.localeCompare(b.document_name);
  });

  const totalRequired = sortedDocumentStatus.length;
  const completedCount = sortedDocumentStatus.filter((doc) => doc.status === 'APPROVED').length;
  const pendingCount = totalRequired - completedCount;
  const progressPercent = totalRequired ? Math.round((completedCount / totalRequired) * 100) : 0;

  useEffect(() => {
    fetchDocumentStatus();
  }, []);

  useEffect(() => {
    if (user?.role === 'EMPLOYEE' && user?.employee_id && user?.join_date && user?.is_onboarded) {
      navigate('/employee', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  const fetchDocumentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusData = await documentsAPI.getEmployeeDocumentStatus();
      setDocumentStatus(statusData || []);

      const allApproved =
        Array.isArray(statusData) &&
        statusData.length > 0 &&
        statusData.every(
          (doc) => doc.status === 'APPROVED' || doc.status === 'EXEMPTED'
        );

      if (
        allApproved &&
        user?.role === 'CANDIDATE' &&
        user?.is_onboarded === false &&
        typeof refreshUser === 'function'
      ) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error fetching document status:', err);
      setError('Failed to load document status. Please try again.');
      setDocumentStatus([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedRequiredDoc) {
      setError('Please select a document type');
      return;
    }

    try {
      setUploadingDocId(selectedRequiredDoc.required_doc_id);
      setError(null);

      const formData = new FormData();
      const fileInput = e.target.querySelector('input[type="file"]');
      const file = fileInput?.files[0];

      if (!file) {
        setError('Please select a file to upload');
        setUploadingDocId(null);
        return;
      }

      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > maxSize) {
        setError(`File size must be less than 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        setUploadingDocId(null);
        return;
      }

      formData.append('title', selectedRequiredDoc.document_name);
      formData.append('description', selectedRequiredDoc.description || '');
      formData.append('category', 'Other');
      formData.append('is_public', 'false');
      formData.append('required_doc_id', selectedRequiredDoc.required_doc_id.toString());
      formData.append('employee_required_doc_id', selectedRequiredDoc.assignment_id.toString());
      formData.append('file', file);

      await documentsAPI.uploadDocument(formData);

      setShowUploadModal(false);
      setSelectedRequiredDoc(null);
      e.target.reset();
      setError(null);
      await fetchDocumentStatus();
    } catch (err) {
      console.error('Error uploading document:', err);
      let errorMessage = 'Failed to upload document';
      if (err.response?.data?.detail) {
        errorMessage = typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : 'Failed to upload document';
      }
      setError(errorMessage);
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleView = async (documentId) => {
    try {
      const doc = await documentsAPI.getDocument(documentId);
      setViewingDocument(doc);
      const viewUrl = await documentsAPI.viewDocument(documentId);
      setDocumentViewUrl(viewUrl);
    } catch (error) {
      console.error('Error loading document for view:', error);
      setError('Failed to load document for viewing');
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const blob = await documentsAPI.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      let errorMessage = 'Failed to download document';
      if (err.response?.data?.detail) {
        errorMessage = typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : 'Failed to download document';
      }
      setError(errorMessage);
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document? You will need to upload it again.')) {
      try {
        await documentsAPI.deleteDocument(documentId);
        await fetchDocumentStatus();
      } catch (err) {
        console.error('Error deleting document:', err);
        let errorMessage = 'Failed to delete document';
        if (err.response?.data?.detail) {
          errorMessage = typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : 'Failed to delete document';
        }
        setError(errorMessage);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (size) => {
    if (!size) return '—';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding documents...</p>
        </div>
      </div>
    );
  }

  const needsAttentionDocs = sortedDocumentStatus.filter((doc) => {
    const status = doc.status || 'PENDING_UPLOAD';
    return status === 'PENDING_UPLOAD' || status === 'REJECTED';
  });

  const inReviewDocs = sortedDocumentStatus.filter(
    (doc) => (doc.status || 'PENDING_UPLOAD') === 'UNDER_REVIEW'
  );

  const completedDocs = sortedDocumentStatus.filter((doc) => {
    const status = doc.status || 'PENDING_UPLOAD';
    return status === 'APPROVED' || status === 'EXEMPTED';
  });

  const nextActionDoc =
    needsAttentionDocs[0] ||
    inReviewDocs[0] ||
    sortedDocumentStatus.find((doc) => (doc.status || 'PENDING_UPLOAD') !== 'APPROVED');

  const nextDueDocument = [...needsAttentionDocs, ...inReviewDocs].reduce(
    (closest, doc) => {
      if (!doc.due_date) return closest;
      const currentDue = new Date(doc.due_date);
      if (!closest || currentDue < new Date(closest.due_date)) {
        return doc;
      }
      return closest;
    },
    null
  );

  const renderStatusBadge = (requirementStatus) => {
    if (requirementStatus === 'APPROVED') {
      return {
        label: 'Verified',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        dotClass: 'bg-green-500',
      };
    }
    if (requirementStatus === 'UNDER_REVIEW') {
      return {
        label: 'Under Review',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        dotClass: 'bg-amber-500',
      };
    }
    if (requirementStatus === 'REJECTED') {
      return {
        label: 'Needs Attention',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        dotClass: 'bg-red-500',
      };
    }
    if (requirementStatus === 'EXEMPTED') {
      return {
        label: 'Exempted',
        bgClass: 'bg-slate-100',
        textClass: 'text-slate-600',
        dotClass: 'bg-slate-400',
      };
    }
    return {
      label: 'Pending Upload',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-700',
      dotClass: 'bg-orange-500',
    };
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.first_name || 'there'}!</h2>
            <p className="text-sm text-slate-600">
              Upload the required documents below. Once everything is verified, HR will unlock the
              rest of your employee dashboard.
            </p>
            {nextActionDoc ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <span className="font-medium text-amber-900">Next step:</span>{' '}
                <span className="font-medium">{nextActionDoc.document_name}</span>{' '}
                {nextActionDoc.status === 'REJECTED'
                  ? 'needs a corrected upload.'
                  : (nextActionDoc.status || 'PENDING_UPLOAD') === 'UNDER_REVIEW'
                  ? 'is with HR for review.'
                  : 'is ready for you to upload.'}
                {nextActionDoc.due_date && (
                  <span className="ml-1">
                    Due {new Date(nextActionDoc.due_date).toLocaleDateString()}.
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                All onboarding documents are approved. HR will finalize your account shortly.
              </div>
            )}
          </div>
          <div className="w-full max-w-md space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Progress</span>
                <span>
                  {completedCount}/{totalRequired || 0} complete
                </span>
        </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
              <p className="mt-2 text-sm text-slate-500">
                {pendingCount} pending · {inReviewDocs.length} in review · {completedCount} approved
              </p>
          </div>
          <button
            onClick={() => {
                if (nextActionDoc) {
                  setSelectedRequiredDoc(nextActionDoc);
                setShowUploadModal(true);
              } else if (sortedDocumentStatus.length > 0) {
                setSelectedRequiredDoc(sortedDocumentStatus[0]);
                setShowUploadModal(true);
              } else {
                setError('No required documents available. Please contact HR.');
              }
            }}
              className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
              <FiUpload className="mr-2 h-4 w-4" />
              Upload a document
          </button>
        </div>
      </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Document requirements</h3>
            <p className="text-sm text-slate-500">
              Upload PDFs or images up to 100 MB. You can replace a file anytime before it's
              approved.
            </p>
          </div>
          <div className="hidden text-sm text-slate-500 sm:flex sm:items-center sm:gap-3">
            <span>Pending: {pendingCount}</span>
            <span>Under review: {inReviewDocs.length}</span>
            <span>Approved: {completedCount}</span>
          </div>
        </div>

        {sortedDocumentStatus.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FiFileText className="h-12 w-12 text-slate-300" />
            <h4 className="mt-4 text-lg font-semibold text-slate-900">
              No requirements assigned
            </h4>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              HR hasn’t shared any onboarding documents yet. Check back later or contact the team if
              you were expecting them.
            </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remarks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                    </tr>
                  </thead>
              <tbody className="divide-y divide-slate-100">
                    {sortedDocumentStatus.map((docStatus, index) => {
                      const requirementStatus = docStatus.status || 'PENDING_UPLOAD';
                  const status = renderStatusBadge(requirementStatus);
                      const hasFile = docStatus.file_name && docStatus.uploaded_document_id;

                      return (
                    <tr key={docStatus.assignment_id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">{index + 1}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{docStatus.document_name}</div>
                            {docStatus.description && (
                            <p className="text-xs text-slate-500">{docStatus.description}</p>
                            )}
                            {docStatus.is_mandatory && (
                            <span className="inline-flex items-center text-[11px] font-medium text-red-600">
                                Mandatory
                              </span>
                            )}
                          {hasFile && (
                            <p className="text-xs text-slate-500">
                              Uploaded file: {docStatus.file_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.bgClass} ${status.textClass}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {docStatus.due_date
                          ? new Date(docStatus.due_date).toLocaleDateString()
                          : 'Not set'}
                          </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {docStatus.rejection_reason ? (
                          <span className="text-red-600">{docStatus.rejection_reason}</span>
                        ) : requirementStatus === 'UNDER_REVIEW' ? (
                          <span className="text-amber-600">HR is reviewing your upload</span>
                        ) : (
                          '—'
                        )}
                          </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            {hasFile ? (
                            <>
                              <button
                                onClick={() => handleView(docStatus.uploaded_document_id)}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                              >
                                <FiEye className="h-4 w-4" />
                                View
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload(docStatus.uploaded_document_id, docStatus.file_name)
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                              >
                                <FiDownload className="h-4 w-4" />
                                Download
                                  </button>
                                  <button
                                    onClick={() => handleDelete(docStatus.uploaded_document_id)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                  >
                                <FiTrash2 className="h-4 w-4" />
                                Delete
                                  </button>
                                </>
                          ) : (
                                <button
                                  onClick={() => {
                                    setSelectedRequiredDoc(docStatus);
                                    setShowUploadModal(true);
                                  }}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100"
                                >
                              <FiUpload className="h-4 w-4" />
                              Upload
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
      </section>

      {showUploadModal && selectedRequiredDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Upload {selectedRequiredDoc.document_name}</h2>
                {selectedRequiredDoc.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedRequiredDoc.description}</p>
                )}
                {selectedRequiredDoc.due_date && (
                  <p className="text-xs text-blue-600 mt-1">
                    Due by {new Date(selectedRequiredDoc.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedRequiredDoc(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                disabled={uploadingDocId === selectedRequiredDoc.required_doc_id}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <input
                  type="file"
                  name="file"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                  disabled={uploadingDocId === selectedRequiredDoc.required_doc_id}
                />
                <p className="text-xs text-gray-500 mt-1">Accepted: PDF, DOC, DOCX, JPG, PNG (Max 100MB)</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedRequiredDoc(null);
                  }}
                  disabled={uploadingDocId === selectedRequiredDoc.required_doc_id}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDocId === selectedRequiredDoc.required_doc_id}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {uploadingDocId === selectedRequiredDoc.required_doc_id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-4 h-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewingDocument.title}</h2>
                <p className="text-sm text-gray-600">{viewingDocument.file_name}</p>
              </div>
              <button
                onClick={() => {
                  setViewingDocument(null);
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
              {viewingDocument.mime_type.startsWith('image/') ? (
                <div className="h-full flex items-center justify-center bg-gray-100 p-4">
                  {documentViewUrl ? (
                    <img src={documentViewUrl} alt={viewingDocument.title} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading image...</p>
                    </div>
                  )}
                </div>
              ) : viewingDocument.mime_type === 'application/pdf' ? (
                <div className="h-full">
                  {documentViewUrl ? (
                    <iframe src={documentViewUrl} className="w-full h-full" title={viewingDocument.title} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-600">Loading PDF...</p>
                      </div>
                    </div>
                    )}
                  </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    <button
                      onClick={() => handleDownload(viewingDocument.document_id, viewingDocument.file_name)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Download to View
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{viewingDocument.category}</span>
                <span className="mx-2">•</span>
                <span>{formatFileSize(viewingDocument.file_size)}</span>
                <span className="mx-2">•</span>
                <span>{formatDate(viewingDocument.created_at)}</span>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleDownload(viewingDocument.document_id, viewingDocument.file_name)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-flex items-center space-x-2"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Download</span>
                </button>
                  <button
                  onClick={() => {
                    setViewingDocument(null);
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
        </div>
      )}
    </div>
  );
}
