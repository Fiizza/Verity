import { FileSearch, ArrowLeft } from "lucide-react";

export default function Navbar({ showBack, onBack }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Back to dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-primary-soft hover:bg-white/5 transition-colors mr-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="relative w-9 h-9 rounded-xl bg-primary-gradient flex items-center justify-center shadow-glow-sm">
          <FileSearch className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Verity wordmark */}
        <span className="inline-flex items-end leading-tight overflow-visible pb-0.5 text-[19px]">
          <span className="verity-mark verity-mark-float">
            Verity
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
        <span className="text-muted text-xs">Online</span>
      </div>
    </nav>
  );
}