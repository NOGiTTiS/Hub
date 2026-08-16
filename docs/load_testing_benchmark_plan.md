# 🚀 TUNorth-Hub High-Concurrency Load Testing & Video Stream Benchmark Plan

## 1. วัตถุประสงค์และสเกลเป้าหมาย (Objective & Target Scale)
ระบบ **TUNorth-Hub (LMS EdTech)** ออกแบบมาเพื่อรองรับโรงเรียนมัธยมศึกษาที่มีจำนวนนักเรียนและครูรวม ~2,000 คน โดยมีสเกลการใช้งานพร้อมกันสูงสุด ณ ช่วงเวลาเร่งด่วน (**Peak Concurrent Active Users: 150 CCU**)

การทดสอบสมรรถนะและการรับโหลด (Load Testing & API / Video Streaming Benchmark) มุ่งเน้นการประเมิน:
1. **API Benchmark Under Concurrency**: ความสามารถในการให้บริการ REST API พร้อมกัน 150 ผู้ใช้ (Login, Course Catalog, Player Data, Progress Update, Profile)
2. **Video Streaming & Byte-Range Delivery (HTTP 206 Partial Content)**: การสตรีมวิดีโอบทเรียนผ่าน HTTP Range Requests ขนาด Chunk 256KB-512KB พร้อมกัน 150 การเชื่อมต่อ โดยไม่มี Buffer Stall, ค่า Latency ต่ำ และไม่ทำให้ระบบล่ม
3. **Database Connection Pool Stability**: ประสิทธิภาพ PostgreSQL 17 + Redis 7 Connection Pooling (`MaxOpenConns: 150`, `MaxIdleConns: 50`) ภายใต้ Request Concurrency สูง

---

## 2. เครื่องมือทดสอบโหลดที่พัฒนาขึ้น (Load Testing Engines)

### 2.1 Go Multi-Threaded High-Performance Benchmark Engine (`backend/cmd/loadtest/main.go`)
เครื่องมือทดสอบโหลดที่เขียนด้วย Go 1.25+ แบบ Native High-Concurrency Goroutines:
* **ไฟล์โปรแกรม:** `backend/cmd/loadtest/main.go`
* **คอมไพล์เป็น:** `backend/loadtest.exe`
* **คุณสมบัติ:**
  - กำหนดจำนวน Concurrency ได้อิสระ (Default: 150 Concurrent Users)
  - กำหนดระยะเวลาทดสอบ (Duration) และ Ramp-up ได้
  - คำนวณ Latency Percentiles แม่นยำ: Min, Mean, P50 (Median), P90, P95, P99, Max
  - คำนวณ Throughput (Requests/sec - RPS) และ Bandwidth (MB/s)
  - จำแนกผลลัพธ์ตาม HTTP Status Code (200 OK, 206 Partial Content, 401, 500)
  - ส่งออกผลลัพธ์เป็นไฟล์ JSON (`loadtest-report.json`) และ Markdown Summary (`loadtest-report.md`)

### 2.2 Bun TypeScript Benchmark Script (`frontend/scripts/loadtest.ts`)
เครื่องมือเสริมสำหรับนักพัฒนา Frontend ที่รันผ่าน Bun:
* **ไฟล์โปรแกรม:** `frontend/scripts/loadtest.ts`
* **คำสั่งรัน:** `cd frontend && bun run loadtest`

---

## 3. สรุปสถานการณ์จำลอง (Simulation Scenarios Matrix)

