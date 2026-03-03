import React, { useState, useEffect } from 'react';
import { FiClipboard, FiClock, FiUsers, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { engagementAPI } from '../../services/api';

const Surveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMySurveys();
  }, []);

  const fetchMySurveys = async () => {
    try {
      const data = await engagementAPI.getMySurveys();
      setSurveys(data);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmitResponse = async () => {
    if (!selectedSurvey) return;
    
    // Validate that all required questions are answered
    const requiredQuestions = selectedSurvey.questions?.filter(q => q.is_required) || [];
    const unansweredRequired = requiredQuestions.filter(q => {
      const qId = q.question_id || q.id;
      return !responses[qId] || (typeof responses[qId] === 'string' && !responses[qId].trim());
    });
    
    if (unansweredRequired.length > 0) {
      alert(`Please answer all required questions. ${unansweredRequired.length} question(s) remaining.`);
      return;
    }
    
    setSubmitting(true);
    try {
      // Convert responses dictionary to the format expected by the API
      // Format: [{question_id: int, answer: str}, ...]
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
        setSubmitting(false);
        return;
      }
      
      console.log('Submitting survey responses:', {
        surveyId: selectedSurvey.survey_id || selectedSurvey.id,
        responses: formattedResponses,
        questionIds: formattedResponses.map(r => r.question_id)
      });
      
      // Use survey_id instead of id
      const surveyId = selectedSurvey.survey_id || selectedSurvey.id;
      await engagementAPI.submitSurveyResponse(surveyId, formattedResponses);
      
      alert('Survey submitted successfully! Thank you for your feedback.');
      setSelectedSurvey(null);
      setResponses({});
      fetchMySurveys();
    } catch (error) {
      console.error('Error submitting response:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to submit survey. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'COMPLETED': return 'text-blue-600 bg-blue-100';
      case 'EXPIRED': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <FiCheckCircle className="w-4 h-4" />;
      case 'COMPLETED': return <FiCheckCircle className="w-4 h-4" />;
      case 'EXPIRED': return <FiAlertCircle className="w-4 h-4" />;
      default: return <FiClock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-teal-100 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl shadow-lg text-white">
            <FiClipboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Employee Surveys
            </h1>
            <p className="text-gray-600">Participate in company surveys and share your feedback</p>
          </div>
        </div>
      </div>

      {/* Surveys List */}
      <div className="grid gap-6">
        {surveys.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-teal-100 p-8 text-center">
            <FiClipboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Surveys Available</h3>
            <p className="text-gray-600">There are currently no surveys for you to participate in.</p>
          </div>
        ) : (
          surveys.map((survey) => (
            <div key={survey.id} className="bg-white rounded-xl shadow-lg border border-teal-100 hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(survey.status)}`}>
                        {getStatusIcon(survey.status)}
                        <span className="ml-1">{survey.status}</span>
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{survey.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FiUsers className="w-4 h-4" />
                        <span>{survey.target_audience}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-4 h-4" />
                        <span>Due: {new Date(survey.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Type:</span> {survey.survey_type}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // Fetch survey details with questions before opening modal
                        const surveyId = survey.survey_id || survey.id;
                        const surveyData = await engagementAPI.getSurvey(surveyId);
                        setSelectedSurvey({
                          ...survey,
                          questions: surveyData.questions || survey.questions || []
                        });
                      } catch (error) {
                        console.error('Error fetching survey details:', error);
                        // Fallback: open with existing survey data
                        setSelectedSurvey(survey);
                      }
                    }}
                    disabled={survey.status !== 'ACTIVE'}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      survey.status === 'ACTIVE'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {survey.status === 'ACTIVE' ? 'Take Survey' : 'Survey Closed'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Survey Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {selectedSurvey.title}
                </h3>
                <button 
                  onClick={() => setSelectedSurvey(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600">{selectedSurvey.description}</p>
              </div>

              {/* Survey Questions */}
              <div className="space-y-6 mb-6">
                {selectedSurvey.questions && selectedSurvey.questions.length > 0 ? (
                  selectedSurvey.questions.map((question, index) => {
                    // Use question_id or id - ensure we have a valid ID
                    // question_id is the primary key from the database
                    const questionId = question.question_id ?? question.id;
                    
                    // Validate that we have a valid question ID
                    if (questionId === undefined || questionId === null) {
                      console.error('Question missing ID:', question);
                      return null;
                    }
                    
                    // Ensure questionId is a number
                    const numericQuestionId = typeof questionId === 'number' ? questionId : parseInt(questionId);
                    if (isNaN(numericQuestionId)) {
                      console.error('Invalid question ID format:', questionId, question);
                      return null;
                    }
                    
                    return (
                      <div key={numericQuestionId || `q-${index}`} className="border border-teal-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {index + 1}. {question.question_text}
                          {question.is_required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        
                        {question.question_type === 'multiple_choice' ? (
                          <div className="space-y-2">
                            {question.options && Array.isArray(question.options) ? (
                              question.options.map((option, optIndex) => (
                                <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question_${numericQuestionId}`}
                                    value={option}
                                    onChange={(e) => handleResponseChange(numericQuestionId, e.target.value)}
                                    className="text-teal-600 focus:ring-teal-500"
                                    required={question.is_required}
                                  />
                                  <span className="text-gray-700">{option}</span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No options available</p>
                            )}
                          </div>
                        ) : question.question_type === 'rating' ? (
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_${numericQuestionId}`}
                                  value={rating}
                                  onChange={(e) => handleResponseChange(numericQuestionId, parseInt(e.target.value))}
                                  className="text-teal-600 focus:ring-teal-500"
                                  required={question.is_required}
                                />
                                <span className="text-gray-700">{rating}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={responses[numericQuestionId] || ''}
                            onChange={(e) => handleResponseChange(numericQuestionId, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-teal-500 focus:border-teal-500"
                            rows={3}
                            placeholder="Enter your response..."
                            required={question.is_required}
                          />
                        )}
                      </div>
                    );
                  }).filter(Boolean) // Remove any null entries
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No questions available for this survey.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedSurvey(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-lg hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Surveys;
