import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye, FiUser, FiCalendar, FiStar, FiFileText, FiRefreshCw } from 'react-icons/fi';
import { applicationsAPI } from '../../services/api';

export default function QualifiedApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchQualifiedApplications();
  }, []);

  const fetchQualifiedApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await applicationsAPI.getQualifiedApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch qualified applications:', err);
      setError('Failed to load qualified applications');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToHR = async (applicationId) => {
    try {
      await applicationsAPI.forwardToHR(applicationId);
      await fetchQualifiedApplications();
    } catch (err) {
      console.error('Failed to forward application:', err);
      setError('Failed to forward application to HR');
    }
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      await applicationsAPI.updateApplicationStatus(applicationId, { status: newStatus });
      await fetchQualifiedApplications();
    } catch (err) {
      console.error('Failed to update application status:', err);
      setError('Failed to update application status');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'forwarded': return 'bg-blue-100 text-blue-800';
      case 'shortlisted': return 'bg-purple-100 text-purple-800';
      case 'interview': return 'bg-yellow-100 text-yellow-800';
      case 'hired': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchQualifiedApplications}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Header - Compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Qualified Applications</h2>
          <p className="text-sm text-gray-600">AI-screened applications ready for HR review</p>
        </div>
        <button
          onClick={fetchQualifiedApplications}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <FiCheck className="w-4 h-4 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Qualified</p>
              <p className="text-lg font-bold text-gray-900">
                {applications.filter(app => app.status === 'qualified').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FiFileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Forwarded</p>
              <p className="text-lg font-bold text-gray-900">
                {applications.filter(app => app.status === 'forwarded').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <FiStar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Shortlisted</p>
              <p className="text-lg font-bold text-gray-900">
                {applications.filter(app => app.status === 'shortlisted').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 bg-yellow-100 rounded-lg">
              <FiCalendar className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Interview</p>
              <p className="text-lg font-bold text-gray-900">
                {applications.filter(app => app.status === 'interview').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List - Fits screen height */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white rounded-lg shadow overflow-auto">
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <FiFileText className="mx-auto h-8 w-8 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No qualified applications</h3>
              <p className="mt-1 text-xs text-gray-500">
                No applications have been qualified by AI yet.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.application_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6">
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <FiUser className="h-3 w-3 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="text-xs font-medium text-gray-900">
                            {application.candidate?.first_name} {application.candidate?.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-24">{application.candidate?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{application.job?.title}</div>
                      <div className="text-xs text-gray-500">{application.job?.department}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {application.ai_score ? (
                        <span className={`text-sm font-bold ${getScoreColor(application.ai_score)}`}>
                          {application.ai_score.toFixed(1)}/100
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {new Date(application.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEye className="w-3 h-3" />
                        </button>
                        {application.status === 'qualified' && (
                          <button
                            onClick={() => handleForwardToHR(application.application_id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <FiCheck className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(application.application_id, 'shortlisted')}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <FiStar className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(application.application_id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Candidate Information</h4>
                  <p className="text-sm text-gray-600">
                    {selectedApplication.candidate?.first_name} {selectedApplication.candidate?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedApplication.candidate?.email}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Job Position</h4>
                  <p className="text-sm text-gray-600">{selectedApplication.job?.title}</p>
                  <p className="text-sm text-gray-600">{selectedApplication.job?.department}</p>
                </div>
                
                {selectedApplication.ai_score && (
                  <div>
                    <h4 className="font-medium text-gray-900">AI Analysis</h4>
                    <p className="text-sm text-gray-600">
                      <span className={`font-bold ${getScoreColor(selectedApplication.ai_score)}`}>
                        Score: {selectedApplication.ai_score.toFixed(1)}/100
                      </span>
                    </p>
                  </div>
                )}
                
                {selectedApplication.ai_feedback && (
                  <div>
                    <h4 className="font-medium text-gray-900">AI Feedback</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {selectedApplication.ai_feedback}
                    </div>
                  </div>
                )}
                
                {selectedApplication.cover_letter && (
                  <div>
                    <h4 className="font-medium text-gray-900">Cover Letter</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {selectedApplication.cover_letter}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                {selectedApplication.status === 'qualified' && (
                  <button
                    onClick={() => {
                      handleForwardToHR(selectedApplication.application_id);
                      setShowModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Forward to HR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
