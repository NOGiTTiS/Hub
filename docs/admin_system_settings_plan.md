# 📋 แผนการพัฒนาระบบ Admin System Setting (TUNorth-Hub)

> **เอกสารแผนงานและรายการงานย่อย (Implementation Plan & Task Checklist)**  
> สถานะ: `Completed & Verified (เสร็จสมบูรณ์ 100%)`  
> วันที่จัดทำ: 14 สิงหาคม 2569

---

## 1. วัตถุประสงค์และภาพรวม (Goal Description)
เพิ่มระบบ **Admin System Setting (การตั้งค่าระบบสำหรับผู้ดูแลระบบ)** เพื่อให้ผู้ดูแลระบบ (Admin) สามารถกำหนดค่าคอนฟิกต่าง ๆ ของแพลตฟอร์ม TUNorth-Hub ได้อย่างสะดวกรวดเร็วผ่านหน้าเว็บไซต์ โดยไม่ต้องเข้าไปแก้ไขโค้ดหรือฐานข้อมูลโดยตรง โดยครอบคลุม 5 มิติหลัก:

1. **🏫 ข้อมูลองค์กรและเกียรติบัตร (School Profile & Certificate Settings)**: กำหนดชื่อโรงเรียน (ไทย/อังกฤษ), ชื่อระบบ/สโลแกน, ชื่อและตำแหน่งผู้อำนวยการสำหรับแสดงบนใบประกาศนียบัตร (Certificate), ปีการศึกษาและภาคเรียนปัจจุบัน, ข้อมูลติดต่อโรงเรียน
2. **🎨 อัตลักษณ์และธีมสี (School Branding & Custom Theme)**: อัปโหลดโลโก้โรงเรียน (Site Logo), ไอคอนเบราว์เซอร์ (Site Favicon), ชุดสีหลักประจำระบบ (Primary Theme Color) พร้อมการปรับใช้ทั่วทั้งเว็บไซต์แบบ Dynamic Real-time
3. **⚙️ การควบคุมระบบและนโยบายผู้ใช้ (System & Registration Policies)**: สวิตช์เปิด/ปิดการสมัครสมาชิกด้วยตนเองของนักเรียน (Student Self-Registration ใช้งานจริงพร้อมหน้า `/register`), รหัสผ่านเริ่มต้นสำหรับบัญชีนักเรียนใหม่, ขนาดไฟล์อัปโหลดสูงสุด (Max Upload Size in MB)
4. **📢 ระบบประกาศและสถานะบำรุงรักษา (Site-wide Announcements & Enforced Maintenance Mode)**: แถบประกาศข่าวสารด้านบนของเว็บไซต์ (Banner Text, Alert Type: Info/Warning/Success, Enable/Disable Switch, Live Preview) และระบบสวิตช์เปิด Maintenance Mode ดักจับด้วย Middleware และ Maintenance Screen กันผู้ใช้ทั่วไปใช้งานจริง
5. **📊 ข้อมูลสถานะและพื้นที่จัดเก็บระบบ (System Health & Storage Diagnostics)**: หน้ามอนิเตอร์ตรวจเช็กสถานะการทำงานของ Database (PostgreSQL), Cache (Redis), ปริมาณไฟล์และพื้นที่จัดเก็บในโฟลเดอร์ `./uploads` (แยกตาม videos, slides, covers, assignments) และทรัพยากรของ Go Backend Runtime

---

## 2. สิ่งที่ต้องให้ผู้ใช้งานตรวจสอบ (User Review Required)

