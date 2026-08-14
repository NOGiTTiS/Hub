"use client"

import React, { useState } from "react"
import { FileText, Download, ExternalLink, Maximize2, AlertCircle, RefreshCw } from "lucide-react"

interface PDFViewerProps {
  src: string
  title?: string
}

export function PDFViewer({ src, title }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadError, setLoadError] = useState(false)

  if (!src) {
    return (
      <div className="w-full aspect-[4/3] max-h-[650px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6 text-center border border-slate-800">
        <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
        <p className="font-semibold text-white">ไม่พบไฟล์เอกสาร PDF</p>
        <p className="text-xs text-slate-400 mt-1">ผู้สอนยังไม่ได้อัปโหลดไฟล์สไลด์สำหรับบทเรียนนี้</p>
      </div>
    )
  }

  // Handle Relative vs Absolute URLs
  const pdfUrl = src.startsWith("http")
    ? src
    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${src}`

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`w-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
      isFullscreen ? "fixed inset-4 z-50 rounded-2xl shadow-2xl" : "relative"
    }`}>
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 backdrop-blur-md">
        <div className="flex items-center gap-2 text-white text-sm font-semibold truncate max-w-[60%]">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="truncate">{title || "เอกสารประกอบการเรียน (PDF Slide)"}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
            title="ดาวน์โหลดไฟล์ PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดาวน์โหลด</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition"
            title="เปิดในหน้าต่างใหม่"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition"
            title={isFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEWER IFRAME / OBJECT */}
      <div className={`w-full bg-slate-950 flex flex-col ${isFullscreen ? "h-[calc(100%-52px)]" : "h-[650px]"}`}>
        {loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
            <p className="font-semibold text-white">ไม่สามารถพรีวิวไฟล์ PDF โดยตรงได้</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              คุณสามารถกดดาวน์โหลดหรือเปิดดูไฟล์ PDF ในแท็บใหม่ได้โดยตรง
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              เปิดดูไฟล์ PDF ในหน้าต่างใหม่
            </a>
          </div>
        ) : (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            title={title || "PDF Document"}
            className="w-full h-full border-0"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  )
}
