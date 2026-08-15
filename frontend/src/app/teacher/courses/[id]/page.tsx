"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { toast } from "@/lib/toast"
import {
  ArrowLeft,
  BookOpen,
  PlusCircle,
  Video,
  FileText,
  Code2,
  FileCode,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Save,
  Loader2,
  AlertCircle,
  Layers,
  Settings,
  X,
  ExternalLink,
  Users,
  UserMinus,
  AlertTriangle,
  Search,
  Award,
} from "lucide-react"
import { FileUploader } from "@/components/file-uploader"
import { VideoPlayer } from "@/components/video-player"
import { PDFViewer } from "@/components/pdf-viewer"
import { CodePlayground } from "@/components/code-playground"
import { AssignmentBuilderModal } from "@/components/assignment-builder-modal"
import { QuizBuilderModal } from "@/components/quiz-builder-modal"
import { HelpCircle, FileCheck2 } from "lucide-react"

interface Lesson {
  id: string
  module_id: string
  title: string
  content_type: "VIDEO_UPLOAD" | "VIDEO_EMBED" | "SLIDE_PDF" | "CODE_LAB" | "TEXT"
  video_url?: string
  embed_url?: string
  pdf_url?: string
  body_text?: string
  order_index: number
}

interface Module {
  id: string
  course_id: string
  title: string
  order_index: number
  lessons?: Lesson[]
}

interface EnrolledStudent {
  enrollment_id: string
  student_id: string
  student: {
    id: string
    first_name: string
    last_name: string
    email: string
    grade_level?: string
    classroom?: string
  }
  progress_percent: number
  enrolled_at: string
  has_certificate: boolean
}

interface CourseCategory {
  id: string
  name: string
  color: string
}

interface Course {
  id: string
  title: string
  description: string
  cover_image_url: string
  category_id?: string
  category?: CourseCategory
  is_published: boolean
  teacher_id: string
  teacher?: {
    first_name: string
    last_name: string
  }
  modules?: Module[]
}

