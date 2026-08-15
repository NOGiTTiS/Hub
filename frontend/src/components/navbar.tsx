"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiFetch, getMediaUrl } from "@/lib/api"
import { ThemeToggle } from "./theme-toggle"
import {
  GraduationCap,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  Settings,
  Layers,
} from "lucide-react"

export function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [branding, setBranding] = useState<{
    site_logo_url?: string
    platform_title?: string
    platform_subtitle?: string
  } | null>(null)

  React.useEffect(() => {
    let ignore = false
    async function loadBranding() {
      try {
        const res = await apiFetch("/api/settings/public")
        if (!ignore && res.success && res.data) {
          setBranding(res.data)
        }
      } catch {
        // Fallback to default
      }
    }
    loadBranding()
    return () => {
      ignore = true
    }
  }, [])

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return {
          label: "ผู้ดูแลระบบ",
          color: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border-brand-200 dark:border-brand-800",
          icon: ShieldCheck,
        }
      case "TEACHER":
        return {
          label: "ครูผู้สอน",
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          icon: BookOpen,
        }
      case "STUDENT":
        return {
          label: "นักเรียน",
          color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800",
          icon: UserCheck,
        }
      default:
        return {
          label: "ผู้ใช้",
          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          icon: Users,
        }
    }
  }

  const roleInfo = getRoleBadge(user?.role)
  const RoleIcon = roleInfo.icon

  // Strict Navigation links per role
  const navLinks = [
    ...(user?.role === "ADMIN"
      ? [
          { href: "/admin", label: "จัดการผู้ใช้งาน (User Management)", icon: Users },
          { href: "/admin/categories", label: "จัดการหมวดหมู่วิชา (Categories)", icon: Layers },
          { href: "/admin/settings", label: "ตั้งค่าระบบ (System Settings)", icon: Settings },
        ]
      : []),
    ...(user?.role === "TEACHER"
      ? [
          { href: "/teacher", label: "จัดการรายวิชา (Courses)", icon: BookOpen },
        ]
      : []),
    ...(user?.role === "STUDENT"
      ? [
          { href: "/student", label: "คอร์สเรียนของฉัน (My Courses)", icon: GraduationCap },
        ]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* LOGO */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            {branding?.site_logo_url ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(branding.site_logo_url)}
                  alt="School Logo"
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-brand-500 group-hover:bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/30 transition-all">
                <GraduationCap className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base leading-tight block">
                {branding?.platform_title || "TUNorth-Hub"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-en block">
                {branding?.platform_subtitle || "High School LMS"}
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/")
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.label}
                  </span>
                  {user.grade_level && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {user.grade_level} {user.classroom ? `/${user.classroom}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="ออกจากระบบ"
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* MOBILE MENU TRIGGER */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle showLabel={false} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          {user && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  {roleInfo.label}
                </span>
                {user.grade_level && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ชั้น {user.grade_level}/{user.classroom}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    active
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>

          {user && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          )}
        </div>
      )}
    </header>
  )
}
