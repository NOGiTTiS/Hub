"use client"

import React, { useState, useEffect, useRef } from "react"
import { toast } from "@/lib/toast"
import { apiFetch, API_BASE_URL } from "@/lib/api"
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
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  Bot,
  Wand2,
  Sliders,
  Check,
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

interface ImportErrorItem {
  row: number
  question?: string
  error: string
}

interface AIQuestionDraft {
  question_text: string
  question_type: string
  options: string[]
  correct_answer: string
  points: number
  explanation?: string
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

  // Import Modal States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<"append" | "replace">("append")
  const [isUploadingQuiz, setIsUploadingQuiz] = useState(false)
  const [isDragOverQuiz, setIsDragOverQuiz] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportErrorItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Quiz Generator States
  const [showAIGenModal, setShowAIGenModal] = useState(false)
  const [showAIPreviewModal, setShowAIPreviewModal] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isSavingAIQuestions, setIsSavingAIQuestions] = useState(false)
  const [aiFile, setAiFile] = useState<File | null>(null)
  const aiFileInputRef = useRef<HTMLInputElement>(null)
  const [aiGenForm, setAiGenForm] = useState({
    question_count: 5,
    difficulty: "MEDIUM",
    question_type: "MULTIPLE_CHOICE",
    custom_instructions: "",
    custom_context: "",
    include_lesson_text: true,
    include_lesson_media: true,
  })
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<AIQuestionDraft[]>([])
  const [aiSaveMode, setAiSaveMode] = useState<"append" | "replace">("append")

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

  // --- IMPORT QUIZ ACTIONS ---
  const handleOpenImportModal = () => {
    setImportFile(null)
    setImportMode("append")
    setImportErrors([])
    setShowImportModal(true)
  }

  const handleCloseImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportErrors([])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOverQuiz(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOverQuiz(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOverQuiz(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        setImportFile(file)
        setImportErrors([])
      } else {
        toast.error("รองรับเฉพาะไฟล์ .csv หรือ .xlsx เท่านั้น")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        setImportFile(file)
        setImportErrors([])
      } else {
        toast.error("รองรับเฉพาะไฟล์ .csv หรือ .xlsx เท่านั้น")
      }
    }
  }

  const handleImportQuizSubmit = async () => {
    if (!activeQuiz) {
      toast.error("ไม่พบข้อมูลชุดแบบทดสอบ")
      return
    }
    if (!importFile) {
      toast.error("กรุณาเลือกไฟล์ข้อสอบ .csv หรือ .xlsx ก่อนดำเนินการ")
      return
    }

    if (importMode === "replace") {
      const confirmed = confirm("คำเตือน: โหมด 'แทนที่ข้อสอบเดิมทั้งหมด' จะลบข้อสอบเดิมในชุดนี้ทั้งหมดและแทนที่ด้วยข้อสอบจากไฟล์ ต้องการดำเนินการต่อหรือไม่?")
      if (!confirmed) return
    }

    setIsUploadingQuiz(true)
    setImportErrors([])

    const formData = new FormData()
    formData.append("file", importFile)
    formData.append("mode", importMode)

    const res = await apiFetch(`/api/teacher/quizzes/${activeQuiz.id}/import`, {
      method: "POST",
      body: formData,
    })

    if (res.success) {
      toast.success(res.message || "นำเข้าข้อสอบสำเร็จแล้ว")
      handleCloseImportModal()
      fetchQuizzes()
    } else {
      if (res.data?.errors && Array.isArray(res.data.errors) && res.data.errors.length > 0) {
        setImportErrors(res.data.errors)
      }
      toast.error(res.message || "เกิดข้อผิดพลาดในการนำเข้าข้อสอบ")
    }

    setIsUploadingQuiz(false)
  }

  // --- AI GENERATOR ACTIONS ---
  const handleOpenAIGenModal = () => {
    setShowAIGenModal(true)
  }

  const handleGenerateAI = async () => {
    if (!activeQuiz) {
      toast.error("กรุณาเลือกหรือสร้างชุดแบบทดสอบก่อนใช้งาน AI")
      return
    }

    setIsGeneratingAI(true)
    try {
      let res
      if (aiFile) {
        const formData = new FormData()
        formData.append("file", aiFile)
        formData.append("question_count", String(aiGenForm.question_count))
        formData.append("difficulty", aiGenForm.difficulty)
        formData.append("question_type", aiGenForm.question_type)
        formData.append("custom_instructions", aiGenForm.custom_instructions)
        formData.append("custom_context", aiGenForm.custom_context)
        formData.append("include_lesson_text", String(aiGenForm.include_lesson_text))
        formData.append("include_lesson_media", String(aiGenForm.include_lesson_media))

        res = await apiFetch<{
          quiz_title: string
          questions: AIQuestionDraft[]
        }>(`/api/teacher/lessons/${lessonId}/quizzes/generate-ai`, {
          method: "POST",
          body: formData,
        })
      } else {
        res = await apiFetch<{
          quiz_title: string
          questions: AIQuestionDraft[]
        }>(`/api/teacher/lessons/${lessonId}/quizzes/generate-ai`, {
          method: "POST",
          body: JSON.stringify(aiGenForm),
        })
      }

      if (res.success && res.data?.questions && res.data.questions.length > 0) {
        toast.success(`AI สร้างข้อสอบสำเร็จ (${res.data.questions.length} ข้อ)`)
        setAiGeneratedQuestions(res.data.questions)
        setShowAIGenModal(false)
        setShowAIPreviewModal(true)
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการสร้างข้อสอบด้วย AI")
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับบริการ AI ได้")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleAIQuestionChange = (index: number, field: keyof AIQuestionDraft, value: any) => {
    setAiGeneratedQuestions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleAIOptionChange = (qIndex: number, optIndex: number, value: string) => {
    setAiGeneratedQuestions((prev) => {
      const updated = [...prev]
      const currentOpt = updated[qIndex].options[optIndex]
      const wasCorrect = updated[qIndex].correct_answer === currentOpt
      const newOptions = [...updated[qIndex].options]
      newOptions[optIndex] = value
      updated[qIndex] = {
        ...updated[qIndex],
        options: newOptions,
        correct_answer: wasCorrect ? value : updated[qIndex].correct_answer,
      }
      return updated
    })
  }

  const handleDeleteAIQuestion = (index: number) => {
    setAiGeneratedQuestions((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAddAIDraftQuestion = () => {
    setAiGeneratedQuestions((prev) => [
      ...prev,
      {
        question_text: "โจทย์คำถามใหม่",
        question_type: "MULTIPLE_CHOICE",
        options: ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
        correct_answer: "ตัวเลือก 1",
        points: 1,
        explanation: "",
      },
    ])
  }

  const handleSaveAIBatch = async () => {
    if (!activeQuiz) return
    if (aiGeneratedQuestions.length === 0) {
      toast.error("ไม่มีรายการข้อสอบให้บันทึก")
      return
    }

    if (aiSaveMode === "replace") {
      const confirmed = confirm("คำเตือน: โหมด 'แทนที่ทั้งหมด' จะลบข้อสอบเดิมทั้งหมดในชุดนี้ และแทนที่ด้วยข้อสอบจาก AI ต้องการดำเนินการต่อหรือไม่?")
      if (!confirmed) return
    }

    setIsSavingAIQuestions(true)
    try {
      const res = await apiFetch(`/api/teacher/quizzes/${activeQuiz.id}/questions/batch`, {
        method: "POST",
        body: JSON.stringify({
          mode: aiSaveMode,
          questions: aiGeneratedQuestions,
        }),
      })

      if (res.success) {
        toast.success(res.message || "บันทึกข้อสอบจาก AI เรียบร้อยแล้ว")
        setShowAIPreviewModal(false)
        setAiGeneratedQuestions([])
        fetchQuizzes()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึกข้อสอบ")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อสอบ")
    } finally {
      setIsSavingAIQuestions(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
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
          <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
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
          <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
            {/* TABS */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
                className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 p-2 rounded-lg shrink-0"
                title="ลบชุดแบบทดสอบนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: QUESTIONS */}
            {activeTab === "questions" && (
              <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-y-auto pr-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ข้อสอบทั้งหมดในชุดนี้ ({activeQuiz.questions?.length || 0} ข้อ)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenAIGenModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      🤖 สร้างด้วย AI (AI Generator)
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenImportModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      นำเข้าไฟล์ (CSV/Excel)
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddQuestion}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      เพิ่มข้อสอบใหม่
                    </button>
                  </div>
                </div>

                {(!activeQuiz.questions || activeQuiz.questions.length === 0) ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 my-auto">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ยังไม่มีคำถามในแบบทดสอบนี้</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">คุณสามารถให้ AI ช่วยสร้างจากเนื้อหาบทเรียนอัตโนมัติ, นำเข้าจากไฟล์ หรือพิมพ์สร้างทีละข้อได้</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenAIGenModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        🤖 สร้างด้วย AI อัจฉริยะ
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddQuestion}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        เพิ่มข้อสอบข้อแรก
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenImportModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        นำเข้าไฟล์ (CSV / Excel)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {activeQuiz.questions.map((q, idx) => {
                      let opts: string[] = []
                      try {
                        opts = JSON.parse(q.options_json)
                      } catch {}

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white break-words">
                                  {q.question_text}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                    {q.question_type === "TRUE_FALSE" ? "ถูก/ผิด" : "ปรนัย"}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {q.points} คะแนน
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                                title="แก้ไขข้อสอบ"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                title="ลบข้อสอบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7 text-[11px] text-slate-500 dark:text-slate-400">
                            {opts.map((opt, oIdx) => (
                              <div key={oIdx} className="break-words">
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
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <form onSubmit={handleCreateOrUpdateQuiz} className="space-y-4 max-w-lg pb-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition"
                    >
                      {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: STATS */}
            {activeTab === "stats" && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
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
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[500px]">
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
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingQuestionId ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      โจทย์คำถาม <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
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
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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

        {/* IMPORT QUIZ MODAL */}
        {showImportModal && activeQuiz && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      นำเข้าชุดข้อสอบ (Import Questions)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เพิ่มข้อสอบจำนวนมากเข้าสู่ชุด {activeQuiz.title} ผ่านไฟล์ CSV หรือ Excel
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* TEMPLATE DOWNLOAD BOX */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ดาวน์โหลดไฟล์แม่แบบข้อสอบ (Templates)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      มีตัวอย่างข้อสอบ ปรนัย 4 ตัวเลือก และถูก/ผิด พร้อมสูตรและหัวตาราง
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`${API_BASE_URL}/api/teacher/quizzes/template?format=xlsx`}
                      download="quiz_import_template.xlsx"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      แม่แบบ .XLSX
                    </a>
                    <a
                      href={`${API_BASE_URL}/api/teacher/quizzes/template?format=csv`}
                      download="quiz_import_template.csv"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      แม่แบบ .CSV
                    </a>
                  </div>
                </div>

                {/* IMPORT MODE SELECTION */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกรูปแบบการนำเข้า (Import Mode)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setImportMode("append")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        importMode === "append"
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "append"}
                        onChange={() => setImportMode("append")}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold">เพิ่มต่อท้าย (Append)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          เพิ่มข้อสอบใหม่ต่อท้ายชุดเดิมที่มีอยู่ {activeQuiz.questions?.length || 0} ข้อ
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setImportMode("replace")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        importMode === "replace"
                          ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400">แทนที่ทั้งหมด (Replace)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          ล้างข้อสอบเดิมทั้งหมดในชุดนี้ แล้วใส่ข้อสอบใหม่จากไฟล์
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DRAG & DROP FILE ZONE */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    อัปโหลดไฟล์ (.xlsx, .xls, .csv)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                      isDragOverQuiz
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[0.99]"
                        : "border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                    {importFile ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {importFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          ขนาด {(importFile.size / 1024).toFixed(1)} KB · คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          รองรับไฟล์ Excel (.xlsx, .xls) และ CSV ขนาดไม่เกิน 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ERROR LIST BREAKDOWN */}
                {importErrors.length > 0 && (
                  <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>พบข้อผิดพลาด {importErrors.length} รายการในไฟล์:</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs">
                      {importErrors.map((err, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-[11px] text-red-700 dark:text-red-300 bg-white/60 dark:bg-red-900/20 p-2 rounded-xl border border-red-100 dark:border-red-900/40"
                        >
                          <span className="font-bold shrink-0">แถวที่ {err.row}:</span>
                          <span>{err.error}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-500 dark:text-red-400">
                      💡 กรุณาแก้ไขข้อผิดพลาดในไฟล์ Excel/CSV ตามแถวที่ระบุ แล้วอัปโหลดใหม่อีกครั้ง
                    </p>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  disabled={isUploadingQuiz}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleImportQuizSubmit}
                  disabled={!importFile || isUploadingQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {isUploadingQuiz ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังนำเข้าข้อสอบ...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      เริ่มนำเข้าข้อสอบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL 3: AI QUIZ GENERATION SETTINGS MODAL --- */}
        {showAIGenModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      Google Gemini AI Generator
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      สร้างชุดแบบทดสอบอัตโนมัติด้วย AI
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAIGenModal(false)}
                  disabled={isGeneratingAI}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* FORM BODY */}
              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
                {/* QUESTION COUNT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    จำนวนข้อที่ต้องการสร้าง
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[3, 5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAiGenForm({ ...aiGenForm, question_count: num })}
                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                          aiGenForm.question_count === num
                            ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/40"
                        }`}
                      >
                        {num} ข้อ
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIFFICULTY */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ระดับความยากของคำถาม
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "EASY", label: "ง่าย", desc: "วัดความจำ & นิยาม" },
                      { id: "MEDIUM", label: "ปานกลาง", desc: "วัดความเข้าใจ & ประยุกต์" },
                      { id: "HARD", label: "ท้าทาย", desc: "วิเคราะห์ & แก้ปัญหา" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setAiGenForm({ ...aiGenForm, difficulty: d.id })}
                        className={`p-2.5 rounded-xl text-left transition border ${
                          aiGenForm.difficulty === d.id
                            ? "bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-900 dark:text-purple-200"
                            : "border-slate-200 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{d.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* QUESTION TYPE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ประเภทข้อสอบ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "MULTIPLE_CHOICE", label: "ปรนัย 4 ตัวเลือก" },
                      { id: "TRUE_FALSE", label: "ถูก / ผิด (T/F)" },
                      { id: "MIXED", label: "ผสมผสาน" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAiGenForm({ ...aiGenForm, question_type: t.id })}
                        className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition border ${
                          aiGenForm.question_type === t.id
                            ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/40"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DETECTED LESSON GROUNDING INFO BOX */}
                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-1">
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    ระบบสร้างข้อสอบแบบ Strict Content Grounding
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    AI จะวิเคราะห์เนื้อหาจริงจากบทเรียนเรื่อง &quot;{lessonTitle}&quot; รวมถึงเอกสารสไลด์ PDF และคลิปวิดีโอ (YouTube/MP4) ที่ผูกอยู่กับบทเรียนนี้ เพื่อออกข้อสอบที่ตรงกับเนื้อหา 100%
                  </p>
                </div>

                {/* CONTENT SOURCES TOGGLES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ดึงเนื้อหาข้อความ
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ข้อความในบทเรียน
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiGenForm.include_lesson_text}
                      onChange={(e) => setAiGenForm({ ...aiGenForm, include_lesson_text: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ดึงสไลด์ PDF & คลิปวิดีโอ
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Multimodal Analysis
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiGenForm.include_lesson_media}
                      onChange={(e) => setAiGenForm({ ...aiGenForm, include_lesson_media: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>

                {/* OPTIONAL FILE ATTACHMENT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>แนบไฟล์เอกสารเสริมเฉพาะ (PDF / TXT)</span>
                    <span className="text-[10px] text-slate-400 font-normal">ระบุหรือไม่ก็ได้ (สูงสุด 25MB)</span>
                  </label>
                  <input
                    ref={aiFileInputRef}
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAiFile(e.target.files[0])
                      }
                    }}
                    className="hidden"
                  />
                  {aiFile ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-xs">
                      <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold truncate">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate">{aiFile.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          ({(aiFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiFile(null)
                          if (aiFileInputRef.current) aiFileInputRef.current.value = ""
                        }}
                        className="text-red-500 hover:text-red-700 p-1 font-bold text-xs"
                      >
                        ลบออก
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => aiFileInputRef.current?.click()}
                      className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/30"
                    >
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        คลิกเพื่อแนบไฟล์ PDF หรือ Text เพิ่มเติมสำหรับชุดนี้
                      </p>
                    </div>
                  )}
                </div>

                {/* CUSTOM INSTRUCTIONS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>คำสั่งพิเศษเพิ่มเติม (Prompt Guidance)</span>
                    <span className="text-[10px] text-slate-400 font-normal">ระบุหรือไม่ก็ได้</span>
                  </label>
                  <textarea
                    rows={2}
                    value={aiGenForm.custom_instructions}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, custom_instructions: e.target.value })}
                    placeholder="เช่น เน้นออกข้อสอบเรื่องการคำนวณ, ห้ามมีตัวเลือกคำตอบที่เป็นคำศัพท์ภาษาอังกฤษ"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* CUSTOM CONTEXT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>เนื้อหาเสริมเฉพาะบทเรียน (Additional Content)</span>
                    <span className="text-[10px] text-slate-400 font-normal">ระบุหรือไม่ก็ได้</span>
                  </label>
                  <textarea
                    rows={2}
                    value={aiGenForm.custom_context}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, custom_context: e.target.value })}
                    placeholder="ใส่เนื้อหาเพิ่มเติม หรือกรณีที่ต้องการป้อนข้อความสรุปเพิ่มเติมเอง"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAIGenModal(false)}
                  disabled={isGeneratingAI}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI กำลังประมวลผลสร้างข้อสอบ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      🚀 เริ่มสร้างข้อสอบ ({aiGenForm.question_count} ข้อ)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL 4: AI QUIZ PREVIEW & EDIT MODAL --- */}
        {showAIPreviewModal && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      AI Generated Questions Preview
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      ตรวจสอบและปรับแต่งข้อสอบที่ AI สร้างขึ้น ({aiGeneratedQuestions.length} ข้อ)
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddAIDraftQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold transition border border-purple-200 dark:border-purple-800"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    เพิ่มข้อเอง
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAIPreviewModal(false)}
                    disabled={isSavingAIQuestions}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* QUESTIONS LIST */}
              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
                {aiGeneratedQuestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    ไม่มีรายการข้อสอบ (ถูกลบออกทั้งหมด)
                  </div>
                ) : (
                  aiGeneratedQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/20 space-y-3"
                    >
                      {/* QUESTION CARD HEADER */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                            {qIdx + 1}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {q.question_type === "TRUE_FALSE" ? "ถูก / ผิด" : "ปรนัย 4 ตัวเลือก"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-500 text-[11px]">คะแนน:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={q.points}
                              onChange={(e) => handleAIQuestionChange(qIdx, "points", parseInt(e.target.value) || 1)}
                              className="w-12 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-center text-xs font-bold bg-white dark:bg-slate-800"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAIQuestion(qIdx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                            title="ลบข้อนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* QUESTION TEXT */}
                      <div>
                        <textarea
                          rows={2}
                          value={q.question_text}
                          onChange={(e) => handleAIQuestionChange(qIdx, "question_text", e.target.value)}
                          placeholder="พิมพ์โจทย์คำถาม..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                        />
                      </div>

                      {/* OPTIONS */}
                      {q.question_type === "TRUE_FALSE" ? (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            กำหนดเฉลยที่ถูกต้อง:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {["จริง", "เท็จ"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAIQuestionChange(qIdx, "correct_answer", opt)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                                  q.correct_answer === opt
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span>{opt}</span>
                                {q.correct_answer === opt && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            ตัวเลือกคำตอบ (คลิกเครื่องหมายถูกเพื่อกำหนดเฉลย):
                          </label>
                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correct_answer === opt
                              const labels = ["ก", "ข", "ค", "ง", "จ", "ฉ"]
                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="w-6 text-center text-xs font-bold text-slate-500">
                                    {labels[optIdx] || optIdx + 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleAIOptionChange(qIdx, optIdx, e.target.value)}
                                    placeholder={`ตัวเลือก ${labels[optIdx] || optIdx + 1}`}
                                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none ${
                                      isCorrect
                                        ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                                        : "border-slate-200 dark:border-slate-700"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAIQuestionChange(qIdx, "correct_answer", opt)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                                      isCorrect
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {isCorrect ? "เฉลย" : "เลือกเฉลย"}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* EXPLANATION */}
                      {q.explanation && (
                        <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                          <span className="font-bold flex items-center gap-1">
                            💡 คำอธิบายเฉลย:
                          </span>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* FOOTER & SAVE MODE */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกรูปแบบการบันทึก:
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="aiSaveMode"
                        checked={aiSaveMode === "append"}
                        onChange={() => setAiSaveMode("append")}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>เพิ่มต่อท้าย ({activeQuiz?.questions?.length || 0} ข้อเดิม)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400">
                      <input
                        type="radio"
                        name="aiSaveMode"
                        checked={aiSaveMode === "replace"}
                        onChange={() => setAiSaveMode("replace")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>แทนที่ข้อสอบเดิมทั้งหมด</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAIPreviewModal(false)}
                    disabled={isSavingAIQuestions}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAIBatch}
                    disabled={isSavingAIQuestions || aiGeneratedQuestions.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
                  >
                    {isSavingAIQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังบันทึกข้อสอบ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        💾 บันทึกลงชุดแบบทดสอบ ({aiGeneratedQuestions.length} ข้อ)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
