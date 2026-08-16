"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import QRCode from "qrcode"
import { apiFetch, getMediaUrl } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "@/lib/toast"
import {
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  ArrowLeft,
  Loader2,
  Copy,
  Search,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  UserCheck,
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
  const code = (params?.code as string) || ""

  const [result, setResult] = useState<VerifyResult | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
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
      try {
        const res = await apiFetch<VerifyResult>(`/api/certificates/verify/${encodeURIComponent(code.trim())}`)
        if (res.success && res.data) {
          setResult(res.data)
        } else {
          setError(res.message || "ไม่พบข้อมูลใบประกาศนียบัตรนี้ในระบบ หรือรหัสไม่ถูกต้อง")
        }
      } catch {
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบได้")
      } finally {
        setIsLoading(false)
      }
    }

    verifyCert()
  }, [code])

  // Generate dynamic QR Code for this certificate verification link
  useEffect(() => {
    if (!result?.certificate_code) return
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const verifyUrl = `${origin}/verify/${encodeURIComponent(result.certificate_code)}`

    QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        setQrCodeUrl(url)
      })
      .catch((err) => {
        console.error("Failed to generate QR Code", err)
      })
  }, [result?.certificate_code])

  const handleCopyLink = () => {
    if (typeof window === "undefined") return
    navigator.clipboard.writeText(window.location.href)
    toast.success("คัดลอกลิงก์ตรวจสอบเกียรติบัตรเรียบร้อยแล้ว")
  }

  const schoolNameTh = settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"
  const platformTitle = settings?.platform_title || "TUNorth-Hub"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* ================= TOPBAR ================= */}
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/verify"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:border-brand-500/40 transition">
              <Search className="w-4 h-4" />
            </div>
            <span>ค้นหาเกียรติบัตรอื่น</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition"
            >
              หน้าแรก
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MAIN VERIFICATION CARD ================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* LOGO & HEADER */}
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
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-inner">
                <GraduationCap className="w-7 h-7" />
              </div>
            )}
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
              ระบบตรวจสอบความถูกต้องของใบประกาศนียบัตร
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {schoolNameTh} ({platformTitle})
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              กำลังตรวจสอบรหัสใบประกาศนียบัตร...
            </div>
          ) : error || !result ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                ไม่พบใบประกาศนียบัตร หรือรหัสไม่ถูกต้อง
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400/80 leading-relaxed font-mono font-bold">
                รหัส: {code}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                กรุณาตรวจสอบความถูกต้องของรหัสหรือลิงก์ใบรับรองอีกครั้ง
              </p>
              <div className="pt-2">
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs transition shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  ไปยังหน้าค้นหารหัส
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* SUCCESS BANNER */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Verified Certificate · ถูกต้องสมบูรณ์
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                    ใบประกาศนียบัตรนี้ออกโดยระบบอย่างเป็นทางการ 100%
                  </p>
                </div>
              </div>

              {/* DETAILS CARD */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                    รหัสใบรับรอง (Certificate Code)
                  </span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-base">
                    {result.certificate_code}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      ผู้ได้รับประกาศนียบัตร
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {result.student_name}
                    </span>
                    {result.grade_level && (
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                        นักเรียนชั้น ม.{result.grade_level.replace("M", "")}/{result.classroom || "1"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <BookOpen className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      รายวิชาที่สำเร็จการศึกษา
                    </span>
                    <span className="font-bold text-slate-900 dark:text-amber-400 text-sm">
                      {result.course_title}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <UserCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      ครูผู้สอน
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {result.teacher_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      วันที่ออกใบรับรองในระบบ
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {new Date(result.issued_at).toLocaleString("th-TH", {
                        dateStyle: "full",
                        timeStyle: "medium",
                      })}
                    </span>
                  </div>
                </div>

                {/* QR CODE DISPLAY */}
                {qrCodeUrl && (
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                        Dynamic QR Code
                      </span>
                      <p className="text-[10px] text-slate-400">
                        สแกนเพื่อตรวจสอบหน้านี้ได้ทุกที่
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-white p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeUrl}
                        alt={`QR Code ${result.certificate_code}`}
                        className="w-12 h-12 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </button>

                <Link
                  href="/verify"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-900/20 transition"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>ค้นหารหัสอื่น</span>
                </Link>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่หน้าหลัก {platformTitle}
            </Link>
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 px-4">
        © {new Date().getFullYear()} {schoolNameTh} ({platformTitle}) · Electronic Certificate Verification
      </footer>
    </div>
  )
}
