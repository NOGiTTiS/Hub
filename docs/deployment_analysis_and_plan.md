# 📘 แผนการวิเคราะห์และปรับแต่งการ Deploy TUNorth-Hub เข้าสู่ระบบเดิม (TUNorth Deployment & Integration Plan)

> **เอกสารคู่มือและแผนการปรับแต่งระบบ TUNorth-Hub (LMS EdTech)**  
> เพื่อเชื่อมต่อเข้ากับสถาปัตยกรรมการติดตั้งรวมของ **โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ (`D:/TUNorth`)**  
> บนสภาพแวดล้อม **Ubuntu Server 24.04 LTS (HP ProLiant ML350 G6)**  
> ควบคุมผ่าน Docker Compose, Nginx Reverse Proxy, Cloudflare Tunnel และ Shell Automation Scripts

---

## 🏗️ 1. ภาพรวมสถาปัตยกรรมและผลการศึกษาระบบเดิม (`D:/TUNorth`)

### 1.1 สถาปัตยกรรมระดับเครือข่ายและระบบบริการ (System Topology)

```mermaid
graph TD
    UserExt["🌐 Internet Users (นักเรียน / ครู / ทั่วไป)"] -->|HTTPS / WSS| CFEdge["☁️ Cloudflare Edge Network"]
    CFEdge -->|Cloudflare Tunnel (No Public IP/Port Forwarding)| CFTunnel["🔒 Container: cloudflare-tunnel"]
    
    UserLAN["🖥️ LAN Users (192.168.165.11)"] -->|HTTP Direct Ports :80, :8001-8008| LocalNginx["⚡ Container: local-nginx (Port 80, 8001-8008)"]
    
    CFTunnel -->|Bridge Network: tunorth-net| AppsLayer
    LocalNginx -->|Bridge Network: tunorth-net| AppsLayer

    subgraph AppsLayer ["📦 Applications Layer (TUNorth/apps/*)"]
        direction TB
        App1["1. BRMS (:8001 / brms.tn.ac.th)"]
        App2["2. EDMS (:8002 / edms.tn.ac.th)"]
        App3["3. GPMS (:8003 / gpms.tn.ac.th)"]
        App4["4. HarvestFarm (:8004 / harvestfarm.tn.ac.th)"]
        App5["5. OES (:8005 / oes.tn.ac.th)"]
        App6["6. PromptCraft (:8006 / promptcraft.tn.ac.th)"]
        App7["7. RobotSim (:8007 / robotsim.tn.ac.th)"]
        App8["🌟 8. TUNorth-Hub (:8008 / hub.tn.ac.th)"]
    end

    subgraph InfraLayer ["🗄️ Centralized Data & Infrastructure Layer (TUNorth/infra/*)"]
        direction TB
        DB1[("brms-db :5432")]
        DB2[("edms-db :5432")]
        DB3[("gpms-db :5432")]
        DB4[("harvestfarm-db :5432")]
        DB5[("oes-db :5432")]
        DB6[("promptcraft-db :5432")]
        DB8[("hub-db :5432 (PostgreSQL 17)")]
        Cache8[("hub-redis :6379 (Redis 7)")]
    end

    App8 -->|GORM DB Pool| DB8
    App8 -->|Session & Blacklist| Cache8

    subgraph Persistence ["💾 Host Persistence Volumes (TUNorth/data/)"]
        VolPG["data/postgres/{app_name}/"]
        VolUploads["data/uploads/{app_name}/"]
        VolRedis["data/redis/{app_name}/"]
    end

    DB8 --> VolPG
    Cache8 --> VolRedis
    App8 --> VolUploads
```

### 1.2 ตารางสรุปการเชื่อมโยงระบบเดิมและตำแหน่งของ TUNorth-Hub

