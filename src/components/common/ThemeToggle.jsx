import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ThemeToggle] Button clicked, current theme:', theme, 'isDark:', isDark);
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="relative p-2.5 rounded-xl transition-all duration-200 hover:shadow-md group text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        <FiSun
          className={`absolute inset-0 w-5 h-5 text-yellow-500 dark:text-yellow-400 transition-all duration-300 ${
            isDark
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <FiMoon
          className={`absolute inset-0 w-5 h-5 text-blue-400 dark:text-blue-300 transition-all duration-300 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
          }`}
        />
      </div>
    </button>
  );
}

