import React, { useState, useEffect } from 'react';
import { FiBriefcase, FiFileText, FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiUsers, FiStar, FiTarget, FiMessageCircle } from 'react-icons/fi';
import { recruitmentAPI, applicationsAPI } from '../../services/api';

export default function CandidateDashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    appliedJobs: 0,
    pendingApplications: 0,
    qualifiedApplications: 0,
    recentJobs: [],
    recentApplications: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [jobs, applications] = await Promise.all([
        recruitmentAPI.getPublicJobs(), // Use public endpoint for candidates
        applicationsAPI.getMyApplications().catch(() => []) // Handle if no applications yet
      ]);
      
      const openJobs = jobs.filter(job => job.status === 'OPEN');
      const appliedJobs = applications.length;
      const pendingApplications = applications.filter(app => 
        ['Applied', 'Scanning', 'Qualified', 'Forwarded'].includes(app.status)
      ).length;
      const qualifiedApplications = applications.filter(app => 
        app.status === 'Qualified' || app.status === 'Forwarded'
      ).length;
      
      setStats({
        totalJobs: openJobs.length,
        appliedJobs: appliedJobs,
        pendingApplications: pendingApplications,
        qualifiedApplications: qualifiedApplications,
        recentJobs: openJobs.slice(0, 3),
        recentApplications: applications.slice(0, 3)
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white rounded-lg p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Career Center</h1>
            <p className="text-teal-100 mt-2">Your gateway to exciting career opportunities</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <div className="text-teal-100">Open Positions</div>
          </div>
        </div>
      </div>

      {/* Career Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-teal-500">
          <div className="flex items-center">
            <div className="p-3 bg-teal-100 rounded-lg">
              <FiBriefcase className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiFileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Applications Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.appliedJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-emerald-500">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FiClock className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiStar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Qualified</p>
              <p className="text-2xl font-bold text-gray-900">{stats.qualifiedApplications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured Jobs */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Featured Opportunities</h2>
            <a 
              href="/candidate/careers" 
              className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center"
            >
              View All <FiTarget className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          {stats.recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <FiBriefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No job postings available at the moment.</p>
              <p className="text-sm text-gray-400 mt-2">Check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentJobs.map((job) => (
                <div key={job.job_id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-teal-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{job.department}</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                    </div>
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <button 
                        onClick={() => {
                          // Dispatch custom event to open chat with job application
                          const event = new CustomEvent('openChatForJob', { 
                            detail: { job } 
                          });
                          window.dispatchEvent(event);
                        }}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Applications */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Applications</h2>
            <a 
              href="/candidate/applications" 
              className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center"
            >
              View All <FiFileText className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          {stats.recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No applications yet.</p>
              <p className="text-sm text-gray-400 mt-2">Start applying for jobs to track your progress.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentApplications.map((app) => (
                <div key={app.application_id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{app.job?.title || 'Job Title'}</h3>
                      <p className="text-sm text-gray-600 mb-2">{app.job?.department || 'Department'}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'qualified' ? 'bg-green-100 text-green-800' :
                        app.status === 'forwarded' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {app.status === 'qualified' ? 'Qualified' :
                         app.status === 'forwarded' ? 'Forwarded' :
                         app.status === 'rejected' ? 'Not Selected' :
                         'In Review'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Career Tools & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiTarget className="w-5 h-5 mr-2 text-teal-600" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a 
              href="/candidate/careers"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-all duration-200"
            >
              <FiBriefcase className="w-5 h-5 text-teal-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Browse Jobs</h3>
                <p className="text-sm text-gray-600">Find your next opportunity</p>
              </div>
            </a>
            
            <a 
              href="/candidate/applications"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all duration-200"
            >
              <FiFileText className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">My Applications</h3>
                <p className="text-sm text-gray-600">Track your progress</p>
              </div>
            </a>
          </div>
        </div>

        {/* AI Resume Scanner */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiStar className="w-5 h-5 mr-2 text-teal-600" />
            AI Resume Scanner
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Our AI automatically scans your resume and provides compatibility scores for each job application.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Qualified Applications:</span>
              <span className="font-semibold text-green-600">{stats.qualifiedApplications}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Success Rate:</span>
              <span className="font-semibold text-teal-600">
                {stats.appliedJobs > 0 ? Math.round((stats.qualifiedApplications / stats.appliedJobs) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* HR Assistant */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiMessageCircle className="w-5 h-5 mr-2 text-emerald-600" />
            HR Assistant
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Get personalized guidance on applications, resume tips, and interview preparation.
          </p>
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <p className="text-xs text-gray-500 mb-2">💡 Pro Tip:</p>
            <p className="text-sm text-gray-700">
              Ask the HR Assistant about "AI resume scanning" to learn how our system works!
            </p>
          </div>
        </div>
      </div>

      {/* Career Success Tips */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiUsers className="h-6 w-6 text-teal-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Career Success Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">📝 Application Strategy</h4>
                <ul className="space-y-1">
                  <li>• Tailor your resume to each job description</li>
                  <li>• Write compelling cover letters</li>
                  <li>• Apply to jobs that match your skills</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">🤖 AI Optimization</h4>
                <ul className="space-y-1">
                  <li>• Include relevant keywords from job postings</li>
                  <li>• Highlight quantifiable achievements</li>
                  <li>• Keep your resume format clean and readable</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
