# 📘 System Requirements Specification & Architecture Spec
## ชื่อโครงการ / Project Name: TUNorth-Hub
**แพลตฟอร์มการเรียนรู้ออนไลน์สำหรับโรงเรียนมัธยมศึกษา (Online Learning Platform for High School - LMS EdTech)**

---

## 1. ภาพรวมระบบ (System Overview)

### 1.1 วัตถุประสงค์และวิสัยทัศน์ (Vision & Objective)
**TUNorth-Hub** เป็นแพลตฟอร์มการจัดการเรียนรู้ดิจิทัล (LMS EdTech) ที่ออกแบบมาเพื่อโรงเรียนมัธยมศึกษาโดยเฉพาะ เน้นกลุ่มเป้าหมายนักเรียนมัธยมศึกษาตอนปลาย (~2,000 คน) และคณะครูผู้สอน รองรับการเรียนรู้แบบ On-Demand, การประเมินผลออนไลน์, การจัดการไฟล์วิดีโอ/สไลด์การสอน, การพรีวิวบทเรียนสำหรับครูผู้สอน, **Interactive Code Playground** สำหรับฝึกเขียนโค้ด Python ในเบราว์เซอร์, ระบบส่งและตรวจการบ้าน, ระบบแบบทดสอบออนไลน์พร้อมจับเวลา ตรวจคะแนนอัตโนมัติ และกำหนดจำกัดจำนวนครั้งการทำแบบทดสอบ (Quiz Attempt Limits) ตลอดจน **ระบบออกใบประกาศนียบัตร (Certificate of Completion)** เมื่อเรียนจบ 100% พร้อมหน้าระบบตรวจสอบความถูกต้องของใบรับรองแบบสาธารณะ

### 1.2 ข้อมูลสเกลและการใช้งาน (Target Scale & Workload)
* **ผู้ใช้งานในระบบ (Total Registered Users):** ~2,000 คน (นักเรียน ครู และ Admin)
* **ผู้ใช้งานพร้อมกันสูงสุด (Peak Concurrent Active Users):** ~150 คน
* **สภาพแวดล้อมการติดตั้ง (Deployment Environment):** เซิร์ฟเวอร์โรงเรียน (Ubuntu Server 22.04 LTS On-Premise) ผ่าน Docker Containers

### 1.3 สถาปัตยกรรมทางเทคโนโลยีและการออกแบบ (Tech Stack & Architecture)
* **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Lucide React
* **Typography:** ฟอนต์หลักภาษาไทย **Prompt** (Google Fonts) และฟอนต์ภาษาอังกฤษ/ตัวเลข **Inter**
* **Design System & Theme:** รองรับ **Dark / Light Mode** สลับโหมดสีอัตโนมัติ/กำหนดเอง พร้อมชุดสี Brand Token สีม่วงหลัก (`#5f06c4`), Adaptive Surface, รองรับ Responsive ทุกอุปกรณ์ (PC, Tablet, Mobile)
* **Role-Based Access Control (RBAC):** แยกสิทธิ์การเข้าถึงแบบเด็ดขาด (Strict Role Isolation 100%)
  - 👨‍💼 **ADMIN:** เข้าถึงเฉพาะ `/admin` (ห้ามเข้า `/teacher` และ `/student`)
  - 👩‍🏫 **TEACHER:** เข้าถึงเฉพาะ `/teacher` (ห้ามเข้า `/admin` และ `/student` โดยสามารถพรีวิวบทเรียนผ่าน Preview Modal ภายใน Course Builder)
  - 🧑‍🎓 **STUDENT:** เข้าถึงเฉพาะ `/student` (ห้ามเข้า `/admin` และ `/teacher`)
