package handlers

import (
	"encoding/json"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
)

type StudentCourseHandler struct {
	db *database.Database
}

func NewStudentCourseHandler(db *database.Database) *StudentCourseHandler {
	return &StudentCourseHandler{db: db}
}

// StudentCourseCatalogItem represents a course for students with enrollment/progress info
type StudentCourseCatalogItem struct {
	models.Course
	ModulesCount    int64   `json:"modules_count"`
	LessonsCount    int64   `json:"lessons_count"`
	IsEnrolled      bool    `json:"is_enrolled"`
	ProgressPercent float64 `json:"progress_percent"`
	EnrolledAt      *time.Time `json:"enrolled_at,omitempty"`
}

// ListPublishedCourses returns all published courses with student's enrollment status
func (h *StudentCourseHandler) ListPublishedCourses(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	var studentID uuid.UUID
	if claims != nil {
		studentID = claims.UserID
	}

	categoryIDStr := c.Query("category_id")
	query := h.db.DB.Preload("Teacher").Preload("Category").Where("is_published = ?", true)

	if categoryIDStr != "" {
		if categoryID, err := uuid.Parse(categoryIDStr); err == nil {
			query = query.Where("category_id = ?", categoryID)
		}
	}

	var courses []models.Course
	if err := query.Order("created_at DESC").Find(&courses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลรายวิชาได้",
		})
	}

	results := make([]StudentCourseCatalogItem, len(courses))
	for i, course := range courses {
		var modCount, lessonCount int64
		h.db.DB.Model(&models.Module{}).Where("course_id = ?", course.ID).Count(&modCount)
		h.db.DB.Model(&models.Lesson{}).
			Joins("JOIN modules ON lessons.module_id = modules.id").
			Where("modules.course_id = ?", course.ID).
			Count(&lessonCount)

		var isEnrolled bool
		var progress float64
		var enrolledAt *time.Time

		if studentID != uuid.Nil {
			var enrollment models.Enrollment
			if err := h.db.DB.Where("student_id = ? AND course_id = ?", studentID, course.ID).First(&enrollment).Error; err == nil {
				isEnrolled = true
				progress = enrollment.ProgressPercent
				enrolledAt = &enrollment.EnrolledAt
			}
		}

		results[i] = StudentCourseCatalogItem{
			Course:          course,
			ModulesCount:    modCount,
			LessonsCount:    lessonCount,
			IsEnrolled:      isEnrolled,
			ProgressPercent: progress,
			EnrolledAt:      enrolledAt,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// GetMyCourses returns all enrolled courses for the logged-in student
func (h *StudentCourseHandler) GetMyCourses(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาเข้าสู่ระบบ",
		})
	}

	var enrollments []models.Enrollment
	if err := h.db.DB.Preload("Course.Teacher").Preload("Course.Category").
		Where("student_id = ?", claims.UserID).
		Order("updated_at DESC").
		Find(&enrollments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลคอร์สที่ลงทะเบียนได้",
		})
	}

	type EnrolledCourseResult struct {
		EnrollmentID     uuid.UUID      `json:"enrollment_id"`
		Course           models.Course  `json:"course"`
		CompletedLessons []string       `json:"completed_lessons"`
		ProgressPercent  float64        `json:"progress_percent"`
		EnrolledAt       time.Time      `json:"enrolled_at"`
		ModulesCount     int64          `json:"modules_count"`
		LessonsCount     int64          `json:"lessons_count"`
	}

	results := make([]EnrolledCourseResult, 0, len(enrollments))
	for _, e := range enrollments {
		if e.Course == nil {
			continue
		}
		var modCount, lessonCount int64
		h.db.DB.Model(&models.Module{}).Where("course_id = ?", e.CourseID).Count(&modCount)
		h.db.DB.Model(&models.Lesson{}).
			Joins("JOIN modules ON lessons.module_id = modules.id").
			Where("modules.course_id = ?", e.CourseID).
			Count(&lessonCount)

		var completed []string
		_ = json.Unmarshal([]byte(e.CompletedLessons), &completed)

		results = append(results, EnrolledCourseResult{
			EnrollmentID:     e.ID,
			Course:           *e.Course,
			CompletedLessons: completed,
			ProgressPercent:  e.ProgressPercent,
			EnrolledAt:       e.EnrolledAt,
			ModulesCount:     modCount,
			LessonsCount:     lessonCount,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// EnrollCourse enrolls student into a course
func (h *StudentCourseHandler) EnrollCourse(c *fiber.Ctx) error {
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

	// Verify course exists & published
	var course models.Course
	if err := h.db.DB.Where("id = ? AND is_published = ?", courseID, true).First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบคอร์สวิชา หรือคอร์สยังไม่เปิดให้ลงทะเบียน",
		})
	}

	// Check if already enrolled
	var existing models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&existing).Error; err == nil {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "คุณได้ลงทะเบียนคอร์สนี้อยู่แล้ว",
			"data":    existing,
		})
	}

	newEnrollment := models.Enrollment{
		ID:               uuid.New(),
		StudentID:        claims.UserID,
		CourseID:         courseID,
		CompletedLessons: "[]",
		ProgressPercent:  0,
		EnrolledAt:       time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := h.db.DB.Create(&newEnrollment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลงทะเบียนได้",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "ลงทะเบียนเรียนสำเร็จเรียบร้อยแล้ว",
		"data":    newEnrollment,
	})
}

