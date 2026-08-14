package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
)

type CertificateHandler struct {
	db *database.Database
}

func NewCertificateHandler(db *database.Database) *CertificateHandler {
	return &CertificateHandler{db: db}
}

// generateCertCode creates a readable certificate code, e.g. TUN-2026-ABCD-1234
func generateCertCode() string {
	bytes := make([]byte, 4)
	_, _ = rand.Read(bytes)
	hexStr := strings.ToUpper(hex.EncodeToString(bytes))
	return fmt.Sprintf("TUN-%d-%s-%s", time.Now().Year(), hexStr[:4], hexStr[4:])
}

// GetOrGenerateCertificate retrieves or generates a certificate for an enrolled student with 100% progress
func (h *CertificateHandler) GetOrGenerateCertificate(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาเข้าสู่ระบบ",
		})
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	// 1. Check enrollment and progress
	var enrollment models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณยังไม่ได้ลงทะเบียนเรียนในรายวิชานี้",
		})
	}

	if enrollment.ProgressPercent < 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("คุณยังเรียนไม่ครบ 100%% (ปัจจุบัน %.1f%%) ไม่สามารถออกใบประกาศนียบัตรได้", enrollment.ProgressPercent),
		})
	}

	// 2. Check existing certificate
	var cert models.Certificate
	err = h.db.DB.Preload("Student").
		Preload("Course.Teacher").
		Where("student_id = ? AND course_id = ?", claims.UserID, courseID).
		First(&cert).Error

	if err == gorm.ErrRecordNotFound {
		// Generate new certificate
		code := generateCertCode()
		cert = models.Certificate{
			ID:              uuid.New(),
			StudentID:       claims.UserID,
			CourseID:        courseID,
			CertificateCode: code,
			IssuedAt:        time.Now(),
		}

		if err := h.db.DB.Create(&cert).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถออกใบประกาศนียบัตรได้",
			})
		}

		// Reload associations
		_ = h.db.DB.Preload("Student").
			Preload("Course.Teacher").
			First(&cert, "id = ?", cert.ID)
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการตรวจสอบใบประกาศนียบัตร",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ได้รับใบประกาศนียบัตรเรียบร้อยแล้ว",
		"data":    cert,
	})
}

// VerifyCertificate checks public validity of a certificate code
func (h *CertificateHandler) VerifyCertificate(c *fiber.Ctx) error {
	code := strings.TrimSpace(c.Params("code"))
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุรหัสใบประกาศนียบัตร",
		})
	}

	var cert models.Certificate
	if err := h.db.DB.Preload("Student").
		Preload("Course.Teacher").
		Where("UPPER(TRIM(certificate_code)) = UPPER(TRIM(?))", code).
		First(&cert).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลใบประกาศนียบัตร หรือรหัสไม่ถูกต้อง",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"valid":            true,
			"certificate_code": cert.CertificateCode,
			"issued_at":        cert.IssuedAt,
			"student_name":     fmt.Sprintf("%s %s", cert.Student.FirstName, cert.Student.LastName),
			"grade_level":      cert.Student.GradeLevel,
			"classroom":        cert.Student.Classroom,
			"course_title":     cert.Course.Title,
			"teacher_name":     fmt.Sprintf("ครู%s %s", cert.Course.Teacher.FirstName, cert.Course.Teacher.LastName),
		},
	})
}
