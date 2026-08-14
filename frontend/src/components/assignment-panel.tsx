"use client"

import React, { useState, useEffect } from "react"
import { toast } from "@/lib/toast"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  FileCheck2,
  Calendar,
  Award,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  Send,
  Loader2,
  Paperclip,
  ExternalLink,
} from "lucide-react"
import { FileUploader } from "@/components/file-uploader"

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  file_url?: string
  submitted_text?: string
  score?: number
  feedback?: string
  status: "SUBMITTED" | "GRADED"
  submitted_at: string
}

interface Assignment {
  id: string
  lesson_id: string
  title: string
  instructions: string
  max_score: number
  due_date?: string
  submission?: Submission | null
}

interface AssignmentPanelProps {
  lessonId: string
  onSubmissionSuccess?: () => void
}

export function AssignmentPanel({ lessonId, onSubmissionSuccess }: AssignmentPanelProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Forms for each assignment: assignmentId -> { text, file_url }
  const [forms, setForms] = useState<{
    [id: string]: { submitted_text: string; file_url: string }
  }>({})

  const fetchAssignments = async () => {
    setIsLoading(true)
    const res = await apiFetch<Assignment[]>(`/api/student/lessons/${lessonId}/assignment`)
    if (res.success && res.data) {
      setAssignments(res.data)
      const initialForms: { [id: string]: { submitted_text: string; file_url: string } } = {}
      res.data.forEach((a) => {
        initialForms[a.id] = {
          submitted_text: a.submission?.submitted_text || "",
          file_url: a.submission?.file_url || "",
        }
      })
      setForms(initialForms)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (lessonId) {
      fetchAssignments()
    }
  }, [lessonId])

  const handleSubmit = async (assignmentId: string) => {
    const currentForm = forms[assignmentId] || { submitted_text: "", file_url: "" }
    if (!currentForm.submitted_text.trim() && !currentForm.file_url.trim()) {
      toast.error("กรุณากรอกข้อความคำตอบ หรืออัปโหลดไฟล์แนบการบ้าน")
      return
    }

    setSubmittingId(assignmentId)
    const res = await apiFetch(`/api/student/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify(currentForm),
    })

    if (res.success) {
      toast.success("ส่งการบ้านเรียบร้อยแล้ว!")
      fetchAssignments()
      if (onSubmissionSuccess) onSubmissionSuccess()
    } else {
      toast.error(res.message || "เกิดข้อผิดพลาดในการส่งการบ้าน")
    }
    setSubmittingId(null)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        กำลังโหลดข้อมูลการบ้าน...
      </div>
    )
  }

  if (assignments.length === 0) {
    return null // No assignment in this lesson
  }

  return (
    <div className="space-y-6">
      {assignments.map((assignment) => {
        const sub = assignment.submission
        const isGraded = sub?.status === "GRADED"
        const isSubmitted = !!sub
        const form = forms[assignment.id] || { submitted_text: "", file_url: "" }

        return (
          <div
            key={assignment.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6"
          >
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    แบบฝึกหัดและการบ้าน (Assignment)
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {assignment.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  คะแนนเต็ม {assignment.max_score} คะแนน
                </span>

                {assignment.due_date && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    กำหนดส่ง: {new Date(assignment.due_date).toLocaleDateString("th-TH")}
                  </span>
                )}
              </div>
            </div>

            {/* INSTRUCTIONS */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                คำสั่งและรายละเอียดการบ้าน:
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>

            {/* GRADING FEEDBACK BANNER (IF GRADED) */}
            {isGraded && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ผลการตรวจและประเมินคะแนนแล้ว
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow">
                    {sub?.score} / {assignment.max_score} คะแนน
                  </div>
                </div>

                {sub?.feedback && (
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-xs">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      คำติชม / ข้อเสนอแนะจากครูผู้สอน:
                    </span>
                    <p className="text-emerald-950 dark:text-emerald-300 italic bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800">
                      "{sub.feedback}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SUBMISSION FORM */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-brand-600" />
                  ส่งงานการบ้านของคุณ
                </h4>

                {isSubmitted && !isGraded && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    ✓ ส่งงานแล้ว (รอครูตรวจ) · เมื่อ {new Date(sub!.submitted_at).toLocaleString("th-TH")}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ข้อความคำตอบ หรือลิงก์โครงงาน (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="พิมพ์คำตอบ อธิบายวิธีคิด หรือวางลิงก์ GitHub / Google Drive..."
                  value={form.submitted_text}
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      [assignment.id]: {
                        ...form,
                        submitted_text: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ไฟล์แนบการบ้าน (PDF / ภาพ / เอกสารงาน)
                </label>
                <FileUploader
                  category="pdf"
                  label="อัปโหลดไฟล์การบ้าน (PDF หรือเอกสาร)"
                  currentValue={form.file_url}
                  onUploadSuccess={(url) =>
                    setForms({
                      ...forms,
                      [assignment.id]: {
                        ...form,
                        file_url: url,
                      },
                    })
                  }
                />
                {form.file_url && (
                  <div className="pt-1">
                    <a
                      href={getMediaUrl(form.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> เปิดดูไฟล์ที่แนบไว้ ({form.file_url.split("/").pop()})
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  disabled={submittingId === assignment.id}
                  onClick={() => handleSubmit(assignment.id)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submittingId === assignment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitted ? "อัปเดตการส่งงานใหม่" : "ส่งการบ้าน"}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