* **Frontend Tooling & Package Manager:** **Bun** *(ใช้งาน Bun ทั้งหมดสำหรับ Frontend Dependencies, Dev และ Scripts)*
* **Backend API:** **Go 1.25+** + **Fiber Framework (v2)** + **GORM (ORM)**
* **Hot Reload & Dev Engine:** **Air (v1.64+)** รองรับ Live Reload ทั้งบน Local Machine และ Docker Development (`.air.toml`, `Dockerfile.dev`, `docker-compose.dev.yml`)
* **Database & Cache:** **PostgreSQL 17** + **Redis 7**
* **Media & File Storage:** Local Volume Mount บน Host Machine ผ่าน Docker Mount Path (`/var/tunorth_data/uploads`) พร้อมตัวช่วยแปลง Relative Path (`getMediaUrl()`)
* **Interactive Code Playground:** Client-Side WebAssembly (Pyodide v0.26.2 สำหรับ Python) + Monaco Code Editor รองรับการแสดงผล Console, Stderr/Stdout capture, และคำสั่ง `input()` แบบ Interactive ผ่าน `pyodide.setStdin`
* **Assessment & Evaluation:** ระบบ Assignment Submission & Teacher Grading, Interactive Quiz Engine พร้อมตัวนับเวลาถอยหลัง (Timer), ระบบเฉลยตรวจคะแนนอัตโนมัติ และการจำกัดจำนวนครั้งการทำแบบทดสอบ (`max_attempts`)
* **Certificate Engine:** ระบบออกรหัสรับรองมาตรฐาน `TUN-YYYY-XXXX-XXXX`, หน้าต่างเกียรติบัตรพร้อมลายเซ็นและตราประทับโรงเรียน รองรับการสั่งพิมพ์ A4 แนวนอน (1-Page Print Landscape) และหน้าตรวจสอบความถูกต้องสาธารณะ (`/verify/[code]`)
* **DevOps & Proxy:** Nginx Reverse Proxy + Docker & Docker Compose (Production & Dev Stacks)

---

## 2. Data Model (โครงสร้างข้อมูล PostgreSQL 17)

### 2.1 Entity Relationship Summary & Schemas

#### 1. Users (ตารางผู้ใช้งาน)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, Default gen_random_uuid() | รหัสอ้างอิงผู้ใช้ |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | อีเมลเข้าใช้งาน |
| `password_hash` | VARCHAR(255) | NOT NULL | รหัสผ่าน Hashed (Bcrypt / Argon2id) |
| `first_name` | VARCHAR(100) | NOT NULL | ชื่อจริง |
| `last_name` | VARCHAR(100) | NOT NULL | นามสกุล |
| `role` | VARCHAR(20) | NOT NULL, CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')) | บทบาทผู้ใช้งาน |
| `grade_level` | VARCHAR(20) | NULL (เช่น 'M4', 'M5', 'M6') | ระดับชั้น (สำหรับนักเรียน) |
| `classroom` | VARCHAR(20) | NULL (เช่น '1', '2', '3') | ห้องเรียน (เช่น ห้อง 1) |
| `created_at` | TIMESTAMPTZ | NOT NULL, Default NOW() | วันเวลาสร้าง |
| `updated_at` | TIMESTAMPTZ | NOT NULL, Default NOW() | วันเวลาอัปเดต |

#### 2. Courses (ตารางคอร์สวิชา)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสคอร์ส |
| `title` | VARCHAR(255) | NOT NULL | ชื่อวิชา/คอร์ส |
| `description` | TEXT | NULL | รายละเอียดวิชา |
| `cover_image_url`| VARCHAR(500) | NULL | รูปปกคอร์ส |
| `teacher_id` | UUID | FOREIGN KEY -> Users(id) | ครูผู้รับผิดชอบคอร์ส |
| `is_published` | BOOLEAN | DEFAULT FALSE | สถานะการเผยแพร่ |
| `created_at` | TIMESTAMPTZ | Default NOW() | วันเวลาสร้าง |
| `updated_at` | TIMESTAMPTZ | Default NOW() | วันเวลาอัปเดต |

#### 3. Modules (ตารางหมวดหมู่บทเรียนในคอร์ส)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสโมดูล |
| `course_id` | UUID | FOREIGN KEY -> Courses(id) ON DELETE CASCADE | คอร์สที่สังกัด |
| `title` | VARCHAR(255) | NOT NULL | ชื่อหัวข้อโมดูล |
| `order_index` | INT | NOT NULL DEFAULT 0 | ลำดับการแสดงผล |

