import React, { useState, useEffect, useRef } from 'react'
import {
  Upload,
  FileText,
  Video,
  Globe,
  Mic,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Download,
  Edit3,
  Save,
  RefreshCw,
  AlertCircle,
  Share2,
  Calendar,
  Languages,
  Image as ImageIcon,
  CheckCircle,
  TrendingUp,
  Sliders,
  X,
  PlayCircle,
  Eye,
  RotateCcw
} from 'lucide-react'
import SourceToSevenIllustration from '../components/SourceToSevenIllustration'
import { PlatformIcon } from '../components/ChannelIcons'
import BestTimeToPostCard from '../components/BestTimeToPostCard'
import ExportDropdown from '../components/ExportDropdown'
import { useGeneration } from '../context/GenerationContext'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const INPUT_TABS = [
  { id: 'url', label: 'Article / Blog URL', icon: Globe, desc: 'Paste web article URL' },
  { id: 'youtube', label: 'YouTube URL', icon: Video, desc: 'Fetch video closed captions' },
  { id: 'pdf', label: 'PDF Upload', icon: Upload, desc: 'Upload PDF document' },
  { id: 'audio', label: 'Audio Upload', icon: Mic, desc: 'Upload podcast or speech file' },
  { id: 'text', label: 'Paste Your Text', icon: FileText, desc: 'Paste raw thoughts, draft, notes' },
]

const CHANNELS = [
  { key: 'summary', name: 'Summary', color: '#6C5CE7', desc: 'Key points & high-level takeaways' },
  { key: 'linkedin_post', name: 'LinkedIn Post', color: '#0A66C2', desc: 'Executive hook, body paragraphs & CTA' },
  { key: 'twitter_thread', name: 'Twitter / X Thread', color: '#111827', desc: 'Numbered thread with hook & hashtags' },
  { key: 'instagram_caption', name: 'Instagram Caption', color: '#E1306C', desc: 'Catchy caption, line breaks & tags' },
  { key: 'youtube_content', name: 'YouTube Metadata', color: '#FF0000', desc: 'SEO title, description & key points' },
  { key: 'email_newsletter', name: 'Email Newsletter', color: '#10B981', desc: 'Subject lines, snippet & newsletter body' },
  { key: 'blog_post', name: 'Blog Rewrite', color: '#F59E0B', desc: 'SEO title, introduction, body & takeaways' },
]

const TONES = [
  'Professional',
  'Conversational',
  'Educational',
  'Casual',
  'Humorous',
]

const AUDIENCES = [
  'General Audience',
  'Developers & Tech Professionals',
  'Founders & Business Leaders',
  'Students & Lifelong Learners',
  'Marketers & Creators',
]

const LANGUAGES = [
  'English',
  'Spanish',
  'Hindi',
  'French',
  'German',
  'Portuguese',
  'Japanese',
  'Arabic',
]

