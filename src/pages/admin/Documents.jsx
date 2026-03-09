import React, { useEffect, useMemo, useState } from 'react';
import { documentsAPI } from '../../services/api';
import { 
  FiCheckCircle,
  FiDownload,
  FiEye,
  FiFileText, 
  FiSearch,
  FiUsers,
  FiLayers,
  FiX,
} from 'react-icons/fi';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function AdminDocuments() {
  const [departmentDocs, setDepartmentDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);

  useEffect(() => {
    fetchApprovedDocuments();
  }, []);

  const fetchApprovedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await documentsAPI.getRequirementsOverview();
      const grouped = {};

      (overview || []).forEach((employee) => {
        const department = employee.department || 'Unassigned';
        const approvedAssignments = (employee.assignments || []).filter(
          (assignment) =>
            assignment.status === 'APPROVED' && assignment.uploaded_document_id && assignment.file_name
        );

        if (!approvedAssignments.length) {
          return;
        }

        if (!grouped[department]) {
          grouped[department] = [];
        }

        approvedAssignments.forEach((assignment) => {
          grouped[department].push({
            assignmentId: assignment.assignment_id,
            documentId: assignment.uploaded_document_id,
            documentName: assignment.document_name,
            fileName: assignment.file_name,
            employeeName: employee.employee_name,
            employeeEmail: employee.employee_email,
            department,
            verifiedAt: assignment.completed_at,
            dueDate: assignment.due_date,
            notes: assignment.notes,
          });
        });
      });

      setDepartmentDocs(grouped);
    } catch (err) {
      console.error('Failed to load approved documents:', err);
      setError('Unable to load approved documents.');
      setDepartmentDocs({});
    } finally {
      setLoading(false);
    }
  };

  const flattenDocs = useMemo(() => {
    return Object.entries(departmentDocs).flatMap(([dept, docs]) =>
      docs.map((doc) => ({ ...doc, department: dept }))
    );
  }, [departmentDocs]);

  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) {
      return departmentDocs;
    }

    const term = searchTerm.toLowerCase();
    const filtered = {};

    Object.entries(departmentDocs).forEach(([dept, docs]) => {
      const matches = docs.filter((doc) => {
        const docName = doc.documentName?.toLowerCase() || '';
        const fileName = doc.fileName?.toLowerCase() || '';
        const employee = doc.employeeName?.toLowerCase() || '';
        const email = doc.employeeEmail?.toLowerCase() || '';
        return (
          docName.includes(term) ||
          fileName.includes(term) ||
          employee.includes(term) ||
          email.includes(term)
        );
      });

      if (matches.length) {
        filtered[dept] = matches;
      }
    });

    return filtered;
  }, [departmentDocs, searchTerm]);

  const stats = useMemo(() => {
    const departments = Object.keys(departmentDocs).length;
    const totalDocs = flattenDocs.length;
    const uniqueEmployees = new Set(flattenDocs.map((doc) => doc.employeeEmail)).size;

    return {
      departments,
      totalDocs,
      uniqueEmployees,
    };
  }, [departmentDocs, flattenDocs]);

  const handleView = async (doc) => {
    try {
      setError(null);
      const metadata = await documentsAPI.getDocument(doc.documentId);
      setViewingDocument({
        ...metadata,
        employeeName: doc.employeeName,
        employeeEmail: doc.employeeEmail,
        department: doc.department,
      });
      const url = await documentsAPI.viewDocument(doc.documentId);
      setDocumentViewUrl(url);
    } catch (err) {
      console.error('Failed to open document preview:', err);
      setError('Unable to open document preview.');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      setError('Unable to download document.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approved documents...</p>
        </div>
      </div>
    );
  }

   const groupByDocumentName = (docs = []) => {
    return docs.reduce((acc, doc) => {
    const key = doc.documentName || 'Others';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
   }, {});
 };


  return (
    <div className="h-screen flex flex-col p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Approved Documents by Department</h1>
          <p className="text-sm text-gray-600">
            Every document listed here has been reviewed and approved. Need to verify new uploads? Head back to the Onboarding workspace.
          </p>
        </div>
        <button
          onClick={fetchApprovedDocuments}
          className="px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70]"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Departments</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.departments}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved Documents</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalDocs}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <FiUsers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Employees Covered</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.uniqueEmployees}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex-1">
            <FiSearch className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by document, employee, or email"
              className="w-full bg-transparent focus:outline-none text-sm"
            />
          </div>
          <div className="text-sm text-gray-500">
            Showing {Object.keys(filteredDepartments).length} department(s)
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* DEPARTMENT FOLDERS */}
      {!activeDepartment && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Object.entries(filteredDepartments).map(([dept, docs]) => (
            <div
              key={dept}
              onClick={() => setActiveDepartment(dept)}
              className="cursor-pointer bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <FiLayers className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{dept}</h3>
                  <p className="text-sm text-gray-500">
                    {docs.length} document(s)
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENT TYPE FOLDERS */}
      {activeDepartment && (
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">
              📁 {activeDepartment}
            </h2>
            <button
              onClick={() => setActiveDepartment(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to departments
            </button>
          </div>

          <div className="space-y-6 p-4">
            {Object.entries(
              groupByDocumentName(filteredDepartments[activeDepartment])
            ).map(([docType, docs]) => (
              <div
                key={docType}
                className="border rounded-xl bg-gray-50"
              >
                {/* DOCUMENT TYPE HEADER */}
                <div className="px-4 py-3 bg-white border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    <h3 className="font-semibold">{docType}</h3>
                  </div>
                  <span className="text-sm text-gray-500">
                    {docs.length} file(s)
                  </span>
                </div>

                {/* FILES */}
                <div className="divide-y">
                  {docs.map((doc) => (
                    <div
                      key={doc.assignmentId}
                      className="px-4 py-4 flex flex-col md:flex-row md:justify-between gap-4 bg-white"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <FiCheckCircle className="text-green-600" />
                          <span className="font-medium">
                            {doc.employeeName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {doc.employeeEmail}
                        </p>
                        <div className="mt-1 text-xs text-gray-500 flex gap-4">
                          {doc.fileName && <span>{doc.fileName}</span>}
                          {doc.verifiedAt && (
                            <span>
                              Verified: {formatDate(doc.verifiedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="px-3 py-2 text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-2"
                        >
                          <FiEye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-3 py-2 text-green-600 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 text-sm flex items-center gap-2"
                        >
                          <FiDownload className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="font-semibold">
                  {viewingDocument.title || viewingDocument.file_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {viewingDocument.employeeName} •{' '}
                  {viewingDocument.department}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewingDocument(null);
                  if (documentViewUrl) {
                    URL.revokeObjectURL(documentViewUrl);
                    setDocumentViewUrl(null);
                  }
                }}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1">
              {documentViewUrl && (
                <iframe
                  src={documentViewUrl}
                  className="w-full h-full"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


