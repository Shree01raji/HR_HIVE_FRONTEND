import React, { useState, useEffect } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhone, FiSettings, FiUser } from 'react-icons/fi';

export default function VideoInterview() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Simulate joining interview
    const timer = setTimeout(() => {
      setIsConnected(true);
      setInterviewData({
        interviewerName: 'Sarah Johnson',
        position: 'Senior Software Engineer',
        company: 'TechCorp',
        duration: 60
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
          <h1 className="text-xl font-semibold">Interview with {interviewData?.interviewerName}</h1>
          <p className="text-gray-400">{interviewData?.position} at {interviewData?.company}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-gray-400">Time: </span>
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Interviewer Video */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg h-96 lg:h-full flex items-center justify-center relative">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUser className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-lg font-medium">{interviewData?.interviewerName}</p>
                <p className="text-gray-400">Interviewer</p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Connected</span>
                </div>
              </div>
              
              {/* Video placeholder - would be replaced with actual video stream */}
              <div className="absolute inset-0 bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FiVideo className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Video stream would appear here</p>
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
                <p className="text-xs text-gray-400">Candidate</p>
              </div>
              
              {/* Your video placeholder */}
              <div className="absolute inset-0 bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FiVideo className="w-12 h-12 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Your video</p>
                </div>
              </div>
            </div>

            {/* Interview Info */}
            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Interview Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Position:</span>
                  <span className="ml-2">{interviewData?.position}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="ml-2">{interviewData?.duration} minutes</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="ml-2">Technical Interview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      {/* Interview Tips */}
      <div className="bg-blue-900 bg-opacity-50 px-6 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <p className="text-sm">
            <strong>Tip:</strong> Make sure you're in a quiet, well-lit environment. Test your camera and microphone before the interview starts.
          </p>
        </div>
      </div>
    </div>
  );
}
