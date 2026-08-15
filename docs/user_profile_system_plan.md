# 👤 Implementation Plan: ระบบโปรไฟล์ผู้ใช้งาน (User Profile System)

> แพลตฟอร์มการจัดการเรียนรู้ดิจิทัล TUNorth-Hub (Online Learning Platform for High School - LMS EdTech)  
> แผนงานการพัฒนาระบบข้อมูลส่วนตัว ความปลอดภัย และสถิติการใช้งานสำหรับผู้ใช้ทุกบทบาท (Student, Teacher, Admin)

---

## 📌 1. วัตถุประสงค์และภาพรวม (Goal & Overview)

พัฒนาระบบ **User Profile (โปรไฟล์ผู้ใช้งาน)** แบบครบวงจร เพื่อให้ผู้ใช้งานทุกบทบาทสามารถจัดการข้อมูลส่วนบุคคล อัปโหลดและเปลี่ยนรูปภาพโปรไฟล์ (Avatar) ปรับแต่งคำแนะนำตัว (Bio) และข้อมูลติดต่อ เปลี่ยนรหัสผ่านได้อย่างปลอดภัย พร้อมทั้งเรียกดูสถิติส่วนบุคคลที่ปรับเปลี่ยนตามบทบาท (Role-Adaptive Activity Stats) ได้อย่างสะดวกและสวยงามตาม Design System ของโรงเรียน

### 📋 รายการงานหลักและผลกระทบ (Overview Checklist)
- [x] **การวิเคราะห์ผลกระทบ (Impact Analysis):** ยืนยัน Zero Breaking Change ต่อระบบคอร์ส การบ้าน ข้อสอบ และใบประกาศนียบัตร
- [x] **การออกแบบและขยายฐานข้อมูล (Database Schema):** เพิ่มฟิลด์ `avatar_url`, `bio`, `phone_number` บนตาราง `users`
- [x] **การพัฒนาระบบหลังบ้าน (Backend API):** เพิ่มโมดูล `/api/profile` รองรับการดึงข้อมูล, แก้ไขโปรไฟล์, และเปลี่ยนรหัสผ่าน
- [x] **การพัฒนาหน้าต่างโปรไฟล์ (Frontend Profile View):** สร้างหน้า `/profile` พร้อมระบบ Tabs (ข้อมูลทั่วไป, ความปลอดภัย, สถิติส่วนตัว)
- [x] **การเชื่อมโยงระบบนำทาง (Navbar & UI Integration):** แสดงผล Avatar จริงและ Fallback อักษรย่อบน Navbar และเมนูนำทาง
- [x] **การทดสอบความถูกต้องและประสิทธิภาพ (Testing & Verification):** ทดสอบ Lint, Build, API Integration และ Role-Based Data Flow
- [x] **การอัปเดตเอกสารระบบ (Documentation Updates):** บันทึกการเปลี่ยนแปลงใน `docs/spec.md` และ `gemini.md`

---

## 🔍 2. สรุปผลกระทบต่อระบบ (System Impact Assessment)

| ส่วนของระบบ | สิ่งที่เปลี่ยนแปลง | ระดับผลกระทบ | การจัดการความเข้ากันได้ (Compatibility) |
| :--- | :--- | :---: | :--- |
| **PostgreSQL 17 Database** | เพิ่มคอลัมน์ `avatar_url`, `bio`, `phone_number` ในตาราง `users` | 🟢 ต่ำ (Non-breaking) | คอลัมน์เป็น Nullable ทั้งหมด รองรับ GORM AutoMigrate ข้อมูลเดิมไม่สูญหาย |
| **Go Fiber Backend** | เพิ่ม Handler & Routes กลุ่ม `/api/profile` (`GET /`, `PUT /`, `PUT /password`) | 🟢 ต่ำ (Isolated) | แยกเลเยอร์ชัดเจน ไม่กระทบ API คอร์ส การบ้าน แบบทดสอบ หรือ Admin |
| **Auth & Security** | ตรวจสอบ `current_password` ผ่าน Bcrypt ก่อนเปลี่ยนรหัสผ่าน และล็อก Role ถาวร | 🟢 ปลอดภัยสูง | ป้องกัน Privilege Escalation และการแก้ไขบทบาทโดยมิชอบ |
| **Frontend Navbar & UI** | อัปเกรด User Section ใน Navbar ให้แสดงรูป Avatar และปุ่มไปหน้า `/profile` | 🟡 ปานกลาง (UI Polish) | รองรับ Responsive ทุกอุปกรณ์ (PC, Tablet/iPad, Mobile) และ Dark/Light Mode |
| **Certificates System** | เชื่อมโยงชื่อ-นามสกุลกับเกียรติบัตร | 🟢 ไม่มีผลข้างเคียง | ใช้ชื่อปัจจุบันในการออกหรือแสดงผลใบประกาศนียบัตรอย่างถูกต้อง |

