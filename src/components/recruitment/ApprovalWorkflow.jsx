import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiUser, FiCalendar, FiMessageCircle, FiEye, FiEdit } from 'react-icons/fi';
import { recruitmentAPI } from '../../services/api';

const ApprovalWorkflow = ({ candidate, onWorkflowUpdate }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // 'approve' or 'reject'
  const [formData, setFormData] = useState({
    current_round: 1,
    total_rounds: 3,
    approver_id: '',
    comments: '',
    next_round_date: ''
  });
  const [decisionData, setDecisionData] = useState({
    comments: '',
    next_round_date: '',
    interview_type: 'video',
    interview_date: '',
    interview_location: '',
    aptitude_test_link: ''
  });

  useEffect(() => {
    if (candidate?.application_id) {
      fetchWorkflows();
    }
  }, [candidate?.application_id]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await recruitmentAPI.getApplicationApprovals(candidate.application_id);
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    try {
      await recruitmentAPI.createApprovalWorkflow({
        application_id: candidate.application_id,
        current_round: formData.current_round,
        total_rounds: formData.total_rounds,
        status: 'pending',
        approver_id: formData.approver_id,
        comments: formData.comments || null,
        next_round_date: formData.next_round_date ? new Date(formData.next_round_date).toISOString() : null
      });
      fetchWorkflows();
      setShowCreateModal(false);
      setFormData({
        current_round: 1,
        total_rounds: 3,
        approver_id: '',
        comments: '',
        next_round_date: ''
      });
      alert('Approval workflow created successfully!');
      onWorkflowUpdate?.();
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleApprove = async () => {
    try {
      const nextRound = (selectedWorkflow?.current_round || 0) + 1;
      const payload = {
        comments: decisionData.comments || null,
        next_round_date: decisionData.next_round_date ? new Date(decisionData.next_round_date).toISOString() : null,
        interview_type: decisionData.interview_type || (nextRound === 1 ? 'video' : nextRound === 2 ? 'in-person' : 'video'),
        interview_date: decisionData.interview_date ? new Date(decisionData.interview_date).toISOString() : null,
        interview_location: decisionData.interview_location || null,
        aptitude_test_link: decisionData.aptitude_test_link || null
      };
      await recruitmentAPI.approveWorkflow(selectedWorkflow.workflow_id, payload);
      fetchWorkflows();
      setShowDecisionModal(false);
      setSelectedWorkflow(null);
      setDecisionType(null);
      setDecisionData({ comments: '', next_round_date: '', interview_type: 'video', interview_date: '', interview_location: '', aptitude_test_link: '' });
      alert('Candidate approved successfully! Interview scheduled and email sent.');
      onWorkflowUpdate?.();
    } catch (error) {
      console.error('Failed to approve candidate:', error);
      alert('Failed to approve: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleReject = async () => {
    try {
      const payload = {
        comments: decisionData.comments || null
      };
      await recruitmentAPI.rejectWorkflow(selectedWorkflow.workflow_id, payload);
      fetchWorkflows();
      setShowDecisionModal(false);
      setSelectedWorkflow(null);
      setDecisionType(null);
      setDecisionData({ comments: '', next_round_date: '' });
      alert('Candidate rejected.');
      onWorkflowUpdate?.();
    } catch (error) {
      console.error('Failed to reject candidate:', error);
      alert('Failed to reject: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending_next_round': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="w-4 h-4" />;
      case 'approved': return <FiCheckCircle className="w-4 h-4" />;
      case 'rejected': return <FiXCircle className="w-4 h-4" />;
      case 'pending_next_round': return <FiCalendar className="w-4 h-4" />;
      default: return <FiClock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Approval Workflow</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiUser className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl font-semibold">No approval workflows yet</p>
          <p className="text-sm text-gray-500">Create a workflow to manage candidate approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.workflow_id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Round {workflow.current_round} of {workflow.total_rounds}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(workflow.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center ${getStatusColor(workflow.status)}`}>
                  {getStatusIcon(workflow.status)}
                  <span className="ml-1">{workflow.status.replace('_', ' ').toUpperCase()}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approver ID</p>
                  <p className="text-sm text-gray-900">{workflow.approver_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Round Date</p>
                  <p className="text-sm text-gray-900">
                    {workflow.next_round_date ? new Date(workflow.next_round_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {workflow.comments && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600">Comments</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{workflow.comments}</p>
                </div>
              )}

              {workflow.approver_comments && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600">Approver Comments</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{workflow.approver_comments}</p>
                </div>
              )}

              {workflow.status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setDecisionType('approve');
                      // Set default interview date to 2 days from now
                      const defaultDate = new Date();
                      defaultDate.setDate(defaultDate.getDate() + 2);
                      defaultDate.setHours(10, 0, 0, 0);
                      const defaultDateStr = defaultDate.toISOString().slice(0, 16);
                      setDecisionData({ 
                        comments: '', 
                        next_round_date: '', 
                        interview_type: 'video',
                        interview_date: defaultDateStr,
                        interview_location: ''
                      });
                      setShowDecisionModal(true);
                    }}
                    className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
                  >
                    <FiCheckCircle className="mr-1" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setDecisionType('reject');
                      setDecisionData({ comments: '', next_round_date: '' });
                      setShowDecisionModal(true);
                    }}
                    className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
                  >
                    <FiXCircle className="mr-1" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Approval Workflow</h3>
            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Round</label>
                <input
                  type="number"
                  value={formData.current_round}
                  onChange={(e) => setFormData({...formData, current_round: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Rounds</label>
                <input
                  type="number"
                  value={formData.total_rounds}
                  onChange={(e) => setFormData({...formData, total_rounds: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approver ID</label>
                <input
                  type="number"
                  value={formData.approver_id}
                  onChange={(e) => setFormData({...formData, approver_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Round Date</label>
                <input
                  type="datetime-local"
                  value={formData.next_round_date}
                  onChange={(e) => setFormData({...formData, next_round_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {decisionType === 'approve' ? 'Approve Candidate' : 'Reject Candidate'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea
                  value={decisionData.comments}
                  onChange={(e) => setDecisionData({...decisionData, comments: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder={decisionType === 'approve' ? 'Add approval comments (optional)...' : 'Add rejection reason (optional)...'}
                />
              </div>
              {decisionType === 'approve' && (() => {
                const nextRound = (selectedWorkflow?.current_round || 0) + 1;
                const isRound1 = nextRound === 1;
                const isRound2 = nextRound === 2;
                const isRound3 = nextRound === 3;
                
                // Auto-set interview type based on round
                const defaultInterviewType = isRound1 ? 'video' : isRound2 ? 'in-person' : 'video';
                if (!decisionData.interview_type || (isRound1 && decisionData.interview_type !== 'video') || (isRound2 && decisionData.interview_type !== 'in-person')) {
                  setTimeout(() => {
                    setDecisionData(prev => ({ ...prev, interview_type: defaultInterviewType }));
                  }, 0);
                }
                
                return (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm font-medium text-blue-900">
                        {isRound1 && "Round 1: Aptitude Test (Online)"}
                        {isRound2 && "Round 2: Technical Interview (Offline/In-Person)"}
                        {isRound3 && "Round 3: HR Interview (Choose Online or Offline)"}
                        {!isRound1 && !isRound2 && !isRound3 && `Round ${nextRound}: Interview`}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {isRound1 && "This will schedule an online aptitude test for the candidate."}
                        {isRound2 && "This will schedule an in-person technical interview."}
                        {isRound3 && "You can choose whether this HR interview is online or offline."}
                      </p>
                    </div>
                    
                    {isRound1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aptitude Test Link (Optional)</label>
                        <input
                          type="url"
                          value={decisionData.aptitude_test_link}
                          onChange={(e) => setDecisionData({...decisionData, aptitude_test_link: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/aptitude-test/..."
                        />
                        <p className="mt-1 text-xs text-gray-500">Provide external aptitude test link. If not provided, a Zoom link will be generated.</p>
                      </div>
                    )}
                    
                    {isRound3 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type *</label>
                        <select
                          value={decisionData.interview_type}
                          onChange={(e) => setDecisionData({...decisionData, interview_type: e.target.value, interview_location: e.target.value === 'in-person' ? decisionData.interview_location : ''})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="video">Online (Video Call)</option>
                          <option value="in-person">Offline (In-Person)</option>
                        </select>
                      </div>
                    )}
                    
                    {!isRound1 && !isRound3 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                        <p className="text-sm text-gray-700">
                          <strong>Interview Type:</strong> {isRound2 ? 'In-Person (Fixed)' : 'Online (Fixed)'}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={decisionData.interview_date}
                        onChange={(e) => setDecisionData({...decisionData, interview_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Interview will be scheduled and candidate will be notified via email</p>
                    </div>
                    
                    {(decisionData.interview_type === 'in-person' || isRound2) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Venue / Location *</label>
                        <input
                          type="text"
                          value={decisionData.interview_location}
                          onChange={(e) => setDecisionData({...decisionData, interview_location: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Office Address, Building Name, Room Number"
                          required
                        />
                      </div>
                    )}
                    
                    {selectedWorkflow?.current_round < selectedWorkflow?.total_rounds && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Round Date (Optional)</label>
                        <input
                          type="datetime-local"
                          value={decisionData.next_round_date}
                          onChange={(e) => setDecisionData({...decisionData, next_round_date: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setSelectedWorkflow(null);
                    setDecisionType(null);
                    setDecisionData({ comments: '', next_round_date: '', interview_type: 'video', interview_date: '', interview_location: '', aptitude_test_link: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {decisionType === 'approve' ? (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflow;
