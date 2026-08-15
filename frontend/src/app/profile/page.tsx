"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiFetch, getMediaUrl } from "@/lib/api"
import { toast } from "@/lib/toast"
import {
  User as UserIcon,
  ShieldCheck,
  BookOpen,
  UserCheck,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  GraduationCap,
  Award,
  FileCheck2,
  Clock,
  Layers,
  Users,
  Building2,
  Mail,
  Phone,
  FileText,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react"

interface ProfileStats {
  // Student stats
  enrolled_courses?: number
  completed_courses?: number
  certificates_earned?: number
  assignments_submitted?: number
  // Teacher stats
  courses_created?: number
  published_courses?: number
  total_students?: number
  pending_grading?: number
  // Admin stats
  total_users?: number
  total_students_count?: number
  total_teachers?: number
  total_courses?: number
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"general" | "security" | "stats">("general")
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // General profile form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bio, setBio] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security / Password form state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Sync state when user is loaded
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "")
      setLastName(user.last_name || "")
      setAvatarUrl(user.avatar_url || null)
      setBio(user.bio || "")
      setPhoneNumber(user.phone_number || "")
    }
  }, [user])

  // Fetch full profile and stats
  useEffect(() => {
    let ignore = false
    async function loadProfileStats() {
      if (!user) return
      setStatsLoading(true)
      try {
        const res = await apiFetch<{
          user: typeof user
          stats: ProfileStats
        }>("/api/profile")
        if (!ignore && res.success && res.data) {
          setStats(res.data.stats)
        }
      } catch {
        // Silently fallback
      } finally {
        if (!ignore) setStatsLoading(false)
      }
    }

    if (!authLoading && user) {
      loadProfileStats()
    } else if (!authLoading && !user) {
      router.push("/login")
    }

    return () => {
      ignore = true
    }
  }, [user, authLoading, router])

  // Handle avatar upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      toast.error("กรุณาเลือกไฟล์รูปภาพที่รองรับ (JPG, PNG, WebP หรือ GIF)")
      return
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 10MB")
      return
    }

    setUploadingAvatar(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", "image")

    try {
      const res = await apiFetch<{ url?: string; file_url?: string }>("/api/upload", {
        method: "POST",
        body: formData,
      })

      const newAvatarUrl = res.data?.url || res.data?.file_url

      if (res.success && newAvatarUrl) {
        setAvatarUrl(newAvatarUrl)
        
        // Auto-save avatar to profile immediately
        const saveRes = await apiFetch("/api/profile", {
          method: "PUT",
          body: JSON.stringify({
            first_name: firstName.trim() || user?.first_name || "",
            last_name: lastName.trim() || user?.last_name || "",
            avatar_url: newAvatarUrl,
            bio: bio.trim() || null,
            phone_number: phoneNumber.trim() || null,
          }),
        })

        if (saveRes.success) {
          toast.success("อัปเดตรูปภาพโปรไฟล์สำเร็จเรียบร้อยแล้ว")
          await refreshUser()
        } else {
          toast.success("อัปโหลดรูปภาพสำเร็จ กรุณากดบันทึกการเปลี่ยนแปลง")
        }
      } else {
        toast.error(res.message || "ไม่สามารถอัปโหลดรูปภาพได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Handle saving general profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน")
      return
    }

    setSavingProfile(true)
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          phone_number: phoneNumber.trim() || null,
        }),
      })

      if (res.success) {
        toast.success("บันทึกข้อมูลโปรไฟล์สำเร็จ")
        await refreshUser()
      } else {
        toast.error(res.message || "ไม่สามารถบันทึกข้อมูลได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์")
    } finally {
      setSavingProfile(false)
    }
  }

  // Handle changing password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("กรุณากรอกข้อมูลรหัสผ่านให้ครบถ้วนทุกช่อง")
      return
    }

    if (newPassword.length < 6) {
      toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    setChangingPassword(true)
    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (res.success) {
        toast.success("เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(res.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน")
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return {
          label: "ผู้ดูแลระบบ (Administrator)",
          color: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border-brand-200 dark:border-brand-800",
          icon: ShieldCheck,
        }
      case "TEACHER":
        return {
          label: "ครูผู้สอน (Teacher)",
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          icon: BookOpen,
        }
      case "STUDENT":
        return {
          label: "นักเรียน (Student)",
          color: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800",
          icon: UserCheck,
        }
      default:
        return {
          label: "ผู้ใช้งานทั่วไป",
          color: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          icon: UserIcon,
        }
    }
  }

  const getBackDashboard = (role: string) => {
    switch (role) {
      case "ADMIN":
        return { path: "/admin", label: "กลับสู่แดชบอร์ดผู้ดูแลระบบ" }
      case "TEACHER":
        return { path: "/teacher", label: "กลับสู่แดชบอร์ดครูผู้สอน" }
      case "STUDENT":
        return { path: "/student", label: "กลับสู่คอร์สเรียนของฉัน" }
      default:
        return { path: "/", label: "กลับสู่หน้าแรก" }
    }
  }

  const roleInfo = getRoleBadge(user.role)
  const RoleIcon = roleInfo.icon
  const backNav = getBackDashboard(user.role)
  const initials = `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`.toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* BACK TO DASHBOARD NAVIGATION */}
        <div className="flex items-center justify-between">
          <Link
            href={backNav.path}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-800 shadow-2xs transition-all group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-brand-500 group-hover:-translate-x-1 transition-transform" />
            <span>{backNav.label}</span>
          </Link>

          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2 font-medium">
            <span>หน้าหลัก</span>
            <span>/</span>
            <span className="font-bold text-slate-900 dark:text-white">จัดการโปรไฟล์ผู้ใช้งาน</span>
          </div>
        </div>

        {/* PROFILE HEADER HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          {/* Top Decorative Banner */}
          <div className="h-32 sm:h-36 bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-500 opacity-90" />

          <div className="px-6 sm:px-8 pb-8 pt-0 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 -mt-16 sm:-mt-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* AVATAR WRAPPER */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getMediaUrl(avatarUrl)}
                      alt={`${user.first_name} ${user.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl font-en shadow-inner">
                      {initials || <UserIcon className="w-12 h-12" />}
                    </div>
                  )}

                  {/* Upload overlay spinner */}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-1">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-300" />
                      <span>กำลังอัปโหลด...</span>
                    </div>
                  )}
                </div>

                {/* Camera upload trigger button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="เปลี่ยนรูปโปรไฟล์"
                  aria-label="เปลี่ยนรูปโปรไฟล์"
                  className="absolute bottom-1 right-1 p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white shadow-lg border-2 border-white dark:border-slate-900 transition-all hover:scale-110 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              {/* USER META */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {user.first_name} {user.last_name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${roleInfo.color}`}
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  {user.grade_level && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      ชั้นมัธยมศึกษาปีที่ {user.grade_level.replace(/[^0-9]/g, "") || user.grade_level}{" "}
                      {user.classroom ? `/${user.classroom}` : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ
                  </span>
                </div>
              </div>
            </div>

            {/* QUICK BADGE / INFO */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>TUNorth-Hub Profile</span>
            </div>
          </div>

          {/* TAB NAVIGATION HEADER */}
          <div className="px-6 sm:px-8 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2 py-4 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "general"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              ข้อมูลส่วนตัว
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 py-4 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "security"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Lock className="w-4 h-4" />
              ความปลอดภัย & รหัสผ่าน
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 py-4 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "stats"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Award className="w-4 h-4" />
              สถิติ & กิจกรรมของฉัน
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        {activeTab === "general" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-brand-500" />
                  แก้ไขข้อมูลส่วนตัว
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ปรับปรุงชื่อ-นามสกุล คำแนะนำตัว และข้อมูลติดต่อของคุณ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* FIRST NAME */}
                <div className="space-y-1.5">
                  <label htmlFor="first_name_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ชื่อจริง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="first_name_input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                    placeholder="ระบุชื่อจริง"
                  />
                </div>

                {/* LAST NAME */}
                <div className="space-y-1.5">
                  <label htmlFor="last_name_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="last_name_input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                    placeholder="ระบุนามสกุล"
                  />
                </div>

                {/* EMAIL (READ ONLY) */}
                <div className="space-y-1.5">
                  <label htmlFor="email_readonly_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    อีเมล (ใช้สำหรับเข้าสู่ระบบ)
                  </label>
                  <div className="relative">
                    <input
                      id="email_readonly_input"
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      ล็อกสิทธิ์
                    </span>
                  </div>
                </div>

                {/* PHONE NUMBER */}
                <div className="space-y-1.5">
                  <label htmlFor="phone_number_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    id="phone_number_input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all font-en"
                    placeholder="เช่น 081-234-5678"
                  />
                </div>
              </div>

              {/* STUDENT GRADE / CLASSROOM INFO (READ ONLY FOR STUDENT) */}
              {user.role === "STUDENT" && (
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        ระดับชั้นและห้องเรียนปัจจุบัน
                      </div>
                      <div className="text-xs text-sky-700 dark:text-sky-300 font-semibold mt-0.5">
                        {user.grade_level ? `ชั้นมัธยมศึกษาปีที่ ${user.grade_level.replace(/[^0-9]/g, "") || user.grade_level}` : "ยังไม่ได้ระบุระดับชั้น"}{" "}
                        {user.classroom ? `ห้อง ${user.classroom}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                    *ข้อมูลอิงตามฝ่ายทะเบียน หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลระบบ
                  </span>
                </div>
              )}

              {/* BIO / ABOUT ME */}
              <div className="space-y-1.5">
                <label htmlFor="bio_textarea" className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  คำแนะนำตัวสั้นๆ (Bio)
                </label>
                <textarea
                  id="bio_textarea"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                  placeholder="เขียนแนะนำตนเอง ความสนใจ หรือเป้าหมายการเรียนรู้สั้นๆ..."
                />
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      บันทึกการเปลี่ยนแปลง
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-brand-500" />
                  เปลี่ยนรหัสผ่าน (Change Password)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  เพื่อความปลอดภัยของบัญชี กรุณาใช้รหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร
                </p>
              </div>

              {/* CURRENT PASSWORD */}
              <div className="space-y-1.5">
                <label htmlFor="current_password_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="current_password_input"
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all font-en"
                    placeholder="กรอกรหัสผ่านปัจจุบันของคุณ"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* NEW PASSWORD */}
                <div className="space-y-1.5">
                  <label htmlFor="new_password_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    รหัสผ่านใหม่ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="new_password_input"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all font-en"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM NEW PASSWORD */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm_password_input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirm_password_input"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all font-en"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECURITY GUIDELINES */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ข้อกำหนดความปลอดภัยของรหัสผ่าน
                </div>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-5 list-disc">
                  <li>ความยาวขั้นต่ำ 6 ตัวอักษรขึ้นไป</li>
                  <li>ควรประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข หรืออักขระพิเศษผสมกัน</li>
                  <li>ห้ามแชร์รหัสผ่านให้ผู้อื่นเด็ดขาดเพื่อป้องกันข้อมูลการเรียนการสอนสูญหาย</li>
                </ul>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังเปลี่ยนรหัสผ่าน...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      อัปเดตรหัสผ่านใหม่
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVITY STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand-500" />
                    สรุปภาพรวมและกิจกรรมส่วนบุคคล
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    สถิติการเรียน การสอน หรือการใช้งานระบบแบบเรียลไทม์
                  </p>
                </div>
                {statsLoading && <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />}
              </div>

              {/* STUDENT STATS CARDS */}
              {user.role === "STUDENT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.enrolled_courses || 0}
                    </div>
                    <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      คอร์สที่ลงทะเบียนเรียน
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.completed_courses || 0}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      คอร์สที่เรียนจบ 100%
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.certificates_earned || 0}
                    </div>
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      ใบประกาศนียบัตรที่ได้รับ
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.assignments_submitted || 0}
                    </div>
                    <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      การบ้านที่ส่งเรียบร้อย
                    </div>
                  </div>
                </div>
              )}

              {/* TEACHER STATS CARDS */}
              {user.role === "TEACHER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.courses_created || 0}
                    </div>
                    <div className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                      รายวิชาที่สร้างขึ้น
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.published_courses || 0}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      รายวิชาที่เปิดเผยแพร่
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.total_students || 0}
                    </div>
                    <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      นักเรียนในความรับผิดชอบ
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.pending_grading || 0}
                    </div>
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                      การบ้านที่รอดำเนินการตรวจ
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN STATS CARDS */}
              {user.role === "ADMIN" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.total_users || 0}
                    </div>
                    <div className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                      ผู้ใช้งานทั้งหมดในระบบ
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.total_students_count || 0}
                    </div>
                    <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      บัญชีนักเรียน (Students)
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.total_teachers || 0}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      บัญชีครูผู้สอน (Teachers)
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-en">
                      {stats?.total_courses || 0}
                    </div>
                    <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      รายวิชาทั้งหมดในแพลตฟอร์ม
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
