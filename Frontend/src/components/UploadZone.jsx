import { useDropzone } from "react-dropzone"
import { uploadPDF } from "../api"
import toast from "react-hot-toast"
import { Upload, FileText, Loader2 } from "lucide-react"
import { useState } from "react"

export default function UploadZone({ onUpload }) {
  const [uploading, setUploading] = useState(false)

  const onDrop = async (files) => {
    const file = files[0]
    if (!file) return
    if (!file.name.endsWith(".pdf")) {
      toast.error("Only PDF files are supported.")
      return
    }
    setUploading(true)
    try {
      const data = await uploadPDF(file)
      toast.success(`Indexed ${data.pages_indexed} pages!`)
      onUpload(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={`group relative mx-auto max-w-md overflow-hidden rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
        ${
          isDragActive
            ? "bg-primary/10 shadow-glow scale-[1.01]"
            : uploading
              ? "bg-surface/60"
              : "bg-surface/40 hover:bg-surface/70 animate-breathe"
        }`}
    >
      {/* Animated dashed border */}
      <svg className="dash-border pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="16"
          fill="none"
          stroke={isDragActive ? "#7C6FFF" : "#2A2A3D"}
          strokeWidth="2"
          strokeDasharray="10 8"
        />
      </svg>

      <input {...getInputProps()} />
      <div className="relative flex flex-col items-center gap-4">
        {uploading ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-text font-medium text-sm">Indexing your PDF…</p>
              <p className="text-muted text-xs mt-1">Extracting and embedding pages</p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isDragActive ? "bg-primary-gradient shadow-glow-sm scale-110" : "bg-primary/12 group-hover:scale-105"}`}
            >
              {isDragActive ? (
                <FileText className="w-6 h-6 text-white" />
              ) : (
                <Upload className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-text font-semibold text-base tracking-tight">
                {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF"}
              </p>
              <p className="text-muted text-xs mt-1">
                or <span className="text-primary-soft">click to browse</span> · Max 10MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}