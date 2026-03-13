import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock, FiUser, FiCalendar, FiFileText, FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';
import { managerAPI, calendarAPI } from '../../services/api';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'ArrowLeft') {
        handleCardSwipe('right');
      } else if (event.key === 'ArrowRight') {
        handleCardSwipe('left');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCardIndex, leaves, filter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reports, teamLeaves] = await Promise.all([
        managerAPI.getDirectReports().catch(() => []),
        managerAPI.getTeamLeaves().catch(() => [])
      ]);

      const reportNameMap = new Map((reports || []).map((member) => ([
        member.employee_id,
        `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || `Employee #${member.employee_id}`
      ])));

      const normalizedLeaves = (teamLeaves || []).map((leave) => ({
        ...leave,
        employee_name: leave.employee_name || reportNameMap.get(leave.employee_id) || `Employee #${leave.employee_id}`
      }));

      setLeaves(normalizedLeaves);
    } catch (err) {
      console.error('Failed to fetch team leaves:', err);
      setError(err.response?.data?.detail || 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      const resp = await managerAPI.approveLeave(leaveId);

      // Create calendar event for the approved leave (best-effort)
      try {
        const approvedLeave = leaves.find(l => String(l.leave_id || l.id) === String(leaveId)) || resp || {};
        const isPermission = String(approvedLeave.leave_type || '').toLowerCase().includes('permission');
        const duration = String(approvedLeave.leave_duration || '').toLowerCase();
        const all_day = !(isPermission || ['first_half', 'second_half'].includes(duration));

        const eventPayload = {
          event_type: 'leave',
          title: approvedLeave.leave_type || 'Leave',
          leave_type: approvedLeave.leave_type || null,
          start_date: approvedLeave.start_date,
          end_date: approvedLeave.end_date || approvedLeave.start_date,
          all_day,
          description: approvedLeave.notes || null,
          employee_id: approvedLeave.employee_id || null,
          source_type: 'leave',
          source_id: approvedLeave.leave_id || approvedLeave.id || null,
        };

        console.log('[Manager Leave] Creating calendar event for approved leave:', eventPayload);
        await calendarAPI.createEvent(eventPayload);
      } catch (err) {
        console.warn('Failed to create calendar event for approved leave (manager):', err);
      }

      await fetchLeaves();
    } catch (err) {
      console.error('Failed to approve leave:', err);
      setError(err.response?.data?.detail || 'Failed to approve leave application');
    }
  };

  const handleReject = async (leaveId) => {
    try {
      const reason = window.prompt('Please provide a reason for rejection:');
      if (!reason) return;
      await managerAPI.rejectLeave(leaveId, reason);
      await fetchLeaves();
    } catch (err) {
      console.error('Failed to reject leave:', err);
      setError(err.response?.data?.detail || 'Failed to reject leave application');
    }
  };

  const isCancelledStatus = (value) => {
    const normalized = String(value || '').toLowerCase();
    return normalized === 'cancelled' || normalized === 'canceled';
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filter === 'all') return true;
    if (filter === 'cancelled') return isCancelledStatus(leave?.status);
    return String(leave.status || '').toLowerCase() === filter.toLowerCase();
  });

  const handleCardSwipe = (direction) => {
    if (direction === 'left' && currentCardIndex < filteredLeaves.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else if (direction === 'right' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const getCurrentLeave = () => filteredLeaves[currentCardIndex] || null;

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetailsPanel(true);
  };

  const getStatusColor = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
      case 'canceled':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'pending':
        return <FiClock className="w-4 h-4" />;
      case 'approved':
        return <FiCheck className="w-4 h-4" />;
      case 'rejected':
        return <FiX className="w-4 h-4" />;
      case 'cancelled':
      case 'canceled':
        return <FiX className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
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
          onClick={fetchLeaves}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leave Approvals</h2>
          <p className="text-sm text-gray-600">Review and manage team leave applications</p>
        </div>
        <button
          onClick={fetchLeaves}
          className="px-3 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#10133a] transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all', label: 'All', count: leaves.length },
            { key: 'pending', label: 'Pending', count: leaves.filter((l) => String(l.status || '').toLowerCase() === 'pending').length },
            { key: 'approved', label: 'Approved', count: leaves.filter((l) => String(l.status || '').toLowerCase() === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: leaves.filter((l) => String(l.status || '').toLowerCase() === 'rejected').length },
            { key: 'cancelled', label: 'Employee Cancelled', count: leaves.filter((l) => isCancelledStatus(l.status)).length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setCurrentCardIndex(0);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-1/2 bg-white border-r rounded-lg">
          {filteredLeaves.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiFileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave applications</h3>
                <p className="text-gray-500">
                  {filter === 'all' ? 'No leave applications have been submitted yet.' : `No ${filter} leave applications found.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleCardSwipe('right')}
                      disabled={currentCardIndex === 0}
                      className="p-1.5 rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">{currentCardIndex + 1} of {filteredLeaves.length}</span>
                    <button
                      onClick={() => handleCardSwipe('left')}
                      disabled={currentCardIndex >= filteredLeaves.length - 1}
                      className="p-1.5 rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">Swipe to browse</div>
                </div>
              </div>

              <div className="flex-1 p-4">
                {(() => {
                  const currentLeave = getCurrentLeave();
                  if (!currentLeave) return null;

                  return (
                    <div className="h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg">
                      <div className="h-full flex flex-col">
                        <div className="flex items-center mb-6">
                          <div className="h-16 w-16 rounded-full bg-[#ffbd59] flex items-center justify-center text-white text-xl font-bold">
                            {(currentLeave.employee_name || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <h3 className="text-xl font-bold text-gray-900">{currentLeave.employee_name || `Employee #${currentLeave.employee_id}`}</h3>
                            <p className="text-gray-600">Leave Application #{currentLeave.leave_id || currentLeave.id}</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentLeave.status)}`}>
                              {getStatusIcon(currentLeave.status)}
                              <span className="ml-1">{currentLeave.status}</span>
                            </span>
                          </div>

                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <FiCalendar className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-600">Leave Type</p>
                                  <p className="font-medium text-gray-900">{currentLeave.leave_type}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FiCalendar className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-600">Duration</p>
                                  <p className="font-medium text-gray-900">
                                    {new Date(currentLeave.start_date).toLocaleDateString()} - {new Date(currentLeave.end_date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-600">Applied On</p>
                                  <p className="font-medium text-gray-900">{new Date(currentLeave.requested_at || currentLeave.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          <button
                            onClick={() => handleViewDetails(currentLeave)}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-[#181c52] text-white rounded-lg hover:bg-[#10133a] transition-colors shadow-lg"
                          >
                            <FiEye className="w-5 h-5" />
                            <span>View Full Details</span>
                          </button>

                          {String(currentLeave.status || '').toLowerCase() === 'pending' && (
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleApprove(currentLeave.leave_id || currentLeave.id)}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <FiCheck className="w-4 h-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReject(currentLeave.leave_id || currentLeave.id)}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <FiX className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="w-1/2 bg-gray-50 rounded-lg ml-4">
          {!showDetailsPanel ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiFileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a leave application</h3>
                <p className="text-gray-500">Click "View Full Details" on a card to see detailed information here.</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 bg-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Leave Application Details</h3>
                    <p className="text-sm text-gray-500">Application ID: {selectedLeave?.leave_id || selectedLeave?.id}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsPanel(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedLeave && (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FiUser className="w-5 h-5 mr-2" />
                        Employee Information
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Employee Name</p>
                          <p className="font-medium text-gray-900">{selectedLeave.employee_name || `Employee #${selectedLeave.employee_id}`}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Employee ID</p>
                          <p className="font-medium text-gray-900">{selectedLeave.employee_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLeave.status)}`}>
                            {getStatusIcon(selectedLeave.status)}
                            <span className="ml-1">{selectedLeave.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FiCalendar className="w-5 h-5 mr-2" />
                        Leave Details
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Leave Type</p>
                          <p className="font-medium text-gray-900">{selectedLeave.leave_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium text-gray-900">{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium text-gray-900">{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Applied On</p>
                          <p className="font-medium text-gray-900">{new Date(selectedLeave.requested_at || selectedLeave.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {selectedLeave.notes && (
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FiFileText className="w-5 h-5 mr-2" />
                          Reason
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{selectedLeave.notes}</p>
                      </div>
                    )}

                    {String(selectedLeave.status || '').toLowerCase() === 'pending' && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Actions</h4>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => {
                              handleApprove(selectedLeave.leave_id || selectedLeave.id);
                              setShowDetailsPanel(false);
                            }}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <FiCheck className="w-5 h-5" />
                            <span>Approve Leave</span>
                          </button>
                          <button
                            onClick={() => {
                              handleReject(selectedLeave.leave_id || selectedLeave.id);
                              setShowDetailsPanel(false);
                            }}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <FiX className="w-5 h-5" />
                            <span>Reject Leave</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
