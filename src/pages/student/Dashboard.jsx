import React from 'react';
import { FiBookOpen, FiCalendar, FiAward, FiUsers, FiTrendingUp, FiClock } from 'react-icons/fi';

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-teal-200/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Academic Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Track your academic progress and manage your studies
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Semester</p>
              <p className="text-lg font-semibold text-teal-600">Fall 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-teal-200/50 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Courses</p>
              <p className="text-3xl font-semibold text-teal-700">5</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-lg">
              <FiBookOpen className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-emerald-200/50 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assignments Due</p>
              <p className="text-3xl font-semibold text-emerald-600">3</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <FiClock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-green-200/50 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">GPA</p>
              <p className="text-3xl font-semibold text-green-600">3.8</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FiAward className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-cyan-200/50 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Classmates</p>
              <p className="text-3xl font-semibold text-cyan-600">24</p>
            </div>
            <div className="p-3 bg-cyan-100 rounded-lg">
              <FiUsers className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-teal-200/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200">
            <div className="p-2 bg-teal-200 rounded-md">
              <FiBookOpen className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">New assignment posted</p>
              <p className="text-sm text-gray-600">Mathematics - Calculus II</p>
            </div>
            <span className="text-xs text-gray-500">2 hours ago</span>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors duration-200">
            <div className="p-2 bg-emerald-200 rounded-md">
              <FiAward className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Grade received</p>
              <p className="text-sm text-gray-600">Physics Lab Report - A+</p>
            </div>
            <span className="text-xs text-gray-500">1 day ago</span>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors duration-200">
            <div className="p-2 bg-cyan-200 rounded-md">
              <FiCalendar className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Upcoming exam</p>
              <p className="text-sm text-gray-600">Chemistry Midterm - Tomorrow</p>
            </div>
            <span className="text-xs text-gray-500">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
