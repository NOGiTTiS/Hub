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

type AssignmentHandler struct {
	db *database.Database
}

func NewAssignmentHandler(db *database.Database) *AssignmentHandler {
	return &AssignmentHandler{db: db}
}

type CreateAssignmentRequest struct {
	Title        string     `json:"title"`
	Instructions string     `json:"instructions"`
	MaxScore     int        `json:"max_score"`
	DueDate      *time.Time `json:"due_date,omitempty"`
}

// CreateAssignment creates an assignment for a lesson
func (h *AssignmentHandler) CreateAssignment(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("lessonId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var req CreateAssignmentRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุหัวข้อและคำสั่งการบ้าน",
		})
	}

	if req.MaxScore <= 0 {
		req.MaxScore = 100
	}

	assignment := models.Assignment{
		ID:           uuid.New(),
		LessonID:     lessonID,
		Title:        strings.TrimSpace(req.Title),
		Instructions: req.Instructions,
		MaxScore:     req.MaxScore,
		DueDate:      req.DueDate,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.db.DB.Create(&assignment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างการบ้านได้",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างการบ้านสำเร็จ",
		"data":    assignment,
	})
}

// GetLessonAssignments returns assignments in a lesson
func (h *AssignmentHandler) GetLessonAssignments(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("lessonId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var assignments []models.Assignment
	if err := h.db.DB.Where("lesson_id = ?", lessonID).
		Order("created_at ASC").
		Find(&assignments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลการบ้านได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    assignments,
	})
}

// UpdateAssignment updates assignment details
func (h *AssignmentHandler) UpdateAssignment(c *fiber.Ctx) error {
	assignmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสการบ้านไม่ถูกต้อง",
		})
	}

	var assignment models.Assignment
	if err := h.db.DB.First(&assignment, "id = ?", assignmentID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบการบ้าน",
		})
	}

	var req CreateAssignmentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.Title) != "" {
		assignment.Title = strings.TrimSpace(req.Title)
	}
	assignment.Instructions = req.Instructions
	if req.MaxScore > 0 {
		assignment.MaxScore = req.MaxScore
	}
	assignment.DueDate = req.DueDate
	assignment.UpdatedAt = time.Now()

	if err := h.db.DB.Save(&assignment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกการแก้ไขการบ้านได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกการบ้านเรียบร้อย",
		"data":    assignment,
	})
}

// DeleteAssignment deletes an assignment
func (h *AssignmentHandler) DeleteAssignment(c *fiber.Ctx) error {
	assignmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสการบ้านไม่ถูกต้อง",
		})
	}

	if err := h.db.DB.Delete(&models.Assignment{}, "id = ?", assignmentID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบการบ้านได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบการบ้านสำเร็จเรียบร้อย",
	})
}

// ListAssignmentSubmissions returns all student submissions for an assignment
func (h *AssignmentHandler) ListAssignmentSubmissions(c *fiber.Ctx) error {
	assignmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสการบ้านไม่ถูกต้อง",
		})
	}

	var submissions []models.Submission
	if err := h.db.DB.Preload("Student").
		Where("assignment_id = ?", assignmentID).
		Order("submitted_at DESC").
		Find(&submissions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลการส่งงานได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    submissions,
	})
}

type GradeSubmissionRequest struct {
	Score    int    `json:"score"`
	Feedback string `json:"feedback"`
}

// GradeSubmission allows teacher to grade a student submission
func (h *AssignmentHandler) GradeSubmission(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสการส่งงานไม่ถูกต้อง",
		})
	}

	var submission models.Submission
	if err := h.db.DB.First(&submission, "id = ?", submissionID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบรายการส่งงาน",
		})
	}

	var req GradeSubmissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคะแนนไม่ถูกต้อง",
		})
	}

	submission.Score = &req.Score
	submission.Feedback = req.Feedback
	submission.Status = models.SubmissionStatusGraded

	if err := h.db.DB.Save(&submission).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกผลการตรวจได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกผลการตรวจและคะแนนเรียบร้อยแล้ว",
		"data":    submission,
	})
}

// --- STUDENT ASSIGNMENT HANDLERS ---

type SubmitAssignmentRequest struct {
	FileURL       string `json:"file_url"`
	SubmittedText string `json:"submitted_text"`
}

// GetLessonAssignmentForStudent returns the assignment in a lesson and student's submission status
func (h *AssignmentHandler) GetLessonAssignmentForStudent(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาเข้าสู่ระบบ",
		})
	}

	lessonID, err := uuid.Parse(c.Params("lessonId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var assignments []models.Assignment
	if err := h.db.DB.Where("lesson_id = ?", lessonID).Find(&assignments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการดึงข้อมูลการบ้าน",
		})
	}

	type AssignmentWithSubmission struct {
		models.Assignment
		Submission *models.Submission `json:"submission"`
	}

	results := make([]AssignmentWithSubmission, len(assignments))
	for i, a := range assignments {
		var sub models.Submission
		var subPtr *models.Submission = nil
		if err := h.db.DB.Where("assignment_id = ? AND student_id = ?", a.ID, claims.UserID).First(&sub).Error; err == nil {
			subPtr = &sub
		}

		results[i] = AssignmentWithSubmission{
			Assignment: a,
			Submission: subPtr,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// SubmitAssignment submits an assignment from a student
func (h *AssignmentHandler) SubmitAssignment(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาเข้าสู่ระบบ",
		})
	}

	assignmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสการบ้านไม่ถูกต้อง",
		})
	}

	var req SubmitAssignmentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.FileURL) == "" && strings.TrimSpace(req.SubmittedText) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกคำตอบหรือแนบไฟล์การบ้าน",
		})
	}

	var submission models.Submission
	err = h.db.DB.Where("assignment_id = ? AND student_id = ?", assignmentID, claims.UserID).First(&submission).Error

	if err == gorm.ErrRecordNotFound {
		submission = models.Submission{
			ID:            uuid.New(),
			AssignmentID:  assignmentID,
			StudentID:     claims.UserID,
			FileURL:       req.FileURL,
			SubmittedText: req.SubmittedText,
			Status:        models.SubmissionStatusSubmitted,
			SubmittedAt:   time.Now(),
		}
		if err := h.db.DB.Create(&submission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถส่งการบ้านได้",
			})
		}
	} else if err == nil {
		// Update existing submission
		submission.FileURL = req.FileURL
		submission.SubmittedText = req.SubmittedText
		submission.Status = models.SubmissionStatusSubmitted
		submission.SubmittedAt = time.Now()
		if err := h.db.DB.Save(&submission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถบันทึกการส่งการบ้านได้",
			})
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ส่งการบ้านสำเร็จเรียบร้อยแล้ว",
		"data":    submission,
	})
}
