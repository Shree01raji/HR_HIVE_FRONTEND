import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { timesheetAPI } from '../../services/api';
import { FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function ConfirmWorking() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');
  const [status, setStatus] = useState('idle'); // idle | confirming | done | error | no_request
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!requestId) setStatus('no_request');
  }, [requestId]);

  const handleConfirm = async () => {
    if (!requestId) return;
    setStatus('confirming');
    setMessage('');
    try {
      await timesheetAPI.confirmWorking(parseInt(requestId, 10));
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setMessage(e.response?.data?.detail || 'Failed to confirm.');
    }
  };

  if (!requestId || status === 'no_request') {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
        <p className="text-gray-600 dark:text-gray-400">No confirmation request found. If you received a notification, use the link from it.</p>
        <a href="/employee/timesheet" className="mt-4 inline-block text-blue-600 hover:underline">Back to Timesheet</a>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow text-center">
        <FiCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Thanks!</h2>
        <p className="text-gray-600 dark:text-gray-400">Your working confirmation has been recorded.</p>
        <a href="/employee/timesheet" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Timesheet</a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Confirm you're working</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Please confirm that you are currently working.</p>
      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center gap-2 text-red-700 dark:text-red-300">
          <FiAlertCircle className="flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      <button
        onClick={handleConfirm}
        disabled={status === 'confirming'}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        {status === 'confirming' ? 'Confirming…' : "Yes, I'm working"}
      </button>
      <a href="/employee/timesheet" className="mt-4 block text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-400">Cancel</a>
    </div>
  );
}
