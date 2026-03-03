import React, { useState, useEffect } from 'react';
import { FiFileText, FiClock, FiCheckCircle, FiXCircle, FiStar, FiEye, FiRefreshCw, FiVideo, FiMapPin, FiCalendar, FiUser, FiExternalLink } from 'react-icons/fi';
import { applicationsAPI } from '../../services/api';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchInterviewDetails();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await applicationsAPI.getMyApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError('Failed to load your applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewDetails = async () => {
    try {
      const data = await applicationsAPI.getInterviewDetails();
      setInterviews(data.interviews || []);
    } catch (err) {
      console.error('Failed to fetch interview details:', err);
    }
  };

  // Helper to check if status should show as "Under Review" for candidates
  const isUnderReview = (status) => {
    return !['Hired', 'Rejected'].includes(status);
  };

  // Helper to filter out "Generated from Question Bank" text from notes
  const filterNotes = (notes) => {
    if (!notes) return '';
    return notes.replace(/\s*-\s*Generated from Question Bank: [^\n]+/g, '').trim();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Hired': return <FiCheckCircle className="w-5 h-5" />;
      case 'Rejected': return <FiXCircle className="w-5 h-5" />;
      case 'Qualified':
      case 'Applied':
      case 'Scanning':
      case 'Forwarded':
      case 'Shortlisted':
      case 'Interview':
      case 'Offer':
      default: return <FiClock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hired': return 'bg-emerald-100 text-emerald-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Qualified':
      case 'Applied':
      case 'Scanning':
      case 'Forwarded':
      case 'Shortlisted':
      case 'Interview':
      case 'Offer':
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const getStatusText = (status) => {
    // Explicitly handle all statuses
    switch (status) {
      case 'Hired': return 'Hired';
      case 'Rejected': return 'Not Selected';
      case 'Qualified':
      case 'Applied':
      case 'Scanning':
      case 'Forwarded':
      case 'Shortlisted':
      case 'Interview':
      case 'Offer':
      default: return 'Under Review';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreText = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
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
          onClick={fetchApplications}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600">Track your job applications and their status</p>
        </div>
        <button
          onClick={() => {
            fetchApplications();
            fetchInterviewDetails();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiClock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(app => isUnderReview(app.status)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hired</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(app => app.status === 'Hired').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Not Selected</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(app => app.status === 'Rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interview Details Section */}
      {interviews.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiCalendar className="w-5 h-5 mr-2 text-blue-600" />
              Interview Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">Your scheduled interviews</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {interviews.map((interview) => {
                const interviewDate = new Date(interview.scheduled_date);
                const isOnline = interview.interview_type === 'video' || interview.interview_type === 'online';
                
                // Check if this is Round 1 aptitude test (test link, not Zoom)
                const isAptitudeTest = interview.interview_round === 1 && 
                                      interview.meeting_link && 
                                      (interview.meeting_link.includes('/candidate/test/') || 
                                       interview.meeting_link.includes('candidate/test'));
                
                return (
                  <div key={interview.interview_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{interview.job_title}</h3>
                        <p className="text-sm text-gray-600">Round {interview.interview_round}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        interview.status === 'scheduled' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <FiCalendar className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-medium">{interviewDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                        <span className="ml-2 text-gray-600">
                          at {interviewDate.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-700">
                        <FiClock className="w-4 h-4 mr-2 text-gray-500" />
                        <span>Duration: {interview.duration_minutes} minutes</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-700">
                        <FiUser className="w-4 h-4 mr-2 text-gray-500" />
                        <span>Interviewer: {interview.interviewer_name}</span>
                      </div>
                      
                      {/* Show Test Link for Round 1 Aptitude Test */}
                      {isAptitudeTest ? (
                        <div className="flex items-center text-sm">
                          <FiFileText className="w-4 h-4 mr-2 text-green-600" />
                          <button
                            onClick={() => {
                              const testUrl = interview.meeting_link.startsWith('http') 
                                ? interview.meeting_link 
                                : `${window.location.origin}${interview.meeting_link.startsWith('/') ? interview.meeting_link : '/' + interview.meeting_link}`;
                              
                              // Open test in new window with security features
                              const testWindow = window.open(
                                testUrl,
                                'AptitudeTest',
                                'width=1200,height=800,resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no'
                              );
                              
                              if (testWindow) {
                                testWindow.focus();
                              } else {
                                alert('Please allow popups for this site to take the test in a secure window.');
                              }
                            }}
                            className="text-green-600 hover:text-green-800 font-medium flex items-center cursor-pointer"
                          >
                            Take Aptitude Test
                            <FiExternalLink className="w-3 h-3 ml-1" />
                          </button>
                        </div>
                      ) : isOnline && interview.meeting_link && !isAptitudeTest ? (
                        <div className="flex items-center text-sm">
                          <FiVideo className="w-4 h-4 mr-2 text-blue-600" />
                          <a 
                            href={interview.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                          >
                            Join Zoom Meeting
                            <FiExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      ) : interview.location ? (
                        <div className="flex items-center text-sm text-gray-700">
                          <FiMapPin className="w-4 h-4 mr-2 text-red-600" />
                          <span className="font-medium">Venue: {interview.location}</span>
                        </div>
                      ) : null}
                    </div>
                    
                    {interview.notes && filterNotes(interview.notes) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">{filterNotes(interview.notes)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start applying for jobs to see your applications here.
            </p>
            <div className="mt-6">
              <a
                href="/candidate/careers"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Jobs
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.application_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {application.job?.title || 'Loading...'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.job?.department || 'Loading...'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full mr-2 ${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusText(application.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(application.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <FiXCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Job Position</h4>
                  <p className="text-sm text-gray-600">{selectedApplication.job?.title}</p>
                  <p className="text-sm text-gray-600">{selectedApplication.job?.department}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Application Status</h4>
                  <div className="flex items-center">
                    <div className={`p-1 rounded-full mr-2 ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusIcon(selectedApplication.status)}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                      {getStatusText(selectedApplication.status)}
                    </span>
                  </div>
                </div>
                
                
                {selectedApplication.cover_letter && (
                  <div>
                    <h4 className="font-medium text-gray-900">Cover Letter</h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {selectedApplication.cover_letter}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
