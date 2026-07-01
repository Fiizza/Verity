import { useState, useRef, useEffect } from "react"
import { askQuestion, getHistory } from "../api"
import CitationCard from "./CitationCard"
import toast from "react-hot-toast"
import { Send, MessageSquareText, FileText } from "lucide-react"

const MAX_CHARS = 500

export default function ChatWindow({ session }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load existing chat history when session changes (e.g. switching from sidebar)
  useEffect(() => {
    setMessages([])
    if (!session?.session_id) return
    getHistory(session.session_id)
      .then((data) => {
        if (!data?.length) return
        // Backend returns DESC (newest first) — reverse so the chat renders
        // oldest → newest, with the input bar ready to continue at the bottom.
        const loaded = [...data].reverse().flatMap((item) => [
          { role: "user", text: item.question },
          {
            role: "assistant",
            text: item.answer,
            // pages_used is stored as "3,4,9" — build minimal source objects so
            // CitationCard renders its toggle with page badges. Text snippets
            // aren't persisted in the DB, so the preview is intentionally blank.
            sources: item.pages_used
              ? item.pages_used
                  .split(",")
                  .map((p) => ({ page: parseInt(p.trim(), 10), text: "" }))
                  .filter((s) => !isNaN(s.page))
              : null,
            pages: item.pages_used,
          },
        ])
        setMessages(loaded)
      })
      .catch(() => {})
  }, [session?.session_id])

  const send = async () => {
    if (!input.trim()) return
    const question = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text: question }])
    setLoading(true)
    try {
      const data = await askQuestion(session.session_id, question)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          sources: data.sources,
          pages: data.pages,
        },
      ])
    } catch (err) {
      // FIX: a 404 here specifically means the server-side session/index
      // is gone (e.g. the host restarted and wiped ephemeral storage on
      // a free tier) — not a generic network hiccup. Surface that clearly
      // instead of leaving the question hanging with a console error.
      if (err.response?.status === 404) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "This session expired — the server restarted and lost the index for this document. Please re-upload the PDF to continue.",
            sources: null,
          },
        ])
        toast.error("Session expired. Please re-upload your PDF.")
      } else {
        toast.error(err.response?.data?.detail || "Something went wrong.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session info */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-border/70 glass-strong rounded-t-2xl flex items-center gap-2.5 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-soft" />
        </div>
        <div className="min-w-0">
          <p className="text-text text-sm font-medium truncate">{session.filename}</p>
          <p className="text-muted text-xs">{session.pages_indexed} pages indexed</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in px-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center mb-5 shadow-glow-sm">
              <MessageSquareText className="w-7 h-7 text-primary-soft" />
            </div>
            <p className="text-text text-lg font-medium tracking-tight">Ask anything about your document</p>
            <p className="text-muted text-sm mt-1.5 max-w-xs text-balance">
              Every answer includes precise page citations from your source.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex animate-fade-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 ${
                msg.role === "user"
                  ? "bg-primary-gradient text-white shadow-glow-sm rounded-br-md"
                  : "glass border border-border text-text rounded-bl-md"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.role === "assistant" && msg.sources && <CitationCard sources={msg.sources} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-up">
            <div className="glass border border-border rounded-2xl rounded-bl-md px-4 py-3.5">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary-soft rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-border/70">
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative min-w-0">
            <input
              className="w-full glass border border-border rounded-xl pl-3.5 sm:pl-4 pr-14 sm:pr-16 py-2.5 sm:py-3 text-text placeholder-muted text-sm outline-none focus:border-primary/60 focus:shadow-glow-sm transition-all"
              placeholder="Ask a question about your document…"
              value={input}
              maxLength={MAX_CHARS}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229 && send()
              }
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums ${
                input.length >= MAX_CHARS ? "text-red-400" : "text-muted"
              }`}
            >
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-primary-gradient hover:opacity-90 disabled:opacity-30 disabled:shadow-none text-white rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition-all shadow-glow-sm flex-shrink-0"
            aria-label="Send question"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
