import { useState, useEffect } from 'react'
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
  Sliders
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const INPUT_TABS = [
  { id: 'text', label: 'Raw Text', icon: FileText, desc: 'Paste raw thoughts, draft, notes' },
  { id: 'url', label: 'Article / Blog URL', icon: Globe, desc: 'Clean web article extraction' },
  { id: 'youtube', label: 'YouTube Video', icon: Video, desc: 'Fetch video closed captions' },
  { id: 'pdf', label: 'PDF Document', icon: Upload, desc: 'Extract pages via PyMuPDF' },
  { id: 'audio', label: 'Podcast / Audio', icon: Mic, desc: 'Speech-to-text via Whisper' },
]

const PLATFORM_CONFIG = [
  { key: 'summary', label: 'Summary', icon: '📝', color: '#6C5CE7' },
  { key: 'linkedin_post', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { key: 'twitter_thread', label: 'Twitter / X', icon: '🧵', color: '#1DA1F2' },
  { key: 'instagram_caption', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { key: 'youtube_content', label: 'YouTube', icon: '🎬', color: '#FF0000' },
  { key: 'email_newsletter', label: 'Email Newsletter', icon: '📧', color: '#10B981' },
  { key: 'blog_post', label: 'Blog Rewrite', icon: '📰', color: '#F59E0B' },
]

const TONES = [
  'Professional',
  'Conversational',
  'Educational',
  'Casual',
  'Humorous',
]

const LANGUAGES = [
  'Spanish',
  'Hindi',
  'French',
  'German',
  'Portuguese',
  'Japanese',
  'Arabic',
  'Bengali',
]

function InputPage() {
  const [activeInputTab, setActiveInputTab] = useState("text")
  const [inputText, setInputText] = useState("")
  const [urlInput, setUrlInput] = useState("")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [pdfFile, setPdfFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [selectedTone, setSelectedTone] = useState(() => {
    return localStorage.getItem("prism_default_tone") || "Professional"
  })

  // State: Normalized Content Extraction
  const [contentId, setContentId] = useState(null)
  const [extractedTitle, setExtractedTitle] = useState("")
  const [extracted, setExtracted] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState("")

  // State: Generation & Outputs
  const [generating, setGenerating] = useState(false)
  const [outputs, setOutputs] = useState({})
  const [activePlatformTab, setActivePlatformTab] = useState("summary")
  const [isEditing, setIsEditing] = useState(false)
  const [copiedKey, setCopiedKey] = useState("")

  // State: AI Extensions (SEO, Quality, Image, Translation, Scheduler)
  const [seoData, setSeoData] = useState(null)
  const [loadingSeo, setLoadingSeo] = useState(false)

  const [qualityData, setQualityData] = useState(null)
  const [loadingQuality, setLoadingQuality] = useState(false)

  const [imagePromptData, setImagePromptData] = useState(null)
  const [imageStyle, setImageStyle] = useState("Modern Digital Art")
  const [loadingImage, setLoadingImage] = useState(false)

  const [targetLang, setTargetLang] = useState("Spanish")
  const [translatedText, setTranslatedText] = useState("")
  const [loadingTranslate, setLoadingTranslate] = useState(false)

  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const [scheduleStatus, setScheduleStatus] = useState("")

  // 1. UNIFIED INPUT EXTRACTION
  const handleExtract = async () => {
    setError("")
    setExtracting(true)
    setExtracted("")
    setContentId(null)
    setOutputs({})
    setSeoData(null)
    setQualityData(null)
    setImagePromptData(null)

    try {
      let res
      if (activeInputTab === "text") {
        if (!inputText.trim()) throw new Error("Please enter some text to repurpose.")
        res = await fetch(`${API}/api/inputs/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText.trim() }),
        })
      } else if (activeInputTab === "url") {
        if (!urlInput.trim()) throw new Error("Please provide a valid article or blog URL.")
        res = await fetch(`${API}/api/inputs/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim() }),
        })
      } else if (activeInputTab === "youtube") {
        if (!youtubeUrl.trim()) throw new Error("Please provide a valid YouTube video link.")
        res = await fetch(`${API}/api/inputs/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl.trim() }),
        })
      } else if (activeInputTab === "pdf") {
        if (!pdfFile) throw new Error("Please select a PDF document first.")
        const formData = new FormData()
        formData.append("file", pdfFile)
        res = await fetch(`${API}/api/inputs/pdf`, {
          method: "POST",
          body: formData,
        })
      } else if (activeInputTab === "audio") {
        if (!audioFile) throw new Error("Please select an audio file (mp3, wav, m4a).")
        const formData = new FormData()
        formData.append("file", audioFile)
        res = await fetch(`${API}/api/inputs/audio`, {
          method: "POST",
          body: formData,
        })
      }

      if (!res) {
        throw new Error("No response received from server. Please verify backend is running.")
      }

      let data = {}
      try {
        data = await res.json()
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status} (${res.statusText}) with non-JSON response.`)
      }

      if (!res.ok) {
        throw new Error(data.detail || `Extraction failed with status ${res.status}`)
      }

      setContentId(data.content_id || data.id)
      setExtractedTitle(data.title || "")
      setExtracted(data.extracted_text || data.raw_text || "")
    } catch (err) {
      if (err.name === "TypeError" && err.message.toLowerCase().includes("fetch")) {
        setError("Failed to connect to backend API server at " + API + ". Please ensure FastAPI is running on port 8000.")
      } else {
        setError(err.message || "Failed to extract content.")
      }
    } finally {
      setExtracting(false)
    }
  }

  // 2. GENERATE ALL 7 PLATFORM OUTPUTS (5 ORIGINAL + EMAIL + BLOG) WITH SELECTED TONE
  const handleGenerateAll = async () => {
    if (!contentId) return
    setError("")
    setGenerating(true)

    try {
      const res = await fetch(`${API}/api/content/${contentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: selectedTone }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || `Generation failed (${res.status})`)
      }

      setOutputs({
        summary: data.summary || "",
        linkedin_post: data.linkedin_post || "",
        twitter_thread: data.twitter_thread || "",
        instagram_caption: data.instagram_caption || "",
        youtube_content: data.youtube_content || "",
        email_newsletter: data.email_newsletter || "",
        blog_post: data.blog_post || "",
      })

      // Automatically trigger quality check
      handleQualityCheck()
    } catch (err) {
      setError(err.message || "Generation error.")
    } finally {
      setGenerating(false)
    }
  }

  // 3. EDIT & SAVE CHANGES BACK TO DATABASE
  const handleSaveEdit = async () => {
    if (!contentId || !outputs[activePlatformTab]) return
    try {
      await fetch(`${API}/api/content/${contentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: activePlatformTab,
          content: outputs[activePlatformTab],
        }),
      })
      setIsEditing(false)
    } catch (err) {
      alert("Error saving edits: " + err.message)
    }
  }

  // 4. COPY & DOWNLOAD HELPERS
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(""), 2000)
  }

  const handleDownload = (text, platformName) => {
    const blob = new Blob([text], { type: "text/plain" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `prism-${platformName}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 5. EXTENSIONS: SEO, QUALITY, IMAGE PROMPT, TRANSLATE, SCHEDULER
  const handleFetchSeo = async () => {
    if (!contentId) return
    setLoadingSeo(true)
    try {
      const res = await fetch(`${API}/api/content/${contentId}/seo`, { method: "POST" })
      const data = await res.json()
      setSeoData(data.seo_metadata)
    } catch (err) {
      alert("SEO generation error: " + err.message)
    } finally {
      setLoadingSeo(false)
    }
  }

  const handleQualityCheck = async () => {
    if (!contentId) return
    setLoadingQuality(true)
    try {
      const res = await fetch(`${API}/api/content/${contentId}/quality-check`, { method: "POST" })
      const data = await res.json()
      setQualityData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingQuality(false)
    }
  }

  const handleCreateImagePrompt = async () => {
    if (!contentId) return
    setLoadingImage(true)
    try {
      const res = await fetch(`${API}/api/content/${contentId}/image-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: imageStyle }),
      })
      const data = await res.json()
      setImagePromptData(data)
    } catch (err) {
      alert("Image prompt error: " + err.message)
    } finally {
      setLoadingImage(false)
    }
  }

  const handleTranslate = async () => {
    const textToTranslate = outputs[activePlatformTab]
    if (!contentId || !textToTranslate) return
    setLoadingTranslate(true)
    setTranslatedText("")
    try {
      const res = await fetch(`${API}/api/content/${contentId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_language: targetLang,
          content: textToTranslate,
        }),
      })
      const data = await res.json()
      setTranslatedText(data.translated_content || "")
    } catch (err) {
      alert("Translation failed: " + err.message)
    } finally {
      setLoadingTranslate(false)
    }
  }

  const handleSchedulePost = async () => {
    const contentToSchedule = outputs[activePlatformTab]
    if (!contentToSchedule || !scheduleDateTime) return
    try {
      const res = await fetch(`${API}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_id: contentId,
          platform: activePlatformTab,
          content: contentToSchedule,
          scheduled_time: scheduleDateTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      })
      if (!res.ok) throw new Error("Scheduling error")
      setScheduleStatus("Post scheduled successfully in database queue!")
      setTimeout(() => setScheduleStatus(""), 3000)
    } catch (err) {
      alert("Failed to schedule: " + err.message)
    }
  }

  const hasAnyOutput = Object.values(outputs).some((val) => val && val.trim().length > 0)

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-xs uppercase tracking-wider text-[#6C5CE7] font-bold">
            PRISM Platform-Aware Repurposing Engine
          </p>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#15161A] tracking-tight">
          Transform 1 Content Source into 7 Tailored Channels
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Unified input processor supporting Article URLs, YouTube Videos, PDFs, Audio, and Raw text.
        </p>
      </div>

      {/* MODULE 1: UNIFIED INPUT INTERFACE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
          Select Source Content Type
        </h2>

        {/* 5 Input Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-6">
          {INPUT_TABS.map(({ id, label, icon: Icon, desc }) => {
            const active = activeInputTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveInputTab(id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? "border-[#6C5CE7] bg-indigo-50/60 shadow-sm ring-2 ring-[#6C5CE7]/15"
                    : "border-gray-200/80 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg inline-block mb-2 ${active ? "bg-[#6C5CE7] text-white" : "bg-gray-100 text-gray-600"}`}>
                  <Icon size={16} />
                </div>
                <div className="text-xs font-bold text-gray-900">{label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{desc}</div>
              </button>
            )
          })}
        </div>

        {/* Tab 1: Text */}
        {activeInputTab === "text" && (
          <div>
            <textarea
              className="w-full h-36 text-sm p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400"
              placeholder="Paste raw text, speech notes, meeting minutes, or an article draft here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex justify-between items-center text-xs text-gray-400 mt-2 px-1">
              <span>{inputText.length} characters</span>
              <span>Direct Multiline Input</span>
            </div>
          </div>
        )}

        {/* Tab 2: Article URL */}
        {activeInputTab === "url" && (
          <div>
            <div className="relative">
              <input
                type="url"
                className="w-full text-sm p-3.5 pl-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400"
                placeholder="https://techcrunch.com/article... or public blog post URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Globe className="absolute left-3.5 top-4 text-indigo-500" size={17} />
            </div>
            <p className="text-xs text-gray-400 mt-2 px-1">
              Protected against SSRF. Extracts clean article body text while stripping out ads and page boilerplate.
            </p>
          </div>
        )}

        {/* Tab 3: YouTube */}
        {activeInputTab === "youtube" && (
          <div>
            <div className="relative">
              <input
                type="url"
                className="w-full text-sm p-3.5 pl-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-gray-800 placeholder:text-gray-400"
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <Video className="absolute left-3.5 top-4 text-red-500" size={18} />
            </div>
            <p className="text-xs text-gray-400 mt-2 px-1">
              Retrieves official YouTube captions/transcripts automatically.
            </p>
          </div>
        )}

        {/* Tab 4: PDF */}
        {activeInputTab === "pdf" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#6C5CE7] transition-colors">
            <Upload className="mx-auto mb-3 text-[#6C5CE7]" size={32} />
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {pdfFile ? pdfFile.name : "Select or drag a PDF document"}
            </p>
            <p className="text-xs text-gray-400 mb-4">Fast multipage parsing powered by PyMuPDF</p>
            <label className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files[0] || null)}
              />
            </label>
          </div>
        )}

        {/* Tab 5: Audio / Podcast */}
        {activeInputTab === "audio" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#6C5CE7] transition-colors">
            <Mic className="mx-auto mb-3 text-[#6C5CE7]" size={32} />
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {audioFile ? audioFile.name : "Select an audio recording (.mp3, .wav, .m4a)"}
            </p>
            <p className="text-xs text-gray-400 mb-4">Whisper Speech-to-Text Audio Transcription</p>
            <label className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors">
              Browse Audio File
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => setAudioFile(e.target.files[0] || null)}
              />
            </label>
          </div>
        )}

        {/* Extraction Button */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-6">
          <span className="text-xs text-gray-400">
            {contentId ? `Normalized Content ID: ${contentId.slice(0, 8)}...` : "Select an input method and extract"}
          </span>

          <button
            onClick={handleExtract}
            disabled={extracting}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#4638E0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-95 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
          >
            {extracting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Extracting Source Content...</span>
              </>
            ) : (
              <>
                <span>Extract Content</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Extracted Preview & Tone Configuration */}
        {extracted && (
          <div className="mt-6 p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/70 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C5CE7] bg-indigo-50 px-2 py-0.5 rounded-full">
                  Extracted Source
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">
                  {extractedTitle || "Normalized Content"} ({extracted.length} chars)
                </h3>
              </div>

              {/* MODULE 2: TONE ADAPTOR SELECTOR */}
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Tone:</span>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="text-xs font-medium bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  className="flex items-center gap-1.5 bg-[#6C5CE7] hover:bg-[#5846E2] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer ml-2"
                >
                  <Sparkles size={14} className={generating ? "animate-spin" : ""} />
                  {generating ? "Synthesizing All Channels..." : "Synthesize 7 Channels"}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed bg-white p-4 rounded-xl border border-gray-200 font-sans">
              {extracted}
            </p>
          </div>
        )}
      </div>

      {/* MODULE 3: MULTI-PLATFORM SYNTHESIS RESULTS */}
      {hasAnyOutput && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-[#6C5CE7]" size={20} />
                Multi-Platform Synthesized Results
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Preserves original meaning across 7 distinct platform styles with tone adaptation ({selectedTone}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit()
                  } else {
                    setIsEditing(true)
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                {isEditing ? "Save Edits" : "Edit Output"}
              </button>

              <button
                onClick={() => handleCopy(outputs[activePlatformTab], activePlatformTab)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
              >
                {copiedKey === activePlatformTab ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Tab</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownload(outputs[activePlatformTab], activePlatformTab)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Download as .txt"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* 7 Platform Output Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PLATFORM_CONFIG.map(({ key, label, icon, color }) => {
              const active = activePlatformTab === key
              const hasText = Boolean(outputs[key])

              return (
                <button
                  key={key}
                  onClick={() => setActivePlatformTab(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-[#6C5CE7] bg-indigo-50/50 shadow-sm ring-2 ring-[#6C5CE7]/15"
                      : "border-gray-200/80 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-xs font-bold text-gray-800 leading-tight">{label}</div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>{hasText ? "Ready" : "Empty"}</span>
                    {hasText && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Platform Content Display / Editor */}
          <div className="rounded-xl border border-gray-200 p-4.5 bg-gray-50/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {PLATFORM_CONFIG.find((p) => p.key === activePlatformTab)?.label} Content
              </span>
              <span className="text-[11px] text-gray-400">
                {outputs[activePlatformTab]?.length || 0} characters
              </span>
            </div>

            {isEditing ? (
              <textarea
                value={outputs[activePlatformTab] || ""}
                onChange={(e) =>
                  setOutputs({ ...outputs, [activePlatformTab]: e.target.value })
                }
                className="w-full h-80 text-xs font-sans p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 bg-white leading-relaxed text-gray-800"
              />
            ) : (
              <div className="w-full max-h-96 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed text-gray-800 bg-white p-4.5 rounded-xl border border-gray-200/80 font-sans shadow-inner">
                {outputs[activePlatformTab] || (
                  <span className="text-gray-400 italic">No output generated for this channel yet.</span>
                )}
              </div>
            )}
          </div>

          {/* MODULE 2 EXTENSIONS: SEO, QUALITY, IMAGE PROMPT, TRANSLATION, SCHEDULING */}
          <div className="pt-4 border-t border-gray-200/80 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Advanced AI Capabilities & Utilities
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quality Checker Card */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 mb-1">
                    <CheckCircle size={15} className="text-emerald-500" />
                    Quality Checker
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Measurable score for readability, density, and structure.
                  </p>
                  {qualityData ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {qualityData.score}/100
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {qualityData.suggestions}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">Click to evaluate.</div>
                  )}
                </div>
                <button
                  onClick={handleQualityCheck}
                  disabled={loadingQuality}
                  className="mt-3 w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {loadingQuality ? "Analyzing..." : "Re-check Quality"}
                </button>
              </div>

              {/* SEO Engine Card */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 mb-1">
                    <TrendingUp size={15} className="text-blue-500" />
                    SEO & Keywords
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Extract high-intent keywords, entities, and metadata.
                  </p>
                  {seoData ? (
                    <div className="text-[10px] text-gray-700 max-h-24 overflow-y-auto whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100">
                      {seoData}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">No SEO generated yet.</div>
                  )}
                </div>
                <button
                  onClick={handleFetchSeo}
                  disabled={loadingSeo}
                  className="mt-3 w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {loadingSeo ? "Extracting..." : "Generate SEO Meta"}
                </button>
              </div>

              {/* Image Generation Prompt Studio */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 mb-1">
                    <ImageIcon size={15} className="text-purple-500" />
                    Image Studio
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Visual prompt for DALL-E / Stable Diffusion.
                  </p>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full text-[11px] border border-gray-200 rounded p-1 mb-2 bg-gray-50"
                  >
                    <option value="Modern Digital Art">Modern Digital Art</option>
                    <option value="Photorealistic Cinematic">Photorealistic Cinematic</option>
                    <option value="Minimalist Vector Illustration">Minimalist Vector</option>
                    <option value="3D Isometric Render">3D Isometric Render</option>
                  </select>
                  {imagePromptData && (
                    <div className="text-[10px] text-gray-700 max-h-20 overflow-y-auto bg-gray-50 p-1.5 rounded border border-gray-100">
                      {imagePromptData.image_prompt}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCreateImagePrompt}
                  disabled={loadingImage}
                  className="mt-2 w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {loadingImage ? "Generating..." : "Craft Visual Prompt"}
                </button>
              </div>

              {/* Multilingual Translation */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 mb-1">
                    <Languages size={15} className="text-amber-500" />
                    Multilingual Translator
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Translate current tab into regional or global language.
                  </p>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full text-[11px] border border-gray-200 rounded p-1 mb-2 bg-gray-50"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  {translatedText && (
                    <div className="text-[10px] text-gray-700 max-h-20 overflow-y-auto bg-gray-50 p-1.5 rounded border border-gray-100">
                      {translatedText}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleTranslate}
                  disabled={loadingTranslate}
                  className="mt-2 w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {loadingTranslate ? "Translating..." : `Translate to ${targetLang}`}
                </button>
              </div>
            </div>

            {/* Content Scheduler Bar */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className="text-[#6C5CE7]" />
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    Schedule Current Output ({PLATFORM_CONFIG.find((p) => p.key === activePlatformTab)?.label})
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Save to the database queue for automated publishing.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg p-1.5 bg-white text-gray-700 focus:outline-none"
                />
                <button
                  onClick={handleSchedulePost}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Schedule Post
                </button>
              </div>
            </div>
            {scheduleStatus && (
              <div className="text-xs text-emerald-600 font-semibold">{scheduleStatus}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InputPage