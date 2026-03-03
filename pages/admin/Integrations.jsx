import React, { useState, useEffect } from 'react';
import Header from '../../components/admin/Header';

export default function Integrations() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    system_name: '',
    type: 'API',
    config: {},
  });

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/admin/hr-systems', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSystems(data);
      } else {
        throw new Error('Failed to fetch HR systems');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedSystem
        ? `/api/admin/hr-systems/${selectedSystem.id}`
        : '/api/admin/hr-systems';
      const method = selectedSystem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSystems();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error('Failed to save HR system');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleTestConnection = async (systemId) => {
    try {
      const response = await fetch(
        `/api/admin/hr-systems/${systemId}/test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        alert('Connection test successful!');
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleToggleActive = async (systemId, currentStatus) => {
    try {
      const response = await fetch(
        `/api/admin/hr-systems/${systemId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (response.ok) {
        fetchSystems();
      } else {
        throw new Error('Failed to update system status');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      system_name: '',
      type: 'API',
      config: {},
    });
    setSelectedSystem(null);
  };

  const openEditModal = (system) => {
    setSelectedSystem(system);
    setFormData({
      company_name: system.company_name,
      system_name: system.system_name,
      type: system.type,
      config: system.config,
    });
    setShowModal(true);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header title="HR Systems Integration" />
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Connected Systems</h2>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add System
          </button>
        </div>

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((system) => (
            <div
              key={system.id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{system.company_name}</h3>
                  <p className="text-gray-500">{system.system_name}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    system.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {system.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Type: {system.type}</p>
                <p className="text-sm text-gray-600">
                  Last Sync: {system.last_sync_at ? new Date(system.last_sync_at).toLocaleString() : 'Never'}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(system)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTestConnection(system.id)}
                  className="text-green-600 hover:text-green-800"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => handleToggleActive(system.id, system.is_active)}
                  className={`${
                    system.is_active
                      ? 'text-red-600 hover:text-red-800'
                      : 'text-green-600 hover:text-green-800'
                  }`}
                >
                  {system.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit System Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">
                {selectedSystem ? 'Edit HR System' : 'Add HR System'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      System Name
                    </label>
                    <input
                      type="text"
                      value={formData.system_name}
                      onChange={(e) =>
                        setFormData({ ...formData, system_name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="API">API</option>
                      <option value="Database">Database</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Configuration
                    </label>
                    <textarea
                      value={JSON.stringify(formData.config, null, 2)}
                      onChange={(e) => {
                        try {
                          const config = JSON.parse(e.target.value);
                          setFormData({ ...formData, config });
                        } catch (error) {
                          // Invalid JSON, ignore
                        }
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={4}
                      placeholder="Enter JSON configuration"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {selectedSystem ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
