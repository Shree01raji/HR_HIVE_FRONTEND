import React, { useState, useEffect } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiPlus, FiLink, FiX } from 'react-icons/fi';
import { calendarAPI } from '../../services/api';

const CalendarWidget = ({ compact = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await calendarAPI.getEvents(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setEvents(response.events || []);
      setLeaves(response.leaves || []);
      setInterviews(response.interviews || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const allEvents = [
      ...events.map(e => ({ ...e, type: 'event' })),
      ...leaves.map(l => ({ ...l, type: 'leave', title: `Leave: ${l.leave_type}`, color: '#EF4444' })),
      ...interviews.map(i => ({ ...i, type: 'interview', title: `Interview: ${i.candidate_name}`, color: '#10B981' })),
      // ...googleEvents.map(g => ({ ...g, type: 'google', color: '#4285F4' }))
    ];
    
    return allEvents.filter(event => {
      const eventDate = event.start_date || event.start || event.date;
      if (!eventDate) return false;
      const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  // Get upcoming events (next 5 days)
  const getUpcomingEvents = () => {
    const allEvents = [
      ...events.map(e => ({ ...e, type: 'event', date: e.start_date || e.start || e.date })),
      ...leaves.map(l => ({ ...l, type: 'leave', title: `Leave: ${l.leave_type}`, color: '#EF4444', date: l.start_date || l.date })),
      ...interviews.map(i => ({ ...i, type: 'interview', title: `Interview: ${i.candidate_name}`, color: '#10B981', date: i.interview_date || i.date })),
      // ...googleEvents.map(g => ({ ...g, type: 'google', color: '#4285F4', date: g.start }))
    ];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return allEvents
      .filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  if (compact) {
    // Simple icon-based calendar widget
    const upcomingEvents = getUpcomingEvents();
    const todayEvents = getEventsForDate(today);
    const eventCount = upcomingEvents.length;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/employee/calendar'}
            className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-3 transition-colors w-full"
          >
            <div className="relative">
              <FiCalendar className="w-8 h-8 text-indigo-600" />
              {todayEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {todayEvents.length}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-800">Calendar</div>
              <div className="text-xs text-gray-500">
                {eventCount > 0 ? `${eventCount} upcoming event${eventCount > 1 ? 's' : ''}` : 'No upcoming events'}
              </div>
            </div>
            {/* {googleCalendarStatus?.connected && (
              <div className="flex items-center space-x-1 text-green-600" title="Google Calendar Connected">
                <FiLink className="w-4 h-4" />
              </div>
            )} */}
          </button>
          
          {/* {!googleCalendarStatus?.connected && (
            <button
              onClick={connectGoogleCalendar}
              className="ml-2 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition whitespace-nowrap"
              title="Connect Google Calendar"
            >
              <FiLink className="w-3 h-3 inline mr-1" />
              Connect
            </button>
          )} */}
        </div>

        {/* Event Modal */}
        <EventModal
          event={selectedEvent}
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      </div>
    );
  }

  // Full calendar view (for separate page)
  return null;
};

// Event Modal Component
const EventModal = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-3">
            {event.description && (
              <div>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FiCalendar className="w-4 h-4" />
              <span>{formatDateTime(event.date || event.start_date || event.start)}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>📍</span>
                <span>{event.location}</span>
              </div>
            )}
            
            {event.type && (
              <div className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                   style={{ backgroundColor: event.color || '#3B82F6', color: 'white' }}>
                {event.type === 'leave' ? 'Leave' : 
                 event.type === 'interview' ? 'Interview' : 
                 event.type === 'google' ? 'Google Calendar' : 'Event'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
