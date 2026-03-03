import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiBookOpen, 
  FiCalendar, 
  FiUser,
  FiFileText,
  FiAward,
  FiMessageSquare,
  FiSettings,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';

const menuItems = [
  { 
    path: '/student', 
    icon: FiHome, 
    label: 'My Dashboard',
    description: 'Academic Overview'
  },
  { 
    path: '/student/courses', 
    icon: FiBookOpen, 
    label: 'My Courses',
    description: 'Enrolled Classes'
  },
  { 
    path: '/student/schedule', 
    icon: FiCalendar, 
    label: 'Schedule',
    description: 'Class Timetable'
  },
  { 
    path: '/student/grades', 
    icon: FiAward, 
    label: 'Grades',
    description: 'Academic Performance'
  },
  { 
    path: '/student/assignments', 
    icon: FiFileText, 
    label: 'Assignments',
    description: 'Homework & Projects'
  },
  { 
    path: '/student/profile', 
    icon: FiUser, 
    label: 'My Profile',
    description: 'Personal Information'
  },
  { 
    path: '/student/messages', 
    icon: FiMessageSquare, 
    label: 'Messages',
    description: 'Communication'
  },
  { 
    path: '/student/peers', 
    icon: FiUsers, 
    label: 'Classmates',
    description: 'Student Network'
  },
  { 
    path: '/student/progress', 
    icon: FiTrendingUp, 
    label: 'Progress',
    description: 'Learning Analytics'
  }
];

export default function Sidebar() {
  const location = useLocation();
  const sidebarRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const sidebar = sidebarRef.current;
          if (!sidebar) return;

          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          
          // Calculate scroll progress
          const scrollProgress = Math.min(scrollTop / (windowHeight * 0.3), 1);
          
          // Apply smooth parallax effect with easing
          const easedProgress = 1 - Math.pow(1 - scrollProgress, 3);
          sidebar.style.transform = `translateY(${easedProgress * 6}px)`;
          
          // Add smooth wave effect to navigation items
          const navItems = sidebar.querySelectorAll('a');
          navItems.forEach((item, index) => {
            const delay = index * 0.12;
            const waveOffset = Math.sin(scrollProgress * Math.PI * 1.2 + delay) * 2;
            const scaleEffect = 1 + (Math.sin(scrollProgress * Math.PI + delay) * 0.01);
            
            item.style.transform = `translateX(${waveOffset}px) scale(${scaleEffect})`;
            item.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          });
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={sidebarRef}
      className="w-64 bg-gradient-to-b from-white via-teal-50 to-emerald-50 text-gray-800 h-screen shadow-lg border-r border-teal-200/50 transition-all duration-300 ease-out overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-teal-100 hover:scrollbar-thumb-teal-400"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#5eead4 #ccfbf1',
        scrollBehavior: 'smooth',
        scrollPaddingTop: '1rem'
      }}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-teal-200/50 bg-gradient-to-r from-teal-50/50 to-emerald-50/50">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl shadow-md">
            <FiBookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Student Portal</h1>
            <p className="text-xs text-gray-500 font-medium">Academic Management</p>
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="relative h-1 bg-teal-200/50 mx-4 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: '0%' }}
          id="student-scroll-progress"
        />
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 pb-8">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 p-4 rounded-lg transition-all duration-300 hover:translate-x-1 animate-in fade-in-0 slide-in-from-left-4 duration-500 ${
                isActive
                  ? 'bg-teal-100 border-l-4 border-teal-600 text-teal-800 shadow-sm'
                  : 'hover:bg-emerald-50 hover:shadow-sm border-l-4 border-transparent text-gray-700'
              }`}
              style={{ 
                animationDelay: `${index * 80}ms`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
            >
              <div className={`p-2 rounded-md transition-all duration-200 ${
                isActive 
                  ? 'bg-teal-200' 
                  : 'bg-emerald-100 group-hover:bg-emerald-200'
              }`}>
                <Icon className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-teal-700' : 'text-emerald-600 group-hover:text-emerald-700'
                }`} />
              </div>
              <div className="flex-1">
                <div className={`font-medium transition-colors duration-200 ${
                  isActive ? 'text-teal-800' : 'text-gray-700 group-hover:text-gray-800'
                }`}>
                  {item.label}
                </div>
                <div className={`text-xs transition-colors duration-200 ${
                  isActive ? 'text-teal-600' : 'text-gray-500 group-hover:text-gray-600'
                }`}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="p-4 border-t border-teal-200/50 mt-auto">
        <div className="bg-gradient-to-r from-teal-100 to-emerald-100 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <FiBookOpen className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-800">Need Help?</span>
          </div>
          <p className="text-xs text-teal-600">
            Use the Academic Assistant chat for quick help with courses and assignments.
          </p>
        </div>
      </div>
    </div>
  );
}
