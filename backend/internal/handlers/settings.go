package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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

	if err := h.db.DB.Where("key IN ? OR category = ? OR key LIKE ?", publicKeys, "LANDING", "landing_%").Find(&settings).Error; err != nil {
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
		} else if strings.HasPrefix(k, "landing_") {
			category = "LANDING"
		} else if strings.HasPrefix(k, "ai_") {
			category = "AI"
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

// TestAIConnection tests the provided or saved Gemini API key
// TestAIConnection validates AI API Key connection and returns latency
func (h *SettingsHandler) TestAIConnection(c *fiber.Ctx) error {
	var body struct {
		Provider string `json:"provider"`
		APIKey   string `json:"api_key"`
		Model    string `json:"model"`
		BaseURL  string `json:"base_url"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	provider := strings.ToLower(strings.TrimSpace(body.Provider))
	if provider == "" {
		provider = "gemini"
	}

	apiKey := strings.TrimSpace(body.APIKey)
	if apiKey == "" && provider == "gemini" && h.cfg.GeminiAPIKey != "" {
		apiKey = strings.TrimSpace(h.cfg.GeminiAPIKey)
	}

	if apiKey == "" && provider != "custom" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("ไม่พบ API Key สำหรับ %s (กรุณากรอก API Key ก่อนทดสอบ)", strings.ToUpper(provider)),
		})
	}

	model := strings.TrimSpace(body.Model)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	client := &http.Client{}
	start := time.Now()

	switch provider {
	case "openai":
		if model == "" {
			model = "gpt-4o-mini"
		}
		apiURL := "https://api.openai.com/v1/chat/completions"
		reqPayload := map[string]interface{}{
			"model": model,
			"messages": []map[string]interface{}{
				{"role": "user", "content": "Ping"},
			},
			"max_tokens": 5,
		}
		jsonBytes, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

		resp, err := client.Do(req)
		latency := time.Since(start).Milliseconds()
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไม่สามารถเชื่อมต่อกับ OpenAI API ได้: %v", err),
			})
		}
		defer resp.Body.Close()
		respBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			var errData map[string]interface{}
			_ = json.Unmarshal(respBytes, &errData)
			errMsg := fmt.Sprintf("OpenAI API ตอบกลับรหัส %d", resp.StatusCode)
			if e, ok := errData["error"].(map[string]interface{}); ok {
				if msg, ok := e["message"].(string); ok {
					errMsg = msg
				}
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("การตรวจสอบ OpenAI API Key ล้มเหลว: %s", errMsg),
			})
		}

		return c.JSON(fiber.Map{
			"success":    true,
			"message":    fmt.Sprintf("เชื่อมต่อกับ OpenAI API (%s) สำเร็จ! (เวลาตอบสนอง %d ms)", model, latency),
			"latency_ms": latency,
		})

	case "anthropic":
		if model == "" {
			model = "claude-3-5-haiku-latest"
		}
		apiURL := "https://api.anthropic.com/v1/messages"
		reqPayload := map[string]interface{}{
			"model":      model,
			"max_tokens": 10,
			"messages": []map[string]interface{}{
				{"role": "user", "content": "Ping"},
			},
		}
		jsonBytes, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-api-key", apiKey)
		req.Header.Set("anthropic-version", "2023-06-01")

		resp, err := client.Do(req)
		latency := time.Since(start).Milliseconds()
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไม่สามารถเชื่อมต่อกับ Anthropic Claude API ได้: %v", err),
			})
		}
		defer resp.Body.Close()
		respBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			var errData map[string]interface{}
			_ = json.Unmarshal(respBytes, &errData)
			errMsg := fmt.Sprintf("Anthropic API ตอบกลับรหัส %d", resp.StatusCode)
			if e, ok := errData["error"].(map[string]interface{}); ok {
				if msg, ok := e["message"].(string); ok {
					errMsg = msg
				}
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("การตรวจสอบ Anthropic API Key ล้มเหลว: %s", errMsg),
			})
		}

		return c.JSON(fiber.Map{
			"success":    true,
			"message":    fmt.Sprintf("เชื่อมต่อกับ Anthropic Claude API (%s) สำเร็จ! (เวลาตอบสนอง %d ms)", model, latency),
			"latency_ms": latency,
		})

	case "custom":
		baseURL := strings.TrimRight(strings.TrimSpace(body.BaseURL), "/")
		if baseURL == "" {
			baseURL = "https://api.deepseek.com/v1"
		}
		if model == "" {
			model = "deepseek-chat"
		}
		apiURL := baseURL
		if !strings.HasSuffix(apiURL, "/chat/completions") {
			apiURL = fmt.Sprintf("%s/chat/completions", baseURL)
		}

		reqPayload := map[string]interface{}{
			"model": model,
			"messages": []map[string]interface{}{
				{"role": "user", "content": "Ping"},
			},
			"max_tokens": 5,
		}
		jsonBytes, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		if apiKey != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
		}

		resp, err := client.Do(req)
		latency := time.Since(start).Milliseconds()
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไม่สามารถเชื่อมต่อกับ Custom Server (%s) ได้: %v", baseURL, err),
			})
		}
		defer resp.Body.Close()
		respBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			var errData map[string]interface{}
			_ = json.Unmarshal(respBytes, &errData)
			errMsg := fmt.Sprintf("Server ตอบกลับรหัส %d (%s)", resp.StatusCode, string(respBytes))
			if e, ok := errData["error"].(map[string]interface{}); ok {
				if msg, ok := e["message"].(string); ok {
					errMsg = msg
				}
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("การตรวจสอบ Custom Provider ล้มเหลว: %s", errMsg),
			})
		}

		return c.JSON(fiber.Map{
			"success":    true,
			"message":    fmt.Sprintf("เชื่อมต่อกับ Custom Provider (%s - %s) สำเร็จ! (เวลาตอบสนอง %d ms)", baseURL, model, latency),
			"latency_ms": latency,
		})

	default: // gemini
		if model == "" {
			model = "gemini-3.6-flash"
		}
		genURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
		genPayload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]interface{}{
						{"text": "Ping"},
					},
				},
			},
		}
		jsonBytes, _ := json.Marshal(genPayload)
		req, _ := http.NewRequestWithContext(ctx, "POST", genURL, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", apiKey)

		resp, err := client.Do(req)
		latency := time.Since(start).Milliseconds()
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			return c.JSON(fiber.Map{
				"success":    true,
				"message":    fmt.Sprintf("เชื่อมต่อกับ Google Gemini API (%s) สำเร็จ! (เวลาตอบสนอง %d ms)", model, latency),
				"latency_ms": latency,
			})
		}

		// Fallback to Interactions API test
		if resp != nil {
			resp.Body.Close()
		}
		interURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta2/interactions?key=%s", apiKey)
		interPayload := map[string]interface{}{
			"model": model,
			"input": "Ping",
		}
		interBytes, _ := json.Marshal(interPayload)
		interReq, _ := http.NewRequestWithContext(ctx, "POST", interURL, bytes.NewBuffer(interBytes))
		interReq.Header.Set("Content-Type", "application/json")
		interReq.Header.Set("x-goog-api-key", apiKey)

		interResp, interErr := client.Do(interReq)
		interLatency := time.Since(start).Milliseconds()
		if interErr != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไม่สามารถเชื่อมต่อกับ Google Gemini API ได้: %v", interErr),
			})
		}
		defer interResp.Body.Close()
		respBody, _ := io.ReadAll(interResp.Body)

		if interResp.StatusCode != http.StatusOK && interResp.StatusCode != http.StatusCreated {
			var errData map[string]interface{}
			_ = json.Unmarshal(respBody, &errData)
			errMsg := fmt.Sprintf("Google API ตอบกลับด้วยรหัส %d", interResp.StatusCode)
			if e, ok := errData["error"].(map[string]interface{}); ok {
				if msg, ok := e["message"].(string); ok {
					errMsg = msg
				}
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("การตรวจสอบ API Key ล้มเหลว: %s", errMsg),
			})
		}

		return c.JSON(fiber.Map{
			"success":    true,
			"message":    fmt.Sprintf("เชื่อมต่อกับ Google Gemini API (%s) สำเร็จ! (เวลาตอบสนอง %d ms)", model, interLatency),
			"latency_ms": interLatency,
		})
	}
}

