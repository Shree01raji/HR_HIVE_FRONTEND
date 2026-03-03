import React, { useState, useEffect } from 'react';
import { complianceAPI } from '../../services/api';
import { 
  FiFileText, 
  FiDownload, 
  FiCalendar, 
  FiUsers, 
  FiAlertTriangle,
  FiCheckCircle,
  FiBarChart,
  FiEye,
  FiFilter
} from 'react-icons/fi';

const ComplianceReporting = () => {
  const [selectedReport, setSelectedReport] = useState('audit_log');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [format, setFormat] = useState('json');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [error, setError] = useState(null);

  const reportTypes = [
    { value: 'audit_log', label: 'Audit Log', icon: FiFileText, description: 'System activity and user actions' },
    { value: 'employee_activity', label: 'Employee Activity', icon: FiUsers, description: 'Login sessions and activity patterns' },
    { value: 'leave_summary', label: 'Leave Summary', icon: FiCalendar, description: 'Leave requests and approvals' },
    { value: 'payroll_summary', label: 'Payroll Summary', icon: FiBarChart, description: 'Payroll processing and payments' },
    { value: 'timesheet_summary', label: 'Timesheet Summary', icon: FiBarChart, description: 'Time tracking and attendance' },
  
    { value: 'recruitment_summary', label: 'Recruitment Summary', icon: FiBarChart, description: 'Job postings and applications' },
    { value: 'compliance_check', label: 'Compliance Check', icon: FiAlertTriangle, description: 'Compliance issues and violations' }
  ];

  const departments = [
    'All Departments',
    'Human Resources',
    'Information Technology',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Customer Service'
  ];

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        format: format,
        department: department
      };

      const data = await complianceAPI.generateReport(selectedReport, params);
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.response?.data?.detail || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport}_report_${startDate}_to_${endDate}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      generatePDFReport();
    } else if (format === 'csv') {
      generateCSVReport();
    }
  };

  const generatePDFReport = () => {
    const generatePDF = () => {
      // Create HTML content for PDF
      const reportHTML = generateReportHTML();
      
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; margin: 20px; padding: 20px;">
          ${reportHTML}
        </div>
      `;
      document.body.appendChild(container);
      
      const element = container.firstElementChild;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${selectedReport}_report_${startDate}_to_${endDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      window.html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(container);
      }).catch((error) => {
        console.error('PDF generation error:', error);
        document.body.removeChild(container);
      });
    };

    // Load html2pdf.js from CDN if not already loaded
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = generatePDF;
      script.onerror = () => {
        console.error('Failed to load html2pdf.js');
        alert('Failed to load PDF library. Please try again.');
      };
      document.head.appendChild(script);
    } else {
      generatePDF();
    }
  };

  const generateCSVReport = () => {
    let csvContent = '';
    
    if (selectedReport === 'audit_log') {
      csvContent = 'Action,Target Type,Target ID,Actor User ID,Created At,Details\n';
      if (reportData.logs) {
        reportData.logs.forEach(log => {
          csvContent += `"${log.action}","${log.target_type}","${log.target_id}","${log.actor_user_id}","${log.created_at}","${JSON.stringify(log.details)}"\n`;
        });
      }
    } else if (selectedReport === 'employee_activity') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Logins,${reportData.total_logins}\n`;
      csvContent += `Unique Users,${reportData.unique_users}\n`;
      csvContent += `Average Session Duration (hours),${reportData.average_session_duration_hours}\n`;
      csvContent += `Active Sessions,${reportData.active_sessions}\n`;
    } else if (selectedReport === 'leave_summary') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Requests,${reportData.total_requests}\n`;
      csvContent += `Total Days,${reportData.total_days}\n`;
      csvContent += `Average Days per Request,${reportData.average_days_per_request}\n`;
      
      if (reportData.status_breakdown) {
        csvContent += '\nStatus Breakdown\nStatus,Count\n';
        Object.entries(reportData.status_breakdown).forEach(([status, count]) => {
          csvContent += `${status},${count}\n`;
        });
      }
      
      if (reportData.type_breakdown) {
        csvContent += '\nType Breakdown\nType,Count\n';
        Object.entries(reportData.type_breakdown).forEach(([type, count]) => {
          csvContent += `${type},${count}\n`;
        });
      }
    } else if (selectedReport === 'timesheet_summary') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Entries,${reportData.total_entries}\n`;
      csvContent += `Total Hours,${reportData.total_hours}\n`;
      csvContent += `Average Hours per Entry,${reportData.average_hours_per_entry}\n`;
      
      if (reportData.status_breakdown) {
        csvContent += '\nStatus Breakdown\nStatus,Count\n';
        Object.entries(reportData.status_breakdown).forEach(([status, count]) => {
          csvContent += `${status},${count}\n`;
        });
      }
    } else if (selectedReport === 'recruitment_summary') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Jobs,${reportData.total_jobs}\n`;
      csvContent += `Open Jobs,${reportData.open_jobs}\n`;
      csvContent += `Closed Jobs,${reportData.closed_jobs}\n`;
      csvContent += `Total Applications,${reportData.total_applications}\n`;
      csvContent += `Average Applications per Job,${reportData.avg_applications_per_job}\n`;
      
      if (reportData.status_breakdown) {
        csvContent += '\nApplication Status Breakdown\nStatus,Count\n';
        Object.entries(reportData.status_breakdown).forEach(([status, count]) => {
          csvContent += `${status},${count}\n`;
        });
      }
      
      if (reportData.department_breakdown) {
        csvContent += '\nDepartment Breakdown\nDepartment,Count\n';
        Object.entries(reportData.department_breakdown).forEach(([dept, count]) => {
          csvContent += `${dept},${count}\n`;
        });
      }
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport}_report_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateReportHTML = () => {
    const reportType = reportTypes.find(r => r.value === selectedReport);
    const currentDate = new Date().toLocaleDateString();
    
    let html = `
      <div class="header">
        <h1>${reportType?.label} Report</h1>
        <p>Generated on: ${currentDate}</p>
        <p>Period: ${reportData.period}</p>
        <p>Department: ${reportData.department}</p>
      </div>
    `;

    if (selectedReport === 'audit_log') {
      html += `
        <div class="section">
          <h2>Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_actions}</div>
              <div class="metric-label">Total Actions</div>
            </div>
          </div>
          
          <h2>Action Breakdown</h2>
          <div class="breakdown">
            ${Object.entries(reportData.action_breakdown || {}).map(([action, count]) => `
              <div class="breakdown-item">
                <span>${action}</span>
                <span>${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (selectedReport === 'employee_activity') {
      html += `
        <div class="section">
          <h2>Activity Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_logins}</div>
              <div class="metric-label">Total Logins</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.unique_users}</div>
              <div class="metric-label">Unique Users</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.average_session_duration_hours}</div>
              <div class="metric-label">Avg Session (hrs)</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.active_sessions}</div>
              <div class="metric-label">Active Sessions</div>
            </div>
          </div>
        </div>
      `;
    } else if (selectedReport === 'leave_summary') {
      html += `
        <div class="section">
          <h2>Leave Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_requests}</div>
              <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.total_days}</div>
              <div class="metric-label">Total Days</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.average_days_per_request}</div>
              <div class="metric-label">Avg Days/Request</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
              <h3>Status Breakdown</h3>
              <div class="breakdown">
                ${Object.entries(reportData.status_breakdown || {}).map(([status, count]) => `
                  <div class="breakdown-item">
                    <span>${status}</span>
                    <span>${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div>
              <h3>Type Breakdown</h3>
              <div class="breakdown">
                ${Object.entries(reportData.type_breakdown || {}).map(([type, count]) => `
                  <div class="breakdown-item">
                    <span>${type}</span>
                    <span>${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (selectedReport === 'compliance_check') {
      html += `
        <div class="section">
          <h2>Compliance Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_employees_checked}</div>
              <div class="metric-label">Employees Checked</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: ${reportData.compliance_issues?.length > 0 ? '#dc3545' : '#28a745'}">${reportData.compliance_issues?.length || 0}</div>
              <div class="metric-label">Compliance Issues</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: ${reportData.overdue_reviews > 0 ? '#fd7e14' : '#28a745'}">${reportData.overdue_reviews}</div>
              <div class="metric-label">Overdue Reviews</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" style="color: ${reportData.compliance_score >= 80 ? '#28a745' : reportData.compliance_score >= 60 ? '#fd7e14' : '#dc3545'}">${reportData.compliance_score}%</div>
              <div class="metric-label">Compliance Score</div>
            </div>
          </div>
          
          ${reportData.compliance_issues && reportData.compliance_issues.length > 0 ? `
            <h2>Compliance Issues</h2>
            <div class="breakdown">
              ${reportData.compliance_issues.map(issue => `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8d7da; border-radius: 5px;">
                  <strong>${issue.employee_name}</strong>
                  <ul style="margin: 5px 0 0 20px;">
                    ${issue.issues.map(issueItem => `<li>${issueItem}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else if (selectedReport === 'timesheet_summary') {
      html += `
        <div class="section">
          <h2>Timesheet Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_entries}</div>
              <div class="metric-label">Total Entries</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.total_hours}</div>
              <div class="metric-label">Total Hours</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.average_hours_per_entry}</div>
              <div class="metric-label">Avg Hours/Entry</div>
            </div>
          </div>
          
          ${reportData.status_breakdown && Object.keys(reportData.status_breakdown).length > 0 ? `
            <h2>Status Breakdown</h2>
            <div class="breakdown">
              ${Object.entries(reportData.status_breakdown || {}).map(([status, count]) => `
                <div class="breakdown-item">
                  <span>${status}</span>
                  <span>${count}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else if (selectedReport === 'recruitment_summary') {
      html += `
        <div class="section">
          <h2>Recruitment Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${reportData.total_jobs}</div>
              <div class="metric-label">Total Jobs</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.open_jobs}</div>
              <div class="metric-label">Open Jobs</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.closed_jobs}</div>
              <div class="metric-label">Closed Jobs</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.total_applications}</div>
              <div class="metric-label">Total Applications</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${reportData.avg_applications_per_job}</div>
              <div class="metric-label">Avg Apps/Job</div>
            </div>
          </div>
          
          ${reportData.status_breakdown && Object.keys(reportData.status_breakdown).length > 0 ? `
            <h2>Application Status Breakdown</h2>
            <div class="breakdown">
              ${Object.entries(reportData.status_breakdown || {}).map(([status, count]) => `
                <div class="breakdown-item">
                  <span>${status}</span>
                  <span>${count}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${reportData.department_breakdown && Object.keys(reportData.department_breakdown).length > 0 ? `
            <h2>Department Breakdown</h2>
            <div class="breakdown">
              ${Object.entries(reportData.department_breakdown || {}).map(([dept, count]) => `
                <div class="breakdown-item">
                  <span>${dept}</span>
                  <span>${count}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    html += `
      <div class="footer">
        <p>This report was generated by the HR Management System</p>
        <p>For questions or clarifications, please contact the HR department</p>
      </div>
    `;

    return html;
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await complianceAPI.getAuditLogs({ limit: 50 });
      setAuditLogs(data.audit_logs);
      setShowAuditLogs(true);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError(error.response?.data?.detail || 'Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderReportData = () => {
    if (!reportData) return null;

    const { report_type, period, department: reportDept } = reportData;
    const reportType = reportTypes.find(r => r.value === report_type);
    const currentDate = new Date().toLocaleDateString();

    return (
      <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
        {/* Report Header */}
        <div className="text-center border-b-2 border-gray-200 pb-6 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {reportType?.label} Report
          </h2>
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center">
              <FiCalendar className="mr-2" />
              Generated: {currentDate}
            </div>
            <div className="flex items-center">
              <FiFileText className="mr-2" />
              Period: {period}
            </div>
            <div className="flex items-center">
              <FiUsers className="mr-2" />
              Department: {reportDept}
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={downloadReport}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <FiDownload className="mr-2" />
            Download {format.toUpperCase()} Report
          </button>
        </div>

        <div className="space-y-8">
          {report_type === 'audit_log' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiFileText className="mr-3 text-blue-600" />
                Audit Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_actions}</div>
                    <div className="text-sm text-gray-600">Total Actions</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{Object.keys(reportData.action_breakdown || {}).length}</div>
                    <div className="text-sm text-gray-600">Action Types</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{reportData.period}</div>
                    <div className="text-sm text-gray-600">Reporting Period</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Action Breakdown</h4>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="space-y-3">
                    {Object.entries(reportData.action_breakdown || {}).map(([action, count]) => (
                      <div key={action} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{action.replace(/_/g, ' ')}</span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {report_type === 'employee_activity' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiUsers className="mr-3 text-green-600" />
                Employee Activity Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_logins}</div>
                    <div className="text-sm text-gray-600">Total Logins</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{reportData.unique_users}</div>
                    <div className="text-sm text-gray-600">Unique Users</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{reportData.average_session_duration_hours}</div>
                    <div className="text-sm text-gray-600">Avg Session (hrs)</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">{reportData.active_sessions}</div>
                    <div className="text-sm text-gray-600">Active Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {report_type === 'leave_summary' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiCalendar className="mr-3 text-blue-600" />
                Leave Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_requests}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{reportData.total_days}</div>
                    <div className="text-sm text-gray-600">Total Days</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{reportData.average_days_per_request}</div>
                    <div className="text-sm text-gray-600">Avg Days/Request</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.status_breakdown || {}).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{status}</span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Type Breakdown</h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.type_breakdown || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{type}</span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {report_type === 'compliance_check' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiAlertTriangle className="mr-3 text-orange-600" />
                Compliance Check Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_employees_checked}</div>
                    <div className="text-sm text-gray-600">Employees Checked</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${reportData.compliance_issues?.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {reportData.compliance_issues?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Compliance Issues</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${reportData.overdue_reviews > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {reportData.overdue_reviews}
                    </div>
                    <div className="text-sm text-gray-600">Overdue Reviews</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${
                      reportData.compliance_score >= 80 ? 'text-green-600' : 
                      reportData.compliance_score >= 60 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {reportData.compliance_score}%
                    </div>
                    <div className="text-sm text-gray-600">Compliance Score</div>
                  </div>
                </div>
              </div>
              
              {reportData.compliance_issues && reportData.compliance_issues.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiAlertTriangle className="mr-2 text-red-600" />
                    Compliance Issues
                  </h4>
                  <div className="space-y-4">
                    {reportData.compliance_issues.map((issue, index) => (
                      <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-800 mb-2">{issue.employee_name}</p>
                        <ul className="text-sm text-red-700">
                          {issue.issues.map((issueItem, idx) => (
                            <li key={idx} className="flex items-center mb-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              {issueItem}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {report_type === 'timesheet_summary' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiBarChart className="mr-3 text-blue-600" />
                Timesheet Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_entries}</div>
                    <div className="text-sm text-gray-600">Total Entries</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{reportData.total_hours}</div>
                    <div className="text-sm text-gray-600">Total Hours</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{reportData.average_hours_per_entry}</div>
                    <div className="text-sm text-gray-600">Avg Hours/Entry</div>
                  </div>
                </div>
              </div>
              
              {reportData.status_breakdown && Object.keys(reportData.status_breakdown).length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.status_breakdown || {}).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{status}</span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {report_type === 'recruitment_summary' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiBarChart className="mr-3 text-blue-600" />
                Recruitment Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{reportData.total_jobs}</div>
                    <div className="text-sm text-gray-600">Total Jobs</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{reportData.open_jobs}</div>
                    <div className="text-sm text-gray-600">Open Jobs</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-600 mb-2">{reportData.closed_jobs}</div>
                    <div className="text-sm text-gray-600">Closed Jobs</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{reportData.total_applications}</div>
                    <div className="text-sm text-gray-600">Total Applications</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">{reportData.avg_applications_per_job}</div>
                    <div className="text-sm text-gray-600">Avg Apps/Job</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {reportData.status_breakdown && Object.keys(reportData.status_breakdown).length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Application Status Breakdown</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.status_breakdown || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{status}</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {reportData.department_breakdown && Object.keys(reportData.department_breakdown).length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h4>
                    <div className="space-y-3">
                      {Object.entries(reportData.department_breakdown || {}).map(([dept, count]) => (
                        <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{dept}</span>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generic report data display for other report types */}
          {!['audit_log', 'employee_activity', 'leave_summary', 'compliance_check', 'timesheet_summary', 'recruitment_summary'].includes(report_type) && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiBarChart className="mr-3 text-blue-600" />
                {reportType?.label} Report
              </h3>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <pre className="text-sm text-gray-700 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Report Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <div className="text-sm text-gray-500 space-y-1">
            <p>This report was generated by the HR Management System</p>
            <p>For questions or clarifications, please contact the HR department</p>
            <p className="text-xs mt-4">
              Report ID: {report_type}_{Date.now().toString().slice(-8)} | 
              Generated on: {new Date().toLocaleString()} | 
              User: {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : 'System'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Compliance & Reporting</h1>
        <p className="text-gray-600">Generate comprehensive reports and monitor compliance across your organization.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-center">
            <FiAlertTriangle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {reportTypes.find(r => r.value === selectedReport)?.description}
            </p>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiEye className="mr-2" />
            {loading ? 'Loading...' : 'View Recent Logs'}
          </button>
        </div>

        {showAuditLogs && (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-600">
                      {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.details && (
                  <div className="mt-2 text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Results */}
      {renderReportData()}
    </div>
  );
};

export default ComplianceReporting;