#### 4. Lessons (ตารางบทเรียนย่อย)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสบทเรียน |
| `module_id` | UUID | FOREIGN KEY -> Modules(id) ON DELETE CASCADE | โมดูลที่สังกัด |
| `title` | VARCHAR(255) | NOT NULL | ชื่อบทเรียน |
| `content_type` | VARCHAR(30) | NOT NULL ('VIDEO_UPLOAD', 'VIDEO_EMBED', 'SLIDE_PDF', 'CODE_LAB', 'TEXT') | ประเภทเนื้อหา |
| `video_url` | VARCHAR(500) | NULL | พาธไฟล์วิดีโออัปโหลด |
| `embed_url` | VARCHAR(500) | NULL | ลิงก์ YouTube/Drive Embed |
| `pdf_url` | VARCHAR(500) | NULL | พาธไฟล์ PDF Slide |
| `body_text` | TEXT | NULL | เนื้อหาข้อความ/คำอธิบาย/Initial Code |
| `order_index` | INT | NOT NULL DEFAULT 0 | ลำดับการแสดงผล |

#### 5. Assignments (ตารางการบ้าน)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสการบ้าน |
| `lesson_id` | UUID | FOREIGN KEY -> Lessons(id) | บทเรียนที่เกี่ยวข้อง |
| `title` | VARCHAR(255) | NOT NULL | หัวข้อการบ้าน |
| `instructions` | TEXT | NOT NULL | คำสั่ง/รายละเอียด |
| `max_score` | INT | NOT NULL DEFAULT 100 | คะแนนเต็ม |
| `due_date` | TIMESTAMPTZ | NULL | กำหนดส่ง |
| `created_at` | TIMESTAMPTZ | Default NOW() | วันเวลาสร้าง |
| `updated_at` | TIMESTAMPTZ | Default NOW() | วันเวลาอัปเดต |

#### 6. Submissions (ตารางการส่งการบ้าน)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสการส่งงาน |
| `assignment_id` | UUID | FOREIGN KEY -> Assignments(id) | การบ้านที่ส่ง |
| `student_id` | UUID | FOREIGN KEY -> Users(id) | นักเรียนผู้ส่ง |
| `file_url` | VARCHAR(500) | NULL | ไฟล์การบ้านที่แนบ |
| `submitted_text`| TEXT | NULL | ข้อความคำตอบ |
| `score` | INT | NULL | คะแนนที่ได้ |
| `feedback` | TEXT | NULL | คำติชมจากครู |
| `status` | VARCHAR(20) | DEFAULT 'SUBMITTED' ('SUBMITTED', 'GRADED') | สถานะตรวจ |
| `submitted_at` | TIMESTAMPTZ | Default NOW() | วันเวลาส่ง |

#### 7. Quizzes, QuizQuestions & QuizAttempts (ตารางแบบทดสอบ ข้อสอบ และประวัติสอบ)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| **Quizzes** | | | |
| `id` | UUID | PRIMARY KEY | รหัสชุดแบบทดสอบ |
| `lesson_id` | UUID | FOREIGN KEY -> Lessons(id) | บทเรียนที่เกี่ยวข้อง |
| `title` | VARCHAR(255) | NOT NULL | ชื่อชุดแบบทดสอบ |
| `time_limit_minutes` | INT | NOT NULL DEFAULT 15 | เวลาจำกัด (นาที) |
| `passing_score` | INT | NOT NULL DEFAULT 60 | เกณฑ์คะแนนผ่าน (%) |
| `max_attempts` | INT | NOT NULL DEFAULT 0 | จำกัดจำนวนครั้ง (0 = ไม่จำกัด) |
| **QuizQuestions** | | | |
| `id` | UUID | PRIMARY KEY | รหัสข้อสอบ |
| `quiz_id` | UUID | FOREIGN KEY -> Quizzes(id) ON DELETE CASCADE | ชุดแบบทดสอบที่สังกัด |
| `question_text` | TEXT | NOT NULL | โจทย์ข้อสอบ |
| `question_type` | VARCHAR(30) | NOT NULL DEFAULT 'MULTIPLE_CHOICE' | ปรนัย / ถูกผิด |
| `options_json` | JSONB / TEXT | NOT NULL DEFAULT '[]' | ตัวเลือกคำตอบ |
| `correct_answer`| VARCHAR(255) | NOT NULL | คำตอบที่ถูกต้อง (ซ่อนจากนักเรียน) |
| `points` | INT | NOT NULL DEFAULT 1 | คะแนนประจำข้อ |
| **QuizAttempts** | | | |
| `id` | UUID | PRIMARY KEY | รหัสประวัติการสอบ |
| `quiz_id` | UUID | FOREIGN KEY -> Quizzes(id) | ชุดแบบทดสอบ |
| `student_id` | UUID | FOREIGN KEY -> Users(id) | นักเรียนผู้สอบ |
| `score` | INT | NOT NULL | คะแนนที่ได้ (%) |
| `passed` | BOOLEAN | NOT NULL | สถานะผ่านเกณฑ์ |
| `started_at` | TIMESTAMPTZ | Default NOW() | เวลาเริ่มทำแบบทดสอบ |
| `completed_at`| TIMESTAMPTZ | NULL | เวลาส่งคำตอบ |

