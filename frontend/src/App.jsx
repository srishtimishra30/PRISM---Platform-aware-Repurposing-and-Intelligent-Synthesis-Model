import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PageSkeleton from './components/PageSkeleton'
import GlobalProgressIndicator from './components/GlobalProgressIndicator'

// Lazy-loaded pages for fast navigation and instant responsiveness
const InputPage = lazy(() => import('./pages/InputPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#F7F7F9]">
        <Sidebar />
        <main className="ml-64 flex-1 min-h-screen relative pb-16">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<InputPage />} />
              <Route path="/generate" element={<InputPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Catch-all redirect to ensure unknown paths don't break the app */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Persistent Background AI Generation Progress Indicator */}
          <GlobalProgressIndicator />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
