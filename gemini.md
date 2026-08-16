# 🧠 TUNorth-Hub Project Brain (`gemini.md`)

> **แพลตฟอร์มการจัดการเรียนรู้ดิจิทัล (Online Learning Platform for High School - LMS EdTech)**  
> พัฒนาขึ้นเพื่อรองรับนักเรียนมัธยมศึกษาตอนปลาย (~2,000 คน) และคณะครูโรงเรียนมัธยมศึกษา  
> รองรับการใช้งานพร้อมกันสูงสุด (Peak Concurrent Users): **150 คน**

---

## 📌 1. กฎเหล็กประจำโปรเจกต์ (Critical Project Rules)

1. **ห้ามใส่ Semicolon (`;`) ในไฟล์ TypeScript และ JavaScript ทุกไฟล์เด็ดขาด** (Enforced via ESLint & Prettier `semi: false` / `semi: never`).
2. **ใช้งาน Bun เป็น Package Manager หลักสำหรับ Frontend** (`bun install`, `bun add`, `bun run dev`, `bun run build`).
3. **การพัฒนาต้องทำเป็น Phase ตาม Checklist ใน [`docs/spec.md`](docs/spec.md) เสมอ**:
   - เมื่อทำแต่ละข้อย่อยเสร็จ ให้ทำเครื่องหมาย Checkmark `[x]` ใน `docs/spec.md` ทันที
   - เมื่อจบแต่ละ Phase ให้หยุดสรุปและแสดง Test Cases ให้ตรวจสอบก่อนเริ่ม Phase ถัดไป
4. **Backend Architecture**: ใช้ Go + Fiber + GORM แยกเลเยอร์ชัดเจน (Clean/Modular Architecture) ในโฟลเดอร์ `internal/`.
5. **Local Volume Storage**: ไฟล์ Media (วิดีโอ MP4, สไลด์ PDF, ภาพปก, การบ้าน) จัดเก็บบน Host ผ่าน Docker Volume Path `/var/tunorth_data/uploads` และ Stream ตรงผ่าน Nginx.

---

## 🛠️ 2. สถาปัตยกรรมทางเทคโนโลยี (Tech Stack)

| หมวดหมู่ (Category) | เทคโนโลยีที่เลือกใช้ (Technology Stack) | รายละเอียด (Details) |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | TypeScript, Server & Client Components |
| **Frontend Tooling** | **Bun 1.3+** | Package Manager & Script Runner ความเร็วสูง |
| **Styling & UI** | **Tailwind CSS + Lucide React** | Modern Design System, Dark/Light Mode, Responsive |
| **Backend API** | **Go 1.25 / 1.26 + Fiber v2** | High-performance Go Web Framework |
| **ORM & Database** | **PostgreSQL 17 + GORM** | Relational Database, JSONB Data Type, UUID Keys |
| **Caching & Session** | **Redis 7 (Alpine)** | Cache Session, Token Blacklist, Rate Limiting |
| **Reverse Proxy** | **Nginx (Alpine)** | Reverse Proxy, Static File Fast-Streaming |
| **Media Storage** | **Local Volume Mount** | `./uploads` ➔ `/var/tunorth_data/uploads` |
| **Code Playground** | **Pyodide (WASM) + Monaco** | In-Browser Client-Side Python Compilation |
| **Containerization** | **Docker & Docker Compose** | Multi-stage Dockerfiles for Frontend & Backend |

---

## 🗂️ 3. โครงสร้างโฟลเดอร์โปรเจกต์ (Project Directory Map)

```text
D:\Hub
├── .env                          # Local Environment Variables
├── .env.example                  # Example Environment Config
├── .gitignore                    # Git Ignore Patterns
├── docker-compose.yml            # Docker Dev Database & Cache (PostgreSQL 17, Redis 7)
├── docker-compose.prod.yml       # Docker Production Orchestration (5 Services: DB, Redis, Backend, Frontend, Nginx)
├── gemini.md                     # 🧠 Project Brain & Memory (This file)
│
├── docs/                         # Specification & Requirements
│   └── spec.md                   # System Requirements Specification & Phase Checklists
│
├── docker/                       # Infrastructure Configurations
│   └── nginx/
│       ├── nginx.conf            # Global Nginx Configuration
│       └── default.conf          # Nginx Reverse Proxy & Static File Routing
│
├── frontend/                     # Next.js 16 (App Router) Frontend
│   ├── .prettierrc               # Prettier config with semi: false
│   ├── eslint.config.mjs         # ESLint flat config with semi: never
│   ├── package.json              # Bun dependencies
│   ├── Dockerfile                # Multi-stage Bun / Next.js Runner
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root Layout (Fonts, Metadata)
│   │   │   ├── page.tsx          # Landing / Entry Page
│   │   │   └── globals.css       # Tailwind Global Styles
│   │   └── lib/
│   │       └── utils.ts          # clsx + twMerge helper (cn)
│
├── backend/                      # Go Fiber API Backend
│   ├── go.mod / go.sum           # Go Modules
│   ├── Dockerfile                # Multi-stage Go Binary Build
│   ├── cmd/
│   │   ├── server/main.go        # Backend API Entry Point & Graceful Shutdown
│   │   └── seed/main.go          # Database Seeder CLI
│   └── internal/
│       ├── config/config.go      # Environment Loader
│       ├── database/database.go  # GORM & Redis Connection + AutoMigrate
│       ├── models/models.go      # 11 Database Entities (User, Course, Quiz, etc.)
│       ├── handlers/health.go    # Health Check API
│       ├── routes/routes.go      # Fiber Routing & Global Middlewares
│       └── seed/seed.go          # Initial Seed Data Generator
│
└── uploads/                      # Local Volume Media Uploads
    ├── videos/                   # MP4 Course Videos
    ├── slides/                   # PDF Course Slides
    ├── covers/                   # Course Cover Images
    └── assignments/              # Student Assignment Submissions
```

