import React from 'react';
import { Outlet } from 'react-router-dom';
import HorizontalNav from '../components/manager/HorizontalNav';
 
export default function ManagerLayout() {
  return (
    <div className="h-screen bg-[#e8f0f5] dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col h-full">
        <HorizontalNav />
        <main className="flex-1 overflow-y-auto p-6 bg-[#e8f0f5] dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}