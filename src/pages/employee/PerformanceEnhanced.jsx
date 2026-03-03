import React, { useState, useEffect } from 'react';
import { 
  FiTarget, 
  FiCheckCircle, 
  FiClock, 
  FiTrendingUp,
  FiStar,
  FiCalendar,
  FiUser,
  FiPlus,
  FiRefreshCw,
  FiEdit,
  FiTrash2,
  FiAward,
  FiMessageSquare,
  FiX
} from 'react-icons/fi';
import { performanceAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const formatDate = (value) => {
  if (!value) {
    return 'TBD';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'TBD' : parsed.toLocaleDateString();
};

const normalizeReview = (review) => {
  if (!review || typeof review !== 'object') {
    return null;
  }

  const start = review.review_period_start || review.period_start || review.start_date;
  const end = review.review_period_end || review.period_end || review.end_date;
  const rawStatus = (review.status || 'pending').toLowerCase();
  const statusMap = {
    scheduled: 'scheduled',
    draft: 'pending',
    pending: 'pending',
    completed: 'completed',
    approved: 'completed',
    active: 'in_progress',
    in_progress: 'in_progress',
  };
  const status = statusMap[rawStatus] || rawStatus;

  return {
    id: review.review_id || review.id,
    title: `${(review.review_type || 'performance').replace(/_/g, ' ')} Review`.replace(/\b\w/g, (c) => c.toUpperCase()),
    description: review.development_plan || review.manager_comments || '',
    status,
    period:
      start && end
        ? `${formatDate(start)} - ${formatDate(end)}`
        : 'Period not set',
    reviewer_name: review.reviewer_name || 'Reviewer not assigned',
    rating: review.overall_rating,
    start_date: start,
    end_date: end,
  };
};

const normalizeGoal = (goal) => {
  if (!goal || typeof goal !== 'object') {
    return null;
  }

  const rawStatus = (goal.status || 'in_progress').toLowerCase();
  const statusMap = {
    active: 'in_progress',
    inprogress: 'in_progress',
    in_progress: 'in_progress',
    completed: 'completed',
    complete: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };
  const status = statusMap[rawStatus] || rawStatus;
  const target = goal.target_value ?? goal.target ?? null;
  const current = goal.current_value ?? goal.current ?? 0;
  const existingProgress = goal.progress ?? null;
  let computedProgress = existingProgress ?? 0;

  if (target && Number(target) !== 0) {
    const ratio = (Number(current) / Number(target)) * 100;
    if (Number.isFinite(ratio)) {
      computedProgress = Math.max(0, Math.min(100, Math.round(ratio)));
    }
  } else if (existingProgress === null && status === 'completed') {
    computedProgress = 100;
  }

  return {
    id: goal.goal_id || goal.id,
    title: goal.title,
    description: goal.description,
    status,
    progress: computedProgress,
    due_date: goal.end_date || goal.due_date,
    priority: goal.priority || 'medium',
    created_at: goal.created_at,
    updated_at: goal.updated_at,
  };
};

const PerformanceEnhanced = () => {
  const { realTimeData, sendRealTimeMessage } = useRealTime();
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('goals');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPerformanceData();
    
    // Listen for real-time updates
    const handlePerformanceUpdate = (event) => {
      console.log('Real-time performance update received:', event.detail);
      fetchPerformanceData();
    };
    
    window.addEventListener('performance-update', handlePerformanceUpdate);
    
    return () => {
      window.removeEventListener('performance-update', handlePerformanceUpdate);
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch goals
      const goalsData = await performanceAPI.getMyGoals();
      const normalizedGoals = (goalsData.goals || [])
        .map(normalizeGoal)
        .filter(Boolean);
      setGoals(normalizedGoals);
      
      // Fetch reviews
      const reviewsData = await performanceAPI.getMyReviews();
      const normalizedReviews = (reviewsData.reviews || [])
        .map(normalizeReview)
        .filter(Boolean);
      setReviews(normalizedReviews);
      
      // Fetch feedback
      const feedbackData = await performanceAPI.getFeedback();
      setFeedback(feedbackData.feedback || []);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (goalData) => {
    try {
      await performanceAPI.createGoal(goalData);
      await fetchPerformanceData();
      setShowGoalForm(false);
      
      // Send real-time update
      sendRealTimeMessage('performance-update', {
        type: 'goal_created',
        goalData: goalData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };

  const handleUpdateGoal = async (goalId, goalData) => {
    try {
      await performanceAPI.updateGoal(goalId, goalData);
      await fetchPerformanceData();
      
      // Send real-time update
      sendRealTimeMessage('performance-update', {
        type: 'goal_updated',
        goalId: goalId,
        goalData: goalData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleSubmitFeedback = async (feedbackData) => {
    try {
      await performanceAPI.submitFeedback(feedbackData);
      await fetchPerformanceData();
      
      // Send real-time update
      sendRealTimeMessage('performance-update', {
        type: 'feedback_submitted',
        feedbackData: feedbackData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getGoalStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReviewStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'scheduled':
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track your goals, reviews, and professional development</p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Real-time data'}
            </span>
          </div>
        </div>
        <button
          onClick={fetchPerformanceData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiTarget className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Goals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {goals.filter(g => g.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Goals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {goals.filter(g => g.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FiStar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{reviews.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FiMessageSquare className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Feedback</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feedback.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'goals', name: 'Goals', icon: FiTarget },
              { id: 'reviews', name: 'Reviews', icon: FiStar },
              { id: 'feedback', name: 'Feedback', icon: FiMessageSquare }
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
          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Goals</h3>
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Add Goal</span>
                </button>
              </div>

              {goals.length > 0 ? (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <FiTarget className="w-6 h-6 text-blue-500" />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{goal.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{goal.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                          <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                            <FiEdit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-gray-500">Progress:</span>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${goal.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{goal.progress}%</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Due Date:</span>
                          <p className="font-medium">{formatDate(goal.due_date)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Priority:</span>
                          <p className="font-medium">{goal.priority}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created: {formatDate(goal.created_at)}</span>
                          {goal.updated_at && (
                            <span>Updated: {formatDate(goal.updated_at)}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Update Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiTarget className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No goals set yet</p>
                  <p className="text-sm text-gray-400 mt-2">Create your first goal to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Performance Reviews</h3>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <FiStar className="w-6 h-6 text-yellow-500" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.title}</h4>
                            <p className="text-sm text-gray-600">{review.description}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getReviewStatusColor(review.status)}`}>
                          {review.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-gray-500">Period:</span>
                          <p className="font-medium">{review.period}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Reviewer:</span>
                          <p className="font-medium">{review.reviewer_name}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Rating:</span>
                          <p className="font-medium">{review.rating || 'Pending'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Start: {formatDate(review.start_date)}</span>
                          <span>End: {formatDate(review.end_date)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiStar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No reviews available</p>
                  <p className="text-sm text-gray-400 mt-2">Performance reviews will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback & Recognition</h3>
              </div>

              {feedback.length > 0 ? (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <FiMessageSquare className="w-6 h-6 text-green-500" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            <p className="text-sm text-gray-600">{item.content}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>From: {item.from_name}</span>
                          <span>Type: {item.type}</span>
                        </div>
                        {item.rating && (
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <FiStar 
                                key={i} 
                                className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiMessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No feedback received yet</p>
                  <p className="text-sm text-gray-400 mt-2">Feedback from colleagues and managers will appear here</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Give Feedback</h4>
                <p className="text-sm text-gray-600 mb-4">Share feedback with your colleagues to help them grow.</p>
                <button 
                  onClick={() => handleSubmitFeedback({})}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FiMessageSquare className="w-4 h-4" />
                  <span>Give Feedback</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Goal Modal */}
      {showGoalForm && (
        <CreateGoalModal
          onClose={() => setShowGoalForm(false)}
          onSubmit={handleCreateGoal}
        />
      )}
    </div>
  );
};

// Create Goal Modal Component
const CreateGoalModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    start_date: '',
    end_date: '',
    goal_type: 'individual',
    target_value: '',
    unit: '',
    priority: 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const goalData = {
      ...formData,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      unit: formData.unit || null,
      priority: formData.priority.toLowerCase()
    };
    onSubmit(goalData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create Performance Goal</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Category</option>
                <option value="development">Development</option>
                <option value="performance">Performance</option>
                <option value="learning">Learning</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.target_value}
                  onChange={(e) => setFormData({...formData, target_value: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
                <input
                  type="text"
                  placeholder="e.g., hours, tasks, %"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PerformanceEnhanced;
