import { useState } from "react"
import { Quote, ChevronDown } from "lucide-react"

export default function CitationCard({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 border-t border-border/70 pt-2.5 sm:pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-muted hover:text-primary-soft transition-colors w-full"
      >
        <Quote className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wider truncate">
          {sources.length} Source{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 overflow-hidden animate-accordion-down">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {sources.map((src, i) => (
              <div
                key={i}
                className="bg-sidebar/80 border border-border rounded-xl p-2.5 sm:p-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                  <span className="text-[11px] bg-primary/15 text-primary-soft px-2 py-0.5 rounded-full font-medium border border-primary/20">
                    Page {src.page}
                  </span>
                </div>
                <p className="text-muted text-xs leading-relaxed line-clamp-3 break-words">{src.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
