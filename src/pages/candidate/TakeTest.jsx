import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiFlag, FiCheckCircle, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { candidateTestAPI as candidateAPI } from '../../services/api';

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  
  const startTimeRef = useRef(null);
  const questionStartTimeRef = useRef(null);
  const behaviorLogRef = useRef([]);
  const visibilityCheckRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const webcamCheckIntervalRef = useRef(null);

  useEffect(() => {
    fetchTestDetails();
    setupBehaviorMonitoring();
    
    return () => {
      cleanupMonitoring();
    };
  }, [testId]);
  
  // Prevent window close during test
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (testStarted && !submitting) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
        logBehavior('window_close_attempt', {
          timestamp: new Date().toISOString(),
          is_suspicious: true
        });
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [testStarted, submitting]);

  useEffect(() => {
    if (testStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testStarted, timeRemaining]);

  const fetchTestDetails = async () => {
    try {
      const data = await candidateAPI.getTest(testId);
      console.log('Test data received:', data);
      setTest(data);
      
      const loadedQuestions = data.questions || [];
      console.log('Questions loaded:', loadedQuestions.length);
      
      if (loadedQuestions.length === 0) {
        console.error('No questions found for this test');
        alert('No questions available for this test. Please contact HR.');
        if (window.opener) {
          window.close();
        } else {
          navigate('/candidate/applications');
        }
        return;
      }
      
      setQuestions(loadedQuestions);
      setTimeRemaining(data.time_limit_minutes * 60 || 3600);
      
      // Initialize answers
      const initialAnswers = {};
      loadedQuestions.forEach((q) => {
        initialAnswers[q.question_id] = null;
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Failed to fetch test:', err);
      alert('Test not found or expired');
      if (window.opener) {
        window.close();
      } else {
        navigate('/candidate/applications');
      }
    }
  };

  const setupBehaviorMonitoring = () => {
    // Track tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track copy attempts
    document.addEventListener('copy', handleCopyAttempt);
    document.addEventListener('cut', handleCopyAttempt);
    
    // Track paste attempts
    document.addEventListener('paste', handlePasteAttempt);
    
    // Track right-click
    document.addEventListener('contextmenu', handleRightClick);
    
    // Track keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent screenshot shortcuts (F12, PrintScreen)
    window.addEventListener('keydown', handleScreenshotAttempt);
    
    // Track mouse leave (potential screenshot)
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Track fullscreen exit
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    
    // Periodic visibility check
    visibilityCheckRef.current = setInterval(() => {
      if (document.hidden) {
        logBehavior('tab_switch', { duration: 'unknown' });
      }
    }, 5000);
  };

  const cleanupMonitoring = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('copy', handleCopyAttempt);
    document.removeEventListener('cut', handleCopyAttempt);
    document.removeEventListener('paste', handlePasteAttempt);
    document.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keydown', handleScreenshotAttempt);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    if (visibilityCheckRef.current) {
      clearInterval(visibilityCheckRef.current);
    }
    if (webcamCheckIntervalRef.current) {
      clearInterval(webcamCheckIntervalRef.current);
    }
    stopWebcam();
  };
  
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
      if (testStarted) {
        logBehavior('fullscreen_exit', {
          timestamp: new Date().toISOString(),
          is_suspicious: true
        });
        addWarning('Fullscreen mode exited. This is being monitored.');
        incrementSuspiciousCount();
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden && testStarted) {
      logBehavior('tab_switch', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Tab switched detected. This activity is being monitored.');
      incrementSuspiciousCount();
    }
  };

  const handleCopyAttempt = (e) => {
    if (testStarted) {
      e.preventDefault();
      logBehavior('copy_attempt', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Copying is not allowed during the test.');
      incrementSuspiciousCount();
      return false;
    }
  };

  const handlePasteAttempt = (e) => {
    if (testStarted) {
      e.preventDefault();
      logBehavior('paste_attempt', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Pasting is not allowed during the test.');
      incrementSuspiciousCount();
      return false;
    }
  };

  const handleRightClick = (e) => {
    if (testStarted) {
      e.preventDefault();
      logBehavior('right_click', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Right-click is disabled during the test.');
      incrementSuspiciousCount();
      return false;
    }
  };

  const handleKeyDown = (e) => {
    if (!testStarted) return;
    
    // Block common shortcuts
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['c', 'v', 'x', 'a', 's', 'p', 'f', 'u'].includes(key)) {
        e.preventDefault();
        logBehavior('keyboard_shortcut_attempt', { 
          key: key,
          timestamp: new Date().toISOString(),
          is_suspicious: true 
        });
        addWarning(`Shortcut ${key.toUpperCase()} is disabled.`);
        incrementSuspiciousCount();
        return false;
      }
    }
    
    // Block F12 (Developer Tools)
    if (e.key === 'F12') {
      e.preventDefault();
      logBehavior('devtools_attempt', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Developer tools are disabled during the test.');
      incrementSuspiciousCount();
      return false;
    }
  };

  const handleScreenshotAttempt = (e) => {
    if (!testStarted) return;
    
    // PrintScreen key
    if (e.key === 'PrintScreen' || (e.key === 'F12')) {
      e.preventDefault();
      logBehavior('screenshot_attempt', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
      addWarning('Screenshots are not allowed during the test.');
      incrementSuspiciousCount();
      return false;
    }
  };

  const handleMouseLeave = (e) => {
    if (testStarted && e.clientY <= 0) {
      // Mouse left top of screen (potential screenshot or tab switch)
      logBehavior('mouse_leave_top', { 
        timestamp: new Date().toISOString(),
        is_suspicious: true 
      });
    }
  };

  const logBehavior = (activityType, details = {}) => {
    const log = {
      activity_type: activityType,
      timestamp: new Date().toISOString(),
      question_id: questions[currentQuestionIndex]?.question_id,
      question_index: currentQuestionIndex,
      ...details
    };
    
    behaviorLogRef.current.push(log);
    
    // Send to backend immediately for critical events (REAL-TIME)
    const criticalEvents = [
      'tab_switch', 
      'copy_attempt', 
      'paste_attempt', 
      'webcam_disabled',
      'devtools_attempt',
      'screenshot_attempt',
      'fullscreen_exit'
    ];
    
    if (criticalEvents.includes(activityType)) {
      sendBehaviorLog(log); // Immediate API call
    }
  };

  const sendBehaviorLog = async (log) => {
    try {
      // Real-time: Send immediately to backend
      const result = await candidateAPI.logTestBehavior(testId, log);
      
      // If flagged, show warning to candidate
      if (result.should_flag) {
        addWarning('⚠️ Multiple suspicious activities detected. Your test may be flagged for review.');
      }
    } catch (err) {
      console.error('Failed to log behavior:', err);
    }
  };

  const addWarning = (message) => {
    setWarnings(prev => [...prev, { id: Date.now(), message }]);
    setTimeout(() => {
      setWarnings(prev => prev.slice(1));
    }, 5000);
  };

  const incrementSuspiciousCount = () => {
    setSuspiciousCount(prev => prev + 1);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        setWebcamStream(stream);
        setWebcamEnabled(true);
        
        // Monitor webcam status periodically
        webcamCheckIntervalRef.current = setInterval(() => {
          if (stream.getVideoTracks().length === 0 || !stream.active) {
            logBehavior('webcam_disabled', {
              timestamp: new Date().toISOString(),
              is_suspicious: true
            });
            addWarning('Webcam disconnected. Please reconnect your camera.');
            incrementSuspiciousCount();
          }
        }, 10000);
        
        logBehavior('webcam_started', { is_suspicious: false });
      }
    } catch (err) {
      console.error('Failed to start webcam:', err);
      logBehavior('webcam_error', {
        error: err.message,
        timestamp: new Date().toISOString(),
        is_suspicious: true
      });
      addWarning('Webcam access denied or not available. Test will continue but activity will be closely monitored.');
      incrementSuspiciousCount();
    }
  };
  
  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setWebcamEnabled(false);
    }
    if (webcamCheckIntervalRef.current) {
      clearInterval(webcamCheckIntervalRef.current);
    }
  };
  
  const handleStartTest = async () => {
    try {
      // Request webcam access
      await startWebcam();
      
      await candidateAPI.startTest(testId);
      setTestStarted(true);
      startTimeRef.current = Date.now();
      questionStartTimeRef.current = Date.now();
      
      // Log test start
      logBehavior('test_started', { is_suspicious: false });
      sendBehaviorLog({ activity_type: 'test_started', timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to start test:', err);
      alert('Failed to start test');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Track time spent on question before changing
    if (questionStartTimeRef.current) {
      const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      logBehavior('time_spent', {
        question_id: questionId,
        time_spent_seconds: timeSpent,
        is_suspicious: false
      });
    }
    
    questionStartTimeRef.current = Date.now();
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFlagQuestion = () => {
    const questionId = questions[currentQuestionIndex]?.question_id;
    if (questionId) {
      logBehavior('question_flagged', {
        question_id: questionId,
        is_suspicious: false
      });
    }
  };

  const handleAutoSubmit = () => {
    if (window.confirm('Time is up! The test will be submitted automatically.')) {
      handleSubmit();
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit the test? You cannot change answers after submission.')) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Log final behavior data
      const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      logBehavior('test_completed', {
        total_time_seconds: totalTime,
        suspicious_activities: suspiciousCount,
        is_suspicious: false
      });
      
      // Send all remaining behavior logs
      if (behaviorLogRef.current.length > 0) {
        await candidateAPI.logTestBehavior(testId, behaviorLogRef.current);
      }
      
      // Submit test
      const result = await candidateAPI.submitTest(testId, {
        answers,
        behavior_logs: behaviorLogRef.current,
        suspicious_activities: suspiciousCount
      });
      
      alert('Test submitted successfully! Your results will be reviewed by HR.');
      if (window.opener) {
        window.close();
      } else {
        navigate('/candidate/applications');
      }
    } catch (err) {
      console.error('Failed to submit test:', err);
      alert('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.values(answers).filter(a => a !== null).length;

  // Loading state
  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading test...</p>
        </div>
      </div>
    );
  }
  
  // No questions available
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <FiAlertTriangle className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
          <p className="text-gray-600 mb-6">
            This test does not have any questions assigned. Please contact HR for assistance.
          </p>
          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                navigate('/candidate/applications');
              }
            }}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Questions loaded but current question not set yet
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparing questions...</p>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">Aptitude Test Instructions</h1>
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="font-semibold text-lg mb-2">Test Details:</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Total Questions: {test.total_questions}</li>
                <li>Time Limit: {test.time_limit_minutes} minutes</li>
                <li>Test Type: {test.template?.template_name || 'General Aptitude'}</li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Important Rules:</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Do not switch tabs or windows during the test</li>
                <li>Copy, paste, and right-click are disabled</li>
                <li>Your webcam will be activated for proctoring</li>
                <li>Your behavior is being monitored in real-time</li>
                <li>Time will start when you click "Start Test"</li>
                <li>You cannot pause or resume the test</li>
                <li>Answer all questions before submitting</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Webcam Required:</strong> Please ensure your webcam is working and you grant camera access when prompted. 
                This is required for test integrity monitoring.
              </p>
            </div>
            {suspiciousCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  <FiAlertTriangle className="inline mr-2" />
                  Suspicious activities detected: {suspiciousCount}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleStartTest}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            Start Test (Webcam will be activated)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, overflow: 'auto' }}>
      {/* Close Window Button (only show if opened in popup) */}
      {window.opener && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50">
          <span className="text-sm font-medium">Test Window - Do not close until test is completed</span>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to close the test? This may affect your test results.')) {
                window.close();
              }
            }}
            className="ml-4 p-1 hover:bg-red-700 rounded"
            title="Close Window"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Header with Timer and Progress */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <FiClock className="w-6 h-6" />
                <span className="text-2xl">{formatTime(timeRemaining)}</span>
              </div>
              <div className="h-8 w-px bg-orange-400"></div>
              <div className="text-white">
                <div className="text-sm opacity-90">Question</div>
                <div className="text-lg font-semibold">{currentQuestionIndex + 1} of {questions.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-white">
                <div className="text-sm opacity-90">Progress</div>
                <div className="text-lg font-semibold">{answeredCount}/{questions.length}</div>
              </div>
              <div className="h-8 w-px bg-orange-400"></div>
              {/* Progress Bar */}
              <div className="w-32">
                <div className="text-white text-xs mb-1 text-center">{Math.round((answeredCount / questions.length) * 100)}%</div>
                <div className="h-2 bg-orange-400 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-300 rounded-full"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              {/* Webcam Status */}
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${webcamEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                <div className={`w-2 h-2 rounded-full ${webcamEnabled ? 'bg-white' : 'bg-white'}`}></div>
                <span className="font-medium">{webcamEnabled ? 'Active' : 'Inactive'}</span>
              </div>
              {suspiciousCount > 0 && (
                <div className="flex items-center gap-2 text-white bg-red-500 px-3 py-1.5 rounded-full">
                  <FiAlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{suspiciousCount} warnings</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Webcam Preview (small, top-right corner) */}
      {webcamEnabled && webcamVideoRef.current && (
        <div className="fixed top-20 right-4 z-20 w-32 h-24 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-green-500">
          <video
            ref={webcamVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
            Proctoring Active
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="fixed top-20 right-4 z-20 space-y-2">
          {warnings.map(warning => (
            <div key={warning.id} className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
              {warning.message}
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Question Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">{currentQuestionIndex + 1}</span>
                </div>
                <div>
                  <h2 className="text-sm text-gray-500 uppercase tracking-wide">Question</h2>
                  <p className="text-xs text-gray-400">Category: {currentQuestion.category || 'General'}</p>
                </div>
              </div>
              <button
                onClick={handleFlagQuestion}
                className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
              >
                <FiFlag className="w-4 h-4" />
                <span className="text-sm font-medium">Flag Question</span>
              </button>
            </div>
            
            <div className="mb-8">
              <p className="text-xl text-gray-800 leading-relaxed font-medium">{currentQuestion.question_text}</p>
            </div>
            
            {/* Options */}
            <div className="space-y-4">
              {currentQuestion.options?.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-start p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 group ${
                    answers[currentQuestion.question_id] === option
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.question_id}`}
                    value={option}
                    checked={answers[currentQuestion.question_id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                    className="mt-1 mr-4 w-5 h-5 text-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  />
                  <div className="flex-1">
                    <span className="text-gray-800 text-base leading-relaxed">{option}</span>
                  </div>
                  {answers[currentQuestion.question_id] === option && (
                    <div className="ml-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <FiCheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                <FiChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  Next Question
                  <FiChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg disabled:opacity-50 transition-all font-medium"
                >
                  <FiCheckCircle className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </button>
              )}
            </div>
            
            {/* Question Grid */}
            <div className="border-t pt-4">
              <div className="text-sm text-gray-600 mb-3 font-medium">Question Navigation</div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                      idx === currentQuestionIndex
                        ? 'bg-orange-600 text-white shadow-md scale-110'
                        : answers[q.question_id]
                        ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                    }`}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

