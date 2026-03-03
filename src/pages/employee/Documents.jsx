import React, { useEffect, useMemo, useState } from 'react';
import { documentsAPI } from '../../services/api';
import { 
  FiCheckCircle,
  FiDownload,
  FiEye,
  FiFileText, 
  FiSearch,
  FiX,
} from 'react-icons/fi';

export default function Documents() {
  const [documentStatus, setDocumentStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);

  useEffect(() => {
    fetchDocumentStatus();
  }, []);

  const fetchDocumentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusData = await documentsAPI.getEmployeeDocumentStatus();
      setDocumentStatus(statusData || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Unable to load verified documents.');
      setDocumentStatus([]);
    } finally {
      setLoading(false);
    }
  };

  const verifiedDocuments = useMemo(
    () => (documentStatus || []).filter((doc) => doc.status === 'APPROVED'),
    [documentStatus]
  );

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return verifiedDocuments;
    const term = searchTerm.toLowerCase();
    return verifiedDocuments.filter((doc) => {
      const name = doc.document_name?.toLowerCase() || '';
      const file = doc.file_name?.toLowerCase() || '';
      const notes = doc.description?.toLowerCase() || '';
      return name.includes(term) || file.includes(term) || notes.includes(term);
    });
  }, [verifiedDocuments, searchTerm]);

  const handleView = async (documentId) => {
    try {
      setError(null);
      const doc = await documentsAPI.getDocument(documentId);
      setViewingDocument(doc);
      const url = await documentsAPI.viewDocument(documentId);
      setDocumentViewUrl(url);
    } catch (err) {
      console.error('Failed to open document preview:', err);
      setError('Unable to open document preview.');
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const blob = await documentsAPI.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      setError('Unable to download document.');
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
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verified documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Verified Documents</h1>
          <p className="text-sm text-gray-600">All documents that HR has approved during onboarding.</p>
        </div>
        <button
          onClick={fetchDocumentStatus}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex-1">
            <FiSearch className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by document name or file"
              className="w-full bg-transparent focus:outline-none text-sm"
            />
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredDocuments.length} of {verifiedDocuments.length}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {filteredDocuments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <FiFileText className="w-14 h-14 mb-4" />
            <p className="text-lg font-semibold">No verified documents yet</p>
            <p className="text-sm text-gray-400">Upload pending requirements from the onboarding tab to see them here once approved.</p>
              </div>
            ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.assignment_id}
                className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900">{doc.document_name}</h3>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-500">{doc.description}</p>
                            )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    {doc.file_name && <span>File: {doc.file_name}</span>}
                    {doc.completed_at && <span>Verified: {formatDate(doc.completed_at)}</span>}
                      </div>
                            </div>
                <div className="flex items-center gap-2">
                        <button
                    onClick={() => handleView(doc.uploaded_document_id)}
                    className="px-3 py-2 text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-2 text-sm"
                        >
                          <FiEye className="w-4 h-4" />
                    View
                        </button>
                        <button
                    onClick={() => handleDownload(doc.uploaded_document_id, doc.file_name)}
                    className="px-3 py-2 text-green-600 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 flex items-center gap-2 text-sm"
                        >
                          <FiDownload className="w-4 h-4" />
                    Download
                        </button>
                      </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-5/6 flex flex-col">
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
    </div>
  );
}
