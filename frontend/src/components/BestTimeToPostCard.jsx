import React, { useState } from 'react'
import {
  Clock,
  Calendar,
  Sparkles,
  Info,
  CalendarCheck,
  Check,
  Globe,
  Send,
  AlertCircle
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST • UTC+5:30)", offset: 5.5 },
  { value: "America/New_York", label: "America/New_York (EST • UTC-5)", offset: -5 },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST • UTC-8)", offset: -8 },
  { value: "Europe/London", label: "Europe/London (GMT • UTC+0)", offset: 0 },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET • UTC+1)", offset: 1 },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST • UTC+4)", offset: 4 },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT • UTC+8)", offset: 8 },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST • UTC+9)", offset: 9 },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST • UTC+10)", offset: 10 },
  { value: "UTC", label: "UTC (Universal Coordinated Time)", offset: 0 },
]

const RECOMMENDATIONS = {
  summary: {
    day: "Monday",
    time: "09:00 AM",
    window: "8:30 AM – 10:00 AM",
    reason: "Best for weekly kickoff planning, executive alignment, and strategic focus before high-priority meetings begin.",
  },
  linkedin_post: {
    day: "Tuesday",
    time: "09:00 AM",
    window: "8:30 AM – 10:30 AM",
    reason: "B2B professionals check industry feeds upon desk arrival and before mid-morning strategy meetings.",
  },
  twitter_thread: {
    day: "Wednesday",
    time: "12:30 PM",
    window: "12:00 PM – 02:00 PM",
    reason: "Midday discussion volume peaks during lunch breaks, maximizing retweets, replies, and bookmark saves.",
  },
  instagram_caption: {
    day: "Thursday",
    time: "08:00 PM",
    window: "07:00 PM – 09:30 PM",
    reason: "High leisure mobile usage post-work hours yields peak organic visual reach, likes, and comments.",
  },
  youtube_content: {
    day: "Friday",
    time: "03:00 PM",
    window: "02:00 PM – 05:00 PM",
    reason: "Publishing 2-3 hours before peak evening viewing gives the algorithm time to process high-res video and captions.",
  },
  email_newsletter: {
    day: "Tuesday",
    time: "10:00 AM",
    window: "09:30 AM – 11:30 AM",
    reason: "Avoids Monday inbox cleanup and Friday sign-offs; industry benchmarks show highest unique open and click rates.",
  },
  blog_post: {
    day: "Monday",
    time: "10:30 AM",
    window: "09:00 AM – 12:00 PM",
    reason: "Readers consume in-depth thought leadership, guides, and reference articles early in the work week.",
  },
}

export default function BestTimeToPostCard({
  platform,
  content,
  contentId,
  selectedTimezone = "Asia/Kolkata",
  onTimezoneChange,
}) {
  const [currentTimezone, setCurrentTimezone] = useState(selectedTimezone)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default to tomorrow
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [scheduledTime, setScheduledTime] = useState("09:00")
  const [scheduling, setScheduling] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(null)
  const [scheduleError, setScheduleError] = useState("")

  const rec = RECOMMENDATIONS[platform] || RECOMMENDATIONS.linkedin_post

  const handleTimezoneChange = (tz) => {
    setCurrentTimezone(tz)
    if (onTimezoneChange) onTimezoneChange(tz)
  }

  // Handle Post Scheduling
  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    if (!content || !content.trim()) {
      setScheduleError("Cannot schedule empty content.")
      return
    }

    setScheduling(true)
    setScheduleError("")
    try {
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`
      const res = await fetch(`${API}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_id: contentId || null,
          platform: platform,
          content: content.trim(),
          scheduled_time: scheduledDateTime,
          timezone: currentTimezone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Failed to schedule post.")
      }

      setScheduleSuccess({
        date: scheduledDate,
        time: scheduledTime,
        timezone: currentTimezone,
      })
      setShowScheduler(false)
    } catch (err) {
      setScheduleError(err.message || "Failed to schedule.")
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-purple-100/80 space-y-3.5">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEST TIME TO POST CARD
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-gradient-to-br from-purple-50/60 via-indigo-50/30 to-white rounded-2xl border border-purple-200/70 p-4 space-y-3">
        {/* Card Header with Timezone Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#6C5CE7] text-white flex items-center justify-center shadow-xs">
              <Clock size={13} />
            </div>
            <span className="text-xs font-extrabold text-[#15161A] tracking-wider uppercase flex items-center gap-1.5">
              <span>⏰ BEST TIME TO POST</span>
            </span>
          </div>

          {/* Timezone Dropdown */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Globe size={13} className="text-gray-400" />
            <select
              value={currentTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-purple-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Metric Pills: Day, Time, Window */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Recommended Day */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2 shadow-xs">
            <div className="text-purple-600 mt-0.5">
              <Calendar size={14} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Recommended Day
              </div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">
                {rec.day}
              </div>
            </div>
          </div>

          {/* Suggested Time */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2 shadow-xs">
            <div className="text-purple-600 mt-0.5">
              <Clock size={14} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Suggested Time
              </div>
              <div className="text-xs font-bold text-[#6C5CE7] mt-0.5">
                {rec.time}
              </div>
            </div>
          </div>

          {/* Recommended Window */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2 shadow-xs">
            <div className="text-purple-600 mt-0.5">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Recommended Window
              </div>
              <div className="text-xs font-bold text-gray-800 mt-0.5">
                {rec.window}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Rationale (Why this time?) */}
        <div className="bg-white/60 p-3 rounded-xl border border-purple-100/60 text-xs text-gray-600 leading-relaxed flex items-start gap-2">
          <Info size={14} className="text-[#6C5CE7] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-gray-800">💡 Why this time? </span>
            <span>{rec.reason}</span>
            <span className="block text-[10px] text-gray-400 mt-1 italic">
              * Suggestion based on platform-specific audience engagement benchmarks in {currentTimezone}.
            </span>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            PART 3: SCHEDULE POST TRIGGER & CONFIRMATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-purple-100/60">
          {scheduleSuccess ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <Check size={14} className="text-emerald-500" />
              <span>
                Scheduled for {scheduleSuccess.date} at {scheduleSuccess.time} ({scheduleSuccess.timezone})
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <CalendarCheck size={13} />
              <span>{showScheduler ? "Cancel Scheduling" : "Schedule Post"}</span>
            </button>
          )}

          <span className="text-[10px] text-gray-400">
            Saves as scheduled draft in PRISM database
          </span>
        </div>

        {/* Inline Schedule Form */}
        {showScheduler && (
          <form
            onSubmit={handleScheduleSubmit}
            className="mt-3 p-4 bg-white rounded-xl border border-purple-200 space-y-3 animate-in fade-in duration-150"
          >
            <h5 className="text-xs font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
              <CalendarCheck size={14} className="text-[#6C5CE7]" />
              <span>Confirm Scheduled Publication</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Publishing Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Publishing Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                />
              </div>
            </div>

            {scheduleError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowScheduler(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={scheduling}
                className="px-4 py-1.5 rounded-lg bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={12} />
                <span>{scheduling ? "Saving Schedule..." : "Confirm Schedule"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

