import React, { useState, useEffect } from 'react';
import { 
  FiHeart, 
  FiTrendingUp, 
  FiUsers,
  FiAward,
  FiStar,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiThumbsUp,
  FiGift,
  FiActivity,
  FiX
} from 'react-icons/fi';
import { engagementAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const formatDate = (value) => {
  if (!value) return 'TBD';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'TBD' : parsed.toLocaleDateString();
};

const Engagement = () => {
  const { realTimeData, sendRealTimeMessage } = useRealTime();
  const [surveys, setSurveys] = useState([]);
  const [mySurveys, setMySurveys] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [recognitionPrograms, setRecognitionPrograms] = useState([]);
  const [wellnessPrograms, setWellnessPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('surveys');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState({});

  useEffect(() => {
    fetchEngagementData();
    
    // Listen for real-time updates
    const handleEngagementUpdate = (event) => {
      console.log('Real-time engagement update received:', event.detail);
      fetchEngagementData();
    };
    
    window.addEventListener('engagement-update', handleEngagementUpdate);
    
    return () => {
      window.removeEventListener('engagement-update', handleEngagementUpdate);
    };
  }, []);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      
      const [availableData, mySurveysData] = await Promise.all([
        engagementAPI.getAvailableSurveys(),
        engagementAPI.getMySurveys()
      ]);

      const formattedMySurveys = (mySurveysData.surveys || mySurveysData || []).map((survey) => ({
        id: survey.survey_id,
        survey_id: survey.survey_id,
        title: survey.title,
        description: survey.description || '',
        status: (survey.status || 'pending').toLowerCase(),
        due_date: survey.end_date,
        completed_at: survey.completed_at,
      }));

      const completedSurveyIds = new Set(
        formattedMySurveys.filter((survey) => survey.status === 'completed').map((survey) => survey.survey_id)
      );

      const availableSurveys = (availableData.surveys || []).map((survey) => ({
        id: survey.survey_id,
        survey_id: survey.survey_id,
        title: survey.title,
        description: survey.description || '',
        category: survey.survey_type || 'Survey',
        questions_count: survey.questions_count || 0,
        estimated_time: survey.estimated_time || '5',
        reward_points: survey.reward_points || '10',
        questions: survey.questions || [],
        status: completedSurveyIds.has(survey.survey_id) ? 'completed' : 'pending',
      }));

      setSurveys(availableSurveys);
      setMySurveys(formattedMySurveys);
      setMetrics((prev) => ({
        overall_score: prev.overall_score || 85,
        survey_participation: Math.round(
          (completedSurveyIds.size / Math.max(availableSurveys.length, 1)) * 100
        ),
        recognition_participation: prev.recognition_participation || 65,
      }));
      setRecognitionPrograms([]);
      setWellnessPrograms([]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      // Fallback to empty arrays if API fails
      setSurveys([]);
      setMySurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSurvey = async (surveyId, responses) => {
    try {
      // Convert responses to the format expected by the API
      // Filter out empty responses and ensure question_id is valid
      const formattedResponses = Object.entries(responses)
        .filter(([question_id, answer]) => {
          // Filter out empty/null answers
          return answer !== null && answer !== undefined && answer !== '';
        })
        .map(([question_id, answer]) => {
          const qId = parseInt(question_id);
          if (isNaN(qId)) {
            console.error(`Invalid question_id: ${question_id}`);
            return null;
          }
          return {
            question_id: qId,
            answer: answer.toString().trim()
          };
        })
        .filter(r => r !== null); // Remove any null entries
      
      if (formattedResponses.length === 0) {
        alert('Please provide at least one response before submitting.');
        return;
      }
      
      console.log('Submitting survey responses:', {
        surveyId: surveyId,
        responses: formattedResponses,
        questionIds: formattedResponses.map(r => r.question_id)
      });
      
      await engagementAPI.submitSurveyResponse(surveyId, formattedResponses);
      alert('Survey submitted successfully! Thank you for your feedback.');
      
      // Refresh surveys
      await fetchEngagementData();
      
      // Send real-time update
      sendRealTimeMessage('engagement-update', {
        type: 'survey_submission',
        surveyId: surveyId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit survey. Please try again.';
      alert(errorMessage);
    }
  };

  const handleTakeSurvey = async (survey) => {
    try {
      // Fetch the survey with questions
      const surveyData = await engagementAPI.getSurvey(survey.survey_id);
      setSelectedSurvey({
        ...survey,
        questions: surveyData.questions || survey.questions || []
      });
    } catch (error) {
      console.error('Error fetching survey:', error);
      setSelectedSurvey(survey); // Fallback to survey without questions
    }
  };

  const handleNominateEmployee = async (nominationData) => {
    try {
      await engagementAPI.nominateEmployee(nominationData);
      await fetchEngagementData();
      
      // Send real-time update
      sendRealTimeMessage('engagement-update', {
        type: 'nomination',
        nominationData: nominationData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error nominating employee:', error);
    }
  };

  const handleJoinWellnessProgram = async (programId) => {
    try {
      await engagementAPI.joinWellnessProgram(programId);
      await fetchEngagementData();
      
      // Send real-time update
      sendRealTimeMessage('engagement-update', {
        type: 'wellness_join',
        programId: programId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error joining wellness program:', error);
    }
  };

  const getEngagementColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEngagementLevel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading engagement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Engagement</h1>
          <p className="text-gray-600 mt-2">Participate in surveys, recognition programs, and wellness initiatives</p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs text-gray-500">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Real-time data'}
            </span>
          </div>
        </div>
        <button
          onClick={fetchEngagementData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiTrendingUp className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiHeart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Engagement Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.engagement_score || 85}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Surveys Completed</p>
              <p className="text-2xl font-bold text-gray-900">{mySurveys.filter(s => s.status === 'completed').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiAward className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recognition Points</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.recognition_points || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiActivity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Wellness Programs</p>
              <p className="text-2xl font-bold text-gray-900">{wellnessPrograms.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'surveys', name: 'Surveys', icon: FiHeart },
              { id: 'recognition', name: 'Recognition', icon: FiAward },
              { id: 'wellness', name: 'Wellness', icon: FiActivity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Surveys Tab */}
          {activeTab === 'surveys' && (
            <div className="space-y-6">
              {/* My Surveys */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Surveys</h3>
                {mySurveys.length > 0 ? (
                  <div className="space-y-4">
                    {mySurveys.map((survey) => (
                      <div key={survey.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <FiHeart className="w-6 h-6 text-red-500" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{survey.title}</h4>
                            <p className="text-sm text-gray-600">{survey.description}</p>
                            <p className="text-xs text-gray-500">
                              Due: {formatDate(survey.due_date)}
                            </p>
                            {survey.completed_at && (
                              <p className="text-xs text-green-600 mt-1">
                                Submitted: {formatDate(survey.completed_at)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              survey.status === 'completed'
                                ? 'text-green-600 bg-green-100'
                                : 'text-yellow-600 bg-yellow-100'
                            }`}
                          >
                            {survey.status}
                          </span>
                          {survey.status !== 'completed' && (
                            <button
                              onClick={() => handleTakeSurvey(survey)}
                              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              <span>Take Survey</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiHeart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No surveys available</p>
                  </div>
                )}
              </div>

              {/* Available Surveys */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Surveys</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {surveys.map((survey) => {
                    const isCompleted = survey.status === 'completed';
                    return (
                      <div key={survey.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <FiHeart className="w-8 h-8 text-red-500" />
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            {survey.category}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 mb-2">{survey.title}</h4>
                        <p className="text-sm text-gray-600 mb-4">{survey.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Questions:</span>
                            <span className="font-medium">{survey.questions_count}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-medium">{survey.estimated_time} min</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Reward:</span>
                            <span className="font-medium">{survey.reward_points} points</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleTakeSurvey(survey)}
                          disabled={isCompleted}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            isCompleted
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isCompleted ? 'Completed' : 'Take Survey'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recognition Tab */}
          {activeTab === 'recognition' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recognition Programs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recognitionPrograms.map((program) => (
                    <div key={program.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <FiAward className="w-8 h-8 text-yellow-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {program.category}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{program.name}</h4>
                      <p className="text-sm text-gray-600 mb-4">{program.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Points:</span>
                          <span className="font-medium">{program.points}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Criteria:</span>
                          <span className="font-medium">{program.criteria}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Frequency:</span>
                          <span className="font-medium">{program.frequency}</span>
                        </div>
                      </div>
                      
                      <button className="w-full py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
                        Learn More
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nominate a Colleague</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-600 mb-4">Recognize outstanding work by nominating a colleague for recognition.</p>
                  <button 
                    onClick={() => handleNominateEmployee({})}
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    <FiThumbsUp className="w-4 h-4" />
                    <span>Nominate Someone</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wellness Tab */}
          {activeTab === 'wellness' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Wellness Programs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wellnessPrograms.map((program) => (
                    <div key={program.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <FiActivity className="w-8 h-8 text-purple-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {program.category}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{program.name}</h4>
                      <p className="text-sm text-gray-600 mb-4">{program.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">{program.duration}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Participants:</span>
                          <span className="font-medium">{program.participants_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Reward:</span>
                          <span className="font-medium">{program.reward}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleJoinWellnessProgram(program.id)}
                        className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        Join Program
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Survey Form Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{selectedSurvey.title}</h2>
              <button
                onClick={() => {
                  setSelectedSurvey(null);
                  setSurveyResponses({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">{selectedSurvey.description}</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleSubmitSurvey(selectedSurvey.survey_id, surveyResponses);
              setSelectedSurvey(null);
              setSurveyResponses({});
            }}>
              <div className="space-y-6">
                {selectedSurvey.questions?.map((question, index) => {
                  // Use question_id or id - ensure we have a valid numeric ID
                  const questionId = question.question_id ?? question.id;
                  const numericQuestionId = typeof questionId === 'number' ? questionId : parseInt(questionId);
                  
                  if (isNaN(numericQuestionId)) {
                    console.error('Invalid question ID:', questionId, question);
                    return null;
                  }
                  
                  return (
                    <div key={numericQuestionId || `q-${index}`} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {question.question_text}
                        {question.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {question.question_type === 'rating' && (
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <label key={rating} className="flex items-center">
                              <input
                                type="radio"
                                name={`question_${numericQuestionId}`}
                                value={rating}
                                onChange={(e) => setSurveyResponses(prev => ({
                                  ...prev,
                                  [numericQuestionId]: e.target.value
                                }))}
                                className="mr-1"
                                required={question.is_required}
                              />
                              <span className="text-sm">{rating}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {question.question_type === 'yes_no' && (
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`question_${numericQuestionId}`}
                              value="Yes"
                              onChange={(e) => setSurveyResponses(prev => ({
                                ...prev,
                                [numericQuestionId]: e.target.value
                              }))}
                              className="mr-2"
                              required={question.is_required}
                            />
                            Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`question_${numericQuestionId}`}
                              value="No"
                              onChange={(e) => setSurveyResponses(prev => ({
                                ...prev,
                                [numericQuestionId]: e.target.value
                              }))}
                              className="mr-2"
                              required={question.is_required}
                            />
                            No
                          </label>
                        </div>
                      )}
                      
                      {question.question_type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <label key={optIndex} className="flex items-center">
                              <input
                                type="radio"
                                name={`question_${numericQuestionId}`}
                                value={option}
                                onChange={(e) => setSurveyResponses(prev => ({
                                  ...prev,
                                  [numericQuestionId]: e.target.value
                                }))}
                                className="mr-2"
                                required={question.is_required}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {question.question_type === 'text' && (
                        <textarea
                          value={surveyResponses[numericQuestionId] || ''}
                          onChange={(e) => setSurveyResponses(prev => ({
                            ...prev,
                            [numericQuestionId]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Enter your response..."
                          required={question.is_required}
                        />
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSurvey(null);
                    setSurveyResponses({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Submit Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Engagement;