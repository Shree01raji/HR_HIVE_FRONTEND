import React, { useState, useEffect } from 'react';

export default function PayrollView() {
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPayrollHistory();
  }, [selectedYear]);

  const fetchPayrollHistory = async () => {
    try {
      const response = await fetch(
        `/api/me/payroll?year=${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPayrollHistory(data);
      } else {
        throw new Error('Failed to fetch payroll history');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payrollId) => {
    try {
      const response = await fetch(
        `/api/me/payroll/${payrollId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip_${payrollId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download payslip');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Payroll History</h1>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Latest Payslip Card */}
      {payrollHistory[0] && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Latest Payslip</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Month</p>
              <p className="text-lg font-medium">{payrollHistory[0].month}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Salary</p>
              <p className="text-lg font-medium">
                ${payrollHistory[0].base_salary.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Pay</p>
              <p className="text-lg font-medium text-green-600">
                ${payrollHistory[0].net_pay.toFixed(2)}
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => downloadPayslip(payrollHistory[0].id)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Download Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll History Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Month
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Base Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Bonus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Deductions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Net Pay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payrollHistory.map((payroll) => (
              <tr key={payroll.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {payroll.month} {payroll.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${payroll.base_salary.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${payroll.bonus.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${payroll.deductions.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                  ${payroll.net_pay.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => downloadPayslip(payroll.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payrollHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No payroll records found for {selectedYear}
          </div>
        )}
      </div>

      {/* Earnings Breakdown */}
      {payrollHistory[0] && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Earnings Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Base Salary</span>
              <span className="font-medium">
                ${payrollHistory[0].base_salary.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bonus</span>
              <span className="font-medium text-green-600">
                +${payrollHistory[0].bonus.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Deductions</span>
              <span className="font-medium text-red-600">
                -${payrollHistory[0].deductions.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Net Pay</span>
                <span className="font-bold text-lg">
                  ${payrollHistory[0].net_pay.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
