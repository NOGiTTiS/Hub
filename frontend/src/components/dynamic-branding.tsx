"use client"

import { useEffect } from "react"
import { apiFetch, getMediaUrl } from "@/lib/api"

interface PublicSettings {
  site_logo_url?: string
  site_favicon_url?: string
  theme_primary_color?: string
  platform_title?: string
}

function adjustColorBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "")
  if (cleanHex.length !== 6) return hex
  const num = parseInt(cleanHex, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function DynamicBranding() {
  useEffect(() => {
    let ignore = false

    async function loadBranding() {
      try {
        const res = await apiFetch<PublicSettings>("/api/settings/public")
        if (ignore || !res.success || !res.data) return

        const { site_favicon_url, theme_primary_color } = res.data

        // 1. Update Favicon
        if (site_favicon_url && site_favicon_url.trim() !== "") {
          const fullFaviconUrl = getMediaUrl(site_favicon_url)
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
          if (!link) {
            link = document.createElement("link")
            link.rel = "icon"
            document.head.appendChild(link)
          }
          link.href = fullFaviconUrl
        }

        // 2. Update Primary Theme Colors in CSS Variables
        if (theme_primary_color && /^#[0-9A-Fa-f]{6}$/.test(theme_primary_color)) {
          const root = document.documentElement
          const baseColor = theme_primary_color
          const hoverColor = adjustColorBrightness(baseColor, -25)
          const activeColor = adjustColorBrightness(baseColor, -45)

          root.style.setProperty("--color-brand-500", baseColor)
          root.style.setProperty("--color-brand-600", hoverColor)
          root.style.setProperty("--color-brand-700", activeColor)
        }
      } catch (err) {
        console.error("Failed to load branding configuration:", err)
      }
    }

    loadBranding()

    return () => {
      ignore = true
    }
  }, [])

  return null
}
