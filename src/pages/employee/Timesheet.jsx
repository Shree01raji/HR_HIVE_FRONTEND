import React, { useState, useEffect } from 'react';
import { timesheetAPI, projectsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ActivityTrackerInstaller from '../../components/ActivityTrackerInstaller';
import DoorAccessLogs from '../../components/DoorAccessLogs';
import { 
  formatToLocalTime, 
  formatToLocalDateTime, 
  formatToLocalDate, 
  getTimeAgo,
  getUserTimezone,
  formatDuration,
  formatDurationShort
} from '../../utils/timezone';
import WorkflowEmbed from '../../components/workflow/WorkflowEmbed';
import { 
  FiClock, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiCheck, 
  FiX,
  FiCalendar,
  FiTrendingUp,
  FiFileText
} from 'react-icons/fi';

export default function Timesheet() {
  const [entries, setEntries] = useState([]);
  const [autoEntries, setAutoEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [todayHours, setTodayHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    break_duration: 0,
    project_code: '',
    description: ''
  });
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: ''
  });
  const [activeTab, setActiveTab] = useState('auto'); // 'auto', 'manual', or 'door-access'
  const [projects, setProjects] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchTimesheetData();
  }, [dateFilter]);

  useEffect(() => {
    // Only fetch projects if user is authenticated and organization is set
    const token = localStorage.getItem('token');
    const orgSlug = localStorage.getItem('selectedOrganization');
    
    if (!token || !orgSlug) {
      console.log('[Timesheet] Skipping projects fetch - no auth token or organization');
      setProjects([]);
      return;
    }
    
    // Fetch projects with better error handling
    projectsAPI.getList()
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          setProjects([]);
        }
      })
      .catch((error) => {
        // Silently handle 404 or other errors - projects are optional
        if (error.response?.status === 404) {
          console.log('[Timesheet] Projects endpoint not available (404) - this is okay');
        } else if (error.response?.status === 401) {
          console.log('[Timesheet] Not authenticated for projects - skipping');
        } else {
          console.log('[Timesheet] Error fetching projects:', error.message);
        }
        setProjects([]);
      });
  }, []);

  const fetchTimesheetData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [entriesData, autoEntriesData, summaryData, currentSessionData, todayHoursData] = await Promise.all([
        timesheetAPI.getMyEntries(dateFilter.start_date || null, dateFilter.end_date || null),
        timesheetAPI.getAutoEntries(dateFilter.start_date || null, dateFilter.end_date || null),
        timesheetAPI.getSummary(dateFilter.start_date || null, dateFilter.end_date || null),
        timesheetAPI.getCurrentSession(),
        timesheetAPI.getTodayHours()
      ]);
      
      setEntries(entriesData);
      setAutoEntries(autoEntriesData);
      setSummary(summaryData);
      setCurrentSession(currentSessionData);
      setTodayHours(todayHoursData);
    } catch (err) {
      console.error('Error fetching timesheet data:', err);
      setError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const entryData = {
        ...formData,
        date: new Date(formData.date).toISOString().split('T')[0],
        start_time: new Date(`${formData.date}T${formData.start_time}`).toISOString(),
        end_time: formData.end_time ? new Date(`${formData.date}T${formData.end_time}`).toISOString() : null
      };

      // Check if there's already a submitted/approved timesheet for this date (only for new entries)
      if (!editingEntry) {
        const entryDate = entryData.date;
        const existingSubmitted = entries.find(entry => {
          const entryDateStr = new Date(entry.date).toISOString().split('T')[0];
          return entryDateStr === entryDate && 
                 (entry.status === 'SUBMITTED' || entry.status === 'APPROVED');
        });
        
        if (existingSubmitted) {
          const dateStr = new Date(entryDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          setError(`A timesheet for ${dateStr} has already been submitted. Only one timesheet per day is allowed.`);
          return;
        }
      }

      if (editingEntry) {
        await timesheetAPI.updateEntry(editingEntry.entry_id, entryData);
      } else {
        // Use manual entry endpoint for new entries
        await timesheetAPI.createManualEntry(entryData);
      }
      
      setShowModal(false);
      setEditingEntry(null);
      setFormData({
        date: '',
        start_time: '',
        end_time: '',
        break_duration: 0,
        project_code: '',
        description: ''
      });
      setError(null);
      fetchTimesheetData();
    } catch (err) {
      console.error('Error saving timesheet entry:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save timesheet entry';
      setError(errorMessage);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      start_time: new Date(entry.start_time).toTimeString().slice(0, 5),
      end_time: entry.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : '',
      break_duration: entry.break_duration,
      project_code: entry.project_code || '',
      description: entry.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      try {
        await timesheetAPI.deleteEntry(entryId);
        fetchTimesheetData();
      } catch (err) {
        console.error('Error deleting timesheet entry:', err);
        setError('Failed to delete timesheet entry');
      }
    }
  };

  const handleSubmitEntry = async (entryId) => {
    try {
      // Find the entry to check its date
      const entry = entries.find(e => e.entry_id === entryId);
      if (entry) {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        // Check if there's already a submitted/approved timesheet for this date
        const existingSubmitted = entries.find(e => {
          const eDate = new Date(e.date).toISOString().split('T')[0];
          return eDate === entryDate && 
                 e.entry_id !== entryId &&
                 (e.status === 'SUBMITTED' || e.status === 'APPROVED');
        });
        
        if (existingSubmitted) {
          const dateStr = new Date(entry.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          setError(`A timesheet for ${dateStr} has already been submitted. Only one timesheet per day is allowed.`);
          return;
        }
      }
      
      await timesheetAPI.submitEntry(entryId);
      setError(null);
      fetchTimesheetData();
    } catch (err) {
      console.error('Error submitting timesheet entry:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to submit timesheet entry';
      setError(errorMessage);
    }
  };

  const handleConfirmAutoEntry = async (entryId) => {
    try {
      // Find the entry to check if it's the last logout
      const entry = autoEntries.find(e => e.entry_id === entryId);
      if (entry && entry.end_time) {
        // Check if this is the last logout entry (most recent end_time for today)
        const today = new Date(entry.date).toISOString().split('T')[0];
        const todayEntries = autoEntries.filter(e => {
          const eDate = new Date(e.date).toISOString().split('T')[0];
          return eDate === today && e.end_time;
        });
        
        if (todayEntries.length > 0) {
          const sortedEntries = todayEntries.sort((a, b) => 
            new Date(b.end_time) - new Date(a.end_time)
          );
          
          if (sortedEntries[0].entry_id !== entryId) {
            setError('Only the last logout\'s timesheet entry can be submitted. Please submit the most recent logout entry.');
            return;
          }
        }
      }
      
      await timesheetAPI.confirmAutoEntry(entryId);
      setError(null);
      fetchTimesheetData();
    } catch (err) {
      console.error('Error confirming auto entry:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to confirm auto entry';
      setError(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case 'SUBMITTED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'APPROVED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'REJECTED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Use timezone utility functions
  const formatDate = formatToLocalDate;
  const formatTime = formatToLocalTime;
  const formatDateTime = formatToLocalDateTime;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading timesheet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Activity Tracker Status */}
      <ActivityTrackerInstaller />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Timesheet</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your work hours and submit for approval
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              (Times shown in {getUserTimezone()})
            </span>
          </p>
        </div>
        {/* Hide Add Entry button - employees should only submit auto-generated entries */}
        {/* <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Entry</span>
        </button> */}
      </div>

      {/* Current Session Status */}
      {currentSession && currentSession.active && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Currently Working</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Started at {formatTime(currentSession.login_time)} • 
                  Duration: {formatDuration(currentSession.current_duration_hours)}
                </p>
              </div>
            </div>
            {todayHours && (
              <div className="text-right">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Today: {formatDuration(todayHours.total_hours_today)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Completed: {formatDuration(todayHours.completed_hours)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'auto'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Auto Tracked ({autoEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'manual'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Manual Entries
        </button>
        <button
          onClick={() => setActiveTab('door-access')}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'door-access'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Door Access Logs
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <FiClock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total Hours</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{summary.total_hours.toFixed(1)}h</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <FiFileText className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total Entries</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{summary.total_entries}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <FiCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Approved</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{summary.approved_entries}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <FiTrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{summary.pending_entries}</p>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-700 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FiCalendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by date:</span>
          </div>
          <input
            type="date"
            value={dateFilter.start_date}
            onChange={(e) => setDateFilter({...dateFilter, start_date: e.target.value})}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateFilter.end_date}
            onChange={(e) => setDateFilter({...dateFilter, end_date: e.target.value})}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => setDateFilter({start_date: '', end_date: ''})}
            className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Timesheet Entries */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-auto">
          <div className="p-4">
            {activeTab === 'door-access' ? (
              // Door Access Logs
              <DoorAccessLogs />
            ) : activeTab === 'auto' ? (
              // Auto Entries
              autoEntries.length === 0 ? (
                <div className="text-center py-8">
                  <FiClock className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No auto-tracked entries found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Auto-tracking starts when you log in</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Filter to show only entries with logout (end_time) and get the last logout for today
                    const today = new Date().toISOString().split('T')[0];
                    const entriesWithLogout = autoEntries.filter(e => e.end_time);
                    const todayEntries = entriesWithLogout.filter(e => {
                      const eDate = new Date(e.date).toISOString().split('T')[0];
                      return eDate === today;
                    });
                    
                    // Get the last logout entry (most recent end_time)
                    let lastLogoutEntry = null;
                    if (todayEntries.length > 0) {
                      const sorted = todayEntries.sort((a, b) => 
                        new Date(b.end_time) - new Date(a.end_time)
                      );
                      lastLogoutEntry = sorted[0];
                    }
                    
                    // Show all entries, but highlight the last logout entry
                    return autoEntries.map((entry) => {
                      const isLastLogout = lastLogoutEntry && entry.entry_id === lastLogoutEntry.entry_id;
                      const canSubmit = isLastLogout && entry.end_time && entry.status === 'AUTO_GENERATED';
                      const isSubmitted = entry.status === 'CONFIRMED' || entries.some(e => 
                        new Date(e.date).toISOString().split('T')[0] === new Date(entry.date).toISOString().split('T')[0] &&
                        (e.status === 'SUBMITTED' || e.status === 'APPROVED')
                      );
                      
                      return (
                        <div 
                          key={entry.entry_id} 
                          className={`border rounded-lg p-3 ${
                            isLastLogout 
                              ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50'
                          }`}
                        >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">{formatDate(entry.date)}</span>
                                {isLastLogout && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                    Last Logout
                                  </span>
                                )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entry.status === 'AUTO_GENERATED' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              entry.status === 'CONFIRMED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                              'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
                            }`}>
                              {entry.status === 'AUTO_GENERATED' ? 'Auto-Generated' : entry.status}
                            </span>
                                {isSubmitted && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    Submitted
                                  </span>
                                )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>Start: {formatTime(entry.start_time)}</span>
                              {entry.end_time ? (
                                <span>Logout: {formatTime(entry.end_time)}</span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400 font-medium">Ongoing</span>
                              )}
                              {entry.total_hours && entry.total_hours > 0 && (
                                <span className="font-medium text-gray-900 dark:text-white">{formatDuration(entry.total_hours)}</span>
                              )}
                            </div>
                                {isLastLogout && canSubmit && !isSubmitted && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    ✓ This is your last logout entry. Click "Submit" to submit for approval.
                                  </p>
                                )}
                              </div>
                            </div>
                            {canSubmit && !isSubmitted && (
                              <button
                                onClick={() => handleConfirmAutoEntry(entry.entry_id)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                title="Submit this timesheet entry"
                              >
                                Submit
                              </button>
                            )}
                            {isSubmitted && (
                              <span className="px-3 py-1 text-sm text-green-600 dark:text-green-400 font-medium">
                                ✓ Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )
            ) : (
              // Manual Entries
              entries.length === 0 ? (
                <div className="text-center py-8">
                  <FiClock className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No manual timesheet entries found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Click "Add Entry" to start tracking your time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.entry_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-700/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">{formatDate(entry.date)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)} dark:bg-opacity-20`}>
                              {entry.status}
                            </span>
                            {entry.project_code && (
                              <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {entry.project_code}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span>Start: {formatTime(entry.start_time)}</span>
                              {entry.end_time && <span>End: {formatTime(entry.end_time)}</span>}
                              <span className="font-medium text-gray-900 dark:text-white">{formatDuration(entry.total_hours)}</span>
                            </div>
                            {entry.description && (
                              <p className="text-gray-700 dark:text-gray-300">{entry.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {entry.status === 'DRAFT' && (() => {
                            const entryDate = new Date(entry.date).toISOString().split('T')[0];
                            const hasExistingSubmitted = entries.some(e => {
                              const eDate = new Date(e.date).toISOString().split('T')[0];
                              return eDate === entryDate && 
                                     e.entry_id !== entry.entry_id &&
                                     (e.status === 'SUBMITTED' || e.status === 'APPROVED');
                            });
                            
                            return (
                            <button
                              onClick={() => handleSubmitEntry(entry.entry_id)}
                                disabled={hasExistingSubmitted}
                                className={`p-1 ${
                                  hasExistingSubmitted 
                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                                    : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                                }`}
                                title={hasExistingSubmitted 
                                  ? "A timesheet for this date has already been submitted" 
                                  : "Submit for approval"}
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                            );
                          })()}
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Edit entry"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.entry_id)}
                            className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Delete entry"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                        </div>
                        <div className="ml-3">
                          <WorkflowEmbed resourceType="timesheet" resourceId={entry.entry_id} compact={true} />
                        </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white">
                {editingEntry ? 'Edit Timesheet Entry' : 'Add Timesheet Entry'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEntry(null);
                  setFormData({
                    date: '',
                    start_time: '',
                    end_time: '',
                    break_duration: 0,
                    project_code: '',
                    description: ''
                  });
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.break_duration}
                  onChange={(e) => setFormData({...formData, break_duration: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={projects.some(p => p.code === formData.project_code) ? formData.project_code : '__other__'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData(prev => ({ ...prev, project_code: v === '__other__' ? '' : v }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">— None —</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.code}>{p.code} – {p.name}</option>
                  ))}
                  <option value="__other__">Other (enter below)</option>
                </select>
                {(projects.some(p => p.code === formData.project_code) ? formData.project_code : '__other__') === '__other__' && (
                  <input
                    type="text"
                    value={formData.project_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_code: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 mt-2"
                    placeholder="e.g., PROJ-001"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows="3"
                  placeholder="Describe your work..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEntry(null);
                    setFormData({
                      date: '',
                      start_time: '',
                      end_time: '',
                      break_duration: 0,
                      project_code: '',
                      description: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingEntry ? 'Update' : 'Add'} Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
