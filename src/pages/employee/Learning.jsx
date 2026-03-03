import React, { useState, useEffect } from 'react';
import { 
  FiBookOpen, 
  FiAward, 
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiPlay,
  FiDownload,
  FiStar,
  FiTarget,
  FiUsers
} from 'react-icons/fi';
import { learningAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const Learning = () => {
  const { realTimeData, sendRealTimeMessage } = useRealTime();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [myProgress, setMyProgress] = useState([]);
  const [skills, setSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    fetchLearningData();
    
    // Listen for real-time updates
    const handleLearningUpdate = (event) => {
      console.log('Real-time learning update received:', event.detail);
      fetchLearningData();
    };
    
    window.addEventListener('learning-update', handleLearningUpdate);
    
    return () => {
      window.removeEventListener('learning-update', handleLearningUpdate);
    };
  }, []);

  const fetchLearningData = async () => {
    try {
      setLoading(true);
      
      // Fetch all courses
      const coursesData = await learningAPI.getCourses();
      setCourses(coursesData);
      
      // Fetch my enrolled courses
      const myCoursesData = await learningAPI.getMyCourses();
      setMyCourses(myCoursesData);
      
      // Fetch my progress
      const progressData = await learningAPI.getMyProgress();
      setMyProgress(progressData);
      
      // Fetch skills
      const skillsData = await learningAPI.getSkills();
      setSkills(skillsData);
      
      // Fetch my skills
      const mySkillsData = await learningAPI.getMySkills();
      setMySkills(mySkillsData);
      
      // Fetch certifications
      const certificationsData = await learningAPI.getCertifications();
      setCertifications(certificationsData);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      await learningAPI.enrollCourse(courseId);
      await fetchLearningData();
      
      // Send real-time update
      sendRealTimeMessage('learning-update', {
        type: 'enrollment',
        courseId: courseId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const handleCompleteCourse = async (courseId) => {
    try {
      await learningAPI.completeCourse(courseId);
      await fetchLearningData();
      
      // Send real-time update
      sendRealTimeMessage('learning-update', {
        type: 'completion',
        courseId: courseId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing course:', error);
    }
  };

  const handleUpdateProgress = async (courseId, progressPercentage) => {
    try {
      await learningAPI.updateCourseProgress(courseId, progressPercentage);
      await fetchLearningData();
      
      // Send real-time update
      sendRealTimeMessage('learning-update', {
        type: 'progress',
        courseId: courseId,
        progress: progressPercentage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const openProgressModal = (course) => {
    setSelectedCourse(course);
    const progress = myProgress.find(p => p.course_id === course.id);
    setProgressPercentage(progress ? progress.progress_percentage : 0);
    setShowProgressModal(true);
  };

  const closeProgressModal = () => {
    setShowProgressModal(false);
    setSelectedCourse(null);
    setProgressPercentage(0);
  };

  const submitProgressUpdate = async () => {
    if (selectedCourse) {
      await handleUpdateProgress(selectedCourse.id, progressPercentage);
      closeProgressModal();
    }
  };

  const getCourseIcon = (category) => {
    switch (category) {
      case 'technical':
        return <FiBookOpen className="w-6 h-6 text-blue-500" />;
      case 'leadership':
        return <FiUsers className="w-6 h-6 text-green-500" />;
      case 'soft-skills':
        return <FiStar className="w-6 h-6 text-purple-500" />;
      case 'certification':
        return <FiAward className="w-6 h-6 text-yellow-500" />;
      default:
        return <FiBookOpen className="w-6 h-6 text-gray-500" />;
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (progress >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
  };

  const getCourseProgress = (courseId) => {
    const progress = myProgress.find(p => p.course_id === courseId);
    return progress ? progress.progress_percentage : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading learning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning & Development</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Enhance your skills and advance your career</p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Real-time data'}
            </span>
          </div>
        </div>
        <button
          onClick={fetchLearningData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiTrendingUp className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiBookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Courses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{myCourses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {myCourses.filter(c => c.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FiAward className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{certifications.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FiTarget className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Skills</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{mySkills.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'courses', name: 'Courses', icon: FiBookOpen },
              { id: 'skills', name: 'Skills', icon: FiTarget },
              { id: 'certifications', name: 'Certifications', icon: FiAward }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              {/* My Courses */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Courses</h3>
                {myCourses.length > 0 ? (
                  <div className="space-y-4">
                    {myCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getCourseIcon(course.category)}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{course.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{course.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProgressColor(getCourseProgress(course.id))} dark:bg-opacity-20`}>
                                {getCourseProgress(course.id)}% Complete
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <FiClock className="w-3 h-3 inline mr-1" />
                                {course.duration_hours || 0} hours
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openProgressModal(course)}
                            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                          >
                            <FiTrendingUp className="w-4 h-4" />
                            <span>Update Progress</span>
                          </button>
                          {course.status === 'in_progress' && (
                            <button
                              onClick={() => handleCompleteCourse(course.id)}
                              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              <span>Complete</span>
                            </button>
                          )}
                          {course.external_link ? (
                            <button 
                              onClick={() => window.open(course.external_link, '_blank')}
                              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              <FiPlay className="w-4 h-4" />
                              <span>Start Learning</span>
                            </button>
                          ) : (
                            <button 
                              className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              <FiPlay className="w-4 h-4" />
                              <span className="text-sm">Continue</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiBookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No courses enrolled yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Browse available courses below to get started</p>
                  </div>
                )}
              </div>

              {/* Available Courses */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => {
                    const isEnrolled = myCourses.some(c => c.course_id === course.id);
                    return (
                      <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                        <div className="flex items-start justify-between mb-4">
                          {getCourseIcon(course.category)}
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {course.category}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{course.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{course.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{course.duration} hours</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Level:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{course.level}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Instructor:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{course.instructor}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {isEnrolled && course.external_link && (
                            <button
                              onClick={() => window.open(course.external_link, '_blank')}
                              className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              Start Learning!
                            </button>
                          )}
                          <button
                            onClick={() => handleEnrollCourse(course.id)}
                            disabled={isEnrolled}
                            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                              isEnrolled
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isEnrolled ? 'Enrolled' : 'Enroll Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Skills</h3>
                {mySkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mySkills.map((skill) => (
                      <div key={skill.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{skill.name}</h4>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{skill.level}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${skill.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{skill.progress}% proficiency</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiTarget className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No skills tracked yet</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Skills</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map((skill) => (
                    <div key={skill.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{skill.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{skill.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{skill.category}</span>
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                          Add Skill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Certifications Tab */}
          {activeTab === 'certifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Certifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-4">
                        <FiAward className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {cert.category}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{cert.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{cert.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Provider:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{cert.provider}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{cert.duration}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{cert.cost}</span>
                        </div>
                      </div>
                      
                      <button className="w-full py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
                        Learn More
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Update Modal */}
      {showProgressModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Update Progress - {selectedCourse.title}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress Percentage
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 w-16">
                  {progressPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeProgressModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitProgressUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Learning;