---

## 📊 4. โครงสร้างฐานข้อมูล (Database Entities & Relationships)

1. **`users`**: `id` (UUID PK), `email` (Unique), `password_hash`, `first_name`, `last_name`, `avatar_url`, `bio`, `phone_number`, `role` (`STUDENT`, `TEACHER`, `ADMIN`), `grade_level` (เช่น `M4`, `M5`, `M6`), `classroom` (เช่น `1`, `2`)
2. **`courses`**: `id` (UUID PK), `title`, `description`, `cover_image_url`, `teacher_id` (FK -> `users`), `is_published`
3. **`modules`**: `id` (UUID PK), `course_id` (FK -> `courses`), `title`, `order_index`
4. **`lessons`**: `id` (UUID PK), `module_id` (FK -> `modules`), `title`, `content_type` (`VIDEO_UPLOAD`, `VIDEO_EMBED`, `SLIDE_PDF`, `CODE_LAB`, `TEXT`), `video_url`, `embed_url`, `pdf_url`, `body_text`, `order_index`, `duration_minutes`, `available_from`, `available_until`, `min_study_time_seconds`
5. **`assignments`**: `id` (UUID PK), `lesson_id` (FK -> `lessons`), `title`, `instructions`, `max_score`, `due_date`
6. **`submissions`**: `id` (UUID PK), `assignment_id` (FK -> `assignments`), `student_id` (FK -> `users`), `file_url`, `submitted_text`, `score`, `feedback`, `status` (`SUBMITTED`, `GRADED`)
7. **`quizzes`**: `id` (UUID PK), `lesson_id` (FK -> `lessons`), `title`, `time_limit_minutes`, `passing_score`
8. **`quiz_questions`**: `id` (UUID PK), `quiz_id` (FK -> `quizzes`), `question_text`, `question_type`, `options_json`, `correct_answer`, `points`
9. **`quiz_attempts`**: `id` (UUID PK), `quiz_id` (FK -> `quizzes`), `student_id` (FK -> `users`), `score`, `passed`, `started_at`, `completed_at`
10. **`enrollments`**: `id` (UUID PK), `student_id` (FK -> `users`), `course_id` (FK -> `courses`), `completed_lessons` (JSONB), `progress_percent`
11. **`certificates`**: `id` (UUID PK), `student_id` (FK -> `users`), `course_id` (FK -> `courses`), `certificate_code` (Unique), `issued_at`

---

## 🚀 5. สถานะความคืบหน้าของโครงการ (Roadmap & Status)

- [x] **Phase 1: Foundation, Infrastructure & Core Setup** *(Completed & Verified)*
  - [x] Setup Project Directory & Repository Structure
  - [x] Configure Next.js 16 + Bun + Tailwind CSS + ESLint (`semi: never`)
  - [x] Configure Go 1.25+ + Fiber + GORM Clean Architecture
  - [x] Setup Air Hot Reload Engine (`.air.toml`, `Dockerfile.dev`, `docker-compose.yml`)
  - [x] Setup Docker Compose (PostgreSQL 17, Redis 7, Backend, Frontend, Nginx)
  - [x] Setup Local Volume Mounting Structure (`uploads/`)
  - [x] Implement Database Migrations & Initial Seed Data in Go
- [x] **Phase 2: Authentication & User Onboarding (Admin & Auth)** *(Completed & Verified)*
  - [x] Implement JWT Authentication Backend (Login, Logout, Refresh Token, Password Hashing)
  - [x] Build Login UI & Auth Middleware (Role-Based: STUDENT, TEACHER, ADMIN with Strict Isolation 100%)
  - [x] Implement CSV/Excel Parser for Batch User Import (Go Backend Parser)
  - [x] Build Admin User Management Dashboard & Batch Import UI
  - [x] Test importing 1,000+ mock student accounts categorized by Grade Level & Classroom