---

## 🏛️ 3. สถาปัตยกรรมการทำงาน (Architecture & Data Flow)

```mermaid
graph TD
    Client[Next.js 16 Frontend: /profile] -->|1. GET /api/profile| API[Go Fiber Backend]
    Client -->|2. POST /api/upload| UploadHandler[Media Upload Service]
    UploadHandler -->|3. Save Image File| Storage[/uploads/covers or /uploads/avatars]
    Client -->|4. PUT /api/profile| API
    Client -->|5. PUT /api/profile/password| API
    
    API -->|Query / Update| DB[(PostgreSQL 17: users table)]
    API -->|Aggregated Stats| DB
    API -->|Verify Session| Redis[(Redis 7: Token Validation)]
```

### 📋 สถาปัตยกรรมและการไหลของข้อมูล Checklist
- [ ] **Role-Adaptive Statistics:** ดึงสถิติเฉพาะบุคคลตาม Role (Student: ความก้าวหน้าและเกียรติบัตร / Teacher: คอร์สและงานรอตรวจ / Admin: บัญชีและระบบ)
- [ ] **Avatar Asset Delivery:** ส่งมอบไฟล์รูปภาพผ่าน `getMediaUrl()` และ Nginx Reverse Proxy
- [ ] **Centralized Auth Sync:** อัปเดตข้อมูลผู้ใช้ใน `AuthContext` ผ่าน `refreshUser()` ทันทีหลังบันทึกโปรไฟล์

---

## 🛠️ 4. แผนงานย่อยและ Checklists รายละเอียด (Detailed Checklists)

### 📌 ส่วนที่ 1: Database & Data Models
- [x] แก้ไขโมเดล `User` ใน `backend/internal/models/models.go`:
  - [x] เพิ่ม `AvatarURL *string` (`gorm:"type:varchar(500)" json:"avatar_url,omitempty"`)
  - [x] เพิ่ม `Bio *string` (`gorm:"type:text" json:"bio,omitempty"`)
  - [x] เพิ่ม `PhoneNumber *string` (`gorm:"type:varchar(30)" json:"phone_number,omitempty"`)
- [x] ตรวจสอบความถูกต้องของ Foreign Keys และความเข้ากันได้ของตาราง `users`
- [x] ทดสอบการรัน Database AutoMigrate เพื่อยืนยันว่าไม่มี Error

### 📌 ส่วนที่ 2: Backend API Development (Go 1.25+ & Fiber)
- [x] สร้างไฟล์ Handler ใหม่ `backend/internal/handlers/profile.go`:
  - [x] **`GetProfile` (`GET /api/profile`):**
    - [x] ดึงข้อมูลผู้ใช้จาก Token Claims (`claims.UserID`)
    - [x] รวบรวมสถิติรายบุคคลตาม Role (Student: คอร์สที่ลงทะเบียน, คอร์สที่จบ 100%, ใบประกาศนียบัตร, จำนวนการบ้านที่ส่ง)
    - [x] รวบรวมสถิติครู (Teacher: คอร์สที่สร้าง, นักเรียนในความดูแล, งานที่ยังไม่ได้ตรวจ)
    - [x] รวบรวมสถิติผู้ดูแลระบบ (Admin: จำนวนผู้ใช้ทั้งหมด, คอร์สทั้งหมดในระบบ)
  - [x] **`UpdateProfile` (`PUT /api/profile`):**
    - [x] ตรวจสอบ Payload (First Name, Last Name, Avatar URL, Bio, Phone Number)
    - [x] ป้องกันการแก้ไข `email` และ `role` ผ่าน Endpoint นี้โดยเด็ดขาด
    - [x] บันทึกข้อมูลลงฐานข้อมูลและส่งคืนข้อมูลผู้ใช้ล่าสุด
  - [x] **`ChangePassword` (`PUT /api/profile/password`):**
    - [x] รับ `current_password`, `new_password`
    - [x] ตรวจสอบความยาวรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
    - [x] เปรียบเทียบรหัสผ่านเดิมด้วย `utils.CheckPasswordHash`
    - [x] เข้ารหัสผ่านใหม่ด้วย `utils.HashPassword` และบันทึกลงฐานข้อมูล
