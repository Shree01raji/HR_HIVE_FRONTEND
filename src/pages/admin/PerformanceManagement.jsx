import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiTarget, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiEye,
  FiAward,
  FiStar,
  FiCheckCircle,
  FiClock,
  FiBarChart,
  FiUser,
  FiX
} from 'react-icons/fi';
import { performanceAPI, employeeAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const STATUS_MAP = {
  active: 'IN_PROGRESS',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  complete: 'COMPLETED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  overdue: 'OVERDUE',
  not_started: 'NOT_STARTED',
  pending: 'NOT_STARTED',
  draft: 'NOT_STARTED'
};

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? String(value) : asNumber;
};

const normalizeGoal = (goal) => {
  if (!goal || typeof goal !== 'object') {
    return null;
  }

  const rawStatus = goal.status ? goal.status.toString().toLowerCase() : '';
  const status = STATUS_MAP[rawStatus] || (rawStatus ? rawStatus.toUpperCase() : 'IN_PROGRESS');

  const targetValue = parseNumber(goal.target_value ?? goal.target);
  const currentValue = parseNumber(goal.current_value ?? goal.current) ?? 0;
  const existingProgress = parseNumber(goal.progress);

  const computedProgress =
    targetValue && targetValue > 0
      ? Math.min(100, Math.max(0, Math.round((currentValue / targetValue) * 100)))
      : existingProgress ?? 0;

  const endDate = goal.end_date ?? goal.due_date ?? null;

  return {
    id: normalizeId(goal.id ?? goal.goal_id ?? goal.goalId),
    employee_id: normalizeId(goal.employee_id ?? goal.employeeId),
    title: goal.title ?? '',
    description: goal.description ?? '',
    status,
    progress: computedProgress,
    start_date: goal.start_date ?? null,
    end_date: endDate,
    due_date: endDate,
    goal_type: goal.goal_type ?? goal.type ?? 'individual',
    category: goal.category ?? '',
    target_value: targetValue,
    current_value: currentValue,
    unit: goal.unit ?? null,
    priority: (goal.priority ?? 'MEDIUM').toString().toUpperCase(),
    created_by: normalizeId(goal.created_by ?? goal.createdBy),
    created_at: goal.created_at ?? null,
    updated_at: goal.updated_at ?? null
  };
};

const normalizeReview = (review) => {
  if (!review || typeof review !== 'object') {
    return null;
  }

  return {
    id: normalizeId(review.id ?? review.review_id ?? review.reviewId),
    employee_id: normalizeId(review.employee_id ?? review.employeeId),
    reviewer_id: normalizeId(review.reviewer_id ?? review.reviewerId),
    title: review.title ?? review.review_title ?? 'Performance Review',
    type: (review.type ?? review.review_type ?? 'ANNUAL').toString().toUpperCase(),
    status: (review.status ?? 'DRAFT').toString().toUpperCase(),
    start_date: review.start_date ?? review.review_period_start ?? null,
    end_date: review.end_date ?? review.review_period_end ?? null,
    overall_rating: parseNumber(review.overall_rating)
  };
};

const normalizeEmployee = (employee) => {
  if (!employee || typeof employee !== 'object') {
    return null;
  }

  return {
    id: normalizeId(employee.id ?? employee.employee_id ?? employee.employeeId),
    first_name: employee.first_name ?? '',
    last_name: employee.last_name ?? '',
    email: employee.email ?? '',
    department: employee.department ?? '',
    position: employee.position ?? employee.designation ?? ''
  };
};

const normalizeFeedback = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    id: normalizeId(item.id ?? item.feedback_id ?? item.feedbackId),
    employee_id: normalizeId(item.employee_id ?? item.employeeId),
    reviewer_id: normalizeId(item.reviewer_id ?? item.reviewerId),
    comments: item.comments ?? '',
    overall_rating: parseNumber(item.overall_rating),
    relationship_type: item.relationship_type ?? ''
  };
};

