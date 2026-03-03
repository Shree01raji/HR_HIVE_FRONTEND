import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../../services/api';
import { 
  formatToLocalTime, 
  formatToLocalDateTime, 
  formatToLocalDate, 
  getTimeAgo,
  getUserTimezone,
  formatDuration,
  formatDurationShort
} from '../../utils/timezone';
import { 
  FiClock, 
  FiUsers, 
  FiTrendingUp, 
  FiCalendar,
  FiFilter,
  FiEye,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiUser,
  FiX,
  FiCheck,
  FiXCircle,
  FiMonitor,
  FiDownload,
  FiSearch,
  FiBell
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area } from 'recharts';

// Component to fetch and display authenticated screenshots
const ScreenshotImage = ({ screenshotId, alt, className, onError }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const fetchImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const selectedOrganization = localStorage.getItem('selectedOrganization');
        
        const url = `/api/timesheet/screenshots/${screenshotId}/view`;
        const headers = {
          'Authorization': `Bearer ${token}`,
        };
        
        if (selectedOrganization) {
          headers['X-Organization-Slug'] = selectedOrganization;
        }

        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        const blob = await response.blob();
        
        if (cancelled) {
          URL.revokeObjectURL(URL.createObjectURL(blob));
          return;
        }
        
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error('Error loading screenshot:', err);
        if (!cancelled) {
          setError(true);
          if (onError) {
            onError({ target: { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E' } });
          }
        }
      }
    };

    fetchImage();

    // Cleanup function
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [screenshotId, onError]);

  if (error) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ddd' }}>
        <span style={{ color: '#999', fontSize: '12px' }}>No Image</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
        <span style={{ color: '#999', fontSize: '12px' }}>Loading...</span>
      </div>
    );
  }

  return <img src={imageUrl} alt={alt} className={className} />;
};

