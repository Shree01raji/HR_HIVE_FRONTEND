import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock, FiUser, FiCalendar, FiFileText, FiChevronLeft, FiChevronRight, FiEye } from 'react-icons/fi';
import { leaveAPI, calendarAPI } from '../../services/api';

export default function LeaveApprovals() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('manager_reviewed'); // manager_reviewed, approved, rejected
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
  }, [currentCardIndex]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const token = localStorage.getItem('token');
      console.log('Admin fetching leaves - Token present:', !!token);
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('Calling leaveAPI.getAll()...');
      const response = await leaveAPI.getAll();
      console.log('Leave API response:', response);
      
      setLeaves(response);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Failed to load leave applications';
      if (err.message === 'No authentication token found. Please log in again.') {
        errorMessage = 'Authentication required. Please refresh the page and log in again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please refresh the page and log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view leave applications.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      console.log('Approving leave with ID:', leaveId);
      console.log('Auth token present:', !!localStorage.getItem('token'));
      
      const response = await leaveAPI.approve(leaveId);
      console.log('Approval response:', response);

      // Find leave data locally to create a calendar event for the employee
      const approvedLeave = leaves.find(l => String(l.leave_id || l.id) === String(leaveId));
      const leaveData = approvedLeave || response || {};

      try {
        // Build calendar event payload
        const isPermission = String(leaveData.leave_type || '').toLowerCase().includes('permission');
        const duration = String(leaveData.leave_duration || '').toLowerCase();
        const all_day = !(isPermission || ['first_half', 'second_half'].includes(duration));

        const eventPayload = {
          event_type: 'leave',
          title: leaveData.leave_type || 'Leave',
          leave_type: leaveData.leave_type || null,
          start_date: leaveData.start_date,
          end_date: leaveData.end_date || leaveData.start_date,
          all_day: all_day,
          description: leaveData.notes || null,
          employee_id: leaveData.employee_id || leaveData.requested_by || null,
          source_type: 'leave',
          source_id: leaveData.leave_id || leaveData.id || null,
        };

        console.log('[LeaveApprovals] Creating calendar event for approved leave:', eventPayload);
        await calendarAPI.createEvent(eventPayload);
      } catch (err) {
        console.warn('Failed to create calendar event for approved leave:', err);
      }

      await fetchLeaves(); // Refresh the list
    } catch (err) {
      console.error('Failed to approve leave:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
      
      let errorMessage = 'Failed to approve leave application';
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please refresh the page and log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to approve leaves.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      const reason = prompt('Please provide a reason for rejection:');
      if (reason) {
        console.log('Rejecting leave with ID:', leaveId, 'Reason:', reason);
        console.log('Auth token present:', !!localStorage.getItem('token'));
        
        const response = await leaveAPI.reject(leaveId, reason);
        console.log('Rejection response:', response);
        
        await fetchLeaves(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to reject leave:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
      
      let errorMessage = 'Failed to reject leave application';
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please refresh the page and log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to reject leaves.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    }
  };

  const toLower = (value) => String(value || '').toLowerCase();

  const isManagerReviewed = (leave) => {
    const statusValue = toLower(leave?.status);
    const isReviewedStatus = statusValue === 'approved' || statusValue === 'rejected';
    if (!isReviewedStatus) return false;

    const explicitManagerSignals = [
      toLower(leave?.approved_by_role).includes('manager'),
      toLower(leave?.approver_role).includes('manager'),
      toLower(leave?.approval_role).includes('manager'),
      leave?.manager_approved === true,
      leave?.approved_by_manager === true,
      toLower(leave?.manager_approval_status) === 'approved',
      toLower(leave?.manager_status) === 'approved',
      !!leave?.manager_approved_by,
      !!leave?.manager_approved_by_id
    ].some(Boolean);

    return explicitManagerSignals;
  };

  const hasExplicitManagerSignalsInDataset = leaves.some((leave) => isManagerReviewed(leave));

  const isManagerReviewedWithFallback = (leave) => {
    if (isManagerReviewed(leave)) return true;
    if (hasExplicitManagerSignalsInDataset) return false;
    const statusValue = toLower(leave?.status);
    return (statusValue === 'approved' || statusValue === 'rejected') && !!leave?.approved_by;
  };

  const getManagerApproverName = (leave) => {
    return (
      leave?.manager_name ||
      leave?.approver_name ||
      leave?.approved_by_name ||
      leave?.manager_approved_by_name ||
      leave?.approved_by_email ||
      (leave?.approved_by ? `Manager #${leave.approved_by}` : 'Manager')
    );
  };

  const formatDateSafe = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'manager_reviewed') return isManagerReviewedWithFallback(leave);
    return toLower(leave?.status) === filter;
  });

  const handleCardSwipe = (direction) => {
    if (direction === 'left' && currentCardIndex < filteredLeaves.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else if (direction === 'right' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const getCurrentLeave = () => {
    return filteredLeaves[currentCardIndex] || null;
  };

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetailsPanel(true);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <FiClock className="w-4 h-4" />;
      case 'approved':
        return <FiCheck className="w-4 h-4" />;
      case 'rejected':
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
      {/* Header - Compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leave Approvals</h2>
          <p className="text-sm text-gray-600">Manager-reviewed leaves (approved and rejected) with employee details</p>
        </div>
        <button
          onClick={fetchLeaves}
          className="px-3 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Filter Tabs - Compact */}
      <div className="mb-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'manager_reviewed', label: 'Manager Reviewed', count: leaves.filter(l => isManagerReviewedWithFallback(l)).length },
            { key: 'approved', label: 'Approved', count: leaves.filter(l => l.status.toLowerCase() === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: leaves.filter(l => l.status.toLowerCase() === 'rejected').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setCurrentCardIndex(0); // Reset to first card when filter changes
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area - Fits screen height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side - Leave Cards */}
        <div className="w-1/2 bg-white border-r rounded-lg">
          {filteredLeaves.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiFileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave applications</h3>
                <p className="text-gray-500">
                  {filter === 'manager_reviewed'
                    ? 'No manager-reviewed leave applications found.'
                    : `No ${filter} leave applications found.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Card Navigation - Compact */}
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
                    <span className="text-sm text-gray-600">
                      {currentCardIndex + 1} of {filteredLeaves.length}
                    </span>
                    <button
                      onClick={() => handleCardSwipe('left')}
                      disabled={currentCardIndex >= filteredLeaves.length - 1}
                      className="p-1.5 rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Swipe to browse
                  </div>
                </div>
              </div>

              {/* Current Card - Compact */}
              <div className="flex-1 p-4">
                {(() => {
                  const currentLeave = getCurrentLeave();
                  if (!currentLeave) return null;
                  
                  return (
                    <div className="h-full bg-gradient-to-br from-green-50 to-blue-100 rounded-xl p-6 shadow-lg">
                      <div className="h-full flex flex-col">
                        {/* Card Header */}
                        <div className="flex items-center mb-6">
                          <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold">
                            {currentLeave.employee_name ? currentLeave.employee_name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <div className="ml-4">
                            <h3 className="text-xl font-bold text-gray-900">
                              {currentLeave.employee_name || `Employee #${currentLeave.employee_id}`}
                            </h3>
                            <p className="text-gray-600">Leave Application #{currentLeave.leave_id || currentLeave.id}</p>
                          </div>
                        </div>

                        {/* Card Content */}
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
                                  <p className="text-sm text-gray-600">Manager</p>
                                  <p className="font-medium text-gray-900">{getManagerApproverName(currentLeave)}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-600">Manager Decision On</p>
                                  <p className="font-medium text-gray-900">
                                    {formatDateSafe(currentLeave.approved_at || currentLeave.manager_approved_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Card Footer */}
                        <div className="mt-6 space-y-3">
                          <button
                            onClick={() => handleViewDetails(currentLeave)}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                          >
                            <FiEye className="w-5 h-5" />
                            <span>View Full Details</span>
                          </button>
                          
                          {currentLeave.status.toLowerCase() === 'pending' && (
                            <div className="flex space-x-3">
                              {/* <button
                                onClick={() => handleApprove(currentLeave.leave_id || currentLeave.id)}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <FiCheck className="w-4 h-4" />
                                <span>Approve</span>
                              </button> */}
                              {/* <button
                                onClick={() => handleReject(currentLeave.leave_id || currentLeave.id)}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <FiX className="w-4 h-4" />
                                <span>Reject</span>
                              </button> */}
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

        {/* Right Side - Details Panel */}
        <div className="w-1/2 bg-gray-50 rounded-lg ml-4">
          {!showDetailsPanel ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiFileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a leave application</h3>
                <p className="text-gray-500">
                  Click "View Full Details" on a card to see detailed information here.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Details Header */}
              <div className="p-4 bg-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Leave Application Details
                    </h3>
                    <p className="text-sm text-gray-500">
                      Application ID: {selectedLeave?.leave_id || selectedLeave?.id}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailsPanel(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Details Content - Compact */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedLeave && (
                  <>
                    {/* Employee Information - Compact */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FiUser className="w-5 h-5 mr-2" />
                        Employee Information
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Employee Name</p>
                          <p className="font-medium text-gray-900">
                            {selectedLeave.employee_name || `Employee #${selectedLeave.employee_id}`}
                          </p>
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

                    {/* Leave Details - Compact */}
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
                          <p className="font-medium text-gray-900">
                            {new Date(selectedLeave.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedLeave.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Applied On</p>
                          <p className="font-medium text-gray-900">
                            {formatDateSafe(selectedLeave.requested_at || selectedLeave.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FiCheck className="w-5 h-5 mr-2" />
                        Manager Decision Details
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Reviewed By</p>
                          <p className="font-medium text-gray-900">{getManagerApproverName(selectedLeave)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Decision Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDateSafe(selectedLeave.approved_at || selectedLeave.manager_approved_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Approval Reference</p>
                          <p className="font-medium text-gray-900">
                            {selectedLeave.approved_by || selectedLeave.manager_approved_by_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {/* {selectedLeave.notes && (
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FiFileText className="w-5 h-5 mr-2" />
                          Reason
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{selectedLeave.notes}</p>
                      </div>
                    )} */}

                    {/* Action Buttons - Compact */}
                    {/* {selectedLeave.status.toLowerCase() === 'pending' && (
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
                    )} */}
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
