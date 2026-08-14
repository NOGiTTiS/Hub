"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  ArrowLeft,
  Loader2,
} from "lucide-react"

interface VerifyResult {
  valid: boolean
  certificate_code: string
  issued_at: string
  student_name: string
  grade_level?: string
  classroom?: string
  course_title: string
  teacher_name: string
}

interface PublicSettings {
  school_name_th?: string
  school_name_en?: string
  platform_title?: string
  site_logo_url?: string
}

export default function CertificateVerificationPage() {
  const params = useParams()
  const code = params?.code as string

  const [result, setResult] = useState<VerifyResult | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchSettings = async () => {
      try {
        const res = await apiFetch<PublicSettings>("/api/settings/public")
        if (!ignore && res.success && res.data) {
          setSettings(res.data)
        }
      } catch {
        // Fallback to default
      }
    }

    fetchSettings()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!code) return

    const verifyCert = async () => {
      setIsLoading(true)
      setError(null)
      const res = await apiFetch<VerifyResult>(`/api/certificates/verify/${encodeURIComponent(code)}`)
      if (res.success && res.data) {
        setResult(res.data)
      } else {
        setError(res.message || "ไม่พบข้อมูลใบประกาศนียบัตรนี้ในระบบ หรือรหัสไม่ถูกต้อง")
      }
      setIsLoading(false)
    }

    verifyCert()
  }, [code])

  const schoolNameTh = settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"
  const platformTitle = settings?.platform_title || "TUNorth-Hub"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* LOGO */}
        <div className="text-center space-y-2">
          {settings?.site_logo_url ? (
            <div className="w-14 h-14 mx-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(settings.site_logo_url)}
                alt={schoolNameTh}
                className="max-h-14 max-w-14 object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
          )}
          <h1 className="text-lg font-bold text-white tracking-wide">
            ระบบตรวจสอบความถูกต้องของใบประกาศนียบัตร
          </h1>
          <p className="text-xs text-slate-400">
            {schoolNameTh} ({platformTitle})
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            กำลังตรวจสอบรหัสใบประกาศนียบัตร...
          </div>
        ) : error || !result ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-rose-300">
              ไม่พบใบประกาศนียบัตร หรือรหัสไม่ถูกต้อง
            </h3>
            <p className="text-xs text-rose-400/80 leading-relaxed font-mono">
              รหัส: {code}
            </p>
            <p className="text-[11px] text-slate-500">
              กรุณาตรวจสอบความถูกต้องของรหัสหรือลิงก์ใบรับรองอีกครั้ง
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* SUCCESS BANNER */}
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800 flex items-center gap-3 text-emerald-300">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Verified Certificate · ถูกต้องสมบูรณ์
                </h4>
                <p className="text-[11px] text-emerald-400/80">
                  ใบประกาศนียบัตรนี้ออกโดยระบบอย่างเป็นทางการ
                </p>
              </div>
            </div>

            {/* DETAILS */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  รหัสใบรับรอง (Certificate Code)
                </span>
                <span className="font-mono font-bold text-brand-400 text-sm">
                  {result.certificate_code}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  ผู้ได้รับประกาศนียบัตร
                </span>
                <span className="font-bold text-white text-sm">
                  {result.student_name}
                </span>
                {result.grade_level && (
                  <span className="text-slate-400 block text-[11px]">
                    ชั้น ม.{result.grade_level.replace("M", "")}/{result.classroom || "1"}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  รายวิชาที่สำเร็จการศึกษา
                </span>
                <span className="font-bold text-amber-300 text-sm">
                  {result.course_title}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  ครูผู้สอน
                </span>
                <span className="font-semibold text-slate-300">
                  {result.teacher_name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  วันที่ออกใบรับรอง
                </span>
                <span className="text-slate-400">
                  {new Date(result.issued_at).toLocaleString("th-TH")}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่หน้าหลัก {platformTitle}
          </Link>
        </div>
      </div>
    </div>
  )
}