#### 8. Enrollments & Course Progress (ตารางการลงทะเบียนและเรียน)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสการลงทะเบียน |
| `student_id` | UUID | FOREIGN KEY -> Users(id) | นักเรียน |
| `course_id` | UUID | FOREIGN KEY -> Courses(id) | รายวิชา |
| `completed_lessons` | JSONB / TEXT | NOT NULL DEFAULT '[]' | รายการ UUID บทเรียนที่เรียนจบ |
| `progress_percent` | FLOAT | NOT NULL DEFAULT 0 | เปอร์เซ็นต์ความก้าวหน้า (0-100%) |
| `enrolled_at` | TIMESTAMPTZ | Default NOW() | วันเวลาที่ลงทะเบียน |
| `updated_at` | TIMESTAMPTZ | Default NOW() | วันเวลาที่อัปเดตความก้าวหน้าล่าสุด |

#### 9. Certificates (ตารางใบรับรองสำเร็จหลักสูตร)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | รหัสใบประกาศนียบัตร |
| `student_id` | UUID | FOREIGN KEY -> Users(id) | นักเรียนผู้สำเร็จการศึกษา |
| `course_id` | UUID | FOREIGN KEY -> Courses(id) | รายวิชาที่สำเร็จการศึกษา |
| `certificate_code` | VARCHAR(100) | UNIQUE, NOT NULL | รหัสรับรอง (เช่น `TUN-2026-XXXX-XXXX`) |
| `issued_at` | TIMESTAMPTZ | Default NOW() | วันเวลาที่ออกใบประกาศนียบัตร |

---

## 3. สรุปรายการ API Endpoints (API Routes Matrix)

### 3.1 การยืนยันตัวตนและการจัดการผู้ใช้ (Auth & Admin API)
| Method | Endpoint | สิทธิ์เข้าถึง | หน้าที่การทำงาน |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | เข้าสู่ระบบด้วย Email/Password |
| `POST` | `/api/auth/logout` | Authenticated | ออกจากระบบ เคลียร์ JWT Cookie |
| `POST` | `/api/auth/refresh` | Authenticated | รีเฟรช Access Token อัตโนมัติ |
| `GET` | `/api/auth/me` | Authenticated | ดึงข้อมูลผู้ใช้งานปัจจุบัน |
| `POST` | `/api/upload` | Authenticated | อัปโหลดไฟล์วิดีโอ (500MB), PDF (100MB), ภาพ (20MB) |
| `GET` | `/api/admin/stats/users`| ADMIN | สรุปสถิติจำนวนผู้ใช้แยกตาม Role และระดับชั้น |
| `GET` | `/api/admin/users` | ADMIN | ค้นหา กรอง และแสดงรายชื่อผู้ใช้ทั้งหมด |
| `POST` | `/api/admin/users` | ADMIN | สร้างบัญชีผู้ใช้งานใหม่รายบุคคล |
| `PUT` | `/api/admin/users/:id` | ADMIN | แก้ไขข้อมูลผู้ใช้ / เปลี่ยนรหัสผ่าน |
| `DELETE`| `/api/admin/users/:id` | ADMIN | ลบบัญชีผู้ใช้งาน |
| `POST` | `/api/admin/users/import`| ADMIN | นำเข้าข้อมูลผู้ใช้แบบ Batch (CSV / Excel) |
| `GET` | `/api/admin/users/template`| ADMIN | ดาวน์โหลดไฟล์แม่แบบ CSV/Excel |

