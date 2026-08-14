package handlers

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/models"
)

var serverStartTime = time.Now()

type SettingsHandler struct {
	db  *database.Database
	cfg *config.Config
}

func NewSettingsHandler(db *database.Database, cfg *config.Config) *SettingsHandler {
	return &SettingsHandler{
		db:  db,
		cfg: cfg,
	}
}

// GetPublicSettings returns system settings meant for public access
func (h *SettingsHandler) GetPublicSettings(c *fiber.Ctx) error {
	var settings []models.SystemSetting
	publicKeys := []string{
		"school_name_th",
		"school_name_en",
		"platform_title",
		"platform_subtitle",
		"director_name",
		"director_position",
		"academic_year",
		"academic_semester",
		"contact_email",
		"contact_phone",
		"allow_student_registration",
		"max_upload_size_mb",
		"announcement_enabled",
		"announcement_message",
		"announcement_type",
		"maintenance_mode",
		"maintenance_message",
		"site_logo_url",
		"site_favicon_url",
		"theme_primary_color",
	}

	if err := h.db.DB.Where("key IN ?", publicKeys).Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลการตั้งค่าสาธารณะได้",
		})
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    settingsMap,
	})
}

// GetAdminSettings returns all system settings grouped and mapped
func (h *SettingsHandler) GetAdminSettings(c *fiber.Ctx) error {
	var settings []models.SystemSetting
	if err := h.db.DB.Order("category ASC, key ASC").Find(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลการตั้งค่าระบบได้",
		})
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"settings": settingsMap,
			"list":     settings,
		},
	})
}

// UpdateAdminSettings batch updates or sets system settings
func (h *SettingsHandler) UpdateAdminSettings(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รูปแบบข้อมูลไม่ถูกต้อง",
		})
	}

	if len(body) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ไม่มีข้อมูลการตั้งค่าที่ต้องการอัปเดต",
		})
	}

	// Update each setting in a transaction
	tx := h.db.DB.Begin()
	for k, v := range body {
		// Determine default category if creating new
		category := "GENERAL"
		if strings.HasPrefix(k, "announcement_") {
			category = "ANNOUNCEMENT"
		} else if strings.HasPrefix(k, "maintenance_") {
			category = "MAINTENANCE"
		} else if strings.HasPrefix(k, "site_") || strings.HasPrefix(k, "theme_") {
			category = "BRANDING"
		} else if k == "allow_student_registration" || k == "default_student_password" || k == "max_upload_size_mb" {
			category = "POLICY"
		}

		var setting models.SystemSetting
		if err := tx.Where("key = ?", k).First(&setting).Error; err != nil {
			// Create new
			setting = models.SystemSetting{
				Key:       k,
				Value:     v,
				Category:  category,
				UpdatedAt: time.Now(),
			}
			if err := tx.Create(&setting).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": fmt.Sprintf("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า %s", k),
				})
			}
		} else {
			// Update existing
			setting.Value = v
			setting.UpdatedAt = time.Now()
			if err := tx.Save(&setting).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": fmt.Sprintf("เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า %s", k),
				})
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกการตั้งค่าระบบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว",
	})
}

type StorageStats struct {
	SizeBytes int64  `json:"size_bytes"`
	SizeMB    string `json:"size_mb"`
	FileCount int    `json:"file_count"`
}

func calculateDirStats(dirPath string) StorageStats {
	var totalSize int64
	var fileCount int

	_ = filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err == nil && info != nil && !info.IsDir() {
			totalSize += info.Size()
			fileCount++
		}
		return nil
	})

	return StorageStats{
		SizeBytes: totalSize,
		SizeMB:    fmt.Sprintf("%.2f MB", float64(totalSize)/(1024*1024)),
		FileCount: fileCount,
	}
}