> [!IMPORTANT]
> - **URL & สิทธิ์การเข้าถึง**: หน้าตั้งค่าระบบอยู่ที่ `http://localhost:3000/admin/settings` ซึ่งเข้าถึงได้เฉพาะผู้ใช้ที่มี Role **`ADMIN`** เท่านั้น
> - **Public API vs Admin API**: ค่าตั้งค่าที่จำเป็นต่อการแสดงผลของนักเรียน/ครู (เช่น ชื่อโรงเรียน, แถบประกาศ, สถานะ Maintenance, โลโก้, Favicon, ธีมสี) สามารถดึงผ่าน Public Endpoint `/api/settings/public` ได้โดยไม่ต้องใช้ Token ส่วนการแก้ไขและการดูสถิติระบบจะถูกจำกัดเฉพาะ Admin
> - **Code Style Enforcement**: โค้ดทั้งหมดใน Frontend ปฏิบัติตามกฎเหล็ก **ห้ามใส่ Semicolon (`;`) เด็ดขาด** และใช้ Bun เป็นตัวจัดการทั้งหมด

---

## 3. รายการงานย่อยและ Checklists (Implementation Checklist)

### 🔹 ส่วนที่ 1: Backend Development (Go Fiber + GORM + PostgreSQL + Redis)
- [x] **1.1 Data Model & Migrations**
  - [x] เพิ่ม `SystemSetting` Struct ใน `backend/internal/models/models.go` (Key, Value, Description, Category, UpdatedAt)
  - [x] เพิ่ม `&models.SystemSetting{}` ใน `AutoMigrate()` ใน `backend/internal/database/database.go`
  - [x] สร้างฟังก์ชัน `SeedDefaultSettings(db *gorm.DB)` เพื่อใส่ค่าเริ่มต้นอัตโนมัติเมื่อระบบเริ่มต้นทำงาน
- [x] **1.2 Settings Handlers**
  - [x] สร้างไฟล์ `backend/internal/handlers/settings.go`
  - [x] พัฒนา `GetPublicSettings`: ส่งคืนการตั้งค่าสาธารณะ เช่น `school_name_th`, `platform_title`, `announcement_*`, `maintenance_*`, `academic_year`, `site_logo_url`, `site_favicon_url`, `theme_primary_color`
  - [x] พัฒนา `GetAdminSettings`: ดึงการตั้งค่าทั้งหมดจัดกลุ่มตาม Category สำหรับหน้า Admin Dashboard
  - [x] พัฒนา `UpdateAdminSettings`: รับ Key-Value JSON map และทำการ Batch Upsert ลงฐานข้อมูล
- [x] **1.3 System Health & Storage Diagnostics Handlers**
  - [x] พัฒนา `GetSystemHealth` ใน `backend/internal/handlers/settings.go`
  - [x] ตรวจวัดสถานะ PostgreSQL: Ping Latency, Connection Pool Stats, Database Size (MB), จำนวน Row ในตารางหลัก
  - [x] ตรวจวัดสถานะ Redis: Ping Latency, Memory Usage, Client Connections
  - [x] คำนวณขนาดและสถิติโฟลเดอร์ Storage (`./uploads/videos`, `./uploads/slides`, `./uploads/covers`, `./uploads/assignments`)
  - [x] ดึงข้อมูล Go Runtime: Goroutine count, Memory allocation, Server Uptime
- [x] **1.4 Route Registration**
  - [x] ลงทะเบียน Public Route `GET /api/settings/public` ใน `backend/internal/routes/routes.go`
  - [x] ลงทะเบียน Admin Protected Routes (`GET /api/admin/settings`, `PUT /api/admin/settings`, `GET /api/admin/settings/system-health`) ใน `backend/internal/routes/routes.go`

---

### 🔹 ส่วนที่ 2: Frontend Development (Next.js 16 App Router + Tailwind CSS + Lucide React)
- [x] **2.1 Navigation & Global Announcement Banner**
  - [x] อัปเดต `frontend/src/components/navbar.tsx` เพิ่มเมนู "ตั้งค่าระบบ (System Settings)" ให้แสดงเฉพาะผู้ใช้ Role `ADMIN`
  - [x] สร้างคอมโพเนนต์ `frontend/src/components/announcement-banner.tsx` ดึงข้อมูลจาก Public Settings และแสดงแถบประกาศด้านบนสุด
  - [x] รองรับการปิดซ่อนประกาศชั่วคราว (Dismissable Banner) ด้วย Session Storage
