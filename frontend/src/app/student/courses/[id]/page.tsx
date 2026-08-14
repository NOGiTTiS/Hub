"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/lib/toast"
import { apiFetch } from "@/lib/api"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  Video,
  FileText,
  Code2,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Loader2,
  Trophy,
  AlertCircle,
  Sparkles,
  BookOpen,
  UserMinus,
  AlertTriangle,
} from "lucide-react"
import { VideoPlayer } from "@/components/video-player"
import { PDFViewer } from "@/components/pdf-viewer"
import { CodePlayground } from "@/components/code-playground"
import { QuizPlayer } from "@/components/quiz-player"
import { AssignmentPanel } from "@/components/assignment-panel"
import { CertificateModal, CertificateData } from "@/components/certificate-modal"

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

interface CoursePlayerData {
  course: {
    id: string
    title: string
    description: string
    cover_image_url: string
    teacher?: {
      first_name: string
      last_name: string
    }
    modules?: Module[]
  }
  enrollment: {
    id: string
    progress_percent: number
    enrolled_at: string
  }
  completed_lessons: string[]
  progress_percent: number
}

export default function StudentCoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.id as string

  const [playerData, setPlayerData] = useState<CoursePlayerData | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Error & Unenroll Modal State
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showUnenrollModal, setShowUnenrollModal] = useState(false)
  const [isUnenrolling, setIsUnenrolling] = useState(false)

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false)
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [isLoadingCert, setIsLoadingCert] = useState(false)

  const handleOpenCertificate = async () => {
    setIsLoadingCert(true)
    const res = await apiFetch<CertificateData>(`/api/student/courses/${courseId}/certificate`)
    if (res.success && res.data) {
      setCertData(res.data)
      setShowCertModal(true)
    } else {
      toast.error(res.message || "ไม่สามารถดึงข้อมูลใบประกาศนียบัตรได้")
    }
    setIsLoadingCert(false)
  }

  const handleConfirmUnenroll = async () => {
    setIsUnenrolling(true)
    const res = await apiFetch(`/api/student/courses/${courseId}/enroll`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ยกเลิกการลงทะเบียนรายวิชาเรียบร้อยแล้ว")
      router.push("/student")
    } else {
      toast.error(res.message || "ไม่สามารถยกเลิกการลงทะเบียนได้")
      setIsUnenrolling(false)
      setShowUnenrollModal(false)
    }
  }

  const fetchPlayerData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    const res = await apiFetch<CoursePlayerData>(`/api/student/courses/${courseId}/player`)
    if (res.success && res.data) {
      const data = res.data
      setPlayerData(data)
      setCompletedLessons(data.completed_lessons || [])
      setProgressPercent(data.progress_percent || 0)

      // Set initial active lesson if not set
      if (!activeLesson && data.course.modules && data.course.modules.length > 0) {
        const firstMod = data.course.modules[0]
        if (firstMod.lessons && firstMod.lessons.length > 0) {
          // Find first uncompleted lesson, or default to first lesson
          const firstUncompleted = data.course.modules
            .flatMap((m) => m.lessons || [])
            .find((l) => !data.completed_lessons?.includes(l.id))

          setActiveLesson(firstUncompleted || firstMod.lessons[0])
        }
      }
    } else {
      setErrorMessage(res.message || "ไม่สามารถเข้าสู่ห้องเรียนได้ กรุณาลงทะเบียนเรียนก่อน")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (courseId) {
      fetchPlayerData()
    }
  }, [courseId])

  // Get all flattened lessons for next/prev navigation
  const allLessons =
    playerData?.course.modules?.flatMap((m) => m.lessons || []) || []
  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLesson?.id)

  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson)
    setIsSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleToggleLessonComplete = async (lessonId: string, currentCompleted: boolean) => {
    setIsUpdatingProgress(true)
    const newStatus = !currentCompleted

    // Optimistic update
    const nextCompleted = newStatus
      ? [...completedLessons, lessonId]
      : completedLessons.filter((id) => id !== lessonId)
    setCompletedLessons(nextCompleted)

    const res = await apiFetch(`/api/student/courses/${courseId}/lessons/${lessonId}/progress`, {
      method: "POST",
      body: JSON.stringify({ completed: newStatus }),
    })

    if (res.success && res.data) {
      setCompletedLessons(res.data.completed_lessons)
      setProgressPercent(res.data.progress_percent)
    }
    setIsUpdatingProgress(false)
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[currentLessonIndex + 1])
    }
  }

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      handleSelectLesson(allLessons[currentLessonIndex - 1])
    }
  }

  if (isLoading) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-3" />
        <p className="font-semibold text-sm">กำลังเข้าสู่ห้องเรียนออนไลน์...</p>
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-5 px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {errorMessage || "ไม่พบคอร์สวิชา หรือยังไม่ได้ลงทะเบียน"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            กรุณาตรวจสอบการลงทะเบียนเรียนในหน้าศูนย์การเรียนรู้ของนักเรียนก่อนเข้าสู่บทเรียน
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลักนักเรียน
          </Link>
        </div>
      </div>
    )
  }

  const isCurrentLessonCompleted = activeLesson
    ? completedLessons.includes(activeLesson.id)
    : false

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "VIDEO_UPLOAD":
      case "VIDEO_EMBED":
        return Video
      case "SLIDE_PDF":
        return FileText
      case "CODE_LAB":
        return Code2
      default:
        return FileCode
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP HEADER & REAL-TIME PROGRESS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="กลับสู่หน้ารวมวิชา"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                Online Classroom · ครู{playerData.course.teacher?.first_name} {playerData.course.teacher?.last_name}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {playerData.course.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              <Menu className="w-4 h-4" />
              สารบัญบทเรียน
            </button>

            {progressPercent < 100 && (
              <button
                type="button"
                onClick={() => setShowUnenrollModal(true)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
                title="ถอนรายวิชา"
              >
                <UserMinus className="w-3.5 h-3.5" />
                ถอนรายวิชา
              </button>
            )}

            {progressPercent === 100 && (
              <button
                type="button"
                disabled={isLoadingCert}
                onClick={handleOpenCertificate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition cursor-pointer"
              >
                {isLoadingCert ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4 text-slate-950" />
                )}
                รับใบประกาศนียบัตร
              </button>
            )}
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              ความก้าวหน้าการเรียนรู้: {completedLessons.length} / {allLessons.length} บทเรียน
            </span>
            <span className="text-brand-600 dark:text-brand-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: PLAYER & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PLAYER CANVAS (COL 1-8) */}
        <div className="lg:col-span-8 space-y-6">
          {activeLesson ? (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
              {/* LESSON HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    บทเรียนที่ {currentLessonIndex + 1} จาก {allLessons.length}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {activeLesson.title}
                  </h2>
                </div>

                {/* MARK COMPLETED BUTTON */}
                <button
                  type="button"
                  disabled={isUpdatingProgress}
                  onClick={() =>
                    handleToggleLessonComplete(activeLesson.id, isCurrentLessonCompleted)
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-sm shrink-0 ${
                    isCurrentLessonCompleted
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-brand-600 text-white hover:bg-brand-500"
                  }`}
                >
                  {isUpdatingProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentLessonCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {isCurrentLessonCompleted ? "✓ เรียนจบแล้ว (กดเพื่อยกเลิก)" : "ทำเครื่องหมายว่าเรียนจบแล้ว"}
                </button>
              </div>

              {/* MEDIA RENDERER */}
              <div>
                {activeLesson.content_type === "VIDEO_EMBED" && (
                  <VideoPlayer
                    type="embed"
                    src={activeLesson.embed_url || ""}
                    title={activeLesson.title}
                    onComplete={() => {
                      if (!isCurrentLessonCompleted) {
                        handleToggleLessonComplete(activeLesson.id, false)
                      }
                    }}
                  />
                )}

                {activeLesson.content_type === "VIDEO_UPLOAD" && (
                  <VideoPlayer
                    type="direct"
                    src={activeLesson.video_url || ""}
                    title={activeLesson.title}
                    onComplete={() => {
                      if (!isCurrentLessonCompleted) {
                        handleToggleLessonComplete(activeLesson.id, false)
                      }
                    }}
                  />
                )}

                {activeLesson.content_type === "SLIDE_PDF" && (
                  <PDFViewer src={activeLesson.pdf_url || ""} title={activeLesson.title} />
                )}

                {activeLesson.content_type === "CODE_LAB" && (
                  <CodePlayground
                    title={`Interactive Code Lab: ${activeLesson.title}`}
                    initialCode={activeLesson.body_text || undefined}
                  />
                )}
              </div>

              {/* LESSON BODY TEXT (IF ANY) */}
              {activeLesson.body_text && activeLesson.content_type !== "CODE_LAB" && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    คำอธิบายและเนื้อหาบทเรียน
                  </h3>
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {activeLesson.body_text}
                  </div>
                </div>
              )}

              {/* PREV / NEXT NAVIGATION */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentLessonIndex <= 0}
                  onClick={handlePrevLesson}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                  บทเรียนก่อนหน้า
                </button>

                <button
                  type="button"
                  disabled={currentLessonIndex >= allLessons.length - 1}
                  onClick={handleNextLesson}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow disabled:opacity-30 disabled:pointer-events-none"
                >
                  บทเรียนถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* INTERACTIVE QUIZ & ASSIGNMENT ATTACHMENTS FOR ACTIVE LESSON */}
            <div className="space-y-6">
              <QuizPlayer
                lessonId={activeLesson.id}
                onQuizCompleted={() => fetchPlayerData()}
              />
              <AssignmentPanel
                lessonId={activeLesson.id}
                onSubmissionSuccess={() => fetchPlayerData()}
              />
            </div>
          </>
          ) : (
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">ยังไม่มีบทเรียนในคอร์สนี้</h3>
              <p className="text-xs text-slate-400">กรุณารอครูผู้สอนเพิ่มเนื้อหาบทเรียน</p>
            </div>
          )}
        </div>

        {/* SIDEBAR: LESSONS & SYLLABUS (COL 9-12) */}
        <div
          className={`lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 ${
            isSidebarOpen
              ? "fixed inset-x-4 top-20 bottom-6 z-50 overflow-y-auto"
              : "hidden lg:block sticky top-24"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">สารบัญบทเรียน</h3>
              <p className="text-[11px] text-slate-400">
                {playerData.course.modules?.length || 0} โมดูล · {allLessons.length} บทเรียน
              </p>
            </div>

            {isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {playerData.course.modules?.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-[10px] flex items-center justify-center font-bold">
                    {modIdx + 1}
                  </span>
                  <span className="truncate">{mod.title}</span>
                </div>

                <div className="space-y-1.5 pl-2">
                  {mod.lessons?.map((lesson, lIdx) => {
                    const isCompleted = completedLessons.includes(lesson.id)
                    const isActive = activeLesson?.id === lesson.id
                    const Icon = getLessonIcon(lesson.content_type)

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 text-xs ${
                          isActive
                            ? "bg-brand-600 text-white font-bold shadow-sm"
                            : isCompleted
                            ? "bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-brand-500"}`} />
                          <span className="truncate">
                            {modIdx + 1}.{lIdx + 1} {lesson.title}
                          </span>
                        </div>

                        {isCompleted ? (
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-white" : "text-emerald-500"
                            }`}
                          />
                        ) : (
                          <Circle
                            className={`w-3.5 h-3.5 shrink-0 opacity-30 ${
                              isActive ? "text-white" : ""
                            }`}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNENROLL CONFIRMATION MODAL */}
      {showUnenrollModal && playerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ยืนยันการถอนรายวิชา
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ยกเลิกการลงทะเบียนเรียนในรายวิชานี้
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2 text-xs">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                วิชา: {playerData.course.title}
              </div>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                ⚠️ เมื่อกดยืนยันการถอนรายวิชา ความก้าวหน้าในการเรียนทั้งหมดจะถูกรีเซ็ต และท่านจะไม่สามารถเข้าสู่ห้องเรียนได้จนกว่าจะลงทะเบียนใหม่
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isUnenrolling}
                onClick={() => setShowUnenrollModal(false)}
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
