"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  BookOpen,
  UserX,
} from "lucide-react"

interface PublicSettings {
  school_name_th?: string
  platform_title?: string
  allow_student_registration?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, refreshUser } = useAuth()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [checkingSettings, setCheckingSettings] = useState(true)

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    grade_level: "ม.4",
    classroom: "1",
  })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let ignore = false
    async function loadSettings() {
      try {
        const res = await apiFetch<PublicSettings>("/api/settings/public")
        if (!ignore && res.success && res.data) {
          setSettings(res.data)
        }
      } catch (err) {
        console.error("Failed to load public settings", err)
      } finally {
        if (!ignore) setCheckingSettings(false)
      }
    }
    loadSettings()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/student")
    }
  }, [isAuthenticated, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validations
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || !formData.password) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง")
      return
    }

    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
      return
    }

    if (formData.password !== formData.confirm_password) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    setSubmitting(true)

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          grade_level: formData.grade_level,
          classroom: formData.classroom,
        }),
      })

      if (res.success) {
        setSuccess(true)
        if (refreshUser) {
          await refreshUser()
        }
        setTimeout(() => {
          router.push("/student")
        }, 1500)
      } else {
        setError(res.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก")
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง")
    } finally {
      setSubmitting(false)
    }
  }

  const isRegistrationClosed = settings && settings.allow_student_registration !== "true"

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-500 group-hover:bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30 transition-all">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {settings?.platform_title || "TUNorth-Hub"}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-en">
                {settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษาภาคเหนือ"}
              </p>
            </div>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {checkingSettings ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">กำลังตรวจสอบสถานะการเปิดรับสมัคร...</p>
            </div>
          ) : isRegistrationClosed ? (
            /* REGISTRATION CLOSED NOTICE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <UserX className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  ระบบปิดรับสมัครสมาชิกด้วยตนเองชั่วคราว
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  ขณะนี้ระบบไม่อนุญาตให้นักเรียนลงทะเบียนเอง กรุณาติดต่อคุณครูผู้ดูแลระบบเพื่อรับการเพิ่มบัญชีหรือนำเข้าข้อมูลผู้ใช้งาน
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all text-center"
                >
                  ไปที่หน้าเข้าสู่ระบบ (Login Portal)
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all text-center"
                >
                  กลับหน้าแรก
                </Link>
              </div>
            </div>
          ) : success ? (
            /* SUCCESS CARD */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-emerald-200 dark:border-emerald-800 shadow-xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                สมัครสมาชิกนักเรียนสำเร็จ!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ยินดีต้อนรับเข้าสู่ระบบ กำลังนำคุณเข้าสู่ระบบการเรียนรู้...
              </p>
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin mx-auto" />
            </div>
          ) : (
            /* REGISTRATION FORM */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                  สำหรับนักเรียน (Student Portal)
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ลงทะเบียนสมัครสมาชิกนักเรียน
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  กรอกข้อมูลส่วนตัวเพื่อสร้างบัญชีเข้าใช้งานระบบ LMS
                </p>
              </div>

              {/* ERROR ALERT */}
              {error && (
                <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      ชื่อจริง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="สมชาย"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ใจดี"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    อีเมล (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@tunorth.ac.th"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-en"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ระดับชั้น
                    </label>
                    <select
                      value={formData.grade_level}
                      onChange={(e) => handleInputChange("grade_level", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="ม.1">มัธยมศึกษาปีที่ 1 (ม.1)</option>
                      <option value="ม.2">มัธยมศึกษาปีที่ 2 (ม.2)</option>
                      <option value="ม.3">มัธยมศึกษาปีที่ 3 (ม.3)</option>
                      <option value="ม.4">มัธยมศึกษาปีที่ 4 (ม.4)</option>
                      <option value="ม.5">มัธยมศึกษาปีที่ 5 (ม.5)</option>
                      <option value="ม.6">มัธยมศึกษาปีที่ 6 (ม.6)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ห้องเรียน
                    </label>
                    <select
                      value={formData.classroom}
                      onChange={(e) => handleInputChange("classroom", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    >
                      {Array.from({ length: 15 }, (_, i) => (
                        <option key={i + 1} value={`${i + 1}`}>
                          ห้อง {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      รหัสผ่าน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      ยืนยันรหัสผ่าน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้างบัญชีนักเรียน...
                    </>
                  ) : (
                    <>
                      ยืนยันการสมัครสมาชิก
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* FOOTER LINK TO LOGIN */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
                มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
                <Link
                  href="/login"
                  className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
                >
                  เข้าสู่ระบบที่นี่
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
        TUNorth-Hub © 2026 {settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษาภาคเหนือ"} · LMS EdTech Platform
      </footer>
    </div>
  )
}
