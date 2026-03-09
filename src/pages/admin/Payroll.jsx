import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiDollarSign, FiCalendar, FiUser, FiDownload, FiCheck, FiX } from 'react-icons/fi';
import { payrollAPI, employeeAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';
import { useUpgradePrompt } from '../../hooks/useUpgradePrompt';
import UpgradePrompt from '../../components/admin/UpgradePrompt';

export default function Payroll() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const { upgradePrompt, handleError, closePrompt } = useUpgradePrompt();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    month: '',
    year: new Date().getFullYear(),
    // Salary Structure
    basic_salary: '',
    hra: '',
    da: '',
    ta: '',
    medical_allowance: '',
    other_allowances: '',
    // Earnings
    overtime_earnings: '',
    bonus_incentives: '',
    holiday_shift_pay: '',
    arrears: '',
    // Deductions
    pf: '',
    esi: '',
    tds: '',
    professional_tax: '',
    labour_welfare_fund: '',
    other_deductions: '',
    // Payment Info
    payment_method: '',
    bank_account_number: '',
    ifsc_code: '',
    upi_id: '',
    // Legacy fields
    base_salary: '',
    bonus: '',
    deductions: '',
    net_pay: ''
  });
  const [activeTab, setActiveTab] = useState('salary');

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
      
      // CRITICAL: Ensure payrollData is an array
      let safePayrollData = [];
      if (payrollData == null) {
        console.warn('[Payroll] ⚠️ Payroll data is null/undefined, using empty array');
        safePayrollData = [];
      } else if (Array.isArray(payrollData)) {
        safePayrollData = payrollData;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.data)) {
        console.log('[Payroll] ✅ Found nested data array');
        safePayrollData = payrollData.data;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.payroll)) {
        console.log('[Payroll] ✅ Found payroll array');
        safePayrollData = payrollData.payroll;
      } else if (typeof payrollData === 'object' && Array.isArray(payrollData.records)) {
        console.log('[Payroll] ✅ Found records array');
        safePayrollData = payrollData.records;
      } else {
        console.error('[Payroll] ❌ CRITICAL: Payroll data is not an array and cannot be normalized!', typeof payrollData, payrollData);
        safePayrollData = [];
      }
      
      // CRITICAL: Ensure employeeData is an array
      let safeEmployeeData = [];
      if (employeeData == null) {
        console.warn('[Payroll] ⚠️ Employee data is null/undefined, using empty array');
        safeEmployeeData = [];
      } else if (Array.isArray(employeeData)) {
        safeEmployeeData = employeeData;
      } else if (typeof employeeData === 'object' && Array.isArray(employeeData.data)) {
        console.log('[Payroll] ✅ Found nested employee data array');
        safeEmployeeData = employeeData.data;
      } else if (typeof employeeData === 'object' && Array.isArray(employeeData.employees)) {
        console.log('[Payroll] ✅ Found employees array');
        safeEmployeeData = employeeData.employees;
      } else {
        console.error('[Payroll] ❌ CRITICAL: Employee data is not an array and cannot be normalized!', typeof employeeData, employeeData);
        safeEmployeeData = [];
      }
      
      setPayrollRecords(safePayrollData);
      setEmployees(safeEmployeeData);
      
      // Fetch workflows for each payroll record
      const workflowMap = {};
      for (const record of (safePayrollData || [])) {
        try {
          const recordWorkflows = await workflowAPI.getInstances('payroll', record.payroll_id);
          if (recordWorkflows?.length > 0) {
            workflowMap[record.payroll_id] = recordWorkflows[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch workflow for payroll ${record.payroll_id}:`, err);
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load payroll data');
      setPayrollRecords([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Helper function to safely parse float
      const safeParseFloat = (value, defaultValue = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      // Get basic salary - it's required
      const basicSalary = safeParseFloat(formData.basic_salary || formData.base_salary);
      if (basicSalary <= 0) {
        setError('Basic Salary is required and must be greater than 0');
        return;
      }
      
      // Validate required fields
      if (!formData.employee_id) {
        setError('Employee is required');
        return;
      }
      if (!formData.month) {
        setError('Month is required');
        return;
      }
      if (!formData.year || isNaN(parseInt(formData.year))) {
        setError('Year is required and must be a valid number');
        return;
      }
      
      // Helper to convert empty strings to null for optional fields
      const nullIfEmpty = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const trimmed = String(value).trim();
        return trimmed === '' ? null : trimmed;
      };
      
      // Helper to convert payment_method enum
      const getPaymentMethod = (value) => {
        const validMethods = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH'];
        const trimmed = nullIfEmpty(value);
        if (!trimmed) return null;
        return validMethods.includes(trimmed) ? trimmed : null;
      };
      
      const payrollData = {
        employee_id: parseInt(formData.employee_id),
        month: String(formData.month).trim(),
        year: parseInt(formData.year),
        // Salary Structure - basic_salary is required
        basic_salary: basicSalary,
        hra: safeParseFloat(formData.hra),
        da: safeParseFloat(formData.da),
        ta: safeParseFloat(formData.ta),
        medical_allowance: safeParseFloat(formData.medical_allowance),
        other_allowances: safeParseFloat(formData.other_allowances),
        // Earnings
        overtime_earnings: safeParseFloat(formData.overtime_earnings),
        bonus_incentives: safeParseFloat(formData.bonus_incentives || formData.bonus),
        holiday_shift_pay: safeParseFloat(formData.holiday_shift_pay),
        arrears: safeParseFloat(formData.arrears),
        // Deductions
        pf: safeParseFloat(formData.pf),
        esi: safeParseFloat(formData.esi),
        tds: safeParseFloat(formData.tds),
        professional_tax: safeParseFloat(formData.professional_tax),
        labour_welfare_fund: safeParseFloat(formData.labour_welfare_fund),
        other_deductions: safeParseFloat(formData.other_deductions),
        // Payment Info - convert empty strings to null and validate enum
        payment_method: getPaymentMethod(formData.payment_method),
        bank_account_number: nullIfEmpty(formData.bank_account_number),
        ifsc_code: nullIfEmpty(formData.ifsc_code),
        upi_id: nullIfEmpty(formData.upi_id),
        // Legacy fields for backward compatibility
        base_salary: basicSalary,
        bonus: safeParseFloat(formData.bonus_incentives || formData.bonus),
        deductions: safeParseFloat(formData.other_deductions || formData.deductions)
      };
      
      console.log('Submitting payroll data:', JSON.stringify(payrollData, null, 2));
      
      if (editingRecord) {
        await payrollAPI.update(editingRecord.payroll_id, payrollData);
      } else {
        await payrollAPI.create(payrollData);
      }
      
      setShowModal(false);
      setEditingRecord(null);
      resetFormData();
      fetchData();
    } catch (err) {
      console.error('Failed to save payroll record:', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to save payroll record';
      
      if (err.response?.data) {
        console.error('Full error response:', JSON.stringify(err.response.data, null, 2));
        
        // Handle Pydantic validation errors
        if (err.response.data.detail) {
          if (Array.isArray(err.response.data.detail)) {
            // Multiple validation errors - format them nicely
            const errorList = err.response.data.detail.map(e => {
              const field = e.field || (e.loc ? e.loc.join('.') : 'unknown');
              const msg = e.message || e.msg || 'Validation error';
              return `• ${field}: ${msg}`;
            });
            errorMessage = `Validation errors:\n${errorList.join('\n')}`;
          } else if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail;
          } else {
            errorMessage = JSON.stringify(err.response.data.detail, null, 2);
          }
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          // Fallback: show the entire error object
          errorMessage = JSON.stringify(err.response.data, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check if it's a limit exceeded error and show upgrade prompt
      const handled = await handleError(err, 'MAX_PAYROLL_RUNS_PER_MONTH');
      if (!handled) {
        // Not a limit error or couldn't show prompt, show regular error
        setError(errorMessage);
      }
    }
  };

  const resetFormData = () => {
      setFormData({
        employee_id: '',
        month: '',
        year: new Date().getFullYear(),
      basic_salary: '',
      hra: '',
      da: '',
      ta: '',
      medical_allowance: '',
      other_allowances: '',
      overtime_earnings: '',
      bonus_incentives: '',
      holiday_shift_pay: '',
      arrears: '',
      pf: '',
      esi: '',
      tds: '',
      professional_tax: '',
      labour_welfare_fund: '',
      other_deductions: '',
      payment_method: '',
      bank_account_number: '',
      ifsc_code: '',
      upi_id: '',
        base_salary: '',
        bonus: '',
        deductions: '',
        net_pay: ''
      });
    setActiveTab('salary');
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id.toString(),
      month: record.month,
      year: record.year,
      // Salary Structure
      basic_salary: (record.basic_salary || record.base_salary || 0).toString(),
      hra: (record.hra || 0).toString(),
      da: (record.da || 0).toString(),
      ta: (record.ta || 0).toString(),
      medical_allowance: (record.medical_allowance || 0).toString(),
      other_allowances: (record.other_allowances || 0).toString(),
      // Earnings
      overtime_earnings: (record.overtime_earnings || 0).toString(),
      bonus_incentives: (record.bonus_incentives || record.bonus || 0).toString(),
      holiday_shift_pay: (record.holiday_shift_pay || 0).toString(),
      arrears: (record.arrears || 0).toString(),
      // Deductions
      pf: (record.pf || 0).toString(),
      esi: (record.esi || 0).toString(),
      tds: (record.tds || 0).toString(),
      professional_tax: (record.professional_tax || 0).toString(),
      labour_welfare_fund: (record.labour_welfare_fund || 0).toString(),
      other_deductions: (record.other_deductions || 0).toString(),
      // Payment Info
      payment_method: record.payment_method || '',
      bank_account_number: record.bank_account_number || '',
      ifsc_code: record.ifsc_code || '',
      upi_id: record.upi_id || '',
      // Legacy
      base_salary: (record.base_salary || record.basic_salary || 0).toString(),
      bonus: (record.bonus || record.bonus_incentives || 0).toString(),
      deductions: (record.deductions || record.total_deductions || 0).toString(),
      net_pay: (record.net_pay || 0).toString()
    });
    setShowModal(true);
  };

  // Approval/rejection removed - payroll records can be paid directly after generation

  const handleMarkPaid = async (payrollId) => {
    // Find the payroll record
    const record = payrollRecords.find(r => r.payroll_id === payrollId);
    
    // Check if payment details are missing
    const missingPaymentDetails = !record?.payment_method || 
      (record?.payment_method === 'BANK_TRANSFER' && (!record?.bank_account_number || !record?.ifsc_code)) ||
      (record?.payment_method === 'UPI' && !record?.upi_id);
    
    if (missingPaymentDetails) {
      const addDetails = window.confirm(
        'Payment details are missing. Would you like to add them now?\n\n' +
        'Click OK to edit and add payment details, or Cancel to mark as paid without details.'
      );
      
      if (addDetails) {
        // Open edit modal with payment tab active
        handleEdit(record);
        setActiveTab('payment');
        return;
      }
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


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payroll record?')) {
      try {
        await payrollAPI.delete(id);
        fetchData();
      } catch (err) {
        console.error('Failed to delete payroll record:', err);
        setError('Failed to delete payroll record');
      }
    }
  };

  const getEmployeeName = (employeeId) => {
    // CRITICAL: Ensure employees is an array before calling .find()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't block the entire page on error - show it as a banner instead
  // if (error) {
  //   return (
  //     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
  //       <p className="text-red-800">{error}</p>
  //       <button 
  //         onClick={fetchData}
  //         className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
  //       >
  //         Retry
  //       </button>
  //     </div>
  //   );
  // }

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1 whitespace-pre-wrap">{error}</p>
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
      
      {/* Header - Compact */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payroll Management</h2>
          <p className="text-sm text-gray-600">Manage employee payroll records and compensation</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1 px-3 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Payroll Records Table - Compact and Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary (₹)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions (₹)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay (₹)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!Array.isArray(payrollRecords) || payrollRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    <FiDollarSign className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium">No payroll records found</p>
                    <p className="text-xs">Click "Add Record" to create the first record</p>
                  </td>
                </tr>
              ) : (
                (Array.isArray(payrollRecords) ? payrollRecords : []).map((record) => {
                  const workflow = workflows[record.payroll_id];
                  return (
                    <React.Fragment key={record.payroll_id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <FiUser className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="text-xs font-medium text-gray-900">
                            {getEmployeeName(record.employee_id)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiCalendar className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-900">
                          {record.month} {record.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatCurrency(record.gross_salary || (record.base_salary + (record.bonus || 0)))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatCurrency(record.total_deductions || record.deductions)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-green-600">
                      {formatCurrency(record.net_pay)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                        record.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        record.status === 'PROCESSED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.payment_status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        record.payment_status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        record.payment_status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.payment_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <FiEdit className="h-3 w-3" />
                        </button>
                        {record.status !== 'PAID' && record.payment_status !== 'COMPLETED' ? (
                          <>
                            <button
                              onClick={() => handleProcessRazorpayX(record.payroll_id)}
                              className="text-purple-600 hover:text-purple-900 mr-2"
                              title="Process via RazorpayX"
                            >
                              <FiDollarSign className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleMarkPaid(record.payroll_id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Mark as Paid (Manual)"
                            >
                              <FiCheck className="h-3 w-3" />
                            </button>
                          </>
                        ) : null}
                        {workflow && (
                          <button
                            onClick={() => setExpandedWorkflow(expandedWorkflow === record.payroll_id ? null : record.payroll_id)}
                            className="text-green-600 hover:text-green-900"
                            title="View Workflow"
                          >
                            <FiFileText className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(record.payroll_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FiTrash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedWorkflow === record.payroll_id && workflow && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="px-6 py-4">
                        <div className="space-y-4">
                          <WorkflowStatusCard workflow={workflow} />
                          <div>
                            <h4 className="font-semibold mb-3 text-sm">Approval Steps</h4>
                            <WorkflowDiagram steps={workflow.steps} compact={true} />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 text-sm">History</h4>
                            <WorkflowTimeline events={workflow.events} steps={workflow.steps} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
              {editingRecord ? 'Edit Payroll Record' : 'Add Payroll Record'}
            </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRecord(null);
                  setError(null);
                  resetFormData();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            {/* Error message in modal */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-800 font-medium text-sm">Validation Error</p>
                <p className="text-red-700 text-xs mt-1 whitespace-pre-wrap">{error}</p>
              </div>
            )}
            
            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('salary')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'salary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                Salary Structure
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('earnings')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'earnings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                Earnings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('deductions')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'deductions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                Deductions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payment')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'payment' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                Payment
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Payment Workflow:</strong>
                </p>
                <ol className="text-xs text-blue-700 mt-2 ml-4 list-decimal space-y-1">
                  <li><strong>Create Payroll</strong> - Enter salary details (bank details auto-fill from employee profile)</li>
                  <li><strong>Process Payment</strong> - Use "Process via RazorpayX" button in the Actions column to pay directly</li>
                  <li><strong>Mark as Paid</strong> - After payments are processed, mark records as paid with transaction ID</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Note:</strong> The system generates payment files. Your <strong>company's bank account</strong> is used to transfer money to employees via bank portal.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={formData.employee_id}
                  onChange={async (e) => {
                    const selectedEmployeeId = e.target.value;
                    
                    // Update employee_id immediately
                    const updatedFormData = {
                      ...formData,
                      employee_id: selectedEmployeeId
                    };
                    
                    // Fetch fresh employee data to get latest bank details (real-time)
                    if (selectedEmployeeId) {
                      try {
                        const freshEmployeeData = await employeeAPI.get(parseInt(selectedEmployeeId));
                        
                        // Auto-populate bank details from fresh employee profile
                        if (freshEmployeeData) {
                          // Only auto-populate if form fields are empty (don't overwrite user input)
                          if (!formData.bank_account_number && freshEmployeeData.bank_account_number) {
                            updatedFormData.bank_account_number = freshEmployeeData.bank_account_number;
                          }
                          if (!formData.ifsc_code && freshEmployeeData.ifsc_code) {
                            updatedFormData.ifsc_code = freshEmployeeData.ifsc_code;
                          }
                          if (!formData.upi_id && freshEmployeeData.upi_id) {
                            updatedFormData.upi_id = freshEmployeeData.upi_id;
                          }
                          if (!formData.payment_method && freshEmployeeData.preferred_payment_method) {
                            updatedFormData.payment_method = freshEmployeeData.preferred_payment_method;
                          }
                        }
                      } catch (err) {
                        console.warn('Failed to fetch fresh employee data, using cached data:', err);
                        // Fallback to cached employee data
                        const selectedEmployee = (Array.isArray(employees) ? employees : []).find(
                          emp => emp?.employee_id === parseInt(selectedEmployeeId)
                        );
                        
                        if (selectedEmployee) {
                          if (!formData.bank_account_number && selectedEmployee.bank_account_number) {
                            updatedFormData.bank_account_number = selectedEmployee.bank_account_number;
                          }
                          if (!formData.ifsc_code && selectedEmployee.ifsc_code) {
                            updatedFormData.ifsc_code = selectedEmployee.ifsc_code;
                          }
                          if (!formData.upi_id && selectedEmployee.upi_id) {
                            updatedFormData.upi_id = selectedEmployee.upi_id;
                          }
                          if (!formData.payment_method && selectedEmployee.preferred_payment_method) {
                            updatedFormData.payment_method = selectedEmployee.preferred_payment_method;
                          }
                        }
                      }
                    }
                    
                    setFormData(updatedFormData);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Employee</option>
                  {(Array.isArray(employees) ? employees : []).map((employee) => (
                    <option key={employee?.employee_id} value={employee?.employee_id}>
                      {employee?.first_name} {employee?.last_name} (ID: {employee?.employee_id})
                    </option>
                  ))}
                </select>
                {/* Show bank details info */}
                {formData.employee_id && (
                  <div className="mt-2">
                    {formData.bank_account_number && formData.ifsc_code ? (
                      <p className="text-xs text-green-600">
                        ✓ Bank details auto-filled from employee profile (real-time)
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-600">
                        ⚠️ Employee bank details not found. Please ask employee to update their profile.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Month</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              {/* Salary Structure Tab */}
              {activeTab === 'salary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basic Salary (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                        value={formData.basic_salary || formData.base_salary}
                        onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value, base_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                />
              </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HRA - House Rent Allowance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.hra}
                        onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DA - Dearness Allowance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.da}
                        onChange={(e) => setFormData({ ...formData, da: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TA - Travel Allowance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.ta}
                        onChange={(e) => setFormData({ ...formData, ta: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medical Allowance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.medical_allowance}
                        onChange={(e) => setFormData({ ...formData, medical_allowance: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Allowances (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.other_allowances}
                        onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Earnings Tab */}
              {activeTab === 'earnings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overtime Earnings (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.overtime_earnings}
                        onChange={(e) => setFormData({ ...formData, overtime_earnings: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bonus / Incentives (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bonus_incentives || formData.bonus}
                        onChange={(e) => setFormData({ ...formData, bonus_incentives: e.target.value, bonus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Holiday / Night Shift Pay (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                        value={formData.holiday_shift_pay}
                        onChange={(e) => setFormData({ ...formData, holiday_shift_pay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arrears (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.arrears}
                        onChange={(e) => setFormData({ ...formData, arrears: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Salary corrections from previous months</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deductions Tab */}
              {activeTab === 'deductions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PF - Provident Fund (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pf}
                        onChange={(e) => setFormData({ ...formData, pf: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ESI - Employee State Insurance (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.esi}
                        onChange={(e) => setFormData({ ...formData, esi: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TDS / Income Tax (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tds}
                        onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Professional Tax (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.professional_tax}
                        onChange={(e) => setFormData({ ...formData, professional_tax: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Labour Welfare Fund (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                        value={formData.labour_welfare_fund}
                        onChange={(e) => setFormData({ ...formData, labour_welfare_fund: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Deductions (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                        value={formData.other_deductions || formData.deductions}
                        onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value, deductions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Payment details are optional during payroll creation. 
                      You can add them later when processing the payment. However, bank details are 
                      required for generating bulk disbursement files (CSV/XML) for bank uploads.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Payment Method (Optional)</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                <p className="text-xs text-gray-500 mt-1">
                      Select payment method if known. Can be updated later.
                </p>
              </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Bank Details (For Bank Transfer)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional - Add later if needed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Required for bulk bank transfer files
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={formData.ifsc_code}
                          onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional - Add later if needed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Required for bulk bank transfer files
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">UPI Details (For UPI Payment)</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional - e.g., name@paytm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Required if using UPI payment method
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 Tip:</strong> You can create payroll records without payment details and add them later 
                      when you're ready to process payments. Payment details are only required when:
                      <ul className="list-disc list-inside mt-1 ml-2">
                        <li>Generating bulk disbursement files (CSV/XML)</li>
                        <li>Marking payroll as "Paid"</li>
                      </ul>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRecord(null);
                    resetFormData();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRecord ? 'Update' : 'Create'} Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {upgradePrompt && (
        <UpgradePrompt
          {...upgradePrompt}
          onClose={closePrompt}
        />
      )}
    </div>
  );
}
