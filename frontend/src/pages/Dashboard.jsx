import { useState, useEffect } from 'react'
import {
  FileText,
  Zap,
  Clock,
  ArrowRight,
  RefreshCw,
  Layers,
  Calendar,
  Share2,
  CheckCircle,
  BarChart2,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import { Link } from 'react-router-dom'


const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const platforms = [
  { name: 'Summary', desc: 'Concise key points & insights', color: '#6C5CE7' },
  { name: 'LinkedIn', desc: 'Professional post & hook', color: '#0A66C2' },
  { name: 'Twitter / X', desc: 'Multi-tweet structured thread', color: '#1DA1F2' },
  { name: 'Instagram', desc: 'Engaging caption, emojis & tags', color: '#E1306C' },
  { name: 'YouTube', desc: 'SEO title, description & key points', color: '#FF0000' },
  { name: 'Email Newsletter', desc: 'Subject lines & preview text', color: '#10B981' },
  { name: 'Blog Rewrite', desc: 'SEO title, headings & conclusion', color: '#F59E0B' },
]

function Dashboard() {
  const [history, setHistory] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")

  const loadData = async () => {
    setLoading(true)
    setFetchError("")

    try {
      // 1. Fetch History
      try {
        const hRes = await fetch(`${API}/api/content?limit=50`)
        if (hRes.ok) {
          const hData = await hRes.json()
          setHistory(Array.isArray(hData) ? hData : [])
        }
      } catch (err) {
        console.warn("History fetch error:", err)
      }

      // 2. Fetch Analytics
      try {
        const aRes = await fetch(`${API}/api/publishing/analytics`)
        if (aRes.ok) {
          const aData = await aRes.json()
          setAnalytics(aData)
        }
      } catch (err) {
        console.warn("Analytics fetch error:", err)
      }

      // 3. Fetch Schedules
      try {
        const sRes = await fetch(`${API}/api/schedules`)
        if (sRes.ok) {
          const sData = await sRes.json()
          setSchedules(Array.isArray(sData) ? sData : [])
        }
      } catch (err) {
        console.warn("Schedules fetch error:", err)
      }
    } catch (e) {
      setFetchError("Unable to reach backend API. Make sure the backend server is running on http://127.0.0.1:8000.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const totalProcessed = analytics?.total_content_inputs ?? history.length
  const totalOutputs = analytics?.total_outputs_generated ?? history.reduce((acc, i) => acc + Object.keys(i.outputs || {}).length, 0)
  const totalScheduled = analytics?.total_scheduled_posts ?? schedules.length


  const stats = [
    { label: 'Source Items Ingested', value: totalProcessed, icon: FileText, color: '#6C5CE7' },
    { label: 'Platform Outputs Synthesized', value: totalOutputs, icon: Layers, color: '#10B981' },
    { label: 'Scheduled Content Queue', value: totalScheduled, icon: Calendar, color: '#F59E0B' },
    { label: 'Channels Covered', value: '7', icon: Zap, color: '#0A66C2' },
  ]

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-xs uppercase tracking-wider text-[#6C5CE7] font-bold">
              PRISM Command Center
            </p>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#15161A] tracking-tight">
            Dashboard & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time pipeline metrics, multi-channel distribution, and scheduling queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#4638E0] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 hover:opacity-95 transition-opacity"
          >
            <span>Create Content</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Stats Grid */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <Icon size={20} style={{ color }} />
            </div>
            <div className="text-3xl font-extrabold text-[#15161A] mb-1">
              {loading ? "..." : value}
            </div>
            <div className="text-xs font-medium text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* MODULE 4: ANALYTICS & AI RECOMMENDATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Output Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 size={16} className="text-[#6C5CE7]" />
              Platform Output Distribution
            </h2>
            <span className="text-xs text-gray-400">Total: {totalOutputs} generated</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {Object.entries(analytics?.platform_distribution || {}).map(([plat, count]) => (
              <div key={plat} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-[11px] font-medium text-gray-500 uppercase mt-0.5 truncate">
                  {plat.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          {/* Supported Engine Status */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Engine Coverage
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {platforms.map((p) => (
                <div key={p.name} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ backgroundColor: p.color }} />
                  <div className="text-[11px] font-bold text-gray-800 truncate">{p.name}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold mt-1">ONLINE</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#6C5CE7]" />
              AI Improvement Tips
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Real-time heuristic recommendations for cross-platform engagement.
            </p>

            <div className="space-y-3">
              {(analytics?.ai_recommendations || []).map((tip, idx) => (
                <div key={idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
                  <span className="font-bold text-[#6C5CE7]">{idx + 1}.</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-500" />
            <span>Refreshes dynamically with content updates</span>
          </div>
        </div>
      </div>

      {/* MODULE 4: SCHEDULED CONTENT QUEUE */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-[#6C5CE7]" />
              Scheduled Publication Queue ({schedules.length})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Posts queued in the database. Connect Buffer / Hootsuite in Settings for external publishing.
            </p>
          </div>

          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            Queue Ready
          </span>
        </div>

        {schedules.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400">
            No scheduled posts yet. Open any generated content on the Generate page and use the Scheduler bar.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {schedules.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold uppercase text-[10px] bg-purple-50 text-[#6C5CE7] px-2 py-0.5 rounded">
                    {s.platform}
                  </span>
                  <p className="text-gray-800 font-medium truncate max-w-md">{s.content}</p>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>{s.scheduled_time ? (isNaN(new Date(s.scheduled_time).getTime()) ? s.scheduled_time : new Date(s.scheduled_time).toLocaleString()) : 'Pending'}</span>
                  <span className="text-emerald-600 font-semibold uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* RECENT INGESTED CONTENT */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Recent Ingested Content Items
          </h2>
          <Link to="/history" className="text-xs font-semibold text-[#6C5CE7] hover:underline">
            View full archive ({history.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-gray-400 text-xs">
            Loading activity feed...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-xs">
            No content processed yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm divide-y divide-gray-100">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 text-[#6C5CE7]">
                    {item.type || 'text'}
                  </span>
                  <p className="text-xs text-gray-800 font-medium truncate max-w-md">
                    {item.raw_text}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{Object.keys(item.outputs || {}).length} platform outputs</span>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard