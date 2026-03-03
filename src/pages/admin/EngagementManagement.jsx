import React, { useState, useEffect } from 'react';
import { 
  FiHeart, 
  FiUsers, 
  FiTrendingUp, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiEye,
  FiAward,
  FiTarget,
  FiBarChart,
  FiStar,
  FiThumbsUp,
  FiGift,
  FiActivity,
  FiX
} from 'react-icons/fi';
import { engagementAPI, surveyAnalyticsAPI } from '../../services/api';

const EngagementManagement = () => {
  const [surveys, setSurveys] = useState([]);
  const [recognitionPrograms, setRecognitionPrograms] = useState([]);
  const [wellnessPrograms, setWellnessPrograms] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('surveys');
  const [showCreateRecognition, setShowCreateRecognition] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState(null);
  const [surveyAnalytics, setSurveyAnalytics] = useState(null);
  const [selectedEmployeeResponse, setSelectedEmployeeResponse] = useState(null);

  useEffect(() => {
    fetchEngagementData();
  }, []);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      
      const [surveysData, recognitionData, wellnessData, metricsData] = await Promise.all([
        engagementAPI.getSurveys(),
        engagementAPI.getRecognitionPrograms(),
        engagementAPI.getWellnessPrograms(),
        engagementAPI.getEngagementMetrics()
      ]);
      
      setSurveys(surveysData);
      setRecognitionPrograms(recognitionData);
      setWellnessPrograms(wellnessData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleCreateRecognition = async (recognitionData) => {
    try {
      const newRecognition = await engagementAPI.createRecognitionProgram(recognitionData);
      setRecognitionPrograms(prev => [...prev, newRecognition]);
      setShowCreateRecognition(false);
    } catch (error) {
      console.error('Error creating recognition program:', error);
    }
  };

  const handleUpdateSurvey = async (surveyId, surveyData) => {
    try {
      const updatedSurvey = await engagementAPI.updateSurvey(surveyId, surveyData);
      setSurveys(prev => prev.map(survey => 
        survey.id === surveyId ? updatedSurvey : survey
      ));
      setSelectedSurvey(null);
    } catch (error) {
      console.error('Error updating survey:', error);
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    try {
      await engagementAPI.deleteSurvey(surveyId);
      setSurveys(prev => prev.filter(survey => survey.survey_id !== surveyId));
      // Refresh the data
      fetchEngagementData();
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert('Failed to delete survey. Please try again.');
    }
  };

  const handleViewResponses = async (surveyId) => {
    try {
      const responses = await engagementAPI.getSurveyResponses(surveyId);
      setSurveyResponses(responses);
      setSurveyAnalytics(null);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const handleViewAnalytics = async (surveyId) => {
    try {
      const analytics = await engagementAPI.getSurveyQuestionAnalytics(surveyId);
      setSurveyAnalytics(analytics);
      setSurveyResponses(null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const tabs = [
    { id: 'surveys', label: 'Surveys', icon: FiTarget },
    { id: 'recognition', label: 'Recognition', icon: FiAward },
    { id: 'wellness', label: 'Wellness', icon: FiHeart },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Engagement Management
          </h1>
          <p className="text-gray-600 mt-2">Manage surveys, recognition programs, and employee wellness initiatives</p>
        </div>
        <div className="flex space-x-3">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">AI-Powered Survey Creation</p>
            <p className="text-xs text-gray-400">Use the chatbot to create surveys automatically</p>
          </div>
          <button
            onClick={() => setShowCreateRecognition(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FiPlus className="w-5 h-5" />
            <span>Recognition Program</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  activeTab === tab.id
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-600 hover:text-teal-600'
                }`}
              >
            <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
          {activeTab === 'surveys' && (
            <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Employee Surveys</h2>
              <div className="text-sm text-gray-500">
                {surveys.length} survey{surveys.length !== 1 ? 's' : ''}
                                </div>
                              </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-12">
                <FiTarget className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys</h3>
                <p className="mt-1 text-sm text-gray-500">Use the chatbot to create surveys automatically</p>
                              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {surveys.map((survey) => (
                  <div key={survey.survey_id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                        <p className="text-sm text-gray-600">{survey.survey_type}</p>
                            </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        survey.status === 'active' ? 'bg-green-100 text-green-800' :
                        survey.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                            }`}>
                              {survey.status}
                            </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{survey.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Target:</span>
                        <span className="text-gray-900">{survey.target_audience}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="text-gray-900">
                          {new Date(survey.start_date).toLocaleDateString()} - {new Date(survey.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleViewResponses(survey.survey_id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                                title="View Responses"
                              >
                                <FiEye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewAnalytics(survey.survey_id)}
                        className="px-3 py-1 text-sm text-purple-600 hover:text-purple-700"
                                title="View Analytics"
                              >
                                <FiBarChart className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSelectedSurvey(survey)}
                        className="px-3 py-1 text-sm text-teal-600 hover:text-teal-700"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                        onClick={() => handleDeleteSurvey(survey.survey_id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                  </div>
                      ))}
                </div>
            )}
            </div>
          )}

          {activeTab === 'recognition' && (
            <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Recognition Programs</h2>
            <div className="text-center py-12">
              <FiAward className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recognition programs</h3>
              <p className="mt-1 text-sm text-gray-500">Create recognition programs to motivate employees</p>
              </div>
            </div>
          )}

          {activeTab === 'wellness' && (
            <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Wellness Programs</h2>
            <div className="text-center py-12">
              <FiHeart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No wellness programs</h3>
              <p className="mt-1 text-sm text-gray-500">Create wellness programs to support employee health</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Engagement Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiHeart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Engagement Score</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.overall_score || 85}%</p>
                  </div>
                </div>
                    </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiTarget className="w-6 h-6 text-green-600" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Surveys</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.total_surveys || 0}</p>
                    </div>
                  </div>
                </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiAward className="w-6 h-6 text-purple-600" />
                    </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Recognitions</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.total_recognitions || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Create Recognition Modal */}
      {showCreateRecognition && (
        <CreateRecognitionModal
          onClose={() => setShowCreateRecognition(false)}
          onSubmit={handleCreateRecognition}
        />
      )}

      {/* Edit Survey Modal */}
      {selectedSurvey && (
        <EditSurveyModal
          survey={selectedSurvey}
          onClose={() => setSelectedSurvey(null)}
          onSubmit={(surveyData) => handleUpdateSurvey(selectedSurvey.id, surveyData)}
        />
      )}

      {/* Survey Responses Modal */}
      {surveyResponses && (
        <SurveyResponsesModal
          responsesData={surveyResponses}
          onClose={() => setSurveyResponses(null)}
          onViewEmployee={(employee) => setSelectedEmployeeResponse(employee)}
        />
      )}

      {/* Employee Response Detail Modal */}
      {selectedEmployeeResponse && (
        <EmployeeResponseModal
          employee={selectedEmployeeResponse}
          onClose={() => setSelectedEmployeeResponse(null)}
        />
      )}

      {/* Survey Analytics Modal */}
      {surveyAnalytics && (
        <SurveyAnalyticsModal
          analytics={surveyAnalytics}
          onClose={() => setSurveyAnalytics(null)}
        />
      )}
    </div>
  );
};


// Create Recognition Modal Component
const CreateRecognitionModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    criteria: '',
    rewards: '',
    duration: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create Recognition Program</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Program Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Employee of the Month">Employee of the Month</option>
                  <option value="Team Recognition">Team Recognition</option>
                  <option value="Innovation Award">Innovation Award</option>
                  <option value="Customer Service">Customer Service</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Duration</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Create Program
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Survey Modal Component
const EditSurveyModal = ({ survey, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: survey.title,
    description: survey.description,
    type: survey.type,
    target_audience: survey.target_audience,
    start_date: survey.start_date,
    end_date: survey.end_date
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Survey</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Survey Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.survey_type}
                  onChange={(e) => setFormData({...formData, survey_type: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="satisfaction">Employee Satisfaction</option>
                  <option value="engagement">Engagement</option>
                  <option value="pulse">Pulse Survey</option>
                  <option value="exit">Exit Survey</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Audience</option>
                  <option value="All Employees">All Employees</option>
                  <option value="department">Department Specific</option>
                  <option value="role">Role Specific</option>
                  <option value="specific">Specific Employees</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Update Survey
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Survey Responses Modal Component
const SurveyResponsesModal = ({ responsesData, onClose, onViewEmployee }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{responsesData.survey_title}</h3>
            <p className="text-sm text-gray-600">{responsesData.total_responses} respondents</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Array.isArray(responsesData.employees) && responsesData.employees.length > 0 ? (
            responsesData.employees.map((employee, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{employee.employee_name}</h4>
                    {employee.email && <p className="text-sm text-gray-600">{employee.email}</p>}
                  </div>
                  <button
                    onClick={() => onViewEmployee(employee)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No responses yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Employee Response Detail Modal Component
const EmployeeResponseModal = ({ employee, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{employee.employee_name}'s Responses</h3>
            {employee.email && <p className="text-sm text-gray-600">{employee.email}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {employee.responses && employee.responses.map((response, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">{response.question_text}</h4>
              <p className="text-gray-700">{response.answer}</p>
              <p className="text-xs text-gray-500 mt-2">Submitted: {new Date(response.submitted_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Survey Analytics Modal Component
const SurveyAnalyticsModal = ({ analytics, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{analytics.survey_title} - Analytics</h3>
            <p className="text-sm text-gray-600">
              {analytics.response_rate}% response rate ({analytics.unique_respondents} / {analytics.total_possible_respondents})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {analytics.question_analytics && analytics.question_analytics.map((question, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">{question.question_text}</h4>
              <p className="text-sm text-gray-600 mb-2">Type: {question.question_type} | {question.response_count} responses</p>
              
              {question.question_type === 'rating' && question.statistics.average && (
                <div>
                  <p className="text-sm text-gray-700">Average Rating: {question.statistics.average.toFixed(2)}</p>
                  <p className="text-sm text-gray-700">Min: {question.statistics.min} | Max: {question.statistics.max}</p>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Distribution:</p>
                    <div className="flex gap-2">
                      {Object.entries(question.statistics.distribution).map(([rating, count]) => (
                        <div key={rating} className="flex-1">
                          <div className="text-xs text-gray-600">{rating}: {count}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(count / question.response_count) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {question.question_type === 'multiple_choice' && question.statistics.distribution && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Answer Distribution:</p>
                  <div className="space-y-1">
                    {Object.entries(question.statistics.distribution).map(([answer, count]) => (
                      <div key={answer} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 flex-1">{answer}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {question.question_type === 'text' && question.statistics.responses && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Sample Responses:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {question.statistics.responses.slice(0, 3).map((answer, idx) => (
                      <p key={idx} className="text-sm text-gray-700 italic">"{answer.substring(0, 100)}..."</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EngagementManagement;
