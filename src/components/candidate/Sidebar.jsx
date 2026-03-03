import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiBriefcase,
  FiFileText,
  FiUser,
  FiShield,
  FiClipboard
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const jobSearchMenu = [
  { 
    path: '/candidate', 
    icon: FiHome, 
    label: 'Dashboard',
    description: 'Job Search Overview'
  },
  { 
    path: '/candidate/careers', 
    icon: FiBriefcase, 
    label: 'Careers',
    description: 'Browse Job Opportunities'
  },
  { 
    path: '/candidate/applications', 
    icon: FiFileText, 
    label: 'My Applications',
    description: 'Track Applications'
  },
  { 
    path: '/candidate/profile', 
    icon: FiUser, 
    label: 'My Profile',
    description: 'Personal Information'
  },
  { 
    path: '/candidate/pre-employment-form', 
    icon: FiClipboard, 
    label: 'Pre-employment Form',
    description: 'Complete Onboarding Form'
  }
];

export default function Sidebar() {
  const location = useLocation();
  const sidebarRef = useRef(null);
  const { user } = useAuth();

  const onboardingRequired =
    user?.role === 'CANDIDATE' &&
    !!user?.employee_id &&
    user?.is_onboarded === false;

  const portalTitle = onboardingRequired ? 'Onboarding Portal' : 'Candidate Portal';
  const portalSubtitle = onboardingRequired
    ? 'Complete your onboarding journey'
    : 'Job Search & Applications';

  const dynamicMenu = onboardingRequired
    ? [
        {
          path: '/candidate/onboarding',
          icon: FiClipboard,
          label: 'Onboarding Checklist',
          description: 'Submit required documents'
        }
      ]
    : jobSearchMenu;

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
      className="w-64 bg-gradient-to-b from-white via-teal-50 to-emerald-50 dark:from-gray-800 dark:via-gray-850 dark:to-teal-950 text-gray-800 dark:text-gray-200 h-screen shadow-xl border-r border-teal-200/50 dark:border-gray-700/50 transition-all duration-300 ease-out overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 dark:scrollbar-thumb-teal-600 scrollbar-track-teal-100 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-teal-400 dark:hover:scrollbar-thumb-teal-500"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#5eead4 #ccfbf1',
        scrollBehavior: 'smooth',
        scrollPaddingTop: '1rem'
      }}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-teal-200/50 dark:border-gray-700/50 bg-gradient-to-r from-teal-50/50 dark:from-gray-700/50 to-emerald-50/50 dark:to-gray-800/50">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-xl shadow-lg">
            <FiShield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{portalTitle}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{portalSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="relative h-2 bg-teal-200/30 dark:bg-teal-900/30 mx-4 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-full transition-all duration-500 ease-out shadow-lg"
          style={{ width: '0%' }}
          id="candidate-scroll-progress"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse" />
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 pb-8">
        {dynamicMenu.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 p-4 rounded-xl transition-all duration-500 hover:scale-105 hover:translate-x-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 shadow-xl transform scale-105 border border-teal-400/20 text-white'
                  : 'hover:bg-gradient-to-r hover:from-teal-100 hover:to-emerald-100 dark:hover:from-gray-700 dark:hover:to-gray-800 hover:shadow-lg border border-transparent hover:border-teal-200/50 dark:hover:border-gray-600/50 text-gray-700 dark:text-gray-300'
              }`}
              style={{ 
                animationDelay: `${index * 120}ms`,
                transform: `translateX(${index * 2}px)`,
                transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                willChange: 'transform'
              }}
            >
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-white/20 shadow-lg' 
                  : 'bg-teal-100/50 dark:bg-gray-700/50 group-hover:bg-teal-200/50 dark:group-hover:bg-gray-600/50 group-hover:shadow-md'
              }`}>
                <Icon className={`w-5 h-5 transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300'
                }`} />
              </div>
              <div className="flex-1">
                <div className={`font-semibold transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  {item.label}
                </div>
                <div className={`text-xs transition-colors duration-300 ${
                  isActive ? 'text-teal-100' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="p-4 border-t border-teal-200/50 mt-auto">
        <div className="bg-gradient-to-r from-teal-100 to-emerald-100 rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <FiShield className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold text-teal-800">Need Help?</span>
          </div>
          <p className="text-xs text-teal-700 font-medium">
            Use the HR Assistant chat for quick help with applications and job search.
          </p>
        </div>
      </div>
    </div>
  );
}
