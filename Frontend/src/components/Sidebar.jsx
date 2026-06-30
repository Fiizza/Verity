import { useEffect, useState } from "react"
import { getSessions, deleteSession, getHistory } from "../api"
import { Trash2, ChevronDown, ChevronRight, FileText, Clock, Library } from "lucide-react"
import toast from "react-hot-toast"

export default function Sidebar({ currentSession, onSelectSession }) {
  const [sessions, setSessions] = useState([])
  const [expandedSession, setExpandedSession] = useState(null)
  const [histories, setHistories] = useState({})

  useEffect(() => {
    fetchSessions()
  }, [currentSession])

  const fetchSessions = async () => {
    try {
      const data = await getSessions()
      setSessions(data)
    } catch {
      console.error("Failed to load sessions.")
    }
  }

  const toggleExpand = async (session_id) => {
    if (expandedSession === session_id) {
      setExpandedSession(null)
      return
    }
    setExpandedSession(session_id)
    if (!histories[session_id]) {
      try {
        const data = await getHistory(session_id)
        setHistories((prev) => ({ ...prev, [session_id]: data }))
      } catch {
        toast.error("Failed to load history.")
      }
    }
  }

  const handleDelete = async (e, session_id) => {
    e.stopPropagation()
    try {
      await deleteSession(session_id)
      setSessions((prev) => prev.filter((s) => s.session_id !== session_id))
      setHistories((prev) => {
        const copy = { ...prev }
        delete copy[session_id]
        return copy
      })
      toast.success("Session deleted.")
    } catch {
      toast.error("Failed to delete session.")
    }
  }

  return (
    <aside className="w-72 glass border-r border-white/5 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-primary-soft" />
          <h2 className="text-text font-semibold text-sm tracking-tight">Session History</h2>
        </div>
        <p className="text-muted text-xs mt-1">
          {sessions.length} document{sessions.length !== 1 ? "s" : ""} uploaded
        </p>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {sessions.length === 0 && (
          <div className="text-center text-muted text-xs mt-10 px-6 leading-relaxed">
            No sessions yet.
            <br />
            Upload a PDF to get started.
          </div>
        )}

        {sessions.map((session, index) => {
          const isActive = currentSession?.session_id === session.session_id
          return (
            <div
              key={session.session_id}
              className="animate-slide-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Session row */}
              <div
                onClick={() => {
                  toggleExpand(session.session_id)
                  onSelectSession(session)
                }}
                className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer group transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary/12 shadow-glow-sm"
                      : "hover:bg-white/[0.03] border border-transparent"
                  }`}
              >
                {/* Active glowing left border */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary-gradient shadow-[0_0_10px_rgba(124,111,255,0.8)]" />
                )}

                {/* Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? "bg-primary-gradient" : "bg-primary/12"
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-primary-soft"}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                    )}
                    <p className="text-text text-xs font-medium truncate">{session.filename}</p>
                  </div>
                  <p className="text-muted text-[11px] mt-0.5">
                    {session.pages_indexed} pages · {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, session.session_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted hover:bg-red-500/15 hover:text-red-400 hover:animate-shake transition-all"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedSession === session.session_id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  )}
                </div>
              </div>

              {/* Query history dropdown */}
              {expandedSession === session.session_id && (
                <div className="ml-4 mt-1 mb-1 space-y-1 border-l border-border pl-3 animate-accordion-down max-h-60 overflow-y-auto history-scroll">
                  {!histories[session.session_id] && <p className="text-muted text-xs py-2">Loading…</p>}
                  {histories[session.session_id]?.length === 0 && (
                    <p className="text-muted text-xs py-2">No questions asked yet.</p>
                  )}
                  {histories[session.session_id]?.map((item, i) => (
                    <div key={i} className="py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-start gap-1.5">
                        <Clock className="w-3 h-3 text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-text text-xs leading-relaxed">{item.question}</p>
                          <p className="text-muted text-xs mt-0.5 line-clamp-2">{item.answer}</p>
                          <p className="text-muted/60 text-[11px] mt-1">
                            Pages: {item.pages_used} · {new Date(item.asked_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}