package handlers

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"tunorth-hub-backend/internal/config"
)

type UploadHandler struct {
	cfg *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	return &UploadHandler{cfg: cfg}
}

// Allowed extensions and size limits (bytes)
var (
	allowedVideoExts = map[string]bool{".mp4": true, ".webm": true, ".mov": true, ".mkv": true}
	allowedDocExts   = map[string]bool{".pdf": true, ".doc": true, ".docx": true, ".ppt": true, ".pptx": true, ".xls": true, ".xlsx": true, ".zip": true}
	allowedImageExts = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".svg": true, ".gif": true, ".ico": true}
)

const (
	MaxVideoSize = 500 * 1024 * 1024 // 500 MB
	MaxDocSize   = 100 * 1024 * 1024 // 100 MB
	MaxImageSize = 20 * 1024 * 1024  // 20 MB
)

// UploadFile handles multipart file uploads for videos, pdfs, images, etc.
func (h *UploadHandler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบไฟล์ที่ต้องการอัปโหลด (Field 'file' is required)",
		})
	}

	category := strings.ToLower(strings.TrimSpace(c.FormValue("category", "general")))
	ext := strings.ToLower(filepath.Ext(file.Filename))

	// Determine category directory and validate size/extension
	var targetSubdir string
	switch {
	case allowedVideoExts[ext] || category == "video" || category == "videos":
		if !allowedVideoExts[ext] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไฟล์ประเภทวิดีโอต้องเป็นนามสกุล %v เท่านั้น", getKeys(allowedVideoExts)),
			})
		}
		if file.Size > MaxVideoSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "ขนาดไฟล์วิดีโอเกินขีดจำกัด (สูงสุด 500MB)",
			})
		}
		targetSubdir = "videos"

	case allowedDocExts[ext] || category == "pdf" || category == "document" || category == "documents":
		if !allowedDocExts[ext] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไฟล์เอกสารต้องเป็นนามสกุล %v เท่านั้น", getKeys(allowedDocExts)),
			})
		}
		if file.Size > MaxDocSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "ขนาดไฟล์เอกสารเกินขีดจำกัด (สูงสุด 100MB)",
			})
		}
		targetSubdir = "documents"

	case allowedImageExts[ext] || category == "image" || category == "cover" || category == "images":
		if !allowedImageExts[ext] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("ไฟล์รูปภาพต้องเป็นนามสกุล %v เท่านั้น", getKeys(allowedImageExts)),
			})
		}
		if file.Size > MaxImageSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "ขนาดไฟล์รูปภาพเกินขีดจำกัด (สูงสุด 20MB)",
			})
		}
		targetSubdir = "images"

	default:
		if file.Size > MaxDocSize {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "ขนาดไฟล์เกินขีดจำกัด 100MB",
			})
		}
		targetSubdir = "others"
	}

	fullUploadDir := filepath.Join(h.cfg.UploadDir, targetSubdir)
	if err := os.MkdirAll(fullUploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างไดเรกทอรีสำหรับจัดเก็บไฟล์ได้",
		})
	}

	uniqueID := uuid.New().String()
	timestamp := time.Now().Format("20060102")
	cleanFilename := fmt.Sprintf("%s_%s%s", timestamp, uniqueID[:8], ext)
	destination := filepath.Join(fullUploadDir, cleanFilename)

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถเปิดไฟล์เพื่อบันทึกได้",
		})
	}
	defer src.Close()

	dst, err := os.Create(destination)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการเขียนไฟล์ลงเซิร์ฟเวอร์",
		})
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการคัดลอกข้อมูลไฟล์",
		})
	}

	publicURL := fmt.Sprintf("/uploads/%s/%s", targetSubdir, cleanFilename)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "อัปโหลดไฟล์สำเร็จเรียบร้อย",
		"data": fiber.Map{
			"url":           publicURL,
			"filename":      cleanFilename,
			"original_name": file.Filename,
			"size":          file.Size,
			"category":      targetSubdir,
			"extension":     ext,
		},
	})
}

func getKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
