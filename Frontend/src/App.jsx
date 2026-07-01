import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import { PenLine } from "lucide-react"
import Navbar from "./components/Navbar"
import UploadZone from "./components/UploadZone"
import ChatWindow from "./components/ChatWindow"
import Sidebar from "./components/Sidebar"
import { pingHealth } from "./api"

export default function App() {
  const [session, setSession] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  // FIX: sidebar is now a slide-in drawer on mobile, controlled from here
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // FIX: light/dark theme toggle. Persists the user's choice; falls back
  // to their OS/browser preference the first time they visit.
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("verity_theme")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    localStorage.setItem("verity_theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  // FIX: keep the backend warm while the tab is open, to reduce
  // idle-sleep restarts (and the data loss that comes with them on
  // free-tier ephemeral hosting) during an active session.
  useEffect(() => {
    const interval = setInterval(pingHealth, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleUpload = (data) => {
    setSession(data)
    setRefreshKey((k) => k + 1)
  }

  const handleSelectSession = (selectedSession) => {
    setSession({
      session_id: selectedSession.session_id,
      filename: selectedSession.filename,
      pages_indexed: selectedSession.pages_indexed,
    })
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          // FIX: was a hardcoded dark-mode-only style; now themed via
          // Tailwind classes so toasts stay legible in light mode too.
          className: "!bg-surface/90 !text-text !border !border-border !backdrop-blur-md !rounded-xl !text-[13px]",
        }}
      />

      <Navbar
        showBack={!!session}
        onBack={() => setSession(null)}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          key={refreshKey}
          currentSession={session}
          onSelectSession={handleSelectSession}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
          {!session ? (
            <div key="upload" className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 animate-fade-in">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-8 sm:mb-10">
                  {/* Animated, stylized Verity wordmark */}
                  <h1 className="mb-3 flex flex-col items-center">
                    <span className="inline-flex items-end justify-center text-3xl sm:text-4xl md:text-5xl text-balance leading-tight overflow-visible pb-1">
                      <span className="verity-mark verity-mark-float">Verity</span>
                      
                    </span>
                  </h1>

                  <p className="text-muted text-xs text-pretty">
                    Upload any PDF and get AI-powered answers with page citations
                  </p>
                </div>
                <UploadZone onUpload={handleUpload} />
              </div>
            </div>
          ) : (
            <div
              key="chat"
              className="flex-1 flex flex-col overflow-hidden m-2 sm:m-4 glass border border-border rounded-2xl shadow-soft animate-fade-in"
            >
              <ChatWindow session={session} />
              <div className="px-4 py-2.5 border-t border-border/70 text-center">
                <button
                  onClick={() => setSession(null)}
                  className="text-muted text-xs hover:text-primary-soft transition-colors"
                >
                  ← Upload a different PDF
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