| ชื่อระบบ | โดเมนภายนอก (Cloudflare) | การเข้าถึงภายใน LAN | Service / Container Names | Database Container | Target DB Name | สื่อบันทึกไฟล์ (Uploads) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BRMS** | `brms.tn.ac.th` | `http://192.168.165.11:8001` | `brms-frontend` (3000)<br>`brms-backend` (8080) | `brms-db` | `tunorth-brms_db` | `data/uploads/brms` |
| **EDMS** | `edms.tn.ac.th` | `http://192.168.165.11:8002` | `edms-frontend` (3000)<br>`edms-backend` (8080) | `edms-db` | `tunorth-edms_db` | `data/uploads/edms` |
| **GPMS** | `gpms.tn.ac.th` | `http://192.168.165.11:8003` | `gpms-frontend` (3000)<br>`gpms-backend` (8080) | `gpms-db` | `gpms` | `data/uploads/gpms` |
| **HarvestFarm** | `harvestfarm.tn.ac.th` | `http://192.168.165.11:8004` | `harvestfarm-frontend` (3000)<br>`harvestfarm-backend` (8080) | `harvestfarm-db` | `harvestfarm_db` | `data/uploads/harvestfarm` |
| **OES** | `oes.tn.ac.th` | `http://192.168.165.11:8005` | `tunorth-oes_frontend` (3000)<br>`tunorth-oes_backend` (8080) | `oes-db` | `tunorth-oes_db` | Cloudinary / Local |
| **PromptCraft** | `promptcraft.tn.ac.th` | `http://192.168.165.11:8006` | `promptcraft-app` (3000) | `promptcraft-db` | `promptcraft_db` | N/A |
| **Robot Simulator** | `robotsim.tn.ac.th` | `http://192.168.165.11:8007` | `robot-simulator-app` (80) | N/A (Client WASM) | N/A | N/A |
| **🌟 TUNorth-Hub** | **`hub.tn.ac.th`** | **`http://192.168.165.11:8008`** | **`hub-frontend` (3000)<br>`hub-backend` (8080)** | **`hub-db` (Postgres 17)<br>`hub-redis` (Redis 7)** | **`tunorth_hub`** | **`data/uploads/hub`** |
| **LAN Portal** | N/A | `http://192.168.165.11` (Port 80) | `local-nginx` (Port 80) | N/A | N/A | N/A |

---

## 🔍 2. รายการสิ่งที่ต้องปรับปรุงเพื่อให้เข้ากับระบบเดิม (Key Adjustments & Subtask Checklists)

### 📌 2.1 การจัดการ Database และ Redis ใน Infrastructure กลาง (`infra/`)
- [x] เพิ่มคอนเทนเนอร์ `hub-db` (PostgreSQL 17 Alpine) ใน `infra/docker-compose.yml`
- [x] ตั้งค่า Environment Database เริ่มต้น (`POSTGRES_DB: tunorth_hub`, `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: ${HUB_DB_PASSWORD:-hVLcvCI17kc.r6XZ}`)
- [x] Mount Volume ข้อมูล Database ไปที่ `../data/postgres/hub:/var/lib/postgresql/data`
- [x] เพิ่มคอนเทนเนอร์ `hub-redis` (Redis 7 Alpine) ใน `infra/docker-compose.yml` สำหรับ Session, Token Blacklist และ Cache
- [x] Mount Volume ข้อมูล Redis ไปที่ `../data/redis/hub:/data`
- [x] เชื่อมโยงคอนเทนเนอร์ทั้งสองเข้ากับเครือข่าย `tunorth-net`
- [x] เพิ่ม Healthcheck (`pg_isready` และ `redis-cli ping`) ในคอนเทนเนอร์ฐานข้อมูล

### 📌 2.2 การปรับโครงสร้าง Docker Compose ของแอปพลิเคชัน (`apps/Hub/`)
- [x] สร้าง/ปรับปรุงไฟล์ `apps/Hub/docker-compose.yml` ให้สอดคล้องกับมาตรฐานของ TUNorth
- [x] ตั้งค่าคอนเทนเนอร์ `hub-backend`:
  - [x] Build Context จาก `./backend`
  - [x] ชื่อคอนเทนเนอร์: `hub-backend`
  - [x] เครือข่าย: `tunorth-net` (External)
  - [x] Environment Variables: `DB_HOST=hub-db`, `DB_PORT=5432`, `DB_USER=postgres`, `DB_NAME=tunorth_hub`, `REDIS_URL=hub-redis:6379`, `UPLOAD_DIR=/var/tunorth_data/uploads`
  - [x] Mount Volume สื่อการสอนและไฟล์แนบ: `../../data/uploads/hub:/var/tunorth_data/uploads`
  - [x] กำหนด `restart: always`
- [x] ตั้งค่าคอนเทนเนอร์ `hub-frontend`:
  - [x] Build Context จาก `./frontend`
  - [x] Build Args: `NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://hub.tn.ac.th}`
  - [x] ชื่อคอนเทนเนอร์: `hub-frontend`
  - [x] เครือข่าย: `tunorth-net` (External)
  - [x] Environment Variables: `NODE_ENV=production`, `PORT=3000`, `API_INTERNAL_URL=http://hub-backend:8080`
  - [x] กำหนด `depends_on: [backend]`
  - [x] กำหนด `restart: always`
- [x] ตัดคอนเทนเนอร์ PostgreSQL, Redis, และ Nginx ที่ซ้ำซ้อนออกจาก Docker Compose ของ Hub