- [x] ปรับปรุง `backend/internal/handlers/auth.go`:
  - [x] อัปเดตฟังก์ชัน `Me`, `Login`, `Register` ให้ส่งข้อมูล `avatar_url`, `bio`, `phone_number`
- [x] ปรับปรุง `backend/internal/routes/routes.go`:
  - [x] ลงทะเบียนเส้นทาง `/api/profile` ภายใต้ `middleware.RequireAuth(cfg)`
- [x] เขียน Unit/Integration Test สำหรับ Profile Handlers (`backend/internal/handlers/profile_test.go`)

### 📌 ส่วนที่ 3: Frontend Authentication & State Management
- [x] ปรับปรุง `frontend/src/lib/auth-context.tsx`:
  - [x] อัปเดต Interface `User` ให้รองรับ `avatar_url?: string | null`, `bio?: string | null`, `phone_number?: string | null`
  - [x] ยืนยันฟังก์ชัน `refreshUser()` สามารถดึงข้อมูลโปรไฟล์ล่าสุดได้อย่างแม่นยำ
- [x] ปรับปรุง `frontend/src/lib/api.ts`:
  - [x] ตรวจสอบ Helper `getMediaUrl()` ให้รองรับการแปลง Path ของรูป Avatar ได้ถูกต้อง

### 📌 ส่วนที่ 4: Frontend UI & Profile Page Development
- [x] พัฒนาหน้าโปรไฟล์ `frontend/src/app/profile/page.tsx`:
  - [x] **Profile Header Section:**
    - [x] แสดง Avatar ขนาดใหญ่ พร้อมปุ่ม Camera/Upload สำหรับเปลี่ยนรูป
    - [x] แสดงชื่อ นามสกุล, อีเมล, Role Badge, และข้อมูลระดับชั้น/ห้องเรียน (ถ้าเป็นนักเรียน)
  - [x] **Tab Navigation (Card-based Modern UI):**
    - [x] 👤 **แท็บที่ 1: ข้อมูลส่วนตัว (Personal Information):**
      - [x] ฟอร์มแก้ไขชื่อจริง (`first_name`) และนามสกุล (`last_name`)
      - [x] ฟิลด์แสดงอีเมล (Disabled / Read-only)
      - [x] ฟิลด์แสดงระดับชั้นและห้องเรียน (Read-only สำหรับนักเรียน)
      - [x] ฟิลด์แก้ไขเบอร์โทรศัพท์ติดต่อ (`phone_number`)
      - [x] ฟิลด์คำแนะนำตัวสั้นๆ (`bio`)
      - [x] ปุ่มบันทึกการเปลี่ยนแปลง พร้อมปุ่มหมุนแสดงสถานะกำลังโหลด (Loading Spinner)
    - [x] 🔒 **แท็บที่ 2: ความปลอดภัยและรหัสผ่าน (Security & Password):**
      - [x] ฟิลด์กรอกรหัสผ่านปัจจุบัน (Current Password) พร้อมปุ่มเปิด/ปิดดูรหัสผ่าน
      - [x] ฟิลด์กรอกรหัสผ่านใหม่ (New Password)
      - [x] ฟิลด์ยืนยันรหัสผ่านใหม่ (Confirm New Password)
      - [x] การแจ้งเตือนข้อกำหนดความปลอดภัยของรหัสผ่าน
      - [x] ปุ่มบันทึกรหัสผ่านใหม่พร้อมการแจ้งเตือนด้วย Sonner Toast
    - [x] 📊 **แท็บที่ 3: สถิติและกิจกรรมของฉัน (My Activity & Stats):**
      - [x] การ์ดสถิตินักเรียน: คอร์สที่กำลังเรียน, เรียนจบแล้ว, เกียรติบัตรที่ได้รับ, การบ้านที่ส่ง
      - [x] การ์ดสถิติครูผู้สอน: คอร์สที่รับผิดชอบ, นักเรียนในคอร์ส, การบ้านรอตรวจ
      - [x] การ์ดสถิติผู้ดูแลระบบ: สรุปภาพรวมบัญชีและสถานะสิทธิ์ในระบบ
