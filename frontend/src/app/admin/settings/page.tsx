"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  School,
  Sliders,
  Megaphone,
  Activity,
  Palette,
  Upload,
  Trash2,
  GraduationCap,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Database,
  HardDrive,
  Cpu,
  Clock,
  Lock,
  Mail,
  Phone,
  Calendar,
  Award,
  FileText,
  Video,
  Image as ImageIcon,
  BookOpen,
  Users,
  Check,
} from "lucide-react"

interface StorageItemStats {
  size_bytes: number
  size_mb: string
  file_count: number
}

interface SystemHealthData {
  database: {
    status: string
    latency_ms: number
    size_pretty: string
    size_bytes: number
    open_conns: number
    in_use_conns: number
    idle_conns: number
    record_counts: {
      users: number
      courses: number
      modules: number
      lessons: number
      assignments: number
      submissions: number
      quizzes: number
      quiz_attempts: number
      enrollments: number
      certificates: number
    }
  }
  redis: {
    status: string
    latency_ms: number
  }
  storage: {
    base_dir: string
    total: StorageItemStats
    videos: StorageItemStats
    slides: StorageItemStats
    covers: StorageItemStats
    assignments: StorageItemStats
  }
  runtime: {
    go_version: string
    num_cpu: number
    goroutines: number
    alloc_mb: string
    total_alloc_mb: string
    sys_mb: string
    uptime: string
  }
}

