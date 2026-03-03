import React, { useState, useEffect } from 'react';
import { useRealTime } from '../contexts/RealTimeContext';
import { 
  FiX, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiInfo, 
  FiAlertTriangle,
  FiBell
} from 'react-icons/fi';
import TaskStatusUpdateModal from './TaskStatusUpdateModal';

const RealTimeNotifications = () => {
  const { notifications, removeNotification, clearNotifications, isConnected } = useRealTime();
  const [isOpen, setIsOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Listen for task status notification clicks
  useEffect(() => {
    const handleTaskNotificationClick = (event) => {
      const { task_id, task_title } = event.detail;
      if (task_id) {
        // Fetch task details and open modal
        fetchTaskAndOpenModal(task_id);
      }
    };
    
    window.addEventListener('task-status-notification-click', handleTaskNotificationClick);
    return () => {
      window.removeEventListener('task-status-notification-click', handleTaskNotificationClick);
    };
  }, []);
  
  const fetchTaskAndOpenModal = async (taskId) => {
    try {
      const { taskTrackingAPI } = await import('../services/api');
      const task = await taskTrackingAPI.getTask(taskId);
      setSelectedTask(task);
      setTaskModalOpen(true);
    } catch (error) {
      console.error('Error fetching task:', error);
    }
  };
  
  const handleNotificationClick = (notification) => {
    if (notification.task_id) {
      fetchTaskAndOpenModal(notification.task_id);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FiInfo className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Connection Status */}
      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow relative"
        >
          <FiBell className="w-6 h-6 text-gray-600" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>

        {/* Notifications Panel */}
        {isOpen && (
          <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <FiBell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification, index) => (
                    <div
                      key={index}
                      className={`p-4 border-l-4 ${getBgColor(notification.type)} ${
                        notification.task_id ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                      onClick={() => notification.task_id && handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        {getIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                          {notification.task_id && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Click to update status →
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(index);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto-hide notifications */}
      {notifications.length > 0 && (
        <div className="mt-2 space-y-2">
          {notifications.slice(0, 3).map((notification, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg shadow-lg border-l-4 ${getBgColor(notification.type)} animate-slide-in-right`}
            >
              <div className="flex items-start space-x-2">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => removeNotification(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Task Status Update Modal */}
      <TaskStatusUpdateModal
        task={selectedTask}
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={() => {
          // Refresh notifications or trigger update
          window.dispatchEvent(new CustomEvent('task-updated'));
        }}
      />
    </div>
  );
};

export default RealTimeNotifications;
