"use client"

import React, { useState, useEffect, useRef } from "react"
import { apiFetch } from "@/lib/api"
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  RotateCcw,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Send,
  Sparkles,
  Award,
} from "lucide-react"

interface Question {
  id: string
  question_text: string
  question_type: string
  options: string[]
  points: number
}

interface Attempt {
  id: string
  score: number
  passed: boolean
  started_at: string
  completed_at?: string
}

interface QuizData {
  id: string
  lesson_id: string
  title: string
  time_limit_minutes: number
  passing_score: number
  max_attempts?: number
  attempts_count?: number
  can_attempt?: boolean
  total_points: number
  questions: Question[]
  attempts: Attempt[]
}

interface QuestionReview {
  question_id: string
  question_text: string
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  points_earned: number
  max_points: number
}

interface QuizResult {
  attempt: Attempt
  earned_points: number
  total_points: number
  score_percent: number
  passed: boolean
  passing_score: number
  reviews: QuestionReview[]
}

interface QuizPlayerProps {
  lessonId: string
  onQuizCompleted?: () => void
}

export function QuizPlayer({ lessonId, onQuizCompleted }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTakingQuiz, setIsTakingQuiz] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchQuiz = async () => {
    setIsLoading(true)
    const res = await apiFetch<QuizData>(`/api/student/lessons/${lessonId}/quiz`)
    if (res.success && res.data) {
      setQuiz(res.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (lessonId) {
      fetchQuiz()
      setIsTakingQuiz(false)
      setResult(null)
      setAnswers({})
    }
  }, [lessonId])

  // Timer countdown
  useEffect(() => {
    if (!isTakingQuiz || timeLeftSeconds <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTakingQuiz, timeLeftSeconds])

  const handleStartQuiz = () => {
    if (!quiz || quiz.questions.length === 0) return
    setAnswers({})
    setResult(null)
    setCurrentQIndex(0)
    setTimeLeftSeconds((quiz.time_limit_minutes || 15) * 60)
    setIsTakingQuiz(true)
  }

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers({
      ...answers,
      [questionId]: option,
    })
  }

  const handleSubmitQuiz = async () => {
    if (!quiz) return
    if (timerRef.current) clearInterval(timerRef.current)

    setIsSubmitting(true)
    const res = await apiFetch<QuizResult>(`/api/student/quizzes/${quiz.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    })

    if (res.success && res.data) {
      setResult(res.data)
      setIsTakingQuiz(false)
      fetchQuiz() // reload attempts
      if (onQuizCompleted) onQuizCompleted()
    }
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2 font-mono text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        กำลังโหลดแบบทดสอบ...
      </div>
    )
  }

  if (!quiz) {
    return null // No quiz attached to this lesson
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Interactive Quiz & Assessment
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {quiz.title}
            </h3>
          </div>
        </div>

        {isTakingQuiz ? (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-mono text-sm font-bold border transition ${
              timeLeftSeconds < 120
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-800 animate-pulse"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            เวลาที่เหลือ: {formatTimer(timeLeftSeconds)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <span>{quiz.questions.length} ข้อ</span>
            <span>•</span>
            <span>{quiz.time_limit_minutes} นาที</span>
            <span>•</span>
            <span>เกณฑ์ผ่าน {quiz.passing_score}%</span>
            <span>•</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {quiz.max_attempts && quiz.max_attempts > 0
                ? `จำกัด ${quiz.max_attempts} ครั้ง (${quiz.attempts?.length || 0}/${quiz.max_attempts})`
                : "ทำได้ไม่จำกัดครั้ง"}
            </span>
          </div>
        )}
      </div>

      {/* STATE 1: INTRO / PRE-QUIZ SCREEN */}
      {!isTakingQuiz && !result && (
        <div className="space-y-6">
          {quiz.max_attempts && quiz.max_attempts > 0 && (quiz.attempts?.length || 0) >= quiz.max_attempts && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                คุณทำแบบทดสอบครบตามโควตาที่กำหนดแล้ว ({quiz.max_attempts} ครั้ง) คุณสามารถดูคะแนนและเฉลยจากประวัติด้านล่างได้
              </span>
            </div>
          )}

          <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                พร้อมที่จะทำแบบทดสอบหรือยัง?
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                เมื่อเริ่มทำแบบทดสอบ ระบบจะจับเวลา {quiz.time_limit_minutes} นาที และตรวจผลคะแนนทันทีหลังกดส่ง
                {quiz.max_attempts && quiz.max_attempts > 0 && (
                  <span className="block text-amber-600 dark:text-amber-400 font-bold mt-1">
                    (ทำไปแล้ว {quiz.attempts?.length || 0} จากสิทธิ์ทั้งหมด {quiz.max_attempts} ครั้ง)
                  </span>
                )}
              </p>
            </div>

            {quiz.max_attempts && quiz.max_attempts > 0 && (quiz.attempts?.length || 0) >= quiz.max_attempts ? (
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0">
                🔒 ครบจำนวน {quiz.max_attempts} ครั้งแล้ว
              </span>
            ) : (
              <button
                type="button"
                disabled={quiz.questions.length === 0}
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-900/20 transition shrink-0 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                {quiz.attempts && quiz.attempts.length > 0 ? "ทำแบบทดสอบอีกครั้ง" : "เริ่มทำแบบทดสอบ"}
              </button>
            )}
          </div>

          {/* PAST ATTEMPTS */}
          {quiz.attempts && quiz.attempts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ประวัติการทำแบบทดสอบของคุณ ({quiz.attempts.length} ครั้ง)
              </h4>
              <div className="space-y-2">
                {quiz.attempts.map((att, idx) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400">#{quiz.attempts.length - idx}</span>
                      <span className="text-slate-500">
                        {new Date(att.started_at).toLocaleString("th-TH")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {att.score}%
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                          att.passed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {att.passed ? "ผ่านเกณฑ์" : "ไม่ผ่าน"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 2: ACTIVE QUIZ TAKING */}
      {isTakingQuiz && quiz.questions.length > 0 && (
        <div className="space-y-6">
          {/* QUESTION PAGINATOR */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {quiz.questions.map((q, idx) => {
              const isAnswered = !!answers[q.id]
              const isCurrent = currentQIndex === idx
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                    isCurrent
                      ? "bg-amber-600 text-white shadow"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          {/* ACTIVE QUESTION */}
          {(() => {
            const currentQ = quiz.questions[currentQIndex]
            if (!currentQ) return null

            return (
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">
                      ข้อที่ {currentQIndex + 1} จาก {quiz.questions.length} ({currentQ.points} คะแนน)
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                      {currentQ.question_text}
                    </h4>
                  </div>
                </div>

                {/* OPTIONS */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, oIdx) => {
                    const isSelected = answers[currentQ.id] === opt
                    const label = String.fromCharCode(65 + oIdx) // A, B, C, D

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`w-full p-4 rounded-xl text-left border transition flex items-center gap-3.5 text-xs sm:text-sm font-medium ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-amber-400"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-amber-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* NAV & SUBMIT */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              ข้อก่อนหน้า
            </button>

            <div className="flex items-center gap-2">
              {currentQIndex < quiz.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow transition"
                >
                  ข้อถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitQuiz}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  ส่งคำตอบและตรวจคะแนน
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: RESULTS & REVIEWS */}
      {result && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-3xl border text-center space-y-4 ${
              result.passed
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
            }`}
          >
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-inner">
              {result.passed ? (
                <Trophy className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
              )}
            </div>

            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  result.passed
                    ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
                }`}
              >
                {result.passed ? "✓ ยินดีด้วย! คุณผ่านเกณฑ์" : "✕ ยังไม่ผ่านเกณฑ์"}
              </span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {result.score_percent}%
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                ทำได้ {result.earned_points} / {result.total_points} คะแนน (เกณฑ์ผ่าน {result.passing_score}%)
              </p>
            </div>

            <div className="pt-2">
              {quiz.max_attempts && quiz.max_attempts > 0 && (quiz.attempts?.length || 0) >= quiz.max_attempts ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                  🔒 ทำครบสิทธิ์ {quiz.max_attempts} ครั้งแล้ว
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow hover:opacity-90 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ทำแบบทดสอบใหม่อีกครั้ง
                </button>
              )}
            </div>
          </div>

          {/* DETAILED QUESTION REVIEWS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              เฉลยและตรวจสอบผลคำตอบรายข้อ ({result.reviews.length} ข้อ)
            </h4>

            <div className="space-y-3">
              {result.reviews.map((rev, idx) => (
                <div
                  key={rev.question_id}
                  className={`p-4 rounded-2xl border ${
                    rev.is_correct
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : "border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                  } space-y-2 text-xs`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {idx + 1}. {rev.question_text}
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                        rev.is_correct
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {rev.points_earned} / {rev.max_points} คะแนน
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        คำตอบของคุณ:
                      </span>
                      <span
                        className={`font-medium ${
                          rev.is_correct ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {rev.selected_answer || "(ไม่ได้เลือกตอบ)"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        คำตอบที่ถูกต้อง:
                      </span>
                      <span className="font-medium text-emerald-600">
                        {rev.correct_answer}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
