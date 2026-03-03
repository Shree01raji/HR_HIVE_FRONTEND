import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiMail, FiVideo, FiPhone, FiMapPin, FiEdit, FiCheck, FiX, FiEye } from 'react-icons/fi';
import { recruitmentAPI } from '../../services/api';

const InterviewList = ({ candidateId, onInterviewUpdate }) => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (candidateId) {
      fetchInterviews();
    }
  }, [candidateId]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await recruitmentAPI.getCandidateInterviews(candidateId);
      setInterviews(data);
    } catch (err) {
      setError('Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInterview = async (interviewId) => {
    try {
      await recruitmentAPI.completeInterview(interviewId);
      await fetchInterviews();
      onInterviewUpdate?.();
    } catch (err) {
      setError('Failed to complete interview');
    }
  };

  const handleCancelInterview = async (interviewId) => {
    if (window.confirm('Are you sure you want to cancel this interview?')) {
      try {
        await recruitmentAPI.cancelInterview(interviewId);
        await fetchInterviews();
        onInterviewUpdate?.();
      } catch (err) {
        setError('Failed to cancel interview');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case 'phone': return <FiPhone className="text-blue-600" />;
      case 'video': return <FiVideo className="text-green-600" />;
      case 'in-person': return <FiMapPin className="text-purple-600" />;
      default: return <FiCalendar className="text-gray-600" />;
    }
  };

  const formatDateTime = (dateTime) => {
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
          onClick={fetchInterviews}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FiCalendar size={48} className="mx-auto mb-4 text-gray-300" />
        <p>No interviews scheduled for this candidate</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interviews.map((interview) => (
        <div key={interview.interview_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                {getInterviewTypeIcon(interview.interview_type)}
                <h3 className="text-lg font-semibold text-gray-800">
                  {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                  {interview.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <FiCalendar className="text-gray-400" />
                  <span>{formatDateTime(interview.scheduled_date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiClock className="text-gray-400" />
                  <span>{interview.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiUser className="text-gray-400" />
                  <span>{interview.interviewer_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiMail className="text-gray-400" />
                  <span>{interview.interviewer_email}</span>
                </div>
              </div>

              {interview.meeting_link && (
                <div className="mt-2">
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Join Meeting →
                  </a>
                </div>
              )}

              {interview.location && (
                <div className="mt-2 text-sm text-gray-600">
                  <FiMapPin className="inline mr-1" />
                  {interview.location}
                </div>
              )}

              {interview.notes && (
                <div className="mt-2 text-sm text-gray-600">
                  <p className="line-clamp-2">{interview.notes}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => showInterviewDetails(interview)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                title="View Details"
              >
                <FiEye size={16} />
              </button>
              
              {interview.status === 'scheduled' && (
                <>
                  <button
                    onClick={() => handleCompleteInterview(interview.interview_id)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                    title="Mark as Completed"
                  >
                    <FiCheck size={16} />
                  </button>
                  <button
                    onClick={() => handleCancelInterview(interview.interview_id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                    title="Cancel Interview"
                  >
                    <FiX size={16} />
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Interview Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Interview Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      {getInterviewTypeIcon(selectedInterview.interview_type)}
                      <span className="font-medium">Type:</span>
                      <span>{selectedInterview.interview_type.charAt(0).toUpperCase() + selectedInterview.interview_type.slice(1)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiCalendar className="text-gray-400" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDateTime(selectedInterview.scheduled_date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiClock className="text-gray-400" />
                      <span className="font-medium">Duration:</span>
                      <span>{selectedInterview.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInterview.status)}`}>
                        {selectedInterview.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Interviewer</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <FiUser className="text-gray-400" />
                      <span className="font-medium">Name:</span>
                      <span>{selectedInterview.interviewer_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiMail className="text-gray-400" />
                      <span className="font-medium">Email:</span>
                      <span>{selectedInterview.interviewer_email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedInterview.meeting_link && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Meeting Link</h3>
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

              {selectedInterview.location && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Location</h3>
                  <div className="flex items-center space-x-2">
                    <FiMapPin className="text-gray-400" />
                    <span>{selectedInterview.location}</span>
                  </div>
                </div>
              )}

              {selectedInterview.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedInterview.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
};

export default InterviewList;
