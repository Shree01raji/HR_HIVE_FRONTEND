import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit, FiTrash2, FiUsers, FiBriefcase, FiEye, FiCheck, FiX, 
  FiDownload, FiFileText, FiChevronLeft, FiChevronRight, FiCalendar, 
  FiVideo, FiMail, FiBarChart, FiClock, FiUserCheck, FiSearch,
  FiFilter, FiSend, FiBell, FiTrendingUp, FiTarget, FiAward
} from 'react-icons/fi';
import { recruitmentAPI } from '../../services/api';

export default function RecruitmentEnhanced() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard Data
  const [stats, setStats] = useState({});
  const [departmentStats, setDepartmentStats] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  
  // Jobs and Candidates
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  
  // Interview Management
  const [interviews, setInterviews] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showScheduler, setShowScheduler] = useState(false);
  
  // Sourcing
  const [sourcingChannels, setSourcingChannels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSourcing, setShowSourcing] = useState(false);
  
  // Approval Workflow
  const [pendingApprovals, setPendingApprovals] = useState([]);
  
  // Video Interview
  const [videoInterview, setVideoInterview] = useState(null);
  const [showVideoPanel, setShowVideoPanel] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, deptStats, pipeline, jobsData, candidatesData, interviewsData, approvalsData] = await Promise.all([
        recruitmentAPI.getRecruitmentStats(),
        recruitmentAPI.getDepartmentStats(),
        recruitmentAPI.getRecruitmentPipeline(),
        recruitmentAPI.getJobs(),
        recruitmentAPI.getCandidates(),
        recruitmentAPI.getInterviews(),
        recruitmentAPI.getPendingApprovals()
      ]);
      
      setStats(statsData);
      setDepartmentStats(deptStats);
      setPipelineData(pipeline);
      setJobs(jobsData);
      setCandidates(candidatesData);
      setInterviews(interviewsData);
      setPendingApprovals(approvalsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (interviewData) => {
    try {
      await recruitmentAPI.scheduleInterview(interviewData);
      await recruitmentAPI.sendInterviewInvite(interviewData.interviewId);
      fetchDashboardData();
      setShowScheduler(false);
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      setError('Failed to schedule interview');
    }
  };

  const handleStartVideoInterview = async (interviewId) => {
    try {
      const videoData = await recruitmentAPI.joinVideoInterview(interviewId, 'interviewer');
      setVideoInterview(videoData);
      setShowVideoPanel(true);
    } catch (err) {
      console.error('Failed to start video interview:', err);
      setError('Failed to start video interview');
    }
  };

  const handleCandidateSourcing = async (searchParams) => {
    try {
      const results = await recruitmentAPI.searchCandidates(searchParams);
      setSearchResults(results);
      setShowSourcing(true);
    } catch (err) {
      console.error('Failed to search candidates:', err);
      setError('Failed to search candidates');
    }
  };

  const handleApprovalAction = async (candidateId, action, data) => {
    try {
      if (action === 'approve') {
        await recruitmentAPI.approveCandidate(candidateId, data);
      } else {
        await recruitmentAPI.rejectApproval(candidateId, data.reason);
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to process approval:', err);
      setError('Failed to process approval');
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
          onClick={fetchDashboardData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recruitment Management</h2>
          <p className="text-sm text-gray-600">Comprehensive recruitment system with AI-powered features</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSourcing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FiSearch className="w-4 h-4" />
            <span>Source Candidates</span>
          </button>
          <button
            onClick={() => setShowScheduler(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiCalendar className="w-4 h-4" />
            <span>Schedule Interview</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm mb-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: FiBarChart },
          { id: 'jobs', label: 'Jobs', icon: FiBriefcase },
          { id: 'candidates', label: 'Candidates', icon: FiUsers },
          { id: 'interviews', label: 'Interviews', icon: FiVideo },
          { id: 'approvals', label: 'Approvals', icon: FiUserCheck },
          { id: 'analytics', label: 'Analytics', icon: FiTrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            stats={stats} 
            departmentStats={departmentStats} 
            pipelineData={pipelineData}
            pendingApprovals={pendingApprovals}
            onStartVideoInterview={handleStartVideoInterview}
          />
        )}
        
        {activeTab === 'jobs' && (
          <JobsTab 
            jobs={jobs} 
            onRefresh={fetchDashboardData}
          />
        )}
        
        {activeTab === 'candidates' && (
          <CandidatesTab 
            candidates={candidates} 
            jobs={jobs}
            onRefresh={fetchDashboardData}
          />
        )}
        
        {activeTab === 'interviews' && (
          <InterviewsTab 
            interviews={interviews}
            onStartVideoInterview={handleStartVideoInterview}
            onScheduleInterview={handleScheduleInterview}
          />
        )}
        
        {activeTab === 'approvals' && (
          <ApprovalsTab 
            pendingApprovals={pendingApprovals}
            onApprovalAction={handleApprovalAction}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab 
            stats={stats}
            departmentStats={departmentStats}
            pipelineData={pipelineData}
          />
        )}
      </div>

      {/* Modals */}
      {showScheduler && (
        <InterviewScheduler 
          onClose={() => setShowScheduler(false)}
          onSchedule={handleScheduleInterview}
          availableSlots={availableSlots}
        />
      )}
      
      {showSourcing && (
        <CandidateSourcing 
          onClose={() => setShowSourcing(false)}
          onSearch={handleCandidateSourcing}
          sourcingChannels={sourcingChannels}
        />
      )}
      
      {showVideoPanel && videoInterview && (
        <VideoInterviewPanel 
          interview={videoInterview}
          onClose={() => setShowVideoPanel(false)}
        />
      )}
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, departmentStats, pipelineData, pendingApprovals, onStartVideoInterview }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Applications" 
          value={stats.totalApplications || 0} 
          icon={FiUsers}
          color="blue"
          trend={stats.applicationTrend}
        />
        <MetricCard 
          title="Active Jobs" 
          value={stats.activeJobs || 0} 
          icon={FiBriefcase}
          color="green"
          trend={stats.jobTrend}
        />
        <MetricCard 
          title="Interviews Scheduled" 
          value={stats.scheduledInterviews || 0} 
          icon={FiCalendar}
          color="purple"
          trend={stats.interviewTrend}
        />
        <MetricCard 
          title="Hired This Month" 
          value={stats.hiredThisMonth || 0} 
          icon={FiAward}
          color="yellow"
          trend={stats.hireTrend}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recruitment Pipeline</h3>
          <PipelineChart data={pipelineData} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
          <DepartmentChart data={departmentStats} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
          <PendingApprovalsList 
            approvals={pendingApprovals} 
            onStartVideoInterview={onStartVideoInterview}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Interviews</h3>
          <UpcomingInterviewsList onStartVideoInterview={onStartVideoInterview} />
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Pipeline Chart Component
function PipelineChart({ data }) {
  const stages = [
    { name: 'Applied', count: data?.applied || 0, color: 'bg-blue-500' },
    { name: 'Screening', count: data?.screening || 0, color: 'bg-yellow-500' },
    { name: 'Interview', count: data?.interview || 0, color: 'bg-purple-500' },
    { name: 'Offer', count: data?.offer || 0, color: 'bg-green-500' },
    { name: 'Hired', count: data?.hired || 0, color: 'bg-emerald-500' }
  ];

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.name} className="flex items-center space-x-4">
          <div className="w-20 text-sm font-medium text-gray-600">{stage.name}</div>
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div 
              className={`${stage.color} h-4 rounded-full transition-all duration-300`}
              style={{ width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="w-12 text-sm font-bold text-gray-900">{stage.count}</div>
        </div>
      ))}
    </div>
  );
}

// Department Chart Component
function DepartmentChart({ data }) {
  return (
    <div className="space-y-3">
      {data?.map((dept, index) => (
        <div key={dept.department} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-700">{dept.department}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{dept.applications} applications</span>
            <span className="text-sm font-bold text-gray-900">{dept.hired} hired</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pending Approvals List Component
function PendingApprovalsList({ approvals, onStartVideoInterview }) {
  return (
    <div className="space-y-3">
      {approvals?.slice(0, 5).map((approval) => (
        <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{approval.candidateName}</p>
              <p className="text-xs text-gray-600">{approval.position}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
              Approve
            </button>
            <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Upcoming Interviews List Component
function UpcomingInterviewsList({ onStartVideoInterview }) {
  const mockInterviews = [
    { id: 1, candidate: 'John Doe', position: 'Software Engineer', time: '2:00 PM', date: 'Today' },
    { id: 2, candidate: 'Jane Smith', position: 'Product Manager', time: '3:30 PM', date: 'Today' },
    { id: 3, candidate: 'Mike Johnson', position: 'UX Designer', time: '10:00 AM', date: 'Tomorrow' }
  ];

  return (
    <div className="space-y-3">
      {mockInterviews.map((interview) => (
        <div key={interview.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <FiVideo className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{interview.candidate}</p>
              <p className="text-xs text-gray-600">{interview.position} • {interview.date} at {interview.time}</p>
            </div>
          </div>
          <button 
            onClick={() => onStartVideoInterview(interview.id)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
}

// Jobs Tab Component
function JobsTab({ jobs, onRefresh }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Job Postings</h3>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <FiPlus className="w-4 h-4" />
            <span>Add Job</span>
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Job Card Component
function JobCard({ job }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          job.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {job.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{job.department}</p>
      <p className="text-sm text-gray-700 mb-4 line-clamp-2">{job.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{job.applications || 0} applications</span>
        <div className="flex space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiEdit className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiEye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Candidates Tab Component
function CandidatesTab({ candidates, jobs, onRefresh }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Candidates</h3>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FiFilter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <FiPlus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} jobs={jobs} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Candidate Card Component
function CandidateCard({ candidate, jobs }) {
  const job = jobs.find(j => j.id === candidate.jobId);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{candidate.name}</h4>
          <p className="text-sm text-gray-600">{candidate.email}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          candidate.status === 'HIRED' ? 'bg-green-100 text-green-800' :
          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {candidate.status}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">Applied for: {job?.title || 'Unknown Position'}</p>
        <p className="text-xs text-gray-500">Applied on {new Date(candidate.appliedAt).toLocaleDateString()}</p>
      </div>
      
      {candidate.aiScore && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700">AI Score</span>
            <span className="text-xs font-bold text-gray-900">{candidate.aiScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${candidate.aiScore}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiEye className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiFileText className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-1">
          <button className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
            <FiCheck className="w-3 h-3 inline mr-1" />
            Approve
          </button>
          <button className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
            <FiX className="w-3 h-3 inline mr-1" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// Interviews Tab Component
function InterviewsTab({ interviews, onStartVideoInterview, onScheduleInterview }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Scheduled Interviews</h3>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <FiCalendar className="w-4 h-4" />
              <span>Schedule New</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map((interview) => (
              <InterviewCard 
                key={interview.id} 
                interview={interview} 
                onStartVideoInterview={onStartVideoInterview}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Interview Card Component
function InterviewCard({ interview, onStartVideoInterview }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{interview.candidateName}</h4>
          <p className="text-sm text-gray-600">{interview.position}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          interview.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
          interview.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {interview.status}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">Interviewer: {interview.interviewerName}</p>
        <p className="text-sm text-gray-600">Date: {new Date(interview.date).toLocaleDateString()}</p>
        <p className="text-sm text-gray-600">Time: {interview.time}</p>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiEdit className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <FiMail className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={() => onStartVideoInterview(interview.id)}
          className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
        >
          <FiVideo className="w-4 h-4" />
          <span>Join</span>
        </button>
      </div>
    </div>
  );
}

// Approvals Tab Component
function ApprovalsTab({ pendingApprovals, onApprovalAction }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Pending Approvals</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <ApprovalCard 
              key={approval.id} 
              approval={approval} 
              onApprovalAction={onApprovalAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Approval Card Component
function ApprovalCard({ approval, onApprovalAction }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{approval.candidateName}</h4>
          <p className="text-sm text-gray-600">{approval.position}</p>
          <p className="text-xs text-gray-500">Submitted by {approval.submittedBy} on {new Date(approval.submittedAt).toLocaleDateString()}</p>
        </div>
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
          Pending
        </span>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-700">{approval.reason}</p>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button 
          onClick={() => onApprovalAction(approval.candidateId, 'reject', { reason: 'Not suitable' })}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
        >
          Reject
        </button>
        <button 
          onClick={() => onApprovalAction(approval.candidateId, 'approve', { comments: 'Approved' })}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ stats, departmentStats, pipelineData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recruitment Funnel</h3>
          <PipelineChart data={pipelineData} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
          <DepartmentChart data={departmentStats} />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Time to Hire Analysis</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">Time to hire analytics will be displayed here</p>
        </div>
      </div>
    </div>
  );
}

// Interview Scheduler Modal
function InterviewScheduler({ onClose, onSchedule, availableSlots }) {
  const [formData, setFormData] = useState({
    candidateId: '',
    interviewerId: '',
    date: '',
    time: '',
    type: 'video',
    duration: 60
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSchedule(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate</label>
            <select
              value={formData.candidateId}
              onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Candidate</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interviewer</label>
            <select
              value={formData.interviewerId}
              onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Interviewer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Candidate Sourcing Modal
function CandidateSourcing({ onClose, onSearch, sourcingChannels }) {
  const [searchParams, setSearchParams] = useState({
    keywords: '',
    location: '',
    experience: '',
    skills: '',
    channel: ''
  });

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchParams);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Source Candidates</h3>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <input
                type="text"
                value={searchParams.keywords}
                onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., React Developer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., San Francisco, CA"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select
                value={searchParams.experience}
                onChange={(e) => setSearchParams({ ...searchParams, experience: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sourcing Channel</label>
              <select
                value={searchParams.channel}
                onChange={(e) => setSearchParams({ ...searchParams, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Channels</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
                <option value="referral">Employee Referral</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <input
              type="text"
              value={searchParams.skills}
              onChange={(e) => setSearchParams({ ...searchParams, skills: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., JavaScript, Python, AWS"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Search Candidates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Video Interview Panel
function VideoInterviewPanel({ interview, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-5/6">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Video Interview - {interview.candidateName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 h-full">
          <div className="bg-gray-100 rounded-lg h-full flex items-center justify-center">
            <div className="text-center">
              <FiVideo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Video Interview Interface</p>
              <p className="text-sm text-gray-600">Video call functionality would be integrated here</p>
              <div className="mt-6 flex justify-center space-x-4">
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  End Call
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Mute
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Camera Off
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
