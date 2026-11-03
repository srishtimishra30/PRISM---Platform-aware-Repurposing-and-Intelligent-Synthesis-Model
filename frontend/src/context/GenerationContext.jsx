import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const GenerationContext = createContext(null)

export function GenerationProvider({ children }) {
  const [activeJobId, setActiveJobId] = useState(() => {
    return localStorage.getItem('prism_active_job_id') || null
  })
  const [activeJob, setActiveJob] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const pollTimerRef = useRef(null)

  // Fetch job status from server
  const fetchJobStatus = useCallback(async (jobId) => {
    if (!jobId) return null
    try {
      const res = await fetch(`${API}/api/content/jobs/${jobId}`)
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem('prism_active_job_id')
          setActiveJobId(null)
          setActiveJob(null)
        }
        return null
      }
      const data = await res.json()
      setActiveJob(data)
      return data
    } catch (err) {
      console.warn("Error polling job status:", err)
      return null
    }
  }, [])

  // Start polling when activeJobId exists and job is not yet finished
  useEffect(() => {
    if (!activeJobId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      return
    }

    let isSubscribed = true

    const checkStatus = async () => {
      const data = await fetchJobStatus(activeJobId)
      if (!isSubscribed || !data) return

      const isFinished = ["Completed", "Partially Completed", "Failed"].includes(data.status)
      if (isFinished) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      }
    }

    // Immediate check
    checkStatus()

    // Poll every 1.5 seconds while active
    pollTimerRef.current = setInterval(async () => {
      await checkStatus()
    }, 1500)

    return () => {
      isSubscribed = false
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [activeJobId, fetchJobStatus])

  // Browser refresh recovery: On initial mount, if no activeJobId in localStorage, check server for latest active job
  useEffect(() => {
    if (!activeJobId) {
      const recoverLatest = async () => {
        try {
          const res = await fetch(`${API}/api/content/jobs/active/latest`)
          if (res.ok) {
            const data = await res.json()
            if (data?.job && ["Pending", "Processing"].includes(data.job.status)) {
              setActiveJobId(data.job.job_id)
              setActiveJob(data.job)
              localStorage.setItem('prism_active_job_id', data.job.job_id)
            }
          }
        } catch (e) {
          console.warn("Could not check active jobs:", e)
        }
      }
      recoverLatest()
    }
  }, [activeJobId])

  // Start a new background generation task
  const startBackgroundGeneration = async (contentId, { tone, audience, channels, language }) => {
    try {
      const res = await fetch(`${API}/api/content/${contentId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: tone || "Professional",
          target_audience: audience || null,
          channels: channels || null,
          language: language || "English",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Failed to start background job")
      }

      setActiveJobId(data.job_id)
      setActiveJob(data)
      setIsDismissed(false)
      setIsPanelOpen(true) // Open panel so user sees live start
      localStorage.setItem('prism_active_job_id', data.job_id)
      return data
    } catch (err) {
      console.error("Failed to start background generation:", err)
      throw err
    }
  }

  // Retry failed channels of an active or finished job
  const retryFailedJobChannels = async (jobId = activeJobId) => {
    if (!jobId) return
    try {
      const res = await fetch(`${API}/api/content/jobs/${jobId}/retry`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok && data.job) {
        setActiveJob(data.job)
        setActiveJobId(data.job.job_id)
        localStorage.setItem('prism_active_job_id', data.job.job_id)
        setIsDismissed(false)
      }
    } catch (e) {
      console.error("Retry failed:", e)
    }
  }

  // Dismiss completion banner
  const dismissJob = () => {
    setIsDismissed(true)
    setIsPanelOpen(false)
  }

  const clearJob = () => {
    localStorage.removeItem('prism_active_job_id')
    setActiveJobId(null)
    setActiveJob(null)
    setIsDismissed(false)
    setIsPanelOpen(false)
  }

  const isGenerating = activeJob && ["Pending", "Processing"].includes(activeJob.status)
  const isCompleted = activeJob && activeJob.status === "Completed"
  const isPartiallyCompleted = activeJob && activeJob.status === "Partially Completed"
  const isFailed = activeJob && activeJob.status === "Failed"

  return (
    <GenerationContext.Provider
      value={{
        activeJobId,
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
        startBackgroundGeneration,
        retryFailedJobChannels,
        fetchJobStatus,
      }}
    >
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const context = useContext(GenerationContext)
  if (!context) {
    throw new Error("useGeneration must be used within a GenerationProvider")
  }
  return context
}

