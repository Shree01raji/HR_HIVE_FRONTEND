import React from 'react';
import { Outlet } from 'react-router-dom';
import HorizontalNav from '../components/employee/HorizontalNav';
import Header from '../components/employee/Header';
import ChatWidget from '../components/ChatWidget';

export default function EmployeeLayout() {
  return (
    <div className="h-screen bg-[#e8f0f5] dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col h-full">
        <HorizontalNav />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-[#e8f0f5] dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}