import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiMessageSquare, 
  FiAward, 
  FiTrendingUp,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiBarChart,
  FiCheckCircle,
  FiXCircle,
  FiStar
} from 'react-icons/fi';

export default function EmployeeEngagement() {
  const [activeTab, setActiveTab] = useState('surveys');
  const [surveys, setSurveys] = useState([]);
  const [recognitions, setRecognitions] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'surveys', label: 'Employee Surveys', icon: FiMessageSquare },
    { id: 'recognitions', label: 'Recognition', icon: FiAward },
    { id: 'analytics', label: 'Engagement Analytics', icon: FiBarChart }
  ];

  const mockSurveys = [
    {
      id: 1,
      title: 'Employee Satisfaction Survey 2024',
      description: 'Annual survey to measure employee satisfaction and engagement',
      survey_type: 'Satisfaction',
      target_audience: 'All Employees',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      status: 'active',
      responses_count: 45,
      total_employees: 50,
      is_anonymous: true
    },
    {
      id: 2,
      title: 'Work-Life Balance Pulse Survey',
      description: 'Quick pulse check on work-life balance and remote work satisfaction',
      survey_type: 'Pulse',
      target_audience: 'Remote Employees',
      start_date: '2024-02-15',
      end_date: '2024-02-28',
      status: 'closed',
      responses_count: 25,
      total_employees: 30,
      is_anonymous: true
    },
    {
      id: 3,
      title: 'Leadership Feedback Survey',
      description: 'Feedback on leadership effectiveness and management style',
      survey_type: 'Feedback',
      target_audience: 'All Employees',
      start_date: '2024-03-01',
      end_date: '2024-03-15',
      status: 'draft',
      responses_count: 0,
      total_employees: 50,
      is_anonymous: false
    }
  ];

  const mockRecognitions = [
    {
      id: 1,
      employee_name: 'John Doe',
      recognized_by: 'Manager Name',
      recognition_type: 'Achievement',
      title: 'Outstanding Customer Service',
      description: 'Received 5-star customer feedback for exceptional service delivery',
      category: 'Customer Service',
      points: 100,
      is_public: true,
      created_at: '2024-01-15'
    },
    {
      id: 2,
      employee_name: 'Jane Smith',
      recognized_by: 'Peer Colleague',
      recognition_type: 'Peer Nomination',
      title: 'Team Collaboration Excellence',
      description: 'Consistently helps team members and goes above and beyond',
      category: 'Teamwork',
      points: 50,
      is_public: true,
      created_at: '2024-01-20'
    },
    {
      id: 3,
      employee_name: 'Bob Wilson',
      recognized_by: 'HR Manager',
      recognition_type: 'Milestone',
      title: '5 Years of Service',
      description: 'Celebrating 5 years of dedicated service to the company',
      category: 'Milestone',
      points: 200,
      is_public: true,
      created_at: '2024-01-25'
    }
  ];

  const mockAnalytics = {
    overallEngagement: 78,
    satisfactionScore: 4.2,
    recognitionCount: 15,
    surveyParticipation: 85,
    trends: [
      { month: 'Jan', engagement: 75, satisfaction: 4.0 },
      { month: 'Feb', engagement: 78, satisfaction: 4.1 },
      { month: 'Mar', engagement: 80, satisfaction: 4.2 },
      { month: 'Apr', engagement: 82, satisfaction: 4.3 },
      { month: 'May', engagement: 78, satisfaction: 4.2 }
    ]
  };

  useEffect(() => {
    setSurveys(mockSurveys);
    setRecognitions(mockRecognitions);
  }, []);

  const renderSurveys = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Employee Surveys</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiPlus className="w-4 h-4" />
          <span>Create Survey</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                <p className="text-sm text-gray-600">{survey.survey_type}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                survey.status === 'active' ? 'bg-green-100 text-green-800' :
                survey.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {survey.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{survey.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Target:</span>
                <span className="text-gray-900">{survey.target_audience}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Responses:</span>
                <span className="text-gray-900">{survey.responses_count}/{survey.total_employees}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(survey.responses_count / survey.total_employees) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{survey.start_date}</span>
                <span>{survey.end_date}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                survey.is_anonymous ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {survey.is_anonymous ? 'Anonymous' : 'Identified'}
              </span>
              <div className="flex space-x-2">
                <button className="p-1 text-gray-400 hover:text-blue-600">
                  <FiEye className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-green-600">
                  <FiEdit className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecognitions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Employee Recognition</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiPlus className="w-4 h-4" />
          <span>Give Recognition</span>
        </button>
      </div>

      <div className="space-y-4">
        {recognitions.map((recognition) => (
          <div key={recognition.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{recognition.title}</h3>
                <p className="text-sm text-gray-600">Recognized: {recognition.employee_name}</p>
                <p className="text-sm text-gray-500">By: {recognition.recognized_by}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {recognition.category}
                </span>
                {recognition.points && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    {recognition.points} pts
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{recognition.description}</p>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <FiAward className="w-4 h-4 mr-1" />
                  {recognition.recognition_type}
                </span>
                <span className="flex items-center">
                  <FiCalendar className="w-4 h-4 mr-1" />
                  {recognition.created_at}
                </span>
              </div>
              <div className="flex space-x-2">
                <button className="p-1 text-gray-400 hover:text-blue-600">
                  <FiEye className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-green-600">
                  <FiEdit className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Engagement Analytics</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiBarChart className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Engagement</p>
              <p className="text-2xl font-bold text-gray-900">{mockAnalytics.overallEngagement}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiTrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfaction Score</p>
              <p className="text-2xl font-bold text-gray-900">{mockAnalytics.satisfactionScore}/5</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiStar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recognition Count</p>
              <p className="text-2xl font-bold text-gray-900">{mockAnalytics.recognitionCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FiAward className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Survey Participation</p>
              <p className="text-2xl font-bold text-gray-900">{mockAnalytics.surveyParticipation}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FiMessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Trends Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trends</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {mockAnalytics.trends.map((trend, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div 
                className="bg-blue-600 rounded-t w-12"
                style={{ height: `${(trend.engagement / 100) * 200}px` }}
              ></div>
              <span className="text-xs text-gray-600">{trend.month}</span>
              <span className="text-xs font-medium text-gray-900">{trend.engagement}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <FiAward className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">New recognition given to John Doe</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FiMessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Employee Satisfaction Survey completed</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <FiTrendingUp className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Engagement score increased by 3%</p>
              <p className="text-xs text-gray-500">3 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Employee Engagement</h1>
              <p className="text-gray-600 text-lg">Surveys, recognition, and engagement analytics</p>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <FiUsers className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'surveys' && renderSurveys()}
            {activeTab === 'recognitions' && renderRecognitions()}
            {activeTab === 'analytics' && renderAnalytics()}
          </div>
        </div>
      </div>
    </div>
  );
}
