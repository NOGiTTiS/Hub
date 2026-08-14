"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  X,
  Printer,
  Award,
  ShieldCheck,
  GraduationCap,
} from "lucide-react"
import { apiFetch, getMediaUrl } from "@/lib/api"

export interface CertificateData {
  id: string
  certificate_code: string
  issued_at: string
  student?: {
    first_name: string
    last_name: string
    grade_level?: string
    classroom?: string
  }
  course?: {
    title: string
    teacher?: {
      first_name: string
      last_name: string
    }
  }
}

interface PublicCertSettings {
  school_name_th?: string
  school_name_en?: string
  platform_title?: string
  platform_subtitle?: string
  director_name?: string
  director_position?: string
  site_logo_url?: string
}

interface CertificateModalProps {
  cert: CertificateData
  onClose: () => void
}

export function CertificateModal({ cert, onClose }: CertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<PublicCertSettings | null>(null)

  useEffect(() => {
    let ignore = false
    const fetchPublicSettings = async () => {
      try {
        const res = await apiFetch<PublicCertSettings>("/api/settings/public")
        if (!ignore && res.success && res.data) {
          setSettings(res.data)
        }
      } catch {
        // Fallback to default
      }
    }
    fetchPublicSettings()
    return () => {
      ignore = true
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Format School Subtitle
  const schoolSubtitle = settings?.school_name_en
    ? `${settings.school_name_en.toUpperCase()}${settings.platform_title ? ` · ${settings.platform_title.toUpperCase()}` : ""}`
    : "TRIAM UDOM SUKSA SCHOOL OF THE NORTH · LMS EDTECH"

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* PRINT-SPECIFIC CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0mm;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #certificate-print-area,
          #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            margin: 0 !important;
            padding: 24px 36px !important;
            box-sizing: border-box !important;
            background: #fffdf9 !important;
            color: #0f172a !important;
            border: 6px double rgba(180, 83, 9, 0.6) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl space-y-6 my-auto max-h-[95vh] overflow-y-auto">
        {/* MODAL CONTROLS */}
        <div className="flex items-center justify-between no-print border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Certificate of Completion
              </span>
              <h3 className="text-base font-bold text-white">
                ใบประกาศนียบัตรสำเร็จหลักสูตร
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึกเป็น PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CERTIFICATE CANVAS */}
        <div
          id="certificate-print-area"
          ref={certRef}
          className="relative bg-gradient-to-br from-amber-50 via-white to-amber-50/60 text-slate-900 p-8 sm:p-14 rounded-3xl border-8 border-double border-amber-600/60 shadow-2xl flex flex-col justify-between items-center text-center min-h-[520px] overflow-hidden"
        >
          {/* DECORATIVE CORNER ACCENTS */}
          <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-amber-700/60 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-amber-700/60 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-amber-700/60 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-amber-700/60 rounded-br-xl pointer-events-none" />

          {/* SCHOOL LOGO & HEADER */}
          <div className="space-y-2">
            {settings?.site_logo_url ? (
              <div className="w-16 h-16 max-h-16 max-w-16 mx-auto mb-1 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(settings.site_logo_url)}
                  alt={settings.school_name_th || "School Logo"}
                  className="max-h-16 max-w-16 object-contain"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-700 text-white shadow-md mx-auto mb-1">
                <GraduationCap className="w-8 h-8" />
              </div>
            )}
            <h2 className="text-xs sm:text-sm font-black tracking-widest text-brand-900 uppercase">
              {settings?.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider">
              {schoolSubtitle}
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
          </div>

          {/* CERTIFICATE TITLE */}
          <div className="py-4 space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
              CERTIFICATE OF COMPLETION
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ใบประกาศนียบัตรรับรองการสำเร็จหลักสูตร
            </h1>
            <p className="text-xs text-slate-500">
              ขอมอบประกาศนียบัตรฉบับนี้เพื่อแสดงว่า
            </p>
          </div>

          {/* STUDENT NAME */}
          <div className="py-2 space-y-1 border-b-2 border-amber-600/40 pb-2 min-w-[320px] sm:min-w-[440px]">
            <h3 className="text-xl sm:text-2xl font-black text-brand-950 font-serif">
              {cert.student?.first_name} {cert.student?.last_name}
            </h3>
            {cert.student?.grade_level && (
              <p className="text-xs font-semibold text-slate-600">
                นักเรียนชั้นมัธยมศึกษาปีที่ {cert.student.grade_level.replace("M", "")} ห้อง {cert.student.classroom || "1"}
              </p>
            )}
          </div>

          {/* COURSE COMPLETION TEXT */}
          <div className="py-4 max-w-lg space-y-1.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              ได้ผ่านการศึกษาและสำเร็จการเรียนรู้ตามเกณฑ์มาตรฐาน 100% ในรายวิชา
            </p>
            <h4 className="text-base sm:text-lg font-bold text-brand-900">
              "{cert.course?.title}"
            </h4>
          </div>

          {/* FOOTER & SIGNATURES */}
          <div className="w-full grid grid-cols-2 gap-6 pt-6 border-t border-amber-600/20 text-xs">
            <div className="space-y-1 text-center">
              <div className="h-10 flex items-end justify-center">
                <span className="font-serif italic font-bold text-slate-800 text-sm">
                  ครู{cert.course?.teacher?.first_name} {cert.course?.teacher?.last_name}
                </span>
              </div>
              <div className="w-36 h-px bg-slate-400 mx-auto" />
              <p className="text-[10px] text-slate-500 font-semibold">ครูผู้สอนประจำรายวิชา</p>
            </div>

            <div className="space-y-1 text-center">
              <div className="h-10 flex items-end justify-center">
                <span className="font-serif italic font-bold text-brand-900 text-sm">
                  {settings?.director_name || "TUNorth Academic Board"}
                </span>
              </div>
              <div className="w-36 h-px bg-slate-400 mx-auto" />
              <p className="text-[10px] text-slate-500 font-semibold">
                {settings?.director_position || "ผู้อำนวยการโรงเรียน"}
              </p>
            </div>
          </div>

          {/* CERTIFICATE VERIFICATION METADATA */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 pt-6 mt-4 border-t border-slate-200 gap-2">
            <span className="font-mono">
              รหัสรับรอง: <strong className="text-slate-700">{cert.certificate_code}</strong>
            </span>
            <span>วันที่ออกใบรับรอง: {issuedDate}</span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> ตรวจสอบความถูกต้องสมบูรณ์ 100%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