const toArray = (value, fallbackKey) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object' && fallbackKey && Array.isArray(value[fallbackKey])) {
    return value[fallbackKey];
  }
  return [];
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const PerformanceManagement = () => {
  const { realTimeData } = useRealTime();
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('goals');
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const availableDepartments = useMemo(() => {
    const departmentSet = new Set(
      employees
        .map(emp => (emp?.department || '').trim())
        .filter(Boolean)
    );
    return Array.from(departmentSet).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    if (departmentFilter === 'all') {
      return employees;
    }
    return employees.filter(emp => (emp?.department || '').toLowerCase() === departmentFilter.toLowerCase());
  }, [departmentFilter, employees]);

  const filteredGoals = useMemo(() => {
    if (!Array.isArray(goals)) return [];
    if (!Array.isArray(employees)) return [];
    if (departmentFilter === 'all') {
      return goals;
    }
    return goals.filter(goal => {
      const employee = Array.isArray(employees) ? employees.find(emp => {
        if (!emp || emp.id === null || goal.employee_id === null) {
          return false;
        }
        return String(emp.id) === String(goal.employee_id);
      }) : null;
      if (!employee) {
        return false;
      }
      return (employee.department || '').toLowerCase() === departmentFilter.toLowerCase();
    });
  }, [departmentFilter, goals, employees]);

  const filteredReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    if (!Array.isArray(filteredEmployees)) return [];
    if (departmentFilter === 'all') {
      return reviews;
    }
    const employeeIds = new Set((Array.isArray(filteredEmployees) ? filteredEmployees : []).map(emp => String(emp?.id)));
    return reviews.filter(review => review.employee_id !== null && employeeIds.has(String(review.employee_id)));
  }, [departmentFilter, reviews, filteredEmployees]);

  const activeGoalsCount = Array.isArray(filteredGoals) ? filteredGoals.filter(g => g?.status === 'IN_PROGRESS').length : 0;
  const completedGoalsCount = Array.isArray(filteredGoals) ? filteredGoals.filter(g => g?.status === 'COMPLETED').length : 0;

  useEffect(() => {
    fetchPerformanceData();
    
    // Listen for real-time performance updates
    const handlePerformanceUpdate = (event) => {
      console.log('Real-time performance update received:', event.detail);
      // Refresh data when real-time update is received
      fetchPerformanceData();
    };
    
    window.addEventListener('performance-update', handlePerformanceUpdate);
    
    return () => {
      window.removeEventListener('performance-update', handlePerformanceUpdate);
    };
  }, []);

  // Listen for real-time data changes from WebSocket
  useEffect(() => {
    if (realTimeData?.performance) {
      console.log('Real-time performance data updated:', realTimeData.performance);
      // Refresh data when WebSocket update is received
      fetchPerformanceData();
    }
  }, [realTimeData?.performance]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [goalsResult, reviewsResult, employeesResult, feedbackResult] = await Promise.allSettled([
        performanceAPI.getGoals(),
        performanceAPI.getReviews(),
        employeeAPI.getAll(),
        performanceAPI.getFeedback()
      ]);

      if (goalsResult.status === 'fulfilled') {
        const normalizedGoals = toArray(goalsResult.value, 'goals')
          .map(normalizeGoal)
          .filter(Boolean);
        setGoals(normalizedGoals);
      } else {
        console.error('Error fetching goals:', goalsResult.reason);
        setGoals([]);
      }

      if (reviewsResult.status === 'fulfilled') {
        const normalizedReviews = toArray(reviewsResult.value, 'reviews')
          .map(normalizeReview)
          .filter(Boolean);
        setReviews(normalizedReviews);
      } else {
        console.error('Error fetching reviews:', reviewsResult.reason);
        setReviews([]);
      }

      if (employeesResult.status === 'fulfilled') {
        const normalizedEmployees = toArray(employeesResult.value)
          .map(normalizeEmployee)
          .filter(Boolean);
        setEmployees(normalizedEmployees);
      } else {
        console.error('Error fetching employees:', employeesResult.reason);
        setEmployees([]);
      }

      if (feedbackResult.status === 'fulfilled') {
        const normalizedFeedback = toArray(feedbackResult.value, 'feedback')
          .map(normalizeFeedback)
          .filter(Boolean);
        setFeedback(normalizedFeedback);
      } else {
        console.error('Error fetching feedback:', feedbackResult.reason);
        setFeedback([]);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setGoals([]);
      setReviews([]);
      setEmployees([]);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (reviewData) => {
    try {
      const newReview = await performanceAPI.createReview(reviewData);
      const normalized = normalizeReview(newReview);
      setReviews(prev => (normalized ? [...prev, normalized] : prev));
      setShowCreateReview(false);
    } catch (error) {
      console.error('Error creating review:', error);
    }
  };

  const handleUpdateGoal = async (goalId, goalData) => {
    try {
      const updatedGoal = await performanceAPI.updateGoal(goalId, goalData);
      const normalized = normalizeGoal(updatedGoal);
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? (normalized ?? goal) : goal
      ));
      setSelectedGoal(null);
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await performanceAPI.deleteGoal(goalId);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const getGoalProgress = (goal) => {
    if (goal.status === 'COMPLETED') return 100;
    if (goal.status === 'NOT_STARTED') return 0;
    return goal.progress || 0;
  };

  const getReviewStatus = (review) => {
    const now = new Date();
    const startDate = new Date(review.start_date);
    const endDate = new Date(review.end_date);
    
    if (now < startDate) return 'UPCOMING';
    if (now > endDate) return 'OVERDUE';
    if (now >= startDate && now <= endDate) return 'ACTIVE';
    return 'COMPLETED';
  };

  const tabs = [
    { id: 'goals', label: 'Goals', icon: FiTarget },
    { id: 'reviews', label: 'Reviews', icon: FiStar },
    { id: 'employees', label: 'Employee Performance', icon: FiUsers },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Management</h1>
          <p className="text-gray-600">Manage goals, conduct reviews, and track employee performance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateReview(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            <span>Schedule Review</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">
            Filter performance insights by department to focus on specific teams.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700" htmlFor="department-filter">
            Department
          </label>
          <select
            id="department-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiTarget className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Goals</p>
              <p className="text-2xl font-bold text-gray-900">{activeGoalsCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiStar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Goals</p>
              <p className="text-2xl font-bold text-gray-900">{completedGoalsCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiClock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{filteredReviews.filter(r => getReviewStatus(r) === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">4.2/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Performance Goals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Goal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(Array.isArray(filteredGoals) ? filteredGoals : []).map((goal) => {
                        const progress = getGoalProgress(goal);
                        const employee = Array.isArray(employees) ? employees.find(
                          emp => emp && emp.id !== null && goal.employee_id !== null
                            ? String(emp.id) === String(goal.employee_id)
                            : false
                        ) : null;
                        const rowKey = goal.id ?? `${goal.employee_id || 'goal'}-${goal.title}`;
                        const statusLabel = goal.status || 'IN_PROGRESS';
                        const dueDateLabel = formatDate(goal.due_date);
                        
                        return (
                          <tr key={rowKey}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FiTarget className="w-5 h-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{goal.title}</div>
                                  <div className="text-sm text-gray-500">{goal.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-700">
                                      {employee?.first_name?.charAt(0)}{employee?.last_name?.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee?.first_name} {employee?.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{employee?.department}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                statusLabel === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800'
                                  : statusLabel === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {dueDateLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedGoal(goal)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedGoal(goal)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Performance Reviews</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Review
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reviewer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(Array.isArray(filteredReviews) ? filteredReviews : []).map((review) => {
                        const employee = Array.isArray(employees) ? employees.find(emp => emp && emp.id === review.employee_id) : null;
                        const reviewer = Array.isArray(employees) ? employees.find(emp => emp && emp.id === review.reviewer_id) : null;
                        const status = getReviewStatus(review);
                        
                        return (
                          <tr key={review.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                    <FiStar className="w-5 h-5 text-green-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{review.title}</div>
                                  <div className="text-sm text-gray-500">{review.type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-700">
                                      {employee?.first_name?.charAt(0)}{employee?.last_name?.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee?.first_name} {employee?.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{employee?.department}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {reviewer?.first_name} {reviewer?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{reviewer?.position}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                status === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800'
                                  : status === 'ACTIVE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : status === 'OVERDUE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(review.start_date)} - {formatDate(review.end_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedReview(review)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedReview(review)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Employee Performance Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Employee Performance Overview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Goals
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(Array.isArray(filteredEmployees) ? filteredEmployees : []).map((employee) => {
                        const employeeGoals = (Array.isArray(filteredGoals) ? filteredGoals : []).filter(
                          g => g && g.employee_id !== null && employee && employee.id !== null
                            ? String(g.employee_id) === String(employee.id)
                            : false
                        );
                        const completedGoals = employeeGoals.filter(g => g.status === 'COMPLETED').length;
                        const totalGoals = employeeGoals.length;
                        const avgRating = 4.2; // This would come from reviews
                        
                        return (
                          <tr key={employee.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee.first_name} {employee.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{employee.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {totalGoals}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {completedGoals}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <FiStar
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < Math.floor(avgRating)
                                          ? 'text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="ml-2 text-sm text-gray-900">{avgRating}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button 
                                onClick={() => setSelectedEmployee(employee)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <FiEye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Goal Completion Rate</span>
                      <span className="text-sm font-medium text-gray-900">78%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Performance Rating</span>
                      <span className="text-sm font-medium text-gray-900">4.2/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Review Completion Rate</span>
                      <span className="text-sm font-medium text-gray-900">85%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Department Performance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">IT Department</span>
                      <span className="text-sm font-medium text-gray-900">4.5/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">HR Department</span>
                      <span className="text-sm font-medium text-gray-900">4.1/5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Finance Department</span>
                      <span className="text-sm font-medium text-gray-900">3.9/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Review Modal */}
      {showCreateReview && (
        <CreateReviewModal
          employees={employees}
          onClose={() => setShowCreateReview(false)}
          onSubmit={handleCreateReview}
        />
      )}

      {/* Edit Goal Modal */}
      {selectedGoal && (
        <EditGoalModal
          goal={selectedGoal}
          employees={employees}
          onClose={() => setSelectedGoal(null)}
          onSubmit={(goalData) => handleUpdateGoal(selectedGoal.id, goalData)}
        />
      )}

      {/* Employee Performance Detail Modal */}
      {selectedEmployee && (
        <EmployeePerformanceModal
          employee={selectedEmployee}
          goals={filteredGoals}
          reviews={filteredReviews}
          feedback={feedback}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};

// Create Goal Modal Component
const CreateGoalModal = ({ employees, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    employee_id: '',
    start_date: '',
    end_date: '',
    goal_type: 'individual',
    category: '',
    target_value: '',
    unit: '',
    priority: 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert employee_id to integer and format data
    const goalData = {
      ...formData,
      employee_id: parseInt(formData.employee_id),
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      unit: formData.unit || null
    };
    onSubmit(goalData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create Performance Goal</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Title</label>
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
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {(Array.isArray(employees) ? employees : []).map(employee => (
                    <option key={employee?.id} value={employee?.id}>
                      {employee?.first_name} {employee?.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Create Review Modal Component
const CreateReviewModal = ({ employees, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    reviewer_id: '',
    review_type: '',
    review_period_start: '',
    review_period_end: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert IDs to integers and format data
    const reviewData = {
      ...formData,
      employee_id: parseInt(formData.employee_id),
      reviewer_id: formData.reviewer_id ? parseInt(formData.reviewer_id) : null
    };
    onSubmit(reviewData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Schedule Performance Review</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {(Array.isArray(employees) ? employees : []).map(employee => (
                    <option key={employee?.id} value={employee?.id}>
                      {employee?.first_name} {employee?.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reviewer (Optional)</label>
                <select
                  value={formData.reviewer_id}
                  onChange={(e) => setFormData({...formData, reviewer_id: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Auto-assign (Current User)</option>
                  {(Array.isArray(employees) ? employees : []).map(employee => (
                    <option key={employee?.id} value={employee?.id}>
                      {employee?.first_name} {employee?.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Review Type</label>
              <select
                value={formData.review_type}
                onChange={(e) => setFormData({...formData, review_type: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Type</option>
                <option value="annual">Annual Review</option>
                <option value="quarterly">Quarterly Review</option>
                <option value="monthly">Monthly Review</option>
                <option value="probation">Probation Review</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Review Period Start</label>
                <input
                  type="date"
                  value={formData.review_period_start}
                  onChange={(e) => setFormData({...formData, review_period_start: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Review Period End</label>
                <input
                  type="date"
                  value={formData.review_period_end}
                  onChange={(e) => setFormData({...formData, review_period_end: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
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
                Schedule Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Goal Modal Component
const EditGoalModal = ({ goal, employees, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: goal.title || '',
    description: goal.description || '',
    current_value: goal.current_value || '',
    status: goal.status || 'active',
    priority: goal.priority || 'medium',
    target_value: goal.target_value || '',
    end_date: goal.end_date || goal.due_date || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Format data for update
    const goalData = {
      ...formData,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null
    };
    onSubmit(goalData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Performance Goal</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Title</label>
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
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {(Array.isArray(employees) ? employees : []).map(employee => (
                    <option key={employee?.id} value={employee?.id}>
                      {employee?.first_name} {employee?.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                Update Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Employee Performance Detail Modal Component
const EmployeePerformanceModal = ({ employee, goals, reviews, feedback, onClose }) => {
  if (!employee) return null;

  const getGoalProgress = (goal) => {
    if (goal.status === 'COMPLETED') return 100;
    if (goal.status === 'NOT_STARTED') return 0;
    return goal.progress || 0;
  };

  const getReviewStatus = (review) => {
    if (!review.start_date || !review.end_date) return 'DRAFT';
    const now = new Date();
    const startDate = new Date(review.start_date);
    const endDate = new Date(review.end_date);
    
    if (now < startDate) return 'UPCOMING';
    if (now > endDate) return 'OVERDUE';
    if (now >= startDate && now <= endDate) return 'ACTIVE';
    return 'COMPLETED';
  };

  const employeeGoals = (Array.isArray(goals) ? goals : []).filter(
    g => g && g.employee_id !== null && employee && employee.id !== null
      ? String(g.employee_id) === String(employee.id)
      : false
  );
  const activeGoals = employeeGoals.filter(g => g.status === 'IN_PROGRESS');
  const completedGoals = employeeGoals.filter(g => g.status === 'COMPLETED');
  const employeeReviews = (Array.isArray(reviews) ? reviews : []).filter(
    r => r && r.employee_id !== null && employee && employee.id !== null
      ? String(r.employee_id) === String(employee.id)
      : false
  );
  const employeeFeedback = (Array.isArray(feedback) ? feedback : []).filter(
    f => f && f.employee_id !== null && employee && employee.id !== null
      ? String(f.employee_id) === String(employee.id)
      : false
  );

  // Calculate average rating from reviews
  const ratings = employeeReviews
    .map(r => r.overall_rating)
    .filter(r => r !== null && r !== undefined);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : 4.2;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xl font-medium text-gray-700">
                {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-sm text-gray-600">{employee.email}</p>
              <p className="text-sm text-gray-500">{employee.department} • {employee.position}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-gray-900">{activeGoals.length}</p>
              </div>
              <FiTarget className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Goals</p>
                <p className="text-2xl font-bold text-gray-900">{completedGoals.length}</p>
              </div>
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{employeeReviews.length}</p>
              </div>
              <FiStar className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
                  <span className="text-sm text-gray-500">/5</span>
                </div>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(avgRating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Goals</h4>
          {employeeGoals.length === 0 ? (
            <p className="text-gray-500 text-sm">No goals assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {employeeGoals.map((goal) => {
                const progress = getGoalProgress(goal);
                return (
                  <div key={goal.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{goal.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        goal.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : goal.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Progress</span>
                        <span className="text-xs font-medium text-gray-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.status === 'COMPLETED' ? 'bg-green-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Due: {formatDate(goal.due_date)}</span>
                      {goal.target_value && (
                        <span>Target: {goal.target_value} {goal.unit || ''}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Reviews</h4>
          {employeeReviews.length === 0 ? (
            <p className="text-gray-500 text-sm">No reviews conducted yet.</p>
          ) : (
            <div className="space-y-3">
              {employeeReviews.map((review) => {
                const status = getReviewStatus(review);
                return (
                  <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{review.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{review.type}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : status === 'OVERDUE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Period: {formatDate(review.start_date)} - {formatDate(review.end_date)}
                      </span>
                      {review.overall_rating && (
                        <div className="flex items-center space-x-1">
                          <span>Rating:</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(review.overall_rating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="ml-1">{review.overall_rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        {employeeFeedback.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h4>
            <div className="space-y-3">
              {employeeFeedback.map((item) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{item.comments}</p>
                  {item.overall_rating && (
                    <div className="mt-2 flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(item.overall_rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 ml-1">{item.overall_rating}/5</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceManagement;