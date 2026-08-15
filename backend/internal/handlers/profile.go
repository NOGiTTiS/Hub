package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

type ProfileHandler struct {
	db *database.Database
}

func NewProfileHandler(db *database.Database) *ProfileHandler {
	return &ProfileHandler{
		db: db,
	}
}

type UpdateProfileRequest struct {
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	AvatarURL   *string `json:"avatar_url"`
	Bio         *string `json:"bio"`
	PhoneNumber *string `json:"phone_number"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// GetProfile retrieves the authenticated user's profile and role-specific stats
func (h *ProfileHandler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการเข้าสู่ระบบ",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งาน",
		})
	}

	// Calculate role-specific stats
	stats := fiber.Map{}

	switch user.Role {
	case models.RoleStudent:
		var enrolledCount int64
		var completedCount int64
		var certificatesCount int64
		var submissionsCount int64

		h.db.DB.Model(&models.Enrollment{}).Where("student_id = ?", user.ID).Count(&enrolledCount)
		h.db.DB.Model(&models.Enrollment{}).Where("student_id = ? AND progress_percent >= 100", user.ID).Count(&completedCount)
		h.db.DB.Model(&models.Certificate{}).Where("student_id = ?", user.ID).Count(&certificatesCount)
		h.db.DB.Model(&models.Submission{}).Where("student_id = ?", user.ID).Count(&submissionsCount)

		stats["enrolled_courses"] = enrolledCount
		stats["completed_courses"] = completedCount
		stats["certificates_earned"] = certificatesCount
		stats["assignments_submitted"] = submissionsCount

	case models.RoleTeacher:
		var coursesCount int64
		var publishedCoursesCount int64
		var totalStudentsCount int64
		var pendingGradingCount int64

		h.db.DB.Model(&models.Course{}).Where("teacher_id = ?", user.ID).Count(&coursesCount)
		h.db.DB.Model(&models.Course{}).Where("teacher_id = ? AND is_published = true", user.ID).Count(&publishedCoursesCount)

		// Count students enrolled in teacher's courses
		h.db.DB.Table("enrollments").
			Joins("JOIN courses ON courses.id = enrollments.course_id").
			Where("courses.teacher_id = ?", user.ID).
			Count(&totalStudentsCount)

		// Count pending submissions to grade in teacher's courses
		h.db.DB.Table("submissions").
			Joins("JOIN assignments ON assignments.id = submissions.assignment_id").
			Joins("JOIN lessons ON lessons.id = assignments.lesson_id").
			Joins("JOIN modules ON modules.id = lessons.module_id").
			Joins("JOIN courses ON courses.id = modules.course_id").
			Where("courses.teacher_id = ? AND submissions.status = ?", user.ID, models.SubmissionStatusSubmitted).
			Count(&pendingGradingCount)

		stats["courses_created"] = coursesCount
		stats["published_courses"] = publishedCoursesCount
		stats["total_students"] = totalStudentsCount
		stats["pending_grading"] = pendingGradingCount

	case models.RoleAdmin:
		var totalUsers int64
		var totalStudents int64
		var totalTeachers int64
		var totalCourses int64

		h.db.DB.Model(&models.User{}).Count(&totalUsers)
		h.db.DB.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
		h.db.DB.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)
		h.db.DB.Model(&models.Course{}).Count(&totalCourses)

		stats["total_users"] = totalUsers
		stats["total_students"] = totalStudents
		stats["total_teachers"] = totalTeachers
		stats["total_courses"] = totalCourses
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user": fiber.Map{
				"id":           user.ID,
				"email":        user.Email,
				"first_name":   user.FirstName,
				"last_name":    user.LastName,
				"avatar_url":   user.AvatarURL,
				"bio":          user.Bio,
				"phone_number": user.PhoneNumber,
				"role":         user.Role,
				"grade_level":  user.GradeLevel,
				"classroom":    user.Classroom,
				"created_at":   user.CreatedAt,
				"updated_at":   user.UpdatedAt,
			},
			"stats": stats,
		},
	})
}

// UpdateProfile updates user personal information
func (h *ProfileHandler) UpdateProfile(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการเข้าสู่ระบบ",
		})
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รูปแบบข้อมูลไม่ถูกต้อง",
		})
	}

	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.FirstName == "" || req.LastName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุชื่อและนามสกุลให้ครบถ้วน",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งาน",
		})
	}

	user.FirstName = req.FirstName
	user.LastName = req.LastName
	user.AvatarURL = req.AvatarURL
	user.Bio = req.Bio
	user.PhoneNumber = req.PhoneNumber

	if err := h.db.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว",
		"data": fiber.Map{
			"id":           user.ID,
			"email":        user.Email,
			"first_name":   user.FirstName,
			"last_name":    user.LastName,
			"avatar_url":   user.AvatarURL,
			"bio":          user.Bio,
			"phone_number": user.PhoneNumber,
			"role":         user.Role,
			"grade_level":  user.GradeLevel,
			"classroom":    user.Classroom,
			"created_at":   user.CreatedAt,
			"updated_at":   user.UpdatedAt,
		},
	})
}

// ChangePassword changes the authenticated user's password after verifying the old password
func (h *ProfileHandler) ChangePassword(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการเข้าสู่ระบบ",
		})
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รูปแบบข้อมูลไม่ถูกต้อง",
		})
	}

	req.CurrentPassword = strings.TrimSpace(req.CurrentPassword)
	req.NewPassword = strings.TrimSpace(req.NewPassword)

	if req.CurrentPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งาน",
		})
	}

	// Verify current password
	if !utils.CheckPasswordHash(req.CurrentPassword, user.PasswordHash) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสผ่านปัจจุบันไม่ถูกต้อง",
		})
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการเข้ารหัสผ่าน",
		})
	}

	user.PasswordHash = hashedPassword
	if err := h.db.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว",
	})
}
