"use client"

import React, { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import {
  Wrench,
  ShieldCheck,
  RefreshCw,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from "lucide-react"

interface PublicSettings {
  school_name_th?: string
  school_name_en?: string
  platform_title?: string
  platform_subtitle?: string
  maintenance_mode?: string
  maintenance_message?: string
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [checking, setChecking] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    try {
      const res = await apiFetch<PublicSettings>("/api/settings/public")
      if (res.success && res.data) {
        setSettings(res.data)
      }
    } catch (err) {
      console.error("Failed to check maintenance status:", err)
    } finally {
      setChecking(false)
    }
  }

  const handleAdminLogin = async () => {
    if (isAuthenticated) {
      setLoggingOut(true)
      await logout()
    } else {
      router.push("/login")
    }
  }

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const res = await apiFetch<PublicSettings>("/api/settings/public")
        if (!ignore && res.success && res.data) {
          setSettings(res.data)
        }
      } catch (err) {
        console.error("Failed to check maintenance status:", err)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  // If maintenance mode is enabled
  const isMaintenance = settings?.maintenance_mode === "true"
  const isAdmin = isAuthenticated && user?.role === "ADMIN"

  // Always allow admin to access any page, and allow login page so admin can sign in
  const isAllowedPath = pathname === "/login" || pathname.startsWith("/admin")

  if (isMaintenance && !isAdmin && !isAllowedPath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-between bg-slate-900 text-slate-100 p-6 relative overflow-hidden selection:bg-brand-500 selection:text-white">
        {/* BACKGROUND AMBIENT GLOW */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* TOP BRANDING */}
        <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-600/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-tight block">
                {settings?.platform_title || "TUNorth-Hub"}
              </span>
              <span className="text-[11px] text-slate-400 block font-en">
                {settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษาภาคเหนือ"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdminLogin}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>{loggingOut ? "กำลังออกจากระบบ..." : isAuthenticated ? "สลับบัญชีเป็น Admin" : "เข้าสู่ระบบ Admin"}</span>
          </button>
        </header>

        {/* MAIN MAINTENANCE CARD */}
        <main className="w-full max-w-xl mx-auto my-auto py-12 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2 shadow-inner">
            <Wrench className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>โหมดปิดปรับปรุงระบบชั่วคราว (Maintenance Mode)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ระบบอยู่ระหว่างการปรับปรุง
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700/60 shadow-xs">
              {settings?.maintenance_message ||
                "ระบบอยู่ระหว่างการปิดปรับปรุงชั่วคราวเพื่อพัฒนาและเพิ่มประสิทธิภาพการให้บริการ ขออภัยในความไม่สะดวก"}
            </p>

            {isAuthenticated && user && (
              <div className="text-xs text-slate-400 bg-slate-800/30 p-2.5 rounded-xl border border-slate-700/40 inline-block">
                กำลังเข้าสู่ระบบในชื่อ: <span className="font-semibold text-slate-200">{user.first_name} {user.last_name}</span> ({user.role})
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin text-brand-400" : ""}`} />
              <span>{checking ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะอีกครั้ง"}</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogin}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loggingOut ? "กำลังออกจากระบบ..." : isAuthenticated ? "ออกจากระบบ / ล็อกอิน Admin" : "เข้าสู่ระบบเจ้าหน้าที่"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="w-full max-w-4xl mx-auto py-4 text-center text-xs text-slate-500 relative z-10">
          {settings?.platform_title || "TUNorth-Hub"} © 2026 {settings?.school_name_th}
        </footer>
      </div>
    )
  }

  return <>{children}</>
}
