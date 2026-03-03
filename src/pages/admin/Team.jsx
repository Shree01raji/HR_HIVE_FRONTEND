import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import OrganizationStructure from '../../components/admin/team/OrganizationStructure';
import ReportingStructure from '../../components/admin/team/ReportingStructure';
import ApprovalHierarchy from '../../components/admin/team/ApprovalHierarchy';
import { FiUsers, FiGitBranch, FiCheckCircle } from 'react-icons/fi';

export default function Team() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'organization', label: 'Organization Structure', icon: FiUsers },
    { id: 'reporting', label: 'Reporting Structure', icon: FiGitBranch },
    { id: 'approval', label: 'Approval Hierarchy', icon: FiCheckCircle },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Team Management</h1>
        <p className="text-gray-600">View organization structure, reporting relationships, and approval hierarchies</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'organization' && <OrganizationStructure />}
        {activeTab === 'reporting' && <ReportingStructure />}
        {activeTab === 'approval' && <ApprovalHierarchy />}
      </div>
    </div>
  );
}