export default function InputPage() {
  // Global Persistent Generation Context
  const {
    activeJob,
    isGenerating: isBackgroundGenerating,
    startBackgroundGeneration,
    retryFailedJobChannels,
  } = useGeneration()

  // Input Selection
  const [activeInputTab, setActiveInputTab] = useState("url")
  const [inputText, setInputText] = useState("")
  const [urlInput, setUrlInput] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [pdfFile, setPdfFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)

  // Generation Controls
  const [selectedTone, setSelectedTone] = useState(() => {
    return localStorage.getItem("prism_default_tone") || "Professional"
  })
  const [selectedAudience, setSelectedAudience] = useState("General Audience")
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [selectedChannels, setSelectedChannels] = useState(CHANNELS.map((c) => c.key))

  // Extraction State
  const [contentId, setContentId] = useState(null)
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracted, setExtracted] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState("")

  // Generation & Real-time Progress State
  const [channelStatus, setChannelStatus] = useState({})
  const [outputs, setOutputs] = useState({})
  const [channelErrors, setChannelErrors] = useState({})
  const [regeneratingChannel, setRegeneratingChannel] = useState(null)

  // Editing & UI State
  const [editingChannel, setEditingChannel] = useState(null)
  const [editBuffer, setEditBuffer] = useState("")
  const [copiedKey, setCopiedKey] = useState("")
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef(null)

  // Extensions (SEO, Quality, Image)
  const [seoData, setSeoData] = useState(null)
  const [loadingSeo, setLoadingSeo] = useState(false)
  const [qualityData, setQualityData] = useState(null)
  const [loadingQuality, setLoadingQuality] = useState(false)
  const [imagePromptData, setImagePromptData] = useState(null)
  const [imageStyle, setImageStyle] = useState("Modern Digital Art")
  const [loadingImage, setLoadingImage] = useState(false)
  const [successToast, setSuccessToast] = useState("")
  const prevGeneratingRef = useRef(false)

  // Notify when all channels finish generation
  useEffect(() => {
    if (prevGeneratingRef.current && !isBackgroundGenerating && activeJob?.status === "Completed") {
      setSuccessToast("All 7 channels regenerated successfully!")
      const t = setTimeout(() => setSuccessToast(""), 4500)
      return () => clearTimeout(t)
    }
    prevGeneratingRef.current = isBackgroundGenerating
  }, [isBackgroundGenerating, activeJob?.status])

  // Synchronize with background job state (for refresh recovery and page navigation)
  useEffect(() => {
    if (!activeJob) return
    if (activeJob.content_id && !contentId) {
      setContentId(activeJob.content_id)
    }

    if (activeJob.channel_results && activeJob.channel_results.length > 0) {
      const syncedOutputs = {}
      const syncedStatus = {}
      const syncedErrors = {}

      activeJob.channel_results.forEach((r) => {
        if (r.generated_content) {
          syncedOutputs[r.platform] = r.generated_content
          syncedStatus[r.platform] = "ready"
        } else if (r.status === "Processing" || (isBackgroundGenerating && r.status === "Pending")) {
          syncedStatus[r.platform] = "generating"
        } else if (r.status === "Failed") {
          syncedStatus[r.platform] = "error"
          syncedErrors[r.platform] = r.error || "Generation failed"
        }
      })

      setOutputs((prev) => ({ ...prev, ...syncedOutputs }))
      setChannelStatus((prev) => ({ ...prev, ...syncedStatus }))
      if (Object.keys(syncedErrors).length > 0) {
        setChannelErrors((prev) => ({ ...prev, ...syncedErrors }))
      }
    }
  }, [activeJob, contentId, isBackgroundGenerating])

  // Timer effect for generation
  useEffect(() => {
    if (isBackgroundGenerating) {
      setElapsedTime(0)
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 0.1)
      }, 100)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isBackgroundGenerating])

  // Toggle channel selection
  const toggleChannel = (key) => {
    setSelectedChannels((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const toggleAllChannels = () => {
    if (selectedChannels.length === CHANNELS.length) {
      setSelectedChannels([])
    } else {
      setSelectedChannels(CHANNELS.map((c) => c.key))
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. EXTRACT / NORMALIZE SOURCE CONTENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleExtract = async () => {
    setError("")
    setExtracting(true)
    setExtracted("")
    setContentId(null)
    setOutputs({})
    setChannelStatus({})
    setChannelErrors({})
    setSeoData(null)
    setQualityData(null)
    setImagePromptData(null)

    try {
      let res
      if (activeInputTab === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a valid article or blog URL.")
        res = await fetch(`${API}/api/inputs/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim() }),
        })
      } else if (activeInputTab === "youtube") {
        if (!youtubeUrl.trim()) throw new Error("Please enter a valid YouTube video link.")
        res = await fetch(`${API}/api/inputs/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl.trim() }),
        })
      } else if (activeInputTab === "pdf") {
        if (!pdfFile) throw new Error("Please select a PDF file first.")
        const formData = new FormData()
        formData.append("file", pdfFile)
        res = await fetch(`${API}/api/inputs/pdf`, { method: "POST", body: formData })
      } else if (activeInputTab === "audio") {
        if (!audioFile) throw new Error("Please select an audio file (mp3, wav, m4a).")
        const formData = new FormData()
        formData.append("file", audioFile)
        res = await fetch(`${API}/api/inputs/audio`, { method: "POST", body: formData })
      } else {
        if (!inputText.trim()) throw new Error("Please paste some text to repurpose.")
        res = await fetch(`${API}/api/inputs/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText.trim() }),
        })
      }

      if (!res) throw new Error("No response from server. Check backend.")
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `Extraction failed (${res.status})`)

      setContentId(data.content_id || data.id)
      setExtractedTitle(data.title || "")
      setExtracted(data.extracted_text || data.raw_text || "")
    } catch (err) {
      setError(err.message || "Failed to extract source content.")
    } finally {
      setExtracting(false)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PERSISTENT BACKGROUND SYNTHESIS TRIGGER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSynthesizeAll = async () => {
    if (!contentId && !extracted.trim()) {
      setError("Please extract or input source content first.")
      return
    }

    let targetContentId = contentId
    if (!targetContentId) {
      setExtracting(true)
      try {
        const textPayload =
          activeInputTab === "text"
            ? inputText
            : extracted || "Content to synthesize"
        const r = await fetch(`${API}/api/inputs/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textPayload.trim() }),
        })
        const d = await r.json()
        targetContentId = d.content_id || d.id
        setContentId(targetContentId)
        setExtracted(textPayload.trim())
      } catch (e) {
        setError("Failed to initialize content record: " + e.message)
        setExtracting(false)
        return
      } finally {
        setExtracting(false)
      }
    }

    if (!targetContentId) return

    const channelsToRun = selectedChannels.length > 0 ? selectedChannels : CHANNELS.map((c) => c.key)

    setError("")
    // Set pending statuses
    const initialStatus = {}
    channelsToRun.forEach((ch) => {
      initialStatus[ch] = "generating"
    })
    setChannelStatus((prev) => ({ ...prev, ...initialStatus }))

    try {
      // Start persistent background job (independent of page lifecycle)
      await startBackgroundGeneration(targetContentId, {
        tone: selectedTone,
        audience: selectedAudience,
        channels: channelsToRun,
        language: selectedLanguage,
      })
    } catch (err) {
      setError(err.message || "Failed to start background generation.")
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2b. REGENERATE ALL CHANNELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleRegenerateAll = async () => {
    if (!contentId && !extracted.trim()) {
      setError("Please extract or input source content first.")
      return
    }

    let targetContentId = contentId
    if (!targetContentId) {
      setExtracting(true)
      try {
        const textPayload =
          activeInputTab === "text"
            ? inputText
            : extracted || "Content to synthesize"
        const r = await fetch(`${API}/api/inputs/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textPayload.trim() }),
        })
        const d = await r.json()
        targetContentId = d.content_id || d.id
        setContentId(targetContentId)
        setExtracted(textPayload.trim())
      } catch (e) {
        setError("Failed to initialize content record: " + e.message)
        setExtracting(false)
        return
      } finally {
        setExtracting(false)
      }
    }

    if (!targetContentId) return

    // All 7 supported channels
    const allChannelKeys = CHANNELS.map((c) => c.key)

    setError("")
    // Set all channels to generating immediately so cards show live spinning progress
    const initialStatus = {}
    allChannelKeys.forEach((ch) => {
      initialStatus[ch] = "generating"
    })
    setChannelStatus((prev) => ({ ...prev, ...initialStatus }))
    setChannelErrors({})

    try {
      await startBackgroundGeneration(targetContentId, {
        tone: selectedTone,
        audience: selectedAudience,
        channels: allChannelKeys,
        language: selectedLanguage,
      })
    } catch (err) {
      setError(err.message || "Failed to start regeneration.")
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. INDIVIDUAL CHANNEL REGENERATION (Single-Click Retry)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleRegenerateChannel = async (channelKey) => {
    if (!contentId) return
    setRegeneratingChannel(channelKey)
    setChannelStatus((prev) => ({ ...prev, [channelKey]: "generating" }))
    setChannelErrors((prev) => {
      const next = { ...prev }
      delete next[channelKey]
      return next
    })

    try {
      const res = await fetch(`${API}/api/content/${contentId}/generate/${channelKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: selectedTone,
          target_audience: selectedAudience,
          language: selectedLanguage,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Regeneration failed")

      if (data.content) {
        setOutputs((prev) => ({ ...prev, [channelKey]: data.content }))
        setChannelStatus((prev) => ({ ...prev, [channelKey]: "ready" }))
      } else {
        setChannelStatus((prev) => ({ ...prev, [channelKey]: "error" }))
        setChannelErrors((prev) => ({ ...prev, [channelKey]: data.error || "Failed" }))
      }
    } catch (err) {
      setChannelStatus((prev) => ({ ...prev, [channelKey]: "error" }))
      setChannelErrors((prev) => ({ ...prev, [channelKey]: err.message }))
    } finally {
      setRegeneratingChannel(null)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. INLINE EDIT & SAVE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startEditing = (channelKey) => {
    setEditingChannel(channelKey)
    setEditBuffer(outputs[channelKey] || "")
  }

  const saveEdit = async (channelKey) => {
    if (!contentId) return
    try {
      await fetch(`${API}/api/content/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: channelKey,
          content: editBuffer,
        }),
      })
      setOutputs((prev) => ({ ...prev, [channelKey]: editBuffer }))
      setEditingChannel(null)
    } catch (err) {
      alert("Failed to save changes: " + err.message)
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
    link.download = `prism-${filename.toLowerCase().replace(/[\s/]+/g, "-")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const completedChannelsCount = Object.keys(outputs).filter((k) => outputs[k]).length

  return (
    <div className="px-4 sm:px-8 md:px-12 py-10 max-w-7xl mx-auto space-y-12">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO SECTION — "One source, seven channels."
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-bl from-purple-200/40 via-indigo-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200/60 text-[#6C5CE7] text-xs font-bold tracking-wide uppercase">
              <Sparkles size={14} className="text-[#6C5CE7]" />
              <span>Persistent AI Content Synthesis</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-black text-[#15161A] tracking-tight leading-[1.12]">
              One source,<br />
              <span className="bg-gradient-to-r from-[#6C5CE7] via-[#5D4AE0] to-[#7C3AED] bg-clip-text text-transparent">
                seven channels.
              </span>
            </h1>

            <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-lg">
              Add an article, video, PDF, audio or your own notes. PRISM writes platform-ready posts in the background while you navigate freely.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-emerald-500" />
                <span>Persistent Background Jobs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-emerald-500" />
                <span>AI Best Time to Post</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-emerald-500" />
                <span>Post Scheduling Queue</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center bg-gray-50/60 rounded-2xl border border-gray-100/80 p-2 sm:p-4">
            <SourceToSevenIllustration />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          INPUT SECTION (5 options with suitable icons)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#15161A] tracking-tight flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-[#6C5CE7] flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>Provide Source Material</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Choose your source format. PRISM extracts clean text and preserves key facts and context.
          </p>
        </div>

        {/* 5 Input Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {INPUT_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeInputTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveInputTab(tab.id)
                  setError("")
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  active
                    ? 'border-[#6C5CE7] bg-indigo-50/40 text-[#6C5CE7] font-bold shadow-sm'
                    : 'border-gray-200/70 hover:border-gray-300 bg-white text-gray-600'
                }`}
              >
                <Icon size={20} className={active ? 'text-[#6C5CE7]' : 'text-gray-400'} />
                <span className="text-xs mt-1.5 leading-tight">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Dynamic Tab Body */}
        <div className="space-y-4 pt-1">
          {activeInputTab === "url" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Article or Blog URL</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-3.5 text-gray-400" size={17} />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/blog/future-of-ai"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={handleExtract}
                  disabled={extracting || !urlInput.trim()}
                  className="px-5 py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5846E2] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {extracting ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  <span>{extracting ? "Extracting..." : "Extract Article"}</span>
                </button>
              </div>
            </div>
          )}

          {activeInputTab === "youtube" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">YouTube Video Link</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Video className="absolute left-3.5 top-3.5 text-red-500" size={17} />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400/30 text-gray-800 placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={handleExtract}
                  disabled={extracting || !youtubeUrl.trim()}
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {extracting ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  <span>{extracting ? "Fetching Transcript..." : "Extract Transcript"}</span>
                </button>
              </div>
            </div>
          )}

          {activeInputTab === "pdf" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Upload PDF Document</label>
              <div className="border-2 border-dashed border-gray-200 hover:border-[#6C5CE7]/60 rounded-2xl p-6 text-center space-y-3 bg-gray-50/40 transition-colors">
                <Upload size={28} className="mx-auto text-gray-400" />
                <div className="text-xs text-gray-600 font-medium">
                  {pdfFile ? (
                    <span className="font-bold text-[#6C5CE7]">{pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                  ) : (
                    <span>Click to browse or drag and drop your PDF</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <div className="flex justify-center gap-3">
                  <label
                    htmlFor="pdf-upload"
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
                  >
                    Select File
                  </label>
                  {pdfFile && (
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className="px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {extracting ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      <span>Extract PDF Pages</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeInputTab === "audio" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Upload Audio / Podcast File</label>
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-400/60 rounded-2xl p-6 text-center space-y-3 bg-gray-50/40 transition-colors">
                <Mic size={28} className="mx-auto text-emerald-500" />
                <div className="text-xs text-gray-600 font-medium">
                  {audioFile ? (
                    <span className="font-bold text-emerald-600">{audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  ) : (
                    <span>Upload podcast, voice note, or interview (mp3, wav, m4a)</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="audio-upload"
                />
                <div className="flex justify-center gap-3">
                  <label
                    htmlFor="audio-upload"
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
                  >
                    Select Audio
                  </label>
                  {audioFile && (
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {extracting ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      <span>Transcribe Audio</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeInputTab === "text" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Paste Your Text</label>
                <span className="text-[11px] text-gray-400">
                  {inputText.trim() ? `${inputText.trim().split(/\s+/).length} words` : "Empty"}
                </span>
              </div>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  setExtracted(e.target.value)
                }}
                placeholder="Paste articles, research notes, newsletters, or transcripts here..."
                className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400 leading-relaxed font-sans"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {extracted && (
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-500" />
                <span className="text-xs font-bold text-gray-800">
                  {extractedTitle ? extractedTitle : "Source Content Ready for Synthesis"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#6C5CE7] bg-white px-2.5 py-1 rounded-lg border border-indigo-100">
                {extracted.split(/\s+/).length} words extracted
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {extracted}
            </p>
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GENERATION CONTROLS SECTION
          Tone, Target Audience, Language, Channel selection, Synthesize CTA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#15161A] tracking-tight flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-[#6C5CE7] flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>Configure Voice & Target Channels</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Personalize tone, audience persona, output language, and select which of the 7 channels to generate.
          </p>
        </div>

        {/* 3 Selectors Row: Tone, Audience, Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Sliders size={13} className="text-[#6C5CE7]" />
              <span>Tone of Voice</span>
            </label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Eye size={13} className="text-[#6C5CE7]" />
              <span>Target Audience</span>
            </label>
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Languages size={13} className="text-[#6C5CE7]" />
              <span>Language</span>
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Channel Selection Pills */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700">Target Channels (7 Available)</label>
            <button
              onClick={toggleAllChannels}
              className="text-xs font-bold text-[#6C5CE7] hover:underline cursor-pointer"
            >
              {selectedChannels.length === CHANNELS.length ? "Deselect All" : "Select All 7"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => {
              const selected = selectedChannels.includes(ch.key)
              return (
                <button
                  key={ch.key}
                  onClick={() => toggleChannel(ch.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected
                      ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <PlatformIcon platform={ch.key} size={15} />
                  <span>{ch.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Large Primary "Synthesize All Channels" Button */}
        <div className="pt-2">
          <button
            onClick={handleSynthesizeAll}
            disabled={isBackgroundGenerating || (!contentId && !extracted.trim()) || selectedChannels.length === 0}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6C5CE7] via-[#5D4AE0] to-[#7C3AED] hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-3 cursor-pointer"
          >
            {isBackgroundGenerating ? (
              <>
                <RefreshCw size={18} className="animate-spin text-white" />
                <span>
                  Synthesizing in Background ({activeJob?.completed_channels || 0}/{activeJob?.total_channels || 7} Ready)...
                </span>
                <span className="text-xs font-normal opacity-80">({elapsedTime.toFixed(1)}s)</span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="text-white" />
                <span>Synthesize {selectedChannels.length} Channels in Background</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SEVEN CHANNEL OUTPUTS SECTION
          Includes Best Time to Post card directly below each post!
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#15161A] tracking-tight flex items-center gap-2.5">
              <span>Synthesized Channel Outputs</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#6C5CE7]">
                {completedChannelsCount} of 7 Ready
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Each channel is crafted in its platform-specific length, format, and tone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {completedChannelsCount > 0 && (
              <ExportDropdown
                isGlobal={true}
                allChannelsData={outputs}
                contentId={contentId}
              />
            )}

            <button
              onClick={handleRegenerateAll}
              disabled={isBackgroundGenerating || (!contentId && !extracted.trim())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh all seven channels"
            >
              <RotateCcw
                size={12}
                className={isBackgroundGenerating ? "animate-spin text-[#6C5CE7]" : "text-gray-500"}
              />
              <span>
                {isBackgroundGenerating
                  ? `Refreshing All (${activeJob?.completed_channels || 0}/7)...`
                  : "Refresh"}
              </span>
            </button>
          </div>
        </div>

        {successToast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast("")}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 7 Channels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CHANNELS.map((ch) => {
            const hasContent = Boolean(outputs[ch.key])
            const status = channelStatus[ch.key] || (hasContent ? "ready" : "idle")
            const isRegenerating = regeneratingChannel === ch.key
            const isEditingThis = editingChannel === ch.key
            const channelError = channelErrors[ch.key]

            return (
              <div
                key={ch.key}
                className="bg-white rounded-3xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-visible"
              >
                {/* Channel Card Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/40 rounded-t-3xl">
                  <div className="flex items-center gap-2.5">
                    <PlatformIcon platform={ch.key} size={22} />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                        {ch.name}
                      </h3>
                      <p className="text-[10px] text-gray-400">{ch.desc}</p>
                    </div>
                  </div>

                  {/* Channel Card Header Actions */}
                  <div className="flex items-center gap-2">
                    {/* Small Refresh Button */}
                    <button
                      onClick={() => handleRegenerateChannel(ch.key)}
                      disabled={isRegenerating || isBackgroundGenerating || (!contentId && !extracted.trim())}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Refresh ${ch.name}`}
                    >
                      <RotateCcw
                        size={12}
                        className={isRegenerating ? "animate-spin text-[#6C5CE7]" : "text-gray-500"}
                      />
                      <span>{isRegenerating ? "Refreshing..." : "Refresh"}</span>
                    </button>

                    {/* Status Pill (if generating or failed) */}
                    {status === "generating" && !isRegenerating && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 animate-pulse">
                        <RefreshCw size={11} className="animate-spin" />
                        Generating...
                      </span>
                    )}
                    {status === "error" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <AlertCircle size={11} />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Channel Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between min-h-[180px]">
                  {isEditingThis ? (
                    <div className="space-y-3">
                      <textarea
                        rows={8}
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#6C5CE7] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 leading-relaxed font-sans"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingChannel(null)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(ch.key)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] text-white text-xs font-bold hover:bg-[#5846E2] shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save size={13} />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  ) : hasContent ? (
                    <div className="space-y-3">
                      <div className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans max-h-72 overflow-y-auto pr-1">
                        {outputs[ch.key]}
                      </div>
                      <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span>{outputs[ch.key].length} characters • {outputs[ch.key].split(/\s+/).length} words</span>
                      </div>

                      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          PART 2: BEST TIME TO POST CARD (Under each post)
                          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                      <BestTimeToPostCard
                        platform={ch.key}
                        content={outputs[ch.key]}
                        contentId={contentId}
                      />
                    </div>
                  ) : status === "generating" ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
                      <RefreshCw size={24} className="animate-spin text-[#6C5CE7]" />
                      <span className="text-xs font-semibold">Synthesizing {ch.name}...</span>
                    </div>
                  ) : channelError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                      <AlertCircle size={24} className="text-red-500" />
                      <span className="text-xs text-red-600 max-w-xs">{channelError}</span>
                      <button
                        onClick={() => handleRegenerateChannel(ch.key)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>Retry Channel</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 space-y-2">
                      <PlatformIcon platform={ch.key} size={28} className="opacity-30" />
                      <span className="text-xs">Click "Synthesize All Channels" or "Generate" below</span>
                    </div>
                  )}
                </div>

                {/* Channel Card Actions Toolbar */}
                <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 rounded-b-3xl">
                  <div className="flex items-center gap-1.5">
                    {!hasContent && (
                      <button
                        onClick={() => handleRegenerateChannel(ch.key)}
                        disabled={isRegenerating || (!contentId && !extracted.trim())}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <RotateCcw size={13} className={isRegenerating ? "animate-spin text-[#6C5CE7]" : ""} />
                        <span>{isRegenerating ? "Generating..." : "Generate"}</span>
                      </button>
                    )}

                    {hasContent && (
                      <button
                        onClick={() => startEditing(ch.key)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasContent && (
                      <button
                        onClick={() => handleCopy(outputs[ch.key], ch.key)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        {copiedKey === ch.key ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    {hasContent && (
                      <ExportDropdown
                        platform={ch.key}
                        content={outputs[ch.key]}
                        contentId={contentId}
                        direction="up"
                        align="right"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
