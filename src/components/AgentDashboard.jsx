import React, { useState, useEffect } from 'react';
import { FiActivity, FiUsers, FiSettings, FiCheckCircle, FiAlertCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const AgentCard = ({ agent, status, onTest }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'testing': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{agent.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
      
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1">Capabilities:</h4>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities?.slice(0, 3).map((cap, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {cap}
              </span>
            ))}
            {agent.capabilities?.length > 3 && (
              <span className="text-xs text-gray-500">+{agent.capabilities.length - 3} more</span>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1">Keywords:</h4>
          <div className="flex flex-wrap gap-1">
            {agent.keywords?.slice(0, 4).map((keyword, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        
        {agent.workflow_types?.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-1">Workflows:</h4>
            <div className="flex flex-wrap gap-1">
              {agent.workflow_types.map((workflow, index) => (
                <span key={index} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  {workflow.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={() => onTest(agent.id)}
        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
      >
        Test Agent
      </button>
    </div>
  );
};

const WorkflowCard = ({ workflow }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-2">{workflow.workflow_type.replace('_', ' ').toUpperCase()}</h3>
      <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
      
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1">Required Agents ({workflow.agent_count}):</h4>
          <div className="flex flex-wrap gap-1">
            {workflow.required_agents.map((agent, index) => (
              <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {agent.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentList, setAgentList] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      
      // Load agent status
      const statusResponse = await fetch('/api/agents/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAgentStatus(statusData);
      }
      
      // Load detailed agent list
      const listResponse = await fetch('/api/agents/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        setAgentList(listData.agents || []);
      }
      
      // Load workflows
      const workflowResponse = await fetch('/api/agents/workflows', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        setWorkflows(workflowData.workflows || []);
      }
      
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAllAgents = async () => {
    try {
      setTesting(true);
      setTestResults({});
      
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const testData = await response.json();
        setTestResults(testData.test_results || {});
      }
    } catch (error) {
      console.error('Error testing agents:', error);
    } finally {
      setTesting(false);
    }
  };

  const testSingleAgent = async (agentId) => {
    try {
      setTestResults(prev => ({
        ...prev,
        [agentId]: { status: 'testing' }
      }));
      
      // Simulate single agent test
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const testData = await response.json();
        setTestResults(prev => ({
          ...prev,
          [agentId]: testData.test_results[agentId] || { status: 'success' }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [agentId]: { status: 'error', error: error.message }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <FiRefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading agent dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Agent Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring and management of all HR agents</p>
      </div>

      {/* System Health Overview */}
      {agentStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiActivity className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">{agentStatus.system_health?.status || 'Unknown'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiUsers className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold text-blue-600">{agentStatus.system_health?.agents_initialized || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiSettings className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Workflows</p>
                <p className="text-2xl font-bold text-purple-600">{agentStatus.system_health?.workflows_available || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FiCheckCircle className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Capabilities</p>
                <p className="text-2xl font-bold text-indigo-600">{agentStatus.total_capabilities || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('agents')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Agents ({agentList.length})
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'workflows'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('testing')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'testing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Testing
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'agents' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">All HR Agents</h2>
            <button
              onClick={testAllAgents}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              {testing ? (
                <FiRefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FiActivity className="w-4 h-4" />
              )}
              <span>{testing ? 'Testing...' : 'Test All Agents'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentList.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                status={testResults[agent.id]?.status || 'active'}
                onTest={testSingleAgent}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow, index) => (
              <WorkflowCard key={index} workflow={workflow} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'testing' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Agent Testing Results</h2>
          {Object.keys(testResults).length === 0 ? (
            <div className="text-center py-12">
              <FiActivity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No test results available. Click "Test All Agents" to run tests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(testResults).map(([agentId, result]) => (
                <div key={agentId} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{agentId.replace('_', ' ').toUpperCase()}</h3>
                    <div className="flex items-center space-x-2">
                      {result.status === 'success' && <FiCheckCircle className="w-5 h-5 text-green-600" />}
                      {result.status === 'error' && <FiAlertCircle className="w-5 h-5 text-red-600" />}
                      {result.status === 'testing' && <FiClock className="w-5 h-5 text-yellow-600 animate-spin" />}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.status === 'success' ? 'bg-green-100 text-green-800' :
                        result.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                  </div>
                  
                  {result.status === 'success' && (
                    <div className="text-sm text-gray-600">
                      <p>Response Length: {result.response_length} characters</p>
                      <p className="mt-2 bg-gray-50 p-3 rounded text-xs">
                        {result.response_preview}
                      </p>
                    </div>
                  )}
                  
                  {result.status === 'error' && (
                    <div className="text-sm text-red-600">
                      <p>Error: {result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