### 📌 2.3 การจัดสรรพอร์ต LAN และการตั้งค่า Local Nginx (`infra/nginx/`)
- [x] กำหนดพอร์ต Dedicated สำหรับ TUNorth-Hub เป็น **Port 8008**
- [x] เปิดพอร์ต `"8008:8008"` ใน Service `nginx` ของ `infra/docker-compose.yml`
- [x] ปรับปรุงหน้า LAN Portal (Port 80) ใน `infra/nginx/nginx.conf`:
  - [x] เพิ่มปุ่มเมนูทางลัดหมายเลข 8: `8. TUNorth-Hub (แพลตฟอร์มการเรียนรู้ออนไลน์ LMS)` ชี้ไปที่ `:8008`
- [x] เพิ่ม Server Block สำหรับ Port 8008 ใน `infra/nginx/nginx.conf`:
  - [x] `location /uploads/` -> `proxy_pass http://hub-backend:8080/uploads/;`
  - [x] `location /api/` -> `proxy_pass http://hub-backend:8080/api/;` (พร้อม Forwarding Headers และ Timeout 300s)
  - [x] `location /` -> `proxy_pass http://hub-frontend:3000;` (พร้อม WebSocket Upgrade Headers)
  - [x] กำหนด `client_max_body_size 500M;` เพื่อรองรับการอัปโหลดไฟล์วิดีโอ MP4 และสไลด์การสอนขนาดใหญ่
- [x] เพิ่ม Server Block สำหรับ Local Hostnames บนพอร์ต 80:
  - [x] `server_name hub.local hub.tn.ac.th;`
  - [x] กำหนด Proxy Pass เส้นทาง `/uploads/`, `/api/`, และ `/` ให้สอดคล้องกัน

### 📌 2.4 การตั้งค่า Cloudflare Tunnel สำหรับการเข้าถึงผ่านอินเทอร์เน็ต (WAN Ingress)
- [x] บันทึกการกำหนดค่า Public Hostname Routes ใน Cloudflare Zero Trust Dashboard:
  - [x] Route 1 (Frontend): Domain `hub.tn.ac.th` -> Service `http://hub-frontend:3000`
  - [x] Route 2 (Backend API): Domain `hub.tn.ac.th` (Path: `api/*`) -> Service `http://hub-backend:8080`
  - [x] Route 3 (Media Uploads): Domain `hub.tn.ac.th` (Path: `uploads/*`) -> Service `http://hub-backend:8080`
- [x] ตั้งค่า Cloudflare WebSocket ให้เปิดใช้งานสำหรับ Interactive Playground & Terminal
- [x] ตั้งค่า Cloudflare Maximum Upload Size / Chunked Upload Support สำหรับไฟล์วิดีโอ 500MB

### 📌 2.5 โครงสร้างการจัดเก็บไฟล์ Persistence (`TUNorth/data/`)
- [x] กำหนดไดเรกทอรีสำหรับ Database Hub: `TUNorth/data/postgres/hub`
- [x] กำหนดไดเรกทอรีสำหรับ Redis Cache Hub: `TUNorth/data/redis/hub`
- [x] กำหนดไดเรกทอรีสำหรับ Media Uploads Hub: `TUNorth/data/uploads/hub` (แยกโฟลเดอร์ย่อย `videos/`, `slides/`, `covers/`, `assignments/`, `avatars/`)
- [x] กำหนดสิทธิ์ Permission `chmod -R 777` ให้คอนเทนเนอร์ Docker สามารถอ่าน-เขียนไฟล์ได้สมบูรณ์

### 📌 2.6 การปรับปรุงสคริปต์อัตโนมัติประจำระบบ (`TUNorth/scripts/`)
- [x] **ปรับปรุง `scripts/setup.sh`**:
  - [x] เพิ่ม `"hub"` เข้าไปในอาร์เรย์ `APPS` เพื่อให้สคริปต์สร้างไดเรกทอรี `data/postgres/hub`, `data/redis/hub`, และ `data/uploads/hub` อัตโนมัติ
- [x] **ปรับปรุง `scripts/deploy.sh`**:
  - [x] เพิ่ม `"Hub"` เข้าไปในอาร์เรย์ `APPS` เพื่อให้คำสั่ง `./scripts/deploy.sh` ทำการ Build และ Deploy คอนเทนเนอร์ของ Hub แบบอัตโนมัติ
- [x] **ปรับปรุง `scripts/backup.sh`**:
  - [x] เพิ่มคำสั่ง `backup_db "hub-db" "tunorth_hub"` เพื่อสำรองข้อมูล Database ของ Hub ทุกคืนเวลา 02:00 น.
  - [x] ตรวจสอบว่า `data/uploads/hub` ถูกบีบอัดรวมในไฟล์ `uploads_${DATE}.tar.gz`
