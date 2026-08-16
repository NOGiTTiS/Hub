"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { apiFetch, getMediaUrl } from "@/lib/api"
import {
  GraduationCap,
  Users,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Code2,
  FileCheck,
  Sparkles,
  Award,
  FileText,
  HelpCircle,
  Megaphone,
  ChevronDown,
  BarChart3,
  Layers,
  ListOrdered,
} from "lucide-react"

// Types
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

interface CourseItem {
  id: string
  title: string
  description: string
  cover_image_url: string
  modules_count: number
  lessons_count: number
  category?: {
    name: string
    color: string
  }
  teacher?: {
    first_name: string
    last_name: string
  }
}

// Icon helper map
const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  ShieldCheck,
  FileCheck,
  Code2,
  FileText,
  HelpCircle,
  Sparkles,
  Megaphone,
  BarChart3,
  Layers,
  ListOrdered,
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadPublicData() {
      try {
        const settingsRes = await apiFetch<Record<string, string>>("/api/settings/public")
        if (settingsRes.success && settingsRes.data) {
          setSettings(settingsRes.data)
        }

        // Fetch courses for showcase
        const coursesRes = await apiFetch<CourseItem[]>("/api/courses/public")
        if (coursesRes.success && Array.isArray(coursesRes.data)) {
          setCourses(coursesRes.data.slice(0, 6))
        }
      } catch (err) {
        console.error("Failed to load public landing data", err)
      } finally {
        setLoading(false)
      }
    }
    loadPublicData()
  }, [])

  const getDashboardLink = () => {
    if (!user) return "/login"
    switch (user.role) {
      case "ADMIN":
        return "/admin"
      case "TEACHER":
        return "/teacher"
      case "STUDENT":
        return "/student"
      default:
        return "/login"
    }
  }

  // Parsed Configs
  const heroBadge = settings.landing_hero_badge || "ระบบจัดการเรียนรู้ดิจิทัล LMS EdTech v1.0"
  const heroTitle = settings.landing_hero_title || "แพลตฟอร์มการเรียนรู้ออนไลน์"
  const heroHighlight = settings.landing_hero_highlight || "เพื่อนักเรียนและคุณครูมัธยมศึกษา"
  const heroSubtitle =
    settings.landing_hero_subtitle ||
    "รองรับการเรียนรู้แบบ On-Demand, Interactive Code Playground (Python / WASM), การส่งงานตรวจการบ้านออนไลน์ และการนำเข้าผู้ใช้แบบกลุ่มความเร็วสูง"
  const primaryCtaText = settings.landing_hero_cta_primary_text || "เข้าใช้งานระบบ (Login Portal)"
  const primaryCtaLink = settings.landing_hero_cta_primary_link || "/login"
  const secondaryCtaText = settings.landing_hero_cta_secondary_text || "สมัครสมาชิกนักเรียน"
  const secondaryCtaLink = settings.landing_hero_cta_secondary_link || "/register"
  const heroImage = settings.landing_hero_image_url || ""

  // Stats
  const statsEnabled = settings.landing_stats_enabled !== "false"
  let statsList: StatItem[] = [
    { label: "นักเรียนในระบบ", value: "2,000+", suffix: "คน", icon: "Users" },
    { label: "รายวิชาเรียนออนไลน์", value: "50+", suffix: "คอร์ส", icon: "BookOpen" },
    { label: "อาจารย์ผู้สอนคุณภาพ", value: "100+", suffix: "ท่าน", icon: "GraduationCap" },
    { label: "ความสำเร็จในการศึกษา", value: "100%", suffix: "", icon: "Award" },
  ]
  try {
    if (settings.landing_stats_json) {
      const parsed = JSON.parse(settings.landing_stats_json)
      if (Array.isArray(parsed) && parsed.length > 0) statsList = parsed
    }
  } catch {}

  // Features
  const featuresEnabled = settings.landing_features_enabled !== "false"
  const featuresTitle = settings.landing_features_title || "ฟีเจอร์และนวัตกรรมการเรียนรู้ดิจิทัล"
  const featuresSubtitle =
    settings.landing_features_subtitle ||
    "ออกแบบมาเพื่อเพิ่มศักยภาพการเรียนการสอนสำหรับโรงเรียนมัธยมศึกษาในยุคดิจิทัลอย่างครบวงจร"
  let featuresList: FeatureItem[] = [
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
  ]
  try {
    if (settings.landing_features_json) {
      const parsed = JSON.parse(settings.landing_features_json)
      if (Array.isArray(parsed) && parsed.length > 0) featuresList = parsed
    }
  } catch {}

  // Courses
  const coursesEnabled = settings.landing_courses_enabled !== "false"
  const coursesTitle = settings.landing_courses_title || "รายวิชาและคอร์สเรียนแนะนำ"
  const coursesSubtitle =
    settings.landing_courses_subtitle ||
    "เลือกเรียนรู้เนื้อหาบทเรียนคุณภาพจากคุณครูผู้สอนชั้นนำในโรงเรียน"

  // Steps
  const stepsEnabled = settings.landing_steps_enabled !== "false"
  const stepsTitle = settings.landing_steps_title || "เริ่มต้นการเรียนรู้ง่ายๆ ใน 4 ขั้นตอน"
  const stepsSubtitle =
    settings.landing_steps_subtitle || "เส้นทางการเรียนรู้ที่สะดวก รวดเร็ว และเข้าถึงได้จากทุกอุปกรณ์"
  let stepsList: StepItem[] = [
    { step: "1", title: "เข้าสู่ระบบหรือลงทะเบียน", desc: "ล็อกอินด้วยอีเมลโรงเรียนหรือลงทะเบียนบัญชีนักเรียน" },
    { step: "2", title: "เลือกรายวิชาและเริ่มเรียน", desc: "เลือกคอร์สที่สนใจและเข้าเรียนเนื้อหาวิดีโอ สไลด์ หรือ Text" },
    { step: "3", title: "ส่งการบ้านและทำแบบทดสอบ", desc: "ฝึกฝนทักษะผ่านโจทย์ ฝึกเขียนโค้ด และทดสอบความรู้ท้ายบท" },
    { step: "4", title: "รับใบประกาศนียบัตร", desc: "เรียนจบครบ 100% รับ Certificate พร้อมรหัสตรวจสอบได้ทันที" },
  ]
  try {
    if (settings.landing_steps_json) {
      const parsed = JSON.parse(settings.landing_steps_json)
      if (Array.isArray(parsed) && parsed.length > 0) stepsList = parsed
    }
  } catch {}

  // FAQ
  const faqEnabled = settings.landing_faq_enabled !== "false"
  const faqTitle = settings.landing_faq_title || "คำถามที่พบบ่อย (FAQ)"
  const faqSubtitle =
    settings.landing_faq_subtitle || "ข้อสงสัยที่พบบ่อยเกี่ยวกับการใช้งานแพลตฟอร์ม TUNorth-Hub"
  let faqList: FAQItem[] = [
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
  ]
  try {
    if (settings.landing_faq_json) {
      const parsed = JSON.parse(settings.landing_faq_json)
      if (Array.isArray(parsed) && parsed.length > 0) faqList = parsed
    }
  } catch {}

  // CTA
  const ctaEnabled = settings.landing_cta_enabled !== "false"
  const ctaTitle = settings.landing_cta_title || "พร้อมเริ่มต้นการเรียนรู้ในยุคดิจิทัลแล้วหรือยัง?"
  const ctaSubtitle =
    settings.landing_cta_subtitle || "เข้าสู่ระบบและร่วมเป็นส่วนหนึ่งของสังคมการเรียนรู้ออนไลน์ระดับมัธยมศึกษา"
  const ctaButtonText = settings.landing_cta_button_text || "เข้าสู่ระบบเลยตอนนี้"
  const footerText =
    settings.landing_footer_text ||
    "TUNorth-Hub © 2026 โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ · LMS EdTech Platform"

  const allowRegistration = settings.allow_student_registration === "true"

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors selection:bg-brand-500 selection:text-white">
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.site_logo_url && !imgErrors["site_logo"] ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                <Image
                  src={getMediaUrl(settings.site_logo_url)}
                  alt="Logo"
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                  onError={() => setImgErrors(prev => ({ ...prev, site_logo: true }))}
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
                <GraduationCap className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {settings.platform_title || "TUNorth-Hub"}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-en line-clamp-1">
                {settings.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-semibold transition-all shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ตรวจสอบเกียรติบัตร</span>
            </Link>

            <ThemeToggle />
            {isAuthenticated && user ? (
              <Link
                href={getDashboardLink()}
                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all flex items-center gap-1.5"
              >
                เข้าสู่ Dashboard ({user.first_name})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {allowRegistration && (
                  <Link
                    href="/register"
                    className="hidden sm:inline-flex border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    สมัครสมาชิก
                  </Link>
                )}
                <Link
                  href="/login"
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-brand-foreground px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-900/20 transition-all flex items-center gap-1"
                >
                  เข้าสู่ระบบ
                  <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <main className="flex-1 w-full space-y-20 pb-16">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 text-center space-y-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-950/80 text-brand-800 dark:text-brand-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 shadow-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
              <span>{heroBadge}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug sm:leading-tight max-w-3xl mx-auto">
              <span className="block">{heroTitle}</span>
              {heroHighlight && (
                <span className="block mt-2 sm:mt-3 bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600 dark:from-brand-400 dark:via-brand-500 dark:to-indigo-400 bg-clip-text text-transparent">
                  {heroHighlight}
                </span>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated && user ? (
                <Link
                  href={getDashboardLink()}
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-brand-foreground px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-lg shadow-brand-900/25 transition-all flex items-center gap-2"
                >
                  เข้าสู่ห้องเรียน ({user.first_name})
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  {primaryCtaText && (
                    <Link
                      href={primaryCtaLink}
                      className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-brand-foreground px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-lg shadow-brand-900/25 transition-all flex items-center gap-2"
                    >
                      {primaryCtaText}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  {secondaryCtaText && (
                    <Link
                      href={secondaryCtaLink}
                      className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-6 py-3.5 rounded-2xl text-sm font-semibold shadow-sm transition-all"
                    >
                      {secondaryCtaText}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Hero Showcase Image (if uploaded) */}
          {(heroImage || loading) && (
            <div className="max-w-4xl mx-auto pt-6">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video">
                {heroImage ? (
                  <Image
                    src={getMediaUrl(heroImage)}
                    alt="Platform Showcase"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                    className="object-cover"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                )}
              </div>
            </div>
          )}
        </section>

        {/* ================= STATS BAR ================= */}
        {statsEnabled && statsList.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 bg-white dark:bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm">
              {statsList.map((stat, idx) => {
                const IconComponent = ICON_MAP[stat.icon] || BarChart3
                return (
                  <div
                    key={idx}
                    className="text-center space-y-2 p-3 sm:p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 mx-auto rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {stat.value}{" "}
                      {stat.suffix && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                          {stat.suffix}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ================= CORE FEATURES GRID ================= */}
        {featuresEnabled && featuresList.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {featuresTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {featuresSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresList.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || Sparkles
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm"
                        style={{
                          backgroundColor: `${item.color || "#2563eb"}18`,
                          color: item.color || "#2563eb",
                        }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ================= FEATURED COURSES ================= */}
        {coursesEnabled && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 min-h-[300px]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {coursesTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {coursesSubtitle}
                </p>
              </div>

              <Link
                href="/login"
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 self-start sm:self-auto"
              >
                ดูหลักสูตรทั้งหมด
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm animate-pulse"
                  >
                    <div className="aspect-video w-full bg-slate-200 dark:bg-slate-800" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800">
                      {course.cover_image_url && !imgErrors[course.id] ? (
                        <Image
                          src={getMediaUrl(course.cover_image_url)}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
                          className="object-cover"
                          unoptimized
                          onError={() => setImgErrors(prev => ({ ...prev, [course.id]: true }))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 bg-brand-50/50 dark:bg-brand-950/30">
                          <BookOpen className="w-10 h-10 text-brand-400 opacity-60" />
                        </div>
                      )}
                      {course.category && (
                        <span
                          className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                          style={{ backgroundColor: course.category.color || "#2563eb" }}
                        >
                          {course.category.name}
                        </span>
                      )}
                    </div>

                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {course.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {course.description || "หลักสูตรการเรียนการสอนระดับมัธยมศึกษา"}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Layers className="w-3.5 h-3.5 text-brand-500" />
                          {course.lessons_count || 0} บทเรียน
                        </span>
                        {course.teacher && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ครู{course.teacher.first_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        {/* ================= HOW IT WORKS STEPS ================= */}
        {stepsEnabled && stepsList.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {stepsTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {stepsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stepsList.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative space-y-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-brand-500/20">
                    {step.step || idx + 1}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= FAQ SECTION ================= */}
        {faqEnabled && faqList.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {faqTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {faqSubtitle}
              </p>
            </div>

            <div className="space-y-3">
              {faqList.map((item, idx) => {
                const isOpen = openFaqIndex === idx
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-6 py-4 text-left font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-brand-500" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                        {item.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ================= CTA BANNER ================= */}
        {ctaEnabled && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 rounded-3xl p-8 sm:p-12 text-center text-white space-y-6 shadow-xl shadow-brand-900/20">
              <div className="max-w-2xl mx-auto space-y-3">
                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  {ctaTitle}
                </h3>
                <p className="text-xs sm:text-sm text-brand-100/90 leading-relaxed">
                  {ctaSubtitle}
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <Link
                  href="/login"
                  className="bg-white hover:bg-slate-100 text-slate-900 active:scale-95 px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {ctaButtonText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-950/60 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {settings.platform_title || "TUNorth-Hub"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {settings.school_name_th || "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium">
            <Link href="/verify" className="hover:text-brand-600 dark:hover:text-white flex items-center gap-1.5 transition">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>ตรวจสอบใบประกาศนียบัตร</span>
            </Link>
            <Link href="/login" className="hover:text-brand-600 dark:hover:text-white transition">
              เข้าสู่ระบบ
            </Link>
            {allowRegistration && (
              <Link href="/register" className="hover:text-brand-600 dark:hover:text-white transition">
                สมัครสมาชิกนักเรียน
              </Link>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center md:text-right">
            {footerText}
          </p>
        </div>
      </footer>
    </div>
  )
}