### 3.2 การจัดการรายวิชาและบทเรียน (Teacher Course Management API)
| Method | Endpoint | สิทธิ์เข้าถึง | หน้าที่การทำงาน |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teacher/courses` | TEACHER | ดึงรายการวิชาของครูพร้อมสถิติโมดูล/นักเรียน |
| `POST` | `/api/teacher/courses` | TEACHER | สร้างรายวิชาใหม่ |
| `GET` | `/api/teacher/courses/:id` | TEACHER | ดึงข้อมูลคอร์ส โมดูล และบทเรียนทั้งหมด |
| `PUT` | `/api/teacher/courses/:id` | TEACHER | แก้ไขข้อมูลรายวิชา (ชื่อ, คำอธิบาย, รูปปก) |
| `DELETE`| `/api/teacher/courses/:id` | TEACHER | ลบรายวิชาและโมดูลทั้งหมดภายใน |
| `PATCH` | `/api/teacher/courses/:id/publish`| TEACHER | สลับสถานะเปิด/ปิดเผยแพร่คอร์ส |
| `POST` | `/api/teacher/courses/:courseId/modules` | TEACHER | เพิ่มโมดูลใหม่ในคอร์ส |
| `PUT` | `/api/teacher/modules/:id` | TEACHER | แก้ไขชื่อโมดูล |
| `DELETE`| `/api/teacher/modules/:id` | TEACHER | ลบโมดูลและบทเรียนภายใน |
| `POST` | `/api/teacher/courses/:courseId/modules/reorder` | TEACHER | บันทึกลำดับโมดูลใหม่ (Reorder) |
| `POST` | `/api/teacher/modules/:moduleId/lessons` | TEACHER | เพิ่มบทเรียนย่อยในโมดูล |
| `PUT` | `/api/teacher/lessons/:id` | TEACHER | แก้ไขข้อมูลบทเรียนย่อย |
| `DELETE`| `/api/teacher/lessons/:id` | TEACHER | ลบบทเรียนย่อย |
| `POST` | `/api/teacher/modules/:moduleId/lessons/reorder` | TEACHER | บันทึกลำดับบทเรียนใหม่ (Reorder) |

### 3.3 การจัดการการบ้านและการประเมินผล (Teacher Assessment & Grading API)
| Method | Endpoint | สิทธิ์เข้าถึง | หน้าที่การทำงาน |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teacher/lessons/:lessonId/assignments` | TEACHER | ดึงรายการการบ้านในบทเรียน |
| `POST` | `/api/teacher/lessons/:lessonId/assignments` | TEACHER | สร้างการบ้านใหม่ |
| `PUT` | `/api/teacher/assignments/:id` | TEACHER | แก้ไขหัวข้อ กำหนดส่ง และคำสั่งการบ้าน |
| `DELETE`| `/api/teacher/assignments/:id` | TEACHER | ลบการบ้าน |
| `GET` | `/api/teacher/assignments/:id/submissions` | TEACHER | ดึงรายการส่งงานของนักเรียนทุกคนในชิ้นงานนี้ |
| `POST` | `/api/teacher/submissions/:id/grade` | TEACHER | ตรวจและบันทึกคะแนน พร้อมคำติชม (Feedback) |
| `GET` | `/api/teacher/lessons/:lessonId/quizzes` | TEACHER | ดึงรายการแบบทดสอบและข้อสอบในบทเรียน |
| `POST` | `/api/teacher/lessons/:lessonId/quizzes` | TEACHER | สร้างแบบทดสอบใหม่ (รองรับ `max_attempts`) |
| `PUT` | `/api/teacher/quizzes/:id` | TEACHER | แก้ไขแบบทดสอบ (เวลา, เกณฑ์ผ่าน, `max_attempts`) |
| `DELETE`| `/api/teacher/quizzes/:id` | TEACHER | ลบแบบทดสอบ |
| `POST` | `/api/teacher/quizzes/:quizId/questions` | TEACHER | เพิ่มคำถามใหม่ (ปรนัย/ถูกผิด) |
| `PUT` | `/api/teacher/questions/:id` | TEACHER | แก้ไขโจทย์ ตัวเลือก เฉลย และคะแนนข้อสอบ |
| `DELETE`| `/api/teacher/questions/:id` | TEACHER | ลบข้อสอบ |
| `GET` | `/api/teacher/quizzes/:id/stats` | TEACHER | ดึงสถิติและประวัติการทำแบบทดสอบของนักเรียน |

