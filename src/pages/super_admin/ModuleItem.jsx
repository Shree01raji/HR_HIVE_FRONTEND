import React from 'react'

const ModuleItem = ({ title, description }) => {
  return (
    <div className="flex items-center justify-between bg-white shadow-sm rounded-md p-4 mb-4">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 4h1V9h-6v7h1m4-4h.01" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      </div>
      <div className="text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export default ModuleItem
