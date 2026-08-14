import React from "react"
import { RoleGuard } from "@/components/role-guard"
import { Navbar } from "@/components/navbar"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
        <Navbar />
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </div>
    </RoleGuard>
  )
}
