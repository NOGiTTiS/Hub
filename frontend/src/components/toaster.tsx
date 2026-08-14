"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as SonnerToaster } from "sonner"

export function AppToaster() {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        className: "font-sans text-sm",
      }}
    />
  )
}
