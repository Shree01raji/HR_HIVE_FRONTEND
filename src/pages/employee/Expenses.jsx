import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiPlus, FiUpload, FiCheckCircle, FiX, FiEdit3, FiFileText } from 'react-icons/fi';
import { expensesAPI } from '../../services/api';
import WorkflowEmbed from '../../components/workflow/WorkflowEmbed';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Travel',
    description: '',
    amount: '',
    currency: 'INR',
    project_code: '',
    client_name: '',
    is_billable: false,
    payment_method: '',
    vendor_name: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await expensesAPI.getMyExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  // Basic client validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    setError('Only JPG, PNG or PDF files are allowed');
    return;
  }

  if (file.size > maxSize) {
    setError('File size must be less than 5MB');
    return;
  }

  setSelectedFile(file);
  setError('');
};


  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const formDataToSend = new FormData();

    // Append all expense fields
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]);
    });

    // Append file if exists
    if (selectedFile) {
      formDataToSend.append('receipt', selectedFile);
    }

    // Use the exported expensesAPI.createExpense to create a new expense (supports FormData)
    await expensesAPI.createExpense(formDataToSend);

    setShowForm(false);
    setSelectedFile(null);
    fetchExpenses();

  } catch (err) {
    setError('Failed to save expense');
  }
};


  const handleSubmitExpense = async (expenseId) => {
    try {
      await expensesAPI.submitExpense(expenseId);
      await fetchExpenses();
    } catch (err) {
      console.error('Error submitting expense:', err);
      setError(err.response?.data?.detail || 'Failed to submit expense');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'bg-gray-100 text-gray-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Paid: 'bg-purple-100 text-purple-800'
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Add Expense
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">New Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" name="expense_date" value={formData.expense_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Transport">Transport</option>
                  <option value="Communication">Communication</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Training">Training</option>
                  <option value="Medical">Medical</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" rows="3" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <input type="text" name="payment_method" value={formData.payment_method} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Cash/Card/Online" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                <input type="text" name="project_code" value={formData.project_code} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input type="text" name="vendor_name" value={formData.vendor_name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Upload Receipt (Image / PDF)
  </label>

  <input
    type="file"
    name="receipt"
    accept="image/*,.pdf"
    onChange={handleFileChange}
    className=" px-3 py-2 border rounded-lg bg-white"
  />

  {selectedFile && (
    <p className="text-sm text-gray-600 mt-1">
      Selected: {selectedFile.name}
    </p>
  )}
</div>
 
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_billable" checked={formData.is_billable} onChange={handleInputChange} />
                  <span className="text-sm font-medium text-gray-700">Billable to Client</span>
                </label>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700">
                Save Expense
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FiDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No expenses found</p>
            </div>
          ) : (
            expenses.map((expense) => (
              <div key={expense.expense_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{expense.description}</h3>
                    <p className="text-sm text-gray-600">{expense.category} • {new Date(expense.expense_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-teal-600">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(expense.status)}`}>
                      {expense.status}
                    </span>
                  </div>
                </div>
                    {expense.status === 'Draft' && (
                      <button
                        onClick={() => handleSubmitExpense(expense.expense_id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Submit for Approval
                      </button>
                    )}

                    {/* Workflow embed (compact) */}
                    <div className="mt-3">
                      <WorkflowEmbed resourceType="expenses" resourceId={expense.expense_id} compact={true} />
                    </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
