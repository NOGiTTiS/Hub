"use client"

import React from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  GraduationCap,
  Users,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Code2,
  FileCheck,
  Sparkles,
} from "lucide-react"

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()

  const getDashboardLink = () => {
    if (!user) return "/login"
    switch (user.role) {
      case "ADMIN":
        return "/admin"
      case "TEACHER":
        return "/teacher"
      case "STUDENT":
        return "/student"
      default:
        return "/login"
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
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
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <Link
                href={getDashboardLink()}
                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all flex items-center gap-1.5"
              >
                เข้าสู่ Dashboard ({user.first_name})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-semibold px-4 py-1.5 rounded-full border border-brand-200 dark:border-brand-800">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>ระบบจัดการเรียนรู้ดิจิทัล LMS EdTech v1.0</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            แพลตฟอร์มการเรียนรู้ออนไลน์ <br />
            <span className="bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800 bg-clip-text text-transparent">
              เพื่อนักเรียนและคุณครูมัธยมศึกษา
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            รองรับการเรียนรู้แบบ On-Demand, Interactive Code Playground (Python / WASM), การส่งงานตรวจการบ้านออนไลน์ และการนำเข้าผู้ใช้แบบกลุ่มความเร็วสูง
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-brand-900/25 transition-all flex items-center gap-2"
            >
              เข้าใช้งานระบบ (Login Portal)
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CORE FEATURES SHOWCASE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ระบบสิทธิ์และการยืนยันตัวตน (RBAC)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              จำแนกสิทธิ์การเข้าใช้งานอย่างปลอดภัยด้วย JWT และ Role-based Access Control สำหรับนักเรียน ครู และผู้ดูแลระบบ
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              นำเข้าข้อมูลแบบกลุ่ม (Batch Import)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              รองรับการนำเข้ารายชื่อนักเรียนคราวละ 1,000+ บัญชีผ่านไฟล์ CSV / Excel (.XLSX) จัดกลุ่มตามระดับชั้นและห้องเรียนทันที
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Interactive Code Playground
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ฝึกเขียนโค้ดภาษา Python และ Web บนเบราว์เซอร์ด้วย WebAssembly / Pyodide โดยตรง ไม่เปลืองทรัพยากรเซิร์ฟเวอร์
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
        TUNorth-Hub &copy; 2026 โรงเรียนเตรียมอุดมศึกษาภาคเหนือ · LMS EdTech Platform
      </footer>
    </div>
  )
}
