import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiRefreshCw, FiDatabase,
  FiCpu, FiBarChart, FiLayers, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiSave, FiDownload, FiUpload, FiSettings, FiTrendingUp
} from 'react-icons/fi';
import { questionBankAPI } from '../../services/api';

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('questions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Questions state
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  
  // Question form state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    category: 'General',
    difficulty: 'Medium',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    source: 'manual',
    tags: []
  });
  
  // Generation state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationParams, setGenerationParams] = useState({
    categories: ['Quantitative', 'Verbal', 'Logical'],
    question_counts: { Quantitative: 10, Verbal: 10, Logical: 10 },
    difficulty: 'medium',
    source: 'mixed',
    auto_rank: true
  });
  
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    description: '',
    total_questions: 30,
    time_limit_minutes: 60,
    question_distribution: { Quantitative: 10, Verbal: 10, Logical: 10 },
    difficulty_distribution: { Easy: 0.3, Medium: 0.5, Hard: 0.2 }
  });
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    by_category: {},
    by_difficulty: {},
    by_source: {}
  });

  useEffect(() => {
    fetchQuestions();
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterQuestions();
    calculateStats();
  }, [questions, searchTerm, categoryFilter, difficultyFilter, sourceFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionBankAPI.getQuestions({ limit: 1000 });
      setQuestions(data);
      setFilteredQuestions(data);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await questionBankAPI.getTestTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];
    
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(q => q.category === categoryFilter);
    }
    
    if (difficultyFilter) {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }
    
    if (sourceFilter) {
      filtered = filtered.filter(q => q.source === sourceFilter);
    }
    
    setFilteredQuestions(filtered);
  };

  const calculateStats = () => {
    const stats = {
      total: questions.length,
      by_category: {},
      by_difficulty: {},
      by_source: {}
    };
    
    questions.forEach(q => {
      stats.by_category[q.category] = (stats.by_category[q.category] || 0) + 1;
      stats.by_difficulty[q.difficulty] = (stats.by_difficulty[q.difficulty] || 0) + 1;
      stats.by_source[q.source] = (stats.by_source[q.source] || 0) + 1;
    });
    
    setStats(stats);
  };

  const handleCreateQuestion = async () => {
    try {
      const questionData = {
        ...questionForm,
        options: questionForm.options.filter(opt => opt.trim() !== '')
      };
      
      if (editingQuestion) {
        await questionBankAPI.updateQuestion(editingQuestion.question_id, questionData);
      } else {
        await questionBankAPI.createQuestion(questionData);
      }
      
      await fetchQuestions();
      setShowQuestionModal(false);
      resetQuestionForm();
    } catch (err) {
      console.error('Failed to save question:', err);
      setError('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await questionBankAPI.deleteQuestion(questionId);
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
      setError('Failed to delete question');
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      setGenerating(true);
      const response = await questionBankAPI.generateQuestions(generationParams);
      await fetchQuestions();
      setShowGenerateModal(false);
      alert(`Successfully generated ${response.total_generated} questions!`);
    } catch (err) {
      console.error('Failed to generate questions:', err);
      setError('Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyzeDifficulty = async (questionId) => {
    try {
      setLoading(true);
      await questionBankAPI.analyzeDifficulty(questionId);
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to analyze difficulty:', err);
      setError('Failed to analyze difficulty');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select questions to analyze');
      return;
    }
    
    try {
      setLoading(true);
      const questionIds = selectedQuestions.map(q => q.question_id);
      await questionBankAPI.bulkAnalyzeDifficulty(questionIds);
      await fetchQuestions();
      setSelectedQuestions([]);
    } catch (err) {
      console.error('Failed to analyze questions:', err);
      setError('Failed to analyze questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await questionBankAPI.createTestTemplate(templateForm);
      await fetchTemplates();
      setShowTemplateModal(false);
      resetTemplateForm();
    } catch (err) {
      console.error('Failed to create template:', err);
      setError('Failed to create template');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: '',
      question_type: 'multiple_choice',
      category: 'General',
      difficulty: 'Medium',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      source: 'manual',
      tags: []
    });
    setEditingQuestion(null);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      template_name: '',
      description: '',
      total_questions: 30,
      time_limit_minutes: 60,
      question_distribution: { Quantitative: 10, Verbal: 10, Logical: 10 },
      difficulty_distribution: { Easy: 0.3, Medium: 0.5, Hard: 0.2 }
    });
  };

  const toggleQuestionSelection = (question) => {
    setSelectedQuestions(prev => {
      const exists = prev.find(q => q.question_id === question.question_id);
      if (exists) {
        return prev.filter(q => q.question_id !== question.question_id);
      } else {
        return [...prev, question];
      }
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Quantitative': 'text-blue-600 bg-blue-50',
      'Verbal': 'text-purple-600 bg-purple-50',
      'Logical': 'text-indigo-600 bg-indigo-50',
      'Technical': 'text-orange-600 bg-orange-50',
      'General': 'text-gray-600 bg-gray-50'
    };
    return colors[category] || colors['General'];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600 mt-1">Manage aptitude test questions with AI-powered difficulty analysis</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <FiLayers className="w-5 h-5" />
            Generate Questions
          </button>
          <button
            onClick={() => {
              resetQuestionForm();
              setShowQuestionModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FiDatabase className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With AI Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {questions.filter(q => q.ai_difficulty_score).length}
              </p>
            </div>
            <FiCpu className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
            <FiLayers className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selected</p>
              <p className="text-2xl font-bold text-gray-900">{selectedQuestions.length}</p>
            </div>
            <FiCheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'questions'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Test Templates
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="Quantitative">Quantitative</option>
                <option value="Verbal">Verbal</option>
                <option value="Logical">Logical</option>
                <option value="Technical">Technical</option>
                <option value="General">General</option>
              </select>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Sources</option>
                <option value="manual">Manual</option>
                <option value="quizgecko">Quizgecko</option>
                <option value="aptitude_api">Aptitude API</option>
              </select>
              {selectedQuestions.length > 0 && (
                <button
                  onClick={handleBulkAnalyze}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FiCpu className="w-4 h-4" />
                  Analyze ({selectedQuestions.length})
                </button>
              )}
            </div>
          </div>

          {/* Questions List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestions([...filteredQuestions]);
                          } else {
                            setSelectedQuestions([]);
                          }
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestions.map((question) => {
                    const isSelected = selectedQuestions.find(q => q.question_id === question.question_id);
                    return (
                      <tr key={question.question_id} className={isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleQuestionSelection(question)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <p className="text-sm text-gray-900 line-clamp-2">{question.question_text}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(question.category)}`}>
                            {question.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {question.ai_difficulty_score ? (
                            <span className="text-sm font-medium text-purple-600">
                              {(question.ai_difficulty_score * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAnalyzeDifficulty(question.question_id)}
                              className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1"
                            >
                              <FiCpu className="w-3 h-3" />
                              Analyze
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 capitalize">{question.source || 'manual'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingQuestion(question);
                                setQuestionForm({
                                  question_text: question.question_text,
                                  question_type: question.question_type,
                                  category: question.category,
                                  difficulty: question.difficulty,
                                  options: question.options || ['', '', '', ''],
                                  correct_answer: question.correct_answer,
                                  explanation: question.explanation || '',
                                  source: question.source || 'manual',
                                  tags: question.tags || []
                                });
                                setShowQuestionModal(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.question_id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredQuestions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <FiDatabase className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No questions found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <button
            onClick={() => {
              resetTemplateForm();
              setShowTemplateModal(true);
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Create Template
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.template_id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{template.template_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description || 'No description'}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium">{template.total_questions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Limit:</span>
                    <span className="font-medium">{template.time_limit_minutes} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Questions by Category</h3>
            <div className="space-y-3">
              {Object.entries(stats.by_category || {}).map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{category}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Questions by Difficulty</h3>
            <div className="space-y-3">
              {Object.entries(stats.by_difficulty || {}).map(([difficulty, count]) => (
                <div key={difficulty}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{difficulty}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        difficulty === 'Easy' ? 'bg-green-500' :
                        difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingQuestion ? 'Edit Question' : 'Create Question'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={questionForm.category}
                    onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Quantitative">Quantitative</option>
                    <option value="Verbal">Verbal</option>
                    <option value="Logical">Logical</option>
                    <option value="Technical">Technical</option>
                    <option value="General">General</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                {questionForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[idx] = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 mb-2"
                  />
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                <input
                  type="text"
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowQuestionModal(false);
                    resetQuestionForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuestion}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {editingQuestion ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Generate Questions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Distribution</label>
                {generationParams.categories.map(category => (
                  <div key={category} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{category}</span>
                      <input
                        type="number"
                        min="0"
                        value={generationParams.question_counts[category] || 0}
                        onChange={(e) => setGenerationParams({
                          ...generationParams,
                          question_counts: {
                            ...generationParams.question_counts,
                            [category]: parseInt(e.target.value) || 0
                          }
                        })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={generationParams.difficulty}
                  onChange={(e) => setGenerationParams({ ...generationParams, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={generationParams.source}
                  onChange={(e) => setGenerationParams({ ...generationParams, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="mixed">Mixed (Quizgecko + Aptitude API)</option>
                  <option value="quizgecko">Quizgecko Only</option>
                  <option value="aptitude_api">Aptitude API Only</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generationParams.auto_rank}
                  onChange={(e) => setGenerationParams({ ...generationParams, auto_rank: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Auto-rank by AI difficulty analysis</label>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Create Test Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions</label>
                  <input
                    type="number"
                    value={templateForm.total_questions}
                    onChange={(e) => setTemplateForm({ ...templateForm, total_questions: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
                  <input
                    type="number"
                    value={templateForm.time_limit_minutes}
                    onChange={(e) => setTemplateForm({ ...templateForm, time_limit_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    resetTemplateForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2">×</button>
        </div>
      )}
    </div>
  );
}

