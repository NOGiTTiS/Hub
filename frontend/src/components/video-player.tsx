"use client"

import React, { useState } from "react"
import { Play, Maximize2, AlertCircle, ExternalLink } from "lucide-react"

interface VideoPlayerProps {
  type: "direct" | "embed"
  src: string
  title?: string
  onComplete?: () => void
}

export function VideoPlayer({ type, src, title, onComplete }: VideoPlayerProps) {
  const [hasEnded, setHasEnded] = useState(false)

  if (!src) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6 text-center border border-slate-800">
        <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
        <p className="font-semibold text-white">ไม่พบไฟล์วิดีโอ</p>
        <p className="text-xs text-slate-400 mt-1">ผู้สอนยังไม่ได้แนบลิงก์หรืออัปโหลดวิดีโอสำหรับบทเรียนนี้</p>
      </div>
    )
  }

  // Handle Embeds (YouTube, Google Drive, Vimeo, etc.)
  if (type === "embed" || src.includes("youtube.com") || src.includes("youtu.be") || src.includes("drive.google.com")) {
    let embedUrl = src

    // Transform YouTube standard URL to embed URL if needed
    if (src.includes("youtube.com/watch?v=")) {
      const videoId = src.split("watch?v=")[1]?.split("&")[0]
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
      }
    } else if (src.includes("youtu.be/")) {
      const videoId = src.split("youtu.be/")[1]?.split("?")[0]
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
      }
    } else if (src.includes("drive.google.com/file/d/")) {
      // Transform Google Drive share link to preview link
      const fileId = src.split("/file/d/")[1]?.split("/")[0]
      if (fileId) {
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`
      }
    }

    return (
      <div className="w-full space-y-2">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800">
          <iframe
            src={embedUrl}
            title={title || "Embedded Video Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>วิดีโอจากแหล่งภายนอก (Embedded Player)</span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline"
          >
            เปิดในแท็บใหม่ <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  // Handle Direct Uploaded Videos (MP4, WebM)
  // If URL is relative like /uploads/videos/..., prepend backend URL if needed or serve directly
  const videoUrl = src.startsWith("http") ? src : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${src}`

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 group">
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
          onEnded={() => {
            setHasEnded(true)
            if (onComplete) onComplete()
          }}
        >
          เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอนี้
        </video>
      </div>
      {hasEnded && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>🎉 เล่นวิดีโอจบแล้ว! คุณสามารถกดบันทึกความก้าวหน้าบทเรียนได้เลย</span>
        </div>
      )}
    </div>
  )
}
