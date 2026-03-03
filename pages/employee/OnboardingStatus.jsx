import React, { useState, useEffect } from 'react';

export default function OnboardingStatus() {
  const [onboardingData, setOnboardingData] = useState({
    progress: 0,
    tasks: [],
    documents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch('/api/me/onboarding_status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOnboardingData(data);
      } else {
        throw new Error('Failed to fetch onboarding status');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      const response = await fetch(
        `/api/me/onboarding/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.ok) {
        fetchOnboardingData();
      } else {
        throw new Error('Failed to update task status');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDocumentUpload = async (taskId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/me/onboarding/documents/${taskId}/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );
      if (response.ok) {
        fetchOnboardingData();
      } else {
        throw new Error('Failed to upload document');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Progress</h1>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {onboardingData.progress}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${onboardingData.progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        <div className="space-y-4">
          {onboardingData.tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border ${
                task.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div
                    className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      task.completed
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300'
                    }`}
                  >
                    {task.completed && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{task.name}</h3>
                    <p className="text-sm text-gray-500">{task.description}</p>
                    {task.due_date && (
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {!task.completed && (
                  <button
                    onClick={() => handleTaskComplete(task.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
          {onboardingData.tasks.length === 0 && (
            <p className="text-center text-gray-500">No pending tasks</p>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Required Documents</h2>
        <div className="space-y-4">
          {onboardingData.documents.map((doc) => (
            <div
              key={doc.id}
              className={`p-4 rounded-lg border ${
                doc.uploaded
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-sm text-gray-500">{doc.description}</p>
                </div>
                {doc.uploaded ? (
                  <span className="text-green-600 text-sm">✓ Uploaded</span>
                ) : (
                  <div>
                    <input
                      type="file"
                      className="hidden"
                      id={`file-${doc.id}`}
                      onChange={(e) =>
                        handleDocumentUpload(doc.id, e.target.files[0])
                      }
                    />
                    <label
                      htmlFor={`file-${doc.id}`}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
                    >
                      Upload
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
          {onboardingData.documents.length === 0 && (
            <p className="text-center text-gray-500">No documents required</p>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
        <p className="text-gray-600 mb-4">
          If you have any questions about your onboarding process, feel free to reach
          out to HR or your manager.
        </p>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Contact HR
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            View FAQ
          </button>
        </div>
      </div>
    </div>
  );
}
