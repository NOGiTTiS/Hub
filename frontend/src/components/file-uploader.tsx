"use client"

import React, { useState, useRef } from "react"
import { toast } from "@/lib/toast"
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

interface FileUploaderProps {
  category: "video" | "pdf" | "image" | "general"
  onUploadSuccess: (url: string, fileData?: any) => void
  currentValue?: string
  accept?: string
  label?: string
  helperText?: string
}

export function FileUploader({
  category,
  onUploadSuccess,
  currentValue,
  accept,
  label,
  helperText,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentValue || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultAccepts = {
    video: "video/mp4,video/webm,video/quicktime",
    pdf: "application/pdf",
    image: "image/png,image/jpeg,image/webp,image/svg+xml",
    general: "*/*",
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setError(null)
    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", category)

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์")
      }

      setPreviewUrl(data.data.url)
      onUploadSuccess(data.data.url, data.data)
      toast.success("อัปโหลดไฟล์เรียบร้อยแล้ว")
    } catch (err: any) {
      const errMsg = err.message || "อัปโหลดล้มเหลว"
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-2xl p-4 transition text-center bg-slate-50/50 dark:bg-slate-900/50">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept || defaultAccepts[category]}
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id={`uploader-${category}`}
        />

        {isUploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              กำลังอัปโหลดไฟล์ขึ้นสู่เซิร์ฟเวอร์...
            </p>
          </div>
        ) : previewUrl ? (
          <div className="flex items-center justify-between p-2 bg-brand-50/50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-900/60">
            <div className="flex items-center gap-3 truncate text-left">
              <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {previewUrl.split("/").pop()}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ อัปโหลดไฟล์เรียบร้อยแล้ว
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold px-2 py-1"
              >
                เปลี่ยนไฟล์
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer py-5 flex flex-col items-center justify-center space-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-brand-600 group-hover:bg-brand-50 dark:group-hover:bg-brand-950 flex items-center justify-center transition">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand-600">
              คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
            </p>
            <p className="text-[11px] text-slate-400">
              {helperText ||
                (category === "video"
                  ? "รองรับ MP4, WebM (สูงสุด 500MB)"
                  : category === "pdf"
                  ? "รองรับเอกสาร PDF (สูงสุด 100MB)"
                  : "รองรับ JPG, PNG, WebP (สูงสุด 20MB)")}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
