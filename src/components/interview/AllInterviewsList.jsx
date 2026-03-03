import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiMail, FiVideo, FiPhone, FiMapPin, FiEdit, FiCheck, FiX, FiEye } from 'react-icons/fi';
import { recruitmentAPI } from '../../services/api';

const AllInterviewsList = ({ onInterviewUpdate }) => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchAllInterviews();
  }, []);

  const fetchAllInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recruitmentAPI.getInterviews();
      setInterviews(data);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
      setError('Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInterview = async (interviewId) => {
    try {
      await recruitmentAPI.completeInterview(interviewId);
      await fetchAllInterviews();
      onInterviewUpdate?.();
    } catch (err) {
      setError('Failed to complete interview');
    }
  };

  const handleCancelInterview = async (interviewId) => {
    if (window.confirm('Are you sure you want to cancel this interview?')) {
      try {
        await recruitmentAPI.cancelInterview(interviewId);
        await fetchAllInterviews();
        onInterviewUpdate?.();
      } catch (err) {
        setError('Failed to cancel interview');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterviewTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'phone': return <FiPhone className="text-blue-600" />;
      case 'video': return <FiVideo className="text-green-600" />;
      case 'in-person': return <FiMapPin className="text-purple-600" />;
      default: return <FiCalendar className="text-gray-600" />;
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Not scheduled';
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showInterviewDetails = (interview) => {
    setSelectedInterview(interview);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAllInterviews}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="text-center py-8">
        <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">No interviews scheduled</p>
        <p className="text-gray-600 mt-2">
          Interviews will appear here once they are scheduled through the HR Assistant or manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview) => (
        <div
          key={interview.interview_id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getInterviewTypeIcon(interview.interview_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {interview.candidate_name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                    {interview.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <FiMail className="w-4 h-4" />
                    <span>{interview.candidate_email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiUser className="w-4 h-4" />
                    <span>{interview.interviewer_name || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>{formatDateTime(interview.scheduled_date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiClock className="w-4 h-4" />
                    <span>{interview.duration_minutes} minutes</span>
                  </div>
                </div>

                {interview.meeting_link && (
                  <div className="mt-3">
                    <a
                      href={interview.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                    >
                      <FiVideo className="w-4 h-4" />
                      <span>Join Meeting</span>
                    </a>
                  </div>
                )}

                {interview.notes && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {interview.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => showInterviewDetails(interview)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="View Details"
              >
                <FiEye className="w-4 h-4" />
              </button>
              
              {interview.status?.toLowerCase() === 'scheduled' && (
                <>
                  <button
                    onClick={() => handleCompleteInterview(interview.interview_id)}
                    className="p-2 text-green-400 hover:text-green-600"
                    title="Mark as Completed"
                  >
                    <FiCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCancelInterview(interview.interview_id)}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Cancel Interview"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Interview Details Modal */}
      {showDetailsModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Interview Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Candidate Name
                  </label>
                  <p className="text-gray-900">{selectedInterview.candidate_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{selectedInterview.candidate_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interviewer
                  </label>
                  <p className="text-gray-900">{selectedInterview.interviewer_name || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInterview.status)}`}>
                    {selectedInterview.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <p className="text-gray-900">{formatDateTime(selectedInterview.scheduled_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <p className="text-gray-900">{selectedInterview.duration_minutes} minutes</p>
                </div>
              </div>
              
              {selectedInterview.meeting_link && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Link
                  </label>
                  <a
                    href={selectedInterview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 break-all"
                  >
                    {selectedInterview.meeting_link}
                  </a>
                </div>
              )}
              
              {selectedInterview.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedInterview.notes}</p>
                </div>
              )}
              
              {selectedInterview.feedback && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedInterview.feedback}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllInterviewsList;