// GetSystemHealth returns diagnostic stats for database, redis, storage, and server runtime
func (h *SettingsHandler) GetSystemHealth(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// 1. Database Diagnostics
	var dbStatus = "ONLINE"
	var dbLatencyMs int64 = 0
	var dbSizePretty string = "0 MB"
	var dbSizeBytes int64 = 0

	dbStart := time.Now()
	sqlDB, err := h.db.DB.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		dbStatus = "OFFLINE"
	} else {
		dbLatencyMs = time.Since(dbStart).Milliseconds()
		// Get database disk size
		_ = h.db.DB.Raw("SELECT pg_database_size(current_database())").Scan(&dbSizeBytes)
		_ = h.db.DB.Raw("SELECT pg_size_pretty(pg_database_size(current_database()))").Scan(&dbSizePretty)
	}

	// Table record counts
	var userCount, courseCount, moduleCount, lessonCount int64
	var assignmentCount, submissionCount, quizCount, quizAttemptCount, enrollmentCount, certCount int64

	h.db.DB.Model(&models.User{}).Count(&userCount)
	h.db.DB.Model(&models.Course{}).Count(&courseCount)
	h.db.DB.Model(&models.Module{}).Count(&moduleCount)
	h.db.DB.Model(&models.Lesson{}).Count(&lessonCount)
	h.db.DB.Model(&models.Assignment{}).Count(&assignmentCount)
	h.db.DB.Model(&models.Submission{}).Count(&submissionCount)
	h.db.DB.Model(&models.Quiz{}).Count(&quizCount)
	h.db.DB.Model(&models.QuizAttempt{}).Count(&quizAttemptCount)
	h.db.DB.Model(&models.Enrollment{}).Count(&enrollmentCount)
	h.db.DB.Model(&models.Certificate{}).Count(&certCount)

	// 2. Redis Diagnostics
	var redisStatus = "ONLINE"
	var redisLatencyMs int64 = 0
	if h.db.Redis != nil {
		redisStart := time.Now()
		if err := h.db.Redis.Ping(ctx).Err(); err != nil {
			redisStatus = "OFFLINE"
		} else {
			redisLatencyMs = time.Since(redisStart).Milliseconds()
		}
	} else {
		redisStatus = "NOT_CONFIGURED"
	}

	// 3. Storage / Uploads Diagnostics
	uploadBaseDir := h.cfg.UploadDir
	videosStats := calculateDirStats(filepath.Join(uploadBaseDir, "videos"))
	slidesStats := calculateDirStats(filepath.Join(uploadBaseDir, "slides"))
	coversStats := calculateDirStats(filepath.Join(uploadBaseDir, "covers"))
	assignmentsStats := calculateDirStats(filepath.Join(uploadBaseDir, "assignments"))
	totalUploadsStats := calculateDirStats(uploadBaseDir)

	// 4. Go Runtime Stats
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	uptimeDuration := time.Since(serverStartTime)
	uptimeStr := fmt.Sprintf("%dd %dh %dm %ds",
		int(uptimeDuration.Hours())/24,
		int(uptimeDuration.Hours())%24,
		int(uptimeDuration.Minutes())%60,
		int(uptimeDuration.Seconds())%60,
	)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"database": fiber.Map{
				"status":        dbStatus,
				"latency_ms":    dbLatencyMs,
				"size_pretty":   dbSizePretty,
				"size_bytes":    dbSizeBytes,
				"open_conns":    sqlDB.Stats().OpenConnections,
				"in_use_conns":  sqlDB.Stats().InUse,
				"idle_conns":    sqlDB.Stats().Idle,
				"record_counts": fiber.Map{
					"users":         userCount,
					"courses":       courseCount,
					"modules":       moduleCount,
					"lessons":       lessonCount,
					"assignments":   assignmentCount,
					"submissions":   submissionCount,
					"quizzes":       quizCount,
					"quiz_attempts": quizAttemptCount,
					"enrollments":   enrollmentCount,
					"certificates":  certCount,
				},
			},
			"redis": fiber.Map{
				"status":     redisStatus,
				"latency_ms": redisLatencyMs,
			},
			"storage": fiber.Map{
				"base_dir":     uploadBaseDir,
				"total":        totalUploadsStats,
				"videos":       videosStats,
				"slides":       slidesStats,
				"covers":       coversStats,
				"assignments":  assignmentsStats,
			},
			"runtime": fiber.Map{
				"go_version":    runtime.Version(),
				"num_cpu":       runtime.NumCPU(),
				"goroutines":    runtime.NumGoroutine(),
				"alloc_mb":      fmt.Sprintf("%.2f MB", float64(memStats.Alloc)/(1024*1024)),
				"total_alloc_mb": fmt.Sprintf("%.2f MB", float64(memStats.TotalAlloc)/(1024*1024)),
				"sys_mb":        fmt.Sprintf("%.2f MB", float64(memStats.Sys)/(1024*1024)),
				"uptime":        uptimeStr,
			},
		},
	})
}