// UnenrollCourse unenrolls/drops a student from a course
func (h *StudentCourseHandler) UnenrollCourse(c *fiber.Ctx) error {
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

	// 1. Check if enrollment exists
	var enrollment models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการลงทะเบียนในรายวิชานี้ หรือได้ยกเลิกไปแล้ว",
		})
	}

	// 2. Check if a certificate has already been issued for this student & course
	var cert models.Certificate
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&cert).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถยกเลิกการลงทะเบียนได้ เนื่องจากท่านสำเร็จการศึกษาและได้รับใบประกาศนียบัตรแล้ว",
		})
	}

	// 3. Delete enrollment record
	if err := h.db.DB.Delete(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถยกเลิกการลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ยกเลิกการลงทะเบียนรายวิชาเรียบร้อยแล้ว",
	})
}

// GetCoursePlayer returns full course data for the Course Player
func (h *StudentCourseHandler) GetCoursePlayer(c *fiber.Ctx) error {
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

	// Fetch enrollment (Must be enrolled before accessing player)
	var enrollment models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณยังไม่ได้ลงทะเบียนในรายวิชานี้ กรุณาลงทะเบียนเรียนก่อนเข้าสู่บทเรียน",
		})
	}

	// Fetch full Course structure
	var course models.Course
	if err := h.db.DB.Preload("Teacher").
		Preload("Modules", func(db *gorm.DB) *gorm.DB {
			return db.Order("modules.order_index ASC")
		}).
		Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("lessons.order_index ASC")
		}).
		Preload("Modules.Lessons.Assignments").
		Preload("Modules.Lessons.Quizzes").
		Where("id = ?", courseID).
		First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบคอร์สวิชา",
		})
	}

	var completedLessonIDs []string
	if err := json.Unmarshal([]byte(enrollment.CompletedLessons), &completedLessonIDs); err != nil {
		completedLessonIDs = []string{}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"course":            course,
			"enrollment":        enrollment,
			"completed_lessons": completedLessonIDs,
			"progress_percent":  enrollment.ProgressPercent,
		},
	})
}

type UpdateProgressRequest struct {
	Completed bool `json:"completed"`
}

// UpdateLessonProgress marks a lesson as completed / uncompleted and recalculates progress %
func (h *StudentCourseHandler) UpdateLessonProgress(c *fiber.Ctx) error {
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

	lessonIDStr := c.Params("lessonId")
	lessonID, err := uuid.Parse(lessonIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var req UpdateProgressRequest
	if err := c.BodyParser(&req); err != nil {
		req.Completed = true
	}

	// Find or create enrollment
	var enrollment models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", claims.UserID, courseID).First(&enrollment).Error; err != nil {
		enrollment = models.Enrollment{
			ID:               uuid.New(),
			StudentID:        claims.UserID,
			CourseID:         courseID,
			CompletedLessons: "[]",
			ProgressPercent:  0,
			EnrolledAt:       time.Now(),
			UpdatedAt:        time.Now(),
		}
		if err := h.db.DB.Create(&enrollment).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถบันทึกการลงทะเบียนได้",
			})
		}
	}

	var completedList []string
	_ = json.Unmarshal([]byte(enrollment.CompletedLessons), &completedList)

	// Update list
	newCompleted := make([]string, 0, len(completedList)+1)
	for _, id := range completedList {
		if id != lessonID.String() {
			newCompleted = append(newCompleted, id)
		}
	}
	if req.Completed {
		newCompleted = append(newCompleted, lessonID.String())
	}

	// Count total lessons in this course
	var totalLessons int64
	h.db.DB.Model(&models.Lesson{}).
		Joins("JOIN modules ON lessons.module_id = modules.id").
		Where("modules.course_id = ?", courseID).
		Count(&totalLessons)

	var progressPercent float64 = 0
	if totalLessons > 0 {
		progressPercent = math.Round((float64(len(newCompleted))/float64(totalLessons))*10000) / 100.0
		if progressPercent > 100.0 {
			progressPercent = 100.0
		}
	}

	completedBytes, _ := json.Marshal(newCompleted)
	enrollment.CompletedLessons = string(completedBytes)
	enrollment.ProgressPercent = progressPercent
	enrollment.UpdatedAt = time.Now()

	if err := h.db.DB.Save(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกความก้าวหน้าได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "อัปเดตความก้าวหน้าสำเร็จ",
		"data": fiber.Map{
			"completed_lessons": newCompleted,
			"progress_percent":  progressPercent,
			"total_lessons":     totalLessons,
			"completed_count":   len(newCompleted),
		},
	})
}