- [x] **2.2 Admin System Settings Page (`/admin/settings`)**
  - [x] สร้างหน้า `frontend/src/app/admin/settings/page.tsx`
  - [x] **แท็บที่ 1: 🏫 ข้อมูลโรงเรียนและเกียรติบัตร (School & Certificate Profile)**
    - [x] ฟอร์มแก้ไขชื่อโรงเรียน (TH/EN), สโลแกนระบบ
    - [x] ข้อมูลผู้อำนวยการโรงเรียน (ชื่อ-นามสกุล, ตำแหน่ง) สำหรับลงเกียรติบัตร
    - [x] กำหนดปีการศึกษาและภาคเรียนปัจจุบัน
    - [x] ข้อมูลติดต่อและอีเมลผู้ดูแลระบบ
  - [x] **แท็บที่ 2: 🎨 อัตลักษณ์และธีมสี (Branding & Theme Settings)**
    - [x] ระบบอัปโหลดและพรีวิวโลโก้โรงเรียน (Site Logo)
    - [x] ระบบอัปโหลดและพรีวิวไอคอน Favicon บนเบราว์เซอร์ (.ico, .png, .svg)
    - [x] ระบบเลือกธีมสีหลัก (Primary Theme Color) พร้อม 8 Presets และ Color Picker และ Live Preview Box
  - [x] **แท็บที่ 3: ⚙️ การควบคุมระบบและนโยบาย (System & Policy Controls)**
    - [x] สวิตช์เปิด/ปิดการสมัครสมาชิกนักเรียนด้วยตนเอง (Student Self-Registration)
    - [x] รหัสผ่านเริ่มต้นสำหรับบัญชีนักเรียนใหม่ (Default Password)
    - [x] กำหนดขีดจำกัดขนาดไฟล์อัปโหลดสูงสุด (Max File Upload Size in MB)
  - [x] **แท็บที่ 4: 📢 ประกาศและการบำรุงรักษา (Announcements & Maintenance)**
    - [x] สวิตช์เปิด/ปิด แถบประกาศทั่วระบบ (Site-wide Announcement Banner)
    - [x] กล่องข้อความประกาศ พร้อมตัวเลือกรูปแบบ (Info สีฟ้า, Warning สีเหลือง/ส้ม, Success สีเขียว)
    - [x] กล่อง Live Preview แสดงตัวอย่างแถบประกาศเสมือนจริงก่อนบันทึก
    - [x] สวิตช์เปิด/ปิด โหมดปิดปรับปรุงระบบ (Maintenance Mode) พร้อมข้อความแจ้งเตือน
  - [x] **แท็บที่ 5: 📊 สถานะระบบและพื้นที่จัดเก็บ (System Health & Storage Diagnostics)**
    - [x] การ์ดแสดงสถานะ PostgreSQL (Latency, Database Size, ตารางข้อมูล)
    - [x] การ์ดแสดงสถานะ Redis Cache
    - [x] แผนภาพสัดส่วนการใช้พื้นที่จัดเก็บไฟล์ `./uploads` แยกตามประเภท (วิดีโอ, สไลด์, รูปภาพ, การบ้าน)
    - [x] การ์ด Go Runtime (Goroutines, Memory Allocated, Server Uptime)
    - [x] ปุ่ม Refresh เช็กสถานะระบบแบบ Real-time
- [x] **2.3 Code Quality & Linter Compliance**
  - [x] ตรวจสอบว่าไม่มี Semicolon (`;`) ในไฟล์ `.ts` และ `.tsx` ทั้งหมดตามกฎเหล็กโปรเจกต์
  - [x] ตรวจสอบความถูกต้องของ Responsive Layout (Mobile, Tablet, Desktop)

---

