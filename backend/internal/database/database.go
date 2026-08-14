package database

import (
	"context"
	"log"
	"time"

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

	return SeedDefaultSettings(d.DB)
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
