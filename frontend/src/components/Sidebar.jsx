import { Link, useLocation } from 'react-router-dom'
import { Sparkles, LayoutGrid, Send } from 'lucide-react'

function Sidebar() {
  const location = useLocation()
  const items = [
    { path: '/', label: 'Generate', icon: Send },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  ]

  return (
    <aside className="w-64 h-screen bg-[#0F1015] text-white flex flex-col fixed left-0 top-0">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#4638E0] flex items-center justify-center">
          <Sparkles size={16} />
        </div>
        <span className="font-semibold text-lg tracking-tight">PRISM</span>
      </div>

      <nav className="flex-1 px-3 mt-4">
        {items.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-6 text-xs text-white/30">PRISM v0.1 — Week 2</div>
    </aside>
  )
}

export default Sidebar