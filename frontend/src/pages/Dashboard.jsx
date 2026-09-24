import { FileText, Zap, Clock } from 'lucide-react'

const stats = [
  { label: 'Content processed', value: '0', icon: FileText },
  { label: 'Platforms covered', value: '5', icon: Zap },
  { label: 'Avg. generation time', value: '—', icon: Clock },
]

const platforms = [
  { name: 'Twitter/X', color: '#E5484D' },
  { name: 'LinkedIn', color: '#2F80ED' },
  { name: 'Instagram', color: '#9B51E0' },
  { name: 'YouTube', color: '#F2994A' },
  { name: 'Email', color: '#27AE60' },
]

function Dashboard() {
  return (
    <div className="px-12 py-10 max-w-6xl mx-auto">
      <p className="text-sm text-[#4638E0] font-medium mb-2">Overview</p>
      <h1 className="font-display text-3xl font-semibold mb-8 text-[#15161A]">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#ECECEF] p-5">
            <Icon size={18} className="text-[#4638E0] mb-3" />
            <div className="text-2xl font-semibold text-[#15161A]">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium text-gray-500 mb-3">Platform output</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {platforms.map((p) => (
          <div key={p.name} className="bg-white rounded-2xl border border-[#ECECEF] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-sm font-medium text-[#15161A]">{p.name}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Waiting for content — generate something on the input page.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard