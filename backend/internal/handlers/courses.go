package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
)

type CourseHandler struct {
	db *database.Database
}

func NewCourseHandler(db *database.Database) *CourseHandler {
	return &CourseHandler{db: db}
}

// CourseWithStats is a helper struct for teacher courses list
type TeacherCourseItem struct {
	models.Course
	ModulesCount     int64 `json:"modules_count"`
	LessonsCount     int64 `json:"lessons_count"`
	EnrolledStudents int64 `json:"enrolled_students"`
}

// ListTeacherCourses returns all courses belonging to the authenticated teacher (or all for admin)
func (h *CourseHandler) ListTeacherCourses(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลผู้ใช้งาน",
		})
	}

	var courses []models.Course
	query := h.db.DB.Model(&models.Course{}).Preload("Teacher").Preload("Category")

	if claims.Role != models.RoleAdmin {
		query = query.Where("teacher_id = ?", claims.UserID)
	}

	if err := query.Order("created_at DESC").Find(&courses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลรายวิชาได้",
			"error":   err.Error(),
		})
	}

	// Calculate counts for each course
	results := make([]TeacherCourseItem, len(courses))
	for i, course := range courses {
		var modCount, lessonCount, enrollCount int64
		h.db.DB.Model(&models.Module{}).Where("course_id = ?", course.ID).Count(&modCount)
		h.db.DB.Model(&models.Lesson{}).
			Joins("JOIN modules ON lessons.module_id = modules.id").
			Where("modules.course_id = ?", course.ID).
			Count(&lessonCount)
		h.db.DB.Model(&models.Enrollment{}).Where("course_id = ?", course.ID).Count(&enrollCount)

		results[i] = TeacherCourseItem{
			Course:           course,
			ModulesCount:     modCount,
			LessonsCount:     lessonCount,
			EnrolledStudents: enrollCount,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// GetTeacherCourse returns full course structure with modules and lessons
func (h *CourseHandler) GetTeacherCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	courseIDStr := c.Params("id")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	var course models.Course
	query := h.db.DB.Preload("Teacher").
		Preload("Category").
		Preload("Modules", func(db *gorm.DB) *gorm.DB {
			return db.Order("modules.order_index ASC")
		}).
		Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("lessons.order_index ASC")
		})

	if claims.Role != models.RoleAdmin {
		query = query.Where("id = ? AND teacher_id = ?", courseID, claims.UserID)
	} else {
		query = query.Where("id = ?", courseID)
	}

	if err := query.First(&course).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "ไม่พบคอร์สวิชานี้ หรือคุณไม่มีสิทธิ์เข้าถึง",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการค้นหาคอร์สวิชา",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    course,
	})
}

type CreateCourseRequest struct {
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	CoverImageURL string     `json:"cover_image_url"`
	CategoryID    *uuid.UUID `json:"category_id"`
	IsPublished   bool       `json:"is_published"`
}

// CreateCourse creates a new course for the authenticated teacher
func (h *CourseHandler) CreateCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	var req CreateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกชื่อรายวิชา",
		})
	}

	course := models.Course{
		ID:            uuid.New(),
		Title:         req.Title,
		Description:   req.Description,
		CoverImageURL: req.CoverImageURL,
		TeacherID:     claims.UserID,
		CategoryID:    req.CategoryID,
		IsPublished:   req.IsPublished,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := h.db.DB.Create(&course).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างรายวิชาได้",
			"error":   err.Error(),
		})
	}

	// Preload category & teacher
	h.db.DB.Preload("Category").Preload("Teacher").First(&course, course.ID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างรายวิชาสำเร็จเรียบร้อย",
		"data":    course,
	})
}

// UpdateCourse updates course details
func (h *CourseHandler) UpdateCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	var course models.Course
	query := h.db.DB.Where("id = ?", courseID)
	if claims.Role != models.RoleAdmin {
		query = query.Where("teacher_id = ?", claims.UserID)
	}
	if err := query.First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบรายวิชานี้ หรือไม่มีสิทธิ์แก้ไข",
		})
	}

	var req CreateCourseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.Title) != "" {
		course.Title = strings.TrimSpace(req.Title)
	}
	course.Description = req.Description
	if req.CoverImageURL != "" {
		course.CoverImageURL = req.CoverImageURL
	}
	course.CategoryID = req.CategoryID
	course.IsPublished = req.IsPublished
	course.UpdatedAt = time.Now()

	if err := h.db.DB.Save(&course).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกการแก้ไขรายวิชาได้",
		})
	}

	// Preload category & teacher
	h.db.DB.Preload("Category").Preload("Teacher").First(&course, course.ID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว",
		"data":    course,
	})
}

// DeleteCourse deletes a course
func (h *CourseHandler) DeleteCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	var course models.Course
	query := h.db.DB.Where("id = ?", courseID)
	if claims.Role != models.RoleAdmin {
		query = query.Where("teacher_id = ?", claims.UserID)
	}
	if err := query.First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบรายวิชา หรือไม่มีสิทธิ์ลบ",
		})
	}

	if err := h.db.DB.Delete(&course).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบรายวิชาได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบรายวิชาสำเร็จเรียบร้อย",
	})
}

// TogglePublishCourse toggles publish status
func (h *CourseHandler) TogglePublishCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	var course models.Course
	query := h.db.DB.Where("id = ?", courseID)
	if claims.Role != models.RoleAdmin {
		query = query.Where("teacher_id = ?", claims.UserID)
	}
	if err := query.First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบรายวิชา",
		})
	}

	course.IsPublished = !course.IsPublished
	course.UpdatedAt = time.Now()
	h.db.DB.Save(&course)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "เปลี่ยนสถานะการเผยแพร่สำเร็จ",
		"data": fiber.Map{
			"id":           course.ID,
			"is_published": course.IsPublished,
		},
	})
}

// --- MODULE HANDLERS ---

type CreateModuleRequest struct {
	Title string `json:"title"`
}

func (h *CourseHandler) CreateModule(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	courseID, err := uuid.Parse(c.Params("courseId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	// Verify course ownership
	var course models.Course
	q := h.db.DB.Where("id = ?", courseID)
	if claims.Role != models.RoleAdmin {
		q = q.Where("teacher_id = ?", claims.UserID)
	}
	if err := q.First(&course).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณไม่มีสิทธิ์แก้ไขคอร์สนี้",
		})
	}

	var req CreateModuleRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุชื่อโมดูล",
		})
	}

	// Find max order_index
	var maxOrder int
	h.db.DB.Model(&models.Module{}).Where("course_id = ?", courseID).Select("COALESCE(MAX(order_index), 0)").Scan(&maxOrder)

	module := models.Module{
		ID:         uuid.New(),
		CourseID:   courseID,
		Title:      strings.TrimSpace(req.Title),
		OrderIndex: maxOrder + 1,
	}

	if err := h.db.DB.Create(&module).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างโมดูลได้",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างโมดูลสำเร็จ",
		"data":    module,
	})
}

func (h *CourseHandler) UpdateModule(c *fiber.Ctx) error {
	moduleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสโมดูลไม่ถูกต้อง",
		})
	}

	var module models.Module
	if err := h.db.DB.First(&module, "id = ?", moduleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบโมดูลที่ต้องการแก้ไข",
		})
	}

	var req CreateModuleRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุชื่อโมดูล",
		})
	}

	module.Title = strings.TrimSpace(req.Title)
	if err := h.db.DB.Save(&module).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกโมดูลได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "แก้ไขโมดูลเรียบร้อย",
		"data":    module,
	})
}

func (h *CourseHandler) DeleteModule(c *fiber.Ctx) error {
	moduleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสโมดูลไม่ถูกต้อง",
		})
	}

	if err := h.db.DB.Delete(&models.Module{}, "id = ?", moduleID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบโมดูลได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบโมดูลและบทเรียนภายในสำเร็จ",
	})
}

