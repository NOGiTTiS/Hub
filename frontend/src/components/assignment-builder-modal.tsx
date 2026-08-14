"use client"

import React, { useState, useEffect } from "react"
import { toast } from "@/lib/toast"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  X,
  PlusCircle,
  Trash2,
  Edit,
  Save,
  FileCheck2,
  Calendar,
  Award,
  Loader2,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react"

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
  student?: {
    first_name: string
    last_name: string
    grade_level?: string
    classroom?: string
  }
}

interface Assignment {
  id: string
  lesson_id: string
  title: string
  instructions: string
  max_score: number
  due_date?: string
  submissions_count?: number
}

interface AssignmentBuilderModalProps {
  lessonId: string
  lessonTitle: string
  onClose: () => void
}

export function AssignmentBuilderModal({
  lessonId,
  lessonTitle,
  onClose,
}: AssignmentBuilderModalProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "submissions">("edit")

  // Form State
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    max_score: 10,
    due_date: "",
  })

  // Submissions State
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null)
  const [gradeForm, setGradeForm] = useState({ score: 10, feedback: "" })
  const [isSavingGrade, setIsSavingGrade] = useState(false)

  const fetchAssignments = async () => {
    setIsLoading(true)
    const res = await apiFetch<Assignment[]>(`/api/teacher/lessons/${lessonId}/assignments`)
    if (res.success && res.data) {
      setAssignments(res.data)
      if (res.data.length > 0) {
        const a = res.data[0]
        setActiveAssignment(a)
        setForm({
          title: a.title,
          instructions: a.instructions,
          max_score: a.max_score,
          due_date: a.due_date ? a.due_date.split("T")[0] : "",
        })
      } else {
        setActiveAssignment(null)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchAssignments()
  }, [lessonId])

  const fetchSubmissions = async (assignmentId: string) => {
    setIsLoadingSubmissions(true)
    const res = await apiFetch<Submission[]>(`/api/teacher/assignments/${assignmentId}/submissions`)
    if (res.success && res.data) {
      setSubmissions(res.data)
    }
    setIsLoadingSubmissions(false)
  }

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.instructions.trim()) {
      toast.error("กรุณากรอกหัวข้อและคำชี้แจงการบ้าน")
      return
    }

    setIsSaving(true)
    const payload = {
      title: form.title,
      instructions: form.instructions,
      max_score: form.max_score,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    }

    if (activeAssignment) {
      const res = await apiFetch(`/api/teacher/assignments/${activeAssignment.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      if (res.success) {
        toast.success("บันทึกการแก้ไขการบ้านเรียบร้อยแล้ว")
        fetchAssignments()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึกการบ้าน")
      }
    } else {
      const res = await apiFetch(`/api/teacher/lessons/${lessonId}/assignments`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      if (res.success) {
        toast.success("สร้างหัวข้อการบ้านเรียบร้อยแล้ว")
        fetchAssignments()
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการสร้างการบ้าน")
      }
    }
    setIsSaving(false)
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("คุณต้องการลบการบ้านนี้ใช่หรือไม่?")) return
    const res = await apiFetch(`/api/teacher/assignments/${id}`, {
      method: "DELETE",
    })
    if (res.success) {
      toast.success("ลบการบ้านเรียบร้อยแล้ว")
      fetchAssignments()
    } else {
      toast.error(res.message || "ไม่สามารถลบการบ้านได้")
    }
  }

  const handleOpenGradeModal = (sub: Submission) => {
    setGradingSubmission(sub)
    setGradeForm({
      score: sub.score !== undefined && sub.score !== null ? sub.score : (activeAssignment?.max_score || 10),
      feedback: sub.feedback || "",
    })
  }

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gradingSubmission) return

    setIsSavingGrade(true)
    const res = await apiFetch(`/api/teacher/submissions/${gradingSubmission.id}/grade`, {
      method: "POST",
      body: JSON.stringify(gradeForm),
    })

    if (res.success) {
      toast.success("บันทึกผลการตรวจการบ้านเรียบร้อยแล้ว")
      setGradingSubmission(null)
      if (activeAssignment) fetchSubmissions(activeAssignment.id)
    } else {
      toast.error(res.message || "เกิดข้อผิดพลาดในการบันทึกคะแนน")
    }
    setIsSavingGrade(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Assignment Builder · {lessonTitle}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                ระบบจัดการและการตรวจการบ้าน
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
            กำลังโหลดข้อมูลการบ้าน...
          </div>
        ) : !activeAssignment ? (
          /* CREATE FIRST ASSIGNMENT */
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
            <FileCheck2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white">
              บทเรียนนี้ยังไม่มีการมอบหมายการบ้าน
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              สร้างการบ้านหรือโจทย์แบบฝึกหัดให้นักเรียนส่งงาน พร้อมระบบตรวจและให้คะแนน
            </p>

            <form onSubmit={handleSaveAssignment} className="max-w-lg mx-auto space-y-4 pt-2 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อการบ้าน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การบ้านที่ 1: เขียนโปรแกรมคำนวณเกรดเฉลี่ย"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  คำสั่งและรายละเอียดการบ้าน <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="อธิบายสิ่งที่ต้องการให้นักเรียนทำ รูปแบบไฟล์ที่ต้องการส่ง..."
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คะแนนเต็ม
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_score}
                    onChange={(e) =>
                      setForm({ ...form, max_score: parseInt(e.target.value) || 100 })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    กำหนดส่ง (Due Date)
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
              >
                {isSaving ? "กำลังสร้าง..." : "สร้างการบ้านตอนนี้"}
              </button>
            </form>
          </div>
        ) : (
          /* ASSIGNMENT TABS & CONTENT */
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "edit"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                รายละเอียดการบ้าน
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("submissions")
                  if (activeAssignment) fetchSubmissions(activeAssignment.id)
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "submissions"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                รายการส่งงานของนักเรียน
              </button>

              <button
                type="button"
                onClick={() => handleDeleteAssignment(activeAssignment.id)}
                className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 p-2 rounded-lg"
                title="ลบการบ้านนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: EDIT FORM */}
            {activeTab === "edit" && (
              <form onSubmit={handleSaveAssignment} className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หัวข้อการบ้าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คำสั่งและรายละเอียดการบ้าน <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      คะแนนเต็ม
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.max_score}
                      onChange={(e) =>
                        setForm({ ...form, max_score: parseInt(e.target.value) || 100 })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      กำหนดส่ง (Due Date)
                    </label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไขการบ้าน"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SUBMISSIONS LIST */}
            {activeTab === "submissions" && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingSubmissions ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    กำลังโหลดรายการส่งงาน...
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    ยังไม่มีนักเรียนส่งการบ้านชิ้นนี้
                  </p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">นักเรียน</th>
                          <th className="p-3">ชั้น / ห้อง</th>
                          <th className="p-3">เนื้อหา / ไฟล์แนบ</th>
                          <th className="p-3 text-center">คะแนน</th>
                          <th className="p-3 text-center">สถานะ</th>
                          <th className="p-3 text-right">ตรวจงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {sub.student?.first_name} {sub.student?.last_name}
                            </td>
                            <td className="p-3 text-slate-500">
                              {sub.student?.grade_level}/{sub.student?.classroom || "-"}
                            </td>
                            <td className="p-3 max-w-xs">
                              {sub.submitted_text && (
                                <p className="truncate text-slate-700 dark:text-slate-300">
                                  {sub.submitted_text}
                                </p>
                              )}
                              {sub.file_url && (
                                <a
                                  href={getMediaUrl(sub.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline font-semibold mt-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" /> เปิดไฟล์แนบ
                                </a>
                              )}
                            </td>
                            <td className="p-3 font-bold text-center text-slate-900 dark:text-white">
                              {sub.score !== undefined && sub.score !== null ? `${sub.score}/${activeAssignment.max_score}` : "-"}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sub.status === "GRADED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {sub.status === "GRADED" ? "ตรวจแล้ว" : "ยังไม่ตรวจ"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenGradeModal(sub)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow"
                              >
                                {sub.status === "GRADED" ? "แก้ไขคะแนน" : "ตรวจและให้คะแนน"}
                              </button>
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

        {/* GRADING MODAL */}
        {gradingSubmission && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  ตรวจการบ้าน: {gradingSubmission.student?.first_name} {gradingSubmission.student?.last_name}
                </h4>
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* STUDENT WORK PREVIEW */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                {gradingSubmission.submitted_text && (
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">ข้อความคำตอบ:</span>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {gradingSubmission.submitted_text}
                    </p>
                  </div>
                )}
                {gradingSubmission.file_url && (
                  <div>
                    <a
                      href={getMediaUrl(gradingSubmission.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ดูไฟล์แนบที่นักเรียนส่ง
                    </a>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คะแนนที่ได้ (เต็ม {activeAssignment?.max_score || 100})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={activeAssignment?.max_score || 100}
                    required
                    value={gradeForm.score}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, score: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คำติชมและข้อเสนอแนะ (Feedback)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="พิมพ์คำแนะนำ ข้อดี หรือสิ่งที่ควรปรับปรุงแก่นักเรียน..."
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingGrade}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
                  >
                    {isSavingGrade ? "กำลังบันทึก..." : "บันทึกผลการตรวจ"}
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
