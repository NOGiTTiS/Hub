import type { Metadata } from "next"
import { Prompt, Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { MaintenanceGuard } from "@/components/maintenance-guard"
import { DynamicBranding } from "@/components/dynamic-branding"
import { AppToaster } from "@/components/toaster"

const prompt = Prompt({
  variable: "--font-prompt",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "TUNorth-Hub | แพลตฟอร์มการเรียนรู้ออนไลน์",
  description: "ระบบการจัดการเรียนรู้ดิจิทัล (LMS EdTech) สำหรับโรงเรียนมัธยมศึกษา",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
        <ThemeProvider>
          <AuthProvider>
            <DynamicBranding />
            <MaintenanceGuard>
              <AnnouncementBanner />
              {children}
            </MaintenanceGuard>
            <AppToaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