export default function TeacherCourseBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Enrolled Students Modal States
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [studentsList, setStudentsList] = useState<EnrolledStudent[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<EnrolledStudent | null>(null)
  const [isRemovingStudent, setIsRemovingStudent] = useState(false)
  const [searchStudentQuery, setSearchStudentQuery] = useState("")

  const handleOpenStudentsModal = async () => {
    setShowStudentsModal(true)
    setIsLoadingStudents(true)
    const res = await apiFetch<EnrolledStudent[]>(`/api/teacher/courses/${courseId}/students`)
    if (res.success && res.data) {
      setStudentsList(res.data)
    } else {
      toast.error(res.message || "ไม่สามารถดึงรายชื่อผู้เรียนได้")
    }
    setIsLoadingStudents(false)
  }

  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove) return
    setIsRemovingStudent(true)
    const res = await apiFetch(`/api/teacher/courses/${courseId}/students/${studentToRemove.student_id}`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success(`ถอน ${studentToRemove.student.first_name} ${studentToRemove.student.last_name} ออกจากรายวิชาเรียบร้อยแล้ว`)
      setStudentToRemove(null)
      const resUpdated = await apiFetch<EnrolledStudent[]>(`/api/teacher/courses/${courseId}/students`)
      if (resUpdated.success && resUpdated.data) {
        setStudentsList(resUpdated.data)
      }
    } else {
      toast.error(res.message || "ไม่สามารถถอนนักเรียนได้")
    }
    setIsRemovingStudent(false)
  }

  // Module Modal states
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleTitle, setModuleTitle] = useState("")

  // Lesson Modal states
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm] = useState<{
    title: string
    content_type: "VIDEO_UPLOAD" | "VIDEO_EMBED" | "SLIDE_PDF" | "CODE_LAB" | "TEXT"
    video_url: string
    embed_url: string
    pdf_url: string
    body_text: string
  }>({
    title: "",
    content_type: "VIDEO_EMBED",
    video_url: "",
    embed_url: "",
    pdf_url: "",
    body_text: "",
  })

  // Preview Lesson State
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)

  // Assignment & Quiz Builder States
  const [activeAssignmentLesson, setActiveAssignmentLesson] = useState<Lesson | null>(null)
  const [activeQuizLesson, setActiveQuizLesson] = useState<Lesson | null>(null)

  // Edit Course Meta Modal
  const [showCourseMetaModal, setShowCourseMetaModal] = useState(false)
  const [courseMetaForm, setCourseMetaForm] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    category_id: "",
    is_published: true,
  })

  const fetchCourseData = async () => {
    setIsLoading(true)
    const [resCourse, resCategories] = await Promise.all([
      apiFetch<Course>(`/api/teacher/courses/${courseId}`),
      apiFetch<CourseCategory[]>("/api/categories"),
    ])
    if (resCourse.success && resCourse.data) {
      setCourse(resCourse.data)
      setCourseMetaForm({
        title: resCourse.data.title,
        description: resCourse.data.description || "",
        cover_image_url: resCourse.data.cover_image_url || "",
        category_id: resCourse.data.category_id || "",
        is_published: resCourse.data.is_published,
      })
    }
    if (resCategories.success && resCategories.data) {
      setCategories(resCategories.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  // --- MODULE ACTIONS ---
  const handleOpenAddModule = () => {
    setEditingModule(null)
    setModuleTitle("")
    setShowModuleModal(true)
  }

  const handleOpenEditModule = (mod: Module) => {
    setEditingModule(mod)
    setModuleTitle(mod.title)
    setShowModuleModal(true)
  }

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moduleTitle.trim()) return

    setIsSaving(true)
    if (editingModule) {
      // Update
      const res = await apiFetch(`/api/teacher/modules/${editingModule.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: moduleTitle.trim() }),
      })
      if (res.success) {
        setShowModuleModal(false)
        fetchCourseData()
      }
    } else {
      // Create
      const res = await apiFetch(`/api/teacher/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: moduleTitle.trim() }),
      })
      if (res.success) {
        setShowModuleModal(false)
        fetchCourseData()
      }
    }
    setIsSaving(false)
  }

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`คุณต้องการลบโมดูล "${title}" และบทเรียนย่อยทั้งหมดภายในใช่หรือไม่?`)) return
    const res = await apiFetch(`/api/teacher/modules/${moduleId}`, {
      method: "DELETE",
    })
    if (res.success) {
      fetchCourseData()
    }
  }

  const handleMoveModule = async (index: number, direction: "up" | "down") => {
    if (!course?.modules) return
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= course.modules.length) return

    const newModules = [...course.modules]
    const temp = newModules[index]
    newModules[index] = newModules[targetIndex]
    newModules[targetIndex] = temp

    // Prepare reorder payload
    const payload = newModules.map((m, idx) => ({
      id: m.id,
      order_index: idx + 1,
    }))

    setCourse({ ...course, modules: newModules })
    await apiFetch(`/api/teacher/courses/${courseId}/modules/reorder`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  // --- LESSON ACTIONS ---
  const handleOpenAddLesson = (moduleId: string) => {
    setActiveModuleId(moduleId)
    setEditingLesson(null)
    setLessonForm({
      title: "",
      content_type: "VIDEO_EMBED",
      video_url: "",
      embed_url: "",
      pdf_url: "",
      body_text: "",
    })
    setShowLessonModal(true)
  }

  const handleOpenEditLesson = (moduleId: string, lesson: Lesson) => {
    setActiveModuleId(moduleId)
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson.title,
      content_type: lesson.content_type,
      video_url: lesson.video_url || "",
      embed_url: lesson.embed_url || "",
      pdf_url: lesson.pdf_url || "",
      body_text: lesson.body_text || "",
    })
    setShowLessonModal(true)
  }

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonForm.title.trim() || !activeModuleId) return

    setIsSaving(true)
    if (editingLesson) {
      const res = await apiFetch(`/api/teacher/lessons/${editingLesson.id}`, {
        method: "PUT",
        body: JSON.stringify(lessonForm),
      })
      if (res.success) {
        setShowLessonModal(false)
        fetchCourseData()
      }
    } else {
      const res = await apiFetch(`/api/teacher/modules/${activeModuleId}/lessons`, {
        method: "POST",
        body: JSON.stringify(lessonForm),
      })
      if (res.success) {
        setShowLessonModal(false)
        fetchCourseData()
      }
    }
    setIsSaving(false)
  }

  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!confirm(`คุณต้องการลบบทเรียน "${title}" ใช่หรือไม่?`)) return
    const res = await apiFetch(`/api/teacher/lessons/${lessonId}`, {
      method: "DELETE",
    })
    if (res.success) {
      fetchCourseData()
    }
  }

  const handleMoveLesson = async (moduleIndex: number, lessonIndex: number, direction: "up" | "down") => {
    if (!course?.modules) return
    const targetModule = course.modules[moduleIndex]
    if (!targetModule.lessons) return

    const targetLessonIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1
    if (targetLessonIndex < 0 || targetLessonIndex >= targetModule.lessons.length) return

    const newLessons = [...targetModule.lessons]
    const temp = newLessons[lessonIndex]
    newLessons[lessonIndex] = newLessons[targetLessonIndex]
    newLessons[targetLessonIndex] = temp

    const updatedModules = [...course.modules]
    updatedModules[moduleIndex] = {
      ...targetModule,
      lessons: newLessons,
    }
    setCourse({ ...course, modules: updatedModules })

    const payload = newLessons.map((l, idx) => ({
      id: l.id,
      order_index: idx + 1,
    }))

    await apiFetch(`/api/teacher/modules/${targetModule.id}/lessons/reorder`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  // --- COURSE META ACTIONS ---
  const handleSaveCourseMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const res = await apiFetch(`/api/teacher/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...courseMetaForm,
        category_id: courseMetaForm.category_id ? courseMetaForm.category_id : null,
      }),
    })
    if (res.success) {
      toast.success("บันทึกการตั้งค่ารายวิชาสำเร็จเรียบร้อย")
      setShowCourseMetaModal(false)
      fetchCourseData()
    } else {
      toast.error(res.message || "ไม่สามารถบันทึกข้อมูลรายวิชาได้")
    }
    setIsSaving(false)
  }

  const handleTogglePublish = async () => {
    if (!course) return
    const res = await apiFetch(`/api/teacher/courses/${course.id}/publish`, {
      method: "PATCH",
    })
    if (res.success) {
      setCourse({ ...course, is_published: !course.is_published })
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-3" />
        <p className="font-semibold text-sm">กำลังโหลดข้อมูลโครงสร้างหลักสูตร...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ไม่พบคอร์สวิชานี้</h2>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลักครู
        </Link>
      </div>
    )
  }

  const contentTypeBadges = {
    VIDEO_UPLOAD: { label: "วิดีโอ MP4 อัปโหลด", icon: Video, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    VIDEO_EMBED: { label: "วิดีโอ Embed (YouTube)", icon: Video, color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
    SLIDE_PDF: { label: "สไลด์ PDF", icon: FileText, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    CODE_LAB: { label: "Interactive Code", icon: Code2, color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
    TEXT: { label: "บทความ/คำอธิบาย", icon: FileCode, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* TOP NAVIGATION & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                Course Curriculum Builder
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  course.is_published
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                {course.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
              </span>
              {course.category ? (
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
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                  ไม่ระบุหมวดหมู่
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenStudentsModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition shadow-sm"
          >
            <Users className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            รายชื่อผู้เรียน
          </button>

          <button
            type="button"
            onClick={() => setShowCourseMetaModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            ตั้งค่าวิชา
          </button>

          <button
            type="button"
            onClick={handleTogglePublish}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              course.is_published
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {course.is_published ? "ปิดการเผยแพร่" : "เปิดเผยแพร่ให้นักเรียนเข้าเรียน"}
          </button>
        </div>
      </div>

      {/* MODULES & LESSONS LIST */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              โครงสร้างหมวดหมู่โมดูลและบทเรียน (Modules & Lessons)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              จัดกลุ่มเนื้อหาบทเรียนเป็นโมดูล สามารถกดเพิ่ม ย้ายลำดับ หรือแก้ไขได้ทันที
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModule}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition"
          >
            <PlusCircle className="w-4 h-4" />
            เพิ่มโมดูลใหม่
          </button>
        </div>

        {(!course.modules || course.modules.length === 0) ? (
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3 bg-white dark:bg-slate-900">
            <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">ยังไม่มีโมดูลในวิชานี้</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              สร้างโมดูลแรก (เช่น "หน่วยการเรียนรู้ที่ 1") เพื่อเริ่มต้นเพิ่มเนื้อหาบทเรียนย่อย
            </p>
            <button
              type="button"
              onClick={handleOpenAddModule}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              สร้างโมดูลแรกตอนนี้
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {course.modules.map((mod, modIdx) => (
              <div
                key={mod.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* MODULE HEADER */}
                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {modIdx + 1}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {mod.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Reorder Module */}
                    <button
                      type="button"
                      disabled={modIdx === 0}
                      onClick={() => handleMoveModule(modIdx, "up")}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={modIdx === (course.modules?.length || 1) - 1}
                      onClick={() => handleMoveModule(modIdx, "down")}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModule(mod)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
                      title="แก้ไขชื่อโมดูล"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteModule(mod.id, mod.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="ลบโมดูล"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAddLesson(mod.id)}
                      className="ml-2 inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      เพิ่มบทเรียน
                    </button>
                  </div>
                </div>

                {/* LESSONS IN MODULE */}
                <div className="p-4 sm:p-5 space-y-2.5">
                  {(!mod.lessons || mod.lessons.length === 0) ? (
                    <p className="text-xs text-slate-400 italic py-2 text-center">
                      ยังไม่มีบทเรียนในโมดูลนี้ คลิก "เพิ่มบทเรียน" เพื่อใส่เนื้อหา
                    </p>
                  ) : (
                    mod.lessons.map((lesson, lessonIdx) => {
                      const badge = contentTypeBadges[lesson.content_type] || contentTypeBadges.TEXT
                      const Icon = badge.icon

                      return (
                        <div
                          key={lesson.id}
                          className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 hover:border-brand-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-5">
                              {modIdx + 1}.{lessonIdx + 1}
                            </span>

                            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {lesson.title}
                                </h4>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {/* Move Lesson Up/Down */}
                            <button
                              type="button"
                              disabled={lessonIdx === 0}
                              onClick={() => handleMoveLesson(modIdx, lessonIdx, "up")}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                              title="เลื่อนขึ้น"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={lessonIdx === (mod.lessons?.length || 1) - 1}
                              onClick={() => handleMoveLesson(modIdx, lessonIdx, "down")}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                              title="เลื่อนลง"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Manage Quiz */}
                            <button
                              type="button"
                              onClick={() => setActiveQuizLesson(lesson)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 text-[11px] font-bold hover:bg-amber-100 transition"
                              title="จัดการแบบทดสอบในบทเรียนนี้"
                            >
                              <HelpCircle className="w-3 h-3" />
                              แบบทดสอบ
                            </button>

                            {/* Manage Assignment */}
                            <button
                              type="button"
                              onClick={() => setActiveAssignmentLesson(lesson)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-[11px] font-bold hover:bg-indigo-100 transition"
                              title="จัดการการบ้านและตรวจงาน"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              การบ้าน
                            </button>

                            {/* Preview Lesson */}
                            <button
                              type="button"
                              onClick={() => setPreviewLesson(lesson)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950"
                              title="พรีวิวบทเรียนนี้"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Lesson */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditLesson(mod.id, lesson)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              title="แก้ไขบทเรียน"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Lesson */}
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                              title="ลบบทเรียน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODULE MODAL */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingModule ? "แก้ไขชื่อโมดูล" : "เพิ่มโมดูลใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModuleModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อโมดูล / หน่วยการเรียนรู้ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หน่วยการเรียนรู้ที่ 1: การคิดเชิงคำนวณ"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LESSON MODAL */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLesson ? "แก้ไขบทเรียนย่อย" : "เพิ่มบทเรียนย่อยใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อบทเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 1.1 พื้นฐานไวยากรณ์ภาษา Python"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ประเภทเนื้อหา (Content Type)
                </label>
                <select
                  value={lessonForm.content_type}
                  onChange={(e: any) =>
                    setLessonForm({ ...lessonForm, content_type: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="VIDEO_EMBED">วิดีโอภายนอก (YouTube / Google Drive Embed)</option>
                  <option value="VIDEO_UPLOAD">วิดีโออัปโหลดตรงลงเซิร์ฟเวอร์ (MP4 / WebM)</option>
                  <option value="SLIDE_PDF">เอกสารสไลด์การสอน (PDF Slide)</option>
                  <option value="CODE_LAB">Interactive Code Playground (Python WASM)</option>
                  <option value="TEXT">บทความ / เอกสารเนื้อหาข้อความ (Text Content)</option>
                </select>
              </div>

              {/* Conditional Inputs based on content type */}
              {lessonForm.content_type === "VIDEO_EMBED" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ลิงก์วิดีโอ YouTube หรือ Google Drive Preview URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... หรือ https://drive.google.com/file/d/.../preview"
                    value={lessonForm.embed_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, embed_url: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              {lessonForm.content_type === "VIDEO_UPLOAD" && (
                <FileUploader
                  category="video"
                  label="อัปโหลดไฟล์วิดีโอ (MP4/WebM)"
                  currentValue={lessonForm.video_url}
                  onUploadSuccess={(url) => setLessonForm({ ...lessonForm, video_url: url })}
                />
              )}

              {lessonForm.content_type === "SLIDE_PDF" && (
                <FileUploader
                  category="pdf"
                  label="อัปโหลดไฟล์สไลด์ PDF"
                  currentValue={lessonForm.pdf_url}
                  onUploadSuccess={(url) => setLessonForm({ ...lessonForm, pdf_url: url })}
                />
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำอธิบายหรือเนื้อหาเพิ่มเติม (Body Text / Notes / Code Starter)
                </label>
                <textarea
                  rows={4}
                  placeholder="พิมพ์คำอธิบายบทเรียน หรือโค้ดตัวอย่าง..."
                  value={lessonForm.body_text}
                  onChange={(e) => setLessonForm({ ...lessonForm, body_text: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกบทเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW LESSON MODAL */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  พรีวิวเนื้อหาบทเรียน (Preview)
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {previewLesson.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {previewLesson.content_type === "VIDEO_EMBED" && (
                <VideoPlayer type="embed" src={previewLesson.embed_url || ""} title={previewLesson.title} />
              )}

              {previewLesson.content_type === "VIDEO_UPLOAD" && (
                <VideoPlayer type="direct" src={previewLesson.video_url || ""} title={previewLesson.title} />
              )}

              {previewLesson.content_type === "SLIDE_PDF" && (
                <PDFViewer src={previewLesson.pdf_url || ""} title={previewLesson.title} />
              )}

              {previewLesson.content_type === "CODE_LAB" && (
                <CodePlayground
                  title={`Playground Preview: ${previewLesson.title}`}
                  initialCode={previewLesson.body_text || undefined}
                />
              )}

              {previewLesson.body_text && previewLesson.content_type !== "CODE_LAB" && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {previewLesson.body_text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUIZ BUILDER MODAL */}
      {activeQuizLesson && (
        <QuizBuilderModal
          lessonId={activeQuizLesson.id}
          lessonTitle={activeQuizLesson.title}
          onClose={() => setActiveQuizLesson(null)}
        />
      )}

      {/* ASSIGNMENT BUILDER MODAL */}
      {activeAssignmentLesson && (
        <AssignmentBuilderModal
          lessonId={activeAssignmentLesson.id}
          lessonTitle={activeAssignmentLesson.title}
          onClose={() => setActiveAssignmentLesson(null)}
        />
      )}

      {/* COURSE META EDIT MODAL */}
      {showCourseMetaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                แก้ไขข้อมูลรายวิชา
              </h3>
              <button
                type="button"
                onClick={() => setShowCourseMetaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourseMeta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อรายวิชา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseMetaForm.title}
                  onChange={(e) => setCourseMetaForm({ ...courseMetaForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมวดหมู่รายวิชา / กลุ่มสาระการเรียนรู้
                </label>
                <select
                  value={courseMetaForm.category_id}
                  onChange={(e) => setCourseMetaForm({ ...courseMetaForm, category_id: e.target.value })}
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
                  คำอธิบายรายวิชา
                </label>
                <textarea
                  rows={3}
                  value={courseMetaForm.description}
                  onChange={(e) => setCourseMetaForm({ ...courseMetaForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <FileUploader
                category="image"
                label="รูปภาพปกวิชา"
                currentValue={courseMetaForm.cover_image_url}
                onUploadSuccess={(url) => setCourseMetaForm({ ...courseMetaForm, cover_image_url: url })}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal_published"
                  checked={courseMetaForm.is_published}
                  onChange={(e) => setCourseMetaForm({ ...courseMetaForm, is_published: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <label htmlFor="modal_published" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เปิดให้เข้าเรียน (Published)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseMetaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLLED STUDENTS MODAL */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      รายชื่อนักเรียนที่ลงทะเบียนเรียน
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                      {studentsList.length} คน
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    วิชา: {course.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStudentsModal(false)
                  setSearchStudentQuery("")
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEARCH BOX */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อ นามสกุล อีเมล หรือห้องเรียน..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* STUDENTS LIST TABLE */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingStudents ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
                  <p className="text-xs font-semibold">กำลังโหลดรายชื่อนักเรียน...</p>
                </div>
              ) : studentsList.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 p-6">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ยังไม่มีนักเรียนลงทะเบียนในวิชานี้</h4>
                  <p className="text-xs text-slate-400">
                    เมื่อนักเรียนกดลงทะเบียนเข้าเรียน รายชื่อและความก้าวหน้าจะปรากฏที่นี่
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800 text-[10px]">
                      <tr>
                        <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                        <th className="py-3 px-3">ชั้น / ห้อง</th>
                        <th className="py-3 px-3">วันที่ลงทะเบียน</th>
                        <th className="py-3 px-3">ความก้าวหน้า</th>
                        <th className="py-3 px-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {studentsList
                        .filter((item) => {
                          if (!searchStudentQuery.trim()) return true
                          const q = searchStudentQuery.toLowerCase()
                          const fullName = `${item.student.first_name} ${item.student.last_name}`.toLowerCase()
                          const email = item.student.email.toLowerCase()
                          const room = `${item.student.grade_level || ""} ${item.student.classroom || ""}`.toLowerCase()
                          return fullName.includes(q) || email.includes(q) || room.includes(q)
                        })
                        .map((item) => (
                          <tr key={item.enrollment_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.student.first_name} {item.student.last_name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.student.email}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                {item.student.grade_level ? `${item.student.grade_level}` : "มัธยม"} {item.student.classroom ? `/${item.student.classroom}` : ""}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                              {new Date(item.enrolled_at).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-3 min-w-[130px]">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                <span>{item.progress_percent}%</span>
                                {item.has_certificate && (
                                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 text-[10px]">
                                    <Award className="w-3 h-3 text-amber-500" />
                                    จบหลักสูตร
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    item.progress_percent === 100 ? "bg-emerald-500" : "bg-brand-600"
                                  }`}
                                  style={{ width: `${item.progress_percent}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {item.has_certificate ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 rounded-lg cursor-not-allowed"
                                  title="นักเรียนได้รับใบประกาศนียบัตรแล้ว ไม่อนุญาตให้ถอนรายวิชา"
                                >
                                  <Award className="w-3 h-3 text-amber-500" />
                                  สำเร็จการศึกษา
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setStudentToRemove(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                  title="ถอนนักเรียนออกจากรายวิชา"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  ถอน
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              <span>รวม {studentsList.length} คน</span>
              <button
                type="button"
                onClick={() => {
                  setShowStudentsModal(false)
                  setSearchStudentQuery("")
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REMOVE STUDENT DIALOG */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ยืนยันการถอนนักเรียน
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ถอนนักเรียนออกจากรายวิชานี้
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2 text-xs">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                นักเรียน: {studentToRemove.student.first_name} {studentToRemove.student.last_name} ({studentToRemove.student.email})
              </div>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                ⚠️ เมื่อถอนนักเรียนออก ข้อมูลการลงทะเบียนและความก้าวหน้าในการเรียนในวิชานี้ของนักเรียนจะถูกยกเลิก และนักเรียนจะไม่สามารถเข้าห้องเรียนนี้ได้จนกว่าจะลงทะเบียนใหม่
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isRemovingStudent}
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isRemovingStudent}
                onClick={handleConfirmRemoveStudent}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isRemovingStudent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันการถอนนักเรียน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