export default function TimesheetManagement() {
  const [timesheetData, setTimesheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [dailyAttendance, setDailyAttendance] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'details'
  const [statusTab, setStatusTab] = useState('allDetails'); // 'allDetails', 'submitted', 'approved', 'rejected', 'all'
  const [allEmployeesData, setAllEmployeesData] = useState([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownData, setBreakdownData] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [employeeTrackerStatuses, setEmployeeTrackerStatuses] = useState({});
  const [breakdownSearchTerm, setBreakdownSearchTerm] = useState('');
  const [selectedBreakdownEmployee, setSelectedBreakdownEmployee] = useState(null);
  const [selectedBreakdownDate, setSelectedBreakdownDate] = useState(null);
  const [breakdownScreenshots, setBreakdownScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department: ''
  });
  const [workingConfirmationSending, setWorkingConfirmationSending] = useState(false);
  const [workingConfirmationMessage, setWorkingConfirmationMessage] = useState('');

  const fetchEmployeeTrackerStatuses = async () => {
    if (statusTab === 'allDetails' && allEmployeesData.length > 0) {
      try {
        const statuses = {};
        await Promise.all(
          allEmployeesData.map(async (employee) => {
            try {
              const status = await timesheetAPI.getEmployeeTrackerStatus(employee.employee_id);
              statuses[employee.employee_id] = status;
            } catch (err) {
              // Ignore errors for individual employees
              statuses[employee.employee_id] = { is_active: false, has_recent_data: false };
            }
          })
        );
        setEmployeeTrackerStatuses(statuses);
      } catch (err) {
        console.error('Error fetching tracker statuses:', err);
      }
    }
  };

  const handleSendWorkingConfirmation = async () => {
    setWorkingConfirmationSending(true);
    setWorkingConfirmationMessage('');
    try {
      const res = await timesheetAPI.sendWorkingConfirmation({ currently_working_only: true });
      setWorkingConfirmationMessage(res?.message || `Sent to ${res?.sent || 0} employee(s).`);
      setTimeout(() => setWorkingConfirmationMessage(''), 5000);
    } catch (e) {
      setWorkingConfirmationMessage(e.response?.data?.detail || 'Failed to send.');
      setTimeout(() => setWorkingConfirmationMessage(''), 5000);
    } finally {
      setWorkingConfirmationSending(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    // Check if organization is selected
    const selectedOrg = localStorage.getItem('selectedOrganization');
    if (!selectedOrg) {
      console.error('[TimesheetManagement] ⚠️ No organization selected!');
      console.error('   This will cause API calls to use master database instead of tenant database.');
      console.error('   Please ensure you have selected an organization after login.');
      setError('No organization selected. Please select an organization and refresh the page.');
    }
    fetchTimesheetData();
    
    // Refresh tracker statuses every 30 seconds when viewing all details
    let interval;
    if (statusTab === 'allDetails') {
      setTimeout(() => fetchEmployeeTrackerStatuses(), 1000);
      interval = setInterval(fetchEmployeeTrackerStatuses, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filters, statusTab]);

  const fetchTimesheetData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (statusTab === 'allDetails') {
        // Fetch all employees with their timesheet status
        const employeesData = await timesheetAPI.getAllEmployeeTimesheets(
          filters.start_date || null,
          filters.end_date || null,
          filters.department || null
        );
        setAllEmployeesData(Array.isArray(employeesData) ? employeesData : []);
        setTimesheetData(null);
        
        // Fetch tracker statuses for all employees
        if (Array.isArray(employeesData) && employeesData.length > 0) {
          setTimeout(() => fetchEmployeeTrackerStatuses(), 500);
        }
      } else {
        let data;
        if (statusTab === 'submitted') {
          data = await timesheetAPI.getTimesheetsByStatus(
            'SUBMITTED',
            filters.start_date || null, 
            filters.end_date || null, 
            filters.department || null
          );
        } else if (statusTab === 'approved') {
          data = await timesheetAPI.getTimesheetsByStatus(
            'APPROVED',
            filters.start_date || null, 
            filters.end_date || null, 
            filters.department || null
          );
        } else if (statusTab === 'rejected') {
          data = await timesheetAPI.getTimesheetsByStatus(
            'REJECTED',
            filters.start_date || null, 
            filters.end_date || null, 
            filters.department || null
          );
        } else if (statusTab === 'all') {
          data = await timesheetAPI.getTimesheetsByStatus(
            'ALL',
            filters.start_date || null, 
            filters.end_date || null, 
            filters.department || null
          );
        }
        
        console.log('[TimesheetManagement] Timesheets data:', data);
        console.log('[TimesheetManagement] Selected organization:', localStorage.getItem('selectedOrganization'));
        
        setTimesheetData(data);
        setAllEmployeesData([]);
      }
    } catch (err) {
      console.error('Error fetching timesheet data:', err);
      setError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = async (employeeId) => {
    try {
      setActiveTab('attendance');
      
      // Fetch both daily attendance and details
      const [attendanceData, detailsData] = await Promise.all([
        timesheetAPI.getEmployeeDailyAttendance(
          employeeId,
          filters.start_date || null,
          filters.end_date || null
        ),
        timesheetAPI.getEmployeeTimesheetDetails(
          employeeId,
          filters.start_date || null,
          filters.end_date || null
        )
      ]);
      
      setSelectedEmployee({ employee_id: employeeId });
      setDailyAttendance(attendanceData);
      setEmployeeDetails(detailsData);
      setShowEmployeeModal(true);
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError('Failed to load employee details');
    }
  };

  const handleDayClick = async (dateStr) => {
    if (!selectedEmployee?.employee_id) return;
    
    try {
      setBreakdownLoading(true);
      setShowBreakdownModal(true);
      setSelectedBreakdownEmployee(selectedEmployee);
      setSelectedBreakdownDate(dateStr);
      // Breakdown endpoint now includes system activity data
      const breakdown = await timesheetAPI.getDailyBreakdown(selectedEmployee.employee_id, dateStr);
      setBreakdownData(breakdown);
      
      // Fetch screenshots for this day
      try {
        const screenshots = await timesheetAPI.getScreenshots(
          selectedEmployee.employee_id,
          dateStr,
          dateStr
        );
        setBreakdownScreenshots(screenshots || []);
      } catch (screenshotErr) {
        console.error('Error fetching screenshots:', screenshotErr);
        setBreakdownScreenshots([]);
      }
    } catch (err) {
      console.error('Error fetching breakdown:', err);
      setError('Failed to load breakdown data');
      setShowBreakdownModal(false);
    } finally {
      setBreakdownLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = (data) => {
    if (!data) return;
    
    const employeeName = selectedBreakdownEmployee?.name || selectedBreakdownEmployee?.first_name || 'Employee';
    const date = selectedBreakdownDate || data.date || 'Unknown';
    
    let csvContent = `Daily Breakdown Report - ${employeeName} - ${date}\n\n`;
    
    // Summary
    csvContent += `Summary\n`;
    csvContent += `Total Idle Time,${formatDuration((data.total_idle_minutes || 0) / 60)}\n`;
    csvContent += `Total Task Time,${formatDuration((data.total_task_minutes || 0) / 60)}\n`;
    if (data.system_activity) {
      csvContent += `System Active Time,${formatDuration((data.system_activity.total_active_minutes || 0) / 60)}\n`;
    }
    csvContent += `\n`;
    
    // Application Usage
    if (data.system_activity?.application_summary?.length > 0) {
      csvContent += `Application Usage\n`;
      csvContent += `Application,Total Time,Records\n`;
      data.system_activity.application_summary
        .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
        .forEach(app => {
          csvContent += `${app.application || 'Unknown'},${formatDuration((app.total_minutes || 0) / 60)},${app.records || 0}\n`;
        });
      csvContent += `\n`;
    }
    
    // Task Breakdown
    if (data.task_breakdown?.length > 0) {
      csvContent += `Task Breakdown\n`;
      csvContent += `Project,Task,Time\n`;
      data.task_breakdown.forEach(task => {
        csvContent += `${task.project_name || 'N/A'},${task.task_name || 'N/A'},${formatDuration(task.total_hours || 0)}\n`;
      });
      csvContent += `\n`;
    }
    
    // Idle Periods
    if (data.idle_periods?.length > 0) {
      csvContent += `Idle Periods\n`;
      csvContent += `Start Time,End Time,Duration,Type\n`;
      data.idle_periods.forEach(period => {
        csvContent += `${formatToLocalTime(period.start_time)},${formatToLocalTime(period.end_time)},${formatDuration(period.duration_hours || 0)},${period.type || 'Idle'}\n`;
      });
    }
    
    // Create and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `breakdown_${employeeName}_${date.replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (using window.print for now, can be enhanced with jsPDF)
  const handleExportPDF = (data) => {
    if (!data) return;
    
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const employeeName = selectedBreakdownEmployee?.name || selectedBreakdownEmployee?.first_name || 'Employee';
    const date = selectedBreakdownDate || data.date || 'Unknown';
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Breakdown - ${employeeName} - ${date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Daily Breakdown Report</h1>
        <p><strong>Employee:</strong> ${employeeName}</p>
        <p><strong>Date:</strong> ${date}</p>
        
        <h2>Summary</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Idle Time</td><td>${formatDuration((data.total_idle_minutes || 0) / 60)}</td></tr>
          <tr><td>Total Task Time</td><td>${formatDuration((data.total_task_minutes || 0) / 60)}</td></tr>
          ${data.system_activity ? `<tr><td>System Active Time</td><td>${formatDuration((data.system_activity.total_active_minutes || 0) / 60)}</td></tr>` : ''}
        </table>
    `;
    
    if (data.system_activity?.application_summary?.length > 0) {
      htmlContent += `
        <h2>Application Usage</h2>
        <table>
          <tr><th>Application</th><th>Total Time</th><th>Records</th></tr>
      `;
      data.system_activity.application_summary
        .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
        .forEach(app => {
          htmlContent += `<tr><td>${app.application || 'Unknown'}</td><td>${formatDuration((app.total_minutes || 0) / 60)}</td><td>${app.records || 0}</td></tr>`;
        });
      htmlContent += `</table>`;
    }
    
    if (data.task_breakdown?.length > 0) {
      htmlContent += `
        <h2>Task Breakdown</h2>
        <table>
          <tr><th>Project</th><th>Task</th><th>Time</th></tr>
      `;
      data.task_breakdown.forEach(task => {
        htmlContent += `<tr><td>${task.project_name || 'N/A'}</td><td>${task.task_name || 'N/A'}</td><td>${formatDuration(task.total_hours || 0)}</td></tr>`;
      });
      htmlContent += `</table>`;
    }
    
    htmlContent += `
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Calculate Productivity Score (TimeChamp-like)
  const calculateProductivityScore = (data) => {
    if (!data) return 0;
    
    const totalMinutes = (data.total_task_minutes || 0) + (data.total_idle_minutes || 0);
    if (totalMinutes === 0) return 0;
    
    const taskRatio = (data.total_task_minutes || 0) / totalMinutes;
    const activeRatio = data.system_activity 
      ? (data.system_activity.total_active_minutes || 0) / totalMinutes 
      : 1;
    
    // Productivity score: 0-100
    // 60% weight on task time, 40% on active time
    const score = Math.round((taskRatio * 60) + (activeRatio * 40));
    return Math.min(100, Math.max(0, score));
  };

  // Generate hourly activity data for timeline
  const generateHourlyActivity = (data) => {
    if (!data?.system_activity?.activities) {
      console.log('[Hourly Activity] No system activity data available');
      return [];
    }
    
    console.log(`[Hourly Activity] Processing ${data.system_activity.activities.length} activity records`);
    
    const hourlyData = {};
    
    // Initialize all 24 hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { hour: i, active: 0, idle: 0, applications: new Set() };
    }
    
    // Process activities
    // Timestamps from backend are in UTC; we bin by hour in Asia/Kolkata (IST)
    let processedCount = 0;
    let skippedCount = 0;
    
    data.system_activity.activities.forEach(activity => {
      try {
        // Ensure timestamp is treated as UTC (add Z if not present and no timezone info)
        let timestampStr = activity.timestamp;
        if (typeof timestampStr === 'string') {
          // If it doesn't end with Z and doesn't have timezone info, treat as UTC
          if (!timestampStr.endsWith('Z') && !timestampStr.includes('+') && !timestampStr.includes('-', 10)) {
            timestampStr = timestampStr + 'Z';
          }
        }
        const date = new Date(timestampStr);
        if (isNaN(date.getTime())) {
          console.warn(`[Hourly Activity] Invalid timestamp: ${activity.timestamp}`);
          skippedCount++;
          return;
        }
        
        // Use Asia/Kolkata (IST) for hourly binning - not browser timezone
        // Properly extract hour in IST timezone
        const formatter = new Intl.DateTimeFormat('en', { 
          timeZone: getUserTimezone(), 
          hour: 'numeric', 
          hour12: false 
        });
        const hourParts = formatter.formatToParts(date);
        const hour = parseInt(hourParts.find(part => part.type === 'hour').value, 10);
        const localDate = date.toLocaleString('en-IN', { timeZone: getUserTimezone() });
        
        // Debug: log ALL activities to see what's being processed (Kolkata time)
        console.log(`[Hourly Activity Debug] Hour ${hour}:00 (Kolkata: ${localDate}) - ${activity.duration_minutes || 0}m - App: ${activity.application_name || 'Unknown'} - UTC Timestamp: ${activity.timestamp}`);
        
        if (hourlyData[hour] !== undefined) {
          hourlyData[hour].active += activity.duration_minutes || 0;
          if (activity.is_idle) {
            hourlyData[hour].idle += activity.duration_minutes || 0;
          }
          // Backend sends 'application_name', not 'application'
          if (activity.application_name) {
            hourlyData[hour].applications.add(activity.application_name);
          }
          processedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`[Hourly Activity] Error processing activity:`, err, activity);
        skippedCount++;
      }
    });
    
    console.log(`[Hourly Activity] Processed: ${processedCount}, Skipped: ${skippedCount}`);
    
    const result = Object.values(hourlyData).map(h => ({
      hour: `${h.hour}:00`,
      active: Math.round(h.active),
      idle: Math.round(h.idle),
      total: Math.round(h.active + h.idle),
      appCount: h.applications.size
    }));
    
    // Log summary of hours with activity
    const hoursWithActivity = result.filter(h => h.total > 0);
    console.log(`[Hourly Activity] Hours with activity: ${hoursWithActivity.map(h => h.hour).join(', ')}`);
    
    return result;
  };

  const handleApproveEntry = async (entryId) => {
    try {
      await timesheetAPI.approveEntry(entryId);
      // Refresh employee details after approval
      if (selectedEmployee && employeeDetails) {
        const detailsData = await timesheetAPI.getEmployeeTimesheetDetails(
          selectedEmployee.employee_id,
          filters.start_date || null,
          filters.end_date || null
        );
        setEmployeeDetails(detailsData);
      }
      // Refresh the timesheets list
      fetchTimesheetData();
    } catch (err) {
      console.error('Error approving timesheet entry:', err);
      setError('Failed to approve timesheet entry');
    }
  };

  const handleRejectEntry = async (entryId) => {
    const rejectionReason = window.prompt('Please provide a reason for rejection (optional):');
    // If user cancels the prompt, don't proceed with rejection
    if (rejectionReason === null) {
      return;
    }
    try {
      await timesheetAPI.rejectEntry(entryId, rejectionReason || null);
      // Refresh employee details after rejection
      if (selectedEmployee && employeeDetails) {
        const detailsData = await timesheetAPI.getEmployeeTimesheetDetails(
          selectedEmployee.employee_id,
          filters.start_date || null,
          filters.end_date || null
        );
        setEmployeeDetails(detailsData);
      }
      // Refresh the timesheets list
      fetchTimesheetData();
    } catch (err) {
      console.error('Error rejecting timesheet entry:', err);
      setError('Failed to reject timesheet entry');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Use timezone utility functions
  const formatDate = formatToLocalDate;
  const formatTime = formatToLocalTime;
  const formatDateTime = formatToLocalDateTime;

  const getWorkingStatusColor = (isWorking) => {
    return isWorking ? 'text-green-600' : 'text-gray-500';
  };

  const getStatusIcon = (isWorking) => {
    return isWorking ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Timesheet Management</h1>
          <p className="text-sm text-gray-600">
            Review and manage timesheets by department
            <span className="ml-2 text-xs text-gray-500">
              (Times shown in {getUserTimezone()})
            </span>
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow border mb-4">
        <div className="flex space-x-1 p-1 border-b border-gray-200">
          <button
            onClick={() => setStatusTab('allDetails')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusTab === 'allDetails'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Details
          </button>
          <button
            onClick={() => setStatusTab('submitted')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusTab === 'submitted'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => setStatusTab('approved')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusTab === 'approved'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusTab('rejected')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusTab === 'rejected'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusTab('all')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              statusTab === 'all'
                ? 'bg-gray-100 text-gray-700 border border-gray-300'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {(timesheetData || statusTab === 'allDetails') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg shadow border">
            <div className="flex items-center space-x-2">
              <FiUsers className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-600">
                {statusTab === 'allDetails' ? 'Total Employees' : 'Total Departments'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {statusTab === 'allDetails' 
                ? allEmployeesData.length 
                : timesheetData?.total_departments || 0}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border">
            <div className="flex items-center space-x-2">
              <FiClock className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-600">
                {statusTab === 'allDetails' ? 'Currently Working' : 'Total Entries'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {statusTab === 'allDetails'
                ? allEmployeesData.filter(emp => emp.is_currently_working).length
                : timesheetData?.total_entries || 0}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border">
            <div className="flex items-center space-x-2">
              <FiActivity className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600">Total Hours</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {statusTab === 'allDetails'
                ? formatDuration(allEmployeesData.reduce((sum, emp) => sum + (emp.total_hours || 0), 0))
                : formatDuration(timesheetData?.total_hours || 0)}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border">
            <div className="flex items-center space-x-2">
              <FiTrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-600">
                {statusTab === 'submitted' ? 'Submitted' : 
                 statusTab === 'approved' ? 'Approved' : 
                 statusTab === 'rejected' ? 'Rejected' : 
                 statusTab === 'allDetails' ? 'Total Entries' : 'All Status'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {statusTab === 'allDetails'
                ? allEmployeesData.reduce((sum, emp) => sum + (emp.manual_entries_count || 0) + (emp.auto_entries_count || 0), 0)
                : statusTab === 'submitted' 
                ? timesheetData?.departments?.reduce((sum, dept) => sum + (dept.submitted_count || 0), 0) || 0
                : statusTab === 'approved'
                ? timesheetData?.departments?.reduce((sum, dept) => sum + (dept.approved_count || 0), 0) || 0
                : statusTab === 'rejected'
                ? timesheetData?.departments?.reduce((sum, dept) => sum + (dept.rejected_count || 0), 0) || 0
                : timesheetData?.total_entries || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 rounded-lg shadow border mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by:</span>
            </div>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="End Date"
            />
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              className="border border-gray-300 rounded px-8 py-1 text-sm"
            >
              <option value="">All Departments</option>
              {timesheetData?.departments?.map(dept => (
                <option key={dept.department} value={dept.department}>{dept.department}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {/* <button
              onClick={handleSendWorkingConfirmation}
              disabled={workingConfirmationSending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
            >
              <FiBell className="w-4 h-4" />
              {workingConfirmationSending ? 'Sending…' : 'Request working confirmation'}
            </button> */}
            {workingConfirmationMessage && (
              <span className="text-sm text-gray-600">{workingConfirmationMessage}</span>
            )}
            <button
              onClick={() => setFilters({start_date: '', end_date: '', department: ''})}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Timesheets by Department or All Employees Details */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white rounded-lg shadow overflow-auto">
          <div className="p-4">
            {statusTab === 'allDetails' ? (
              /* All Employees Details Table */
              allEmployeesData.length === 0 ? (
                <div className="text-center py-8">
                  <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No employees found</p>
                  <p className="text-sm text-gray-500">No employee timesheet data available for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manual Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Session</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manual Entries</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Entries</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allEmployeesData.map((employee) => (
                        <tr 
                          key={employee.employee_id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewEmployee(employee.employee_id)}
                          title="Click to view detailed breakdown"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FiUser className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                                <div className="text-xs text-gray-500">{employee.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {employee.department || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="space-y-1">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              employee.is_currently_working 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {employee.is_currently_working ? (
                                <>
                                  <FiCheckCircle className="w-3 h-3 mr-1" />
                                  Working
                                </>
                              ) : (
                                <>
                                  <FiAlertCircle className="w-3 h-3 mr-1" />
                                  Offline
                                </>
                              )}
                            </span>
                            {employee.current_session_start && (
                                <div className="text-xs text-gray-500">
                                Since: {formatTime(employee.current_session_start)}
                              </div>
                            )}
                              {employeeTrackerStatuses[employee.employee_id] && (
                                <div className="text-xs">
                                  {employeeTrackerStatuses[employee.employee_id].is_active ? (
                                    <span className="text-green-600 font-medium">✓ Tracker Active</span>
                                  ) : employeeTrackerStatuses[employee.employee_id].has_recent_data ? (
                                    <span className="text-yellow-600">⚠ Tracker Inactive (had data today)</span>
                                  ) : (
                                    <span className="text-red-600">✗ No Tracker Data</span>
                                  )}
                                  {employeeTrackerStatuses[employee.employee_id].last_activity_24h && (
                                    <div className="text-gray-500 mt-0.5">
                                      Last: {getTimeAgo(employeeTrackerStatuses[employee.employee_id].last_activity_24h)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(employee.manual_hours || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(employee.auto_hours || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {employee.current_session_hours > 0 ? formatDuration(employee.current_session_hours) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatDuration(employee.total_hours || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {employee.manual_entries_count || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {employee.auto_entries_count || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewEmployee(employee.employee_id);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : !timesheetData || !timesheetData.departments || timesheetData.departments.length === 0 ? (
              <div className="text-center py-8">
                <FiClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No timesheets found</p>
                <p className="text-sm text-gray-500">
                  {statusTab === 'submitted' ? 'No submitted timesheets found' :
                   statusTab === 'approved' ? 'No approved timesheets found' :
                   statusTab === 'rejected' ? 'No rejected timesheets found' :
                   'No timesheets found'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {timesheetData.departments.map((dept) => (
                  <div key={dept.department} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{dept.department}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Total Entries: {dept.total_entries}</span>
                          {statusTab === 'all' && (
                            <>
                              <span className="text-blue-600">Submitted: {dept.submitted_count || 0}</span>
                              <span className="text-green-600">Approved: {dept.approved_count || 0}</span>
                              <span className="text-red-600">Rejected: {dept.rejected_count || 0}</span>
                              <span className="text-gray-600">Draft: {dept.draft_count || 0}</span>
                            </>
                          )}
                          {statusTab === 'submitted' && (
                            <span className="text-blue-600">Submitted: {dept.submitted_count || 0}</span>
                          )}
                          {statusTab === 'approved' && (
                            <span className="text-green-600">Approved: {dept.approved_count || 0}</span>
                          )}
                          {statusTab === 'rejected' && (
                            <span className="text-red-600">Rejected: {dept.rejected_count || 0}</span>
                          )}
                          <span className="text-gray-700 font-medium">Hours: {formatDuration(dept.total_hours)}</span>
                        </div>
                              </div>
                            </div>
                    
                    <div className="space-y-2">
                      {dept.entries.map((entry) => (
                        <div 
                          key={entry.entry_id} 
                          className="border border-gray-200 rounded p-3 text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => entry.employee_id && handleViewEmployee(entry.employee_id)}
                          title={entry.employee_id ? "Click to view task breakdown and idle time" : ""}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">{entry.employee_name}</span>
                                <span className="text-xs text-gray-500">({entry.employee_email})</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                                  {entry.status}
                                </span>
                                {entry.project_code && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {entry.project_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>
                                  <span className="font-medium">Date:</span> {formatDate(entry.date)}
                          </div>
                            <div>
                                  <span className="font-medium">Time:</span> {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : 'Ongoing'}
                              </div>
                                {entry.description && (
                                  <div className="text-gray-600">{entry.description}</div>
                                )}
                                <div className="font-medium text-gray-700">
                                  Total: {formatDuration(entry.total_hours)}
                              </div>
                              </div>
                            </div>
                            {(entry.status === 'SUBMITTED' || statusTab === 'submitted') && (
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveEntry(entry.entry_id);
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                  title="Approve timesheet"
                                >
                                  <FiCheck className="w-5 h-5" />
                                </button>
                          <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectEntry(entry.entry_id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="Reject timesheet"
                          >
                                  <FiXCircle className="w-5 h-5" />
                          </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeModal && employeeDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Timesheet Details - {employeeDetails.employee.name}
              </h2>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Info */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Department:</span>
                  <p className="font-medium">{employeeDetails.employee.department}</p>
                </div>
                <div>
                  <span className="text-gray-600">Designation:</span>
                  <p className="font-medium">{employeeDetails.employee.designation}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{employeeDetails.employee.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className={`font-medium ${employeeDetails.summary.is_currently_working ? 'text-green-600' : 'text-gray-500'}`}>
                    {employeeDetails.summary.is_currently_working ? 'Currently Working' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'attendance'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Daily Attendance
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timesheet Details
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'tasks'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Task Breakdown
              </button>
            </div>

            {/* Daily Attendance Tab */}
            {activeTab === 'attendance' && dailyAttendance && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Daily Login/Logout Times</h3>
                  <span className="text-xs text-gray-500">
                    {dailyAttendance.start_date} to {dailyAttendance.end_date}
                  </span>
                </div>
                {dailyAttendance.daily_attendance.length === 0 ? (
                  <p className="text-sm text-gray-500">No attendance records found for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Login</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Logout</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Total Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyAttendance.daily_attendance.map((day) => (
                          <tr 
                            key={day.date} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleDayClick(day.date)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDate(day.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {day.first_login ? formatTime(day.first_login) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {day.last_logout ? formatTime(day.last_logout) : 'Active'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDuration(day.total_hours)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Timesheet Details Tab */}
            {activeTab === 'details' && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {/* <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600">Manual Hours</div>
                <div className="text-lg font-semibold text-blue-800">
                  {formatDuration(employeeDetails.summary.manual_hours)}
                </div>
              </div> */}
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-green-600">Auto Hours</div>
                <div className="text-lg font-semibold text-green-800">
                  {formatDuration(employeeDetails.summary.auto_hours)}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600">Current Session</div>
                <div className="text-lg font-semibold text-purple-800">
                  {formatDuration(employeeDetails.summary.current_session_hours)}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-orange-600">Total Hours</div>
                <div className="text-lg font-semibold text-orange-800">
                  {formatDuration(employeeDetails.summary.total_hours)}
                </div>
              </div>

              <div className="bg-yellow-50 p-2 rounded-lg">
                  <div className="text-xs text-yellow-600">Idle Time</div>
                  <div className="text-lg font-semibold text-yellow-800">
                    {formatDuration(employeeDetails.idle_time_hours || 0)}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {employeeDetails.summary.total_hours > 0 
                      ? `${Math.round((employeeDetails.idle_time_hours || 0) / employeeDetails.summary.total_hours * 100)}% of total`
                      : 'N/A'}
                  </div>
                </div>
            </div>
            
            {/* Task & Idle Time Summary */}
            {/* {(employeeDetails.task_breakdown || employeeDetails.idle_time_hours) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"> */}
                {/* <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-xs text-indigo-600">Task Hours</div>
                  <div className="text-lg font-semibold text-indigo-800">
                    {formatDuration(employeeDetails.total_task_time_hours || 0)}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    {employeeDetails.task_breakdown?.length || 0} task(s)
                  </div>
                </div> */}
                
                {/* <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Productivity</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {employeeDetails.summary.total_hours > 0
                      ? `${Math.round((employeeDetails.total_task_time_hours || 0) / employeeDetails.summary.total_hours * 100)}%`
                      : '0%'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Task time / Total time
                  </div>
                </div> */}
              {/* </div>
            )} */}

                {/* Current Session */}
                {/* {employeeDetails.current_session && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <h3 className="text-sm font-medium text-green-800 mb-2">Current Session</h3>
                    <div className="text-sm text-green-700">
                      <p>Started: {formatDateTime(employeeDetails.current_session.login_time)}</p>
                      <p>Duration: {formatDuration(employeeDetails.current_duration_hours)}</p>
                      <p>Time ago: {getTimeAgo(employeeDetails.current_session.login_time)}</p>
                      <p>Status: Active</p>
                    </div>
                  </div>
                )} */}

                {/* Manual Entries */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Manual Timesheet Entries</h3>
                  {employeeDetails.manual_entries.length === 0 ? (
                    <p className="text-sm text-gray-500">No manual entries found</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeDetails.manual_entries.map((entry) => (
                        <div key={entry.entry_id} className="border border-gray-200 rounded p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{formatDate(entry.date)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                                  {entry.status}
                                </span>
                                {entry.project_code && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {entry.project_code}
                                  </span>
                                )}
                          </div>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>
                            {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : 'Ongoing'}
                                </div>
                                {entry.description && (
                                  <div className="text-gray-600">{entry.description}</div>
                                )}
                                <div className="font-medium text-gray-700">
                                  Total: {formatDuration(entry.total_hours)}
                                </div>
                              </div>
                            </div>
                            {entry.status === 'SUBMITTED' && (
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => handleApproveEntry(entry.entry_id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                  title="Approve timesheet"
                                >
                                  <FiCheck className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleRejectEntry(entry.entry_id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="Reject timesheet"
                                >
                                  <FiXCircle className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto Entries */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Auto-Tracked Entries</h3>
                  {employeeDetails.auto_entries.length === 0 ? (
                    <p className="text-sm text-gray-500">No auto-tracked entries found</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeDetails.auto_entries.slice(0, 5).map((entry) => (
                        <div key={entry.entry_id} className="border border-gray-200 rounded p-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{formatDate(entry.date)}</span>
                            <span className="text-gray-600">{formatDuration(entry.total_hours)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(entry.start_time)} - {entry.end_time ? formatTime(entry.end_time) : 'Ongoing'}
                            <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              Auto
                            </span>
                          </div>
                        </div>
                      ))}
                      {employeeDetails.auto_entries.length > 5 && (
                        <p className="text-xs text-gray-500">
                          ... and {employeeDetails.auto_entries.length - 5} more entries
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Task Breakdown Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-xs text-indigo-600">Total Task Time</div>
                    <div className="text-lg font-semibold text-indigo-800">
                      {formatDuration(employeeDetails.total_task_time_hours || 0)}
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                      {employeeDetails.task_breakdown?.length || 0} task(s) tracked
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-xs text-yellow-600">Idle Time</div>
                    <div className="text-lg font-semibold text-yellow-800">
                      {formatDuration(employeeDetails.idle_time_hours || 0)}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Time not tracked on tasks
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Total Logged Time</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {formatDuration(employeeDetails.summary.total_hours || 0)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      All timesheet entries
                    </div>
                  </div>
                </div>

                {/* Task Breakdown List */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tasks & Time Breakdown</h3>
                  {!employeeDetails.task_breakdown || employeeDetails.task_breakdown.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <FiActivity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">No task time tracking data found</p>
                      <p className="text-xs text-gray-500 mt-1">
                        This employee hasn't tracked time on any tasks for the selected period
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Project</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time Spent</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sessions</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">% of Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employeeDetails.task_breakdown.map((task) => {
                            const percentage = employeeDetails.summary.total_hours > 0
                              ? Math.round((task.total_hours / employeeDetails.summary.total_hours) * 100)
                              : 0;
                            return (
                              <tr key={task.task_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {task.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {task.task_id}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {task.project_code || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {task.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatDuration(task.total_hours)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {task.tracking_count || 0}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div
                                        className="bg-indigo-600 h-2 rounded-full"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-600">{percentage}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                              Total Task Time:
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatDuration(employeeDetails.total_task_time_hours || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-500">
                              {employeeDetails.task_breakdown?.reduce((sum, task) => sum + (task.tracking_count || 0), 0) || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-600">
                              {employeeDetails.summary.total_hours > 0
                                ? `${Math.round((employeeDetails.total_task_time_hours || 0) / employeeDetails.summary.total_hours * 100)}%`
                                : '0%'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-yellow-700 text-right">
                              Idle Time (Not on Tasks):
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-yellow-700">
                              {formatDuration(employeeDetails.idle_time_hours || 0)}
                            </td>
                            <td colSpan="2" className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-yellow-600">
                              {employeeDetails.summary.total_hours > 0
                                ? `${Math.round((employeeDetails.idle_time_hours || 0) / employeeDetails.summary.total_hours * 100)}% of total time`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Daily Breakdown - {breakdownData?.date ? formatDate(breakdownData.date) : 'Loading...'}
                </h2>
                <div className="flex items-center space-x-2">
                  {breakdownData && (
                    <>
                      <button
                        onClick={() => handleExportCSV(breakdownData)}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        title="Export to CSV"
                      >
                        <FiDownload className="w-4 h-4" />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => handleExportPDF(breakdownData)}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        title="Export to PDF"
                      >
                        <FiDownload className="w-4 h-4" />
                        <span>PDF</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowBreakdownModal(false);
                      setBreakdownData(null);
                      setBreakdownSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {breakdownLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading breakdown data...</p>
                </div>
              ) : breakdownData ? (
                <div className="space-y-6">
                  {/* Idle Periods Table */}
                  {breakdownData.idle_periods && breakdownData.idle_periods.length > 0 && (
                    <div className="bg-white rounded-xl border border-yellow-200 shadow-sm overflow-hidden p-6 mb-6">
                      <h3 className="text-lg font-bold text-yellow-700 mb-4 flex items-center">
                        <FiClock className="w-5 h-5 mr-2 text-yellow-600" />
                        Idle Periods
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-yellow-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-yellow-700 uppercase">Start Time</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-yellow-700 uppercase">End Time</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-yellow-700 uppercase">Duration</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-yellow-700 uppercase">Type</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {breakdownData.idle_periods.map((period, idx) => (
                              <tr key={idx} className="hover:bg-yellow-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-900">{formatToLocalTime(period.start_time)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-900">{period.end_time ? formatToLocalTime(period.end_time) : 'Ongoing'}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-700">{formatDuration(period.duration_hours || 0)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-600">{period.type || 'Idle'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {/* Summary Cards */}
                  {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> */}
                    {/* <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200 shadow-sm">
                      <div className="text-xs font-semibold text-yellow-700 mb-2 uppercase tracking-wide">Total Idle Time</div>
                      <div className="text-3xl font-bold text-yellow-900 mb-1">
                        {formatDuration((breakdownData.total_idle_minutes || 0) / 60)}
                      </div>
                      <div className="text-xs text-yellow-600 font-medium">
                        {breakdownData.idle_periods?.length || 0} period(s)
                      </div>
                    </div> */}
                    {/* <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl border border-indigo-200 shadow-sm">
                      <div className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">Total Task Time</div>
                      <div className="text-3xl font-bold text-indigo-900 mb-1">
                        {formatDuration((breakdownData.total_task_minutes || 0) / 60)}
                      </div>
                      <div className="text-xs text-indigo-600 font-medium">
                        {breakdownData.task_breakdown?.length || 0} task(s)
                      </div>
                    </div> */}
                    {/* {breakdownData.system_activity && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
                        <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">System Active Time</div>
                        <div className="text-3xl font-bold text-blue-900 mb-1">
                          {formatDuration((breakdownData.system_activity.total_active_minutes || 0) / 60)}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {breakdownData.system_activity.total_records || 0} activity record(s)
                        </div>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200 shadow-sm">
                      <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Productivity Score</div>
                      <div className="text-3xl font-bold text-purple-900 mb-1">
                        {calculateProductivityScore(breakdownData)}%
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {calculateProductivityScore(breakdownData) >= 80 ? 'Excellent' : 
                         calculateProductivityScore(breakdownData) >= 60 ? 'Good' : 
                         calculateProductivityScore(breakdownData) >= 40 ? 'Fair' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div> */}

                  {/* Search/Filter for Applications */}
                  {/* {breakdownData.system_activity?.application_summary?.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search applications..."
                          value={breakdownSearchTerm}
                          onChange={(e) => setBreakdownSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )} */}

                  {/* Activity Timeline (Hourly Breakdown) */}
                  {breakdownData.system_activity && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <FiClock className="w-5 h-5 mr-2 text-blue-600" />
                          Activity Timeline (Hourly Breakdown)
                        </h3>
                        <div className="text-xs text-gray-500">
                          Full day 0–23 (Kolkata / IST). Y-axis capped at 60 min per hour.
                        </div>
                      </div>
                      {(() => {
                        const hourlyData = generateHourlyActivity(breakdownData);

                        // All 24 hours (0–23) in Kolkata / IST
                        const allHours = Array.from({ length: 24 }, (_, i) => {
                          const hourStr = `${i}:00`;
                          const existing = hourlyData.find(h => h.hour === hourStr);
                          return existing || { hour: hourStr, active: 0, idle: 0, total: 0, appCount: 0 };
                        });

                        // Cap each hour at 60 min for HR; scale active/idle proportionally so chart never exceeds 60
                        const chartData = allHours.map(h => {
                          const total = h.active + h.idle;
                          if (total <= 60) return { ...h };
                          const r = h.active / total;
                          return { ...h, active: Math.round(60 * r), idle: Math.round(60 * (1 - r)), total: 60 };
                        });

                        const yAxisMax = 60;
                        return (
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                              <defs>
                                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorIdle" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <XAxis 
                                dataKey="hour" 
                                tick={{ fontSize: 10 }} 
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                interval={0}
                                type="category"
                              />
                              <YAxis 
                                tick={{ fontSize: 11 }} 
                                tickFormatter={(value) => `${value}m`}
                                domain={[0, yAxisMax]}
                              />
                              <Tooltip 
                                formatter={(value, name, props) => {
                                  // The name parameter is the dataKey ('active' or 'idle')
                                  // Check both lowercase and any case variations
                                  const nameLower = String(name || '').toLowerCase();
                                  const isActive = nameLower === 'active';
                                  return [`${value}m`, isActive ? 'Active' : 'Idle'];
                                }}
                                labelFormatter={(label) => `Hour: ${label} (IST)`}
                              />
                              <Area type="monotone" dataKey="active" stroke="#3B82F6" fillOpacity={1} fill="url(#colorActive)" name="Active" stackId="1" />
                              <Area type="monotone" dataKey="idle" stroke="#F59E0B" fillOpacity={1} fill="url(#colorIdle)" name="Idle" stackId="1" />
                            </AreaChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  )}

                  {/* Activity Heatmap */}
                  {breakdownData.system_activity && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <FiActivity className="w-5 h-5 mr-2 text-green-600" />
                          Activity Heatmap (24-Hour View)
                        </h3>
                        <div className="text-xs text-gray-500">
                          Full day 0–23 (Kolkata / IST). Darker = more activity. Scale: 0–60 min per hour.
                        </div>
                      </div>
                      {(() => {
                        const hourlyData = generateHourlyActivity(breakdownData);
                        const scaleMax = 60;
                        
                        // Ensure all 24 hours (0-23) are displayed in IST
                        const allHours = Array.from({ length: 24 }, (_, i) => {
                          const hourStr = `${i}:00`;
                          const existing = hourlyData.find(h => h.hour === hourStr);
                          return existing || { hour: hourStr, active: 0, idle: 0, total: 0, appCount: 0 };
                        });
                        
                        return (
                          <div>
                            <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                              {allHours.map((hour, idx) => {
                                const intensity = Math.min(1, hour.total / scaleMax);
                                const bgColor = intensity > 0.7 ? 'bg-green-600' : 
                                              intensity > 0.4 ? 'bg-green-400' : 
                                              intensity > 0.1 ? 'bg-yellow-400' : 
                                              'bg-gray-200';
                                // Show exact minute value, capped at 60
                                const cappedTotal = Math.min(hour.total, 60);
                                const displayMins = Math.round(cappedTotal);
                                
                                return (
                                  <div key={idx} className="text-center">
                                    <div 
                                      className={`${bgColor} rounded p-1 mb-1 text-white text-xs font-semibold min-h-[40px] flex items-center justify-center`}
                                      style={{ opacity: Math.max(0.3, intensity) }}
                                      title={`${hour.hour} (Kolkata): ${hour.active}m active, ${hour.idle}m idle${hour.total > 60 ? ` (capped at 60m, actual: ${hour.total}m)` : ''}`}
                                    >
                                      {hour.total > 0 ? `${displayMins}m` : ''}
                                    </div>
                                    <div className="text-xs text-gray-600">{hour.hour.split(':')[0]}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                              <strong>Why this matters:</strong> Identifies peak work hours, breaks, and productivity patterns at a glance
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Application Usage Summary */}
                  {breakdownData.system_activity && breakdownData.system_activity.application_summary && breakdownData.system_activity.application_summary.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <FiMonitor className="w-5 h-5 mr-2 text-green-600" />
                          Application Usage
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Application</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Time (Whole Day)</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Records</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {breakdownData.system_activity.application_summary
                              .filter(app => 
                                !breakdownSearchTerm || 
                                (app.application || 'Unknown').toLowerCase().includes(breakdownSearchTerm.toLowerCase())
                              )
                              .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
                              .map((app, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {app.application || 'Unknown'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-700">
                                      {formatDuration((app.total_minutes || 0) / 60)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                      {app.records || 0}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                        <div className="text-xs text-blue-700">
                          <strong>💡 Why many records but less time?</strong> When employees switch apps frequently, each switch creates a record. 
                          If they spend only a few seconds on each app, you'll see many records with small total time. 
                          This is normal for multitasking or quick app switching.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Application Usage Visualizations */}
                  {breakdownData.system_activity && breakdownData.system_activity.application_summary && breakdownData.system_activity.application_summary.length > 0 && (
                    <div className="space-y-6">
                      {/* Charts Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Most Applications Used - Donut Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <FiMonitor className="w-5 h-5 mr-2 text-blue-600" />
                          Most Applications Used
                        </h3>
                        {(() => {
                          const chartData = breakdownData.system_activity.application_summary
                            .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
                            .slice(0, 5)
                            .map(app => ({
                              name: app.application || 'Unknown',
                              value: app.total_minutes || 0,
                              hours: ((app.total_minutes || 0) / 60).toFixed(1)
                            }));
                          
                          const totalMinutes = chartData.reduce((sum, item) => sum + item.value, 0);
                          const topAppPercentage = totalMinutes > 0 ? Math.round((chartData[0]?.value / totalMinutes) * 100) : 0;
                          const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                          
                          return (
                            <div className="relative">
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    formatter={(value) => `${(value / 60).toFixed(1)}h ${(value % 60).toFixed(0)}m`}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-gray-900">{topAppPercentage}%</div>
                                  <div className="text-xs text-gray-500 mt-1">{chartData[0]?.name}</div>
                                </div>
                              </div>
                              <div className="mt-4 space-y-2">
                                {chartData.map((app, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2" 
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                      ></div>
                                      <span className="text-gray-700">{app.name}</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                      {formatDuration(app.value / 60)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Top 3 Productive Apps */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <FiTrendingUp className="w-5 h-5 mr-2 text-green-600" />
                          Top 3 Apps
                        </h3>
                        {(() => {
                          const topApps = breakdownData.system_activity.application_summary
                            .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
                            .slice(0, 3);
                          
                          const totalActiveMinutes = breakdownData.system_activity.total_active_minutes || 1;
                          
                          return (
                            <div className="space-y-4">
                              {topApps.map((app, idx) => {
                                const percentage = totalActiveMinutes > 0 
                                  ? ((app.total_minutes || 0) / totalActiveMinutes * 100).toFixed(1) 
                                  : 0;
                                return (
                                  <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                                          {idx + 1}
                                        </div>
                                        <span className="font-semibold text-gray-900">{app.application || 'Unknown'}</span>
                                      </div>
                                      <span className="text-lg font-bold text-blue-600">{percentage}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                      <span>{formatDuration((app.total_minutes || 0) / 60)}</span>
                                      <span>{app.records || 0} records</span>
                                    </div>
                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Application Usage Bar Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <FiActivity className="w-5 h-5 mr-2 text-purple-600" />
                        Application Usage Overview
                      </h3>
                      {(() => {
                        const chartData = breakdownData.system_activity.application_summary
                          .sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))
                          .slice(0, 8)
                          .map(app => ({
                            name: (app.application || 'Unknown').length > 12 
                              ? (app.application || 'Unknown').substring(0, 12) + '...' 
                              : (app.application || 'Unknown'),
                            fullName: app.application || 'Unknown',
                            minutes: app.total_minutes || 0,
                            hours: ((app.total_minutes || 0) / 60).toFixed(2)
                          }));
                        
                        // Helper function to format minutes to hours and minutes
                        const formatMinutesToTime = (minutes) => {
                          if (!minutes || minutes === 0) return '0m';
                          const totalMinutes = Math.round(minutes);
                          if (totalMinutes < 60) {
                            return `${totalMinutes}m`;
                          } else {
                            const hours = Math.floor(totalMinutes / 60);
                            const mins = totalMinutes % 60;
                            if (mins === 0) {
                              return `${hours}h`;
                            }
                            return `${hours}h ${mins}m`;
                          }
                        };
                        
                        return (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <XAxis 
                                dataKey="name" 
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                tickFormatter={(value) => formatMinutesToTime(value)}
                                tick={{ fontSize: 12 }}
                              />
                              <Tooltip 
                                formatter={(value) => formatMinutesToTime(value)}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                              />
                              <Bar dataKey="minutes" fill="#3B82F6" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'][index % 8]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                    </div>
                  )}

                  {/* Website/URL Tracking */}
                  {breakdownData.system_activity?.activities && (() => {
                    const websiteMap = {};
                    breakdownData.system_activity.activities.forEach(activity => {
                      if (activity.domain && !activity.is_idle) {
                        const domain = activity.domain.toLowerCase();
                        if (!websiteMap[domain]) {
                          websiteMap[domain] = {
                            domain: domain,
                            minutes: 0,
                            records: 0,
                            urls: new Set()
                          };
                        }
                        websiteMap[domain].minutes += activity.duration_minutes || 0;
                        websiteMap[domain].records += 1;
                        if (activity.url) {
                          websiteMap[domain].urls.add(activity.url);
                        }
                      }
                    });
                    
                    const topWebsites = Object.values(websiteMap)
                      .sort((a, b) => b.minutes - a.minutes)
                      .slice(0, 10);
                    
                    if (topWebsites.length > 0) {
                      return (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <FiActivity className="w-5 h-5 mr-2 text-indigo-600" />
                            Top Websites Visited
                          </h3>
                          <div className="space-y-3">
                            {topWebsites.map((site, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{site.domain}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {site.records} visit(s) • {site.urls.size} unique page(s)
                                  </div>
                                </div>
                                <div className="text-lg font-bold text-indigo-600">
                                  {formatDuration(site.minutes / 60)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Screenshots Viewer */}
                  {breakdownScreenshots.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <FiMonitor className="w-5 h-5 mr-2 text-purple-600" />
                        Screenshots ({breakdownScreenshots.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {breakdownScreenshots.map((screenshot, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedScreenshot(screenshot)}
                            className="relative cursor-pointer group"
                          >
                            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 group-hover:border-purple-500 transition-colors">
                              <ScreenshotImage
                                screenshotId={screenshot.screenshot_id}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Error handled in component
                                }}
                              />
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                              <div className="font-semibold">{formatToLocalTime(screenshot.timestamp)}</div>
                              <div className="text-gray-500">{screenshot.screenshot_type}</div>
                              {screenshot.trigger_reason && (
                                <div className="text-gray-400">{screenshot.trigger_reason}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No breakdown data available</p>
                </div>
              )}

              {/* Screenshot Modal */}
              {selectedScreenshot && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedScreenshot(null)}>
                  <div className="max-w-6xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                          Screenshot - {formatToLocalDateTime(selectedScreenshot.timestamp)}
                        </h3>
                        <button
                          onClick={() => setSelectedScreenshot(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-6 h-6" />
                        </button>
                      </div>
                      <ScreenshotImage
                        screenshotId={selectedScreenshot.screenshot_id}
                        alt="Screenshot"
                        className="max-w-full max-h-[80vh] rounded-lg"
                        onError={(e) => {
                          // Error handled in component
                        }}
                      />
                      <div className="mt-4 text-sm text-gray-600">
                        <p><strong>Type:</strong> {selectedScreenshot.screenshot_type}</p>
                        {selectedScreenshot.trigger_reason && (
                          <p><strong>Reason:</strong> {selectedScreenshot.trigger_reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowBreakdownModal(false);
                    setBreakdownData(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
