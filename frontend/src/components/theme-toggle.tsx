"use client"

import React from "react"
import { useTheme } from "./theme-provider"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ showLabel = true, className = "" }: { showLabel?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs active:scale-95 ${className}`}
      aria-label="สลับโหมดการแสดงผล (Dark / Light)"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          {showLabel && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-600" />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
    </button>
  )
}
