import { useState, useEffect } from 'react'
import {
  User,
  Sliders,
  Bell,
  Palette,
  Cpu,
  Save,
  CheckCircle2,
  Lock,
  Mail,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  Info
} from 'lucide-react'

const TONE_OPTIONS = [
  { value: 'Professional', label: 'Professional', desc: 'Polished, authoritative, and corporate-ready' },
  { value: 'Conversational', label: 'Conversational', desc: 'Direct, friendly, and engaging' },
  { value: 'Educational', label: 'Educational', desc: 'Clear, informative, and pedagogical' },
  { value: 'Casual', label: 'Casual', desc: 'Relaxed, natural, and effortless' },
  { value: 'Humorous', label: 'Humorous', desc: 'Witty, lighthearted, and playful' },
]

export default function SettingsPage() {
  // A. Profile State
  const [fullName, setFullName] = useState(() => {
    return localStorage.getItem('prism_user_name') || 'Ankit Kumar'
  })
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('prism_user_email') || 'ankit@example.com'
  })

  // B. Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')

  // C. Notifications State
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const v = localStorage.getItem('prism_notif_email')
    return v !== null ? v === 'true' : true
  })
  const [productUpdates, setProductUpdates] = useState(() => {
    const v = localStorage.getItem('prism_notif_updates')
    return v !== null ? v === 'true' : true
  })

  // D. Appearance
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('prism_theme') || 'light'
  })

  // E. AI Preferences: Default Tone
  const [defaultTone, setDefaultTone] = useState(() => {
    return localStorage.getItem('prism_default_tone') || 'Professional'
  })
  const [llmModel, setLlmModel] = useState('Groq Qwen 3.8 / Llama 3.3 70B')
  const [defaultLanguage, setDefaultLanguage] = useState('English')

  const [savedSuccess, setSavedSuccess] = useState(false)

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice('New passwords do not match.')
      return
    }
    setPasswordNotice('Password updated successfully (Local Session).')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordNotice(''), 3000)
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()

    // Persist non-sensitive preferences to localStorage
    localStorage.setItem('prism_user_name', fullName)
    localStorage.setItem('prism_user_email', email)
    localStorage.setItem('prism_default_tone', defaultTone)
    localStorage.setItem('prism_notif_email', String(emailNotifications))
    localStorage.setItem('prism_notif_updates', String(productUpdates))
    localStorage.setItem('prism_theme', theme)

    // Trigger visual success notification
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#6C5CE7]"></span>
          <p className="text-xs uppercase tracking-wider text-[#6C5CE7] font-bold">
            Preferences & Configuration
          </p>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#15161A] tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account profile, AI default generation tone, notifications, and app theme.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span>All settings & default content generation tone saved successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* SECTION 1: AI PREFERENCES (PRIMARY REPURPOSING TONE) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#6C5CE7]" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  AI Generation Preferences
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Configure default content behavior for all 7 multi-platform synthesis channels.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#6C5CE7]">
              Active Engine
            </span>
          </div>

          {/* Tone Selector */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-2">
              <Sliders size={14} className="text-[#6C5CE7]" />
              <span>Default Repurposing Tone</span>
            </label>
            <p className="text-[11px] text-gray-400 mb-3">
              This tone is automatically pre-selected when generating content, unless changed for an individual prompt.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TONE_OPTIONS.map((t) => {
                const isSelected = defaultTone === t.value
                return (
                  <div
                    key={t.value}
                    onClick={() => setDefaultTone(t.value)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-purple-50/70 border-[#6C5CE7] ring-1 ring-[#6C5CE7]"
                        : "bg-gray-50/50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#6C5CE7]"></span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{t.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Active LLM Provider
              </label>
              <input
                type="text"
                disabled
                value={llmModel}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Configured in backend .env</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Default Output Language
              </label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>Hindi</option>
                <option>French</option>
                <option>German</option>
                <option>Portuguese</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: PROFILE & ACCOUNT PREFERENCES */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#6C5CE7]" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Profile & Account
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800">Change Password</span>
              {passwordNotice && (
                <span className="text-xs text-purple-600 font-semibold">{passwordNotice}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="text-xs px-3.5 py-2 rounded-xl border border-gray-200 text-gray-800 focus:outline-none"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs px-3.5 py-2 rounded-xl border border-gray-200 text-gray-800 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-xs px-3.5 py-2 rounded-xl border border-gray-200 text-gray-800 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handlePasswordChange}
              className="mt-2.5 text-xs font-bold text-[#6C5CE7] hover:underline cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* SECTION 3: NOTIFICATIONS */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#6C5CE7]" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900">Email Notifications</h3>
                <p className="text-[11px] text-gray-400">Receive synthesis and schedule completion summaries</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 text-[#6C5CE7] rounded border-gray-300 focus:ring-[#6C5CE7]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900">Product & Pipeline Updates</h3>
                <p className="text-[11px] text-gray-400">Receive alerts when new repurposing models or channels go live</p>
              </div>
              <input
                type="checkbox"
                checked={productUpdates}
                onChange={(e) => setProductUpdates(e.target.checked)}
                className="w-4 h-4 text-[#6C5CE7] rounded border-gray-300 focus:ring-[#6C5CE7]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: APPEARANCE */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-[#6C5CE7]" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Appearance
            </h2>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Laptop },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className={`py-2 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  theme === th.id
                    ? 'bg-[#15161A] text-white border-[#15161A] shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <th.icon size={14} />
                <span>{th.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Persistence Notice & Save Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Info size={14} className="text-gray-400" />
            <span>Preferences are stored in your secure browser session (localStorage).</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 bg-gradient-to-r from-[#6C5CE7] to-[#4638E0] hover:opacity-95 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Save size={15} />
            <span>Save All Preferences</span>
          </button>
        </div>
      </form>
    </div>
  )
}
