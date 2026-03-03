import React, { useState, useEffect } from 'react';
import { 
  FiActivity, 
  FiCpu, 
  FiZap, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock, 
  FiTrendingUp, 
  FiRefreshCw,
  FiEye,
  FiSettings,
  FiServer,
  FiWifi,
  FiUsers,
  FiMessageSquare,
  FiBarChart,
  FiPlay,
  FiPause,
  FiRotateCcw
} from 'react-icons/fi';
import { agentMonitoringAPI } from '../../services/api';

const AgentMonitoring = () => {
  const [agentData, setAgentData] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAgentData();
    fetchLogs();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAgentData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentData = async () => {
    try {
      setRefreshing(true);
      const data = await agentMonitoringAPI.getAgentsOverview();
      setAgentData(data);
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await agentMonitoringAPI.getAgentLogs(50);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const restartAgent = async (agentType) => {
    try {
      await agentMonitoringAPI.restartAgent(agentType);
      fetchAgentData(); // Refresh data
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800'
    };
    
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const getSuccessRate = (agent) => {
    if (!agent?.total_queries) return '0.0';
    const rate = (agent.successful_responses / agent.total_queries) * 100;
    return rate.toFixed(1);
  };

  const formatAverageResponseTime = (agent) => {
    if (agent?.total_queries && Number.isFinite(agent.average_response_time)) {
      return `${agent.average_response_time.toFixed(2)}s`;
    }
    return 'N/A';
  };

  const formatConfidence = (agent) => {
    if (Number.isFinite(agent?.confidence_score)) {
      return `${Math.round(agent.confidence_score * 100)}%`;
    }
    return '—';
  };

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of AI agents performance</p>
        </div>
        <button
          onClick={fetchAgentData}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* System Health Overview */}
      {agentData?.system_health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">Operational</p>
              </div>
              <FiCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Uptime: {agentData.system_health.uptime}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold text-blue-600">{agentData.system_health.active_agents}/{agentData.system_health.total_agents}</p>
              </div>
              <FiCpu className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Queries Today</p>
                <p className="text-2xl font-bold text-purple-600">{agentData.system_health.total_queries_today}</p>
              </div>
              <FiMessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-600">{agentData.system_health.average_response_time?.toFixed(1)}s</p>
              </div>
              <FiClock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FiActivity },
            // { id: 'performance', label: 'Performance', icon: FiBarChart },
            { id: 'logs', label: 'Logs', icon: FiEye }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agentData?.agents?.map((agent, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiZap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.agent_name}</h3>
                    <p className="text-sm text-gray-600">{agent.specialization}</p>
                  </div>
                </div>
                <span className={getStatusBadge(agent.status)}>{agent.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Total Queries</p>
                  <p className="text-lg font-semibold text-gray-900">{agent.total_queries}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Success Rate</p>
                  <p className="text-lg font-semibold text-green-600">
                    {getSuccessRate(agent)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Response Time</p>
                  <p className="text-lg font-semibold text-blue-600">{formatAverageResponseTime(agent)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Confidence Score</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatConfidence(agent)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Popular Queries</p>
                <div className="space-y-1">
                  {agent.popular_queries?.slice(0, 3).map((query, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded">
                      {query}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last activity: {formatLastActivity(agent.last_activity)}</span>
                <button
                  onClick={() => restartAgent(agent.agent_type)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <FiRotateCcw className="w-3 h-3" />
                  <span>Restart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Tab */}
      {/* {activeTab === 'performance' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {agentData?.system_health?.overall_confidence ? (agentData.system_health.overall_confidence * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-gray-600">Overall Confidence</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {agentData?.chat_statistics?.total_messages_24h || 0}
              </div>
              <p className="text-sm text-gray-600">Messages (24h)</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {agentData?.chat_statistics?.messages_per_session || 0}
              </div>
              <p className="text-sm text-gray-600">Avg Messages/Session</p>
            </div>
          </div>
        </div>
      )} */}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity Logs</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.level === 'ERROR' ? 'bg-red-500' : 
                      log.level === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.agent_type}</p>
                      <p className="text-sm text-gray-600">{log.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPT-4o Mini Status */}
      {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiWifi className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">GPT-4o Mini Connection</h3>
              <p className="text-sm text-gray-600">
                Status: {agentData?.system_health?.gpt4o_mini_status === 'connected' ? 'Connected' : 'Fallback Mode'}
              </p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            agentData?.system_health?.gpt4o_mini_status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
        </div>
      </div> */}
    </div>
  );
};

export default AgentMonitoring;