### 3.4 การเรียนและการติดตามผล (Student API)
| Method | Endpoint | สิทธิ์เข้าถึง | หน้าที่การทำงาน |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/courses` | STUDENT | รายการวิชาทั้งหมดที่เปิดเผยแพร่ (Catalog) |
| `GET` | `/api/student/my-courses` | STUDENT | รายการวิชาที่ตนเองลงทะเบียนไว้ พร้อม % Progress |
| `POST` | `/api/student/courses/:id/enroll` | STUDENT | ลงทะเบียนเข้าเรียนในรายวิชา |
| `GET` | `/api/student/courses/:id/player` | STUDENT | ดึงข้อมูลห้องเรียน สารบัญบทเรียน และสถานะการเรียน |
| `POST` | `/api/student/courses/:id/lessons/:lessonId/progress` | STUDENT | บันทึกเรียนจบ/ยกเลิก และคำนวณ % ความก้าวหน้าใหม่ |
| `GET` | `/api/student/lessons/:lessonId/assignment` | STUDENT | ดึงข้อมูลการบ้านและสถานะการส่งงานของตนเอง |
| `POST` | `/api/student/assignments/:id/submit` | STUDENT | ส่งการบ้าน (แนบไฟล์/พิมพ์ข้อความคำตอบ) |
| `GET` | `/api/student/lessons/:lessonId/quiz` | STUDENT | ดึงข้อมูลแบบทดสอบ (ซ่อนเฉลย, ส่ง `can_attempt`) |
| `POST` | `/api/student/quizzes/:id/submit` | STUDENT | ส่งคำตอบ ตรวจข้อสอบ ตรวจสอบโควตา และบันทึกประวัติสอบ |
| `GET` | `/api/student/courses/:id/certificate` | STUDENT | ตรวจสอบเงื่อนไข 100% และรับใบประกาศนียบัตร |

### 3.5 การตรวจสอบใบประกาศนียบัตรสาธารณะ (Public Verification API)
| Method | Endpoint | สิทธิ์เข้าถึง | หน้าที่การทำงาน |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/certificates/verify/:code` | Public | ตรวจสอบความถูกต้องของรหัสใบประกาศนียบัตร (Case-Insensitive) |

---

## 4. แผนการพัฒนาแบ่งเป็น Phase (Development Roadmap & Checklists)

### 📌 Phase 1: Foundation, Infrastructure & Core Setup
- [x] Setup Repository & Project Directory Structure
- [x] Configure Frontend: Next.js 16 (App Router) + TypeScript + Bun Package Manager + Tailwind CSS + Lucide Icons
- [x] Configure Backend: Go 1.25+ + Fiber Framework + GORM Project Architecture
- [x] Integrate **Air (Hot Reload)** for rapid Go development (`.air.toml`, `Dockerfile.dev`, `docker-compose.dev.yml`)
- [x] Setup Docker Compose Environment (Next.js, Go API, PostgreSQL 17, Redis 7, Nginx)
- [x] Setup Local Volume Mounting Structure for Media Uploads (`/var/tunorth_data/uploads`)
- [x] Implement Database Migrations & Initial Seed Data scripts in Go

### 📌 Phase 2: Authentication & User Onboarding (Admin & Auth)
- [x] Implement JWT Authentication Backend (Login, Logout, Refresh Token, Password Hashing)
- [x] Build Login UI & Auth Middleware (Protect Routes by Roles: STUDENT, TEACHER, ADMIN with Strict Isolation 100%)
- [x] Implement CSV/Excel Parser for Batch User Import (Go Backend Parser)
- [x] Build Admin User Management Dashboard & Batch Import UI (Upload Drag & Drop CSV / XLSX)
- [x] Test importing 1,000+ mock student accounts categorized by Grade Level & Classroom

