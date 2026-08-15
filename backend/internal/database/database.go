package database

import (
	"context"
	"log"
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
		{Name: "วิทยาศาสตร์และเทคโนโลยี", Description: "กลุ่มสาระการเรียนรู้วิทยาศาสตร์ คอมพิวเตอร์ และเทคโนโลยี", Color: "#2563eb", OrderIndex: 1},
		{Name: "คณิตศาสตร์", Description: "กลุ่มสาระการเรียนรู้คณิตศาสตร์และสถิติ", Color: "#7c3aed", OrderIndex: 2},
		{Name: "ภาษาต่างประเทศ", Description: "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ (อังกฤษ, ญี่ปุ่น, จีน ฯลฯ)", Color: "#059669", OrderIndex: 3},
		{Name: "ภาษาไทย", Description: "กลุ่มสาระการเรียนรู้ภาษาไทย วรรณคดี และการสื่อสาร", Color: "#d97706", OrderIndex: 4},
		{Name: "สังคมศึกษา ศาสนา และวัฒนธรรม", Description: "กลุ่มสาระการเรียนรู้สังคมศึกษา ประวัติศาสตร์ ภูมิศาสตร์ และหน้าที่พลเมือง", Color: "#dc2626", OrderIndex: 5},
		{Name: "ศิลปะ ดนตรี และนาฏศิลป์", Description: "กลุ่มสาระการเรียนรู้ทัศนศิลป์ ดนตรีสากล/ไทย และนาฏศิลป์", Color: "#db2777", OrderIndex: 6},
		{Name: "สุขศึกษาและพลศึกษา", Description: "กลุ่มสาระการเรียนรู้สุขศึกษา กีฬา และการส่งเสริมสุขภาพ", Color: "#16a34a", OrderIndex: 7},
		{Name: "การงานอาชีพ", Description: "กลุ่มสาระการเรียนรู้การงานอาชีพ ทักษะชีวิต และเทคโนโลยีธุรกิจ", Color: "#ea580c", OrderIndex: 8},
		{Name: "กิจกรรมพัฒนาผู้เรียนและทั่วไป", Description: "กิจกรรมแนะแนว ชมรม และหลักสูตรเสริมทักษะทั่วไป", Color: "#4b5563", OrderIndex: 9},
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
		{Key: "school_name_th", Value: "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ นนทบุรี", Description: "ชื่อโรงเรียนภาษาไทย", Category: "GENERAL"},
		{Key: "school_name_en", Value: "Triam Udom Suksa Pattanakarn Nonthaburi School", Description: "ชื่อโรงเรียนภาษาอังกฤษ", Category: "GENERAL"},
		{Key: "platform_title", Value: "TUNorth-Hub LMS", Description: "ชื่อระบบแพลตฟอร์ม", Category: "GENERAL"},
		{Key: "platform_subtitle", Value: "ระบบการจัดการเรียนรู้ดิจิทัลสำหรับนักเรียนมัธยมศึกษา", Description: "สโลแกนหรือคำอธิบายระบบ", Category: "GENERAL"},
		{Key: "director_name", Value: "ดร.ผู้อำนวยการ โรงเรียน", Description: "ชื่อผู้อำนวยการสำหรับลงนามในเกียรติบัตร", Category: "GENERAL"},
		{Key: "director_position", Value: "ผู้อำนวยการโรงเรียนเตรียมอุดมศึกษาพัฒนาการ นนทบุรี", Description: "ตำแหน่งผู้อำนวยการสำหรับลงนามในเกียรติบัตร", Category: "GENERAL"},
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
	}

	for _, setting := range defaultSettings {
		var count int64
		db.Model(&models.SystemSetting{}).Where("key = ?", setting.Key).Count(&count)
		if count == 0 {
			setting.UpdatedAt = time.Now()
			if err := db.Create(&setting).Error; err != nil {
				log.Printf("⚠️ Failed to seed setting %s: %v", setting.Key, err)
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
