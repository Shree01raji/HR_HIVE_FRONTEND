import React, { useState, useEffect } from 'react';
import { taskTrackingAPI, timesheetAPI } from '../../services/api';
import { employeeAPI } from '../../services/api';
import { FiPlus, FiX, FiCheck, FiClock, FiUser, FiCalendar, FiFlag, FiFileText, FiTarget, FiBell, FiAlertCircle, FiCheckCircle, FiEye, FiEdit, FiTrash2, FiList, FiRefreshCw, FiChevronDown, FiChevronRight } from 'react-icons/fi';

export default function TaskManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState({ type: null, message: '' });
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [createMode, setCreateMode] = useState('single'); // 'single' or 'multiple'
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logTimeTask, setLogTimeTask] = useState(null);
  const [logTimeForm, setLogTimeForm] = useState({ start_time: '', end_time: '', notes: '' });
  const [logTimeSubmitting, setLogTimeSubmitting] = useState(false);
  const [taskList, setTaskList] = useState([{ id: Date.now(), title: '', description: '', reason: '', reminder_date: '', priority: 'MEDIUM', due_date: '' }]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // Working confirmation state
  const [workingConfirmationSending, setWorkingConfirmationSending] = useState(false);
  const [workingConfirmationMessage, setWorkingConfirmationMessage] = useState('');
  
  // Form state for single task
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    reason: '',
    priority: 'MEDIUM',
    due_date: '',
    reminder_date: '',
    project_code: '',
    estimated_hours: '',
    notification_interval_minutes: 60,
    status: 'PENDING'
  });

  // Fetch employees and tasks on mount
  useEffect(() => {
    fetchEmployees();
    fetchTasks();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.employees || response || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setNotification({ type: 'error', message: 'Failed to load employees' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await taskTrackingAPI.getTasks();
      setTasks(Array.isArray(response) ? response : response.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setNotification({ type: 'error', message: 'Failed to load tasks' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Send working confirmation to currently working employees
  const handleSendWorkingConfirmation = async () => {
    setWorkingConfirmationSending(true);
    setWorkingConfirmationMessage('');
    try {
      const res = await timesheetAPI.sendWorkingConfirmation({ currently_working_only: true });
      setWorkingConfirmationMessage(res?.message || `Sent to ${res?.sent || 0} employee(s).`);
      setNotification({ type: 'success', message: res?.message || 'Working confirmation sent!' });
      setTimeout(() => {
        setWorkingConfirmationMessage('');
        setNotification({ type: null, message: '' });
      }, 5000);
    } catch (e) {
      const errMsg = e.response?.data?.detail || 'Failed to send working confirmation.';
      setWorkingConfirmationMessage(errMsg);
      setNotification({ type: 'error', message: errMsg });
      setTimeout(() => {
        setWorkingConfirmationMessage('');
        setNotification({ type: null, message: '' });
      }, 5000);
    } finally {
      setWorkingConfirmationSending(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskListChange = (id, field, value) => {
    setTaskList(prev => prev.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const addTaskToList = () => {
    setTaskList(prev => [...prev, { 
      id: Date.now(), 
      title: '', 
      description: '', 
      reason: '', 
      reminder_date: '', 
      priority: 'MEDIUM', 
      due_date: '' 
    }]);
  };

  const removeTaskFromList = (id) => {
    setTaskList(prev => prev.filter(task => task.id !== id));
  };

  const handleEmployeeSelect = (employeeId) => {
    setFormData(prev => ({ ...prev, employee_id: employeeId }));
    const employee = employees.find(emp => emp.employee_id === parseInt(employeeId));
    setSelectedEmployee(employee);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (createMode === 'single') {
      if (!formData.employee_id || !formData.title.trim()) {
        setNotification({ type: 'error', message: 'Please select an employee and enter a task title' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
        return;
      }

      setSubmitting(true);
      try {
        const taskData = {
          employee_id: parseInt(formData.employee_id),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          reason: formData.reason.trim() || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
          reminder_date: formData.reminder_date || null,
          project_code: formData.project_code.trim() || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          notification_interval_minutes: parseInt(formData.notification_interval_minutes) || 60,
          status: formData.status
        };

        await taskTrackingAPI.createTask(taskData);
        setNotification({ type: 'success', message: 'Task created successfully!' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
        
        // Reset form
        setFormData({
          employee_id: '',
          title: '',
          description: '',
          reason: '',
          priority: 'MEDIUM',
          due_date: '',
          reminder_date: '',
          project_code: '',
          estimated_hours: '',
          notification_interval_minutes: 60,
          status: 'PENDING'
        });
        setSelectedEmployee(null);
        setIsSidebarOpen(false);
        
        // Refresh tasks list
        fetchTasks();
      } catch (error) {
        console.error('Error creating task:', error);
        setNotification({ type: 'error', message: error.response?.data?.detail || 'Failed to create task' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Multiple tasks mode
      if (!formData.employee_id) {
        setNotification({ type: 'error', message: 'Please select an employee' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
        return;
      }

      const validTasks = taskList.filter(t => t.title.trim());
      if (validTasks.length === 0) {
        setNotification({ type: 'error', message: 'Please add at least one task with a title' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
        return;
      }

      setSubmitting(true);
      try {
        const tasksData = validTasks.map(task => ({
          employee_id: parseInt(formData.employee_id),
          title: task.title.trim(),
          description: task.description.trim() || null,
          reason: task.reason.trim() || null,
          priority: task.priority,
          due_date: task.due_date || null,
          reminder_date: task.reminder_date || null,
          project_code: formData.project_code.trim() || null,
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          notification_interval_minutes: parseInt(formData.notification_interval_minutes) || 60,
          status: 'PENDING'
        }));

        await taskTrackingAPI.createTasksBulk(tasksData);
        setNotification({ type: 'success', message: `${validTasks.length} tasks created successfully!` });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
        
        // Reset form
        setFormData({
          employee_id: '',
          title: '',
          description: '',
          reason: '',
          priority: 'MEDIUM',
          due_date: '',
          reminder_date: '',
          project_code: '',
          estimated_hours: '',
          notification_interval_minutes: 60,
          status: 'PENDING'
        });
        setTaskList([{ id: Date.now(), title: '', description: '', reason: '', reminder_date: '', priority: 'MEDIUM', due_date: '' }]);
        setSelectedEmployee(null);
        setIsSidebarOpen(false);
        setCreateMode('single');
        
        // Refresh tasks list
        fetchTasks();
      } catch (error) {
        console.error('Error creating tasks:', error);
        setNotification({ type: 'error', message: error.response?.data?.detail || 'Failed to create tasks' });
        setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.task_id)));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'LOW': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isReminderDue = (reminderDate) => {
    if (!reminderDate) return false;
    const reminder = new Date(reminderDate);
    const now = new Date();
    return reminder <= now && reminder >= new Date(now.getTime() - 24 * 60 * 60 * 1000); // Within last 24 hours
  };

  // Group tasks by employee and creation time (within 2 minutes window)
  const groupTasks = (tasks) => {
    const groups = new Map();
    const processedTaskIds = new Set();
    const singleTasks = [];
    
    // Sort tasks by creation time
    const sortedTasks = [...tasks].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeA - timeB;
    });
    
    sortedTasks.forEach((task, index) => {
      if (processedTaskIds.has(task.task_id)) {
        return; // Skip already processed tasks
      }
      
      const employeeId = task.employee_id || task.user_id;
      const createdAt = new Date(task.created_at || Date.now()).getTime();
      
      // Find all tasks for the same employee created within 2 minutes (120000 ms)
      const relatedTasks = sortedTasks.filter(t => {
        if (processedTaskIds.has(t.task_id)) return false;
        const tEmployeeId = t.employee_id || t.user_id;
        const tCreatedAt = new Date(t.created_at || Date.now()).getTime();
        const timeDiff = Math.abs(tCreatedAt - createdAt);
        return tEmployeeId === employeeId && timeDiff <= 120000;
      });
      
      if (relatedTasks.length > 1) {
        // Multiple tasks - create a group
        const groupId = `${employeeId}-${createdAt}`;
        const groupTasks = relatedTasks.sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeA - timeB;
        });
        
        groups.set(groupId, {
          id: groupId,
          employee_id: employeeId,
          created_at: createdAt,
          tasks: groupTasks
        });
        
        // Mark all tasks in this group as processed
        groupTasks.forEach(t => processedTaskIds.add(t.task_id));
      } else {
        // Single task
        singleTasks.push(task);
        processedTaskIds.add(task.task_id);
      }
    });
    
    return {
      groups: Array.from(groups.values()),
      singleTasks
    };
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleEditTask = (task) => {
    const employee = employees.find(emp => emp.employee_id === task.employee_id || emp.user_id === task.user_id);
    setFormData({
      employee_id: task.employee_id ? task.employee_id.toString() : '',
      title: task.title || '',
      description: task.description || '',
      reason: task.reason || '',
      priority: task.priority || 'MEDIUM',
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
      reminder_date: task.reminder_date ? new Date(task.reminder_date).toISOString().slice(0, 16) : '',
      project_code: task.project_code || '',
      estimated_hours: task.estimated_hours || '',
      notification_interval_minutes: task.notification_interval_minutes || 60,
      status: task.status || 'PENDING'
    });
    setSelectedEmployee(employee);
    setEditingTask(task);
    setCreateMode('single');
    setIsSidebarOpen(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    
    if (!editingTask || !formData.employee_id || !formData.title.trim()) {
      setNotification({ type: 'error', message: 'Please select an employee and enter a task title' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      return;
    }

    setSubmitting(true);
    try {
      const taskData = {
        employee_id: parseInt(formData.employee_id),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        reason: formData.reason.trim() || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        reminder_date: formData.reminder_date || null,
        project_code: formData.project_code.trim() || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        notification_interval_minutes: parseInt(formData.notification_interval_minutes) || 60,
        status: formData.status
      };

      await taskTrackingAPI.updateTask(editingTask.task_id, taskData);
      setNotification({ type: 'success', message: 'Task updated successfully!' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      
      // Reset form
      setFormData({
        employee_id: '',
        title: '',
        description: '',
        reason: '',
        priority: 'MEDIUM',
        due_date: '',
        reminder_date: '',
        project_code: '',
        estimated_hours: '',
        notification_interval_minutes: 60,
        status: 'PENDING'
      });
      setSelectedEmployee(null);
      setEditingTask(null);
      setIsSidebarOpen(false);
      
      // Refresh tasks list
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      setNotification({ type: 'error', message: error.response?.data?.detail || 'Failed to update task' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      await taskTrackingAPI.deleteTask(taskId);
      setNotification({ type: 'success', message: 'Task deleted successfully!' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      
      // Refresh tasks list
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setNotification({ type: 'error', message: error.response?.data?.detail || 'Failed to delete task' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    }
  };

  const handleSyncToTimesheet = async (task) => {
    if (!window.confirm(`Sync tracked time for task "${task.title}" to timesheet?`)) {
      return;
    }

    try {
      const result = await taskTrackingAPI.syncToTimesheet(task.task_id);
      setNotification({ 
        type: 'success', 
        message: `Successfully synced ${result.entries_created || 0} time record(s) to timesheet. Total: ${result.total_hours || 0} hours` 
      });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
      // Refresh tasks to update any UI state
      fetchTasks();
    } catch (error) {
      console.error('Error syncing to timesheet:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to sync time to timesheet';
      setNotification({ 
        type: 'error', 
        message: errorMessage.includes('No time tracking') 
          ? 'No time tracking records found. Please log time on this task first before syncing.'
          : errorMessage
      });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    }
  };

  const handleLogTimeSubmit = async (e) => {
    e.preventDefault();
    if (!logTimeTask || !logTimeForm.start_time || !logTimeForm.end_time) return;
    setLogTimeSubmitting(true);
    try {
      const start = new Date(logTimeForm.start_time).toISOString();
      const end = new Date(logTimeForm.end_time).toISOString();
      await taskTrackingAPI.startTimeTracking(logTimeTask.task_id, { start_time: start, end_time: end, notes: logTimeForm.notes || null });
      setShowLogTimeModal(false);
      setLogTimeTask(null);
      setLogTimeForm({ start_time: '', end_time: '', notes: '' });
      fetchTasks();
      setNotification({ type: 'success', message: 'Time logged successfully. Use Sync to Timesheet to add it to the timesheet.' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    } catch (error) {
      console.error('Error logging time:', error);
      setNotification({ type: 'error', message: error.response?.data?.detail || 'Failed to log time' });
      setTimeout(() => setNotification({ type: null, message: '' }), 5000);
    } finally {
      setLogTimeSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Notification Banner */}
      {notification.type && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {notification.type === 'success' ? (
            <FiCheckCircle className="w-5 h-5" />
          ) : (
            <FiAlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification({ type: null, message: '' })}
            className="ml-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Task Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage tasks for employees
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Request Working Confirmation Button */}
            <button
              onClick={handleSendWorkingConfirmation}
              disabled={workingConfirmationSending}
              className="flex items-center space-x-2 px-4 py-3 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-all duration-200 disabled:opacity-50"
              title="Send notification to all currently working employees to confirm they are working"
            >
              <FiBell className="w-5 h-5" />
              <span>{workingConfirmationSending ? 'Sending...' : 'Request Working Confirmation'}</span>
            </button>
            {workingConfirmationMessage && (
              <span className="text-sm text-gray-600 dark:text-gray-400">{workingConfirmationMessage}</span>
            )}
            
            {/* Create Task Button */}
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setCreateMode('single');
                setEditingTask(null);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-[#181c52] to-indigo-600 text-white rounded-lg shadow-lg hover:from-[#2c2f70] hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
            >
              <FiPlus className="w-5 h-5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No tasks found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Create your first task to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-4 min-w-[1200px]">
            {/* Bulk Actions */}
            {selectedTasks.size > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {selectedTasks.size} task(s) selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Bulk Action
                    </button>
                    <button 
                      onClick={() => setSelectedTasks(new Set())}
                      className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table Header with Checkbox */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">Title</div>
              <div className="col-span-1">Employee</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Due Date</div>
              <div className="col-span-1">Reminder</div>
              <div className="col-span-2">Reason</div>
              <div className="col-span-1">Project</div>
              <div className="col-span-1 min-w-[120px]">Actions</div>
            </div>

            {(() => {
              const { groups, singleTasks } = groupTasks(tasks);
              
              return (
                <>
                  {/* Render grouped tasks as tree */}
                  {groups.map((group) => {
                    const employee = employees.find(emp => emp.employee_id === group.employee_id || emp.user_id === group.employee_id);
                    const isExpanded = expandedGroups.has(group.id);
                    const allGroupTasksSelected = group.tasks.every(t => selectedTasks.has(t.task_id));
                    const someGroupTasksSelected = group.tasks.some(t => selectedTasks.has(t.task_id));
                    
                    return (
                      <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <div 
                          className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="flex items-center space-x-2">
                                {isExpanded ? (
                                  <FiChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <FiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                )}
                                <input
                                  type="checkbox"
                                  checked={allGroupTasksSelected}
                                  ref={(input) => {
                                    if (input) {
                                      input.indeterminate = someGroupTasksSelected && !allGroupTasksSelected;
                                    }
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (allGroupTasksSelected) {
                                      group.tasks.forEach(t => {
                                        setSelectedTasks(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(t.task_id);
                                          return newSet;
                                        });
                                      });
                                    } else {
                                      group.tasks.forEach(t => {
                                        setSelectedTasks(prev => new Set(prev).add(t.task_id));
                                      });
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <FiUser className="w-4 h-4 text-gray-500" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee'}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  ({group.tasks.length} task{group.tasks.length > 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(new Date(group.created_at).toISOString())}
                            </div>
                          </div>
                        </div>
                        
                        {/* Group Tasks (collapsible) */}
                        {isExpanded && (
                          <div className="bg-white dark:bg-gray-800">
                            {group.tasks.map((task, index) => {
                              const taskEmployee = employees.find(emp => emp.employee_id === task.employee_id || emp.user_id === task.user_id);
                              const hasReminder = task.reminder_date && isReminderDue(task.reminder_date);
                              
                              return (
                                <div
                                  key={task.task_id}
                                  className={`grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                    hasReminder ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-l-yellow-500' : ''
                                  } ${index === group.tasks.length - 1 ? 'border-b-0' : ''}`}
                                  style={{ paddingLeft: '3rem' }}
                                >
                                  {/* Checkbox */}
                                  <div className="col-span-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedTasks.has(task.task_id)}
                                      onChange={() => handleTaskSelect(task.task_id)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  
                                  {/* Title */}
                                  <div className="col-span-2">
                                    <div className="font-semibold text-gray-900 dark:text-white">{task.title}</div>
                                    {task.description && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                        {task.description.substring(0, 50)}...
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Employee */}
                                  <div className="col-span-1">
                                    {taskEmployee ? (
                                      <div className="flex items-center space-x-1 text-sm">
                                        <FiUser className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{taskEmployee.first_name} {taskEmployee.last_name}</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Priority */}
                                  <div className="col-span-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                  
                                  {/* Status */}
                                  <div className="col-span-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                      {task.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  
                                  {/* Due Date */}
                                  <div className="col-span-1">
                                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                      <FiCalendar className="w-4 h-4" />
                                      <span>{formatDate(task.due_date)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Reminder */}
                                  <div className="col-span-1">
                                    {task.reminder_date ? (
                                      <div className={`flex items-center space-x-1 text-sm ${hasReminder ? 'text-yellow-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                        <FiBell className={`w-4 h-4 ${hasReminder ? 'animate-pulse' : ''}`} />
                                        <span>{formatDate(task.reminder_date)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Reason */}
                                  <div className="col-span-2">
                                    {task.reason ? (
                                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={task.reason}>
                                        {task.reason}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Project */}
                                  <div className="col-span-1">
                                    {task.project_code ? (
                                      <span className="text-sm text-gray-600 dark:text-gray-400">{task.project_code}</span>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="col-span-1 min-w-[120px]">
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <button
                                        onClick={() => setViewingTask(task)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View Task"
                                      >
                                        <FiEye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleEditTask(task)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Edit Task"
                                      >
                                        <FiEdit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => { setLogTimeTask(task); setLogTimeForm({ start_time: '', end_time: '', notes: '' }); setShowLogTimeModal(true); }}
                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                        title="Log time"
                                      >
                                        <FiClock className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleSyncToTimesheet(task)}
                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                        title="Sync Time to Timesheet"
                                      >
                                        <FiClock className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(task.task_id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Task"
                                      >
                                        <FiTrash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Render single tasks separately */}
                  {singleTasks.map((task) => {
              const employee = employees.find(emp => emp.employee_id === task.employee_id || emp.user_id === task.user_id);
              const hasReminder = task.reminder_date && isReminderDue(task.reminder_date);
              
              return (
                <div
                  key={task.task_id}
                  className={`grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    hasReminder ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-l-yellow-500' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.task_id)}
                      onChange={() => handleTaskSelect(task.task_id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Title */}
                  <div className="col-span-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {task.description.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Employee */}
                  <div className="col-span-1">
                    {employee ? (
                      <div className="flex items-center space-x-1 text-sm">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{employee.first_name} {employee.last_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                  
                  {/* Priority */}
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  {/* Status */}
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {/* Due Date */}
                  <div className="col-span-1">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <FiCalendar className="w-4 h-4" />
                      <span>{formatDate(task.due_date)}</span>
                    </div>
                  </div>
                  
                  {/* Reminder */}
                  <div className="col-span-1">
                    {task.reminder_date ? (
                      <div className={`flex items-center space-x-1 text-sm ${hasReminder ? 'text-yellow-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                        <FiBell className={`w-4 h-4 ${hasReminder ? 'animate-pulse' : ''}`} />
                        <span>{formatDate(task.reminder_date)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                  
                  {/* Reason */}
                  <div className="col-span-2">
                    {task.reason ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={task.reason}>
                        {task.reason}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                  
                  {/* Project */}
                  <div className="col-span-1">
                    {task.project_code ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">{task.project_code}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1 min-w-[120px]">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <button
                        onClick={() => setViewingTask(task)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Task"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setLogTimeTask(task); setLogTimeForm({ start_time: '', end_time: '', notes: '' }); setShowLogTimeModal(true); }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Log time"
                      >
                        <FiClock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSyncToTimesheet(task)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Sync Time to Timesheet"
                      >
                        <FiClock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
                  })}
                </>
              );
            })()}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Task Sidebar */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingTask ? 'Edit Task' : createMode === 'multiple' ? 'Create Multiple Tasks' : 'Create New Task'}
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Mode Toggle */}
              {!editingTask && (
                <div className="mb-6 flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <button
                    onClick={() => setCreateMode('single')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      createMode === 'single'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Single Task
                  </button>
                  <button
                    onClick={() => setCreateMode('multiple')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      createMode === 'multiple'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Multiple Tasks
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={editingTask ? handleUpdateTask : handleSubmit} className="space-y-6">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiUser className="inline w-4 h-4 mr-2" />
                    Assign To Employee *
                  </label>
                  <select
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((employee) => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.first_name} {employee.last_name} - {employee.email}
                        {employee.department && ` (${employee.department})`}
                      </option>
                    ))}
                  </select>
                  {selectedEmployee && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Selected:</strong> {selectedEmployee.first_name} {selectedEmployee.last_name}
                        {selectedEmployee.department && ` • ${selectedEmployee.department}`}
                      </p>
                    </div>
                  )}
                </div>

                {createMode === 'single' ? (
                  <>
                    {/* Task Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiTarget className="inline w-4 h-4 mr-2" />
                        Task Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter task title..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FiFileText className="inline w-4 h-4 mr-2" />
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Enter task description..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason
                      </label>
                      <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="Enter reason for this task..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    {/* Priority and Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiFlag className="inline w-4 h-4 mr-2" />
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>

                      {editingTask && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Due Date and Reminder */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiCalendar className="inline w-4 h-4 mr-2" />
                          Due Date
                        </label>
                        <input
                          type="datetime-local"
                          name="due_date"
                          value={formData.due_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiBell className="inline w-4 h-4 mr-2" />
                          Reminder Date
                        </label>
                        <input
                          type="datetime-local"
                          name="reminder_date"
                          value={formData.reminder_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Project Code and Estimated Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiFileText className="inline w-4 h-4 mr-2" />
                          Project Code
                        </label>
                        <input
                          type="text"
                          name="project_code"
                          value={formData.project_code}
                          onChange={handleInputChange}
                          placeholder="e.g., PROJ-001"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiClock className="inline w-4 h-4 mr-2" />
                          Estimated Hours
                        </label>
                        <input
                          type="number"
                          name="estimated_hours"
                          value={formData.estimated_hours}
                          onChange={handleInputChange}
                          min="0"
                          step="0.5"
                          placeholder="e.g., 8.5"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Multiple Tasks List */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          <FiList className="inline w-4 h-4 mr-2" />
                          Tasks List
                        </label>
                        <button
                          type="button"
                          onClick={addTaskToList}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FiPlus className="w-4 h-4 inline mr-1" />
                          Add Task
                        </button>
                      </div>
                      
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {taskList.map((task, index) => (
                          <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task {index + 1}</span>
                              {taskList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTaskFromList(task.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Task title *"
                                value={task.title}
                                onChange={(e) => handleTaskListChange(task.id, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                              <textarea
                                placeholder="Description"
                                value={task.description}
                                onChange={(e) => handleTaskListChange(task.id, 'description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                              />
                              <textarea
                                placeholder="Reason"
                                value={task.reason}
                                onChange={(e) => handleTaskListChange(task.id, 'reason', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <select
                                  value={task.priority}
                                  onChange={(e) => handleTaskListChange(task.id, 'priority', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="LOW">Low</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HIGH">High</option>
                                </select>
                                <input
                                  type="datetime-local"
                                  placeholder="Due Date"
                                  value={task.due_date}
                                  onChange={(e) => handleTaskListChange(task.id, 'due_date', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <input
                                  type="datetime-local"
                                  placeholder="Reminder"
                                  value={task.reminder_date}
                                  onChange={(e) => handleTaskListChange(task.id, 'reminder_date', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shared fields for multiple tasks */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiFileText className="inline w-4 h-4 mr-2" />
                          Project Code (for all tasks)
                        </label>
                        <input
                          type="text"
                          name="project_code"
                          value={formData.project_code}
                          onChange={handleInputChange}
                          placeholder="e.g., PROJ-001"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FiClock className="inline w-4 h-4 mr-2" />
                          Estimated Hours (for all tasks)
                        </label>
                        <input
                          type="number"
                          name="estimated_hours"
                          value={formData.estimated_hours}
                          onChange={handleInputChange}
                          min="0"
                          step="0.5"
                          placeholder="e.g., 8.5"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Notification Interval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiBell className="inline w-4 h-4 mr-2" />
                    Notification Interval (minutes)
                  </label>
                  <input
                    type="number"
                    name="notification_interval_minutes"
                    value={formData.notification_interval_minutes}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="60"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    How often to send status update reminders (default: 60 minutes)
                  </p>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>{editingTask ? 'Updating...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-5 h-5" />
                        <span>{editingTask ? 'Update Task' : createMode === 'multiple' ? `Create ${taskList.filter(t => t.title.trim()).length} Tasks` : 'Create Task'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setEditingTask(null);
                      setFormData({
                        employee_id: '',
                        title: '',
                        description: '',
                        reason: '',
                        priority: 'MEDIUM',
                        due_date: '',
                        reminder_date: '',
                        project_code: '',
                        estimated_hours: '',
                        notification_interval_minutes: 60,
                        status: 'PENDING'
                      });
                      setTaskList([{ id: Date.now(), title: '', description: '', reason: '', reminder_date: '', priority: 'MEDIUM', due_date: '' }]);
                      setSelectedEmployee(null);
                      setCreateMode('single');
                    }}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewingTask(null)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Task Details
                  </h2>
                  <button
                    onClick={() => setViewingTask(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FiX className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Task Content */}
                {(() => {
                  const employee = employees.find(emp => emp.employee_id === viewingTask.employee_id || emp.user_id === viewingTask.user_id);
                  return (
                    <div className="space-y-6">
                      {/* Title and Status */}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          {viewingTask.title}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(viewingTask.priority)}`}>
                            {viewingTask.priority}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingTask.status)}`}>
                            {viewingTask.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {viewingTask.description && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                          <p className="text-gray-600 dark:text-gray-400">{viewingTask.description}</p>
                        </div>
                      )}

                      {/* Reason */}
                      {viewingTask.reason && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason</h4>
                          <p className="text-gray-600 dark:text-gray-400">{viewingTask.reason}</p>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {employee && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</h4>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <FiUser className="w-4 h-4" />
                              <span>{employee.first_name} {employee.last_name}</span>
                            </div>
                          </div>
                        )}
                        {viewingTask.due_date && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</h4>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <FiCalendar className="w-4 h-4" />
                              <span>{formatDate(viewingTask.due_date)}</span>
                            </div>
                          </div>
                        )}
                        {viewingTask.reminder_date && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder</h4>
                            <div className={`flex items-center space-x-2 ${isReminderDue(viewingTask.reminder_date) ? 'text-yellow-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                              <FiBell className={`w-4 h-4 ${isReminderDue(viewingTask.reminder_date) ? 'animate-pulse' : ''}`} />
                              <span>{formatDate(viewingTask.reminder_date)}</span>
                            </div>
                          </div>
                        )}
                        {viewingTask.estimated_hours && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Hours</h4>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <FiClock className="w-4 h-4" />
                              <span>{viewingTask.estimated_hours}h</span>
                            </div>
                          </div>
                        )}
                        {viewingTask.project_code && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Code</h4>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <FiFileText className="w-4 h-4" />
                              <span>{viewingTask.project_code}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            setViewingTask(null);
                            handleEditTask(viewingTask);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FiEdit className="w-4 h-4" />
                          <span>Edit Task</span>
                        </button>
                        <button
                          onClick={() => setViewingTask(null)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Log time Modal */}
      {showLogTimeModal && logTimeTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log time: {logTimeTask.title}</h3>
            <form onSubmit={handleLogTimeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                <input
                  type="datetime-local"
                  required
                  value={logTimeForm.start_time}
                  onChange={(e) => setLogTimeForm(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                <input
                  type="datetime-local"
                  required
                  value={logTimeForm.end_time}
                  onChange={(e) => setLogTimeForm(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={logTimeForm.notes}
                  onChange={(e) => setLogTimeForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowLogTimeModal(false); setLogTimeTask(null); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logTimeSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {logTimeSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
