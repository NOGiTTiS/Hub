"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "@/lib/toast"
import { apiFetch, API_BASE_URL } from "@/lib/api"
import { User, UserRole } from "@/lib/auth-context"
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  UserCheck,
} from "lucide-react"

interface UserStats {
  total_users: number
  total_students: number
  total_teachers: number
  total_admins: number
  grade_counts: { grade_level: string; count: number }[]
}

interface ImportRowError {
  row: number
  email: string
  error: string
}

interface ImportResult {
  total: number
  imported: number
  failed: number
  errors: ImportRowError[]
}

export default function AdminUsersPage() {
  // Stats
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // User List & Pagination
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")
  const [classFilter, setClassFilter] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "STUDENT" as UserRole,
    grade_level: "",
    classroom: "",
  })
  const [formError, setFormError] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    const res = await apiFetch<UserStats>("/api/admin/stats/users")
    if (res.success && res.data) {
      setStats(res.data)
    }
    setLoadingStats(false)
  }, [])

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "15",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(gradeFilter ? { grade_level: gradeFilter } : {}),
      ...(classFilter ? { classroom: classFilter } : {}),
    })

    const res = await apiFetch<{ users: User[]; total: number; total_pages: number }>(
      `/api/admin/users?${params.toString()}`
    )

    if (res.success && res.data) {
      setUsers(res.data.users || [])
      setTotalUsers(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    }
    setLoadingUsers(false)
  }, [page, debouncedSearch, roleFilter, gradeFilter, classFilter])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle Single User Save (Create)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!formData.email || !formData.first_name || !formData.last_name) {
      setFormError("กรุณากรอกอีเมล ชื่อ และนามสกุลให้ครบถ้วน")
      return
    }

    setFormSubmitting(true)
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: formData.email,
        password: formData.password || "Password123!",
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        grade_level: formData.grade_level || null,
        classroom: formData.classroom || null,
      }),
    })
    setFormSubmitting(false)

    if (!res.success) {
      setFormError(res.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้")
      toast.error(res.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้")
      return
    }

    toast.success("สร้างบัญชีผู้ใช้เรียบร้อยแล้ว")
    setShowAddModal(false)
    resetForm()
    fetchUsers()
    fetchStats()
  }

  // Handle User Edit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setFormError("")

    setFormSubmitting(true)
    const payload: any = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      role: formData.role,
      grade_level: formData.grade_level || null,
      classroom: formData.classroom || null,
    }
    if (formData.password) {
      payload.password = formData.password
    }

    const res = await apiFetch(`/api/admin/users/${selectedUser.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    setFormSubmitting(false)

    if (!res.success) {
      setFormError(res.message || "เกิดข้อผิดพลาดในการแก้ไขผู้ใช้")
      toast.error(res.message || "เกิดข้อผิดพลาดในการแก้ไขผู้ใช้")
      return
    }

    toast.success("บันทึกการแก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว")
    setShowEditModal(false)
    setSelectedUser(null)
    resetForm()
    fetchUsers()
    fetchStats()
  }

  // Handle Delete
  const handleDeleteUser = async (userToDelete: User) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี ${userToDelete.first_name} ${userToDelete.last_name} (${userToDelete.email})?`)) {
      return
    }

    setDeletingId(userToDelete.id)
    const res = await apiFetch(`/api/admin/users/${userToDelete.id}`, {
      method: "DELETE",
    })
    setDeletingId(null)

    if (res.success) {
      toast.success("ลบบัญชีผู้ใช้เรียบร้อยแล้ว")
      fetchUsers()
      fetchStats()
    } else {
      toast.error(res.message || "ไม่สามารถลบผู้ใช้ได้")
    }
  }

  // Handle Batch Import File Upload
  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError("กรุณาเลือกไฟล์ .csv หรือ .xlsx ก่อนกดนำเข้า")
      toast.error("กรุณาเลือกไฟล์ .csv หรือ .xlsx ก่อนกดนำเข้า")
      return
    }

    setImportError("")
    setImportResult(null)
    setImporting(true)

    const form = new FormData()
    form.append("file", importFile)

    const res = await apiFetch<ImportResult>("/api/admin/users/import", {
      method: "POST",
      body: form,
    })

    setImporting(false)

    if (!res.success) {
      setImportError(res.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์")
      toast.error(res.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์")
      return
    }

    if (res.data) {
      setImportResult(res.data)
      toast.success(`นำเข้าผู้ใช้สำเร็จ ${res.data.imported} บัญชี`)
      fetchUsers()
      fetchStats()
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role: "STUDENT",
      grade_level: "",
      classroom: "",
    })
    setFormError("")
  }

  const openEditModal = (u: User) => {
    setSelectedUser(u)
    setFormData({
      email: u.email,
      password: "",
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      grade_level: u.grade_level || "",
      classroom: u.classroom || "",
    })
    setFormError("")
    setShowEditModal(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        setImportFile(file)
        setImportError("")
        setImportResult(null)
      } else {
        setImportError("กรุณาอัปโหลดเฉพาะไฟล์นามสกุล .csv หรือ .xlsx เท่านั้น")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setImportError("")
      setImportResult(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* TOP TITLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            ระบบบริหารจัดการบัญชีผู้ใช้งาน (User Management)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จัดการข้อมูลนักเรียน คณะครู และผู้ดูแลระบบ พร้อมระบบนำเข้าข้อมูลแบบกลุ่ม (Batch Import)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            เพิ่มผู้ใช้ใหม่
          </button>

          <button
            type="button"
            onClick={() => {
              setImportFile(null)
              setImportResult(null)
              setImportError("")
              setShowImportModal(true)
            }}
            className="flex items-center gap-2 border-2 border-brand-500 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/50 active:scale-95 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            นำเข้า CSV / Excel
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ผู้ใช้ทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.total_users.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">บัญชีในระบบ</div>
        </div>

        {/* Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">นักเรียน (Students)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.total_students.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {stats?.grade_counts && stats.grade_counts.length > 0
              ? stats.grade_counts.map((g) => `${g.grade_level}: ${g.count}`).join(" · ")
              : "ระดับชั้น ม.4 - ม.6"}
          </div>
        </div>

        {/* Teachers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ครูผู้สอน (Teachers)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.total_teachers.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ผู้สร้างรายวิชาและตรวจงาน</div>
        </div>

        {/* Admins */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ผู้ดูแล (Admins)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.total_admins.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ผู้บริหารและจัดการระบบ</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ, นามสกุล หรืออีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs outline-none transition-all"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-brand-500 text-xs outline-none transition-all"
            >
              <option value="">ทุกบทบาท (All Roles)</option>
              <option value="STUDENT">นักเรียน (Student)</option>
              <option value="TEACHER">ครูผู้สอน (Teacher)</option>
              <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
            </select>
          </div>

          {/* Grade Level Filter */}
          <div>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-brand-500 text-xs outline-none transition-all"
            >
              <option value="">ทุกระดับชั้น (All Grades)</option>
              <option value="M4">มัธยมศึกษาปีที่ 4 (M4)</option>
              <option value="M5">มัธยมศึกษาปีที่ 5 (M5)</option>
              <option value="M6">มัธยมศึกษาปีที่ 6 (M6)</option>
            </select>
          </div>

          {/* Classroom Filter */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ห้องเรียน (เช่น 1, 2)"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-brand-500 text-xs outline-none transition-all font-en"
            />
            <button
              type="button"
              onClick={() => {
                fetchUsers()
                fetchStats()
              }}
              title="รีเฟรชข้อมูล"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* USER TABLE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ผู้ใช้งาน / ชื่อ-นามสกุล</th>
                <th className="px-6 py-4">อีเมล (Email)</th>
                <th className="px-6 py-4">บทบาท (Role)</th>
                <th className="px-6 py-4">ชั้น / ห้องเรียน</th>
                <th className="px-6 py-4">วันที่สร้าง</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    กำลังโหลดข้อมูลผู้ใช้...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                    ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isStudent = u.role === "STUDENT"
                  const isTeacher = u.role === "TEACHER"
                  const isAdmin = u.role === "ADMIN"

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0">
                            {u.first_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold">{u.first_name} {u.last_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono sm:hidden">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-en text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {isTeacher && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <BookOpen className="w-3 h-3" />
                            Teacher
                          </span>
                        )}
                        {isStudent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <UserCheck className="w-3 h-3" />
                            Student
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {u.grade_level ? (
                          <span className="font-medium">
                            {u.grade_level} {u.classroom ? `/ ห้อง ${u.classroom}` : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-en text-[11px]">
                        {new Date(u.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="แก้ไขข้อมูล"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingId === u.id}
                            title="ลบบัญชีผู้ใช้"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            แสดงผล <strong className="text-slate-800 dark:text-slate-200">{users.length}</strong> จากทั้งหมด <strong className="text-slate-800 dark:text-slate-200">{totalUsers.toLocaleString()}</strong> บัญชี (หน้า {page} / {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loadingUsers}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loadingUsers}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / CREATE USER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">เพิ่มผู้ใช้งานใหม่</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">สร้างบัญชีรายบุคคลสำหรับนักเรียนหรือครู</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    placeholder="สมชาย"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="ใจดี"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">อีเมล (Email) *</label>
                <input
                  type="email"
                  required
                  placeholder="student.m4.01@tunorth.ac.th"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">รหัสผ่าน (เว้นว่างไว้จะใช้ค่าเริ่มต้น: Password123!)</label>
                <input
                  type="password"
                  placeholder="Password123!"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">บทบาท (Role)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  >
                    <option value="STUDENT">นักเรียน (STUDENT)</option>
                    <option value="TEACHER">ครูผู้สอน (TEACHER)</option>
                    <option value="ADMIN">ผู้ดูแล (ADMIN)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ระดับชั้น</label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  >
                    <option value="">- ไม่มี / ไม่ระบุ -</option>
                    <option value="M4">ม.4 (M4)</option>
                    <option value="M5">ม.5 (M5)</option>
                    <option value="M6">ม.6 (M6)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ห้องเรียน</label>
                  <input
                    type="text"
                    placeholder="เช่น 1, 2"
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">แก้ไขข้อมูลผู้ใช้งาน</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">อีเมล (Email) *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">เปลี่ยนรหัสผ่าน (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</label>
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่านใหม่..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">บทบาท (Role)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  >
                    <option value="STUDENT">นักเรียน (STUDENT)</option>
                    <option value="TEACHER">ครูผู้สอน (TEACHER)</option>
                    <option value="ADMIN">ผู้ดูแล (ADMIN)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ระดับชั้น</label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500"
                  >
                    <option value="">- ไม่มี / ไม่ระบุ -</option>
                    <option value="M4">ม.4 (M4)</option>
                    <option value="M5">ม.5 (M5)</option>
                    <option value="M6">ม.6 (M6)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ห้องเรียน</label>
                  <input
                    type="text"
                    placeholder="เช่น 1, 2"
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-brand-500 font-en"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  อัปเดตข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH IMPORT (CSV / EXCEL) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">นำเข้าข้อมูลผู้ใช้แบบกลุ่ม (Batch Import)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  รองรับไฟล์ .CSV และ Excel (.XLSX) สูงสุด 1,000+ รายการต่อครั้ง
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DOWNLOAD TEMPLATE SHORTCUTS */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">ดาวน์โหลดแม่แบบไฟล์ (Templates)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  คอลัมน์: email, password, first_name, last_name, role, grade_level, classroom
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={`${API_BASE_URL}/api/admin/users/template?format=csv`}
                  download="tunorth_user_template.csv"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  แม่แบบ .CSV
                </a>
                <a
                  href={`${API_BASE_URL}/api/admin/users/template?format=xlsx`}
                  download="tunorth_user_template.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  แม่แบบ .XLSX
                </a>
              </div>
            </div>

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 scale-[0.99]"
                  : "border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50/50 dark:bg-slate-950/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <UploadCloud className="w-12 h-12 mx-auto text-brand-500 mb-3" />
              {importFile ? (
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{importFile.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    ขนาด {(importFile.size / 1024).toFixed(1)} KB · คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ลากไฟล์มาวางที่นี่ หรือ <span className="text-brand-500 underline">เลือกไฟล์จากเครื่อง</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    รองรับไฟล์นามสกุล .CSV และ Excel (.XLSX)
                  </p>
                </div>
              )}
            </div>

            {/* IMPORT ERROR ALERT */}
            {importError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* IMPORT RESULT REPORT */}
            {importResult && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
                    importResult.failed === 0
                      ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      นำเข้าสำเร็จ: <strong>{importResult.imported.toLocaleString()}</strong> บัญชี (จากทั้งหมด {importResult.total.toLocaleString()} แถว)
                    </span>
                  </div>
                  {importResult.failed > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      ล้มเหลว: {importResult.failed.toLocaleString()} บัญชี
                    </span>
                  )}
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-3 space-y-1.5 text-xs text-rose-800 dark:text-rose-300 font-mono">
                    <div className="font-bold text-[11px] mb-1">รายการข้อผิดพลาดที่พบ ({importResult.errors.length} รายการ):</div>
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="text-[11px] flex items-start gap-2">
                        <span className="text-rose-500 font-bold shrink-0">[แถว {err.row}]</span>
                        <span className="text-slate-700 dark:text-slate-300 font-en shrink-0">{err.email || "(ไม่มีอีเมล)"}:</span>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                disabled={!importFile || importing}
                onClick={handleImportSubmit}
                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังประมวลผลข้อมูล...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    เริ่มนำเข้าข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
