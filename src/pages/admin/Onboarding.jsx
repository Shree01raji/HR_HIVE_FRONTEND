import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../../services/api';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiEye,
  FiDownload,
  FiTrash2,
  FiX,
  FiEdit,
  FiSearch,
  FiCalendar,
  FiUserPlus,
} from 'react-icons/fi';

const statusMeta = {
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
    icon: <FiCheckCircle className="w-4 h-4" />,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <FiClock className="w-4 h-4" />,
  },
  REJECTED: {
    label: 'Needs Attention',
    className: 'bg-red-100 text-red-700',
    icon: <FiAlertCircle className="w-4 h-4" />,
  },
  PENDING_UPLOAD: {
    label: 'Pending Upload',
    className: 'bg-orange-100 text-orange-700',
    icon: <FiAlertCircle className="w-4 h-4" />,
  },
  EXEMPTED: {
    label: 'Exempted',
    className: 'bg-gray-100 text-gray-600',
    icon: <FiAlertCircle className="w-4 h-4" />,
  },
};

export default function OnboardingAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, document: null, reason: '' });
  const [processingDocId, setProcessingDocId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [showRequiredDocModal, setShowRequiredDocModal] = useState(false);
  const [editingRequiredDoc, setEditingRequiredDoc] = useState(null);
  const [requiredDocForm, setRequiredDocForm] = useState({
    document_name: '',
    description: '',
    is_mandatory: true,
  });
  const [exemptModal, setExemptModal] = useState({ show: false, assignment: null, reason: '' });
  const [bulkDates, setBulkDates] = useState({});

  useEffect(() => {
    setError(null);
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'pending') {
      fetchPendingDocuments();
    } else if (activeTab === 'templates') {
      fetchRequiredDocuments();
    }
  }, [activeTab]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getRequirementsOverview();
      setOverview(data || []);
    } catch (err) {
      console.error('Error fetching requirements overview:', err);
      setError('Failed to load onboarding requirements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getPendingDocuments();
      setPendingDocuments(data || []);
    } catch (err) {
      console.error('Error fetching pending documents:', err);
      setError('Failed to load pending documents.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequiredDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getRequiredDocuments();
      setRequiredDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch required documents:', err);
      setError('Failed to load required document templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (documentId) => {
    try {
      setProcessingDocId(documentId);
      setProcessingAction('approve');
      await documentsAPI.approveDocument(documentId);
      if (activeTab === 'pending') {
        await fetchPendingDocuments();
      }
      await fetchOverview();
    } catch (err) {
      console.error('Error approving document:', err);
      setError('Failed to approve document.');
    } finally {
      setProcessingDocId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    const documentId = rejectModal.document.document_id;
    if (!rejectModal.reason.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    try {
      setProcessingDocId(documentId);
      setProcessingAction('reject');
      await documentsAPI.rejectDocument(documentId, rejectModal.reason);
      setRejectModal({ show: false, document: null, reason: '' });
      if (activeTab === 'pending') {
        await fetchPendingDocuments();
      }
      await fetchOverview();
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError('Failed to reject document.');
    } finally {
      setProcessingDocId(null);
      setProcessingAction(null);
    }
  };

  const handleView = async (doc) => {
    try {
      setViewingDocument(doc);
      const viewUrl = await documentsAPI.viewDocument(doc.document_id);
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
      setError('Failed to download document.');
    }
  };

  const handleDeleteRequiredDoc = async (requiredDocId) => {
    if (window.confirm('Delete this template? Employees will no longer see this requirement.')) {
      try {
        await documentsAPI.deleteRequiredDocument(requiredDocId);
        await fetchRequiredDocuments();
        await fetchOverview();
      } catch (err) {
        console.error('Failed to delete required document:', err);
        setError(err.response?.data?.detail || 'Failed to delete required document');
      }
    }
  };

  const handleSaveRequiredDoc = async (e) => {
    e.preventDefault();
    try {
      if (editingRequiredDoc) {
        await documentsAPI.updateRequiredDocument(
          editingRequiredDoc.required_doc_id,
          requiredDocForm
        );
      } else {
        await documentsAPI.createRequiredDocument(requiredDocForm);
      }
      setShowRequiredDocModal(false);
      setEditingRequiredDoc(null);
      setRequiredDocForm({ document_name: '', description: '', is_mandatory: true });
      await fetchRequiredDocuments();
      await fetchOverview();
    } catch (err) {
      console.error('Failed to save required document:', err);
      setError(err.response?.data?.detail || 'Failed to save required document');
    }
  };

  const handleAssignDueDate = async (assignmentId, dueDate) => {
    try {
      const payload = {
        due_date: dueDate && dueDate.trim() ? dueDate : null,
      };
      console.log('Updating assignment:', assignmentId, 'with date:', dueDate);
      await documentsAPI.updateAssignment(assignmentId, payload);
      await fetchOverview();
    } catch (err) {
      console.error('Failed to update due date:', err);
      setError(err.response?.data?.detail || 'Failed to update due date.');
    }
  };

  const handleSetAllDueDates = async (employee, dueDate) => {
    if (!dueDate || !dueDate.trim()) {
      setError('Please select a date first.');
      return;
    }
    try {
      const updatePromises = employee.assignments.map((assignment) =>
        documentsAPI.updateAssignment(assignment.assignment_id, {
          due_date: dueDate,
        })
      );
      await Promise.all(updatePromises);
      await fetchOverview();
    } catch (err) {
      console.error('Failed to update all due dates:', err);
      setError(err.response?.data?.detail || 'Failed to update all due dates.');
    }
  };

  const handleExemptDocument = async () => {
    const assignmentId = exemptModal.assignment.assignment_id;
    if (!exemptModal.reason.trim()) {
      setError('Please provide a reason for exempting this document.');
      return;
    }
    try {
      await documentsAPI.updateAssignment(assignmentId, {
        status: 'EXEMPTED',
        notes: exemptModal.reason,
      });
      setExemptModal({ show: false, assignment: null, reason: '' });
      await fetchOverview();
    } catch (err) {
      console.error('Failed to exempt document:', err);
      setError('Failed to exempt document.');
    }
  };

  const filteredOverview = useMemo(() => {
    if (!overview || !Array.isArray(overview)) return [];
    if (!searchTerm.trim()) return overview;
    return overview.filter((employee) =>
      employee?.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.employee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee?.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [overview, searchTerm]);

  const overviewStats = useMemo(() => {
    const totalEmployees = overview.length;
    const totalAssignments = overview.reduce((acc, item) => acc + item.total_required, 0);
    const completedAssignments = overview.reduce((acc, item) => acc + item.completed, 0);
    const pendingAssignments = totalAssignments - completedAssignments;
    const completionRate = totalAssignments
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;
    return {
      totalEmployees,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      completionRate,
    };
  }, [overview]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Employees</p>
          <p className="text-2xl font-semibold text-gray-900">{overviewStats.totalEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Required Documents</p>
          <p className="text-2xl font-semibold text-gray-900">{overviewStats.totalAssignments}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600">
            {overviewStats.completedAssignments}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-blue-600">
              {overviewStats.completionRate}%
            </p>
            <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${overviewStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex-1">
            <FiSearch className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee name, email, or department"
              className="w-full bg-transparent focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] text-sm"
          >
            Refresh
          </button>
        </div>

        {filteredOverview.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No employees match your filters.</div>
        ) : (
          <div className="space-y-4">
            {filteredOverview.map((employee) => (
              <div
                key={employee.employee_id}
                className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{employee.employee_name}</h3>
                    <p className="text-sm text-gray-600">{employee.employee_email}</p>
                    {employee.department && (
                      <p className="text-xs text-gray-500">Department: {employee.department}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-blue-600">
                        {employee.completed}/{employee.total_required}
                      </p>
                      <p className="text-xs text-gray-500">Approved</p>
                    </div>
                    <div className="w-36">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>
                          {employee.total_required
                            ? Math.round((employee.completed / employee.total_required) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${
                              employee.total_required
                                ? Math.round((employee.completed / employee.total_required) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-600" />
                    <input
                      type="date"
                      value={bulkDates[employee.employee_id] || ''}
                      onChange={(e) => setBulkDates({ ...bulkDates, [employee.employee_id]: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Set date for all"
                    />
                    <button
                      onClick={() => {
                        const date = bulkDates[employee.employee_id];
                        if (date && date.trim()) {
                          handleSetAllDueDates(employee, date);
                        } else {
                          setError('Please select a date first.');
                        }
                      }}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      title="Set this date for all documents"
                    >
                      Set All
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          File
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employee.assignments.map((assignment) => {
                        const meta = statusMeta[assignment.status] || statusMeta.PENDING_UPLOAD;
                        return (
                          <tr key={assignment.assignment_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.document_name}
                              </div>
                              {assignment.is_mandatory && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full mt-1">
                                  Mandatory
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FiCalendar className="w-4 h-4" />
                                <input
                                  key={`due-date-${assignment.assignment_id}`}
                                  id={`due-date-${assignment.assignment_id}`}
                                  type="date"
                                  value={
                                    assignment.due_date ? assignment.due_date.substring(0, 10) : ''
                                  }
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    handleAssignDueDate(
                                      assignment.assignment_id,
                                      newDate
                                    );
                                  }}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}
                              >
                                {meta.icon}
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {assignment.file_name ? assignment.file_name : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                {assignment.uploaded_document_id ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleView({
                                          document_id: assignment.uploaded_document_id,
                                          title: assignment.document_name,
                                          file_name: assignment.file_name,
                                        })
                                      }
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                      title="View"
                                    >
                                      <FiEye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDownload(
                                          assignment.uploaded_document_id,
                                          assignment.file_name
                                        )
                                      }
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                      title="Download"
                                    >
                                      <FiDownload className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : assignment.status === 'EXEMPTED' ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-600">Exempted</span>
                                    {assignment.notes && (
                                      <span className="text-xs text-gray-500 italic" title={assignment.notes}>
                                        {assignment.notes.length > 30 
                                          ? assignment.notes.substring(0, 30) + '...' 
                                          : assignment.notes}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Awaiting upload</span>
                                    <button
                                      onClick={() => setExemptModal({ show: true, assignment, reason: '' })}
                                      className="px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded border border-orange-200"
                                      title="Mark as unavailable"
                                    >
                                      Not Available
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPending = () => (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      {pendingDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FiCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending documents for verification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDocuments.map((doc) => (
            <div key={doc.document_id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FiClock className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                    <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                      {doc.category}
                    </span>
                  </div>
                  {doc.description && <p className="text-sm text-gray-600 mb-2">{doc.description}</p>}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</div>
                    <div>File: {doc.file_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleView(doc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="View"
                  >
                    <FiEye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleApprove(doc.document_id)}
                    disabled={processingDocId !== null}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    {processingDocId === doc.document_id && processingAction === 'approve'
                      ? 'Approving...'
                      : 'Approve'}
                  </button>
                  <button
                    onClick={() => setRejectModal({ show: true, document: doc, reason: '' })}
                    disabled={processingDocId !== null}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    {processingDocId === doc.document_id && processingAction === 'reject'
                      ? 'Rejecting...'
                      : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTemplates = () => (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Required Document Templates</h3>
          <p className="text-sm text-gray-600">
            Define the standard documents every new hire must upload
          </p>
        </div>
        <button
          onClick={() => {
            setRequiredDocForm({ document_name: '', description: '', is_mandatory: true });
            setEditingRequiredDoc(null);
            setShowRequiredDocModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <FiFileText className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {requiredDocuments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No required documents defined. Click "Add Template" to create onboarding requirements.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sl. No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Document Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Mandatory
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requiredDocuments.map((doc, index) => (
                <tr key={doc.required_doc_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">{index + 1}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 font-medium">{doc.document_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{doc.description || '—'}</td>
                  <td className="px-4 py-4">
                    {doc.is_mandatory ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        Mandatory
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRequiredDoc(doc);
                          setRequiredDocForm({
                            document_name: doc.document_name,
                            description: doc.description || '',
                            is_mandatory: doc.is_mandatory,
                          });
                          setShowRequiredDocModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRequiredDoc(doc.required_doc_id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Onboarding Control Center</h1>
          <p className="text-sm text-gray-600">
            Assign requirements, track submissions, approve documents, and welcome new hires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/employees/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70]"
          >
            <FiUserPlus className="w-4 h-4" />
            Add Employee
          </button>
          <button
            onClick={() => {
              if (activeTab === 'overview') fetchOverview();
              if (activeTab === 'pending') fetchPendingDocuments();
              if (activeTab === 'templates') fetchRequiredDocuments();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Verification
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'templates'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Templates
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'pending' && renderPending()}
        {activeTab === 'templates' && renderTemplates()}
      </div>

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
              {documentViewUrl ? (
                <iframe src={documentViewUrl} className="w-full h-full" title={viewingDocument.title} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading document...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end items-center gap-2">
              <button
                onClick={() => handleDownload(viewingDocument.document_id, viewingDocument.file_name)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Download
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
      )}

      {rejectModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Document</h2>
              <p className="text-sm text-gray-600 mb-4">
                Provide a reason for rejecting <strong>{rejectModal.document?.title}</strong>
              </p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Enter rejection reason..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 resize-none"
                rows="4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectModal({ show: false, document: null, reason: '' })}
                  disabled={processingDocId !== null}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingDocId !== null}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {processingDocId === rejectModal.document?.document_id && processingAction === 'reject'
                    ? 'Rejecting...'
                    : 'Reject Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRequiredDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRequiredDoc ? 'Edit Required Document' : 'Add Required Document'}
              </h2>
              <button
                onClick={() => {
                  setShowRequiredDocModal(false);
                  setEditingRequiredDoc(null);
                  setRequiredDocForm({ document_name: '', description: '', is_mandatory: true });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRequiredDoc} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  value={requiredDocForm.document_name}
                  onChange={(e) => setRequiredDocForm({ ...requiredDocForm, document_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={requiredDocForm.description}
                  onChange={(e) => setRequiredDocForm({ ...requiredDocForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows="3"
                  placeholder="Optional instructions or notes"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={requiredDocForm.is_mandatory}
                  onChange={(e) => setRequiredDocForm({ ...requiredDocForm, is_mandatory: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_mandatory" className="text-sm text-gray-700">
                  Mandatory document (employees must upload this)
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequiredDocModal(false);
                    setEditingRequiredDoc(null);
                    setRequiredDocForm({ document_name: '', description: '', is_mandatory: true });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingRequiredDoc ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exemptModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mark Document as Unavailable</h2>
              <p className="text-sm text-gray-600 mb-4">
                Provide a reason why <strong>{exemptModal.assignment?.document_name}</strong> is not available for this employee.
              </p>
              <textarea
                value={exemptModal.reason}
                onChange={(e) => setExemptModal({ ...exemptModal, reason: e.target.value })}
                placeholder="Enter reason (e.g., Document lost, Not applicable, etc.)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 resize-none"
                rows="4"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setExemptModal({ show: false, assignment: null, reason: '' })}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExemptDocument}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Mark as Unavailable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}