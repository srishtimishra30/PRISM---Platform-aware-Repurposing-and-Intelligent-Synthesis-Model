import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Video,
  Globe,
  Mic,
  Copy,
  Check,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const PLATFORM_COLORS = {
  summary: { label: 'Summary', bg: 'bg-purple-100 text-purple-700 border-purple-200' },
  linkedin_post: { label: 'LinkedIn', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
  twitter_thread: { label: 'Twitter / X', bg: 'bg-sky-100 text-sky-700 border-sky-200' },
  instagram_caption: { label: 'Instagram', bg: 'bg-pink-100 text-pink-700 border-pink-200' },
  youtube_content: { label: 'YouTube', bg: 'bg-red-100 text-red-700 border-red-200' },
  email_newsletter: { label: 'Newsletter', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  blog_post: { label: 'Blog Post', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export default function HistoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [outputFilter, setOutputFilter] = useState("all")

  // Modal & Copy State
  const [selectedItem, setSelectedItem] = useState(null)
  const [activeModalTab, setActiveModalTab] = useState("summary")
  const [copiedKey, setCopiedKey] = useState("")

  const fetchHistory = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API}/api/content?limit=100`)
      if (!res.ok) {
        throw new Error(`Failed to load history (Status ${res.status})`)
      }
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || "Failed to connect to backend server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (contentId) => {
    if (!confirm("Are you sure you want to permanently delete this content item and its synthesized outputs?")) {
      return
    }

    try {
      const res = await fetch(`${API}/api/content/${contentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (Status ${res.status})`)
      setItems((prev) => prev.filter((item) => item.id !== contentId))
      if (selectedItem?.id === contentId) {
        setSelectedItem(null)
      }
    } catch (err) {
      alert("Error deleting item: " + err.message)
    }
  }

  const handleCopy = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(""), 2000)
  }

  const handleDownload = (text, filename) => {
    if (!text) return
    const blob = new Blob([text], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `prism-${filename.toLowerCase().replace(/\s+/g, "-")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtered Items Calculation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Source filter
      if (sourceFilter !== "all" && item.type !== sourceFilter) {
        return false
      }

      // 2. Output filter
      if (outputFilter !== "all") {
        if (!item.outputs || !item.outputs[outputFilter]) {
          return false
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const textMatch = (item.raw_text || "").toLowerCase().includes(q)
        const urlMatch = (item.source_url || "").toLowerCase().includes(q)
        const outputMatch = Object.values(item.outputs || {}).some((v) =>
          (v || "").toLowerCase().includes(q)
        )
        if (!textMatch && !urlMatch && !outputMatch) {
          return false
        }
      }

      return true
    })
  }, [items, sourceFilter, outputFilter, searchQuery])

  const renderSourceIcon = (type) => {
    switch (type) {
      case "youtube":
        return <Video size={16} className="text-red-500" />
      case "url":
        return <Globe size={16} className="text-blue-500" />
      case "pdf":
        return <FileText size={16} className="text-amber-500" />
      case "audio":
        return <Mic size={16} className="text-emerald-500" />
      default:
        return <FileText size={16} className="text-[#6C5CE7]" />
    }
  }

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#6C5CE7]"></span>
            <p className="text-xs uppercase tracking-wider text-[#6C5CE7] font-bold">
              Content Archive
            </p>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#15161A] tracking-tight">
            Content History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View, search, filter, and export all previously synthesized assets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHistory}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#4638E0] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 hover:opacity-95 transition-opacity"
          >
            <Sparkles size={14} />
            <span>Generate New</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchHistory} className="font-bold underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, titles, or generated text..."
            className="w-full text-xs sm:text-sm pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400 bg-gray-50/50"
          />
          <Search className="absolute left-3.5 top-3 text-gray-400" size={17} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Source Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            >
              <option value="all">All Sources</option>
              <option value="text">Raw Text</option>
              <option value="url">Article / Web URL</option>
              <option value="youtube">YouTube Video</option>
              <option value="pdf">PDF Document</option>
              <option value="audio">Podcast / Audio</option>
            </select>
          </div>

          {/* Output Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400">Output:</span>
            <select
              value={outputFilter}
              onChange={(e) => setOutputFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            >
              <option value="all">All Outputs</option>
              <option value="summary">Summary</option>
              <option value="linkedin_post">LinkedIn</option>
              <option value="twitter_thread">Twitter / X</option>
              <option value="instagram_caption">Instagram</option>
              <option value="youtube_content">YouTube</option>
              <option value="email_newsletter">Newsletter</option>
              <option value="blog_post">Blog Rewrite</option>
            </select>
          </div>

          {(searchQuery || sourceFilter !== "all" || outputFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("")
                setSourceFilter("all")
                setOutputFilter("all")
              }}
              className="text-xs font-bold text-[#6C5CE7] hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#6C5CE7]" />
            <span>Loading content history from database...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <Layers size={36} className="mx-auto text-gray-300 stroke-1" />
            <h3 className="text-sm font-bold text-gray-700">No content items found</h3>
            <p className="text-xs max-w-sm mx-auto text-gray-400">
              {items.length === 0
                ? "You haven't repurposed any content yet. Try generating your first piece on the Generate page."
                : "No items match your active search and filter criteria. Try resetting the filters."}
            </p>
            {items.length === 0 && (
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20 mt-2"
              >
                <span>Repurpose First Item</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                  <th className="py-4 px-6">Content Title & Preview</th>
                  <th className="py-4 px-4">Source</th>
                  <th className="py-4 px-4">Outputs</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {filteredItems.map((item) => {
                  const outputKeys = Object.keys(item.outputs || {})
                  const title = item.source_url
                    ? (item.source_url.startsWith("http") ? item.source_url : item.source_url)
                    : (item.raw_text?.slice(0, 50) + "..." || "Untitled Snippet")

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors group">
                      {/* Title & Preview */}
                      <td className="py-4 px-6 max-w-md">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 mt-0.5 shrink-0">
                            {renderSourceIcon(item.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {title}
                            </h3>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {item.raw_text || "No preview available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Source Type */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                          {item.type || "text"}
                        </span>
                      </td>

                      {/* Output Types Generated */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {outputKeys.length === 0 ? (
                            <span className="text-[11px] text-gray-400">None</span>
                          ) : (
                            outputKeys.map((key) => {
                              const meta = PLATFORM_COLORS[key] || { label: key, bg: 'bg-gray-100 text-gray-600' }
                              return (
                                <span
                                  key={key}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.bg}`}
                                >
                                  {meta.label}
                                </span>
                              )
                            })
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent"}
                        <span className="block text-[10px] text-gray-400">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => {
                              setSelectedItem(item)
                              const firstKey = Object.keys(item.outputs || {})[0] || "summary"
                              setActiveModalTab(firstKey)
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye size={13} className="text-[#6C5CE7]" />
                            <span>View</span>
                          </button>

                          {/* Quick Copy summary/raw */}
                          <button
                            onClick={() => handleCopy(item.outputs?.summary || item.raw_text, item.id)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#6C5CE7] hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Copy summary"
                          >
                            {copiedKey === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>

                          {/* Quick Download */}
                          <button
                            onClick={() => handleDownload(item.outputs?.summary || item.raw_text, `content-${item.id}`)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Download .txt"
                          >
                            <Download size={14} />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View for Detailed Outputs */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C5CE7] bg-purple-50 px-2 py-0.5 rounded">
                  {selectedItem.type} Input
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                  {selectedItem.source_url || "Ingested Content Item"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID: {selectedItem.id} • Synthesized outputs: {Object.keys(selectedItem.outputs || {}).length}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-gray-100">
              <button
                onClick={() => setActiveModalTab("source")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeModalTab === "source"
                    ? "bg-[#15161A] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Original Source Text
              </button>
              {Object.keys(selectedItem.outputs || {}).map((platKey) => {
                const label = PLATFORM_COLORS[platKey]?.label || platKey
                return (
                  <button
                    key={platKey}
                    onClick={() => setActiveModalTab(platKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      activeModalTab === platKey
                        ? "bg-[#6C5CE7] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto my-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
              {activeModalTab === "source"
                ? selectedItem.raw_text
                : selectedItem.outputs?.[activeModalTab] || "No content generated for this channel."}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Created: {new Date(selectedItem.created_at).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = activeModalTab === "source"
                      ? selectedItem.raw_text
                      : selectedItem.outputs?.[activeModalTab]
                    handleCopy(text, "modal-copy")
                  }}
                  className="px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "modal-copy" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "modal-copy" ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={() => {
                    const text = activeModalTab === "source"
                      ? selectedItem.raw_text
                      : selectedItem.outputs?.[activeModalTab]
                    handleDownload(text, `${selectedItem.id}-${activeModalTab}`)
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
