package database

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/models"
)

type Database struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func Connect(cfg *config.Config) (*Database, error) {
	logLevel := logger.Info
	if cfg.AppEnv == "production" {
		logLevel = logger.Warn
	}

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Connection Pool configuration
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Redis connection
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})

	return &Database{
		DB:    db,
		Redis: rdb,
	}, nil
}

func (d *Database) AutoMigrate() error {
	log.Println("Running GORM AutoMigrate...")
	err := d.DB.AutoMigrate(
		&models.User{},
		&models.CourseCategory{},
		&models.Course{},
		&models.Module{},
		&models.Lesson{},
		&models.Assignment{},
		&models.Submission{},
		&models.Quiz{},
		&models.QuizQuestion{},
		&models.QuizAttempt{},
		&models.Enrollment{},
		&models.Certificate{},
		&models.SystemSetting{},
	)
	if err != nil {
		return err
	}

	if err := SeedDefaultSettings(d.DB); err != nil {
		log.Printf("⚠️ Failed to seed settings: %v", err)
	}

	return SeedDefaultCategories(d.DB)
}

func SeedDefaultCategories(db *gorm.DB) error {
	defaultCategories := []models.CourseCategory{
		{Name: "ภาษาไทย", Description: "กลุ่มสาระการเรียนรู้ภาษาไทย วรรณคดี และการสื่อสาร", Color: "#d97706", OrderIndex: 1},
		{Name: "คณิตศาสตร์", Description: "กลุ่มสาระการเรียนรู้คณิตศาสตร์และสถิติ", Color: "#7c3aed", OrderIndex: 2},
		{Name: "วิทยาศาสตร์และเทคโนโลยี", Description: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์ คอมพิวเตอร์ และเทคโนโลยี", Color: "#2563eb", OrderIndex: 3},
		{Name: "สังคมศึกษา ศาสนา และวัฒนธรรม", Description: "กลุ่มสาระการเรียนรู้สังคมศึกษา ประวัติศาสตร์ ภูมิศาสตร์ และหน้าที่พลเมือง", Color: "#dc2626", OrderIndex: 4},
		{Name: "สุขศึกษาและพลศึกษา", Description: "กลุ่มสาระการเรียนรู้สุขศึกษา กีฬา และการส่งเสริมสุขภาพ", Color: "#16a34a", OrderIndex: 5},
		{Name: "ศิลปะ", Description: "กลุ่มสาระการเรียนรู้ทัศนศิลป์ ดนตรีสากล/ไทย และนาฏศิลป์", Color: "#db2777", OrderIndex: 6},
		{Name: "การงานอาชีพ", Description: "กลุ่มสาระการเรียนรู้การงานอาชีพ ทักษะชีวิต และเทคโนโลยีธุรกิจ", Color: "#ea580c", OrderIndex: 7},
		{Name: "ภาษาต่างประเทศ", Description: "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ (อังกฤษ, ญี่ปุ่น, จีน ฯลฯ)", Color: "#059669", OrderIndex: 8},
		{Name: "กิจกรรมพัฒนาผู้เรียน", Description: "กิจกรรมแนะแนว ชมรม และหลักสูตรเสริมทักษะทั่วไป", Color: "#4b5563", OrderIndex: 9},
	}

	for _, cat := range defaultCategories {
		var count int64
		db.Model(&models.CourseCategory{}).Where("name = ?", cat.Name).Count(&count)
		if count == 0 {
			cat.ID = uuid.New()
			cat.CreatedAt = time.Now()
			cat.UpdatedAt = time.Now()
			if err := db.Create(&cat).Error; err != nil {
				log.Printf("⚠️ Failed to seed category %s: %v", cat.Name, err)
			}
		}
	}
	return nil
}

func SeedDefaultSettings(db *gorm.DB) error {
	defaultSettings := []models.SystemSetting{
		// General / School Profile
		{Key: "school_name_th", Value: "โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ", Description: "ชื่อโรงเรียนภาษาไทย", Category: "GENERAL"},
		{Key: "school_name_en", Value: "Triam Udom Suksa School of the North", Description: "ชื่อโรงเรียนภาษาอังกฤษ", Category: "GENERAL"},
		{Key: "platform_title", Value: "TUNorth-Hub", Description: "ชื่อระบบแพลตฟอร์ม", Category: "GENERAL"},
		{Key: "platform_subtitle", Value: "แพลตฟอร์มเรียนรู้ออนไลน์", Description: "สโลแกนหรือคำอธิบายระบบ", Category: "GENERAL"},
		{Key: "director_name", Value: "ดร.ผู้อำนวยการ โรงเรียน", Description: "ชื่อผู้อำนวยการสำหรับลงนามในเกียรติบัตร", Category: "GENERAL"},
		{Key: "director_position", Value: "ผู้อำนวยการโรงเรียนเตรียมอุดมศึกษา ภาคเหนือ", Description: "ตำแหน่งผู้อำนวยการสำหรับลงนามในเกียรติบัตร", Category: "GENERAL"},
		{Key: "academic_year", Value: "2569", Description: "ปีการศึกษาปัจจุบัน", Category: "GENERAL"},
		{Key: "academic_semester", Value: "1", Description: "ภาคเรียนปัจจุบัน", Category: "GENERAL"},
		{Key: "contact_email", Value: "admin@tunorth.ac.th", Description: "อีเมลติดต่อเจ้าหน้าที่ผู้ดูแลระบบ", Category: "GENERAL"},
		{Key: "contact_phone", Value: "02-123-4567", Description: "เบอร์โทรศัพท์ติดต่อโรงเรียน", Category: "GENERAL"},

		// Policies & Access Controls
		{Key: "allow_student_registration", Value: "false", Description: "อนุญาตให้นักเรียนลงทะเบียนสมัครสมาชิกด้วยตนเอง", Category: "POLICY"},
		{Key: "default_student_password", Value: "Password123!", Description: "รหัสผ่านเริ่มต้นสำหรับบัญชีนักเรียนที่นำเข้าหรือรีเซ็ต", Category: "POLICY"},
		{Key: "max_upload_size_mb", Value: "100", Description: "ขนาดไฟล์อัปโหลดสูงสุดต่อไฟล์ (MB)", Category: "POLICY"},

		// Announcements & Maintenance
		{Key: "announcement_enabled", Value: "false", Description: "เปิด/ปิด การแสดงแถบประกาศทั่วทั้งระบบ", Category: "ANNOUNCEMENT"},
		{Key: "announcement_message", Value: "ยินดีต้อนรับสู่ระบบ TUNorth-Hub แพลตฟอร์มการเรียนรู้ออนไลน์", Description: "ข้อความประกาศบนแถบด้านบนสุด", Category: "ANNOUNCEMENT"},
		{Key: "announcement_type", Value: "info", Description: "ประเภทแถบประกาศ (info, warning, success)", Category: "ANNOUNCEMENT"},
		{Key: "maintenance_mode", Value: "false", Description: "เปิด/ปิด โหมดปรับปรุงระบบชั่วคราว", Category: "MAINTENANCE"},
		{Key: "maintenance_message", Value: "ระบบอยู่ระหว่างการปิดปรับปรุงชั่วคราวเพื่อพัฒนาประสิทธิภาพ ขออภัยในความไม่สะดวก", Description: "ข้อความแจ้งเตือนเมื่อระบบอยู่ในโหมดปิดปรับปรุง", Category: "MAINTENANCE"},

		// Branding & Theme
		{Key: "site_logo_url", Value: "", Description: "URL หรือรูปภาพโลโก้ประจำโรงเรียน/ระบบ", Category: "BRANDING"},
		{Key: "site_favicon_url", Value: "", Description: "URL หรือรูปภาพ Favicon บนแท็บเบราว์เซอร์", Category: "BRANDING"},
		{Key: "theme_primary_color", Value: "#2563eb", Description: "รหัสสีหลักของระบบ (Primary Theme Hex Color)", Category: "BRANDING"},

		// AI & Smart Assistant Configuration (Multi-Provider Support)
		{Key: "ai_enabled", Value: "true", Description: "เปิด/ปิด การใช้งานระบบ AI ช่วยสร้างแบบทดสอบ", Category: "AI"},
		{Key: "ai_provider", Value: "gemini", Description: "ผู้ให้บริการ AI หลัก (gemini, openai, anthropic, custom)", Category: "AI"},
		{Key: "ai_default_model", Value: "gemini-3.6-flash", Description: "โมเดล AI เริ่มต้น", Category: "AI"},
		{Key: "ai_gemini_api_key", Value: "", Description: "Google Gemini API Key", Category: "AI"},
		{Key: "ai_gemini_model", Value: "gemini-3.6-flash", Description: "โมเดล Google Gemini", Category: "AI"},
		{Key: "ai_openai_api_key", Value: "", Description: "OpenAI API Key", Category: "AI"},
		{Key: "ai_openai_model", Value: "gpt-4o-mini", Description: "โมเดล OpenAI (gpt-4o, gpt-4o-mini, o3-mini)", Category: "AI"},
		{Key: "ai_anthropic_api_key", Value: "", Description: "Anthropic Claude API Key", Category: "AI"},
		{Key: "ai_anthropic_model", Value: "claude-3-5-haiku-latest", Description: "โมเดล Anthropic Claude", Category: "AI"},
		{Key: "ai_custom_api_key", Value: "", Description: "Custom / DeepSeek / Groq / OpenRouter API Key", Category: "AI"},
		{Key: "ai_custom_base_url", Value: "https://api.deepseek.com/v1", Description: "Base URL สำหรับ Custom OpenAI-Compatible Provider", Category: "AI"},
		{Key: "ai_custom_model", Value: "deepseek-chat", Description: "ชื่อโมเดลสำหรับ Custom Provider", Category: "AI"},

		// Dynamic Landing Page Management
		{Key: "landing_hero_badge", Value: "ระบบจัดการเรียนรู้ดิจิทัล LMS EdTech v1.0", Description: "ข้อความป้ายกำกับด้านบนหัวข้อ Hero", Category: "LANDING"},
		{Key: "landing_hero_title", Value: "แพลตฟอร์มการเรียนรู้ออนไลน์", Description: "หัวข้อหลักส่วน Hero บรรทัดที่ 1", Category: "LANDING"},
		{Key: "landing_hero_highlight", Value: "เพื่อนักเรียนและคุณครูมัธยมศึกษา", Description: "ข้อความเน้นสี Gradient บรรทัดที่ 2", Category: "LANDING"},
		{Key: "landing_hero_subtitle", Value: "รองรับการเรียนรู้แบบ On-Demand, Interactive Code Playground (Python / WASM), การส่งงานตรวจการบ้านออนไลน์ และการนำเข้าผู้ใช้แบบกลุ่มความเร็วสูง", Description: "คำอธิบายใต้หัวข้อ Hero", Category: "LANDING"},
		{Key: "landing_hero_cta_primary_text", Value: "เข้าใช้งานระบบ (Login Portal)", Description: "ข้อความปุ่มดำเนินการหลัก (Primary CTA)", Category: "LANDING"},
		{Key: "landing_hero_cta_primary_link", Value: "/login", Description: "ลิงก์ปุ่มดำเนินการหลัก", Category: "LANDING"},
		{Key: "landing_hero_cta_secondary_text", Value: "สมัครสมาชิกนักเรียน", Description: "ข้อความปุ่มดำเนินการรอง (Secondary CTA)", Category: "LANDING"},
		{Key: "landing_hero_cta_secondary_link", Value: "/register", Description: "ลิงก์ปุ่มดำเนินการรอง", Category: "LANDING"},
		{Key: "landing_hero_image_url", Value: "", Description: "รูปภาพแบนเนอร์หรือภาพประกอบ Hero Showcase", Category: "LANDING"},

		// Stats Section
		{Key: "landing_stats_enabled", Value: "true", Description: "เปิด/ปิด การแสดงแถบสรุปสถิติระบบ", Category: "LANDING"},
		{Key: "landing_stats_json", Value: `[{"label":"นักเรียนในระบบ","value":"2,000+","suffix":"คน","icon":"Users"},{"label":"รายวิชาเรียนออนไลน์","value":"50+","suffix":"คอร์ส","icon":"BookOpen"},{"label":"อาจารย์ผู้สอนคุณภาพ","value":"100+","suffix":"ท่าน","icon":"GraduationCap"},{"label":"ความสำเร็จในการศึกษา","value":"100%","suffix":"","icon":"Award"}]`, Description: "JSON ข้อมูลแถบสถิติระบบ", Category: "LANDING"},

		// Features Grid Section
		{Key: "landing_features_enabled", Value: "true", Description: "เปิด/ปิด ส่วนแสดงจุดเด่นของระบบ", Category: "LANDING"},
		{Key: "landing_features_title", Value: "ฟีเจอร์และนวัตกรรมการเรียนรู้ดิจิทัล", Description: "หัวข้อส่วนแสดงจุดเด่นระบบ", Category: "LANDING"},
		{Key: "landing_features_subtitle", Value: "ออกแบบมาเพื่อเพิ่มศักยภาพการเรียนการสอนสำหรับโรงเรียนมัธยมศึกษาในยุคดิจิทัลอย่างครบวงจร", Description: "คำอธิบายส่วนแสดงจุดเด่นระบบ", Category: "LANDING"},
		{Key: "landing_features_json", Value: `[{"id":"1","title":"ระบบสิทธิ์และการยืนยันตัวตน (RBAC)","description":"จำแนกสิทธิ์การเข้าใช้งานอย่างปลอดภัยด้วย JWT แยกหน้าที่นักเรียน ครู และผู้ดูแลระบบแบบเด็ดขาด 100%","icon":"ShieldCheck","color":"#2563eb"},{"id":"2","title":"นำเข้าข้อมูลแบบกลุ่ม (Batch Import)","description":"รองรับการนำเข้ารายชื่อนักเรียนคราวละ 1,000+ บัญชีผ่านไฟล์ CSV / Excel จัดกลุ่มตามระดับชั้นและห้องเรียนทันที","icon":"FileCheck","color":"#059669"},{"id":"3","title":"Interactive Code Playground","description":"ฝึกเขียนโค้ดภาษา Python บนเบราว์เซอร์ด้วย WebAssembly / Pyodide โดยตรง ไม่เปลืองทรัพยากรเซิร์ฟเวอร์","icon":"Code2","color":"#0284c7"},{"id":"4","title":"ระบบการบ้านและการประเมินผล","description":"ส่งการบ้าน แนบไฟล์ ตรวจและให้คะแนนพร้อมคำติชมแบบ Real-time","icon":"FileText","color":"#7c3aed"},{"id":"5","title":"แบบทดสอบออนไลน์จับเวลา (Quiz Engine)","description":"ระบบทำแบบทดสอบพร้อมตัวจับเวลานับถอยหลัง ตรวจเฉลยและสรุปคะแนนอัตโนมัติ","icon":"HelpCircle","color":"#ea580c"},{"id":"6","title":"ระบบออกใบประกาศนียบัตร (Certificate)","description":"ออกเกียรติบัตรอัตโนมัติเมื่อเรียนครบ 100% พร้อมรหัสตรวจสอบความถูกต้องแบบสาธารณะ","icon":"Award","color":"#db2777"}]`, Description: "JSON รายการการ์ดจุดเด่นของระบบ", Category: "LANDING"},

		// Featured Courses Section
		{Key: "landing_courses_enabled", Value: "true", Description: "เปิด/ปิด ส่วนแสดงคอร์สแนะนำบนหน้าแรก", Category: "LANDING"},
		{Key: "landing_courses_title", Value: "รายวิชาและคอร์สเรียนแนะนำ", Description: "หัวข้อส่วนแสดงคอร์สแนะนำ", Category: "LANDING"},
		{Key: "landing_courses_subtitle", Value: "เลือกเรียนรู้เนื้อหาบทเรียนคุณภาพจากคุณครูผู้สอนชั้นนำในโรงเรียน", Description: "คำอธิบายส่วนแสดงคอร์สแนะนำ", Category: "LANDING"},

		// How It Works Steps Section
		{Key: "landing_steps_enabled", Value: "true", Description: "เปิด/ปิด ส่วนขั้นตอนการเริ่มต้นใช้งาน", Category: "LANDING"},
		{Key: "landing_steps_title", Value: "เริ่มต้นการเรียนรู้ง่ายๆ ใน 4 ขั้นตอน", Description: "หัวข้อส่วนขั้นตอนการใช้งาน", Category: "LANDING"},
		{Key: "landing_steps_subtitle", Value: "เส้นทางการเรียนรู้ที่สะดวก รวดเร็ว และเข้าถึงได้จากทุกอุปกรณ์", Description: "คำอธิบายส่วนขั้นตอนการใช้งาน", Category: "LANDING"},
		{Key: "landing_steps_json", Value: `[{"step":"1","title":"เข้าสู่ระบบหรือลงทะเบียน","desc":"ล็อกอินด้วยอีเมลโรงเรียนหรือลงทะเบียนบัญชีนักเรียน"},{"step":"2","title":"เลือกรายวิชาและเริ่มเรียน","desc":"เลือกคอร์สที่สนใจและเข้าเรียนเนื้อหาวิดีโอ สไลด์ หรือ Text"},{"step":"3","title":"ส่งการบ้านและทำแบบทดสอบ","desc":"ฝึกฝนทักษะผ่านโจทย์ ฝึกเขียนโค้ด และทดสอบความรู้ท้ายบท"},{"step":"4","title":"รับใบประกาศนียบัตร","desc":"เรียนจบครบ 100% รับ Certificate พร้อมรหัสตรวจสอบได้ทันที"}]`, Description: "JSON ขั้นตอนการใช้งาน", Category: "LANDING"},

		// FAQ Section
		{Key: "landing_faq_enabled", Value: "true", Description: "เปิด/ปิด ส่วนคำถามที่พบบ่อย (FAQ)", Category: "LANDING"},
		{Key: "landing_faq_title", Value: "คำถามที่พบบ่อย (FAQ)", Description: "หัวข้อส่วนคำถามที่พบบ่อย", Category: "LANDING"},
		{Key: "landing_faq_subtitle", Value: "ข้อสงสัยที่พบบ่อยเกี่ยวกับการใช้งานแพลตฟอร์ม TUNorth-Hub", Description: "คำอธิบายส่วนคำถามที่พบบ่อย", Category: "LANDING"},
		{Key: "landing_faq_json", Value: `[{"question":"หากลืมรหัสผ่านต้องทำอย่างไร?","answer":"สามารถติดต่อคุณครูผู้สอนหรือเจ้าหน้าที่ผู้ดูแลระบบ (Admin) ประจำโรงเรียนเพื่อทำการรีเซ็ตรหัสผ่านเริ่มต้นได้ทันที"},{"question":"สามารถเข้าเรียนผ่านสมาร์ตโฟนหรือแท็บเล็ตได้หรือไม่?","answer":"ระบบรองรับการใช้งานบนทุกอุปกรณ์ ทั้งคอมพิวเตอร์ แท็บเล็ต (iPad/Android) และสมาร์ตโฟนผ่านเว็บเบราว์เซอร์ทุกชนิด"},{"question":"เมื่อเรียนจบหลักสูตรจะได้รับเกียรติบัตรทันทีหรือไม่?","answer":"เมื่อเรียนครบทุกบทเรียนและทำแบบทดสอบผ่านเกณฑ์ 100% ระบบจะสร้างใบประกาศนียบัตรดิจิทัลพร้อมตราประทับและลายเซ็นผู้อำนวยการให้ดาวน์โหลดและพิมพ์ได้ทันที"}]`, Description: "JSON คำถามที่พบบ่อย", Category: "LANDING"},

		// CTA & Footer
		{Key: "landing_cta_enabled", Value: "true", Description: "เปิด/ปิด ส่วนแถบเชิญชวนท้ายหน้า (Call to Action)", Category: "LANDING"},
		{Key: "landing_cta_title", Value: "พร้อมเริ่มต้นการเรียนรู้ในยุคดิจิทัลแล้วหรือยัง?", Description: "หัวข้อแถบเชิญชวนท้ายหน้า", Category: "LANDING"},
		{Key: "landing_cta_subtitle", Value: "เข้าสู่ระบบและร่วมเป็นส่วนหนึ่งของสังคมการเรียนรู้ออนไลน์ระดับมัธยมศึกษา", Description: "คำอธิบายแถบเชิญชวนท้ายหน้า", Category: "LANDING"},
		{Key: "landing_cta_button_text", Value: "เข้าสู่ระบบเลยตอนนี้", Description: "ข้อความปุ่มแถบเชิญชวนท้ายหน้า", Category: "LANDING"},
		{Key: "landing_footer_text", Value: "TUNorth-Hub © 2026 โรงเรียนเตรียมอุดมศึกษา ภาคเหนือ", Description: "ข้อความส่วนท้ายเว็บ (Footer Copyright)", Category: "LANDING"},
	}

	for _, setting := range defaultSettings {
		var existing models.SystemSetting
		if err := db.Where("key = ?", setting.Key).First(&existing).Error; err != nil {
			setting.UpdatedAt = time.Now()
			if err := db.Create(&setting).Error; err != nil {
				log.Printf("⚠️ Failed to seed setting %s: %v", setting.Key, err)
			}
		} else {
			// Auto update old school name if still stored as previous placeholder
			if strings.Contains(existing.Value, "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ นนทบุรี") || existing.Value == "TUNorth-Hub LMS" {
				existing.Value = setting.Value
				existing.UpdatedAt = time.Now()
				db.Save(&existing)
			}
		}
	}
	return nil
}

func (d *Database) Ping(ctx context.Context) (dbErr error, redisErr error) {
	sqlDB, err := d.DB.DB()
	if err != nil {
		dbErr = err
	} else {
		dbErr = sqlDB.PingContext(ctx)
	}

	if d.Redis != nil {
		redisErr = d.Redis.Ping(ctx).Err()
	}

	return
}
