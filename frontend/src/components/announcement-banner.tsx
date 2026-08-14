"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Info, AlertTriangle, CheckCircle2, X } from "lucide-react"

interface PublicSettings {
  school_name_th?: string
  school_name_en?: string
  platform_title?: string
  platform_subtitle?: string
  academic_year?: string
  academic_semester?: string
  academic_term?: string
  allow_student_registration?: string
  allow_self_registration?: string
  announcement_enabled?: string
  announcement_message?: string
  announcement_text?: string
  announcement_type?: string
  maintenance_mode?: string
  maintenance_message?: string
}

export function AnnouncementBanner() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiFetch<PublicSettings>("/api/settings/public")
        if (res.success && res.data) {
          setSettings(res.data)
          const isEnabled = res.data.announcement_enabled === "true"
          const text = res.data.announcement_message || res.data.announcement_text || ""
          
          if (isEnabled && text.trim() !== "") {
            const savedDismiss = sessionStorage.getItem("dismissed_announcement")
            if (savedDismiss !== text) {
              setDismissed(false)
            }
          }
        }
      } catch (err) {
        console.error("Failed to load public settings:", err)
      }
    }

    loadSettings()
  }, [])

  const announcementText = settings?.announcement_message || settings?.announcement_text || ""

  if (dismissed || !settings || settings.announcement_enabled !== "true" || !announcementText) {
    return null
  }

  const handleDismiss = () => {
    if (announcementText) {
      sessionStorage.setItem("dismissed_announcement", announcementText)
    }
    setDismissed(true)
  }

  const type = settings.announcement_type || "info"

  const typeConfig = {
    info: {
      bg: "bg-sky-50 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200",
      icon: Info,
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  }

  const currentConfig = typeConfig[type as keyof typeof typeConfig] || typeConfig.info
  const IconComponent = currentConfig.icon

  return (
    <div
      role="alert"
      className={`w-full border-b px-4 py-2.5 transition-colors relative z-50 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs ${currentConfig.bg}`}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-2.5 flex-1 justify-center text-center px-2">
        <IconComponent className={`w-4 h-4 shrink-0 ${currentConfig.iconColor}`} />
        <span>{announcementText}</span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        title="ปิดแถบประกาศนี้"
        aria-label="ปิดแถบประกาศ"
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
