"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "@/lib/toast"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import {
  BookOpen,
  PlusCircle,
  Video,
  FileText,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
  Layers,
  Users,
  AlertCircle,
} from "lucide-react"
import { FileUploader } from "@/components/file-uploader"

interface CourseCategory {
  id: string
  name: string
  color: string
}

interface CourseItem {
  id: string
  title: string
  description: string
  cover_image_url: string
  category_id?: string
  category?: CourseCategory
  is_published: boolean
  created_at: string
  modules_count: number
  lessons_count: number
  enrolled_students: number
}

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Course Form State
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newCoverUrl, setNewCoverUrl] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("")
  const [newPublished, setNewPublished] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchCourses = async () => {
    setIsLoading(true)
    const [resCourses, resCategories] = await Promise.all([
      apiFetch<CourseItem[]>("/api/teacher/courses"),
      apiFetch<CourseCategory[]>("/api/categories"),
    ])
    if (resCourses.success && resCourses.data) {
      setCourses(resCourses.data)
    }
    if (resCategories.success && resCategories.data) {
      setCategories(resCategories.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setErrorMessage("กรุณากรอกชื่อรายวิชา")
      toast.error("กรุณากรอกชื่อรายวิชา")
      return
    }

    setIsCreating(true)
    setErrorMessage(null)

    const res = await apiFetch("/api/teacher/courses", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDesc.trim(),
        cover_image_url: newCoverUrl,
        category_id: newCategoryId ? newCategoryId : null,
        is_published: newPublished,
      }),
    })

    if (res.success) {
      toast.success("สร้างรายวิชาใหม่เรียบร้อยแล้ว")
      setShowCreateModal(false)
      setNewTitle("")
      setNewDesc("")
      setNewCoverUrl("")
      setNewCategoryId("")
      fetchCourses()
    } else {
      const err = res.message || "เกิดข้อผิดพลาดในการสร้างรายวิชา"
      setErrorMessage(err)
      toast.error(err)
    }
    setIsCreating(false)
  }

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    const res = await apiFetch(`/api/teacher/courses/${courseId}/publish`, {
      method: "PATCH",
    })
    if (res.success) {
      toast.success(!currentStatus ? "เผยแพร่รายวิชาเรียบร้อยแล้ว" : "ปิดการเผยแพร่รายวิชาแล้ว")
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, is_published: !currentStatus } : c))
      )
    } else {
      toast.error(res.message || "ไม่สามารถเปลี่ยนสถานะการเผยแพร่ได้")
    }
  }

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`คุณต้องการลบรายวิชา "${courseTitle}" และบทเรียนทั้งหมดใช่หรือไม่?`)) {
      return
    }

    const res = await apiFetch(`/api/teacher/courses/${courseId}`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ลบรายวิชาเรียบร้อยแล้ว")
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
    } else {
      toast.error(res.message || "ไม่สามารถลบรายวิชาได้")
    }
  }

  // Aggregate Stats
  const totalCourses = courses.length
  const totalLessons = courses.reduce((acc, c) => acc + (c.lessons_count || 0), 0)
  const totalStudents = courses.reduce((acc, c) => acc + (c.enrolled_students || 0), 0)

  return (
    <div className="space-y-8">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-brand-200 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Teacher Portal · แผงควบคุมครูผู้สอน
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ยินดีต้อนรับ, คุณครู{user?.first_name} {user?.last_name}
            </h1>
            <p className="text-brand-100 text-xs sm:text-sm mt-2 leading-relaxed">
              จัดการโครงสร้างหลักสูตร จัดหมวดหมู่โมดูล อัปโหลดสไลด์ PDF วิดีโอการสอน และติดตามการเรียนรู้ของนักเรียน
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-brand-50 text-brand-900 font-bold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition text-sm shrink-0"
          >
            <PlusCircle className="w-5 h-5 text-brand-600" />
            สร้างรายวิชาใหม่
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">รายวิชาทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalCourses} วิชา</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">บทเรียนย่อยทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalLessons} บทเรียน</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">นักเรียนที่ลงทะเบียนรวม</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalStudents} คน</div>
          </div>
        </div>
      </div>

      {/* COURSE LIST SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">รายวิชาที่คุณรับผิดชอบ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              คลิก "จัดการโครงสร้างบทเรียน" เพื่อเพิ่มโมดูล จัดเรียงลำดับ หรืออัปโหลดเนื้อหา
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs">กำลังโหลดข้อมูลรายวิชา...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center p-6 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">ยังไม่มีรายวิชาที่สร้าง</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              เริ่มต้นสร้างรายวิชาแรกของคุณ เพื่อเริ่มเพิ่มเนื้อหาบทเรียน สไลด์ PDF และวิดีโอ
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4" />
              สร้างรายวิชาใหม่ตอนนี้
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-brand-500/50 dark:hover:border-brand-500/50 transition flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                          course.is_published
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {course.is_published ? "● เผยแพร่แล้ว (Published)" : "○ ฉบับร่าง (Draft)"}
                      </span>
                      {course.category ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                          style={{
                            backgroundColor: `${course.category.color || "#2563eb"}15`,
                            color: course.category.color || "#2563eb",
                            border: `1px solid ${course.category.color || "#2563eb"}30`,
                          }}
                        >
                          {course.category.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          ไม่ระบุหมวดหมู่
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(course.id, course.is_published)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                        title="สลับสถานะเผยแพร่"
                      >
                        {course.is_published ? "ปิดการเผยแพร่" : "เปิดเผยแพร่"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                        title="ลบรายวิชา"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {course.description || "ไม่มีรายละเอียดวิชา"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-brand-500" />
                      {course.modules_count} โมดูล
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {course.lessons_count} บทเรียน
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      {course.enrolled_students} นักเรียน
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <Link
                    href={`/teacher/courses/${course.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
                  >
                    <Edit className="w-4 h-4" />
                    จัดการเนื้อหา & บทเรียน (Course Builder)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE COURSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                สร้างรายวิชาใหม่
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อรายวิชา / คอร์ส <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วิทยาการคำนวณและวิทยาการข้อมูล ม.4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมวดหมู่รายวิชา / กลุ่มสาระการเรียนรู้
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- ไม่ระบุหมวดหมู่ (Uncategorized) --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบายรายวิชา (Description)
                </label>
                <textarea
                  rows={3}
                  placeholder="รายละเอียดวัตถุประสงค์และเนื้อหาของวิชา..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <FileUploader
                category="image"
                label="รูปภาพปกวิชา (Cover Image)"
                currentValue={newCoverUrl}
                onUploadSuccess={(url) => setNewCoverUrl(url)}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publish_now"
                  checked={newPublished}
                  onChange={(e) => setNewPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <label htmlFor="publish_now" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เปิดให้เข้าเรียนทันที (Publish Immediately)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  บันทึกและสร้างรายวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
