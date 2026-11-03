import React, { useState, useRef, useEffect } from 'react'
import {
  Download,
  FileText,
  FileCode,
  Image as ImageIcon,
  Presentation,
  Check,
  RefreshCw,
  ChevronDown,
  AlertCircle
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const EXPORT_OPTIONS = [
  {
    format: 'pdf',
    ext: '.pdf',
    label: 'PDF Document',
    desc: 'Unicode text, A4 layout with PRISM branding',
    icon: FileText,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    format: 'docx',
    ext: '.docx',
    label: 'Word Document',
    desc: 'Editable Microsoft Word document',
    icon: FileCode,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    format: 'txt',
    ext: '.txt',
    label: 'Plain Text File',
    desc: 'Clean UTF-8 plain text with timing notes',
    icon: FileText,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  {
    format: 'png',
    ext: '.png',
    label: 'Social Image Card',
    desc: 'High-res card (ZIP archive for all)',
    icon: ImageIcon,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    format: 'pptx',
    ext: '.pptx',
    label: 'PowerPoint Deck',
    desc: 'Editable 16:9 widescreen presentation',
    icon: Presentation,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
]

export default function ExportDropdown({
  platform,
  content,
  contentId,
  allChannelsData = null,
  isGlobal = false,
  label = null,
  buttonClassName = "",
  direction = "auto", // "up" | "down" | "auto"
  align = "right",    // "right" | "left"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingFormat, setLoadingFormat] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const dropdownRef = useRef(null)

  // Determine actual dropdown direction
  const effectiveDirection = direction === "auto" ? (isGlobal ? "down" : "up") : direction

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDownload = async (format) => {
    setLoadingFormat(format)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      let url = `${API}/api/export/single`
      let payload = {}

      if (isGlobal) {
        url = `${API}/api/export/all`
        payload = {
          content_id: contentId || null,
          channels: allChannelsData || {},
          format: format,
        }
      } else {
        if (!content || !content.trim()) {
          throw new Error("No content available to export.")
        }
        payload = {
          platform: platform || "content",
          content: content.trim(),
          format: format,
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || `Export failed (${res.status})`)
      }

      // Extract filename from header or provide fallback
      const disposition = res.headers.get("Content-Disposition")
      let filename = isGlobal
        ? `PRISM_All_Channels.${format === 'png' ? 'zip' : format}`
        : `PRISM_${platform || 'Post'}.${format}`

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      // Trigger browser download
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      setSuccessMessage(`${filename} downloaded!`)
      setIsOpen(false)

      setTimeout(() => {
        setSuccessMessage("")
      }, 3500)
    } catch (err) {
      setErrorMessage(err.message || "Export failed.")
      setTimeout(() => {
        setErrorMessage("")
      }, 4000)
    } finally {
      setLoadingFormat(null)
    }
  }

  // Positioning classes
  const positionClasses = effectiveDirection === "up"
    ? `bottom-full mb-2 ${align === "right" ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left"}`
    : `top-full mt-2 ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"}`

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? 'z-[9999]' : 'z-10'}`}
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      {isGlobal ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loadingFormat !== null}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200/90 hover:border-gray-300 text-gray-800 text-xs font-bold shadow-xs hover:bg-gray-50/80 transition-all cursor-pointer ${buttonClassName}`}
          title="Export all channels into chosen format"
        >
          {loadingFormat ? (
            <RefreshCw size={14} className="animate-spin text-[#6C5CE7]" />
          ) : (
            <Download size={14} className="text-[#6C5CE7]" />
          )}
          <span>{label || "📥 DOWNLOAD ALL"}</span>
          <ChevronDown size={13} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : label ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loadingFormat !== null}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-xs ${buttonClassName}`}
          title="Download post in multiple formats"
        >
          {loadingFormat ? (
            <RefreshCw size={13} className="animate-spin text-[#6C5CE7]" />
          ) : (
            <Download size={13} className="text-[#6C5CE7]" />
          )}
          <span>{label}</span>
          <ChevronDown size={11} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loadingFormat !== null}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${buttonClassName}`}
          title="Download in multiple formats (PDF, DOCX, TXT, PNG, PPTX)"
        >
          {loadingFormat ? (
            <RefreshCw size={13} className="animate-spin text-[#6C5CE7]" />
          ) : (
            <Download size={13} />
          )}
          <ChevronDown size={11} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Floating Success Pill */}
      {successMessage && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} ${effectiveDirection === "up" ? "-top-9" : "-bottom-9"} z-[10000] whitespace-nowrap bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1 animate-in fade-in`}>
          <Check size={12} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Floating Error Pill */}
      {errorMessage && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} ${effectiveDirection === "up" ? "-top-9" : "-bottom-9"} z-[10000] whitespace-nowrap bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1 animate-in fade-in`}>
          <AlertCircle size={12} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${positionClasses} w-72 rounded-2xl bg-white border border-gray-200 shadow-2xl ring-1 ring-black/10 z-[10000] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="p-3 bg-gray-50/95 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
              {isGlobal ? "EXPORT ALL CHANNELS" : "EXPORT CONTENT"}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">5 Formats</span>
          </div>

          <div className="p-2 space-y-1">
            {EXPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isCurrentLoading = loadingFormat === opt.format

              return (
                <button
                  key={opt.format}
                  onClick={() => handleDownload(opt.format)}
                  disabled={loadingFormat !== null}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${opt.bgColor} ${opt.iconColor} flex items-center justify-center shrink-0`}>
                      {isCurrentLoading ? (
                        <RefreshCw size={15} className="animate-spin text-[#6C5CE7]" />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{opt.label}</span>
                        <span className="text-[10px] font-mono text-gray-400 font-normal">{opt.ext}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 leading-tight">
                        {isGlobal && opt.format === 'png' ? 'ZIP archive with all images' : opt.desc}
                      </div>
                    </div>
                  </div>

                  {isCurrentLoading && (
                    <span className="text-[10px] font-bold text-[#6C5CE7]">Exporting...</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-3 py-2 bg-gray-50/60 border-t border-gray-100 text-[10px] text-gray-400 text-center">
            PRISM Multi-Format Export Engine
          </div>
        </div>
      )}
    </div>
  )
}
