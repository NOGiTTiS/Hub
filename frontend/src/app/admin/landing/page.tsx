"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "@/lib/toast"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  LayoutTemplate,
  Sparkles,
  BarChart3,
  Layers,
  BookOpen,
  ListOrdered,
  HelpCircle,
  Megaphone,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  RotateCcw,
  Image as ImageIcon,
  Eye,
} from "lucide-react"

// Types for Section JSON items
type TabKey = "hero" | "stats" | "features" | "courses" | "steps" | "faq" | "cta"

interface StatItem {
  label: string
  value: string
  suffix: string
  icon: string
}

interface FeatureItem {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

interface StepItem {
  step: string
  title: string
  desc: string
}

interface FAQItem {
  question: string
  answer: string
}

type TabType = "hero" | "stats" | "features" | "courses" | "steps" | "faq" | "cta"

const DEFAULT_LANDING_CONFIG: Record<string, string> = {
  landing_hero_badge: "ระบบจัดการเรียนรู้ดิจิทัล LMS EdTech v1.0",
  landing_hero_title: "แพลตฟอร์มการเรียนรู้ออนไลน์",
  landing_hero_highlight: "เพื่อนักเรียนและคุณครูมัธยมศึกษา",
  landing_hero_subtitle:
    "รองรับการเรียนรู้แบบ On-Demand, Interactive Code Playground (Python / WASM), การส่งงานตรวจการบ้านออนไลน์ และการนำเข้าผู้ใช้แบบกลุ่มความเร็วสูง",
  landing_hero_cta_primary_text: "เข้าใช้งานระบบ (Login Portal)",
  landing_hero_cta_primary_link: "/login",
  landing_hero_cta_secondary_text: "สมัครสมาชิกนักเรียน",
  landing_hero_cta_secondary_link: "/register",
  landing_hero_image_url: "",

  landing_stats_enabled: "true",
  landing_stats_json: JSON.stringify([
    { label: "นักเรียนในระบบ", value: "2,000+", suffix: "คน", icon: "Users" },
    { label: "รายวิชาเรียนออนไลน์", value: "50+", suffix: "คอร์ส", icon: "BookOpen" },
    { label: "อาจารย์ผู้สอนคุณภาพ", value: "100+", suffix: "ท่าน", icon: "GraduationCap" },
    { label: "ความสำเร็จในการศึกษา", value: "100%", suffix: "", icon: "Award" },
  ]),

  landing_features_enabled: "true",
  landing_features_title: "ฟีเจอร์และนวัตกรรมการเรียนรู้ดิจิทัล",
  landing_features_subtitle:
    "ออกแบบมาเพื่อเพิ่มศักยภาพการเรียนการสอนสำหรับโรงเรียนมัธยมศึกษาในยุคดิจิทัลอย่างครบวงจร",
  landing_features_json: JSON.stringify([
    {
      id: "1",
      title: "ระบบสิทธิ์และการยืนยันตัวตน (RBAC)",
      description: "จำแนกสิทธิ์การเข้าใช้งานอย่างปลอดภัยด้วย JWT แยกหน้าที่นักเรียน ครู และผู้ดูแลระบบแบบเด็ดขาด 100%",
      icon: "ShieldCheck",
      color: "#2563eb",
    },
    {
      id: "2",
      title: "นำเข้าข้อมูลแบบกลุ่ม (Batch Import)",
      description: "รองรับการนำเข้ารายชื่อนักเรียนคราวละ 1,000+ บัญชีผ่านไฟล์ CSV / Excel จัดกลุ่มตามระดับชั้นและห้องเรียนทันที",
      icon: "FileCheck",
      color: "#059669",
    },
    {
      id: "3",
      title: "Interactive Code Playground",
      description: "ฝึกเขียนโค้ดภาษา Python บนเบราว์เซอร์ด้วย WebAssembly / Pyodide โดยตรง ไม่เปลืองทรัพยากรเซิร์ฟเวอร์",
      icon: "Code2",
      color: "#0284c7",
    },
    {
      id: "4",
      title: "ระบบการบ้านและการประเมินผล",
      description: "ส่งการบ้าน แนบไฟล์ ตรวจและให้คะแนนพร้อมคำติชมแบบ Real-time",
      icon: "FileText",
      color: "#7c3aed",
    },
    {
      id: "5",
      title: "แบบทดสอบออนไลน์จับเวลา (Quiz Engine)",
      description: "ระบบทำแบบทดสอบพร้อมตัวจับเวลานับถอยหลัง ตรวจเฉลยและสรุปคะแนนอัตโนมัติ",
      icon: "HelpCircle",
      color: "#ea580c",
    },
    {
      id: "6",
      title: "ระบบออกใบประกาศนียบัตร (Certificate)",
      description: "ออกเกียรติบัตรอัตโนมัติเมื่อเรียนครบ 100% พร้อมรหัสตรวจสอบความถูกต้องแบบสาธารณะ",
      icon: "Award",
      color: "#db2777",
    },
  ]),

  landing_courses_enabled: "true",
  landing_courses_title: "รายวิชาและคอร์สเรียนแนะนำ",
  landing_courses_subtitle: "เลือกเรียนรู้เนื้อหาบทเรียนคุณภาพจากคุณครูผู้สอนชั้นนำในโรงเรียน",

  landing_steps_enabled: "true",
  landing_steps_title: "เริ่มต้นการเรียนรู้ง่ายๆ ใน 4 ขั้นตอน",
  landing_steps_subtitle: "เส้นทางการเรียนรู้ที่สะดวก รวดเร็ว และเข้าถึงได้จากทุกอุปกรณ์",
  landing_steps_json: JSON.stringify([
    { step: "1", title: "เข้าสู่ระบบหรือลงทะเบียน", desc: "ล็อกอินด้วยอีเมลโรงเรียนหรือลงทะเบียนบัญชีนักเรียน" },
    { step: "2", title: "เลือกรายวิชาและเริ่มเรียน", desc: "เลือกคอร์สที่สนใจและเข้าเรียนเนื้อหาวิดีโอ สไลด์ หรือ Text" },
    { step: "3", title: "ส่งการบ้านและทำแบบทดสอบ", desc: "ฝึกฝนทักษะผ่านโจทย์ ฝึกเขียนโค้ด และทดสอบความรู้ท้ายบท" },
    { step: "4", title: "รับใบประกาศนียบัตร", desc: "เรียนจบครบ 100% รับ Certificate พร้อมรหัสตรวจสอบได้ทันที" },
  ]),

  landing_faq_enabled: "true",
  landing_faq_title: "คำถามที่พบบ่อย (FAQ)",
  landing_faq_subtitle: "ข้อสงสัยที่พบบ่อยเกี่ยวกับการใช้งานแพลตฟอร์ม TUNorth-Hub",
  landing_faq_json: JSON.stringify([
    {
      question: "หากลืมรหัสผ่านต้องทำอย่างไร?",
      answer: "สามารถติดต่อคุณครูผู้สอนหรือเจ้าหน้าที่ผู้ดูแลระบบ (Admin) ประจำโรงเรียนเพื่อทำการรีเซ็ตรหัสผ่านเริ่มต้นได้ทันที",
    },
    {
      question: "สามารถเข้าเรียนผ่านสมาร์ตโฟนหรือแท็บเล็ตได้หรือไม่?",
      answer: "ระบบรองรับการใช้งานบนทุกอุปกรณ์ ทั้งคอมพิวเตอร์ แท็บเล็ต (iPad/Android) และสมาร์ตโฟนผ่านเว็บเบราว์เซอร์ทุกชนิด",
    },
    {
      question: "เมื่อเรียนจบหลักสูตรจะได้รับเกียรติบัตรทันทีหรือไม่?",
      answer: "เมื่อเรียนครบทุกบทเรียนและทำแบบทดสอบผ่านเกณฑ์ 100% ระบบจะสร้างใบประกาศนียบัตรดิจิทัลพร้อมตราประทับและลายเซ็นผู้อำนวยการให้ดาวน์โหลดและพิมพ์ได้ทันที",
    },
  ]),

  landing_cta_enabled: "true",
  landing_cta_title: "พร้อมเริ่มต้นการเรียนรู้ในยุคดิจิทัลแล้วหรือยัง?",
  landing_cta_subtitle: "เข้าสู่ระบบและร่วมเป็นส่วนหนึ่งของสังคมการเรียนรู้ออนไลน์ระดับมัธยมศึกษา",
  landing_cta_button_text: "เข้าสู่ระบบเลยตอนนี้",
  landing_footer_text: "TUNorth-Hub © 2026 โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ · LMS EdTech Platform",
}

const AVAILABLE_ICONS = [
  "Users",
  "BookOpen",
  "GraduationCap",
  "Award",
  "ShieldCheck",
  "FileCheck",
  "Code2",
  "FileText",
  "HelpCircle",
  "Sparkles",
  "Megaphone",
  "BarChart3",
]

export default function AdminLandingManagerPage() {
  const [activeTab, setActiveTab] = useState<TabType>("hero")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false)

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_LANDING_CONFIG)

  // Parsed sub-arrays state for convenient editing
  const [statsList, setStatsList] = useState<StatItem[]>([])
  const [featuresList, setFeaturesList] = useState<FeatureItem[]>([])
  const [stepsList, setStepsList] = useState<StepItem[]>([])
  const [faqList, setFaqList] = useState<FAQItem[]>([])

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        const res = await apiFetch<{ settings: Record<string, string> }>("/api/admin/settings")
        if (!ignore && res.success && res.data?.settings) {
          const fetched = { ...DEFAULT_LANDING_CONFIG, ...res.data.settings }
          setSettings(fetched)

          try {
            setStatsList(JSON.parse(fetched.landing_stats_json || "[]"))
          } catch {
            setStatsList([])
          }

          try {
            setFeaturesList(JSON.parse(fetched.landing_features_json || "[]"))
          } catch {
            setFeaturesList([])
          }

          try {
            setStepsList(JSON.parse(fetched.landing_steps_json || "[]"))
          } catch {
            setStepsList([])
          }

          try {
            setFaqList(JSON.parse(fetched.landing_faq_json || "[]"))
          } catch {
            setFaqList([])
          }
        }
      } catch {
        if (!ignore) toast.error("ไม่สามารถโหลดการตั้งค่า Landing Page ได้")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadData()
    return () => {
      ignore = true
    }
  }, [])

  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Upload hero banner image
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingHeroImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "image")

      const res = await apiFetch<{ url: string }>("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (res.success && res.data?.url) {
        handleInputChange("landing_hero_image_url", res.data.url)
        toast.success("อัปโหลดรูปภาพ Hero เรียบร้อยแล้ว")
      } else {
        toast.error(res.message || "เกิดข้อผิดพลาดในการอัปโหลดภาพ")
      }
    } catch {
      toast.error("การเชื่อมต่อเซิร์ฟเวอร์ขัดข้องในการอัปโหลดไฟล์")
    } finally {
      setUploadingHeroImage(false)
    }
  }

  // Save all settings to backend
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        ...settings,
        landing_stats_json: JSON.stringify(statsList),
        landing_features_json: JSON.stringify(featuresList),
        landing_steps_json: JSON.stringify(stepsList),
        landing_faq_json: JSON.stringify(faqList),
      }

      const res = await apiFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.success) {
        toast.success("บันทึกการตั้งค่า Landing Page เรียบร้อยแล้ว!")
        setSettings(payload)
      } else {
        toast.error(res.message || "ไม่สามารถบันทึกการตั้งค่าได้")
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์")
    } finally {
      setSaving(false)
    }
  }

  // Reset to default values
  const handleResetDefaults = () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการคืนค่าการตั้งค่า Landing Page ทั้งหมดเป็นค่าเริ่มต้น?")) {
      setSettings(DEFAULT_LANDING_CONFIG)
      setStatsList(JSON.parse(DEFAULT_LANDING_CONFIG.landing_stats_json))
      setFeaturesList(JSON.parse(DEFAULT_LANDING_CONFIG.landing_features_json))
      setStepsList(JSON.parse(DEFAULT_LANDING_CONFIG.landing_steps_json))
      setFaqList(JSON.parse(DEFAULT_LANDING_CONFIG.landing_faq_json))
      toast.info("คืนค่าเริ่มต้นเรียบร้อยแล้ว กรุณากดปุ่มบันทึกเพื่อยืนยัน")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูลระบบจัดการ Landing Page...</p>
      </div>
    )
  }

  const tabs = [
    {
      id: "hero" as TabKey,
      label: "Hero & หัวข้อหลัก",
      icon: Sparkles,
      desc: "หัวข้อ, คำบรรยาย, ปุ่ม CTA & ภาพ",
    },
    {
      id: "stats" as TabKey,
      label: "แถบสถิติระบบ",
      icon: BarChart3,
      desc: "ตัวเลขนับความสำเร็จและสถิติ",
    },
    {
      id: "features" as TabKey,
      label: "จุดเด่นของระบบ",
      icon: Layers,
      desc: "การ์ดฟีเจอร์ ไอคอน และสีประจำ",
    },
    {
      id: "courses" as TabKey,
      label: "คอร์สเรียนแนะนำ",
      icon: BookOpen,
      desc: "แสดงรายวิชาแนะนำบนหน้าแรก",
    },
    {
      id: "steps" as TabKey,
      label: "ขั้นตอนการใช้งาน",
      icon: ListOrdered,
      desc: "Timeline ขั้นตอน 4 สเต็ป",
    },
    {
      id: "faq" as TabKey,
      label: "คำถามที่พบบ่อย",
      icon: HelpCircle,
      desc: "FAQ ถาม-ตอบ Accordion",
    },
    {
      id: "cta" as TabKey,
      label: "CTA & ส่วนท้ายเว็บ",
      icon: Megaphone,
      desc: "แบนเนอร์เชิญชวน & Footer",
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800/80 mb-2">
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Landing Page CMS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            จัดการหน้าแรก (Landing Page CMS)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ปรับแต่งเนื้อหา ข้อความ จุดเด่น สถิติ และส่วนประกอบต่างๆ บนหน้าแรกของระบบแบบ Real-time
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>ดูหน้าแรก</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-start p-3 sm:p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                isActive
                  ? "bg-brand-50/80 dark:bg-brand-950/50 border-brand-300 dark:border-brand-800 ring-2 ring-brand-500/20 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div
                className={`p-2 rounded-xl mb-2 ${
                  isActive
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span
                className={`text-xs sm:text-sm font-bold block leading-tight ${
                  isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-white"
                }`}
              >
                {t.label}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 hidden sm:block">
                {t.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        {/* ================= HERO SECTION ================= */}
        {activeTab === "hero" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                ตั้งค่า Hero Section (ส่วนหัวหลักของหน้าแรก)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กำหนดข้อความ ป้ายกำกับ และปุ่ม Call To Action ที่ผู้ใช้งานพบเห็นเป็นจุดแรก
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความ Badge ด้านบน
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_badge || ""}
                  onChange={(e) => handleInputChange("landing_hero_badge", e.target.value)}
                  placeholder="เช่น ระบบจัดการเรียนรู้ดิจิทัล LMS EdTech v1.0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  หัวข้อหลัก (Line 1)
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_title || ""}
                  onChange={(e) => handleInputChange("landing_hero_title", e.target.value)}
                  placeholder="เช่น แพลตฟอร์มการเรียนรู้ออนไลน์"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความไฮไลต์สี Gradient (Line 2)
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_highlight || ""}
                  onChange={(e) => handleInputChange("landing_hero_highlight", e.target.value)}
                  placeholder="เช่น เพื่อนักเรียนและคุณครูมัธยมศึกษา"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คำบรรยายย่อหน้าหลัก (Subtitle)
                </label>
                <textarea
                  rows={3}
                  value={settings.landing_hero_subtitle || ""}
                  onChange={(e) => handleInputChange("landing_hero_subtitle", e.target.value)}
                  placeholder="คำอธิบายภาพรวมของระบบ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความปุ่มดำเนินการหลัก (Primary CTA)
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_cta_primary_text || ""}
                  onChange={(e) => handleInputChange("landing_hero_cta_primary_text", e.target.value)}
                  placeholder="เช่น เข้าใช้งานระบบ (Login Portal)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ลิงก์ปุ่มดำเนินการหลัก
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_cta_primary_link || ""}
                  onChange={(e) => handleInputChange("landing_hero_cta_primary_link", e.target.value)}
                  placeholder="เช่น /login"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความปุ่มดำเนินการรอง (Secondary CTA)
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_cta_secondary_text || ""}
                  onChange={(e) => handleInputChange("landing_hero_cta_secondary_text", e.target.value)}
                  placeholder="เช่น สมัครสมาชิกนักเรียน"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ลิงก์ปุ่มดำเนินการรอง
                </label>
                <input
                  type="text"
                  value={settings.landing_hero_cta_secondary_link || ""}
                  onChange={(e) => handleInputChange("landing_hero_cta_secondary_link", e.target.value)}
                  placeholder="เช่น /register"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รูปภาพประกอบ Hero Showcase (ถ้ามี)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={settings.landing_hero_image_url || ""}
                    onChange={(e) => handleInputChange("landing_hero_image_url", e.target.value)}
                    placeholder="URL รูปภาพหรืออัปโหลดไฟล์..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap">
                    {uploadingHeroImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                    {uploadingHeroImage ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleHeroImageUpload}
                      disabled={uploadingHeroImage}
                    />
                  </label>

                  {settings.landing_hero_image_url && (
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange("landing_hero_image_url", "")
                        toast.info("นำรูปภาพออกแล้ว กรุณากดบันทึกการเปลี่ยนแปลง")
                      }}
                      className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-4 py-2.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบรูปภาพ
                    </button>
                  )}
                </div>

                {settings.landing_hero_image_url && (
                  <div className="relative w-full max-w-sm h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shadow-sm mt-2">
                    <Image
                      src={getMediaUrl(settings.landing_hero_image_url)}
                      alt="Hero Showcase Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STATS SECTION ================= */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-500" />
                  แถบแสดงสถิติระบบ (Stats Bar)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  แสดงตัวเลขนับความสำเร็จ สถิตินักเรียน คอร์สเรียน และบุคลากร
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  แสดงแถบสถิติ
                </span>
                <input
                  type="checkbox"
                  checked={settings.landing_stats_enabled === "true"}
                  onChange={(e) =>
                    handleInputChange("landing_stats_enabled", e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>

            <div className="space-y-4">
              {statsList.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        ป้ายกำกับ (Label)
                      </label>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const updated = [...statsList]
                          updated[index].label = e.target.value
                          setStatsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        ตัวเลข / ปริมาณ (Value)
                      </label>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          const updated = [...statsList]
                          updated[index].value = e.target.value
                          setStatsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        หน่วยนับ (Suffix)
                      </label>
                      <input
                        type="text"
                        value={item.suffix}
                        onChange={(e) => {
                          const updated = [...statsList]
                          updated[index].suffix = e.target.value
                          setStatsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        ไอคอน (Icon)
                      </label>
                      <select
                        value={item.icon}
                        onChange={(e) => {
                          const updated = [...statsList]
                          updated[index].icon = e.target.value
                          setStatsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        {AVAILABLE_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStatsList(statsList.filter((_, i) => i !== index))
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setStatsList([
                    ...statsList,
                    { label: "หัวข้อสถิติใหม่", value: "100+", suffix: "รายการ", icon: "Users" },
                  ])
                }}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500 hover:text-brand-600 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการสถิติใหม่
              </button>
            </div>
          </div>
        )}

        {/* ================= FEATURES GRID SECTION ================= */}
        {activeTab === "features" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-500" />
                  การ์ดจุดเด่นของระบบ (Core Features Grid)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ปรับแต่งคุณสมบัติเด่นและนวัตกรรมของแพลตฟอร์ม TUNorth-Hub
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  แสดงส่วนจุดเด่น
                </span>
                <input
                  type="checkbox"
                  checked={settings.landing_features_enabled === "true"}
                  onChange={(e) =>
                    handleInputChange("landing_features_enabled", e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  หัวข้อส่วน Features
                </label>
                <input
                  type="text"
                  value={settings.landing_features_title || ""}
                  onChange={(e) => handleInputChange("landing_features_title", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คำอธิบายส่วน Features
                </label>
                <input
                  type="text"
                  value={settings.landing_features_subtitle || ""}
                  onChange={(e) => handleInputChange("landing_features_subtitle", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {featuresList.map((item, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: item.color || "#2563eb" }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        การ์ดคุณสมบัติ #{index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFeaturesList(featuresList.filter((_, i) => i !== index))
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">ชื่อฟีเจอร์</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...featuresList]
                          updated[index].title = e.target.value
                          setFeaturesList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">
                        ไอคอน และ โทนสี
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.icon}
                          onChange={(e) => {
                            const updated = [...featuresList]
                            updated[index].icon = e.target.value
                            setFeaturesList(updated)
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          {AVAILABLE_ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                        <input
                          type="color"
                          value={item.color || "#2563eb"}
                          onChange={(e) => {
                            const updated = [...featuresList]
                            updated[index].color = e.target.value
                            setFeaturesList(updated)
                          }}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">
                        คำอธิบายรายละเอียด
                      </label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...featuresList]
                          updated[index].description = e.target.value
                          setFeaturesList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFeaturesList([
                    ...featuresList,
                    {
                      id: String(Date.now()),
                      title: "ฟีเจอร์ใหม่",
                      description: "รายละเอียดคำอธิบายของฟีเจอร์ใหม่...",
                      icon: "Sparkles",
                      color: "#2563eb",
                    },
                  ])
                }}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500 hover:text-brand-600 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่มการ์ดฟีเจอร์ใหม่
              </button>
            </div>
          </div>
        )}

        {/* ================= FEATURED COURSES SECTION ================= */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-500" />
                  ส่วนแสดงคอร์สแนะนำ (Featured Courses)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ระบบจะดึงรายวิชาที่เปิดเผยแพร่ (Published Courses) ล่าสุดมาแสดงผลโดยอัตโนมัติ
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  แสดงส่วนคอร์สแนะนำ
                </span>
                <input
                  type="checkbox"
                  checked={settings.landing_courses_enabled === "true"}
                  onChange={(e) =>
                    handleInputChange("landing_courses_enabled", e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  หัวข้อส่วนคอร์สแนะนำ
                </label>
                <input
                  type="text"
                  value={settings.landing_courses_title || ""}
                  onChange={(e) => handleInputChange("landing_courses_title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คำอธิบายส่วนคอร์สแนะนำ
                </label>
                <input
                  type="text"
                  value={settings.landing_courses_subtitle || ""}
                  onChange={(e) => handleInputChange("landing_courses_subtitle", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/80 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ข้อมูลคอร์สจะถูกซิงค์แบบเรียลไทม์
                </p>
                <p>
                  คอร์สที่สร้างและเปิดเผยแพร่ (Published) โดยคณะครูจะแสดงบนหน้าแรกโดยอัตโนมัติ พร้อมแสดงป้ายหมวดหมู่รายวิชา และจำนวนบทเรียนภายใน
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEPS SECTION ================= */}
        {activeTab === "steps" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-brand-500" />
                  ขั้นตอนการเริ่มต้นใช้งาน (How It Works)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  แนะนำขั้นตอนง่ายๆ ในการเริ่มเรียนรู้ ส่งงาน และรับใบประกาศนียบัตร
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  แสดงส่วนขั้นตอน
                </span>
                <input
                  type="checkbox"
                  checked={settings.landing_steps_enabled === "true"}
                  onChange={(e) =>
                    handleInputChange("landing_steps_enabled", e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  หัวข้อส่วนขั้นตอน
                </label>
                <input
                  type="text"
                  value={settings.landing_steps_title || ""}
                  onChange={(e) => handleInputChange("landing_steps_title", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คำอธิบายส่วนขั้นตอน
                </label>
                <input
                  type="text"
                  value={settings.landing_steps_subtitle || ""}
                  onChange={(e) => handleInputChange("landing_steps_subtitle", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {stepsList.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {index + 1}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        ชื่อขั้นตอน
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...stepsList]
                          updated[index].title = e.target.value
                          setStepsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        คำอธิบายขั้นตอน
                      </label>
                      <input
                        type="text"
                        value={item.desc}
                        onChange={(e) => {
                          const updated = [...stepsList]
                          updated[index].desc = e.target.value
                          setStepsList(updated)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStepsList(stepsList.filter((_, i) => i !== index))
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setStepsList([
                    ...stepsList,
                    {
                      step: String(stepsList.length + 1),
                      title: "ขั้นตอนใหม่",
                      desc: "รายละเอียดการปฏิบัติตามขั้นตอน...",
                    },
                  ])
                }}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500 hover:text-brand-600 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่มขั้นตอนใหม่
              </button>
            </div>
          </div>
        )}

        {/* ================= FAQ SECTION ================= */}
        {activeTab === "faq" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-brand-500" />
                  คำถามที่พบบ่อย (FAQ Section)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ตอบข้อสงสัยทั่วไปของนักเรียนและครูผู้สอนเพื่อลดภาระงานสนับสนุน
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  แสดงส่วน FAQ
                </span>
                <input
                  type="checkbox"
                  checked={settings.landing_faq_enabled === "true"}
                  onChange={(e) =>
                    handleInputChange("landing_faq_enabled", e.target.checked ? "true" : "false")
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  หัวข้อส่วน FAQ
                </label>
                <input
                  type="text"
                  value={settings.landing_faq_title || ""}
                  onChange={(e) => handleInputChange("landing_faq_title", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คำอธิบายส่วน FAQ
                </label>
                <input
                  type="text"
                  value={settings.landing_faq_subtitle || ""}
                  onChange={(e) => handleInputChange("landing_faq_subtitle", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {faqList.map((item, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      คำถามข้อที่ {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setFaqList(faqList.filter((_, i) => i !== index))
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={item.question}
                      placeholder="คำถาม (Question)..."
                      onChange={(e) => {
                        const updated = [...faqList]
                        updated[index].question = e.target.value
                        setFaqList(updated)
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />

                    <textarea
                      rows={2}
                      value={item.answer}
                      placeholder="คำตอบ (Answer)..."
                      onChange={(e) => {
                        const updated = [...faqList]
                        updated[index].answer = e.target.value
                        setFaqList(updated)
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFaqList([
                    ...faqList,
                    {
                      question: "คำถามใหม่?",
                      answer: "คำตอบสำหรับคำถามใหม่นี้...",
                    },
                  ])
                }}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500 hover:text-brand-600 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่มคำถามที่พบบ่อยใหม่
              </button>
            </div>
          </div>
        )}

        {/* ================= CTA & FOOTER SECTION ================= */}
        {activeTab === "cta" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-500" />
                แถบเชิญชวนท้ายหน้า และ ส่วนท้ายเว็บ (CTA & Footer)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กำหนดข้อความปิดท้ายหน้าเว็บ และข้อความลิขสิทธิ์ประจำโรงเรียน
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  แถบ Call To Action ท้ายหน้า (CTA Banner)
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-500">เปิดใช้งาน</span>
                  <input
                    type="checkbox"
                    checked={settings.landing_cta_enabled === "true"}
                    onChange={(e) =>
                      handleInputChange("landing_cta_enabled", e.target.checked ? "true" : "false")
                    }
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    หัวข้อ CTA
                  </label>
                  <input
                    type="text"
                    value={settings.landing_cta_title || ""}
                    onChange={(e) => handleInputChange("landing_cta_title", e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ข้อความปุ่ม CTA
                  </label>
                  <input
                    type="text"
                    value={settings.landing_cta_button_text || ""}
                    onChange={(e) => handleInputChange("landing_cta_button_text", e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    คำบรรยายใต้ CTA
                  </label>
                  <input
                    type="text"
                    value={settings.landing_cta_subtitle || ""}
                    onChange={(e) => handleInputChange("landing_cta_subtitle", e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ข้อความส่วนท้ายเว็บ (Footer Copyright)
              </label>
              <input
                type="text"
                value={settings.landing_footer_text || ""}
                onChange={(e) => handleInputChange("landing_footer_text", e.target.value)}
                placeholder="เช่น TUNorth-Hub © 2026 โรงเรียนเตรียมอุดมศึกษาพัฒนาการ นนทบุรี..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
