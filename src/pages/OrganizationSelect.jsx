import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiPlus, FiCheck, FiArrowRight, FiSearch } from 'react-icons/fi';
import { organizationAPI } from '../services/api';
import Logo from '../components/Logo';

export default function OrganizationSelect() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationAPI.list();
      setOrganizations(data || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (organizationSlug) => {
    // Store selected organization in localStorage
    localStorage.setItem('selectedOrganization', organizationSlug);
    // Navigate to login
    navigate('/login');
  };

  const handleCreateOrganization = () => {
    navigate('/organizations/create');
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Your Organization
          </h1>
          <p className="text-gray-600">
            Choose your organization to continue, or create a new one
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Create Organization Button */}
        <button
          onClick={handleCreateOrganization}
          className="w-full mb-6 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <FiPlus className="w-5 h-5" />
          <span>Create New Organization</span>
        </button>

        {/* Organizations List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredOrganizations.length === 0 ? (
            <div className="p-12 text-center">
                      <FiBriefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No organizations found matching your search' : 'No organizations found'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreateOrganization}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first organization →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrganizations.map((org) => (
                <button
                  key={org.organization_id}
                  onClick={() => handleSelectOrganization(org.slug)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FiBriefcase className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {org.industry || 'No industry specified'} • {org.company_size || 'Size not specified'}
                      </p>
                      {org.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {org.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

