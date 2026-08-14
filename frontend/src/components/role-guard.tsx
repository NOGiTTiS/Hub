"use client"

import React, { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth, UserRole } from "@/lib/auth-context"
import { ShieldAlert, Loader2 } from "lucide-react"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [loading, isAuthenticated, pathname, router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    )
  }

  if (!user || !isAuthenticated) {
    return null
  }

  if (!allowedRoles.includes(user.role)) {
    const getDashboardPath = () => {
      switch (user.role) {
        case "ADMIN":
          return "/admin"
        case "TEACHER":
          return "/teacher"
        case "STUDENT":
          return "/student"
        default:
          return "/"
      }
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          บัญชีของคุณเป็นบทบาท <strong>{user.role}</strong> ซึ่งไม่มีสิทธิ์เข้าถึงหน้านี้
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push(getDashboardPath())}
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all cursor-pointer"
          >
            ไปยังหน้าหลักของคุณ
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