### 🔹 ส่วนที่ 3: Verification & Quality Assurance
- [x] **3.1 Automated Verification**
  - [x] ทดสอบคอมไพล์ Backend Go: `go build ./...` (Passed 100%)
  - [x] ทดสอบ Frontend Linter: `bun x eslint` (Passed 100% 0 errors, 0 warnings)
  - [x] ทดสอบ Frontend Build: `bun run build` (Passed 100% All static & dynamic routes generated)
- [x] **3.2 Manual Functional Verification**
  - [x] ล็อกอินด้วยบัญชี Admin (`admin@tunorth.ac.th`) และเข้าเมนู "ตั้งค่าระบบ"
  - [x] ทดสอบแก้ไขและบันทึกข้อมูลโรงเรียน / เกียรติบัตร -> ค่าคงอยู่หลังรีเฟรชถูกต้อง
  - [x] ทดสอบเปิดแถบประกาศและพิมพ์ข้อความ -> แสดงผลถูกต้องทุกหน้าพร้อมปุ่ม Dismiss
  - [x] ทดสอบเรียกดู System Health Diagnostics -> แสดงผลสถิติฐานข้อมูล แคช และ Go Runtime ครบถ้วน
  - [x] ทดสอบ Maintenance Mode -> บล็อกผู้ใช้ทั่วไปแสดงหน้าจอ Maintenance Screen และอนุญาตให้ Admin สลับบัญชี/เข้าทำงานได้
  - [x] ทดสอบ Student Self-Registration -> ลงทะเบียนผ่าน `/register` สร้างผู้ใช้และเข้าสู่ระบบนักเรียนได้จริงเมื่อเปิดนโยบาย
  - [x] ทดสอบ Branding & Theme -> อัปโหลด Logo, Favicon และปรับเปลี่ยน Theme Color แสดงผลจริงทั่วทั้งระบบ

---

### 🔹 ส่วนที่ 4: Extended System Capabilities
- [x] **4.1 Enforced Maintenance Mode (โหมดปิดปรับปรุงระบบทำงานจริง)**
  - [x] สร้าง Backend Middleware `CheckMaintenanceMode` ใน `backend/internal/middleware/maintenance.go` ดักจับคำขอของ Non-Admin และคืนค่า HTTP 503 Service Unavailable
  - [x] ผูก Middleware เข้ากับ API Router ใน `backend/internal/routes/routes.go` พร้อม Whitelist เส้นทางจำเป็นและสิทธิ์ Admin
  - [x] สร้างคอมโพเนนต์ `frontend/src/components/maintenance-guard.tsx` แสดงหน้าจอแจ้งเตือนปิดปรับปรุงระบบเต็มหน้าสำหรับผู้ใช้ทั่วไป
  - [x] รองรับปุ่มตรวจสอบสถานะอีกครั้ง (Real-time check) และปุ่มทางเข้า Login สำหรับเจ้าหน้าที่ Admin
- [x] **4.2 Student Self-Registration (ระบบลงทะเบียนนักเรียนด้วยตนเอง)**
  - [x] เพิ่ม Endpoint `POST /api/auth/register` ใน Backend ตรวจสอบสถานะ `allow_student_registration` และสร้างบัญชีนักเรียน
  - [x] สร้างหน้าสมัครสมาชิก `frontend/src/app/register/page.tsx`
  - [x] เพิ่มปุ่มลิงก์หน้าสมัครสมาชิกใน `frontend/src/app/login/page.tsx`
- [x] **4.3 Branding & Theme Settings (Logo, Favicon & Theme Color)**
  - [x] เพิ่ม Setting Keys (`site_logo_url`, `site_favicon_url`, `theme_primary_color`)
  - [x] เพิ่มส่วนจัดการ Logo / Favicon Upload และ Color Palette Picker ใน Admin Settings
  - [x] เชื่อมโยง Dynamic Logo & Favicon กับ Navbar และ Browser Metadata