- [x] **ปรับปรุง `scripts/restore_db.sh`**:
  - [x] เพิ่มฟังก์ชัน `restore_db "hub-db" "tunorth_hub" "tunorth_hub_backup.sql"` สำหรับกู้คืนข้อมูลเริ่มต้นหากมีไฟล์ dump

### 📌 2.7 การปรับปรุงเอกสารและคู่มือการดูแลรักษาระบบ
- [x] อัปเดตตารางสรุป Domain & Service Mapping ใน `DEPLOYMENT_GUIDE.md`
- [x] อัปเดตขั้นตอนการ Re-deploy เฉพาะโปรเจกต์ Hub ใน `DEPLOYMENT_GUIDE.md`
- [x] อัปเดตสถานะ Phase 6 Checklist ใน `apps/Hub/docs/spec.md`
- [x] อัปเดตคำสั่งพัฒนาและการ Deploy ใน `apps/Hub/gemini.md`

---

## 🚀 3. แผนการดำเนินงานและขั้นตอนการติดตั้งจริง (Step-by-Step Execution Plan)

### 🔹 Phase 1: การเตรียมโครงสร้างพื้นฐานกลาง (Infrastructure Setup)
```bash
# 1. สร้างไดเรกทอรีจัดเก็บข้อมูลของ Hub
mkdir -p ~/TUNorth/data/postgres/hub
mkdir -p ~/TUNorth/data/redis/hub
mkdir -p ~/TUNorth/data/uploads/hub/{videos,slides,covers,assignments,avatars}
chmod -R 777 ~/TUNorth/data

# 2. แก้ไข infra/docker-compose.yml และ infra/nginx/nginx.conf
# 3. รันเพื่อเริ่ม Database & Redis และ Reload Nginx
cd ~/TUNorth/infra
docker compose up -d hub-db hub-redis
docker compose up -d --no-deps --build nginx
```

### 🔹 Phase 2: การ Build และ Deploy Hub Application
```bash
# 1. เข้าสู่โฟลเดอร์ Hub
cd ~/TUNorth/apps/Hub

# 2. ตรวจสอบไฟล์ .env
cp .env.example .env

# 3. สั่ง Build และรันบริการ Backend และ Frontend
docker compose up -d --build
```

### 🔹 Phase 3: การทดสอบและนำเข้าข้อมูลตั้งต้น (Database Seeding)
```bash
# สั่งรัน Database Seeder ภายในคอนเทนเนอร์ Backend เพื่อสร้างข้อมูลบัญชีเริ่มต้นและหมวดหมู่วิชา
docker exec -it hub-backend /app/seed
```

---

## 🧪 4. แผนการทดสอบและเกณฑ์การตรวจรับงาน (Verification & Acceptance Criteria)

| รายการทดสอบ (Test Case) | วิธีการทดสอบ (Method) | ผลลัพธ์ที่คาดหวัง (Expected Result) | สถานะ (Status) |
| :--- | :--- | :--- | :---: |
| **1. Database Connectivity** | ตรวจสอบผ่าน `docker exec hub-backend` และ GORM AutoMigrate | Backend สามารถสร้างตาราง 11 Entities ได้ครบถ้วนโดยไม่มี Connection Timeout | `[ ]` |
| **2. Redis Cache & Blacklist** | ทดสอบผ่าน Auth Refresh Token และ System Health API | Redis ตอบสนอง `PONG` และสถานะบนแดชบอร์ด Admin แสดงสีเขียว Healthy | `[ ]` |
| **3. LAN Portal & Direct Access** | เปิดเบราว์เซอร์เข้า `http://192.168.165.11` และ `http://192.168.165.11:8008` | แสดงหน้า Portal เมนู Hub และเข้าสู่ระบบ LMS ได้อย่างสมบูรณ์ | `[ ]` |
| **4. Cloudflare Domain Access** | เปิดเบราว์เซอร์เข้า `https://hub.tn.ac.th` | เข้าสู่หน้าแรก Landing Page โหลด CSS/JS/Images ครบถ้วน ไม่มี CORS/Mixed Content Error | `[ ]` |
| **5. Large Media Upload & Stream** | อัปโหลดวิดีโอบทเรียน MP4 (100MB-300MB) ผ่าน Teacher Course Builder | อัปโหลดสำเร็จโดยไม่ติด 413 Payload Too Large และสตรีมดูวิดีโอได้ลื่นไหล | `[ ]` |
| **6. Automated Daily Backup** | รันคำสั่ง `./scripts/backup.sh` แบบ Manual | มีไฟล์ `hub-db_tunorth_hub_*.sql` ใน `backups/{DATE}/databases/` และรวมไฟล์ uploads ครบถ้วน | `[ ]` |

---
*เอกสารจัดทำและปรับปรุงล่าสุด: สิงหาคม 2569 โดยทีมสถาปัตยกรรมระบบ TUNorth-Hub*
