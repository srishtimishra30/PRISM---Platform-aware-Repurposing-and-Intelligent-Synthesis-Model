import React from 'react'

export default function PageSkeleton() {
  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-64 bg-gray-200 rounded-xl"></div>
        <div className="h-4 w-96 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
            <div className="h-7 w-20 bg-gray-200 rounded-lg"></div>
            <div className="h-3 w-28 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Large card skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="h-5 w-48 bg-gray-200 rounded-md"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
          <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

