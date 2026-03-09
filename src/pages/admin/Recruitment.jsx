import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiBriefcase, FiEye, FiCheck, FiX, FiDownload, FiFileText, FiChevronLeft, FiChevronRight, FiCalendar, FiBarChart, FiTarget, FiVideo } from 'react-icons/fi';
import { recruitmentAPI } from '../../services/api';
import InterviewManagement from '../../components/interview/InterviewManagement';
import AllInterviewsList from '../../components/interview/AllInterviewsList';
import VideoInterviewPanel from '../../components/interview/VideoInterviewPanel';
import ApprovalWorkflow from '../../components/recruitment/ApprovalWorkflow';
import RecruitmentAnalytics from './RecruitmentAnalytics';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [jobFormData, setJobFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    status: 'OPEN'
  });
  const [candidateFormData, setCandidateFormData] = useState({
    job_id: '',
    name: '',
    email: '',
    resume_link: '',
    status: 'applied'
  });
  
  // Card swiping state
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [showJobDetailsPanel, setShowJobDetailsPanel] = useState(false);
  const [showCandidateDetailsPanel, setShowCandidateDetailsPanel] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showVideoInterview, setShowVideoInterview] = useState(false);
  const [currentInterviewId, setCurrentInterviewId] = useState(null);

  useEffect(() => {
    fetchData();
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
  }, [currentJobIndex, currentCandidateIndex, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [jobsData, candidatesData] = await Promise.all([
        recruitmentAPI.getJobs(),
        recruitmentAPI.getCandidates()
      ]);
      
      setJobs(jobsData);
      setCandidates(candidatesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      
      if (editingJob) {
        await recruitmentAPI.updateJob(editingJob.job_id, jobFormData);
      } else {
        await recruitmentAPI.createJob(jobFormData);
      }
      
      setShowJobModal(false);
      setEditingJob(null);
      setJobFormData({
        title: '',
        department: '',
        description: '',
        requirements: '',
        status: 'OPEN'
      });
      fetchData();
    } catch (err) {
      console.error('Failed to save job:', err);
      setError('Failed to save job posting');
    }
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      
      if (editingCandidate) {
        // Send only the fields that can be updated
        const updateData = {
          name: candidateFormData.name,
          email: candidateFormData.email,
          status: candidateFormData.status
        };
        await recruitmentAPI.updateCandidate(editingCandidate.application_id, updateData);
      } else {
        await recruitmentAPI.createCandidate(candidateFormData);
      }
      
      setShowCandidateModal(false);
      setEditingCandidate(null);
      setCandidateFormData({
        job_id: '',
        name: '',
        email: '',
        resume_link: '',
        status: 'Applied'
      });
      fetchData();
    } catch (err) {
      console.error('Failed to save candidate:', err);
      setError('Failed to save candidate');
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      department: job.department,
      description: job.description,
      requirements: job.requirements,
      status: job.status
    });
    setShowJobModal(true);
  };

  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setCandidateFormData({
      job_id: candidate.job_id,
      name: candidate.candidate_name,
      email: candidate.candidate_email,
      resume_link: candidate.resume_link,
      status: candidate.status
    });
    setShowCandidateModal(true);
  };

  const handleDownloadResume = async (applicationId, candidateName) => {
    try {
      const blob = await recruitmentAPI.downloadResume(applicationId);
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidateName.replace(' ', '_')}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download resume:', error);
      setError('Failed to download resume');
    }
  };

  const handleViewResume = async (applicationId) => {
    try {
      const blob = await recruitmentAPI.downloadResume(applicationId);
      
      // Create a blob URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Failed to view resume:', error);
      setError('Failed to view resume');
    }
  };

  const handleShortlistCandidate = async (candidateId) => {
    try {
      await recruitmentAPI.shortlistCandidate(candidateId);
      fetchData();
    } catch (err) {
      console.error('Failed to shortlist candidate:', err);
      setError('Failed to shortlist candidate');
    }
  };

  const handleRejectCandidate = async (candidateId) => {
    try {
      await recruitmentAPI.rejectCandidate(candidateId);
      fetchData();
    } catch (err) {
      console.error('Failed to reject candidate:', err);
      setError('Failed to reject candidate');
    }
  };

  // Approvals: ensure workflow exists, then approve/reject by workflow_id
  const handleApproveViaWorkflow = async (application) => {
    try {
      // Get existing workflows
      const approvals = await recruitmentAPI.getApplicationApprovals(application.application_id).catch(() => []);
      let workflow = approvals && approvals.length ? approvals[0] : null;
      if (!workflow) {
        // Create workflow assigning to current HR; backend will validate
        const created = await recruitmentAPI.createApprovalWorkflow({
          application_id: application.application_id,
          current_round: 1,
          total_rounds: 1,
          status: 'pending',
          approver_id: (window?.currentEmployee && window.currentEmployee.employee_id) || 1,
          comments: 'Created from HR UI'
        });
        workflow = created;
      }
      await recruitmentAPI.approveWorkflow(workflow.workflow_id, { comments: 'Approved from HR UI' });
      fetchData();
    } catch (err) {
      console.error('Failed to approve candidate:', err);
      setError('Failed to approve candidate');
    }
  };

  const handleRejectViaWorkflow = async (application) => {
    try {
      const approvals = await recruitmentAPI.getApplicationApprovals(application.application_id).catch(() => []);
      let workflow = approvals && approvals.length ? approvals[0] : null;
      if (!workflow) {
        const created = await recruitmentAPI.createApprovalWorkflow({
          application_id: application.application_id,
          current_round: 1,
          total_rounds: 1,
          status: 'pending',
          approver_id: (window?.currentEmployee && window.currentEmployee.employee_id) || 1,
          comments: 'Created from HR UI'
        });
        workflow = created;
      }
      await recruitmentAPI.rejectWorkflow(workflow.workflow_id, { comments: 'Rejected from HR UI' });
      fetchData();
    } catch (err) {
      console.error('Failed to reject candidate:', err);
      setError('Failed to reject candidate');
    }
  };

  const handleHireCandidate = async (candidateId) => {
    try {
      await recruitmentAPI.hireCandidate(candidateId);
      fetchData();
    } catch (err) {
      console.error('Failed to hire candidate:', err);
      setError('Failed to hire candidate');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview':
        return 'bg-purple-100 text-purple-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const normalizeStatus = (status) => {
    if (!status && status !== 0) return '';
    return String(status).toLowerCase();
  };

  const isFinalStatus = (status) => {
    const s = normalizeStatus(status);
    return s === 'hired' || s === 'rejected';
  };

  const getJobName = (jobId) => {
    const job = jobs.find(j => j.job_id === jobId);
    return job ? job.title : `Job #${jobId}`;
  };

  const handleCardSwipe = (direction) => {
    if (activeTab === 'jobs') {
      if (direction === 'left' && currentJobIndex < jobs.length - 2) {
        setCurrentJobIndex(currentJobIndex + 2);
      } else if (direction === 'right' && currentJobIndex > 0) {
        setCurrentJobIndex(currentJobIndex - 2);
      }
    } else if (activeTab === 'candidates') {
      if (direction === 'left' && currentCandidateIndex < candidates.length - 2) {
        setCurrentCandidateIndex(currentCandidateIndex + 2);
      } else if (direction === 'right' && currentCandidateIndex > 0) {
        setCurrentCandidateIndex(currentCandidateIndex - 2);
      }
    }
  };

  const getCurrentJob = () => {
    return jobs[currentJobIndex] || null;
  };

  const getCurrentCandidate = () => {
    return candidates[currentCandidateIndex] || null;
  };

  const handleViewJobDetails = (job) => {
    setSelectedJob(job);
    setShowJobDetailsPanel(true);
  };

  const handleViewCandidateDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateDetailsPanel(true);
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
          onClick={fetchData}
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
          <h2 className="text-xl font-bold text-gray-900">Recruitment Management</h2>
          <p className="text-sm text-gray-600">Manage job postings and candidate applications</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingJob(null);
              setJobFormData({
                title: '',
                department: '',
                description: '',
                requirements: '',
                status: 'OPEN'
              });
              setShowJobModal(true);
            }}
            className="flex items-center space-x-1 px-3 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Job</span>
          </button>
          <button
            onClick={() => {
              setEditingCandidate(null);
              setCandidateFormData({
                job_id: '',
                name: '',
                email: '',
                resume_link: '',
                status: 'applied'
              });
              setShowCandidateModal(true);
            }}
            className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <FiUsers className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Tabs - Compact */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'jobs'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiBriefcase className="w-4 h-4 inline mr-1" />
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'candidates'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiUsers className="w-4 h-4 inline mr-1" />
          Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'interviews'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiCalendar className="w-4 h-4 inline mr-1" />
          Interviews
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'approvals'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiTarget className="w-4 h-4 inline mr-1" />
          Approvals
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiBarChart className="w-4 h-4 inline mr-1" />
          Analytics
        </button>
      </div>

      {/* Main Content Area - Fits screen height */}
      <div className="flex-1 min-h-0">
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="flex h-full">
            {/* Jobs Cards */}
            <div className="flex-1">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FiBriefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">No job postings found</p>
                <p className="text-sm text-gray-500">Click "Add Job" to create the first job posting</p>
              </div>
            ) : (
              <div className="relative">
                {/* Navigation */}
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => handleCardSwipe('right')}
                    disabled={currentJobIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    Page {Math.floor(currentJobIndex / 2) + 1} of {Math.ceil(jobs.length / 2)} ({jobs.length} jobs)
                  </div>
                  
                  <button
                    onClick={() => handleCardSwipe('left')}
                    disabled={currentJobIndex >= jobs.length - 2}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Job Cards - Two per page - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* First Job Card - Compact */}
                  {getCurrentJob() && (
                    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{getCurrentJob().title}</h3>
                          <p className="text-sm text-gray-600">{getCurrentJob().department}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getCurrentJob().status)}`}>
                          {getCurrentJob().status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Description</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{getCurrentJob().description}</p>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Requirements</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{getCurrentJob().requirements || 'No specific requirements listed'}</p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {new Date(getCurrentJob().created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewJobDetails(getCurrentJob())}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleEditJob(getCurrentJob())}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            <FiEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this job posting?')) {
                                // Add delete functionality here
                              }
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Second Job Card - Compact */}
                  {jobs[currentJobIndex + 1] && (
                    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{jobs[currentJobIndex + 1].title}</h3>
                          <p className="text-sm text-gray-600">{jobs[currentJobIndex + 1].department}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(jobs[currentJobIndex + 1].status)}`}>
                          {jobs[currentJobIndex + 1].status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Description</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{jobs[currentJobIndex + 1].description}</p>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Requirements</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{jobs[currentJobIndex + 1].requirements || 'No specific requirements listed'}</p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {new Date(jobs[currentJobIndex + 1].created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewJobDetails(jobs[currentJobIndex + 1])}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleEditJob(jobs[currentJobIndex + 1])}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            <FiEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this job posting?')) {
                                // Add delete functionality here
                              }
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Job Details Panel */}
          {showJobDetailsPanel && selectedJob && (
            <div className="w-1/3 ml-6 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Job Details</h3>
                <button
                  onClick={() => setShowJobDetailsPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Title</h4>
                  <p className="text-sm text-gray-600">{selectedJob.title}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Department</h4>
                  <p className="text-sm text-gray-600">{selectedJob.department}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Status</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                    {selectedJob.status}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Description</h4>
                  <p className="text-sm text-gray-600">{selectedJob.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Requirements</h4>
                  <p className="text-sm text-gray-600">{selectedJob.requirements || 'No specific requirements listed'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Created</h4>
                  <p className="text-sm text-gray-600">{new Date(selectedJob.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* Candidates Tab */}
        {activeTab === 'candidates' && (
          <div className="flex h-full">
            {/* Candidates Cards */}
            <div className="flex-1">
            {candidates.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">No candidates found</p>
                <p className="text-sm text-gray-500">Click "Add Candidate" to create the first candidate</p>
              </div>
            ) : (
              <div className="relative">
                {/* Navigation */}
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => handleCardSwipe('right')}
                    disabled={currentCandidateIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    Page {Math.floor(currentCandidateIndex / 2) + 1} of {Math.ceil(candidates.length / 2)} ({candidates.length} candidates)
                  </div>
                  
                  <button
                    onClick={() => handleCardSwipe('left')}
                    disabled={currentCandidateIndex >= candidates.length - 2}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Candidate Cards - Two per page - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* First Candidate Card - Compact */}
                  {getCurrentCandidate() && (
                    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{getCurrentCandidate().candidate_name}</h3>
                          <p className="text-sm text-gray-600">{getCurrentCandidate().candidate_email}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getCurrentCandidate().status)}`}>
                          {getCurrentCandidate().status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Applied for</h4>
                        <p className="text-xs text-gray-600">{getJobName(getCurrentCandidate().job_id)}</p>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">AI Score</h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${getCurrentCandidate().ai_score || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {getCurrentCandidate().ai_score || 0}/100
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-gray-500">
                          {new Date(getCurrentCandidate().applied_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewCandidateDetails(getCurrentCandidate())}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleViewResume(getCurrentCandidate().application_id)}
                            className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                          >
                            <FiFileText className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                          <button
                            onClick={() => handleDownloadResume(getCurrentCandidate().application_id, getCurrentCandidate().candidate_name)}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            <FiDownload className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => handleEditCandidate(getCurrentCandidate())}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            <FiEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick Actions - Compact */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex space-x-1">
                          {normalizeStatus(getCurrentCandidate().status) === 'applied' && (
                            <button
                              onClick={() => handleShortlistCandidate(getCurrentCandidate().application_id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                            >
                              <FiCheck className="w-3 h-3" />
                              <span>Shortlist</span>
                            </button>
                          )}
                          {normalizeStatus(getCurrentCandidate().status) === 'shortlisted' && (
                            <button
                              onClick={() => handleHireCandidate(getCurrentCandidate().application_id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                            >
                              <FiCheck className="w-3 h-3" />
                              <span>Hire</span>
                            </button>
                          )}
                          {!isFinalStatus(getCurrentCandidate().status) && (
                            <>
                              <button
                                onClick={() => handleApproveViaWorkflow(getCurrentCandidate())}
                                className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                              >
                                <FiCheck className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectViaWorkflow(getCurrentCandidate())}
                                className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                              >
                                <FiX className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Second Candidate Card - Compact */}
                  {candidates[currentCandidateIndex + 1] && (
                    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{candidates[currentCandidateIndex + 1].candidate_name}</h3>
                          <p className="text-sm text-gray-600">{candidates[currentCandidateIndex + 1].candidate_email}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidates[currentCandidateIndex + 1].status)}`}>
                          {candidates[currentCandidateIndex + 1].status}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">Applied for</h4>
                        <p className="text-xs text-gray-600">{getJobName(candidates[currentCandidateIndex + 1].job_id)}</p>
                      </div>
                      
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">AI Score</h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${candidates[currentCandidateIndex + 1].ai_score || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {candidates[currentCandidateIndex + 1].ai_score || 0}/100
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-gray-500">
                          {new Date(candidates[currentCandidateIndex + 1].applied_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewCandidateDetails(candidates[currentCandidateIndex + 1])}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleViewResume(candidates[currentCandidateIndex + 1].application_id)}
                            className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                          >
                            <FiFileText className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                          <button
                            onClick={() => handleDownloadResume(candidates[currentCandidateIndex + 1].application_id, candidates[currentCandidateIndex + 1].candidate_name)}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            <FiDownload className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => handleEditCandidate(candidates[currentCandidateIndex + 1])}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            <FiEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick Actions - Compact */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex space-x-1">
                          {normalizeStatus(candidates[currentCandidateIndex + 1].status) === 'applied' && (
                            <button
                              onClick={() => handleShortlistCandidate(candidates[currentCandidateIndex + 1].application_id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                            >
                              <FiCheck className="w-3 h-3" />
                              <span>Shortlist</span>
                            </button>
                          )}
                          {normalizeStatus(candidates[currentCandidateIndex + 1].status) === 'shortlisted' && (
                            <button
                              onClick={() => handleHireCandidate(candidates[currentCandidateIndex + 1].application_id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                            >
                              <FiCheck className="w-3 h-3" />
                              <span>Hire</span>
                            </button>
                          )}
                          {!isFinalStatus(candidates[currentCandidateIndex + 1].status) && (
                            <button
                              onClick={() => handleRejectCandidate(candidates[currentCandidateIndex + 1].application_id)}
                              className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              <FiX className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Candidate Details Panel */}
          {showCandidateDetailsPanel && selectedCandidate && (
            <div className="w-1/3 ml-6 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Candidate Details</h3>
                <button
                  onClick={() => setShowCandidateDetailsPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Name</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.candidate_name}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.candidate_email}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Applied for</h4>
                  <p className="text-sm text-gray-600">{getJobName(selectedCandidate.job_id)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Status</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCandidate.status)}`}>
                    {selectedCandidate.status}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">AI Score</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${selectedCandidate.ai_score || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {selectedCandidate.ai_score || 0}/100
                    </span>
                  </div>
                </div>
                
                {selectedCandidate.ai_feedback && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">AI Feedback</h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {selectedCandidate.ai_feedback}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Applied</h4>
                  <p className="text-sm text-gray-600">{new Date(selectedCandidate.applied_at).toLocaleDateString()}</p>
                </div>
                
        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => setActiveTab('interviews')}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiCalendar className="mr-2" />
            Manage Interviews
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FiTarget className="mr-2" />
            Approval Workflow
          </button>
          <button
            onClick={() => {
              setCurrentInterviewId(selectedCandidate.application_id);
              setShowVideoInterview(true);
            }}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <FiVideo className="mr-2" />
            Start Video Interview
          </button>
        </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="h-full">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <FiCalendar className="mr-2" />
                  Scheduled Interviews
                </h2>
                <p className="text-gray-600 mt-1">Manage all scheduled interviews</p>
              </div>
            </div>
            
            <AllInterviewsList onInterviewUpdate={fetchData} />
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="h-full">
          {selectedCandidate ? (
            <ApprovalWorkflow 
              candidate={selectedCandidate}
              onWorkflowUpdate={fetchData}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FiTarget className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Select a candidate to manage approvals</p>
              <p className="text-sm text-gray-500">Go to the Candidates tab and select a candidate to create approval workflows</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="h-full">
          <RecruitmentAnalytics />
        </div>
      )}
      </div>

      {/* Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingJob ? 'Edit Job Posting' : 'Add Job Posting'}
            </h3>
            <form onSubmit={handleJobSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={jobFormData.title}
                  onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={jobFormData.department}
                  onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Description
  </label>

  <ReactQuill
    theme="snow"
    value={jobFormData.description}
    onChange={(value) =>
      setJobFormData({ ...jobFormData, description: value })
    }
    className="bg-white"
    modules={{
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean']
      ]
    }}
  />
</div>

              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Requirements
  </label>

  <ReactQuill
    theme="snow"
    value={jobFormData.requirements}
    onChange={(value) =>
      setJobFormData({ ...jobFormData, requirements: value })
    }
    className="bg-white"
    modules={{
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean']
      ]
    }}
  />
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={jobFormData.status}
                  onChange={(e) => setJobFormData({ ...jobFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJobModal(false);
                    setEditingJob(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingJob ? 'Update' : 'Create'} Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
            </h3>
            <form onSubmit={handleCandidateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
                <select
                  value={candidateFormData.job_id}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, job_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Job</option>
                  {jobs.map((job) => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.title} - {job.department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={candidateFormData.name}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={candidateFormData.email}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume Link (Optional)</label>
                <input
                  type="url"
                  value={candidateFormData.resume_link}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, resume_link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={candidateFormData.status}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="APPLIED">Applied</option>
                  <option value="SCANNING">Scanning</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="FORWARDED">Forwarded</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="HIRED">Hired</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              
              {/* AI Review Section - Only show if editing existing candidate */}
              {editingCandidate && editingCandidate.ai_feedback && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">AI Resume Analysis</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {editingCandidate.ai_score && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Overall Score: </span>
                        <span className={`font-bold ${
                          editingCandidate.ai_score >= 80 ? 'text-green-600' :
                          editingCandidate.ai_score >= 60 ? 'text-blue-600' :
                          editingCandidate.ai_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {editingCandidate.ai_score.toFixed(1)}/100
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {editingCandidate.ai_feedback}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCandidateModal(false);
                    setEditingCandidate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingCandidate ? 'Update' : 'Create'} Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Video Interview Modal */}
      {showVideoInterview && (
        <div className="fixed inset-0 z-50">
          <VideoInterviewPanel
            interviewId={currentInterviewId}
            userRole="interviewer"
            onInterviewComplete={() => {
              setShowVideoInterview(false);
              fetchData();
            }}
          />
          <button
            onClick={() => setShowVideoInterview(false)}
            className="absolute top-4 right-4 z-10 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
          >
            <FiX size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
