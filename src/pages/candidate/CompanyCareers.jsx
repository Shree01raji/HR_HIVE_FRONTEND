import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiBriefcase, FiMapPin, FiClock, FiUsers, FiSearch, FiFilter, FiStar, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { recruitmentAPI, applicationsAPI } from '../../services/api';
import ChatWidget from '../../components/ChatWidget';

export default function CompanyCareers() {
  const { organizationSlug } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [myApplications, setMyApplications] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [expandedReq, setExpandedReq] = useState({});

  useEffect(() => {
    fetchData();
  }, [organizationSlug]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, selectedDepartment]);

  // Reset card index when filtered jobs change
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [filteredJobs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        handleCardSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleCardSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCardIndex, filteredJobs]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[CompanyCareers] Fetching data for organization:', organizationSlug);
      
      // Fetch organization details with jobs using the API service
      const data = await recruitmentAPI.getOrganizationCareers(organizationSlug);
      
      console.log('[CompanyCareers] Data received:', data);
      
      setOrganization(data.organization);
      setJobs(data.jobs || []);
      
      // Try to fetch user applications if logged in
      try {
        const applicationsData = await applicationsAPI.getMyApplications().catch(() => []);
        setMyApplications(applicationsData);
      } catch (err) {
        // User might not be logged in, that's okay
        console.log('[CompanyCareers] User not logged in or no applications:', err);
        setMyApplications([]);
      }
    } catch (err) {
      console.error('[CompanyCareers] Failed to fetch company careers data:', err);
      console.error('[CompanyCareers] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.detail || err.message || 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs.filter(job => job.status === 'OPEN');
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedDepartment) {
      filtered = filtered.filter(job => job.department === selectedDepartment);
    }
    
    setFilteredJobs(filtered);
  };

  const getDepartments = () => {
    const departments = [...new Set(jobs.map(job => job.department))];
    return departments.sort();
  };

  const hasApplied = (jobId) => {
    return myApplications.some(app => app.job_id === jobId);
  };

  const getApplicationStatus = (jobId) => {
    const application = myApplications.find(app => app.job_id === jobId);
    if (!application) return null;
    
    switch (application.status) {
      case 'applied': return { text: 'Applied', color: 'bg-blue-100 text-blue-800' };
      case 'scanning': return { text: 'AI Scanning', color: 'bg-purple-100 text-purple-800' };
      case 'qualified': return { text: 'Qualified', color: 'bg-green-100 text-green-800' };
      case 'forwarded': return { text: 'Forwarded to HR', color: 'bg-indigo-100 text-indigo-800' };
      case 'shortlisted': return { text: 'Shortlisted', color: 'bg-yellow-100 text-yellow-800' };
      case 'interview': return { text: 'Interview', color: 'bg-orange-100 text-orange-800' };
      case 'hired': return { text: 'Hired', color: 'bg-emerald-100 text-emerald-800' };
      case 'rejected': return { text: 'Not Selected', color: 'bg-red-100 text-red-800' };
      default: return { text: 'Applied', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleApply = (job) => {
    // Trigger chat widget to open and start job application
    const event = new CustomEvent('openChatForJob', { 
      detail: { 
        job: job,
        message: `apply for ${job.title}`
      } 
    });
    window.dispatchEvent(event);
  };

  const handleCardSwipe = (direction) => {
    if (filteredJobs.length === 0) return;
    
    const maxIndex = Math.max(0, filteredJobs.length - 2); // Show 2 cards at a time
    
    if (direction === 'left' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    } else if (direction === 'right' && currentCardIndex < maxIndex) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const getCurrentJobs = () => {
    if (filteredJobs.length === 0) return [];
    return filteredJobs.slice(currentCardIndex, currentCardIndex + 2);
  };

  const toggleDesc = (jobId) => {
    setExpandedDesc(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const toggleReq = (jobId) => {
    setExpandedReq(prev => ({ ...prev, [jobId]: !prev[jobId] }));
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

  if (!organization) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Company not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Header with Logo */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {organization.logo_url && (
              <div className="flex-shrink-0">
                <img 
                  src={organization.logo_url} 
                  alt={`${organization.name} logo`}
                  className="w-24 h-24 object-contain bg-white rounded-lg p-2"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold mb-2">{organization.name}</h1>
              {organization.description && (
                <p className="text-blue-100 text-lg">{organization.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-3 text-blue-100">
                {organization.industry && (
                  <span className="flex items-center">
                    <FiBriefcase className="w-4 h-4 mr-1" />
                    {organization.industry}
                  </span>
                )}
                {organization.company_size && (
                  <span className="flex items-center">
                    <FiUsers className="w-4 h-4 mr-1" />
                    {organization.company_size} employees
                  </span>
                )}
                {organization.website && (
                  <a 
                    href={organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center hover:text-white transition-colors"
                  >
                    <FiExternalLink className="w-4 h-4 mr-1" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{filteredJobs.length}</div>
            <div className="text-blue-100">Open Positions</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title, department, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="md:w-64">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Departments</option>
                {getDepartments().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Job Listings - Swipeable Cards */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <FiBriefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedDepartment 
              ? 'Try adjusting your search criteria or filters'
              : 'No open positions available at the moment'
            }
          </p>
          {(searchTerm || selectedDepartment) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleCardSwipe('left')}
                disabled={currentCardIndex === 0}
                className={`p-2 rounded-full transition-colors ${
                  currentCardIndex === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {Math.floor(currentCardIndex / 2) + 1} of {Math.ceil(filteredJobs.length / 2)}
              </span>
              <button
                onClick={() => handleCardSwipe('right')}
                disabled={currentCardIndex >= filteredJobs.length - 2}
                className={`p-2 rounded-full transition-colors ${
                  currentCardIndex >= filteredJobs.length - 2
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Use arrow keys or buttons to navigate • Swipe to browse
            </div>
          </div>

          {/* Current Job Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getCurrentJobs().map((job) => {
              const applicationStatus = getApplicationStatus(job.job_id);
              const applied = hasApplied(job.job_id);
              
              return (
                <div key={job.job_id} className="bg-gray-50 shadow-lg rounded-xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{job.title}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <FiMapPin className="w-4 h-4 mr-1 text-blue-500" />
                        <span>{job.department}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Open
                      </span>
                      {applied && applicationStatus && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${applicationStatus.color}`}>
                          {applicationStatus.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className={`text-gray-700 text-sm leading-relaxed ${expandedDesc[job.job_id] ? '' : 'line-clamp-3'}`}>{job.description}</p>
                    {job.description && job.description.length > 140 && (
                      <button
                        onClick={() => toggleDesc(job.job_id)}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {expandedDesc[job.job_id] ? 'Read less' : 'Read more'}
                      </button>
                    )}
                  </div>

                  {/* Requirements */}
                  {job.requirements && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements:</h4>
                      <p className={`text-sm text-gray-600 leading-relaxed ${expandedReq[job.job_id] ? '' : 'line-clamp-2'}`}>{job.requirements}</p>
                      {job.requirements.length > 120 && (
                        <button
                          onClick={() => toggleReq(job.job_id)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expandedReq[job.job_id] ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-500">
                        <FiClock className="w-3 h-3 mr-1" />
                        <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApply(job)}
                          disabled={applied}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            applied
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5'
                          }`}
                        >
                          {applied ? 'Applied' : 'Apply Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Application Tips */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiStar className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Application Tips</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Click "Apply Now" to start a conversation with our Career Assistant</li>
              <li>• The chatbot will guide you through all application questions step by step</li>
              <li>• Our AI will automatically scan your resume for compatibility</li>
              <li>• Qualified candidates (35+ AI score) are forwarded to HR</li>
              <li>• You'll receive email updates on your application status</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Widget for Job Applications */}
      <ChatWidget />
    </div>
  );
}
