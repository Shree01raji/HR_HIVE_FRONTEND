import React, { useState, useEffect } from 'react';
import { 
  FiEye, FiClock, FiAlertTriangle, FiCheckCircle, FiXCircle, 
  FiTrendingUp, FiUsers, FiBarChart, FiFilter, FiSearch
} from 'react-icons/fi';
import { questionBankAPI } from '../../services/api';

export default function TestMonitoring() {
  // Test monitoring component
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchTests();
  }, [filters]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await questionBankAPI.getTestMonitoring({ status: filters.status });
      setTests(data);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'expired': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSuspiciousLevel = (count) => {
    if (count === 0) return { level: 'Low', color: 'text-green-600' };
    if (count < 3) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'High', color: 'text-red-600' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Monitoring</h1>
          <p className="text-gray-600 mt-1">Monitor candidate test sessions and behavior</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
            </div>
            <FiUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <FiClock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => t.status === 'completed').length}
              </p>
            </div>
            <FiCheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspicious</p>
              <p className="text-2xl font-bold text-gray-900">
                {tests.filter(t => (t.suspicious_activities || 0) > 0).length}
              </p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suspicious</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tests.map((test) => {
                const suspicious = getSuspiciousLevel(test.suspicious_activities || 0);
                return (
                  <tr key={test.test_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{test.candidate_name}</p>
                        <p className="text-sm text-gray-500">{test.candidate_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">
                        {test.template?.template_name || `Test #${test.test_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {test.score !== null ? (
                        <span className="font-medium text-gray-900">{test.score}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {test.time_taken_minutes ? (
                        <span className="text-sm text-gray-600">{test.time_taken_minutes} min</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${suspicious.color}`}>
                          {suspicious.level}
                        </span>
                        {(test.suspicious_activities || 0) > 0 && (
                          <span className="text-xs text-red-600">
                            ({test.suspicious_activities} activities)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedTest(test)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Detail Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Test Details</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Candidate Information</h3>
                <p><strong>Name:</strong> {selectedTest.candidate_name}</p>
                <p><strong>Email:</strong> {selectedTest.candidate_email}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Test Results</h3>
                <p><strong>Score:</strong> {selectedTest.score}%</p>
                <p><strong>Correct Answers:</strong> {selectedTest.correct_answers}/{selectedTest.total_questions}</p>
                <p><strong>Time Taken:</strong> {selectedTest.time_taken_minutes} minutes</p>
              </div>
              
              {selectedTest.behavior_logs && selectedTest.behavior_logs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Behavior Logs</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedTest.behavior_logs.map((log, idx) => (
                      <div key={idx} className={`p-3 rounded border ${
                        log.is_suspicious ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{log.activity_type}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                            {log.details && (
                              <pre className="text-xs mt-1 text-gray-500">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                          {log.is_suspicious && (
                            <FiAlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedTest(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

