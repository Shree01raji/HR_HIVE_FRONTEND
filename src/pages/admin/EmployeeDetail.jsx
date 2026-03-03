import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { employeeAPI, documentsAPI } from '../../services/api';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, 
  FiCalendar, FiFileText, FiCheckCircle, FiXCircle, FiClock, 
  FiEye, FiDownload, FiEdit, FiAlertCircle, FiX, FiCreditCard
} from 'react-icons/fi';

export default function EmployeeDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, document: null, reason: '' });
  const [processingDocId, setProcessingDocId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  const formatRole = (role) => {
    if (!role) return '—';
    return role
      .toLowerCase()
      .split('_')
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fetchEmployeeDocuments();
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Convert employeeId to number if it's a string
      const id = typeof employeeId === 'string' ? parseInt(employeeId, 10) : employeeId;
      if (isNaN(id)) {
        setError('Invalid employee ID');
        setLoading(false);
        return;
      }
      console.log('Fetching employee with ID:', id);
      const data = await employeeAPI.get(id);
      console.log('Employee data received:', data);
      setEmployee(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching employee:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Failed to load employee details');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDocuments = async () => {
    try {
      setDocumentsLoading(true);
      // Use the dedicated endpoint to get documents for this specific employee
      console.log('📄 Fetching documents for employee ID:', employeeId);
      const employeeDocs = await documentsAPI.getEmployeeDocuments(parseInt(employeeId));
      console.log('📄 Documents received:', employeeDocs);
      console.log('📄 Number of documents:', employeeDocs?.length || 0);
      setDocuments(employeeDocs || []);
    } catch (err) {
      console.error('❌ Error fetching documents:', err);
      console.error('❌ Error response:', err.response?.data || err.message);
      console.error('❌ Error status:', err.response?.status);
      setDocuments([]);
      // Show error message if it's not a 404 (which is valid for employees with no documents)
      if (err.response?.status !== 404) {
        setError(`Failed to load documents: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      setViewingDocument(doc);
      const viewUrl = await documentsAPI.viewDocument(doc.document_id);
      setDocumentViewUrl(viewUrl);
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document');
    }
  };

  const handleApprove = async (documentId) => {
    try {
      setProcessingDocId(documentId);
      setProcessingAction('approve');
      await documentsAPI.approveDocument(documentId);
      await fetchEmployeeDocuments();
    } catch (err) {
      console.error('Error approving document:', err);
      setError('Failed to approve document');
    } finally {
      setProcessingDocId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setProcessingDocId(rejectModal.document.document_id);
      setProcessingAction('reject');
      await documentsAPI.rejectDocument(rejectModal.document.document_id, rejectModal.reason);
      setRejectModal({ show: false, document: null, reason: '' });
      await fetchEmployeeDocuments();
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError('Failed to reject document');
    } finally {
      setProcessingDocId(null);
      setProcessingAction(null);
    }
  };

  const getStatusDisplay = (status) => {
    if (status === 'APPROVED') {
      return { icon: <FiCheckCircle className="w-4 h-4 text-green-600" />, text: '✅ Verified', color: 'text-green-600', bgColor: 'bg-green-50' };
    } else if (status === 'PENDING') {
      return { icon: <FiClock className="w-4 h-4 text-yellow-600" />, text: '⚠️ Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    } else if (status === 'REJECTED') {
      return { icon: <FiXCircle className="w-4 h-4 text-red-600" />, text: '❌ Rejected', color: 'text-red-600', bgColor: 'bg-red-50' };
    }
    return { icon: <FiAlertCircle className="w-4 h-4 text-orange-600" />, text: '⚠️ Pending', color: 'text-orange-600', bgColor: 'bg-orange-50' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4 text-lg">{error}</p>
          <button
            onClick={() => navigate('/admin/employees')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  if (!employee && !loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4 text-lg">No employee data available</p>
          <button
            onClick={() => navigate('/admin/employees')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/employees')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee?.first_name || 'N/A'} {employee?.last_name || ''}
            </h1>
            <p className="text-sm text-gray-600">Employee ID: {employee?.employee_id || 'N/A'}</p>
          </div>
        </div>
        <Link
          to={`/admin/employees/${employeeId}/edit`}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <FiEdit className="w-4 h-4" />
          <span>Edit Employee</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal & Job Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FiUser className="w-5 h-5" />
              <span>Personal Information</span>
            </h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <FiMail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{employee?.email}</p>
                  {employee?.personal_email && (
                    <p className="text-xs text-gray-500">Personal: {employee.personal_email}</p>
                  )}
                </div>
              </div>
              {employee?.phone && (
                <div className="flex items-start space-x-3">
                  <FiPhone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{employee.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <FiMapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-sm font-medium text-gray-900">{employee?.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FiBriefcase className="w-5 h-5" />
              <span>Job Details</span>
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Current Role</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatRole(employee?.role)}
                </p>
              </div>
              {employee?.target_role && employee?.target_role !== employee?.role && (
                <div>
                  <p className="text-sm text-gray-500">Target Role</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatRole(employee?.target_role)}
                  </p>
                </div>
              )}
              {employee?.designation && (
                <div>
                  <p className="text-sm text-gray-500">Designation</p>
                  <p className="text-sm font-medium text-gray-900">{employee.designation}</p>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <FiCalendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Joining Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(employee?.join_date)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Onboarding Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee?.is_onboarded
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {employee?.is_onboarded ? '✅ Completed' : '⏳ In Progress'}
                </span>
              </div>
              {employee?.onboarded_at && (
                <div className="flex items-start space-x-3">
                  <FiClock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Onboarded At</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(employee.onboarded_at)}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Employment Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee?.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {employee?.status === 'ACTIVE' ? '✅ Active' : '❌ Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FiCreditCard className="w-5 h-5" />
              <span>Bank Account Details</span>
              <span className="text-xs text-gray-500 font-normal">(For Payroll Processing)</span>
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Bank Account Number</p>
                <p className="text-sm font-medium text-gray-900">
                  {employee?.bank_account_number || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IFSC Code</p>
                <p className="text-sm font-medium text-gray-900">
                  {employee?.ifsc_code || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              </div>
              {employee?.upi_id && (
                <div>
                  <p className="text-sm text-gray-500">UPI ID</p>
                  <p className="text-sm font-medium text-gray-900">{employee.upi_id}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Preferred Payment Method</p>
                <p className="text-sm font-medium text-gray-900">
                  {employee?.preferred_payment_method ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {employee.preferred_payment_method.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Not set</span>
                  )}
                </p>
              </div>
              {(!employee?.bank_account_number || !employee?.ifsc_code) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center space-x-2">
                    <FiAlertCircle className="w-4 h-4" />
                    <span>Bank account details are incomplete. Please ask the employee to update their profile.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Documents */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FiFileText className="w-5 h-5" />
                <span>Uploaded Documents</span>
              </h2>
            </div>
            <div className="p-6">
              {documentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No documents uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-2">Documents uploaded by this employee will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Document Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">View File</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Remarks</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Updated</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {documents.map((doc) => {
                        const status = getStatusDisplay(doc.verification_status);
                        return (
                          <tr key={doc.document_id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                              <div className="text-xs text-gray-500">{doc.category}</div>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => handleView(doc)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm"
                              >
                                <FiEye className="w-4 h-4" />
                                <span>View File</span>
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full ${status.bgColor}`}>
                                {status.icon}
                                <span className={`text-sm font-medium ${status.color}`}>
                                  {status.text}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-600 max-w-xs">
                                {doc.rejection_reason ? (
                                  <span className="text-red-600 italic">{doc.rejection_reason}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {formatDate(doc.updated_at)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-2">
                                {doc.verification_status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(doc.document_id)}
                                      disabled={processingDocId === doc.document_id}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                      title="Approve"
                                    >
                                      {processingDocId === doc.document_id && processingAction === 'approve' ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                      ) : (
                                        <FiCheckCircle className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setRejectModal({ show: true, document: doc, reason: '' })}
                                      disabled={processingDocId === doc.document_id}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                      title="Reject"
                                    >
                                      <FiXCircle className="w-4 h-4" />
                                    </button>
                                  </>
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
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{viewingDocument.title}</h2>
              <button
                onClick={() => {
                  setViewingDocument(null);
                  if (documentViewUrl) {
                    window.URL.revokeObjectURL(documentViewUrl);
                    setDocumentViewUrl(null);
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {viewingDocument.mime_type === 'application/pdf' ? (
                <iframe src={documentViewUrl} className="w-full h-full" title={viewingDocument.title} />
              ) : viewingDocument.mime_type.startsWith('image/') ? (
                <img src={documentViewUrl} alt={viewingDocument.title} className="max-w-full max-h-full object-contain mx-auto" />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-600">Preview not available. Please download to view.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Document</h2>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting <strong>{rejectModal.document?.title}</strong>
              </p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                rows="4"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setRejectModal({ show: false, document: null, reason: '' })}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingDocId === rejectModal.document?.document_id}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {processingDocId === rejectModal.document?.document_id && processingAction === 'reject' ? (
                    'Rejecting...'
                  ) : (
                    'Reject Document'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

