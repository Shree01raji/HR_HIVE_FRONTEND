import React, { useState, useEffect } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhone, FiSettings, FiUser, FiClock, FiFileText, FiStar } from 'react-icons/fi';

export default function InterviewPanel() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [ratings, setRatings] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    culturalFit: 0
  });

  useEffect(() => {
    // Simulate joining interview
    const timer = setTimeout(() => {
      setIsConnected(true);
      setInterviewData({
        candidateName: 'John Doe',
        position: 'Senior Software Engineer',
        experience: '5 years',
        resume: 'john_doe_resume.pdf',
        duration: 60,
        questions: [
          'Tell me about yourself',
          'What is your experience with React?',
          'How would you solve this problem?',
          'Do you have any questions for us?'
        ]
      });
      setTimeRemaining(60 * 60); // 60 minutes in seconds
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (window.confirm('Are you sure you want to end the interview?')) {
      // Handle end call logic
      window.close();
    }
  };

  const handleRatingChange = (category, rating) => {
    setRatings(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const StarRating = ({ category, rating, onChange }) => {
    return (
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium w-24">{category}:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(category, star)}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
          >
            <FiStar className="w-4 h-4 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Interviewing {interviewData?.candidateName}</h1>
          <p className="text-gray-400">{interviewData?.position} • {interviewData?.experience} experience</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-400">Time: </span>
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full">
        {/* Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Candidate Video */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg h-96 lg:h-full flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiUser className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">{interviewData?.candidateName}</p>
                  <p className="text-gray-400">Candidate</p>
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-400">Connected</span>
                  </div>
                </div>
                
                {/* Video placeholder */}
                <div className="absolute inset-0 bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <FiVideo className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">Candidate video stream</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Video */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg h-48 lg:h-64 flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FiUser className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">You</p>
                  <p className="text-xs text-gray-400">Interviewer</p>
                </div>
                
                {/* Your video placeholder */}
                <div className="absolute inset-0 bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <FiVideo className="w-12 h-12 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Your video</p>
                  </div>
                </div>
              </div>

              {/* Interview Controls */}
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <FiFileText className="w-4 h-4" />
                  <span>{showNotes ? 'Hide' : 'Show'} Notes</span>
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                  <FiClock className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showNotes && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Interview Notes</h3>
            
            {/* Candidate Info */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Candidate Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="ml-2">{interviewData?.candidateName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Position:</span>
                  <span className="ml-2">{interviewData?.position}</span>
                </div>
                <div>
                  <span className="text-gray-400">Experience:</span>
                  <span className="ml-2">{interviewData?.experience}</span>
                </div>
                <div>
                  <span className="text-gray-400">Resume:</span>
                  <button className="ml-2 text-blue-400 hover:text-blue-300 underline">
                    {interviewData?.resume}
                  </button>
                </div>
              </div>
            </div>

            {/* Interview Questions */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Interview Questions</h4>
              <div className="space-y-2">
                {interviewData?.questions.map((question, index) => (
                  <div key={index} className="p-2 bg-gray-700 rounded text-sm">
                    {index + 1}. {question}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your interview notes here..."
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Ratings */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Ratings</h4>
              <div className="space-y-3">
                <StarRating 
                  category="Technical" 
                  rating={ratings.technical} 
                  onChange={handleRatingChange} 
                />
                <StarRating 
                  category="Communication" 
                  rating={ratings.communication} 
                  onChange={handleRatingChange} 
                />
                <StarRating 
                  category="Problem Solving" 
                  rating={ratings.problemSolving} 
                  onChange={handleRatingChange} 
                />
                <StarRating 
                  category="Cultural Fit" 
                  rating={ratings.culturalFit} 
                  onChange={handleRatingChange} 
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                Recommend for Next Round
              </button>
              <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
                Schedule Follow-up
              </button>
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                Not a Good Fit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-3 rounded-full transition-colors ${
              isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isMicOn ? <FiMic className="w-5 h-5" /> : <FiMicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3 rounded-full transition-colors ${
              isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isVideoOn ? <FiVideo className="w-5 h-5" /> : <FiVideoOff className="w-5 h-5" />}
          </button>

          <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <FiSettings className="w-5 h-5" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          >
            <FiPhone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
