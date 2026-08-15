"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import {
  BookOpen,
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Award,
  UserMinus,
  AlertTriangle,
  Search,
  X,
  Filter,
} from "lucide-react"
import { CertificateModal, CertificateData } from "@/components/certificate-modal"

interface CourseCategory {
  id: string
  name: string
  color: string
  order_index: number
}

interface CourseCatalogItem {
  id: string
  title: string
  description: string
  cover_image_url: string
  category_id?: string
  category?: CourseCategory
  is_published: boolean
  teacher?: {
    first_name: string
    last_name: string
  }
  modules_count: number
  lessons_count: number
  is_enrolled: boolean
  progress_percent: number
}

interface MyEnrolledCourse {
  enrollment_id: string
  course: {
    id: string
    title: string
    description: string
    cover_image_url: string
    category_id?: string
    category?: CourseCategory
    teacher?: {
      first_name: string
      last_name: string
    }
  }
  completed_lessons: string[]
  progress_percent: number
  enrolled_at: string
  modules_count: number
  lessons_count: number
}

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<CourseCatalogItem[]>([])
  const [myCourses, setMyCourses] = useState<MyEnrolledCourse[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL")
  const [searchCatalogTerm, setSearchCatalogTerm] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false)
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [loadingCertId, setLoadingCertId] = useState<string | null>(null)

  const handleOpenCertificate = async (courseId: string) => {
    setLoadingCertId(courseId)
    const res = await apiFetch<CertificateData>(`/api/student/courses/${courseId}/certificate`)
    if (res.success && res.data) {
      setCertData(res.data)
      setShowCertModal(true)
    } else {
      toast.error(res.message || "ไม่สามารถดึงข้อมูลใบประกาศนียบัตรได้")
    }
    setLoadingCertId(null)
  }

  const fetchData = async () => {
    setIsLoading(true)
    const [catRes, myRes, catListRes] = await Promise.all([
      apiFetch<CourseCatalogItem[]>("/api/student/courses"),
      apiFetch<MyEnrolledCourse[]>("/api/student/my-courses"),
      apiFetch<CourseCategory[]>("/api/categories"),
    ])

    if (catRes.success && catRes.data) {
      setCatalog(catRes.data)
    }
    if (myRes.success && myRes.data) {
      setMyCourses(myRes.data)
    }
    if (catListRes.success && catListRes.data) {
      setCategories(catListRes.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId)
    const res = await apiFetch(`/api/student/courses/${courseId}/enroll`, {
      method: "POST",
    })
    if (res.success) {
      toast.success("ลงทะเบียนเรียนรายวิชาเรียบร้อยแล้ว!")
      await fetchData()
    } else {
      toast.error(res.message || "ไม่สามารถลงทะเบียนได้")
    }
    setEnrollingId(null)
  }

  // Unenroll Modal State & Handler
  const [unenrollCourse, setUnenrollCourse] = useState<{
    id: string
    title: string
    hasCert: boolean
  } | null>(null)
  const [isUnenrolling, setIsUnenrolling] = useState(false)

  const handleConfirmUnenroll = async () => {
    if (!unenrollCourse) return
    setIsUnenrolling(true)
    const res = await apiFetch(`/api/student/courses/${unenrollCourse.id}/enroll`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ยกเลิกการลงทะเบียนรายวิชาเรียบร้อยแล้ว")
      setUnenrollCourse(null)
      await fetchData()
    } else {
      toast.error(res.message || "ไม่สามารถยกเลิกการลงทะเบียนได้")
    }
    setIsUnenrolling(false)
  }

  // Calculate student average progress
  const averageProgress =
    myCourses.length > 0
      ? Math.round(
          myCourses.reduce((acc, c) => acc + (c.progress_percent || 0), 0) / myCourses.length
        )
      : 0

  const totalCompletedLessons = myCourses.reduce(
    (acc, c) => acc + (c.completed_lessons?.length || 0),
    0
  )

  return (
    <div className="space-y-8">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-brand-200 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Student Learning Hub · ศูนย์การเรียนรู้นักเรียน
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              สวัสดี, {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-brand-100 text-xs sm:text-sm mt-2 leading-relaxed">
              {user?.grade_level ? `ระดับชั้น ${user.grade_level}` : "นักเรียน"} {user?.classroom ? `ห้อง ${user.classroom}` : ""} · เข้าเรียนคอร์สวิชา ฝึกเขียนโค้ด ส่งการบ้าน และติดตามความก้าวหน้าของคุณได้ทุกที่ทุกเวลา
            </p>
          </div>

          {myCourses.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shrink-0 min-w-[160px]">
              <span className="text-[11px] text-brand-200 font-semibold uppercase tracking-wider">
                ความก้าวหน้าเฉลี่ย
              </span>
              <div className="text-3xl font-black mt-1 text-white">{averageProgress}%</div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-brand-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${averageProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">คอร์สที่ลงทะเบียน</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {myCourses.length} คอร์ส
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">บทเรียนที่เรียนจบแล้ว</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalCompletedLessons} บท
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">สถานะการเรียนรู้</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {myCourses.length > 0 ? "กำลังศึกษา" : "พร้อมเรียน"}
            </div>
          </div>
        </div>
      </div>

      {/* MY ENROLLED COURSES (IF ANY) */}
      {myCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-brand-600" />
                คอร์สที่กำลังเรียนอยู่ (My Courses)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เรียนต่อจากจุดที่ค้างไว้เพื่อสะสมความก้าวหน้า
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCourses.map((item) => (
              <div
                key={item.enrollment_id}
                className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                        ลงทะเบียนแล้ว
                      </span>
                      {item.course.category && (
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${item.course.category.color || "#2563eb"}15`,
                            color: item.course.category.color || "#2563eb",
                            border: `1px solid ${item.course.category.color || "#2563eb"}30`,
                          }}
                        >
                          {item.course.category.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {item.progress_percent}% สำเร็จ
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUnenrollCourse({
                            id: item.course.id,
                            title: item.course.title,
                            hasCert: item.progress_percent === 100,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="ยกเลิกการลงทะเบียน (ถอนรายวิชา)"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.course.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.course.description || "วิชาออนไลน์สำหรับนักเรียน"}
                    </p>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                      <span>เรียนแล้ว {item.completed_lessons?.length || 0} / {item.lessons_count} บท</span>
                      {item.progress_percent === 100 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          🎉 เรียนครบ 100% แล้ว
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    ครู{item.course.teacher?.first_name} {item.course.teacher?.last_name}
                  </span>

                  <div className="flex items-center gap-2">
                    {item.progress_percent === 100 && (
                      <button
                        type="button"
                        disabled={loadingCertId === item.course.id}
                        onClick={() => handleOpenCertificate(item.course.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold text-xs hover:bg-amber-500/20 transition"
                      >
                        {loadingCertId === item.course.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        เกียรติบัตร
                      </button>
                    )}

                    <Link
                      href={`/student/courses/${item.course.id}`}
                      className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
                    >
                      เข้าห้องเรียน
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL AVAILABLE COURSES CATALOG */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" />
              รายวิชาทั้งหมดที่เปิดสอน (Course Catalog)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เลือกรายวิชาที่สนใจเพื่อเริ่มลงทะเบียนและเข้าเรียนออนไลน์
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อวิชา หรือคำอธิบาย..."
              value={searchCatalogTerm}
              onChange={(e) => setSearchCatalogTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            />
            {searchCatalogTerm && (
              <button
                type="button"
                onClick={() => setSearchCatalogTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills / Filter Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategoryId === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              ทั้งหมด ({catalog.length})
            </button>
            {categories.map((cat) => {
              const count = catalog.filter((c) => c.category_id === cat.id).length
              const isSelected = selectedCategoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "shadow-sm text-white"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: cat.color || "#2563eb", borderColor: cat.color || "#2563eb" }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? "#ffffff" : cat.color || "#2563eb" }}
                  />
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-normal ml-0.5">({count})</span>
                </button>
              )
            })}
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs">กำลังโหลดรายการวิชา...</p>
          </div>
        ) : catalog.length === 0 ? (
          <div className="py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center p-6 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">ยังไม่มีรายวิชาที่เปิดสอน</h3>
            <p className="text-xs text-slate-500">
              เมื่อคุณครูเปิดเผยแพร่คอร์ส รายวิชาจะปรากฏให้เข้าเรียนที่นี่
            </p>
          </div>
        ) : (
          (() => {
            const filteredCatalog = catalog.filter((course) => {
              const matchesCategory =
                selectedCategoryId === "ALL" || course.category_id === selectedCategoryId
              const matchesSearch =
                !searchCatalogTerm.trim() ||
                course.title.toLowerCase().includes(searchCatalogTerm.toLowerCase()) ||
                (course.description &&
                  course.description.toLowerCase().includes(searchCatalogTerm.toLowerCase()))
              return matchesCategory && matchesSearch
            })

            if (filteredCatalog.length === 0) {
              return (
                <div className="py-12 text-center space-y-2 bg-slate-50/50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <Search className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    ไม่พบรายวิชาที่ตรงกับเงื่อนไขการค้นหา
                  </p>
                  <p className="text-xs text-slate-400">
                    ลองเปลี่ยนหมวดหมู่หรือล้างคำค้นหาเพื่อดูวิชาทั้งหมด
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId("ALL")
                      setSearchCatalogTerm("")
                    }}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 underline mt-2 inline-block"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCatalog.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-brand-500/50 transition overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                            มัธยมศึกษา
                          </span>
                          {course.category && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: `${course.category.color || "#2563eb"}15`,
                                color: course.category.color || "#2563eb",
                                border: `1px solid ${course.category.color || "#2563eb"}30`,
                              }}
                            >
                              {course.category.name}
                            </span>
                          )}
                        </div>
                        {course.is_enrolled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            ✓ ลงทะเบียนแล้ว ({course.progress_percent}%)
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {course.description || "รายวิชาการเรียนรู้ออนไลน์สำหรับนักเรียน"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-brand-500" />
                          {course.modules_count} โมดูล
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          {course.lessons_count} บทเรียน
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[50%]">
                        ครู{course.teacher?.first_name} {course.teacher?.last_name}
                      </span>

                      {course.is_enrolled ? (
                        <Link
                          href={`/student/courses/${course.id}`}
                          className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition shrink-0"
                        >
                          เข้าเรียนต่อ
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={enrollingId === course.id}
                          onClick={() => handleEnroll(course.id)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition shrink-0 disabled:opacity-50"
                        >
                          {enrollingId === course.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          ลงทะเบียนเรียนฟรี
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        )}
      </div>

      {/* UNENROLL CONFIRMATION MODAL */}
      {unenrollCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ยืนยันการยกเลิกการลงทะเบียน
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ถอนรายวิชาออกจากบัญชีการเรียนรู้ของคุณ
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2 text-xs">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                วิชา: {unenrollCourse.title}
              </div>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                ⚠️ เมื่อกดยกเลิกการลงทะเบียน ข้อมูลความก้าวหน้าในการเรียนทั้งหมดในรายวิชานี้จะถูกรีเซ็ต หากต้องการกลับมาเรียนใหม่จะต้องกดลงทะเบียนใหม่ตั้งแต่ต้น
              </p>
              {unenrollCourse.hasCert && (
                <p className="text-rose-600 dark:text-rose-400 font-semibold mt-1">
                  * หากท่านได้รับใบประกาศนียบัตรแล้ว จะไม่สามารถยกเลิกรายวิชานี้ได้
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isUnenrolling}
                onClick={() => setUnenrollCourse(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isUnenrolling}
                onClick={handleConfirmUnenroll}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isUnenrolling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันการถอนรายวิชา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      {showCertModal && certData && (
        <CertificateModal cert={certData} onClose={() => setShowCertModal(false)} />
      )}
    </div>
  )
}
