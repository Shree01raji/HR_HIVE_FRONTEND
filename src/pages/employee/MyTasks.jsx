import React, { useState, useEffect } from 'react';
import { taskTrackingAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoTaskTracking } from '../../hooks/useAutoTaskTracking';
import { 
  FiCheckCircle, 
  FiClock, 
  FiCalendar, 
  FiFlag, 
  FiFileText, 
  FiTarget,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiPlay,
  FiZap,
  FiPlus,
  FiUpload
} from 'react-icons/fi';
import { documentsAPI } from '../../services/api';
import TaskStatusUpdateModal from '../../components/TaskStatusUpdateModal';

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logTimeForm, setLogTimeForm] = useState({ start_time: '', end_time: '', notes: '' });
  const [syncingTaskId, setSyncingTaskId] = useState(null);
  const [logTimeSubmitting, setLogTimeSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeTaskLoading, setActiveTaskLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addFile, setAddFile] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Enable automatic task tracking
  const { setActiveTask, clearActiveTask, getActiveTask } = useAutoTaskTracking(true);

  useEffect(() => {
    if (user?.employee_id) {
      fetchMyTasks();
      loadActiveTask();
    }
  }, [user, statusFilter]);

  // Load active task on mount
  const loadActiveTask = async () => {
    try {
      const activeTask = await getActiveTask();
      if (activeTask?.active_task_id) {
        setActiveTaskId(activeTask.active_task_id);
      }
    } catch (err) {
      console.error('Error loading active task:', err);
    }
  };

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tasks filtered by current employee
      const response = await taskTrackingAPI.getTasks(user.employee_id, statusFilter === 'ALL' ? null : statusFilter);
      setTasks(Array.isArray(response) ? response : response.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    await fetchMyTasks();
    setShowStatusModal(false);
    setSelectedTask(null);
  };

  const handleLogTimeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask || !logTimeForm.start_time || !logTimeForm.end_time) return;
    setLogTimeSubmitting(true);
    try {
      const start = new Date(logTimeForm.start_time).toISOString();
      const end = new Date(logTimeForm.end_time).toISOString();
      await taskTrackingAPI.startTimeTracking(selectedTask.task_id, { start_time: start, end_time: end, notes: logTimeForm.notes || null });
      setShowLogTimeModal(false);
      setSelectedTask(null);
      setLogTimeForm({ start_time: '', end_time: '', notes: '' });
      await fetchMyTasks();
    } catch (err) {
      console.error('Error logging time:', err);
      setError(err.response?.data?.detail || 'Failed to log time');
    } finally {
      setLogTimeSubmitting(false);
    }
  };

  const handleSyncToTimesheet = async (task) => {
    setSyncingTaskId(task.task_id);
    try {
      const result = await taskTrackingAPI.syncToTimesheet(task.task_id);
      setError(null);
      await fetchMyTasks();
      alert(`Synced ${result.entries_created || 0} time record(s) to timesheet. Total: ${result.total_hours || 0} hours.`);
    } catch (err) {
      console.error('Error syncing to timesheet:', err);
      setError(err.response?.data?.detail || 'Failed to sync to timesheet. Log time on this task first.');
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Handle automatic task tracking (no buttons needed!)
  const handleStartTracking = async (taskId) => {
    setActiveTaskLoading(true);
    try {
      const targetTask = tasks.find(t => t.task_id === taskId);

      // Accept task first by moving it to IN_PROGRESS before tracking.
      if (targetTask && targetTask.status === 'PENDING') {
        await taskTrackingAPI.updateTaskStatus(taskId, { status: 'IN_PROGRESS' });
        setTasks((prev) => prev.map((t) => (
          t.task_id === taskId ? { ...t, status: 'IN_PROGRESS' } : t
        )));
      }

      await setActiveTask(taskId);
      setActiveTaskId(taskId);
      setError(null);
      // Show success message
      if (targetTask) {
        alert(`✅ Task accepted and automatic time tracking started for "${targetTask.title}"\n\nTime will be tracked automatically based on your activity.`);
      }
    } catch (err) {
      console.error('Error starting task tracking:', err);
      setError(err.response?.data?.detail || 'Failed to accept task and start automatic tracking');
    } finally {
      setActiveTaskLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'LOW':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'IN_PROGRESS':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'ALL') return true;
    return task.status === statusFilter;
  });

  const taskCounts = {
    ALL: tasks.length,
    PENDING: tasks.filter(t => t.status === 'PENDING').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your assigned tasks
            {activeTaskId && (
              <span className="ml-2 inline-flex items-center space-x-1 text-green-600 dark:text-green-400">
                <FiZap className="w-4 h-4" />
                <span className="text-sm font-medium">Automatic tracking active</span>
              </span>
            )}
          </p>
        </div>
        {/* <button
          onClick={fetchMyTasks}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button> */}
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-3 flex items-center space-x-2 px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {status.replace('_', ' ')} ({taskCounts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
          <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {statusFilter === 'ALL' ? 'No tasks assigned' : `No ${statusFilter.replace('_', ' ').toLowerCase()} tasks`}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Tasks assigned to you will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => (
              <div
                key={task.task_id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.title}
                      </h3>
                      {activeTaskId === task.task_id && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Auto-Tracking</span>
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date && (
                        <div className="flex items-center space-x-1">
                          <FiCalendar className="w-4 h-4" />
                          <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                      )}
                      {task.estimated_hours && (
                        <div className="flex items-center space-x-1">
                          <FiClock className="w-4 h-4" />
                          <span>{task.estimated_hours}h estimated</span>
                        </div>
                      )}
                      {task.project_code && (
                        <div className="flex items-center space-x-1">
                          <FiFileText className="w-4 h-4" />
                          <span>{task.project_code}</span>
                        </div>
                      )}
                      {task.created_at && (
                        <div className="flex items-center space-x-1">
                          <FiCalendar className="w-4 h-4" />
                          <span>Assigned: {formatDate(task.created_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-wrap items-center gap-2">
                    {/* Active Task Indicator */}
                    {/* {activeTaskId === task.task_id && (
                      <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center space-x-2 text-sm font-medium border border-green-300 dark:border-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Tracking Automatically</span>
                      </div>
                    )} */}
                    
                    {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <FiCheckCircle className="w-4 h-4" />
                        <span>Update Status</span>
                      </button>
                    )}
                    
                    {/* Automatic Tracking Button (Primary) */}
                    {activeTaskId === task.task_id ? (
                      <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center space-x-2 border border-blue-300 dark:border-blue-700">
                        <FiZap className="w-4 h-4" />
                        <span>In Progress</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartTracking(task.task_id)}
                        disabled={activeTaskLoading || activeTaskId !== null}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={activeTaskId !== null ? "Stop current task tracking first" : "Accept task and start automatic time tracking"}
                      >
                        <FiPlay className="w-4 h-4" />
                        <span>{activeTaskLoading ? 'Accepting…' : 'Accept'}</span>
                      </button>
                    )}
                    
                    {/* Manual Time Entry (Fallback) */}
                    {/* <button
                      onClick={() => {
                        setSelectedTask(task);
                        setLogTimeForm({ start_time: '', end_time: '', notes: '' });
                        setShowLogTimeModal(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                      title="Manual time entry (if you forgot to start tracking)"
                    >
                      <FiClock className="w-4 h-4" />
                      <span>Log Time</span>
                    </button> */}
                    
                    {/* <button
                      onClick={() => handleSyncToTimesheet(task)}
                      disabled={syncingTaskId === task.task_id}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <FiClock className="w-4 h-4" />
                      <span>{syncingTaskId === task.task_id ? 'Syncing…' : 'Sync to Timesheet'}</span>
                    </button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedTask && (
        <TaskStatusUpdateModal
          task={selectedTask}
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedTask(null);
          }}
          onUpdate={handleStatusUpdate}
        />
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Task / Upload Evidence</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700"><FiX /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input value={addTitle} onChange={e => setAddTitle(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                <textarea value={addDescription} onChange={e => setAddDescription(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload file (optional)</label>
                <input type="file" onChange={e => setAddFile(e.target.files?.[0] || null)} className="mt-1" />
                {addFile && <div className="text-sm text-gray-600 mt-1">{addFile.name}</div>}
              </div>

              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 border rounded" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>Cancel</button>
                <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={async () => {
                  if (!addTitle) { alert('Please add a title'); return; }
                  setAddSubmitting(true);
                  try {
                    let uploaded = null;
                    if (addFile) {
                      const form = new FormData();
                      form.append('file', addFile);
                      uploaded = await documentsAPI.uploadDocument(form);
                    }

                    const payload = {
                      title: addTitle,
                      description: addDescription || null,
                      attachments: uploaded ? [uploaded.id || uploaded.document_id || uploaded.file_id || uploaded.uid || uploaded.uuid] : undefined
                    };

                    await taskTrackingAPI.createTask(payload);
                    // refresh
                    await fetchMyTasks();
                    setShowAddModal(false);
                    setAddTitle(''); setAddDescription(''); setAddFile(null);
                    alert('Task created successfully');
                  } catch (err) {
                    console.error('Error creating task:', err);
                    alert('Failed to create task');
                  } finally {
                    setAddSubmitting(false);
                  }
                }} disabled={addSubmitting}>
                  {addSubmitting ? 'Submitting…' : (<><FiUpload className="inline mr-2" /> Submit</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log time Modal */}
      {showLogTimeModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log time: {selectedTask.title}</h3>
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
                  onClick={() => { setShowLogTimeModal(false); setSelectedTask(null); }}
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

