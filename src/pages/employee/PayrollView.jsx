import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar } from 'react-icons/fi';
import { payrollAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

export default function PayrollView() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [expandedPayslip, setExpandedPayslip] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);

  const formatINR = (value = 0) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  useEffect(() => {
    fetchPayrollData();
  }, [selectedYear]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await payrollAPI.getMyPayroll();
      console.log('Payroll data received:', data);
      
      // Filter by year using the year field
      const yearData = data.filter(p => p.year === parseInt(selectedYear));
      setPayrollData(yearData);
      
      // Set the most recent payslip (first in the list)
      if (data.length > 0) {
        setLatestPayslip(data[0]);
      }
      
      // Fetch workflows for each payroll record
      const workflowMap = {};
      for (const payslip of (data || [])) {
        try {
          const payslipWorkflows = await workflowAPI.getInstances('payroll', payslip.payroll_id);
          if (payslipWorkflows?.length > 0) {
            workflowMap[payslip.payroll_id] = payslipWorkflows[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch workflow for payroll ${payslip.payroll_id}:`, err);
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
      setError('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="text-gray-600 dark:text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Use the HR Assistant chat to download payslips</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm"
          >
            {[2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400 dark:text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Need to download payslips?</strong> Use the HR Assistant chat (bottom right corner) to download your payslips. Type "download my payslip" to get started.
            </p>
          </div>
        </div>
      </div>

      {/* Latest Payslip Card */}
      {latestPayslip && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Latest Payslip</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Pay period: <span className="font-medium dark:text-white">{latestPayslip.month} {latestPayslip.year}</span>
            </p>
          </div>
          
          {(() => {
            // Get all salary components
            const basicSalary = Number(latestPayslip.basic_salary || latestPayslip.base_salary || 0);
            const hra = Number(latestPayslip.hra || 0);
            const da = Number(latestPayslip.da || 0);
            const ta = Number(latestPayslip.ta || 0);
            const medicalAllowance = Number(latestPayslip.medical_allowance || 0);
            const otherAllowances = Number(latestPayslip.other_allowances || 0);
            
            // Get all earnings
            const overtimeEarnings = Number(latestPayslip.overtime_earnings || 0);
            const bonusIncentives = Number(latestPayslip.bonus_incentives || latestPayslip.bonus || 0);
            const holidayShiftPay = Number(latestPayslip.holiday_shift_pay || 0);
            const arrears = Number(latestPayslip.arrears || 0);
            
            // Get gross salary
            const grossSalary = Number(latestPayslip.gross_salary || 
              (basicSalary + hra + da + ta + medicalAllowance + otherAllowances + 
               overtimeEarnings + bonusIncentives + holidayShiftPay + arrears));
            
            // Get all deductions
            const pf = Number(latestPayslip.pf || 0);
            const esi = Number(latestPayslip.esi || 0);
            const tds = Number(latestPayslip.tds || 0);
            const professionalTax = Number(latestPayslip.professional_tax || 0);
            const labourWelfareFund = Number(latestPayslip.labour_welfare_fund || 0);
            const otherDeductions = Number(latestPayslip.other_deductions || 0);
            const totalDeductions = Number(latestPayslip.total_deductions || latestPayslip.deductions || 0);
            
            const netPay = Number(latestPayslip.net_pay || 0);
            
            // Build earnings breakdown
            const earningsRows = [
              { label: 'Basic Salary', amount: basicSalary },
              ...(hra > 0 ? [{ label: 'HRA (House Rent Allowance)', amount: hra }] : []),
              ...(da > 0 ? [{ label: 'DA (Dearness Allowance)', amount: da }] : []),
              ...(ta > 0 ? [{ label: 'TA (Travel Allowance)', amount: ta }] : []),
              ...(medicalAllowance > 0 ? [{ label: 'Medical Allowance', amount: medicalAllowance }] : []),
              ...(otherAllowances > 0 ? [{ label: 'Other Allowances', amount: otherAllowances }] : []),
              ...(overtimeEarnings > 0 ? [{ label: 'Overtime Earnings', amount: overtimeEarnings }] : []),
              ...(bonusIncentives > 0 ? [{ label: 'Bonus / Incentives', amount: bonusIncentives }] : []),
              ...(holidayShiftPay > 0 ? [{ label: 'Holiday / Night Shift Pay', amount: holidayShiftPay }] : []),
              ...(arrears > 0 ? [{ label: 'Arrears', amount: arrears }] : []),
              { label: 'Gross Salary', amount: grossSalary, highlight: true },
            ];
            
            // Build deductions breakdown
            const deductionsRows = [
              ...(pf > 0 ? [{ label: 'PF (Provident Fund)', amount: pf }] : []),
              ...(esi > 0 ? [{ label: 'ESI (Employee State Insurance)', amount: esi }] : []),
              ...(tds > 0 ? [{ label: 'TDS / Income Tax', amount: tds }] : []),
              ...(professionalTax > 0 ? [{ label: 'Professional Tax', amount: professionalTax }] : []),
              ...(labourWelfareFund > 0 ? [{ label: 'Labour Welfare Fund', amount: labourWelfareFund }] : []),
              ...(otherDeductions > 0 ? [{ label: 'Other Deductions', amount: otherDeductions }] : []),
              { label: 'Total Deductions', amount: totalDeductions, highlight: true },
            ];

            return (
              <div className="space-y-4">
                {/* Earnings Section */}
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-slate-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300">EARNINGS</h3>
                  </div>
                <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                      {earningsRows.map((row) => (
                      <tr
                        key={row.label}
                        className={row.highlight ? 'bg-emerald-50/60 dark:bg-emerald-900/30 font-semibold text-slate-900 dark:text-white' : undefined}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{row.label}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-800 dark:text-white">
                          {formatINR(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
                {/* Deductions Section */}
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-slate-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300">DEDUCTIONS</h3>
                  </div>
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                      {deductionsRows.length > 0 ? deductionsRows.map((row) => (
                        <tr
                          key={row.label}
                          className={row.highlight ? 'bg-red-50/60 dark:bg-red-900/30 font-semibold text-slate-900 dark:text-white' : undefined}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{row.label}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-800 dark:text-white">
                            {formatINR(row.amount)}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="2" className="px-4 py-3 text-sm text-slate-500 dark:text-gray-400 text-center">
                            No deductions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Net Pay */}
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-900 dark:text-green-300">Net Pay</span>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {formatINR(netPay)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Download the detailed payslip PDF from the HR Assistant chat for a complete statement.
          </p>
        </div>
      )}

      {/* Payroll History Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payroll History</h2>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Gross Salary (₹)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Deductions (₹)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Net Pay (₹)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {payrollData.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <FiDollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-lg font-medium">No payroll records found</p>
                  <p className="text-sm">No payroll data available for {selectedYear}</p>
                </td>
              </tr>
            ) : (
              payrollData.map((payslip) => (
                <React.Fragment key={payslip.payroll_id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setExpandedPayslip(expandedPayslip === payslip.payroll_id ? null : payslip.payroll_id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiCalendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="font-medium dark:text-white">{payslip.month} {payslip.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 dark:text-white">
                      {formatINR(payslip.gross_salary || (payslip.base_salary + (payslip.bonus || 0)))}
                    </td>
                    <td className="px-6 py-4 dark:text-white">
                      {formatINR(payslip.total_deductions || payslip.deductions)}
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400">
                      {formatINR(payslip.net_pay)}
                    </td>
                  </tr>
                  {expandedPayslip === payslip.payroll_id && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Earnings Breakdown */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">Earnings</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between dark:text-gray-300">
                                <span>Basic Salary:</span>
                                <span>{formatINR(payslip.basic_salary || payslip.base_salary)}</span>
                              </div>
                              {payslip.hra > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>HRA:</span>
                                  <span>{formatINR(payslip.hra)}</span>
                                </div>
                              )}
                              {payslip.da > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>DA:</span>
                                  <span>{formatINR(payslip.da)}</span>
                                </div>
                              )}
                              {payslip.ta > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>TA:</span>
                                  <span>{formatINR(payslip.ta)}</span>
                                </div>
                              )}
                              {payslip.bonus_incentives > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>Bonus/Incentives:</span>
                                  <span>{formatINR(payslip.bonus_incentives)}</span>
                                </div>
                              )}
                              {payslip.overtime_earnings > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>Overtime:</span>
                                  <span>{formatINR(payslip.overtime_earnings)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Deductions Breakdown */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-red-700 dark:text-red-400">Deductions</h4>
                            <div className="space-y-1 text-sm">
                              {payslip.pf > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>PF:</span>
                                  <span>{formatINR(payslip.pf)}</span>
                                </div>
                              )}
                              {payslip.esi > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>ESI:</span>
                                  <span>{formatINR(payslip.esi)}</span>
                                </div>
                              )}
                              {payslip.tds > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>TDS:</span>
                                  <span>{formatINR(payslip.tds)}</span>
                                </div>
                              )}
                              {payslip.professional_tax > 0 && (
                                <div className="flex justify-between dark:text-gray-300">
                                  <span>Professional Tax:</span>
                                  <span>{formatINR(payslip.professional_tax)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Workflow Display */}
                        {workflows[payslip.payroll_id] && (
                          <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                            <h4 className="font-semibold text-sm mb-3 dark:text-white">Approval Workflow</h4>
                            <div className="space-y-4">
                              <WorkflowStatusCard workflow={workflows[payslip.payroll_id]} />
                              <div>
                                <h5 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">Approval Steps</h5>
                                <WorkflowDiagram steps={workflows[payslip.payroll_id].steps} compact={true} />
                              </div>
                              <div>
                                <h5 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">History</h5>
                                <WorkflowTimeline events={workflows[payslip.payroll_id].events} steps={workflows[payslip.payroll_id].steps} />
                              </div>
                            </div>
                          </div>
                        )}
                  </td>
                </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
