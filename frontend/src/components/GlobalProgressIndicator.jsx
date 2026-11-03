import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { useGeneration } from '../context/GenerationContext'
import { PlatformIcon } from './ChannelIcons'

const CHANNEL_NAMES = {
  summary: "Summary",
  linkedin_post: "LinkedIn Post",
  twitter_thread: "Twitter / X Thread",
  instagram_caption: "Instagram Caption",
  youtube_content: "YouTube Metadata",
  email_newsletter: "Email Newsletter",
  blog_post: "Blog Rewrite",
}

const ALL_CHANNEL_KEYS = [
  "summary",
  "linkedin_post",
  "twitter_thread",
  "instagram_caption",
  "youtube_content",
  "email_newsletter",
  "blog_post",
]

export default function GlobalProgressIndicator() {
  const {
    activeJob,
    isGenerating,
    isCompleted,
    isPartiallyCompleted,
    isFailed,
    isPanelOpen,
    setIsPanelOpen,
    isDismissed,
    dismissJob,
    clearJob,
    retryFailedJobChannels,
  } = useGeneration()

  const navigate = useNavigate()
  const location = useLocation()

  // Don't render if no job exists or user dismissed it after completion
  if (!activeJob || (isDismissed && !isGenerating)) {
    return null
  }

  const completed = activeJob.completed_channels || 0
  const total = activeJob.total_channels || 7
  const progress = activeJob.progress || 0

  // Map channel results by platform
  const channelResultsMap = {}
  ;(activeJob.channel_results || []).forEach((r) => {
    channelResultsMap[r.platform] = r
  })

  const hasFailedChannels = (activeJob.channel_results || []).some(
    (r) => r.status === "Failed"
  )

  const handleViewResults = () => {
    if (location.pathname !== '/' && location.pathname !== '/generate') {
      navigate('/')
    }
    setIsPanelOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full sm:w-[420px] transition-all select-none">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          COMPACT EXPANDED PROGRESS PANEL (Shown when clicked)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isPanelOpen && (
        <div className="mb-3 bg-white rounded-2xl border border-gray-200/90 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-[#6C5CE7]">
                <Sparkles size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                  Background Generation Queue
                </h4>
                <p className="text-[10px] text-gray-400">
                  Runs independently across all pages
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Channels Progress Table */}
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto divide-y divide-gray-50">
            {ALL_CHANNEL_KEYS.map((key) => {
              const res = channelResultsMap[key]
              const status = res ? res.status : isGenerating ? "Pending" : "Idle"
              const name = CHANNEL_NAMES[key] || key

              return (
                <div
                  key={key}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={key} size={18} />
                    <span className="font-semibold text-gray-800">{name}</span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {status === "Completed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle size={12} className="text-emerald-500" />
                        Completed
                      </span>
                    ) : status === "Processing" || (isGenerating && status === "Pending" && !res) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                        <RefreshCw size={11} className="animate-spin text-[#6C5CE7]" />
                        Processing
                      </span>
                    ) : status === "Failed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        <AlertCircle size={12} className="text-red-500" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        <Clock size={11} />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Footer in Panel */}
          <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
            {hasFailedChannels && (
              <button
                onClick={() => retryFailedJobChannels()}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Retry Failed</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {(isCompleted || isPartiallyCompleted) && (
                <button
                  onClick={handleViewResults}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>View Results</span>
                  <ArrowRight size={13} />
                </button>
              )}
              <button
                onClick={clearJob}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PERSISTENT FLOATING BAR (Click to toggle panel)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`p-4 rounded-2xl shadow-xl border cursor-pointer transition-all hover:scale-[1.01] ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 text-white'
            : isPartiallyCompleted
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400 text-white'
            : isFailed
            ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-500 text-white'
            : 'bg-[#0F1015] border-white/10 text-white'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Status Message */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isCompleted
                  ? 'bg-white/20'
                  : isFailed
                  ? 'bg-white/20'
                  : 'bg-gradient-to-tr from-[#6C5CE7] to-[#4F46E5]'
              }`}
            >
              {isGenerating ? (
                <RefreshCw size={18} className="animate-spin text-white" />
              ) : isCompleted ? (
                <CheckCircle size={18} className="text-white" />
              ) : (
                <AlertCircle size={18} className="text-white" />
              )}
            </div>

            <div>
              <div className="text-xs sm:text-sm font-bold tracking-tight">
                {isGenerating
                  ? "Synthesizing All Channels..."
                  : isCompleted
                  ? "Content Generation Completed!"
                  : isPartiallyCompleted
                  ? "Generation Finished (Partial)"
                  : "Generation Encountered Issues"}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {isGenerating
                  ? `${completed} / ${total} Channels Completed (${progress}%)`
                  : isCompleted
                  ? "All 7 channels processed and ready"
                  : "Click to inspect channel status"}
              </div>
            </div>
          </div>

          {/* Right Chevron & Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {(isCompleted || isPartiallyCompleted) && (
              <button
                onClick={handleViewResults}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors cursor-pointer mr-1"
              >
                View
              </button>
            )}
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              title="Toggle Progress Panel"
            >
              {isPanelOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              onClick={dismissJob}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 cursor-pointer"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar (Visible while generating) */}
        {isGenerating && (
          <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

