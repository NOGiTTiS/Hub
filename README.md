# 🎓 TUNorth-Hub: Modern High School LMS & EdTech Platform

<p align="center">
  <img src="https://raw.githubusercontent.com/NOGiTTiS/Hub/main/frontend/public/logo.png" alt="TUNorth-Hub Logo" width="120" height="120" onerror="this.style.display='none'"/>
</p>

<p align="center">
  <strong>แพลตฟอร์มการจัดการเรียนรู้ดิจิทัล (LMS EdTech) สำหรับโรงเรียนมัธยมศึกษา</strong><br>
  พร้อมระบบ Interactive Code Playground (Python WASM), AI Quiz Generator, Landing Page CMS และ Certificate Verification
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Go-1.25+-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go 1.25+" />
  <img src="https://img.shields.io/badge/Fiber-v2-00ACD7?style=for-the-badge&logo=fastapi&logoColor=white" alt="Fiber v2" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Bun-1.3+-FBF0DF?style=for-the-badge&logo=bun&logoColor=black" alt="Bun 1.3+" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📖 สารบัญ (Table of Contents)

1. [🌟 ภาพรวมโครงการ (Project Overview)](#-ภาพรวมโครงการ-project-overview)
2. [✨ ฟีเจอร์เด่น (Key Features Showcase)](#-ฟีเจอร์เด่น-key-features-showcase)
   - [🧑‍🎓 สำหรับนักเรียน (Student Portal)](#-สำหรับนักเรียน-student-portal)
   - [👩‍🏫 สำหรับครูผู้สอน (Teacher Portal)](#-สำหรับครูผู้สอน-teacher-portal)
   - [👨‍💼 สำหรับผู้ดูแลระบบ (Admin Portal)](#-สำหรับผู้ดูแลระบบ-admin-portal)
   - [🛡️ ความปลอดภัยและประสบการณ์ผู้ใช้ (Security & UX)](#️-ความปลอดภัยและประสบการณ์ผู้ใช้-security--ux)
3. [🛠️ สถาปัตยกรรมทางเทคโนโลยี (Tech Stack & Architecture)](#️-สถาปัตยกรรมทางเทคโนโลยี-tech-stack--architecture)
4. [📋 สิ่งที่ต้องเตรียมก่อนเริ่มใช้งาน (Prerequisites)](#-สิ่งที่ต้องเตรียมก่อนเริ่มใช้งาน-prerequisites)
5. [🚀 ติดตั้งและเริ่มต้นใช้งานด่วนด้วย Docker (Quickstart with Docker)](#-ติดตั้งและเริ่มต้นใช้งานด่วนด้วย-docker-quickstart-with-docker)
6. [💻 ติดตั้งสำหรับโหมดพัฒนา (Local Development Guide)](#-ติดตั้งสำหรับโหมดพัฒนา-local-development-guide)
7. [🔑 บัญชีผู้ใช้ทดสอบเริ่มต้น (Default Accounts)](#-บัญชีผู้ใช้ทดสอบเริ่มต้น-default-accounts)
8. [⚙️ การตั้งค่า Environment Variables (`.env`)](#️-การตั้งค่า-environment-variables-env)
9. [🗂️ โครงสร้างโฟลเดอร์โปรเจกต์ (Project Structure)](#️-โครงสร้างโฟลเดอร์โปรเจกต์-project-structure)
10. [❓ คำถามและวิธีแก้ปัญหาที่พบบ่อย (Troubleshooting & FAQ)](#-คำถามและวิธีแก้ปัญหาที่พบบ่อย-troubleshooting--faq)
11. [📄 สิทธิ์การใช้งานและการพัฒนาต่อ (License & Contribution)](#-สิทธิ์การใช้งานและการพัฒนาต่อ-license--contribution)

---

## 🌟 ภาพรวมโครงการ (Project Overview)

**TUNorth-Hub** เป็นระบบการจัดการเรียนการสอนออนไลน์ (Learning Management System - LMS) ระดับ Enterprise ที่ถูกพัฒนาขึ้นเพื่อตอบโจทย์สถานศึกษาขนาดกลางถึงใหญ่ (~2,000+ ผู้ใช้งาน) โดยเน้นความเร็ว ความเสถียร ความทันสมัย และความง่ายในการใช้งาน

ตัวระบบขับเคลื่อนด้วยสถาปัตยกรรม **Clean Architecture**:
- ฝั่งหน้าบ้าน (Frontend) พัฒนาด้วย **Next.js 16 (App Router)** ร่วมกับ **Tailwind CSS v4** และเครื่องมือ **Bun**
- ฝั่งหลังบ้าน (Backend API) ทำงานบนภาษา **Go (Fiber v2 Framework)** ประสิทธิภาพสูง รองรับ Concurrent Users ได้อย่างลื่นไหล
- ฐานข้อมูลหลัก **PostgreSQL 17** และแคชความเร็วสูงด้วย **Redis 7**

```mermaid
graph TD
    Client[Web Browser / Mobile / Tablet] -->|HTTPS / Port 80| Nginx[Nginx Reverse Proxy]
    Nginx -->|SSR / Static Assets| Frontend[Next.js 16 Frontend :3000]
    Nginx -->|/api/* Requests| Backend[Go Fiber API Backend :8080]
    Backend -->|Data Persistence| PostgreSQL[(PostgreSQL 17 DB)]
    Backend -->|Session / Cache| Redis[(Redis 7 Cache)]
    Backend -->|Media Stream| LocalStorage[Local Volume Uploads]
    Frontend -->|Interactive Python| Pyodide[Pyodide WASM Engine]
```

---

## ✨ ฟีเจอร์เด่น (Key Features Showcase)

### 🧑‍🎓 สำหรับนักเรียน (Student Portal)
- 📚 **ห้องเรียนออนไลน์ On-Demand**: รองรับสื่อหลากหลายประเภท ทั้งไฟล์วิดีโอ MP4 สตรีมตรง, YouTube/Drive Embed, ไฟล์สไลด์เอกสาร PDF พร้อมระบบดูในตัว และเนื้อหาบทเรียน Text
- 🐍 **Interactive Code Playground (Python WASM)**: พื้นที่ฝึกเขียนและรันโค้ดภาษา Python ในเว็บเบราว์เซอร์ได้ทันทีโดยไม่ต้องติดตั้งโปรแกรม ขับเคลื่อนด้วย Monaco Editor และ Pyodide WebAssembly รองรับคำสั่ง `input()` โต้ตอบแบบ Interactive
- 📝 **Interactive Quiz Engine**: ระบบทำแบบทดสอบออนไลน์พร้อมนาฬิกานับเวลาถอยหลัง ตรวจคำตอบอัตโนมัติ สรุปผลคะแนนทันที และการจำกัดจำนวนครั้งการทำแบบทดสอบ (Quiz Attempt Limit)
- 📤 **ระบบส่งการบ้าน (Assignments)**: แนบไฟล์งานหรือพิมพ์คำตอบส่งครูผู้สอน พร้อมดูคะแนนและ Feedback ย้อนหลัง
- 📜 **ใบประกาศนียบัตรอัจฉริยะ (Certificates)**: รับใบรับรองมาตรฐานทันทีเมื่อเรียนจบคอร์ส 100% พร้อมรหัสรับรองเฉพาะและ **Dynamic QR Code** สั่งพิมพ์ขนาด A4 แนวนอน (1-Page Landscape) ได้สวยงาม
- 🔍 **พอร์ทัลตรวจสอบใบรับรองสาธารณะ (`/verify`)**: ตรวจสอบความถูกต้องของเกียรติบัตรได้แบบสาธารณะผ่านกล้องสแกน QR Code หรือกรอกรหัสยืนยัน

### 👩‍🏫 สำหรับครูผู้สอน (Teacher Portal)
- 🛠️ **Course & Module Builder**: สร้างและจัดการบทเรียนได้อิสระ ลากจัดลำดับบทเรียน (Reorder) กำหนดเวลาเรียนขั้นต่ำ (Anti-Skipping) และตารางเปิดเรียนล่วงหน้า (Drip Schedule)
- 👁️ **In-Builder Lesson Preview**: พรีวิวดูมุมมองของนักเรียนได้ทันทีขณะแก้ไขบทเรียน
- 🤖 **AI Quiz Generator & Multi-AI Support**: ตัวช่วยออกข้อสอบอัตโนมัติด้วย AI รองรับทั้ง **Google Gemini (Multimodal PDF/Video Grounding)**, **OpenAI (GPT-4o)**, **Anthropic Claude** และโมเดล Local/Custom ผ่าน OpenAI-Compatible API
- 📊 **Batch Quiz Import Engine**: นำเข้าชุดข้อสอบจากไฟล์ **Excel (.xlsx)** หรือ **CSV** ได้ในคลิกเดียว พร้อมระบบตรวจจับเฉลยอัจฉริยะ โหมด Append (เพิ่มต่อท้าย) หรือ Replace (แทนที่ทั้งหมด) พร้อมดาวน์โหลดไฟล์แม่แบบ
- ✍️ **ระบบตรวจการบ้าน (Grading Dashboard)**: ดูรายการการบ้านที่นักเรียนส่ง ให้คะแนน และพิมพ์คำแนะนำติชมกลับไปให้นักเรียน

### 👨‍💼 สำหรับผู้ดูแลระบบ (Admin Portal)
- 👥 **ระบบจัดการผู้ใช้งาน (User Management)**: สร้าง ค้นหา แก้ไข และลบบัญชีผู้ใช้งาน พร้อมระบบ **Batch User Import** นำเข้าข้อมูลนักเรียนทั้งระดับชั้น/ห้องเรียนผ่านไฟล์ Excel/CSV
- 🏷️ **จัดการหมวดหมู่รายวิชา (Categories Management)**: สร้างและจัดเรียงหมวดหมู่กลุ่มสาระการเรียนรู้ ปรับแต่งสีและลำดับการแสดงผล
- 🎨 **Dynamic Landing Page CMS**: ปรับแต่งหน้าแรกของเว็บไซต์ได้แบบ Real-time แยกเป็น 7 หมวดหมู่ (Hero Banner, Stats Bar, Features Grid, Featured Courses, Steps, FAQ Accordion, CTA Footer)
- 🏫 **School Branding & Theme Customizer**: อัปโหลดโลโก้โรงเรียน, Favicon, ลายเซ็นผู้อำนวยการบนเกียรติบัตร และเปลี่ยนสีธีมหลัก (Primary Color) ได้ทันที
- 🚨 **Maintenance Mode & Health Diagnostics**: สวิตช์ปิดปรับปรุงระบบชั่วคราว พร้อมแดชบอร์ดตรวจสอบสุขภาพ Server (PostgreSQL, Redis, Storage และ Go Runtime)

### 🛡️ ความปลอดภัยและประสบการณ์ผู้ใช้ (Security & UX)
- 🔒 **Strict Role Isolation (RBAC 100%)**: แบ่งสิทธิ์ระหว่าง Admin, Teacher และ Student ชัดเจน ป้องกันการเข้าถึงข้ามสิทธิ์อย่างเด็ดขาด
- 🔑 **Secure Authentication**: ยืนยันตัวตนด้วย JWT ผ่าน HTTP-Only Cookies ปลอดภัยจากการโจมตี XSS/CSRF พร้อมระบบ Silent Token Refresh
- 🌓 **Dark / Light Mode Support**: สลับโหมดกลางวัน/กลางคืนอัตโนมัติหรือเลือกได้ตามต้องการ
- 🔔 **Sonner Toast Notification System**: แจ้งเตือนสถานะการทำงานด้วย Toast แบบโมเดิร์น สวยงามและไม่ขัดจังหวะการใช้งาน

---

## 🛠️ สถาปัตยกรรมทางเทคโนโลยี (Tech Stack & Architecture)

| ส่วนประกอบ (Component) | เทคโนโลยีที่เลือกใช้ (Technology) | หน้าที่ / คำอธิบาย (Description) |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router) + React 19** | ระบบหน้าบ้าน รองรับ Server & Client Components และ SEO Optimization |
| **Frontend Runtime & Tooling** | **Bun 1.3+** | Package Manager และ Script Runner ความเร็วสูง |
| **Styling & Icons** | **Tailwind CSS v4 + Lucide React** | ตกแต่งหน้าจอด้วย Modern Utility-first CSS และไอคอนที่คมชัด |
| **In-Browser IDE** | **Monaco Editor + Pyodide (WASM)** | ระบบ Code Playground รัน Python บน Browser โดยตรง |
| **Notification System** | **Sonner Toast (`sonner`)** | ระบบแจ้งเตือนผลการทำงานที่ลื่นไหลระดับสากล |
| **Backend API** | **Go (Golang 1.25+) + Fiber v2** | Backend Web Framework ประสิทธิภาพสูง กินทรัพยากรน้อย |
| **ORM & Database Tool** | **GORM** | Database Mapping & Auto Migrations |
| **Database** | **PostgreSQL 17** | จัดเก็บข้อมูลเชิงสัมพันธ์ รองรับ JSONB และ UUID |
| **Cache & Session** | **Redis 7 (Alpine)** | แคชข้อมูลและจัดการ Token Blacklist |
| **Dev Live Reload** | **Air (v1.64+)** | Hot-Reload สำหรับ Backend ฝั่ง Go ในระหว่างพัฒนา |
| **Container & Proxy** | **Docker Compose + Nginx** | รวมบริการทั้งหมดเป็น Container พร้อม Reverse Proxy |

---

## 📋 สิ่งที่ต้องเตรียมก่อนเริ่มใช้งาน (Prerequisites)

ก่อนเริ่มติดตั้ง กรุณาตรวจสอบว่าเครื่องคอมพิวเตอร์ของคุณมีโปรแกรมเหล่านี้ติดตั้งอยู่แล้ว:

### วิธีที่ 1: ติดตั้งผ่าน Docker (⭐ แนะนำสำหรับผู้เริ่มต้น)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (สำหรับ Windows / macOS) หรือ **Docker Engine + Docker Compose** (สำหรับ Linux)
- [Git](https://git-scm.com/downloads) สำหรับ Clone โค้ดจาก GitHub

### วิธีที่ 2: ติดตั้งสำหรับพัฒนาแบบแยกส่วน (Local Development)
- [Bun](https://bun.sh/) (v1.2 หรือใหม่กว่า)
- [Go](https://go.dev/dl/) (v1.25 หรือใหม่กว่า)
- [PostgreSQL](https://www.postgresql.org/download/) (v16 หรือ v17)
- [Redis](https://redis.io/download/) (v7)
- [Air](https://github.com/air-verse/air) (สำหรับ Go Live-Reload: `go install github.com/air-verse/air@latest`)

---

## 🚀 ติดตั้งและเริ่มต้นใช้งานด่วนด้วย Docker (Quickstart with Docker)

> [!TIP]
> วิธีนี้เป็นวิธีที่ง่ายที่สุด ไม่จำเป็นต้องลงภาษา Go หรือ Bun ในเครื่อง แค่มี **Docker Desktop** เปิดอยู่ก็รันได้ทันที!

### ขั้นตอนที่ 1: Clone Repository
เปิด Terminal (หรือ PowerShell) แล้วสั่ง Clone โปรเจกต์ลงในเครื่อง:
```bash
git clone https://github.com/NOGiTTiS/Hub.git
cd Hub
```

### ขั้นตอนที่ 2: เตรียมไฟล์ Environment Variables
คัดลอกไฟล์ `.env.example` เพื่อสร้างไฟล์ `.env`:

**สำหรับ Linux / macOS:**
```bash
cp .env.example .env
```

**สำหรับ Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

### ขั้นตอนที่ 3: สั่งรันระบบด้วย Docker Compose
สั่ง Build และ Start คอนเทนเนอร์ทั้งหมด (PostgreSQL 17, Redis 7, Backend Go API, Frontend Next.js และ Nginx):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
> รอระบบดาวน์โหลดและ Build ประมาณ 2-5 นาทีในครั้งแรก

### ขั้นตอนที่ 4: รัน Seeder สร้างข้อมูลและบัญชีผู้ใช้เริ่มต้น
เมื่อคอนเทนเนอร์เริ่มทำงานเรียบร้อยแล้ว ให้สั่งรัน Seeder เพื่อสร้างฐานข้อมูลและบัญชีทดสอบ:

```bash
docker exec -it tunorth_backend /app/seed
```

### ขั้นตอนที่ 5: เข้าใช้งานระบบ 🎉
เปิดเว็บเบราว์เซอร์แล้วเข้าไปที่:
- 🌐 **หน้าเว็บหลัก (TUNorth-Hub):** [http://localhost:3000](http://localhost:3000) (หรือ [http://localhost](http://localhost))
- 🔌 **Backend API Health Check:** [http://localhost:8080/health](http://localhost:8080/health)

---

## 💻 ติดตั้งสำหรับโหมดพัฒนา (Local Development Guide)

หากคุณต้องการแก้ไขโค้ดและพัฒนาฟีเจอร์เพิ่มเติม แนะนำให้รันแบบแยกส่วนดังนี้:

### 1. รัน Database & Redis ด้วย Docker
รันเฉพาะฐานข้อมูลและแคชเพื่อไม่ต้องติดตั้งลงบนเครื่องโดยตรง:
```bash
docker compose up -d postgres redis
```

### 2. รันฝั่ง Backend (Go Fiber)
เปิด Terminal ที่ 1:
```bash
cd backend

# ติดตั้ง Go dependencies
go mod download

# รัน Migration และสร้างข้อมูลทดสอบเริ่มต้น (ทำครั้งแรก)
go run cmd/seed/main.go

# รันเซิร์ฟเวอร์แบบ Hot-Reload ด้วย Air
air
# หรือรันแบบธรรมดา: go run cmd/server/main.go
```
> API Server จะทำงานที่ `http://localhost:8080`

### 3. รันฝั่ง Frontend (Next.js 16 + Bun)
เปิด Terminal ที่ 2:
```bash
cd frontend

# ติดตั้ง Dependencies ด้วย Bun
bun install

# สตาร์ท Next.js Development Server
bun run dev
```
> หน้าเว็บ Frontend จะพร้อมใช้งานที่ `http://localhost:3000`

> [!IMPORTANT]
> **กฎเหล็กสำหรับการพัฒนาฝั่ง Frontend**: ห้ามใส่เครื่องหมาย Semicolon (`;`) ในไฟล์ JavaScript/TypeScript เด็ดขาด (โปรเจกต์บังคับผ่าน ESLint & Prettier `semi: false` / `semi: never`)

---

## 🔑 บัญชีผู้ใช้ทดสอบเริ่มต้น (Default Accounts)

หลังจากรันคำสั่ง Seed ข้อมูลเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยบัญชีทดสอบเหล่านี้:

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์การเข้าถึงและการใช้งาน |
| :--- | :--- | :--- | :--- |
| 👨‍💼 **ผู้ดูแลระบบ (ADMIN)** | `admin@tunorth.ac.th` | `Password123!` | จัดการผู้ใช้, หมวดหมู่, Dynamic Landing CMS, ตั้งค่าระบบ, ดูแลภาพรวม |
| 👩‍🏫 **ครูผู้สอน (TEACHER)** | `teacher@tunorth.ac.th` | `Password123!` | สร้างคอร์ส, AI Quiz Generator, นำเข้าข้อสอบ Excel/CSV, ตรวจการบ้าน |
| 🧑‍🎓 **นักเรียน 1 (STUDENT)** | `student1@tunorth.ac.th` | `Password123!` | เรียน On-Demand, เขียนโค้ด Python WASM, ทำแบบทดสอบ, รับเกียรติบัตร |
| 🧑‍🎓 **นักเรียน 2 (STUDENT)** | `student2@tunorth.ac.th` | `Password123!` | บัญชีนักเรียนสำหรับทดสอบการใช้งานหลายผู้ใช้พร้อมกัน |

---

## ⚙️ การตั้งค่า Environment Variables (`.env`)

คุณสามารถปรับแต่งค่าคอนฟิกต่างๆ ผ่านไฟล์ `.env` ได้ดังนี้:

| ตัวแปร (Variable) | ค่าเริ่มต้น (Default) | คำอธิบาย (Description) |
| :--- | :--- | :--- |
| `APP_ENV` | `development` / `production` | สภาพแวดล้อมการทำงานของระบบ |
| `PORT` | `8080` | พอร์ตสำหรับ Backend API Server |
| `DB_HOST` | `postgres` หรือ `localhost` | โฮสต์หรือชื่อคอนเทนเนอร์ของ PostgreSQL |
| `DB_PORT` | `5432` | พอร์ตของ PostgreSQL |
| `DB_USER` | `postgres` | บัญชีผู้ใช้ฐานข้อมูล |
| `DB_PASSWORD` | `postgres` | รหัสผ่านฐานข้อมูล |
| `DB_NAME` | `tunorth_hub` | ชื่อฐานข้อมูล |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Connection String สำหรับต่อ PostgreSQL |
| `REDIS_URL` | `redis:6379` หรือ `localhost:6379` | ที่อยู่สำหรับการเชื่อมต่อ Redis Cache |
| `JWT_SECRET` | *(Random Secret Key)* | คีย์ความลับสำหรับเข้ารหัสและถอดรหัส JWT Token |
| `UPLOAD_DIR` | `/var/tunorth_data/uploads` | ไดเรกทอรีสำหรับจัดเก็บไฟล์ที่อัปโหลด (วิดีโอ/PDF/รูปภาพ) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | รายการ URL ที่อนุญาตให้เรียกใช้งาน API (CORS) |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8080` | URL ฝั่ง Backend API ที่ Frontend จะเรียกใช้งาน |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini API Key สำหรับฟีเจอร์ AI ออกข้อสอบ |

---

## 🗂️ โครงสร้างโฟลเดอร์โปรเจกต์ (Project Structure)

```text
Hub/
├── backend/                     # Go Fiber Backend API
│   ├── cmd/
│   │   ├── server/main.go       # Entrypoint หลักของ API Server
│   │   ├── seed/main.go         # Script สร้างข้อมูลเริ่มต้นในฐานข้อมูล
│   │   └── loadtest/            # Benchmark & Load Testing Tools
│   ├── internal/                # Clean Architecture Logic
│   │   ├── config/              # โหลด Environment Variables
│   │   ├── database/            # การเชื่อมต่อ PostgreSQL & Redis
│   │   ├── handlers/            # HTTP Request Handlers (Auth, Course, Quiz, Admin, ฯลฯ)
│   │   ├── middleware/          # Auth JWT, Role Guard & CORS Middlewares
│   │   ├── models/              # GORM Database Entities
│   │   ├── routes/              # กำหนด API Endpoint Routing
│   │   ├── services/            # Business Logic & AI Multi-Provider Integration
│   │   └── utils/               # Helper Functions (JWT, Password Hash, File Helpers)
│   ├── Dockerfile               # Docker Build สำหรับ Backend
│   └── go.mod / go.sum          # รายการ Go Dependencies
│
├── frontend/                    # Next.js 16 (App Router) Frontend
│   ├── src/
│   │   ├── app/                 # Next.js App Router Pages
│   │   │   ├── page.tsx         # หน้าแรก (Dynamic Landing Page)
│   │   │   ├── login/           # หน้าเข้าสู่ระบบ
│   │   │   ├── register/        # หน้านักเรียนสมัครสมาชิกด้วยตนเอง
│   │   │   ├── profile/         # หน้าจัดการโปรไฟล์ผู้ใช้และสถิติ
│   │   │   ├── student/         # หน้าห้องเรียนและมุมมองนักเรียน
│   │   │   ├── teacher/         # หน้าจัดการคอร์สและการบ้านของครู
│   │   │   ├── admin/           # หน้าแดชบอร์ดจัดการระบบของ Admin
│   │   │   └── verify/          # หน้าตรวจสอบใบประกาศนียบัตรสาธารณะ
│   │   ├── components/          # Reusable UI Components
│   │   │   ├── CodePlayground.tsx   # Python IDE (Pyodide WASM + Monaco)
│   │   │   ├── CertificateModal.tsx # ใบประกาศนียบัตรพร้อม QR Code
│   │   │   ├── QuizEngine.tsx       # ระบบทำแบบทดสอบจับเวลา
│   │   │   └── ...
│   │   └── lib/                 # Utility Functions (API Client, Toast, Theme)
│   ├── public/                  # Static Assets (Images, Icons, Pyodide scripts)
│   ├── package.json             # Bun Dependencies & Scripts
│   └── Dockerfile               # Docker Build สำหรับ Frontend
│
├── docs/                        # เอกสารสเปกและแผนงานระบบ (System Specifications)
│   ├── spec.md                  # ข้อกำหนดของระบบและ Roadmap
│   └── ...
├── docker-compose.prod.yml      # Docker Compose รวมระบบทั้งหมดพร้อมใช้งาน
├── docker-compose.yml           # Docker Compose สำหรับโหมดพัฒนา
├── .env.example                 # แม่แบบการตั้งค่า Environment
└── README.md                    # คู่มือการติดตั้งและใช้งาน (เอกสารนี้)
```

---

## ❓ คำถามและวิธีแก้ปัญหาที่พบบ่อย (Troubleshooting & FAQ)

### Q1: สั่งรัน Docker แล้วเจอปัญหา Port ชน (เช่น Port 80, 5432 หรือ 3000 ถูกใช้งานอยู่)?
> **วิธีแก้**: ตรวจสอบว่าในเครื่องมีโปรแกรมอื่นเช่น IIS, XAMPP, Apache หรือ PostgreSQL ตัวเดิมรันอยู่หรือไม่ คุณสามารถปิดโปรแกรมเหล่านั้น หรือเปลี่ยน Port ภายนอกในไฟล์ `docker-compose.prod.yml` เช่น เปลี่ยน `"80:80"` เป็น `"8080:80"` หรือเปลี่ยน `"3000:3000"` เป็น `"3001:3000"`

### Q2: รัน `docker exec -it tunorth_backend /app/seed` แล้วแจ้งเตือน Database connection failed?
> **วิธีแก้**: รอให้คอนเทนเนอร์ `tunorth_postgres` เริ่มต้นทำงานและผ่าน Healthcheck ให้เรียบร้อยก่อน (ประมาณ 5-10 วินาทีหลังจากสั่ง `docker compose up`) แล้วลองสั่งรันคำสั่ง Seed ใหม่อีกครั้ง

### Q3: กดเข้าใช้งาน Code Playground (Python) แล้วขึ้นโหลดนานหรือรันไม่ได้?
> **วิธีแก้**: ในการเปิด Code Playground ครั้งแรก เบราว์เซอร์จะทำการดาวน์โหลด Pyodide WebAssembly (~10-20MB) มาเก็บไว้ในแคชของเบราว์เซอร์ กรุณารอจนกว่าสถานะจะขึ้น "Python Ready" สีเขียว

### Q4: หน้าเว็บแสดงผลเพี้ยนหรือไม่โหลด CSS หลังจากการอัปเดตโค้ด?
> **วิธีแก้**: สำหรับฝั่ง Frontend ให้สั่งล้างแคชของ Next.js และลง Dependencies ใหม่:
> ```bash
> cd frontend
> rm -rf .next node_modules
> bun install
> bun run dev
> ```

---

## 📄 สิทธิ์การใช้งานและการพัฒนาต่อ (License & Contribution)

- โปรเจกต์นี้พัฒนาขึ้นเพื่อการศึกษาและการใช้งานภายใน **โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ**
- หากต้องการร่วมพัฒนา (Contribute) หรือรายงานปัญหา (Issue) สามารถสร้าง **Pull Request** หรือเปิด **Issue** ผ่านหน้า GitHub Repository ได้ทันที

---

<p align="center">
  สร้างสรรค์ด้วย ❤️ เพื่อพัฒนาการศึกษาไทยยุคดิจิทัล<br>
  <strong>TUNorth-Hub Team</strong>
</p>
