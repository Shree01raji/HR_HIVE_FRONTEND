import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiBookOpen, 
  FiUsers, 
  FiTrendingUp, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiEye,
  FiDownload,
  FiUpload,
  FiClock,
  FiAward,
  FiCheckCircle,
  FiX
} from 'react-icons/fi';
import { learningAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const LearningManagement = () => {
  const { user } = useAuth();
  const { realTimeData, sendRealTimeMessage } = useRealTime();
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [employeeProgress, setEmployeeProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchLearningData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('[LearningManagement] Fetching learning data...');
      
      const [coursesData, employeesData, enrollmentsData, progressData] = await Promise.all([
        learningAPI.getCourses().catch(err => {
          console.error('[LearningManagement] Error fetching courses:', err);
          return [];
        }),
        learningAPI.getEmployees().catch(err => {
          console.error('[LearningManagement] Error fetching employees:', err);
          return [];
        }),
        learningAPI.getEnrollments().catch(err => {
          console.error('[LearningManagement] Error fetching enrollments:', err);
          return [];
        }),
        learningAPI.getEmployeesProgress().catch(err => {
          console.error('[LearningManagement] Error fetching progress:', err);
          return [];
        })
      ]);
      
      // Ensure all data is an array
      const safeCourses = Array.isArray(coursesData) ? coursesData : [];
      const safeEmployees = Array.isArray(employeesData) ? employeesData : [];
      const safeEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      const safeProgress = Array.isArray(progressData) ? progressData : [];
      
      console.log('[LearningManagement] Data received:', {
        courses: safeCourses.length,
        employees: safeEmployees.length,
        enrollments: safeEnrollments.length,
        progress: safeProgress.length
      });
      
      setCourses(safeCourses);
      setEmployees(safeEmployees);
      setEnrollments(safeEnrollments);
      setEmployeeProgress(safeProgress);
    } catch (error) {
      console.error('[LearningManagement] Error fetching learning data:', error);
      // Set empty arrays on error to prevent undefined state
      setCourses([]);
      setEmployees([]);
      setEnrollments([]);
      setEmployeeProgress([]);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - function doesn't depend on any props/state

  useEffect(() => {
    let isMounted = true;
    
    // Wait for user to be available before fetching data
    if (!user) {
      console.log('[LearningManagement] User not available yet, waiting...');
      return;
    }
    
    const loadData = async () => {
      console.log('[LearningManagement] Component mounted, fetching data...', {
        user: user?.email,
        role: user?.role
      });
      
      if (isMounted) {
        await fetchLearningData();
      }
    };
    
    // Small delay to ensure auth context is fully initialized
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        loadData();
      }
    }, 100);
    
    // Listen for real-time updates
    const handleLearningUpdate = (event) => {
      console.log('Real-time learning update received:', event.detail);
      if (isMounted) {
        fetchLearningData();
      }
    };
    
    window.addEventListener('learning-update', handleLearningUpdate);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('learning-update', handleLearningUpdate);
    };
  }, [fetchLearningData, user]);

  const handleCreateCourse = async (courseData) => {
    try {
      const newCourse = await learningAPI.createCourse(courseData);
      setCourses(prev => [...prev, newCourse]);
      setShowCreateCourse(false);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      const updatedCourse = await learningAPI.updateCourse(courseId, courseData);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? updatedCourse : course
      ));
      setSelectedCourse(null);
    } catch (error) {
      console.error('Error updating course:', error);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await learningAPI.deleteCourse(courseId);
      setCourses(prev => prev.filter(course => course.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const getCourseStats = (courseId) => {
    const courseEnrollments = enrollments.filter(e => e.course_id === courseId);
    // Backend uses lowercase status values: 'completed', 'enrolled', 'in_progress'
    const completed = courseEnrollments.filter(e => 
      e.status?.toLowerCase() === 'completed' || e.status === 'COMPLETED'
    ).length;
    const inProgress = courseEnrollments.filter(e => 
      e.status?.toLowerCase() === 'in_progress' || e.status === 'IN_PROGRESS' || 
      (e.status?.toLowerCase() === 'enrolled' && e.status?.toLowerCase() !== 'completed')
    ).length;
    const total = courseEnrollments.length;
    
    return { total, completed, inProgress };
  };

  const tabs = [
    { id: 'courses', label: 'Courses', icon: FiBookOpen },
    { id: 'employees', label: 'Employee Progress', icon: FiUsers },
    { id: 'analytics', label: 'Analytics', icon: FiTrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Learning Management</h1>
          </div>
          <p className="text-gray-600">Manage courses, track employee progress, and analyze learning outcomes</p>
        </div>
        <button
          onClick={() => setShowCreateCourse(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create Course</span>
        </button>
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
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {/* Course Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiBookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Courses</p>
                      <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiUsers className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
                      <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FiClock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {enrollments.filter(e => 
                          e.status?.toLowerCase() === 'in_progress' || 
                          e.status === 'IN_PROGRESS' ||
                          (e.status?.toLowerCase() === 'enrolled' && e.status?.toLowerCase() !== 'completed')
                        ).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiAward className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {enrollments.filter(e => 
                          e.status?.toLowerCase() === 'completed' || e.status === 'COMPLETED'
                        ).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courses List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">All Courses</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courses.map((course) => {
                        const stats = getCourseStats(course.id);
                        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        
                        return (
                        <div key={course.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center">
                                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <FiBookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="ml-3">
                                  <h4 className="text-lg font-medium text-gray-900 line-clamp-2">{course.title}</h4>
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                                    {course.category}
                                  </span>
                                </div>
                                  </div>
                                </div>
                            
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                            
                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Duration</span>
                                <span className="text-sm font-medium text-gray-900">{course.duration} hours</span>
                                </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Enrollments</span>
                                <span className="text-sm font-medium text-gray-900">{stats.total}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Completion Rate</span>
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full" 
                                    style={{ width: `${completionRate}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900">{completionRate}%</span>
                              </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {course.external_link && (
                                  <button
                                    onClick={() => window.open(course.external_link, '_blank')}
                                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                                  >
                                    Start Learning!
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedCourse(course)}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                View
                                </button>
                                <button
                                  onClick={() => setSelectedCourse(course)}
                                className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                Delete
                                </button>
                              </div>
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Progress Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Employee Learning Progress</h3>
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
                          Courses Enrolled
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employeeProgress.map((employee) => {
                        const progress = employee.average_progress;
                        const progressColor = progress >= 80 ? 'bg-green-600' : progress >= 50 ? 'bg-yellow-500' : 'bg-blue-600';
                        
                        return (
                          <tr key={employee.user_id}>
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
                              {employee.total_enrollments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.completed_enrollments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-900">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Trends</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Most Popular Course</span>
                      <span className="text-sm font-medium text-gray-900">JavaScript Fundamentals</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Highest Completion Rate</span>
                      <span className="text-sm font-medium text-gray-900">95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Learning Time</span>
                      <span className="text-sm font-medium text-gray-900">2.5 hours/week</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Department Performance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">IT Department</span>
                      <span className="text-sm font-medium text-gray-900">85% completion</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">HR Department</span>
                      <span className="text-sm font-medium text-gray-900">78% completion</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Finance Department</span>
                      <span className="text-sm font-medium text-gray-900">72% completion</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Course Modal */}
      {showCreateCourse && (
        <CreateCourseModal
          onClose={() => setShowCreateCourse(false)}
          onSubmit={handleCreateCourse}
        />
      )}

      {/* Edit Course Modal */}
      {selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onSubmit={(courseData) => handleUpdateCourse(selectedCourse.id, courseData)}
        />
      )}
    </div>
  );
};

// Create Course Modal Component
const CreateCourseModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    duration: '',
    content: '',
    prerequisites: '',
    objectives: '',
    external_link: ''
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
            <h3 className="text-lg font-medium text-gray-900">Create New Course</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Title</label>
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Technical">Technical</option>
                  <option value="Soft Skills">Soft Skills</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">External Course Link</label>
              <input
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                placeholder="https://example.com/course"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Link to the external course platform</p>
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
                Create Course
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Course Modal Component
const EditCourseModal = ({ course, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    duration: course.duration,
    content: course.content,
    prerequisites: course.prerequisites,
    objectives: course.objectives,
    external_link: course.external_link || ''
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
            <h3 className="text-lg font-medium text-gray-900">Edit Course</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Title</label>
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Technical">Technical</option>
                  <option value="Soft Skills">Soft Skills</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">External Course Link</label>
              <input
                type="url"
                value={formData.external_link}
                onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                placeholder="https://example.com/course"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Link to the external course platform</p>
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
                Update Course
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LearningManagement;