- [x] เพิ่มการแจ้งเตือนด้วย **Sonner Toast** (`@/lib/toast`):
  - [x] Success Toast เมื่ออัปเดตข้อมูลหรือเปลี่ยนรหัสผ่านสำเร็จ
  - [x] Error Toast เมื่อรหัสผ่านเดิมไม่ถูกต้องหรือข้อมูลไม่ครบถ้วน

### 📌 ส่วนที่ 5: Navbar & Navigation Integration
- [x] ปรับปรุง `frontend/src/components/navbar.tsx`:
  - [x] เพิ่มการแสดงรูปภาพ Avatar ขนาดเล็กบนแถบเมนูด้านบน
  - [x] แสดงตัวอักษรย่อ (Initials Fallback) หากผู้ใช้ยังไม่ได้ตั้งรูปโปรไฟล์
  - [x] เพิ่มปุ่ม/ลิงก์ "โปรไฟล์ของฉัน" (My Profile) เพื่อนำทางไปยัง `/profile`
  - [x] ปรับปรุง Mobile/Tablet Drawer Menu ให้มีปุ่มเข้าหน้า Profile
  - [x] ตรวจสอบว่า `RoleGuard` และ Navigation Router ทำงานถูกต้อง ไม่ติด Block Role Isolation

### 📌 ส่วนที่ 6: Testing, Quality Assurance & Verification
- [x] **Backend Tests:**
  - [x] ทดสอบ `go test ./internal/handlers -v` (Passed 100%)
  - [x] ทดสอบ `go build ./cmd/server` (Compiled Successfully)
- [x] **Frontend Code Quality & Standards:**
  - [x] ตรวจสอบ **ห้ามมี Semicolon (`;`)** ในโค้ด TypeScript/React ทุกไฟล์ 100%
  - [x] ทดสอบ `bun run build` ยืนยันการ Compile ผ่านโดยไม่มี Type Error (Compiled Successfully)
- [ ] **Manual End-to-End Testing (UAT):**
  - [ ] ทดสอบเข้าสู่ระบบด้วย Admin, Teacher, Student
  - [ ] ทดสอบอัปโหลดรูปภาพ Avatar (JPG, PNG, WebP) และพรีวิว
  - [ ] ทดสอบบันทึกข้อมูลส่วนตัว และตรวจสอบการเปลี่ยนแปลงบน Navbar ทันที
  - [ ] ทดสอบเปลี่ยนรหัสผ่าน และทดสอบ Login ด้วยรหัสผ่านใหม่
  - [ ] ทดสอบความถูกต้องของสถิติในแท็บ Activity Stats
  - [ ] ทดสอบการแสดงผลบนหน้าจอ Mobile, iPad Air, และ Desktop

### 📌 ส่วนที่ 7: Documentation & Spec Checklists
- [x] อัปเดต `docs/spec.md` เพื่อบันทึก Entity, API Endpoints, และฟีเจอร์ User Profile
- [x] อัปเดต `gemini.md` เพื่อบันทึกสถานะของระบบและโครงสร้างข้อมูลล่าสุด

---

## 🎯 5. แผนการตรวจสอบและยอมรับงาน (Acceptance Criteria)

1. **ผู้ใช้ทุกบทบาท (Student, Teacher, Admin)** สามารถเปิดหน้า `/profile` เพื่อดูและแก้ไขข้อมูลของตนเองได้
2. **สามารถอัปโหลดและเปลี่ยนรูป Avatar** ได้อย่างราบรื่น โดยรูปภาพแสดงผลตรงกันทั้งในหน้า Profile และ Navbar
3. **ระบบเปลี่ยนรหัสผ่าน** มีการตรวจสอบรหัสผ่านเดิมอย่างถูกต้อง หากรหัสเดิมผิดจะไม่อนุญาตให้เปลี่ยน
4. **ความปลอดภัยของระบบ** ผู้ใช้ไม่สามารถเปลี่ยนแปลงสิทธิ์ Role หรือสวมสิทธิ์เป็นผู้ใช้อื่นได้
5. **โค้ด Frontend** ปราศจาก Semicolon (`;`) 100% และผ่านการตรวจสอบ `bun run lint` และ `bun run build` สมบูรณ์
