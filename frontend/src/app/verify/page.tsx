"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch, getMediaUrl } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "@/lib/toast"
import {
  ShieldCheck,
  Search,
  QrCode,
  AlertTriangle,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Camera,
  X,
  RefreshCw,
  Upload,
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

export default function CertificateSearchPortalPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [code, setCode] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // QR Scanner Modal State
  const [showScanner, setShowScanner] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch Public Settings
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

  // Execute verification query
  const performVerify = async (certCode: string) => {
    const cleanCode = certCode.trim().toUpperCase()
    if (!cleanCode) {
      toast.warning("กรุณาระบุรหัสใบประกาศนียบัตร")
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setSearchCode(cleanCode)

    try {
      const res = await apiFetch<VerifyResult>(`/api/certificates/verify/${encodeURIComponent(cleanCode)}`)
      if (res.success && res.data) {
        setResult(res.data)
      } else {
        setResult(null)
        setError(res.message || "ไม่พบข้อมูลใบประกาศนียบัตรนี้ในระบบ หรือรหัสไม่ถูกต้อง")
      }
    } catch {
      setResult(null)
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performVerify(code)
  }

  const handleQuickSample = (sampleCode: string) => {
    setCode(sampleCode)
    performVerify(sampleCode)
  }

  // Extract certificate code from potential URL string
  const extractCodeFromScan = (scannedText: string): string => {
    const trimmed = scannedText.trim()
    if (trimmed.includes("/verify/")) {
      const parts = trimmed.split("/verify/")
      const extracted = parts[parts.length - 1].split("?")[0].split("#")[0]
      return decodeURIComponent(extracted).trim().toUpperCase()
    }
    return trimmed.toUpperCase()
  }

  // Handle QR Camera Scanner Lifecycle
  useEffect(() => {
    let html5QrCode: any = null

    if (showScanner) {
      setScannerError(null)

      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          const readerElement = document.getElementById("qr-reader-portal")
          if (!readerElement) return

          html5QrCode = new Html5Qrcode("qr-reader-portal")
          scannerRef.current = html5QrCode

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          }

          html5QrCode
            .start(
              { facingMode: "environment" },
              config,
              (decodedText: string) => {
                // Success callback
                const extracted = extractCodeFromScan(decodedText)
                if (extracted) {
                  setCode(extracted)
                  setShowScanner(false)
                  toast.success(`ตรวจพบรหัส: ${extracted}`)
                  performVerify(extracted)
                }
              },
              () => {
                // Ignore silent continuous frame scan failures
              }
            )
            .catch((err: any) => {
              console.error("Camera start failed", err)
              setScannerError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง หรือใช้วิธีอัปโหลดรูปภาพ QR Code")
            })
        })
        .catch((err) => {
          console.error("Failed to load html5-qrcode library", err)
          setScannerError("ไม่สามารถโหลดไลบรารีสแกนเนอร์ได้")
        })
    }

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }
    }
  }, [showScanner])

  // Handle Image File Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const tempScanner = new Html5Qrcode("qr-temp-reader")
      const decodedText = await tempScanner.scanFile(file, true)
      tempScanner.clear()

      const extracted = extractCodeFromScan(decodedText)
      if (extracted) {
        setCode(extracted)
        setShowScanner(false)
        toast.success(`ตรวจพบรหัสจากรูปภาพ: ${extracted}`)
        performVerify(extracted)
      } else {
        toast.error("ไม่พบ QR Code ในรูปภาพที่เลือก")
      }
    } catch {
      toast.error("ไม่สามารถอ่าน QR Code จากรูปภาพนี้ได้")
    }
  }

  const handleCopyLink = () => {
    if (!result) return
    const url = `${window.location.origin}/verify/${encodeURIComponent(result.certificate_code)}`
    navigator.clipboard.writeText(url)
    toast.success("คัดลอกลิงก์ตรวจสอบเกียรติบัตรแล้ว")
  }

  const schoolNameTh = settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"
  const platformTitle = settings?.platform_title || "TUNorth-Hub"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Hidden container for temp file reader */}
      <div id="qr-temp-reader" className="hidden" />

      {/* ================= HEADER / TOPBAR ================= */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:border-brand-500/40 transition">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>กลับสู่หน้าหลัก {platformTitle}</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-900/20 transition"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        {/* HERO TITLE & BADGE */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800/80 text-brand-700 dark:text-brand-300 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Public Certificate Verification Portal</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ระบบตรวจสอบความถูกต้องของใบประกาศนียบัตร
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            {schoolNameTh} ({platformTitle}) · ตรวจสอบความถูกต้องของเกียรติบัตรที่ออกโดยระบบอย่างเป็นทางการแบบ Real-time
          </p>
        </div>

        {/* SEARCH BOX & CONTROLS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              กรอกรหัสใบประกาศนียบัตร (Certificate Code)
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="เช่น TUN-2026-XXXX-XXXX"
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm sm:text-base tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                {code && (
                  <button
                    type="button"
                    onClick={() => setCode("")}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-sm transition shrink-0"
                >
                  <QrCode className="w-4 h-4 text-brand-500" />
                  <span>สแกน QR Code</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !code.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-900/20 transition shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังตรวจสอบ...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>ตรวจสอบรหัส</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* QUICK HELPER & FORMAT EXAMPLES */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              รูปแบบรหัสมาตรฐาน: <strong className="font-mono text-slate-700 dark:text-slate-300">TUN-YYYY-XXXX-XXXX</strong>
            </span>
            <span className="text-[11px]">
              รองรับทั้งการพิมพ์รหัส, สแกนผ่านกล้อง และอัปโหลดภาพ QR
            </span>
          </div>
        </div>

        {/* ================= RESULT DISPLAY ================= */}
        {isLoading && (
          <div className="py-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              กำลังตรวจสอบข้อมูลกับฐานข้อมูลโรงเรียน...
            </h3>
            <p className="text-xs text-slate-400 font-mono">รหัส: {searchCode}</p>
          </div>
        )}

        {!isLoading && hasSearched && error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                ไม่พบข้อมูลใบประกาศนียบัตร หรือรหัสไม่ถูกต้อง
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400/90 font-mono font-semibold">
                รหัสที่ตรวจสอบ: {searchCode}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                กรุณาตรวจสอบความถูกต้องของตัวอักษรและตัวเลขอีกครั้ง หรือสแกน QR Code จากใบประกาศนียบัตรโดยตรง
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCode("")
                  setHasSearched(false)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-xs shadow-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ล้างข้อมูลและลองใหม่
              </button>
            </div>
          </div>
        )}

        {!isLoading && result && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-300">
            {/* SUCCESS BANNER */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    Official Verified Certificate
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    ใบประกาศนียบัตรถูกต้องสมบูรณ์ 100%
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    ออกโดย {schoolNameTh} ผ่านระบบรับรองอิเล็กทรอนิกส์
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs shadow-sm transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอกลิงก์
                </button>

                <Link
                  href={`/verify/${encodeURIComponent(result.certificate_code)}`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  <span>ดูหน้าหลัก</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  รหัสใบรับรอง (Certificate Code)
                </span>
                <p className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                  {result.certificate_code}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  ผู้ได้รับประกาศนียบัตร
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {result.student_name}
                </p>
                {result.grade_level && (
                  <p className="text-[11px] text-slate-500">
                    นักเรียนชั้นมัธยมศึกษาปีที่ {result.grade_level.replace("M", "")}/{result.classroom || "1"}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  รายวิชาที่สำเร็จการศึกษา
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-amber-400">
                  {result.course_title}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  ครูผู้สอนประจำรายวิชา
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {result.teacher_name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  วันและเวลาที่ออกใบรับรองในระบบ
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {new Date(result.issued_at).toLocaleString("th-TH", {
                    dateStyle: "full",
                    timeStyle: "medium",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= QR SCANNER MODAL ================= */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-600/30 text-brand-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">สแกน QR Code เกียรติบัตร</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SCANNER CAMERA CONTAINER */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[260px] flex items-center justify-center">
              <div id="qr-reader-portal" className="w-full h-full" />
              {scannerError && (
                <div className="p-4 text-center space-y-2 text-xs text-rose-400">
                  <AlertTriangle className="w-6 h-6 mx-auto text-rose-500" />
                  <p>{scannerError}</p>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-400">
              หันกล้องไปที่ QR Code บนใบประกาศนียบัตร หรือเลือกอัปโหลดรูปภาพ
            </p>

            {/* UPLOAD FILE ALTERNATIVE */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
              >
                <Upload className="w-4 h-4 text-brand-400" />
                <span>อัปโหลดรูปภาพ QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60 px-4">
        © {new Date().getFullYear()} {schoolNameTh} ({platformTitle}) · ระบบตรวจสอบใบประกาศนียบัตรอิเล็กทรอนิกส์
      </footer>
    </div>
  )
}
