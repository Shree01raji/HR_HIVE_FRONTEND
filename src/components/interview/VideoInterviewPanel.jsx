import React, { useState, useEffect, useRef } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiMessageCircle, FiUsers, FiClock, FiCheck, FiX, FiShare2, FiSettings } from 'react-icons/fi';

const VideoInterviewPanel = ({ interviewId, userRole, onInterviewComplete }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [interviewStatus, setInterviewStatus] = useState('waiting');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [interviewFeedback, setInterviewFeedback] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    initializeVideo();
    loadInterviewData();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [interviewId]);

  const initializeVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        localStreamRef.current = stream;
      }
      
      // Simulate other participants joining
      setParticipants([
        { id: 1, name: 'Interviewer', role: 'interviewer', isVideoOn: true, isAudioOn: true },
        { id: 2, name: 'Candidate', role: 'candidate', isVideoOn: true, isAudioOn: true }
      ]);
      
      setInterviewStatus('active');
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const loadInterviewData = async () => {
    // Load interview details, notes, etc.
    // This would typically fetch from API
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current) {
            videoRef.current.srcObject = localStreamRef.current;
          }
        };
      } else {
        if (localStreamRef.current) {
          videoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        sender: userRole === 'interviewer' ? 'Interviewer' : 'Candidate',
        message: newMessage,
        timestamp: new Date(),
        type: 'text'
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const completeInterview = async () => {
    if (userRole === 'interviewer') {
      // Save interview feedback and notes
      const interviewData = {
        interviewId,
        feedback: interviewFeedback,
        notes: interviewNotes,
        status: 'completed',
        duration: Date.now() - Date.now() // Calculate actual duration
      };
      
      // API call to save interview data
      console.log('Saving interview data:', interviewData);
      
      setInterviewStatus('completed');
      onInterviewComplete?.(interviewData);
    }
  };

  const endInterview = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setInterviewStatus('ended');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Video Container */}
        <div className="flex-1 relative bg-gray-800">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Interview Info Overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 p-3 rounded-lg">
            <h2 className="text-lg font-semibold">Interview Session</h2>
            <p className="text-sm text-gray-300">Round 1 - Technical Interview</p>
            <div className="flex items-center mt-2">
              <FiClock className="mr-2" />
              <span className="text-sm">45 minutes</span>
            </div>
          </div>

          {/* Participants */}
          <div className="absolute top-4 right-4">
            <div className="flex space-x-2">
              {participants.map(participant => (
                <div key={participant.id} className="bg-black bg-opacity-50 p-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      {participant.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{participant.name}</p>
                      <div className="flex space-x-1">
                        {participant.isVideoOn ? (
                          <FiVideo className="w-3 h-3 text-green-400" />
                        ) : (
                          <FiVideoOff className="w-3 h-3 text-red-400" />
                        )}
                        {participant.isAudioOn ? (
                          <FiMic className="w-3 h-3 text-green-400" />
                        ) : (
                          <FiMicOff className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="absolute bottom-4 left-4">
            <div className={`px-3 py-1 rounded-full text-sm ${
              interviewStatus === 'active' ? 'bg-green-500' : 
              interviewStatus === 'waiting' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}>
              {interviewStatus === 'active' ? 'Live' : 
               interviewStatus === 'waiting' ? 'Waiting' : 'Ended'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isAudioOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isVideoOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            <FiShare2 size={20} />
          </button>
          
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 rounded-full ${
              showChat ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            <FiMessageCircle size={20} />
          </button>
          
          {userRole === 'interviewer' && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-3 rounded-full ${
                showNotes ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              <FiSettings size={20} />
            </button>
          )}
          
          <div className="w-px h-8 bg-gray-600"></div>
          
          {userRole === 'interviewer' && (
            <button
              onClick={completeInterview}
              className="p-3 rounded-full bg-green-600 hover:bg-green-500"
            >
              <FiCheck size={20} />
            </button>
          )}
          
          <button
            onClick={endInterview}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Side Panels */}
      {showChat && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map(message => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-blue-400">
                    {message.sender}
                  </span>
                  <span className="text-xs text-gray-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-gray-700 p-2 rounded-lg">
                  <p className="text-sm">{message.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotes && userRole === 'interviewer' && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Interview Notes</h3>
          </div>
          
          <div className="flex-1 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Live Notes</label>
              <textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Take notes during the interview..."
                className="w-full h-32 bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Final Feedback</label>
              <textarea
                value={interviewFeedback}
                onChange={(e) => setInterviewFeedback(e.target.value)}
                placeholder="Overall assessment and feedback..."
                className="w-full h-32 bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={completeInterview}
              className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
            >
              Complete Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInterviewPanel;