type TabKey = "school" | "branding" | "policy" | "announcement" | "health"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("school")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Branding upload states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)

  // Form State for Settings
  const [settings, setSettings] = useState<Record<string, string>>({
    school_name_th: "",
    school_name_en: "",
    platform_title: "",
    platform_subtitle: "",
    director_name: "",
    director_position: "",
    academic_year: "",
    academic_semester: "",
    contact_email: "",
    contact_phone: "",
    site_logo_url: "",
    site_favicon_url: "",
    theme_primary_color: "#2563eb",
    allow_student_registration: "false",
    default_student_password: "Password123!",
    max_upload_size_mb: "100",
    announcement_enabled: "false",
    announcement_message: "",
    announcement_type: "info",
    maintenance_mode: "false",
    maintenance_message: "",
  })

  // File Upload Handler for Logo / Favicon
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetKey: string,
    setUploading: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "image")

      const res = await apiFetch<{ url: string }>("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.success && res.data?.url) {
        handleInputChange(targetKey, res.data.url)
        toast.success("อัปโหลดรูปภาพสำเร็จ (อย่าลืมกดปุ่มบันทึกการตั้งค่า)")
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์")
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่ออัปโหลดได้")
    } finally {
      setUploading(false)
    }
  }

  // System Health State
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Fetch Settings
  const fetchSettings = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await apiFetch<{ settings: Record<string, string> }>("/api/admin/settings")
      if (res.success && res.data?.settings) {
        const newSettings = res.data.settings
        setSettings((prev) => ({
          ...prev,
          ...newSettings,
        }))
        if (showLoading) {
          toast.success("โหลดข้อมูลการตั้งค่าล่าสุดแล้ว")
        }
      } else {
        toast.error(res.message || "ไม่สามารถโหลดการตั้งค่าได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch System Health
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await apiFetch<SystemHealthData>("/api/admin/settings/system-health")
      if (res.success && res.data) {
        setHealthData(res.data)
      }
    } catch (err) {
      console.error("Health fetch error:", err)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const res = await apiFetch<{ settings: Record<string, string> }>("/api/admin/settings")
        if (!ignore && res.success && res.data?.settings) {
          const newSettings = res.data.settings
          setSettings((prev) => ({
            ...prev,
            ...newSettings,
          }))
        }
      } catch {
        if (!ignore) toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (activeTab === "health") {
      let ignore = false
      async function loadHealth() {
        try {
          const res = await apiFetch<SystemHealthData>("/api/admin/settings/system-health")
          if (!ignore && res.success && res.data) {
            setHealthData(res.data)
          }
        } catch (err) {
          console.error("Health fetch error:", err)
        } finally {
          if (!ignore) setHealthLoading(false)
        }
      }
      loadHealth()
      return () => {
        ignore = true
      }
    }
  }, [activeTab])

  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)

    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      })

      if (res.success) {
        toast.success("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว")
      } else {
        toast.error(res.message || "ไม่สามารถบันทึกการตั้งค่าได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์")
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    {
      id: "school" as TabKey,
      label: "ข้อมูลโรงเรียน & เกียรติบัตร",
      icon: School,
      desc: "ชื่อสถาบัน ผู้อำนวยการ และปีการศึกษา",
    },
    {
      id: "branding" as TabKey,
      label: "อัตลักษณ์ & ธีมสี",
      icon: Palette,
      desc: "โลโก้ Favicon และธีมสีระบบ",
    },
    {
      id: "policy" as TabKey,
      label: "การควบคุมระบบ & นโยบาย",
      icon: Sliders,
      desc: "การสมัครสมาชิกและขนาดไฟล์อัปโหลด",
    },
    {
      id: "announcement" as TabKey,
      label: "ประกาศ & โหมดปรับปรุง",
      icon: Megaphone,
      desc: "แถบประกาศข่าวสารและ Maintenance",
    },
    {
      id: "health" as TabKey,
      label: "สถานะระบบ & พื้นที่จัดเก็บ",
      icon: Activity,
      desc: "PostgreSQL, Redis, Storage & Runtime",
    },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800/80 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            ตั้งค่าระบบ (System Settings)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            กำหนดค่าคอนฟิก ข้อมูลโรงเรียน นโยบายผู้ใช้ แถบประกาศ และมอนิเตอร์สุขภาพของระบบ
          </p>
        </div>

        {activeTab !== "health" && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fetchSettings(true)}
              disabled={loading || saving}
              title="โหลดการตั้งค่าใหม่"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-brand-500" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่า
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                isActive
                  ? "bg-brand-50/80 dark:bg-brand-950/50 border-brand-300 dark:border-brand-800 ring-2 ring-brand-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div
                className={`p-2 rounded-xl mb-2 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold block ${
                  isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-white"
                }`}
              >
                {t.label}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                {t.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mb-3" />
            <p className="text-xs sm:text-sm font-medium">กำลังโหลดข้อมูลการตั้งค่า...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            {/* ----------------- TAB 1: SCHOOL PROFILE & CERTIFICATE ----------------- */}
            {activeTab === "school" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <School className="w-5 h-5 text-brand-500" />
                    ข้อมูลโรงเรียนและแพลตฟอร์ม
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ข้อมูลส่วนนี้จะถูกนำไปใช้แสดงผลบน Header, Footer และข้อความต้อนรับของระบบ
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ชื่อโรงเรียน (ภาษาไทย) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.school_name_th || ""}
                      onChange={(e) => handleInputChange("school_name_th", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="โรงเรียนเตรียมอุดมศึกษา..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ชื่อโรงเรียน (ภาษาอังกฤษ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.school_name_en || ""}
                      onChange={(e) => handleInputChange("school_name_en", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="Triam Udom Suksa..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ชื่อระบบแพลตฟอร์ม
                    </label>
                    <input
                      type="text"
                      value={settings.platform_title || ""}
                      onChange={(e) => handleInputChange("platform_title", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="TUNorth-Hub LMS"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      สโลแกน / คำอธิบายระบบย่อ
                    </label>
                    <input
                      type="text"
                      value={settings.platform_subtitle || ""}
                      onChange={(e) => handleInputChange("platform_subtitle", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="ระบบการจัดการเรียนรู้ดิจิทัลสำหรับนักเรียน..."
                    />
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand-500" />
                    ข้อมูลผู้บริหารสำหรับเกียรติบัตร (Certificate Signature)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ชื่อและตำแหน่งจะถูกนำไปพิมพ์ประทับลงในใบเกียรติบัตรอัตโนมัติเมื่อนักเรียนเรียนจบหลักสูตร
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ชื่อ-นามสกุล ผู้อำนวยการโรงเรียน (พร้อมคำนำหน้า)
                    </label>
                    <input
                      type="text"
                      value={settings.director_name || ""}
                      onChange={(e) => handleInputChange("director_name", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="ดร.ผู้อำนวยการ โรงเรียน"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ตำแหน่งผู้อำนวยการสำหรับลงนาม
                    </label>
                    <input
                      type="text"
                      value={settings.director_position || ""}
                      onChange={(e) => handleInputChange("director_position", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="ผู้อำนวยการโรงเรียน..."
                    />
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-500" />
                    ปีการศึกษาและข้อมูลการติดต่อ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    กำหนดปีการศึกษาปัจจุบันและช่องทางติดต่อสำหรับผู้ดูแลระบบ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ปีการศึกษาปัจจุบัน (พ.ศ.)
                    </label>
                    <input
                      type="text"
                      value={settings.academic_year || ""}
                      onChange={(e) => handleInputChange("academic_year", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="2569"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ภาคเรียนปัจจุบัน
                    </label>
                    <select
                      value={settings.academic_semester || "1"}
                      onChange={(e) => handleInputChange("academic_semester", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="1">ภาคเรียนที่ 1</option>
                      <option value="2">ภาคเรียนที่ 2</option>
                      <option value="summer">ภาคฤดูร้อน (Summer)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      อีเมลผู้ดูแลระบบ
                    </label>
                    <input
                      type="email"
                      value={settings.contact_email || ""}
                      onChange={(e) => handleInputChange("contact_email", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="admin@tunorth.ac.th"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="text"
                      value={settings.contact_phone || ""}
                      onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="02-123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB 2: BRANDING & THEME SETTINGS ----------------- */}
            {activeTab === "branding" && (
              <div className="space-y-8">
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => handleFileUpload(e, "site_logo_url", setUploadingLogo)}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={faviconInputRef}
                  accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
                  onChange={(e) => handleFileUpload(e, "site_favicon_url", setUploadingFavicon)}
                  className="hidden"
                />

                {/* 1. LOGO SETTINGS */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-brand-500" />
                      โลโก้ประจำโรงเรียนและระบบ (Site Logo)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      โลโก้นี้จะปรากฏบน Header, Navbar และใบเกียรติบัตร (รองรับไฟล์ PNG, JPG, SVG, WebP)
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Preview box */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        ตัวอย่างโลโก้ปัจจุบัน
                      </span>
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-2 shadow-xs">
                        {settings.site_logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(settings.site_logo_url)}
                            alt="Logo Preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <GraduationCap className="w-10 h-10 text-brand-500" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {settings.site_logo_url ? "โลโก้ที่กำหนดเอง" : "ใช้ไอคอนระบบเริ่มต้น"}
                      </span>
                    </div>

                    {/* Upload / URL controls */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Upload className={`w-4 h-4 ${uploadingLogo ? "animate-spin" : ""}`} />
                          <span>{uploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์โลโก้"}</span>
                        </button>

                        {settings.site_logo_url && (
                          <button
                            type="button"
                            onClick={() => handleInputChange("site_logo_url", "")}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          หรือระบุ URL รูปภาพโลโก้โดยตรง
                        </label>
                        <input
                          type="text"
                          value={settings.site_logo_url || ""}
                          onChange={(e) => handleInputChange("site_logo_url", e.target.value)}
                          placeholder="https://example.com/logo.png หรือ /uploads/images/..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 2. FAVICON SETTINGS */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-sky-500" />
                      ไอคอนแท็บเบราว์เซอร์ (Site Favicon)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ไอคอนขนาดเล็กที่จะแสดงบน Tab Bar ของเว็บเบราว์เซอร์ (รองรับ .ico, .png, .svg)
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Preview box */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        ตัวอย่าง Favicon
                      </span>
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-2 shadow-xs">
                        {settings.site_favicon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(settings.site_favicon_url)}
                            alt="Favicon Preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <GraduationCap className="w-6 h-6 text-brand-500" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {settings.site_favicon_url ? "Favicon ที่กำหนดเอง" : "ใช้ค่าเริ่มต้น"}
                      </span>
                    </div>

                    {/* Upload / URL controls */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={uploadingFavicon}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Upload className={`w-4 h-4 ${uploadingFavicon ? "animate-spin" : ""}`} />
                          <span>{uploadingFavicon ? "กำลังอัปโหลด..." : "อัปโหลด Favicon (.ico / .png)"}</span>
                        </button>

                        {settings.site_favicon_url && (
                          <button
                            type="button"
                            onClick={() => handleInputChange("site_favicon_url", "")}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>รีเซ็ต</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          หรือระบุ URL Favicon
                        </label>
                        <input
                          type="text"
                          value={settings.site_favicon_url || ""}
                          onChange={(e) => handleInputChange("site_favicon_url", e.target.value)}
                          placeholder="https://example.com/favicon.ico"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 3. THEME COLOR PALETTE */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-emerald-500" />
                      ธีมสีหลักของระบบ (Primary Theme Color)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      เลือกชุดสีหลักที่จะถูกนำไปปรับใช้กับปุ่ม, ลิงก์, แถบสถานะ และเน้นย้ำ UI ทั้งหมดในแพลตฟอร์ม
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-6">
                    {/* Color Presets */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ชุดสียอดนิยม (Color Presets)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { name: "Navy Blue (กรมท่า)", hex: "#2563eb" },
                          { name: "Ocean Sky (ฟ้าคราม)", hex: "#0284c7" },
                          { name: "Emerald (เขียวมรกต)", hex: "#059669" },
                          { name: "Violet (ม่วงสดใส)", hex: "#7c3aed" },
                          { name: "Crimson (แดงทับทิม)", hex: "#dc2626" },
                          { name: "Amber (ส้มอำพัน)", hex: "#d97706" },
                          { name: "Charcoal (เทาเข้ม)", hex: "#334155" },
                          { name: "Rose (ชมพูกุหลาบ)", hex: "#e11d48" },
                        ].map((preset) => {
                          const isSelected =
                            (settings.theme_primary_color || "#2563eb").toLowerCase() ===
                            preset.hex.toLowerCase()
                          return (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => handleInputChange("theme_primary_color", preset.hex)}
                              className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-white dark:bg-slate-900 border-slate-900 dark:border-white ring-2 ring-slate-900/20 shadow-xs"
                                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:bg-white"
                              }`}
                            >
                              <span
                                className="w-6 h-6 rounded-lg shrink-0 shadow-xs border border-black/10"
                                style={{ backgroundColor: preset.hex }}
                              ></span>
                              <div className="text-left overflow-hidden">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                  {preset.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  {preset.hex}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Custom Color Input */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          หรือเลือกสีแบบกำหนดเอง (Custom Hex):
                        </label>
                        <input
                          type="color"
                          value={settings.theme_primary_color || "#2563eb"}
                          onChange={(e) => handleInputChange("theme_primary_color", e.target.value)}
                          className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <input
                        type="text"
                        value={settings.theme_primary_color || "#2563eb"}
                        onChange={(e) => handleInputChange("theme_primary_color", e.target.value)}
                        placeholder="#2563eb"
                        maxLength={7}
                        className="w-32 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    {/* Interactive Live Color Preview Box */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ตัวอย่างการแสดงผลธีมสี (Interactive Color Preview)
                      </span>
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          style={{ backgroundColor: settings.theme_primary_color || "#2563eb" }}
                          className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-transform"
                        >
                          ปุ่มสีหลัก (Primary Button)
                        </button>
                        <span
                          style={{
                            color: settings.theme_primary_color || "#2563eb",
                            borderColor: settings.theme_primary_color || "#2563eb",
                          }}
                          className="px-3 py-1 rounded-full text-xs font-bold border"
                        >
                          Badge สถานะ
                        </span>
                        <div className="flex-1 min-w-30 max-w-xs space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>Progress Bar</span>
                            <span>75%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: "75%",
                                backgroundColor: settings.theme_primary_color || "#2563eb",
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB 3: SYSTEM & POLICY CONTROLS ----------------- */}
            {activeTab === "policy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-brand-500" />
                    นโยบายการลงทะเบียนและการเข้าใช้งาน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ควบคุมสิทธิ์การสมัครสมาชิกของนักเรียนและการจัดการรหัสผ่านเริ่มต้น
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Self registration switch */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500" />
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          เปิดรับการสมัครสมาชิกด้วยตนเองของนักเรียน (Self-Registration)
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                        หากปิดใช้งาน นักเรียนจะไม่สามารถลงทะเบียนเองได้ และต้องนำเข้าข้อมูลผ่านไฟล์ Batch CSV / Excel หรือให้ Admin เพิ่มบัญชีเท่านั้น
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.allow_student_registration === "true"}
                        onChange={(e) =>
                          handleInputChange("allow_student_registration", e.target.checked ? "true" : "false")
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  {/* Default Password */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-brand-500" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        รหัสผ่านเริ่มต้นสำหรับบัญชีนักเรียนใหม่ (Default Password)
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      ใช้กำหนดให้กับบัญชีนักเรียนที่สร้างใหม่ผ่านระบบ Batch Import หรือเมื่อกดรีเซ็ตรหัสผ่าน
                    </p>
                    <div className="max-w-md">
                      <input
                        type="text"
                        value={settings.default_student_password || ""}
                        onChange={(e) => handleInputChange("default_student_password", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="Password123!"
                      />
                    </div>
                  </div>

                  {/* Max Upload Size */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-brand-500" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        ขนาดไฟล์อัปโหลดสูงสุดต่อไฟล์ (Max Upload Size in MB)
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      ขีดจำกัดขนาดไฟล์สำหรับวิดีโอบทเรียน เอกสารสไลด์ และไฟล์การบ้านของนักเรียน
                    </p>
                    <div className="flex items-center gap-3 max-w-xs">
                      <input
                        type="number"
                        min="1"
                        max="1024"
                        value={settings.max_upload_size_mb || "100"}
                        onChange={(e) => handleInputChange("max_upload_size_mb", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB 3: ANNOUNCEMENT & MAINTENANCE ----------------- */}
            {activeTab === "announcement" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-brand-500" />
                    แถบประกาศข่าวสารทั่วระบบ (Site-wide Announcement Banner)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    แสดงแถบข้อความประกาศด้านบนสุดของหน้าเว็บสำหรับแจ้งข่าวสำคัญแก่นักเรียนและครูทุกคน
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      เปิดใช้งานแถบประกาศ (Enable Banner)
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.announcement_enabled === "true"}
                        onChange={(e) =>
                          handleInputChange("announcement_enabled", e.target.checked ? "true" : "false")
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ข้อความประกาศ
                    </label>
                    <input
                      type="text"
                      value={settings.announcement_message || ""}
                      onChange={(e) => handleInputChange("announcement_message", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="เช่น แจ้งกำหนดการสอบปลายภาคเรียนที่ 1/2569..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      รูปแบบการแจ้งเตือน (Alert Type)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "info", label: "ข้อมูลทั่วไป (Info)", color: "text-sky-600", icon: Info },
                        { id: "warning", label: "แจ้งเตือนสำคัญ (Warning)", color: "text-amber-600", icon: AlertTriangle },
                        { id: "success", label: "ข่าวดี/สำเร็จ (Success)", color: "text-emerald-600", icon: CheckCircle2 },
                      ].map((t) => {
                        const Icon = t.icon
                        const isSelected = (settings.announcement_type || "info") === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleInputChange("announcement_type", t.id)}
                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-white dark:bg-slate-900 border-brand-500 ring-2 ring-brand-500/20 text-slate-900 dark:text-white"
                                : "bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${t.color}`} />
                            <span>{t.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* LIVE PREVIEW */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ตัวอย่างแถบประกาศเสมือนจริง (Live Preview)
                    </span>
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium ${
                        settings.announcement_type === "warning"
                          ? "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                          : settings.announcement_type === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                          : "bg-sky-50 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200"
                      }`}
                    >
                      {settings.announcement_type === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : settings.announcement_type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                      <span>
                        {settings.announcement_message || "ข้อความตัวอย่างประกาศของคุณจะปรากฏที่นี่"}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-rose-500" />
                    โหมดปิดปรับปรุงระบบ (Maintenance Mode)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะเห็นข้อความแจ้งเตือนปิดปรับปรุงระบบชั่วคราว
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                        เปิดใช้งาน Maintenance Mode
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Admin ยังคงสามารถเข้าใช้งานระบบได้ตามปกติ
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.maintenance_mode === "true"}
                        onChange={(e) =>
                          handleInputChange("maintenance_mode", e.target.checked ? "true" : "false")
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ข้อความแจ้งเตือนผู้ใช้งานเมื่อปิดปรับปรุง
                    </label>
                    <textarea
                      rows={3}
                      value={settings.maintenance_message || ""}
                      onChange={(e) => handleInputChange("maintenance_message", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                      placeholder="ระบบอยู่ระหว่างการปิดปรับปรุงชั่วคราว..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB 4: SYSTEM HEALTH & DIAGNOSTICS ----------------- */}
            {activeTab === "health" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-brand-500" />
                      สถานะระบบและการใช้ทรัพยากร (System Health)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      รายงานสุขภาพเซิร์ฟเวอร์แบบ Real-time ข้อมูลฐานข้อมูล แคช และพื้นที่จัดเก็บไฟล์
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
                    <span>รีเฟรชข้อมูล</span>
                  </button>
                </div>

                {healthLoading && !healthData ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mb-3" />
                    <p className="text-xs sm:text-sm font-medium">กำลังตรวจสอบสถานะระบบ...</p>
                  </div>
                ) : healthData ? (
                  <div className="space-y-6">
                    {/* TOP SUMMARY CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Database */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">PostgreSQL</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              healthData.database.status === "ONLINE"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {healthData.database.status}
                          </span>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {healthData.database.latency_ms} <span className="text-xs font-normal text-slate-500">ms latency</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>ขนาด DB:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{healthData.database.size_pretty}</span>
                        </div>
                      </div>

                      {/* Redis */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Redis Cache</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              healthData.redis.status === "ONLINE"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : healthData.redis.status === "NOT_CONFIGURED"
                                ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {healthData.redis.status}
                          </span>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {healthData.redis.latency_ms} <span className="text-xs font-normal text-slate-500">ms latency</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>Session State:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {healthData.redis.status === "ONLINE" ? "Active" : "Memory Only"}
                          </span>
                        </div>
                      </div>

                      {/* Storage */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Storage Used</span>
                          <HardDrive className="w-4 h-4 text-brand-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                          {healthData.storage.total.size_mb}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>จำนวนไฟล์รวม:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{healthData.storage.total.file_count.toLocaleString()} ไฟล์</span>
                        </div>
                      </div>

                      {/* Runtime Uptime */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Server Uptime</span>
                          <Clock className="w-4 h-4 text-brand-500" />
                        </div>
                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {healthData.runtime.uptime}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>Go Version:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{healthData.runtime.go_version}</span>
                        </div>
                      </div>
                    </div>

                    {/* STORAGE BREAKDOWN */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-brand-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            สัดส่วนพื้นที่จัดเก็บไฟล์ (Storage Breakdown)
                          </h4>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {healthData.storage.base_dir}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Video className="w-3.5 h-3.5 text-brand-500" />
                            <span>วิดีโอบทเรียน</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {healthData.storage.videos.size_mb}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {healthData.storage.videos.file_count} ไฟล์
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <FileText className="w-3.5 h-3.5 text-sky-500" />
                            <span>เอกสารสไลด์</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {healthData.storage.slides.size_mb}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {healthData.storage.slides.file_count} ไฟล์
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                            <span>รูปภาพหน้าปก</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {healthData.storage.covers.size_mb}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {healthData.storage.covers.file_count} ไฟล์
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                            <span>การบ้านนักเรียน</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {healthData.storage.assignments.size_mb}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {healthData.storage.assignments.file_count} ไฟล์
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DATABASE RECORD COUNTS & RUNTIME SPECS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Database records */}
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-brand-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            สถิติจำนวนข้อมูลในระบบ (Database Records)
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">ผู้ใช้งาน (Users)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.users.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">รายวิชา (Courses)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.courses.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">บทเรียน (Lessons)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.lessons.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">การลงทะเบียนเรียน</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.enrollments.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">การบ้าน (Assignments)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.assignments.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">งานที่ส่ง (Submissions)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.submissions.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">แบบทดสอบ (Quizzes)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.quizzes.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">เกียรติบัตรที่ออก</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.database.record_counts.certificates.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Runtime specs */}
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-brand-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Go Backend Runtime & Memory
                          </h4>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">CPU Cores</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.runtime.num_cpu} Cores</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">Active Goroutines</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.runtime.goroutines}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">Memory Allocated (Heap)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.runtime.alloc_mb}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500">System Memory (Sys)</span>
                            <span className="font-bold text-slate-900 dark:text-white">{healthData.runtime.sys_mb}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
                    ไม่สามารถโหลดข้อมูลสถานะระบบได้ กรุณาลองใหม่อีกครั้ง
                  </div>
                )}
              </div>
            )}

            {/* BOTTOM SAVE BUTTON */}
            {activeTab !== "health" && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      บันทึกการตั้งค่า
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
