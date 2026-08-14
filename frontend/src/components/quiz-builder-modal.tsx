"use client"

import React, { useState, useEffect } from "react"
import { toast } from "@/lib/toast"
import { apiFetch } from "@/lib/api"
import {
  X,
  PlusCircle,
  Trash2,
  Edit,
  Save,
  HelpCircle,
  Clock,
  Award,
  Loader2,
  CheckCircle2,
  Users,
  Eye,
} from "lucide-react"

interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: string
  options_json: string
  points: number
}

interface Quiz {
  id: string
  lesson_id: string
  title: string
  time_limit_minutes: number
  passing_score: number
  max_attempts?: number
  questions?: Question[]
}

interface Attempt {
  id: string
  score: number
  passed: boolean
  started_at: string
  student?: {
    first_name: string
    last_name: string
    grade_level?: string
    classroom?: string
  }
}

interface QuizBuilderModalProps {
  lessonId: string
  lessonTitle: string
  onClose: () => void
}

export function QuizBuilderModal({ lessonId, lessonTitle, onClose }: QuizBuilderModalProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"questions" | "settings" | "stats">("questions")

  // Quiz Meta Form
  const [quizForm, setQuizForm] = useState({
    title: "",
    time_limit_minutes: 15,
    passing_score: 80,
    max_attempts: 0,
  })

  // Question Form State
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "MULTIPLE_CHOICE",
    options: ["ตัวเลือก ก", "ตัวเลือก ข", "ตัวเลือก ค", "ตัวเลือก ง"],
    correct_answer: "ตัวเลือก ก",
    points: 1,
  })

  // Stats
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const fetchQuizzes = async () => {
    setIsLoading(true)
    const res = await apiFetch<Quiz[]>(`/api/teacher/lessons/${lessonId}/quizzes`)
    if (res.success && res.data) {
      setQuizzes(res.data)
      if (res.data.length > 0) {
        const q = res.data[0]
        setActiveQuiz(q)
        setQuizForm({
          title: q.title,
          time_limit_minutes: q.time_limit_minutes,
          passing_score: q.passing_score,
          max_attempts: q.max_attempts || 0,
        })
      } else {
        setActiveQuiz(null)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchQuizzes()
  }, [lessonId])

  const fetchStats = async (quizId: string) => {
    setIsLoadingStats(true)
    const res = await apiFetch<Attempt[]>(`/api/teacher/quizzes/${quizId}/stats`)
    if (res.success && res.data) {
      setAttempts(res.data)
    }
    setIsLoadingStats(false)
  }

  const handleCreateOrUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quizForm.title.trim()) {
      toast.error("กรุณากรอกชื่อชุดแบบทดสอบ")
      return
    }

    setIsSaving(true)
    if (activeQuiz) {
      // Update
      const res = await apiFetch(`/api/teacher/quizzes/${activeQuiz.id}`, {
        method: "PUT",
        body: JSON.stringify(quizForm),
      })
      if (res.success) {
        toast.success("บันทึกการตั้งค่าแบบทดสอบเรียบร้อยแล้ว")
        fetchQuizzes()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึกแบบทดสอบ")
      }
    } else {
      // Create
      const res = await apiFetch(`/api/teacher/lessons/${lessonId}/quizzes`, {
        method: "POST",
        body: JSON.stringify(quizForm),
      })
      if (res.success) {
        toast.success("สร้างชุดแบบทดสอบเรียบร้อยแล้ว")
        fetchQuizzes()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการสร้างแบบทดสอบ")
      }
    }
    setIsSaving(false)
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("คุณต้องการลบชุดแบบทดสอบนี้ใช่หรือไม่?")) return
    const res = await apiFetch(`/api/teacher/quizzes/${quizId}`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ลบชุดแบบทดสอบเรียบร้อยแล้ว")
      fetchQuizzes()
    } else {
      toast.error(res.message || "ไม่สามารถลบชุดแบบทดสอบได้")
    }
  }

  // --- QUESTION ACTIONS ---
  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null)
    setQuestionForm({
      question_text: "",
      question_type: "MULTIPLE_CHOICE",
      options: ["ตัวเลือก ก", "ตัวเลือก ข", "ตัวเลือก ค", "ตัวเลือก ง"],
      correct_answer: "ตัวเลือก ก",
      points: 1,
    })
    setShowQuestionModal(true)
  }

  const handleOpenEditQuestion = (q: Question) => {
    let opts: string[] = []
    try {
      opts = JSON.parse(q.options_json)
    } catch {
      opts = ["", "", "", ""]
    }

    setEditingQuestionId(q.id)
    setQuestionForm({
      question_text: q.question_text,
      question_type: q.question_type,
      options: opts,
      correct_answer: opts[0] || "",
      points: q.points,
    })
    setShowQuestionModal(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeQuiz || !questionForm.question_text.trim()) {
      toast.error("กรุณากรอกโจทย์คำถาม")
      return
    }

    setIsSaving(true)
    if (editingQuestionId) {
      const res = await apiFetch(`/api/teacher/questions/${editingQuestionId}`, {
        method: "PUT",
        body: JSON.stringify(questionForm),
      })
      if (res.success) {
        toast.success("แก้ไขข้อสอบเรียบร้อยแล้ว")
        setShowQuestionModal(false)
        fetchQuizzes()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการแก้ไขข้อสอบ")
      }
    } else {
      const res = await apiFetch(`/api/teacher/quizzes/${activeQuiz.id}/questions`, {
        method: "POST",
        body: JSON.stringify(questionForm),
      })
      if (res.success) {
        toast.success("เพิ่มข้อสอบใหม่เรียบร้อยแล้ว")
        setShowQuestionModal(false)
        fetchQuizzes()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการเพิ่มข้อสอบ")
      }
    }
    setIsSaving(false)
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("คุณต้องการลบข้อสอบข้อนี้ใช่หรือไม่?")) return
    const res = await apiFetch(`/api/teacher/questions/${questionId}`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ลบข้อสอบเรียบร้อยแล้ว")
      fetchQuizzes()
    } else {
      toast.error(res.message || "ไม่สามารถลบข้อสอบได้")
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Interactive Quiz Builder · {lessonTitle}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                ระบบจัดการชุดแบบทดสอบและข้อสอบ
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            กำลังโหลดข้อมูลแบบทดสอบ...
          </div>
        ) : !activeQuiz ? (
          /* NO QUIZ YET: CREATE QUIZ FORM */
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
            <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white">
              บทเรียนนี้ยังไม่มีชุดแบบทดสอบ
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              สร้างชุดแบบทดสอบท้ายบทเรียนเพื่อวัดและประเมินผลความเข้าใจของนักเรียน พร้อมระบบตรวจคะแนนอัตโนมัติ
            </p>

            <form onSubmit={handleCreateOrUpdateQuiz} className="max-w-md mx-auto space-y-4 pt-2 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อแบบทดสอบ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แบบทดสอบท้ายบทที่ 1: ตรรกศาสตร์และตัวแปร"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาจำกัด (นาที)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quizForm.time_limit_minutes}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) || 15 })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เกณฑ์ผ่าน (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quizForm.passing_score}
                    onChange={(e) =>
                      setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 60 })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  จำกัดจำนวนครั้งการทำแบบทดสอบ (0 = ไม่จำกัด)
                </label>
                <input
                  type="number"
                  min={0}
                  value={quizForm.max_attempts}
                  onChange={(e) =>
                    setQuizForm({
                      ...quizForm,
                      max_attempts: parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0,
                    })
                  }
                  placeholder="0 = ทำได้ไม่จำกัดจำนวนครั้ง"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 ระบุตัวเลข เช่น 1 ครั้ง (ทำได้รอบเดียว), 3 ครั้ง หรือใส่ 0 หากต้องการให้นักเรียนทำกี่รอบก็ได้
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
              >
                {isSaving ? "กำลังสร้าง..." : "สร้างชุดแบบทดสอบตอนนี้"}
              </button>
            </form>
          </div>
        ) : (
          /* QUIZ TABS & CONTENT */
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* TABS */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "questions"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                รายการข้อสอบ ({activeQuiz.questions?.length || 0} ข้อ)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "settings"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                ตั้งค่าเกณฑ์ & เวลา
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("stats")
                  if (activeQuiz) fetchStats(activeQuiz.id)
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "stats"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                สถิติการสอบของนักเรียน
              </button>

              <button
                type="button"
                onClick={() => handleDeleteQuiz(activeQuiz.id)}
                className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 p-2 rounded-lg"
                title="ลบชุดแบบทดสอบนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: QUESTIONS */}
            {activeTab === "questions" && (
              <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ข้อสอบทั้งหมดในชุดนี้
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    เพิ่มข้อสอบใหม่
                  </button>
                </div>

                {(!activeQuiz.questions || activeQuiz.questions.length === 0) ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-slate-400">ยังไม่มีคำถามในแบบทดสอบนี้</p>
                    <button
                      type="button"
                      onClick={handleOpenAddQuestion}
                      className="text-xs font-bold text-amber-600 hover:underline"
                    >
                      + คลิกเพิ่มคำถามข้อแรก
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeQuiz.questions.map((q, idx) => {
                      let opts: string[] = []
                      try {
                        opts = JSON.parse(q.options_json)
                      } catch {}

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {q.question_text}
                                </h5>
                                <span className="text-[10px] text-slate-400">
                                  {q.points} คะแนน
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pl-7 text-[11px] text-slate-500">
                            {opts.map((opt, oIdx) => (
                              <div key={oIdx} className="truncate">
                                • {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SETTINGS */}
            {activeTab === "settings" && (
              <form onSubmit={handleCreateOrUpdateQuiz} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อแบบทดสอบ
                  </label>
                  <input
                    type="text"
                    required
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      เวลาจำกัด (นาที)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quizForm.time_limit_minutes}
                      onChange={(e) =>
                        setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) || 15 })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      เกณฑ์ผ่าน (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quizForm.passing_score}
                      onChange={(e) =>
                        setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 60 })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำกัดจำนวนครั้งการทำแบบทดสอบ (0 = ไม่จำกัด)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quizForm.max_attempts}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        max_attempts: parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0,
                      })
                    }
                    placeholder="0 = ทำได้ไม่จำกัดจำนวนครั้ง"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 กำหนดจำนวนครั้งสูงสุดที่อนุญาตให้นักเรียนทำแบบทดสอบชุดนี้ (0 = ทำได้เรื่อยๆ ไม่จำกัด)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </form>
            )}

            {/* TAB 3: STATS */}
            {activeTab === "stats" && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingStats ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    กำลังโหลดข้อมูลสถิติ...
                  </div>
                ) : attempts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    ยังไม่มีนักเรียนทำแบบทดสอบชุดนี้
                  </p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">ชื่อ-นามสกุล นักเรียน</th>
                          <th className="p-3">ชั้น / ห้อง</th>
                          <th className="p-3 text-center">คะแนน</th>
                          <th className="p-3 text-center">ผลประเมิน</th>
                          <th className="p-3">เวลาที่สอบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {att.student?.first_name} {att.student?.last_name}
                            </td>
                            <td className="p-3 text-slate-500">
                              {att.student?.grade_level}/{att.student?.classroom || "-"}
                            </td>
                            <td className="p-3 font-bold text-center text-slate-900 dark:text-white">
                              {att.score}%
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  att.passed
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {att.passed ? "ผ่าน" : "ไม่ผ่าน"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">
                              {new Date(att.started_at).toLocaleString("th-TH")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* QUESTION MODAL */}
        {showQuestionModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingQuestionId ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    โจทย์คำถาม <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="พิมพ์โจทย์คำถาม..."
                    value={questionForm.question_text}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question_text: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ตัวเลือกคำตอบ (Choices) <span className="text-red-500">*</span>
                  </label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options]
                          newOpts[idx] = e.target.value
                          setQuestionForm({ ...questionForm, options: newOpts })
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                      />
                      <input
                        type="radio"
                        name="correct_answer"
                        checked={questionForm.correct_answer === opt && opt !== ""}
                        onChange={() =>
                          setQuestionForm({ ...questionForm, correct_answer: opt })
                        }
                        title="กำหนดให้เป็นข้อที่ถูกต้อง"
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400">
                    🔘 ติ๊กปุ่ม Radio ด้านขวาเพื่อระบุข้อที่เป็นคำตอบที่ถูกต้อง
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คะแนนเต็มของข้อนี้
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={questionForm.points}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })
                    }
                    className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow"
                  >
                    บันทึกข้อสอบ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
