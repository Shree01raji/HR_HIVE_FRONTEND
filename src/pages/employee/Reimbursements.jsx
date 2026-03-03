import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiClock } from 'react-icons/fi';
import { reimbursementAPI, expensesAPI } from '../../services/api';

export default function Reimbursements() {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const data = await reimbursementAPI.getMyReimbursements();
      setReimbursements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching reimbursements:', err);
      setError('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'bg-gray-100 text-gray-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Processed: 'bg-purple-100 text-purple-800',
      Paid: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Reimbursements</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {reimbursements.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No reimbursements found</p>
          <p className="text-sm text-gray-500 mt-2">Reimbursements are created from approved expenses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reimbursements.map((reimbursement) => (
            <div key={reimbursement.reimbursement_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{reimbursement.title}</h3>
                  <p className="text-sm text-gray-600">#{reimbursement.reimbursement_number}</p>
                  {reimbursement.description && (
                    <p className="text-sm text-gray-500 mt-1">{reimbursement.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-teal-600">₹{parseFloat(reimbursement.total_amount).toLocaleString('en-IN')}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(reimbursement.status)}`}>
                    {reimbursement.status}
                  </span>
                </div>
              </div>
              {reimbursement.expenses && reimbursement.expenses.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Expenses Included:</p>
                  <div className="space-y-2">
                    {reimbursement.expenses.map((expense) => (
                      <div key={expense.expense_id} className="text-sm text-gray-600">
                        {expense.description} - ₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reimbursement.paid_at && (
                <div className="mt-4 text-sm text-green-600">
                  Paid on: {new Date(reimbursement.paid_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
