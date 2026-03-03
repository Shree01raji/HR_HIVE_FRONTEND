import React, { useState } from 'react';
import { FiMessageCircle, FiCalendar, FiUsers, FiBarChart, FiTarget, FiVideo } from 'react-icons/fi';
import HRChatInterface from '../../components/chat/HRChatInterface';

const HRChatPage = () => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HR Assistant</h1>
              <p className="text-gray-600">Intelligent Multi-Agent Support System</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Available Agents:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Interview Scheduling</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Recruitment</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Learning</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Tabs */}
        <div className="px-6">
          <div className="flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiMessageCircle className="w-4 h-4 inline mr-2" />
              Chat Assistant
            </button>
            <button
              onClick={() => setActiveTab('quick-actions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quick-actions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiCalendar className="w-4 h-4 inline mr-2" />
              Quick Actions
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Interface */}
        {activeTab === 'chat' && (
          <div className="flex-1 p-6">
            <HRChatInterface userRole="hr" department="HR" />
          </div>
        )}

        {/* Quick Actions */}
        {activeTab === 'quick-actions' && (
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Interview Scheduling */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiCalendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Interview Scheduling</h3>
                </div>
                <p className="text-gray-600 mb-4">Automatically schedule interviews with conflict detection and reminders.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                    Schedule interview for John Doe
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                    Check interviewer availability tomorrow
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                    Send interview reminders
                  </button>
                </div>
              </div>

              {/* Recruitment */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiUsers className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Recruitment</h3>
                </div>
                <p className="text-gray-600 mb-4">Manage candidates, applications, and hiring processes.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                    Review pending applications
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                    Generate recruitment report
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                    Check candidate sources
                  </button>
                </div>
              </div>

              {/* Learning & Development */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiTarget className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Learning & Development</h3>
                </div>
                <p className="text-gray-600 mb-4">Manage training programs and employee development.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                    Assign training to employees
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                    Check course completion rates
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                    Create learning path
                  </button>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiBarChart className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics & Reports</h3>
                </div>
                <p className="text-gray-600 mb-4">Generate insights and reports across all HR functions.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors">
                    Generate monthly HR report
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors">
                    Show recruitment metrics
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors">
                    Analyze employee performance
                  </button>
                </div>
              </div>

              {/* Video Interviews */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FiVideo className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Video Interviews</h3>
                </div>
                <p className="text-gray-600 mb-4">Conduct and manage video interviews with candidates.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors">
                    Start video interview
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors">
                    Join scheduled interview
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors">
                    Review interview recordings
                  </button>
                </div>
              </div>

              {/* General HR */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiMessageCircle className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">General HR Support</h3>
                </div>
                <p className="text-gray-600 mb-4">Get help with policies, procedures, and general HR questions.</p>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                    Explain company policies
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                    Help with procedures
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                    General HR guidance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRChatPage;