- [x] **Phase 3: Course & Learning Content Management** *(Completed & Verified)*
  - [x] Build Teacher Course Builder UI (Create Course, Edit Modules, Order Lessons, In-Builder Preview Modal)
  - [x] Implement File Upload Service in Go Backend (Handling MP4 Videos, PDF Documents, Cover Images)
  - [x] Implement Video Embed & PDF Viewer Components in Next.js 16
  - [x] Build Student Course Browsing & Course Player Interface
  - [x] Implement Student Course Progress Tracking API & Real-time Progress Bar
  - [x] Implement Course Unenrollment & Student Management System (Student Drop Course, Confirmation Dialog, Player Gate & Teacher/Admin Student Removal)
- [x] **Phase 4: Assessment, Code Playground & Certificate System** *(Completed & Verified)*
  - [x] Build Assignment Creation, Submission & Grading System
  - [x] Build Interactive Quiz Engine (Question Builder, Timer, Auto-Grading Logic, Attempts history, and Max Attempts Quota Limit)
  - [x] Implement Quiz & Question Import Engine (Batch CSV & Excel (.xlsx) Parser, Smart Answer Normalizer, Append & Replace Modes, and Template Download in Quiz Builder)
  - [x] Integrate Client-Side Pyodide (WASM) & Monaco Editor for Code Playground Component (with `input()` interactive prompt handling)
  - [x] Implement Certificate Generation & Verification Engine (1-Page Landscape Printable PDF, Dynamic QR Code, Public Search Portal `/verify`, Camera/Image Scanner & Public Verification Endpoint `/verify/[code]`)
- [x] **Phase 5: Admin System Settings, Branding, Governance & Landing Page CMS** *(Completed & Verified)*
  - [x] Implement System Settings Data Model, Seed Defaults & Batch Update API
  - [x] Build Admin System Settings Dashboard (`/admin/settings`) with 5 Dedicated Tabs
  - [x] Implement Course Categories Management Engine (`/admin/categories`) with Full CRUD & Reordering
  - [x] Implement Dynamic School Branding & Theme Customizer (Logo upload, Favicon, Real-time Theme Colors)
  - [x] Implement Enforced Maintenance Mode & Student Self-Registration Portal
  - [x] Implement Real-time System Health & Storage Diagnostics Engine
  - [x] Implement **Landing Page Management System (Landing Page CMS)** (`/admin/landing`) with Dynamic Sections Customizer (Hero, Stats Bar, Core Features Grid, Featured Courses Showcase, Steps Timeline, Interactive FAQ, CTA Banner, and Public API Integration)
- [ ] **Phase 6: Testing, Performance Hardening & Production Deployment** *(In Progress)*
  - [x] Implement **Google Lighthouse Hardening** (Accessibility 100%, Best Practices 100%, SEO 100%, Zero-CLS, LCP Priority Optimization)
  - [x] Conduct Load Testing for 150 Concurrent Active Users (Video Streaming & API Benchmark)
  - [ ] Configure Nginx Reverse Proxy with Rate Limiting, Static Asset Caching, and SSL
  - [ ] Implement Automated Database Backup Shell Script (`pg_dump` Cron Job)
  - [ ] Final UAT & Production Deployment via Docker Compose

---

## ⚡ 6. คำสั่งสำคัญสำหรับการพัฒนา (Key Commands)

```powershell
# รัน Database & Cache สำหรับ Local Dev (docker-compose.yml)
docker compose up -d

# หรือรันทั้งระบบแบบ Production Stack (docker-compose.prod.yml)
docker compose -f docker-compose.prod.yml up -d --build

# ดูสถานะคอนเทนเนอร์และ Logs (Dev Mode)
docker compose ps
docker compose logs -f

# ดูสถานะคอนเทนเนอร์และ Logs (Production Mode)
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend

# รัน Backend Local Dev (Go)
cd D:\Hub\backend
go run cmd/server/main.go

# รัน Seed Database
go run cmd/seed/main.go

# รัน Frontend Local Dev (Next.js with Bun)
cd D:\Hub\frontend
bun run dev
bun run lint
bun run build
```

---

## 🔑 7. ข้อมูลบัญชีผู้ใช้เริ่มต้น (Default Seed Accounts)

| Email | Password | Role | สิทธิ์การเข้าถึง |
| :--- | :--- | :--- | :--- |
| `admin@tunorth.ac.th` | `Password123!` | **ADMIN** | จัดการผู้ใช้, นำเข้า CSV, ดูแลระบบทั้งหมด |
| `teacher@tunorth.ac.th` | `Password123!` | **TEACHER** | สร้างคอร์ส, จัดบทเรียน, ตรวจการบ้าน |
| `student1@tunorth.ac.th` | `Password123!` | **STUDENT** | เรียน On-Demand, ส่งงาน, ทำข้อสอบ, เขียนโค้ด (ม.4/1) |
| `student2@tunorth.ac.th` | `Password123!` | **STUDENT** | เรียน On-Demand, ส่งงาน, ทำข้อสอบ, เขียนโค้ด (ม.4/1) |
