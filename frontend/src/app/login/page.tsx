"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth, UserRole, User } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight, Loader2, ShieldCheck, BookOpen, UserCheck } from "lucide-react"

function getRoleDefaultPath(role: UserRole): string {
  switch (role) {
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

// Strict role check for redirect target
function isAuthorizedForPath(role: UserRole, path: string): boolean {
  if (path.startsWith("/admin")) {
    return role === "ADMIN"
  }
  if (path.startsWith("/teacher")) {
    return role === "TEACHER"
  }
  if (path.startsWith("/student")) {
    return role === "STUDENT"
  }
  return true
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")

  const { user, login, logout, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleRedirect = React.useCallback((currentUser: User) => {
    if (redirectParam && isAuthorizedForPath(currentUser.role, redirectParam)) {
      router.push(redirectParam)
    } else {
      router.push(getRoleDefaultPath(currentUser.role))
    }
  }, [redirectParam, router])

  // Redirect if admin
  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      handleRedirect(user)
    }
  }, [isAuthenticated, user, handleRedirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน")
      return
    }

    setSubmitting(true)
    const res = await login(email, password)
    setSubmitting(false)

    if (!res.success) {
      setError(res.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
      return
    }

    if (res.data?.user) {
      handleRedirect(res.data.user)
    }
  }

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError("")
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors">
      <div className="text-center mb-8">
        <span className="inline-block bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          TUNorth Learning System
        </span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          เข้าสู่ระบบการเรียนรู้
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          กรอกอีเมลโรงเรียนและรหัสผ่านเพื่อเข้าใช้งาน
        </p>
      </div>

      {isAuthenticated && user && user.role !== "ADMIN" && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/80 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">เข้าสู่ระบบอยู่: {user.first_name} {user.last_name} ({user.role})</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            ต้องการเข้าใช้งานด้วยบัญชีผู้ดูแลระบบ (Admin) หรือไม่?
          </p>
          <button
            type="button"
            onClick={async () => {
              setLoggingOut(true)
              await logout()
            }}
            disabled={loggingOut}
            className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-800 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800 transition-all cursor-pointer text-center"
          >
            {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบเพื่อเข้าสู่ระบบใหม่"}
          </button>
        </div>
      )}

      {/* ERROR ALERT */}
      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            อีเมล (Email)
          </label>
          <input
            type="email"
            required
            placeholder="name@tunorth.ac.th"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none transition-all font-en"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            รหัสผ่าน (Password)
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            <>
              เข้าสู่ระบบ
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* DEMO / QUICK LOGIN BADGES */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center mb-3">
          ⚡ ทดสอบด่วนด้วยบัญชีจำลอง (Quick Test Accounts)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill("admin@tunorth.ac.th", "Password123!")}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
              Admin
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-en truncate">admin@tunorth...</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("teacher@tunorth.ac.th", "Password123!")}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              Teacher
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-en truncate">teacher@tunorth...</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("student1@tunorth.ac.th", "Password123!")}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-sky-500" />
              Student
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-en truncate">student1@tunorth...</div>
          </button>
        </div>
      </div>

      {/* SIGN UP LINK */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
        ยังไม่มีบัญชีนักเรียน?{" "}
        <Link
          href="/register"
          className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
        >
          สมัครสมาชิกที่นี่
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
                TUNorth-Hub
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-en">
                โรงเรียนเตรียมอุดมศึกษาภาคเหนือ
              </p>
            </div>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* MAIN LOGIN SECTION */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
        TUNorth-Hub © 2026 โรงเรียนเตรียมอุดมศึกษาภาคเหนือ · LMS EdTech Platform
      </footer>
    </div>
  )
}