### 📌 Phase 3: Course & Learning Content Management
- [x] Build Teacher Course Builder UI (Create Course, Edit Modules, Order Lessons, In-Builder Preview Modal)
- [x] Implement File Upload Service in Go Backend (Handling MP4 Videos, PDF Documents, Cover Images)
- [x] Implement Video Embed & PDF Viewer Components in Next.js 16
- [x] Build Student Course Browsing & Course Player Interface
- [x] Implement Student Course Progress Tracking API & Real-time Progress Bar

### 📌 Phase 4: Assessment, Code Playground & Certificate System
- [x] Build Assignment Creation, Submission & Grading System (Teacher assigns, Student uploads file/text, Teacher grades & feedbacks)
- [x] Build Interactive Quiz Engine (Question Builder, Timer, Auto-Grading Logic, Attempts History, and Max Attempts Quota Limit)
- [x] Integrate Client-Side Pyodide (WASM) & Monaco Editor for Code Playground Component (with `input()` interactive prompt handling)
- [x] Implement Certificate Generation Engine (1-Page Landscape Printable PDF & Public Verification Endpoint)

### 📌 Phase 5: Testing, Performance Hardening & Production Deployment
- [ ] Conduct Load Testing for 150 Concurrent Active Users (Video Streaming & API Benchmark)
- [ ] Configure Nginx Reverse Proxy with Rate Limiting, Static Asset Caching, and SSL Certificates
- [ ] Implement Automated Database Backup Shell Script (`pg_dump` Cron Job)
- [ ] Final User Acceptance Testing (UAT) with Mock Teachers and High School Students
- [ ] Deploy Final Build to School Ubuntu Server via Docker Compose

---

## 5. คู่มือคำสั่งสำหรับพัฒนาและรันระบบ (Development Workflow & Commands)

### 5.1 การรันในโหมด Development (Hot Reload)

```powershell
# 1. รัน Database (PostgreSQL) และ Cache (Redis)
docker compose up -d postgres redis

# 2. รัน Backend ด้วย Air (Hot Reload อัตโนมัติเมื่อแก้โค้ด Go)
cd backend
air

# 3. รัน Frontend ด้วย Bun (Hot Reload Next.js)
cd frontend
bun run dev
```

หรือรันผ่าน Docker Compose Development Stack:
```powershell
docker compose -f docker-compose.dev.yml up --build
```

### 5.2 การรัน Seed ข้อมูลระบบเริ่มต้น
```powershell
cd backend
go run cmd/seed/main.go
```

### 5.3 ข้อมูลบัญชีผู้ใช้เริ่มต้นสำหรับทดสอบระบบ (Default Seed Users)
* **ผู้ดูแลระบบ (Admin):** `admin@tunorth.ac.th` / รหัสผ่าน: `Password123!`
* **ครูผู้สอน (Teacher):** `teacher@tunorth.ac.th` / รหัสผ่าน: `Password123!`
* **นักเรียน 1 (Student 1):** `student1@tunorth.ac.th` / รหัสผ่าน: `Password123!` (ชั้น ม.4/1)
* **นักเรียน 2 (Student 2):** `student2@tunorth.ac.th` / รหัสผ่าน: `Password123!` (ชั้น ม.4/1)

### 5.4 การรัน Production Stack
```powershell
docker compose up -d --build
```

---
*เอกสารนี้ได้รับการปรับปรุงล่าสุดให้ครอบคลุม Phase 1-4 สมบูรณ์: สถาปัตยกรรมระบบ, โครงสร้างฐานข้อมูลครบทุกตาราง, API Endpoints Matrix ที่ตรงกับ Backend จริง, Client-Side Code Playground (Pyodide & Monaco Editor), ระบบกำหนดโควตาจำนวนครั้งทำแบบทดสอบ (Quiz Max Attempts), และระบบออกเกียรติบัตรทางการ*