| Scenario | คำอธิบายการทดสอบ | Endpoints ที่เกี่ยวข้อง | HTTP Expected |
| :--- | :--- | :--- | :--- |
| **`video-streaming`** | จำลองนักเรียน 150 คนกำลังเล่นวิดีโอบทเรียน ส่งคำขอ HTTP Byte-Range Chunks (256KB - 512KB) ต่อเนื่อง | `GET /uploads/videos/loadtest-sample.mp4` (`Range: bytes=start-end`) | **`206 Partial Content`** |
| **`public-api`** | จำลองผู้ใช้เปิดหน้า Landing Page และสืบค้นข้อมูลสาธารณะ | `GET /api/settings/public`<br>`GET /api/categories`<br>`GET /api/courses/public`<br>`GET /api/health` | **`200 OK`** |
| **`auth`** | จำลองผู้ใช้ 150 คนล็อกอินเข้าสู่ระบบพร้อมกัน (Bcrypt hash verify + JWT issuance) | `POST /api/auth/login` | **`200 OK`** |
| **`student-flow`** | จำลองนักเรียนที่ยืนยันตัวตนแล้วเข้าดูคอร์สตนเอง และโหลด Player Syllabus | `GET /api/student/courses`<br>`GET /api/student/my-courses`<br>`GET /api/profile` | **`200 OK`** |
| **`student-submit`** | จำลองการบันทึกสถานะเรียนจบและส่งคำตอบ | `POST /api/student/courses/:id/lessons/:id/progress` | **`200 OK` / `400`** |
| **`full-load`** | **Composite Mixed Workload** (จำลองพฤติกรรมจริงในโรงเรียน: Video 40%, Public API 25%, Student Flow 20%, Auth 10%, Submissions 5%) | รวมทุก Endpoint ข้างต้น | **`200` / `206`** |

---

## 4. เกณฑ์มาตรฐานความผ่าน (SLA & Acceptance Criteria)

| ตัวชี้วัด (Metric) | เกณฑ์มาตรฐานที่กำหนด (Target SLA) |
| :--- | :--- |
| **Concurrent Active Users (CCU)** | **150 ผู้ใช้พร้อมกัน** (100% Concurrent Workers) |
| **Success Rate (% Non-5xx)** | **≥ 99.9%** (ไม่มี Server 500 / 502 / 503 Crashes) |
| **Video Streaming Chunk Delivery** | **HTTP 206 Partial Content** สตรีมไหลลื่น ไม่มี Buffer Drop |
| **P50 Latency (Median)** | **< 50 ms** (สำหรับ API ทั่วไปและ Video Chunks) |
| **P95 Latency** | **< 250 ms** |
| **P99 Latency** | **< 500 ms** |
| **Database Pool Stability** | ไม่มี Connection Timeout หรือ Connection Exhaustion |

---

## 5. วิธีการและขั้นตอนการรันการทดสอบ (How to Run Load Tests)

### ขั้นตอนที่ 1: ตรวจสอบให้เซิร์ฟเวอร์ Backend หรือ Docker Stack ทำงานอยู่
```powershell
# รันผ่าน Local Go Backend
cd D:\Hub\backend
go run cmd/server/main.go

# หรือรันผ่าน Docker Compose Stack
cd D:\Hub
docker compose up -d
```

### ขั้นตอนที่ 2: รันการทดสอบโหลด 150 Concurrent Users ด้วย Go Engine
```powershell
cd D:\Hub\backend

# 1. รัน Full Mixed Load Test (150 CCU นาน 15 วินาที)
.\loadtest.exe -c 150 -d 15s -scenario full-load

# 2. รันเฉพาะการทดสอบ Video Streaming (HTTP Range 206 Chunks 150 CCU)
.\loadtest.exe -c 150 -d 15s -scenario video-streaming

# 3. รันเฉพาะ Public APIs Benchmark
.\loadtest.exe -c 150 -d 15s -scenario public-api

# 4. รันเฉพาะ Authentication Benchmark
.\loadtest.exe -c 150 -d 15s -scenario auth
```

### ขั้นตอนที่ 3: หรือรันผ่าน Bun TypeScript Runner
```powershell
cd D:\Hub\frontend
bun run loadtest
```

---

## 6. สรุปผลการปรับแต่งระบบเพื่อรองรับโหลด (Optimization Applied)
1. **PostgreSQL Database Connection Pool (`internal/database/database.go`):**
   - ปรับ `MaxOpenConns` จาก 100 ➔ **150** (รองรับ 150 CCU โดยตรง)
   - ปรับ `MaxIdleConns` จาก 10 ➔ **50** (ลด Connection Handshake Latency)
   - เพิ่ม `ConnMaxIdleTime(10 * time.Minute)` ป้องกัน Stale Connections
2. **Fiber Static Video Serving (`internal/routes/routes.go`):**
   - รองรับ HTTP Range Requests (`206 Partial Content`) อัตโนมัติด้วย Zero-Copy Streaming
3. **Nginx Production Caching & Buffer Tuning (`docker/nginx/default.conf`):**
   - Static Asset Caching (`expires 30d; Cache-Control public, no-transform;`)