type ReorderItem struct {
	ID         uuid.UUID `json:"id"`
	OrderIndex int       `json:"order_index"`
}

func (h *CourseHandler) ReorderModules(c *fiber.Ctx) error {
	var items []ReorderItem
	if err := c.BodyParser(&items); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลลำดับไม่ถูกต้อง",
		})
	}

	tx := h.db.DB.Begin()
	for _, item := range items {
		if err := tx.Model(&models.Module{}).Where("id = ?", item.ID).Update("order_index", item.OrderIndex).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "เกิดข้อผิดพลาดในการจัดเรียงโมดูล",
			})
		}
	}
	tx.Commit()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "จัดเรียงลำดับโมดูลเรียบร้อยแล้ว",
	})
}

// --- LESSON HANDLERS ---

type UpsertLessonRequest struct {
	Title       string             `json:"title"`
	ContentType models.ContentType `json:"content_type"`
	VideoURL    string             `json:"video_url"`
	EmbedURL    string             `json:"embed_url"`
	PDFURL      string             `json:"pdf_url"`
	BodyText    string             `json:"body_text"`
}

func (h *CourseHandler) CreateLesson(c *fiber.Ctx) error {
	moduleID, err := uuid.Parse(c.Params("moduleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสโมดูลไม่ถูกต้อง",
		})
	}

	var req UpsertLessonRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุชื่อบทเรียน",
		})
	}

	if req.ContentType == "" {
		req.ContentType = models.ContentTypeText
	}

	var maxOrder int
	h.db.DB.Model(&models.Lesson{}).Where("module_id = ?", moduleID).Select("COALESCE(MAX(order_index), 0)").Scan(&maxOrder)

	lesson := models.Lesson{
		ID:          uuid.New(),
		ModuleID:    moduleID,
		Title:       strings.TrimSpace(req.Title),
		ContentType: req.ContentType,
		VideoURL:    req.VideoURL,
		EmbedURL:    req.EmbedURL,
		PDFURL:      req.PDFURL,
		BodyText:    req.BodyText,
		OrderIndex:  maxOrder + 1,
	}

	if err := h.db.DB.Create(&lesson).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างบทเรียนได้",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "เพิ่มบทเรียนสำเร็จ",
		"data":    lesson,
	})
}

func (h *CourseHandler) UpdateLesson(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var lesson models.Lesson
	if err := h.db.DB.First(&lesson, "id = ?", lessonID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบทเรียนที่ต้องการแก้ไข",
		})
	}

	var req UpsertLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.Title) != "" {
		lesson.Title = strings.TrimSpace(req.Title)
	}
	if req.ContentType != "" {
		lesson.ContentType = req.ContentType
	}
	lesson.VideoURL = req.VideoURL
	lesson.EmbedURL = req.EmbedURL
	lesson.PDFURL = req.PDFURL
	lesson.BodyText = req.BodyText

	if err := h.db.DB.Save(&lesson).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกบทเรียนได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกบทเรียนเรียบร้อย",
		"data":    lesson,
	})
}

func (h *CourseHandler) DeleteLesson(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	if err := h.db.DB.Delete(&models.Lesson{}, "id = ?", lessonID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบบทเรียนได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบบทเรียนสำเร็จเรียบร้อย",
	})
}

func (h *CourseHandler) ReorderLessons(c *fiber.Ctx) error {
	var items []ReorderItem
	if err := c.BodyParser(&items); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลลำดับไม่ถูกต้อง",
		})
	}

	tx := h.db.DB.Begin()
	for _, item := range items {
		if err := tx.Model(&models.Lesson{}).Where("id = ?", item.ID).Update("order_index", item.OrderIndex).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "เกิดข้อผิดพลาดในการจัดเรียงบทเรียน",
			})
		}
	}
	tx.Commit()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "จัดเรียงลำดับบทเรียนเรียบร้อยแล้ว",
	})
}

