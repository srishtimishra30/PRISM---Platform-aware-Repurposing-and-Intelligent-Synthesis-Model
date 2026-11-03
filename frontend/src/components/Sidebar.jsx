import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, LayoutGrid, Send, History, Settings } from 'lucide-react'

function Sidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const items = [
    {
      path: '/',
      altPaths: ['/generate'],
      label: 'Generate',
      icon: Send,
      desc: 'One source, seven channels',
    },
    {
      path: '/dashboard',
      altPaths: [],
      label: 'Dashboard',
      icon: LayoutGrid,
      desc: 'Pipeline & distribution stats',
    },
    {
      path: '/history',
      altPaths: [],
      label: 'History',
      icon: History,
      desc: 'Stored source & outputs',
    },
    {
      path: '/settings',
      altPaths: [],
      label: 'Settings',
      icon: Settings,
      desc: 'Preferences & integrations',
    },
  ]

  const isItemActive = (item) => {
    if (currentPath === item.path) return true
    if (item.altPaths && item.altPaths.includes(currentPath)) return true
    return false
  }

  return (
    <aside className="w-64 h-screen bg-[#0F1015] text-white flex flex-col fixed left-0 top-0 border-r border-white/5 z-40 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C5CE7] via-[#5D4AE0] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            PRISM
          </span>
          <span className="block text-[10px] text-white/40 font-medium tracking-wide">
            AI Content Synthesis
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 mt-5 space-y-1">
        {items.map((item) => {
          const { path, label, icon: Icon } = item
          const active = isItemActive(item)
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-white/10 text-white shadow-sm font-semibold'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Active left indicator bar */}
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#6C5CE7] rounded-r-full shadow-sm shadow-[#6C5CE7]" />
              )}
              <Icon
                size={18}
                className={active ? 'text-[#818CF8]' : 'text-white/50 transition-colors'}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-6 py-5 border-t border-white/5 text-xs text-white/30 flex items-center justify-between">
        <span>PRISM v2.0</span>
        <span className="text-[10px] text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
          Online
        </span>
      </div>
    </aside>
  )
}

export default Sidebar
