"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "@/lib/toast"
import { apiFetch } from "@/lib/api"
import {
  Layers,
  PlusCircle,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Sparkles,
  FolderPlus,
  Palette,
  AlertTriangle,
} from "lucide-react"

export interface CourseCategory {
  id: string
  name: string
  description?: string
  color: string
  order_index: number
  created_at: string
  updated_at: string
  courses_count?: number
}

const PRESET_COLORS = [
  { name: "Blue (น้ำเงิน)", value: "#2563eb" },
  { name: "Purple (ม่วง)", value: "#7c3aed" },
  { name: "Emerald (เขียวมรกต)", value: "#059669" },
  { name: "Amber (ส้มอำพัน)", value: "#d97706" },
  { name: "Red (แดง)", value: "#dc2626" },
  { name: "Pink (ชมพู)", value: "#db2777" },
  { name: "Green (เขียว)", value: "#16a34a" },
  { name: "Orange (ส้ม)", value: "#ea580c" },
  { name: "Slate (เทาเข้ม)", value: "#4b5563" },
  { name: "Indigo (คราม)", value: "#4f46e5" },
  { name: "Cyan (ฟ้า)", value: "#0891b2" },
  { name: "Rose (กุหลาบ)", value: "#e11d48" },
]

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null)

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<CourseCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#2563eb",
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    const res = await apiFetch<CourseCategory[]>("/api/categories")
    if (res.success && res.data) {
      setCategories(res.data)
    } else {
      toast.error(res.message || "ไม่สามารถดึงข้อมูลหมวดหมู่ได้")
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Filter categories by search
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      description: "",
      color: "#2563eb",
    })
    setShowAddModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (cat: CourseCategory) => {
    setSelectedCategory(cat)
    setFormData({
      name: cat.name,
      description: cat.description || "",
      color: cat.color || "#2563eb",
    })
    setShowEditModal(true)
  }

  // Submit Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("กรุณาระบุชื่อหมวดหมู่")
      return
    }

    setFormSubmitting(true)
    const res = await apiFetch("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
      }),
    })

    if (res.success) {
      toast.success("สร้างหมวดหมู่รายวิชาสำเร็จเรียบร้อย")
      setShowAddModal(false)
      fetchCategories()
    } else {
      toast.error(res.message || "ไม่สามารถสร้างหมวดหมู่ได้")
    }
    setFormSubmitting(false)
  }

  // Submit Edit Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    if (!formData.name.trim()) {
      toast.error("กรุณาระบุชื่อหมวดหมู่")
      return
    }

    setFormSubmitting(true)
    const res = await apiFetch(`/api/admin/categories/${selectedCategory.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
      }),
    })

    if (res.success) {
      toast.success("แก้ไขข้อมูลหมวดหมู่สำเร็จเรียบร้อย")
      setShowEditModal(false)
      setSelectedCategory(null)
      fetchCategories()
    } else {
      toast.error(res.message || "ไม่สามารถอัปเดตหมวดหมู่ได้")
    }
    setFormSubmitting(false)
  }

  // Submit Delete Category
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    setIsDeleting(true)
    const res = await apiFetch(`/api/admin/categories/${deletingCategory.id}`, {
      method: "DELETE",
    })

    if (res.success) {
      toast.success("ลบหมวดหมู่รายวิชาสำเร็จเรียบร้อย")
      setDeletingCategory(null)
      fetchCategories()
    } else {
      toast.error(res.message || "ไม่สามารถลบหมวดหมู่ได้")
    }
    setIsDeleting(false)
  }

  // Move Category Up / Down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === categories.length - 1) return

    const newCategories = [...categories]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    // Swap
    const temp = newCategories[index]
    newCategories[index] = newCategories[targetIndex]
    newCategories[targetIndex] = temp

    // Update order_index for all
    const items = newCategories.map((cat, idx) => ({
      id: cat.id,
      order_index: idx + 1,
    }))

    setCategories(newCategories)
    setIsReordering(true)

    const res = await apiFetch("/api/admin/categories/reorder", {
      method: "POST",
      body: JSON.stringify(items),
    })

    if (res.success) {
      toast.success("บันทึกลำดับหมวดหมู่สำเร็จ")
    } else {
      toast.error(res.message || "ไม่สามารถบันทึกลำดับได้")
      fetchCategories() // Revert on failure
    }
    setIsReordering(false)
  }

  const totalCoursesInCategories = categories.reduce((sum, cat) => sum + (cat.courses_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              จัดการหมวดหมู่รายวิชา (Course Categories)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              กำหนดและควบคุมกลุ่มสาระการเรียนรู้/หมวดหมู่วิชาสำหรับหลักสูตรทั้งโรงเรียน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-medium shadow-sm transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>เพิ่มหมวดหมู่ใหม่</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              หมวดหมู่ทั้งหมด
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {categories.length} <span className="text-sm font-normal text-slate-500">หมวดหมู่</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              วิชาที่จัดหมวดหมู่แล้ว
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {totalCoursesInCategories} <span className="text-sm font-normal text-slate-500">วิชา</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              การจัดเรียงลำดับ
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
            ใช้ปุ่ม <ArrowUp className="w-3.5 h-3.5 inline mx-0.5" /> และ <ArrowDown className="w-3.5 h-3.5 inline mx-0.5" /> เพื่อปรับลำดับการแสดงผล
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือคำอธิบายหมวดหมู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            แสดงผล {filteredCategories.length} จากทั้งหมด {categories.length} หมวดหมู่
          </div>
        </div>

        {/* Categories Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">ลำดับ</th>
                <th className="py-3.5 px-4">ชื่อหมวดหมู่ / กลุ่มสาระ</th>
                <th className="py-3.5 px-4">คำอธิบาย</th>
                <th className="py-3.5 px-4 text-center">สี Badge</th>
                <th className="py-3.5 px-4 text-center">จำนวนวิชา</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                    <p>กำลังโหลดข้อมูลหมวดหมู่...</p>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FolderPlus className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {searchTerm ? "ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา" : "ยังไม่มีหมวดหมู่รายวิชา"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? "ลองเปลี่ยนคำค้นหาใหม่" : "คลิกปุ่ม \"เพิ่มหมวดหมู่ใหม่\" เพื่อเริ่มต้นสร้าง"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, idx) => {
                  const actualIndex = categories.findIndex((c) => c.id === cat.id)
                  const isFirst = actualIndex === 0
                  const isLast = actualIndex === categories.length - 1

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Order & Reorder controls */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs text-slate-400 w-4 text-center">
                            {idx + 1}
                          </span>
                          {!searchTerm && (
                            <div className="flex flex-col gap-0.5 ml-1">
                              <button
                                onClick={() => handleMoveOrder(actualIndex, "up")}
                                disabled={isFirst || isReordering}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                title="เลื่อนขึ้น"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOrder(actualIndex, "down")}
                                disabled={isLast || isReordering}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                title="เลื่อนลง"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category Name & Badge Preview */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color || "#2563eb" }}
                          />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {cat.name}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-500 dark:text-slate-400 truncate">
                        {cat.description || "-"}
                      </td>

                      {/* Color Preview Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${cat.color || "#2563eb"}15`,
                            color: cat.color || "#2563eb",
                            border: `1px solid ${cat.color || "#2563eb"}30`,
                          }}
                        >
                          {cat.name}
                        </span>
                      </td>

                      {/* Courses Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          {cat.courses_count || 0} วิชา
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                            title="แก้ไขหมวดหมู่"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="ลบหมวดหมู่"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Add / Edit Category Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {showAddModal ? "เพิ่มหมวดหมู่รายวิชาใหม่" : "แก้ไขข้อมูลหมวดหมู่รายวิชา"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleCreateCategory : handleUpdateCategory} className="p-5 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  ชื่อหมวดหมู่ / กลุ่มสาระการเรียนรู้ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี, ภาษาญี่ปุ่น"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  คำอธิบายหมวดหมู่ (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุคำอธิบายสั้นๆ เกี่ยวกับกลุ่มวิชานี้..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none"
                />
              </div>

              {/* Color Presets & Picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  สีประจำหมวดหมู่ (Theme Color)
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.value })}
                      className={`h-8 rounded-lg transition-all flex items-center justify-center ${
                        formData.color === preset.value
                          ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-105"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    >
                      {formData.color === preset.value && (
                        <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1 px-3 py-2 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-2">
                  ตัวอย่างการแสดงผล Badge บนหน้าเว็บ:
                </span>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${formData.color}15`,
                    color: formData.color,
                    border: `1px solid ${formData.color}35`,
                  }}
                >
                  {formData.name.trim() || "ตัวอย่างชื่อหมวดหมู่"}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{showAddModal ? "สร้างหมวดหมู่" : "บันทึกการแก้ไข"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white">
              ยืนยันการลบหมวดหมู่รายวิชา?
            </h3>

            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-2">
              คุณต้องการลบหมวดหมู่ <span className="font-semibold text-slate-900 dark:text-white">"{deletingCategory.name}"</span> ใช่หรือไม่?
            </p>

            {deletingCategory.courses_count && deletingCategory.courses_count > 0 ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ มีรายวิชาจำนวน <strong>{deletingCategory.courses_count} วิชา</strong> ที่ผูกอยู่กับหมวดหมู่นี้ การลบจะทำให้วิชาเหล่านั้นเปลี่ยนเป็น "ไม่ระบุหมวดหมู่" (เนื้อหาคอร์สจะไม่ถูกลบ)
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium text-white shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>ยืนยันลบหมวดหมู่</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