// EnrolledStudentItem represents a student enrolled in a course with progress info
type EnrolledStudentItem struct {
	EnrollmentID    uuid.UUID   `json:"enrollment_id"`
	StudentID       uuid.UUID   `json:"student_id"`
	Student         models.User `json:"student"`
	ProgressPercent float64     `json:"progress_percent"`
	EnrolledAt      time.Time   `json:"enrolled_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	HasCertificate  bool        `json:"has_certificate"`
}

// ListCourseStudents returns all students enrolled in a course
func (h *CourseHandler) ListCourseStudents(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลผู้ใช้งาน",
		})
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	// Verify course access: teacher must own the course, admin can access all
	var course models.Course
	if err := h.db.DB.First(&course, "id = ?", courseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบคอร์สวิชา",
		})
	}

	if claims.Role != models.RoleAdmin && course.TeacherID != claims.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้เรียนในรายวิชานี้",
		})
	}

	var enrollments []models.Enrollment
	if err := h.db.DB.Where("course_id = ?", courseID).
		Order("enrolled_at DESC").
		Find(&enrollments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลรายชื่อผู้เรียนได้",
		})
	}

	results := make([]EnrolledStudentItem, len(enrollments))
	for i, e := range enrollments {
		var user models.User
		_ = h.db.DB.First(&user, "id = ?", e.StudentID)

		var certCount int64
		h.db.DB.Model(&models.Certificate{}).
			Where("student_id = ? AND course_id = ?", e.StudentID, courseID).
			Count(&certCount)

		results[i] = EnrolledStudentItem{
			EnrollmentID:    e.ID,
			StudentID:       e.StudentID,
			Student:         user,
			ProgressPercent: e.ProgressPercent,
			EnrolledAt:      e.EnrolledAt,
			UpdatedAt:       e.UpdatedAt,
			HasCertificate:  certCount > 0,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// RemoveStudentFromCourse removes/unenrolls a student from a course (for teacher or admin)
func (h *CourseHandler) RemoveStudentFromCourse(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลผู้ใช้งาน",
		})
	}

	courseID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคอร์สไม่ถูกต้อง",
		})
	}

	studentID, err := uuid.Parse(c.Params("studentId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสนักเรียนไม่ถูกต้อง",
		})
	}

	// Verify course permission
	var course models.Course
	if err := h.db.DB.First(&course, "id = ?", courseID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบคอร์สวิชา",
		})
	}

	if claims.Role != models.RoleAdmin && course.TeacherID != claims.UserID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณไม่มีสิทธิ์จัดการผู้เรียนในรายวิชานี้",
		})
	}

	// Find enrollment
	var enrollment models.Enrollment
	if err := h.db.DB.Where("student_id = ? AND course_id = ?", studentID, courseID).First(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการลงทะเบียนของนักเรียนในรายวิชานี้",
		})
	}

	// Check if student already has a certificate issued
	var cert models.Certificate
	hasCert := h.db.DB.Where("student_id = ? AND course_id = ?", studentID, courseID).First(&cert).Error == nil

	if hasCert {
		// Teachers are NOT allowed to remove certified students
		if claims.Role != models.RoleAdmin {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถถอนนักเรียนได้ เนื่องจากนักเรียนสำเร็จการศึกษาและได้รับใบประกาศนียบัตรแล้ว (กรุณาติดต่อผู้ดูแลระบบหากต้องการเพิกถอน)",
			})
		}
		// If Admin, revoke certificate along with enrollment
		_ = h.db.DB.Delete(&cert)
	}

	// Delete enrollment
	if err := h.db.DB.Delete(&enrollment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถถอนนักเรียนออกจากรายวิชาได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ถอนนักเรียนออกจากรายวิชาเรียบร้อยแล้ว",
	})
}
