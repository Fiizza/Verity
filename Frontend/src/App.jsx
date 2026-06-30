import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { PenLine } from "lucide-react"
import Navbar from "./components/Navbar"
import UploadZone from "./components/UploadZone"
import ChatWindow from "./components/ChatWindow"
import Sidebar from "./components/Sidebar"

export default function App() {
  const [session, setSession] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(17,17,24,0.9)",
            color: "#F0EFFF",
            border: "1px solid #1E1E2E",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />

      <Navbar showBack={!!session} onBack={() => setSession(null)} />

      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar key={refreshKey} currentSession={session} onSelectSession={handleSelectSession} />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!session ? (
            <div key="upload" className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                  {/* Animated, stylized Verity wordmark */}
                  <h1 className="mb-3 flex flex-col items-center">
                    <span className="inline-flex items-end justify-center text-4xl md:text-5xl text-balance leading-tight overflow-visible pb-1">
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
              className="flex-1 flex flex-col overflow-hidden m-4 glass border border-border rounded-2xl shadow-soft animate-fade-in"
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