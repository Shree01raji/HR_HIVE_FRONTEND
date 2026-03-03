import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar, FiUser, FiCheck, FiFileText, FiX, FiAlertCircle, FiClock } from 'react-icons/fi';
import { payrollAPI, employeeAPI } from '../../services/api';
import WorkflowEmbed from '../../components/workflow/WorkflowEmbed';

export default function AccountantPayroll() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, draft, approved, pending

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [payrollData, employeeData] = await Promise.all([
        payrollAPI.getAll(),
        employeeAPI.getAll()
      ]);
      
      // Ensure payrollData is an array
      let safePayrollData = [];
      if (payrollData == null) {
        safePayrollData = [];
      } else if (Array.isArray(payrollData)) {
        safePayrollData = payrollData;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.data)) {
        safePayrollData = payrollData.data;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.payroll)) {
        safePayrollData = payrollData.payroll;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.records)) {
        safePayrollData = payrollData.records;
      } else {
        safePayrollData = [];
      }
      
      // Ensure employeeData is an array
      let safeEmployeeData = [];
      if (employeeData == null) {
        safeEmployeeData = [];
      } else if (Array.isArray(employeeData)) {
        safeEmployeeData = employeeData;
      } else if (typeof employeeData === 'object' && Array.isArray(employeeData.data)) {
        safeEmployeeData = employeeData.data;
      } else if (typeof employeeData === 'object' && Array.isArray(employeeData.employees)) {
        safeEmployeeData = employeeData.employees;
      } else {
        safeEmployeeData = [];
      }
      
      // Filter payrolls: Show only DRAFT, APPROVED, PENDING_APPROVAL (not PAID or REJECTED)
      const pendingPayrolls = safePayrollData.filter(record => {
        const status = record.status || 'DRAFT';
        return status !== 'PAID' && status !== 'REJECTED' && status !== 'PROCESSED';
      });
      
      setPayrollRecords(pendingPayrolls);
      setEmployees(safeEmployeeData);
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
      setError(err.response?.data?.detail || 'Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    const record = payrollRecords.find(r => r.payroll_id === payrollId);
    
    // Check if payment details are missing
    const missingPaymentDetails = !record?.payment_method || 
      (record?.payment_method === 'BANK_TRANSFER' && (!record?.bank_account_number || !record?.ifsc_code)) ||
      (record?.payment_method === 'UPI' && !record?.upi_id);
    
    if (missingPaymentDetails) {
      alert(
        '⚠️ Payment details are missing.\n\n' +
        'Please contact HR to add payment details before marking as paid.'
      );
      return;
    }
    
    if (window.confirm('Mark this payroll as paid?')) {
      try {
        const transactionId = record?.transaction_id || window.prompt('Enter transaction ID (optional):') || null;
        const paymentDate = record?.payment_date || new Date().toISOString().split('T')[0];
        
        const response = await fetch(`/api/payroll/${payrollId}/mark-paid?${new URLSearchParams({
          transaction_id: transactionId || '',
          payment_date: paymentDate
        })}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          fetchData();
          alert('✅ Payroll marked as paid successfully!');
        } else {
          const error = await response.json();
          setError(error.detail || 'Failed to mark payroll as paid');
        }
      } catch (err) {
        console.error('Failed to mark as paid:', err);
        setError('Failed to mark payroll as paid');
      }
    }
  };

  const handleProcessRazorpayX = async (payrollId) => {
    if (!window.confirm(
      'Process this payment via RazorpayX?\n\n' +
      'This will transfer money from your RazorpayX account to the employee\'s bank account.\n' +
      'Make sure you have sufficient balance in your RazorpayX account.'
    )) {
      return;
    }

    try {
      setError(null);
      const result = await payrollAPI.processRazorpayX(payrollId);
      
      alert(
        `✅ Payment Processing Initiated!\n\n` +
        `Payout ID: ${result.payout_id}\n` +
        `Status: ${result.status}\n\n` +
        `Payment is being processed. Status will update automatically.`
      );
      
      fetchData();
    } catch (err) {
      console.error('Failed to process payment:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to process payment via RazorpayX';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    }
  };

  const handleBulkProcessRazorpayX = async () => {
    const month = window.prompt('Enter month (e.g., January):');
    if (!month) return;
    
    const yearInput = window.prompt('Enter year:');
    if (!yearInput) return;
    
    const year = parseInt(yearInput);
    if (isNaN(year)) {
      alert('Please enter a valid year');
      return;
    }

    if (!window.confirm(
      `Process payments via RazorpayX for ${month} ${year}?\n\n` +
      `This will transfer money from your RazorpayX account to employee bank accounts.\n` +
      `Make sure you have sufficient balance in your RazorpayX account.`
    )) {
      return;
    }

    try {
      setError(null);
      const result = await payrollAPI.bulkProcessRazorpayX(month, year);
      
      let message = `✅ Payment Processing Initiated!\n\n` +
        `Processed: ${result.processed} payments\n` +
        `Failed: ${result.failed} payments\n`;
      
      if (result.skipped) {
        message += `Skipped: ${result.skipped} payments (missing bank details)\n`;
      }
      
      message += `Status: ${result.status}\n\n`;
      
      if (result.skipped > 0 && result.skipped_details && result.skipped_details.length > 0) {
        message += `⚠️ Skipped Payments (Missing Bank Details):\n`;
        result.skipped_details.forEach((detail, idx) => {
          message += `\n${idx + 1}. ${detail.employee_name} (Payroll ID: ${detail.payroll_id})\n`;
          message += `   Reason: ${detail.error}\n`;
        });
        message += `\n💡 Please contact HR to add bank account details for these employees.\n\n`;
      }
      
      if (result.failed > 0 && result.failed_details && result.failed_details.length > 0) {
        message += `\n❌ Failed Payments:\n`;
        result.failed_details.forEach((detail, idx) => {
          message += `\n${idx + 1}. ${detail.employee_name} (Payroll ID: ${detail.payroll_id})\n`;
          message += `   Error: ${detail.error}\n`;
        });
      }
      
      message += `Payments are being processed. Status will update automatically via webhook.`;
      
      alert(message);
      fetchData();
    } catch (err) {
      console.error('Failed to process payments:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to process payments via RazorpayX';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    }
  };

  const handleDownloadBulkCSV = async () => {
    const month = window.prompt('Enter month (e.g., January):');
    if (!month) return;
    
    const yearInput = window.prompt('Enter year:');
    if (!yearInput) return;
    
    const year = parseInt(yearInput);
    if (isNaN(year)) {
      alert('Please enter a valid year');
      return;
    }

    try {
      setError(null);
      const csvContent = await payrollAPI.downloadBulkCSV(month.trim(), year);
      
      if (!csvContent || csvContent.trim() === '') {
        throw new Error('CSV file is empty. No payroll records found for the selected month and year.');
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `salary_disbursement_${month}_${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ CSV file downloaded successfully!\n\nFile: salary_disbursement_${month}_${year}.csv`);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      let errorMessage = 'Failed to download CSV file.';
      
      if (err.response) {
        if (err.response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to generate CSV files.';
        } else if (err.response.status === 404) {
          errorMessage = err.response.data?.detail || `No payroll records found for ${month} ${year}.`;
        } else {
          errorMessage = err.response.data?.detail || err.response.data?.message || `Error ${err.response.status}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const getEmployeeName = (employeeId) => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    if (safeEmployees.length === 0) {
      return `Employee #${employeeId}`;
    }
    const employee = safeEmployees.find(emp => emp && emp.employee_id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : `Employee #${employeeId}`;
  };

  const formatCurrency = (amount = 0) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  // Filter payrolls based on status
  const filteredPayrolls = filterStatus === 'all' 
    ? payrollRecords 
    : payrollRecords.filter(record => {
        const status = record.status || 'DRAFT';
        if (filterStatus === 'draft') return status === 'DRAFT';
        if (filterStatus === 'approved') return status === 'APPROVED';
        if (filterStatus === 'pending') return status === 'PENDING_APPROVAL';
        return true;
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payroll Processing</h1>
            <p className="text-gray-600">Process payroll payments created by HR</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-600 font-semibold text-sm">LIVE</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={handleDownloadBulkCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-md hover:shadow-lg"
          >
            <FiFileText className="w-4 h-4" />
            <span>Download Bulk CSV</span>
          </button>
          <button
            onClick={handleBulkProcessRazorpayX}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-md hover:shadow-lg"
          >
            <FiDollarSign className="w-4 h-4" />
            <span>Bulk Process via RazorpayX</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{payrollRecords.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <FiClock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollRecords.filter(r => (r.status || 'DRAFT') === 'DRAFT').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {payrollRecords.filter(r => (r.status || 'DRAFT') === 'APPROVED').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(payrollRecords.reduce((sum, r) => sum + (Number(r.net_pay) || 0), 0))}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({payrollRecords.length})
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'draft'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draft ({payrollRecords.filter(r => (r.status || 'DRAFT') === 'DRAFT').length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'approved'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({payrollRecords.filter(r => (r.status || 'DRAFT') === 'APPROVED').length})
          </button>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <FiDollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No payroll records to process</p>
                    <p className="text-sm text-gray-400 mt-1">Payrolls created by HR will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((record) => {
                  const status = record.status || 'DRAFT';
                  const paymentStatus = record.payment_status || 'PENDING';
                  const canProcess = status !== 'PAID' && paymentStatus !== 'COMPLETED';
                  
                  return (
                    <tr key={record.payroll_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <FiUser className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getEmployeeName(record.employee_id)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-24">
                        <WorkflowEmbed resourceType="payroll" resourceId={record.payroll_id} compact={true} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                          {record.month} {record.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.gross_salary || (record.base_salary + (record.bonus || 0)))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.total_deductions || record.deductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                        {formatCurrency(record.net_pay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                          status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          paymentStatus === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                          paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canProcess ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleProcessRazorpayX(record.payroll_id)}
                              className="text-purple-600 hover:text-purple-900 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                              title="Process via RazorpayX"
                            >
                              <FiDollarSign className="w-4 h-4 inline mr-1" />
                              RazorpayX
                            </button>
                            <button
                              onClick={() => handleMarkPaid(record.payroll_id)}
                              className="text-emerald-600 hover:text-emerald-900 px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Mark as Paid"
                            >
                              <FiCheck className="w-4 h-4 inline mr-1" />
                              Mark Paid
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
