import React, { useEffect, useState, useMemo } from 'react';
import { documentsAPI } from '../../services/api';
import { 
  FiDownload,
  FiEye,
  FiFileText, 
  FiSearch,
  FiX,
  FiShield,
  FiCalendar,
  FiUser
} from 'react-icons/fi';

export default function HRPolicy() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentViewUrl, setDocumentViewUrl] = useState(null);

  useEffect(() => {
    fetchPolicyDocuments();
  }, []);

  const fetchPolicyDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch documents with category="Policy" and is_public=true
      const policyDocs = await documentsAPI.getDocuments('Policy', true);
      setDocuments(policyDocs || []);
    } catch (err) {
      console.error('Failed to load policy documents:', err);
      setError('Unable to load HR policy documents. Please try again later.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter((doc) => {
      const title = doc.title?.toLowerCase() || '';
      const description = doc.description?.toLowerCase() || '';
      const fileName = doc.file_name?.toLowerCase() || '';
      return title.includes(term) || description.includes(term) || fileName.includes(term);
    });
  }, [documents, searchTerm]);

  const handleView = async (documentId) => {
    try {
      setError(null);
      const doc = await documentsAPI.getDocument(documentId);
      setViewingDocument(doc);
      const url = await documentsAPI.viewDocument(documentId);
      setDocumentViewUrl(url);
    } catch (err) {
      console.error('Failed to open document preview:', err);
      setError('Unable to open document preview. Please try again.');
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      setError(null);
      const blob = await documentsAPI.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'policy-document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      setError('Unable to download document. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading HR policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
            <FiShield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR Policies</h1>
            <p className="text-sm text-gray-600">View and download company policy documents</p>
          </div>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex-1">
            <FiSearch className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search policies by name, description, or file..."
              className="w-full bg-transparent focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filteredDocuments.length}</span> of{' '}
              <span className="font-semibold text-gray-700">{documents.length}</span> policies
            </div>
            <button
              onClick={fetchPolicyDocuments}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="flex-1 overflow-auto">
        {filteredDocuments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 bg-white rounded-xl border border-gray-200 p-8">
            <FiFileText className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {documents.length === 0 ? 'No policy documents available' : 'No policies match your search'}
            </p>
            <p className="text-sm text-gray-500">
              {documents.length === 0 
                ? 'HR has not uploaded any policy documents yet. Please check back later.'
                : 'Try adjusting your search terms to find what you\'re looking for.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.document_id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col"
              >
                {/* Document Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FiFileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                </div>

                {/* Document Info */}
                <div className="mt-auto space-y-2">
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {doc.file_name && (
                      <div className="flex items-center gap-1">
                        <FiFileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{doc.file_name}</span>
                      </div>
                    )}
                    {doc.created_at && (
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleView(doc.document_id)}
                      className="flex-1 px-3 py-2 text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                      <FiEye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(doc.document_id, doc.file_name)}
                      className="flex-1 px-3 py-2 text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-5/6 flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{viewingDocument.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{viewingDocument.file_name}</p>
                {viewingDocument.description && (
                  <p className="text-sm text-gray-500 mt-1">{viewingDocument.description}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setViewingDocument(null);
                  if (documentViewUrl) {
                    window.URL.revokeObjectURL(documentViewUrl);
                    setDocumentViewUrl(null);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors ml-4"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 overflow-hidden bg-gray-100">
              {documentViewUrl ? (
                <iframe 
                  src={documentViewUrl} 
                  className="w-full h-full border-0" 
                  title={viewingDocument.title}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading document...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end items-center gap-2 bg-white">
              <button
                onClick={() => handleDownload(viewingDocument.document_id, viewingDocument.file_name)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 inline-flex items-center gap-2 font-medium transition-colors"
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
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

