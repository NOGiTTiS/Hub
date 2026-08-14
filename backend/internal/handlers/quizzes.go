package handlers

import (
	"encoding/json"
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

type QuizHandler struct {
	db *database.Database
}

func NewQuizHandler(db *database.Database) *QuizHandler {
	return &QuizHandler{db: db}
}

type CreateQuizRequest struct {
	Title            string `json:"title"`
	TimeLimitMinutes int    `json:"time_limit_minutes"`
	PassingScore     int    `json:"passing_score"`
	MaxAttempts      int    `json:"max_attempts"` // 0 = unlimited
}

// CreateQuiz creates a quiz in a lesson
func (h *QuizHandler) CreateQuiz(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("lessonId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var req CreateQuizRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุชื่อแบบทดสอบ",
		})
	}

	if req.TimeLimitMinutes <= 0 {
		req.TimeLimitMinutes = 15
	}
	if req.PassingScore <= 0 {
		req.PassingScore = 60
	}
	if req.MaxAttempts < 0 {
		req.MaxAttempts = 0
	}

	quiz := models.Quiz{
		ID:               uuid.New(),
		LessonID:         lessonID,
		Title:            strings.TrimSpace(req.Title),
		TimeLimitMinutes: req.TimeLimitMinutes,
		PassingScore:     req.PassingScore,
		MaxAttempts:      req.MaxAttempts,
	}

	if err := h.db.DB.Create(&quiz).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างแบบทดสอบได้",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างแบบทดสอบสำเร็จ",
		"data":    quiz,
	})
}

// GetLessonQuizzes returns quizzes and questions for teacher
func (h *QuizHandler) GetLessonQuizzes(c *fiber.Ctx) error {
	lessonID, err := uuid.Parse(c.Params("lessonId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสบทเรียนไม่ถูกต้อง",
		})
	}

	var quizzes []models.Quiz
	if err := h.db.DB.Preload("Questions").
		Where("lesson_id = ?", lessonID).
		Find(&quizzes).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลแบบทดสอบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    quizzes,
	})
}

// UpdateQuiz updates quiz parameters
func (h *QuizHandler) UpdateQuiz(c *fiber.Ctx) error {
	quizID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสแบบทดสอบไม่ถูกต้อง",
		})
	}

	var quiz models.Quiz
	if err := h.db.DB.First(&quiz, "id = ?", quizID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบแบบทดสอบ",
		})
	}

	var req CreateQuizRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.Title) != "" {
		quiz.Title = strings.TrimSpace(req.Title)
	}
	if req.TimeLimitMinutes > 0 {
		quiz.TimeLimitMinutes = req.TimeLimitMinutes
	}
	if req.PassingScore > 0 {
		quiz.PassingScore = req.PassingScore
	}
	if req.MaxAttempts >= 0 {
		quiz.MaxAttempts = req.MaxAttempts
	}

	if err := h.db.DB.Save(&quiz).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกแบบทดสอบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกแบบทดสอบเรียบร้อย",
		"data":    quiz,
	})
}

// DeleteQuiz deletes quiz
func (h *QuizHandler) DeleteQuiz(c *fiber.Ctx) error {
	quizID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสแบบทดสอบไม่ถูกต้อง",
		})
	}

	if err := h.db.DB.Delete(&models.Quiz{}, "id = ?", quizID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบแบบทดสอบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบแบบทดสอบเรียบร้อย",
	})
}

// --- QUESTIONS ---

type CreateQuestionRequest struct {
	QuestionText  string   `json:"question_text"`
	QuestionType  string   `json:"question_type"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Points        int      `json:"points"`
}

// CreateQuestion adds a question to quiz
func (h *QuizHandler) CreateQuestion(c *fiber.Ctx) error {
	quizID, err := uuid.Parse(c.Params("quizId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสแบบทดสอบไม่ถูกต้อง",
		})
	}

	var req CreateQuestionRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.QuestionText) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาระบุคำถาม",
		})
	}

	if req.QuestionType == "" {
		req.QuestionType = "MULTIPLE_CHOICE"
	}
	if req.Points <= 0 {
		req.Points = 1
	}

	optionsJSON, _ := json.Marshal(req.Options)

	question := models.QuizQuestion{
		ID:            uuid.New(),
		QuizID:        quizID,
		QuestionText:  strings.TrimSpace(req.QuestionText),
		QuestionType:  req.QuestionType,
		OptionsJSON:   string(optionsJSON),
		CorrectAnswer: req.CorrectAnswer,
		Points:        req.Points,
	}

	if err := h.db.DB.Create(&question).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถเพิ่มคำถามได้",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "เพิ่มข้อสอบสำเร็จ",
		"data":    question,
	})
}

// UpdateQuestion updates a question
func (h *QuizHandler) UpdateQuestion(c *fiber.Ctx) error {
	questionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคำถามไม่ถูกต้อง",
		})
	}

	var question models.QuizQuestion
	if err := h.db.DB.First(&question, "id = ?", questionID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบคำถาม",
		})
	}

	var req CreateQuestionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลไม่ถูกต้อง",
		})
	}

	if strings.TrimSpace(req.QuestionText) != "" {
		question.QuestionText = strings.TrimSpace(req.QuestionText)
	}
	if req.QuestionType != "" {
		question.QuestionType = req.QuestionType
	}
	if len(req.Options) > 0 {
		optionsJSON, _ := json.Marshal(req.Options)
		question.OptionsJSON = string(optionsJSON)
	}
	if req.CorrectAnswer != "" {
		question.CorrectAnswer = req.CorrectAnswer
	}
	if req.Points > 0 {
		question.Points = req.Points
	}

	if err := h.db.DB.Save(&question).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถแก้ไขคำถามได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "แก้ไขคำถามเรียบร้อย",
		"data":    question,
	})
}

// DeleteQuestion deletes a question
func (h *QuizHandler) DeleteQuestion(c *fiber.Ctx) error {
	questionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสคำถามไม่ถูกต้อง",
		})
	}

	if err := h.db.DB.Delete(&models.QuizQuestion{}, "id = ?", questionID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบคำถามได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบคำถามเรียบร้อย",
	})
}

// GetQuizStats returns attempts and scores for teacher
func (h *QuizHandler) GetQuizStats(c *fiber.Ctx) error {
	quizID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสแบบทดสอบไม่ถูกต้อง",
		})
	}

	var attempts []models.QuizAttempt
	if err := h.db.DB.Preload("Student").
		Where("quiz_id = ?", quizID).
		Order("completed_at DESC").
		Find(&attempts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลสถิติการสอบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    attempts,
	})
}

// --- STUDENT QUIZ HANDLERS ---

// QuestionForStudent strips out correct_answer
type QuestionForStudent struct {
	ID           uuid.UUID `json:"id"`
	QuestionText string    `json:"question_text"`
	QuestionType string    `json:"question_type"`
	Options      []string  `json:"options"`
	Points       int       `json:"points"`
}

type StudentQuizResponse struct {
	ID               uuid.UUID            `json:"id"`
	LessonID         uuid.UUID            `json:"lesson_id"`
	Title            string               `json:"title"`
	TimeLimitMinutes int                  `json:"time_limit_minutes"`
	PassingScore     int                  `json:"passing_score"`
	MaxAttempts      int                  `json:"max_attempts"`
	AttemptsCount    int                  `json:"attempts_count"`
	CanAttempt       bool                 `json:"can_attempt"`
	TotalPoints      int                  `json:"total_points"`
	Questions        []QuestionForStudent `json:"questions"`
	Attempts         []models.QuizAttempt `json:"attempts"`
}

// GetStudentQuiz returns quiz for student with safe question list and past attempts
func (h *QuizHandler) GetStudentQuiz(c *fiber.Ctx) error {
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

	var quiz models.Quiz
	if err := h.db.DB.Preload("Questions").Where("lesson_id = ?", lessonID).First(&quiz).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.JSON(fiber.Map{
				"success": true,
				"data":    nil,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการค้นหาแบบทดสอบ",
		})
	}

	var attempts []models.QuizAttempt
	h.db.DB.Where("quiz_id = ? AND student_id = ?", quiz.ID, claims.UserID).
		Order("started_at DESC").
		Find(&attempts)

	studentQuestions := make([]QuestionForStudent, len(quiz.Questions))
	totalPoints := 0
	for i, q := range quiz.Questions {
		var opts []string
		_ = json.Unmarshal([]byte(q.OptionsJSON), &opts)
		totalPoints += q.Points

		studentQuestions[i] = QuestionForStudent{
			ID:           q.ID,
			QuestionText: q.QuestionText,
			QuestionType: q.QuestionType,
			Options:      opts,
			Points:       q.Points,
		}
	}

	attemptsCount := len(attempts)
	canAttempt := quiz.MaxAttempts == 0 || attemptsCount < quiz.MaxAttempts

	return c.JSON(fiber.Map{
		"success": true,
		"data": StudentQuizResponse{
			ID:               quiz.ID,
			LessonID:         quiz.LessonID,
			Title:            quiz.Title,
			TimeLimitMinutes: quiz.TimeLimitMinutes,
			PassingScore:     quiz.PassingScore,
			MaxAttempts:      quiz.MaxAttempts,
			AttemptsCount:    attemptsCount,
			CanAttempt:       canAttempt,
			TotalPoints:      totalPoints,
			Questions:        studentQuestions,
			Attempts:         attempts,
		},
	})
}

type SubmitQuizRequest struct {
	Answers map[string]string `json:"answers"` // question_id -> selected_option
}

type QuestionReviewItem struct {
	QuestionID     uuid.UUID `json:"question_id"`
	QuestionText   string    `json:"question_text"`
	SelectedAnswer string    `json:"selected_answer"`
	CorrectAnswer  string    `json:"correct_answer"`
	IsCorrect      bool      `json:"is_correct"`
	PointsEarned   int       `json:"points_earned"`
	MaxPoints      int       `json:"max_points"`
}

// SubmitQuiz grades the student's submission instantly
func (h *QuizHandler) SubmitQuiz(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาเข้าสู่ระบบ",
		})
	}

	quizID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสแบบทดสอบไม่ถูกต้อง",
		})
	}

	var quiz models.Quiz
	if err := h.db.DB.Preload("Questions").First(&quiz, "id = ?", quizID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบแบบทดสอบ",
		})
	}

	// Check if student has reached max attempts
	if quiz.MaxAttempts > 0 {
		var pastAttemptsCount int64
		h.db.DB.Model(&models.QuizAttempt{}).Where("quiz_id = ? AND student_id = ?", quiz.ID, claims.UserID).Count(&pastAttemptsCount)
		if pastAttemptsCount >= int64(quiz.MaxAttempts) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": fmt.Sprintf("คุณทำแบบทดสอบครบจำนวนครั้งที่กำหนดแล้ว (สูงสุด %d ครั้ง)", quiz.MaxAttempts),
			})
		}
	}

	var req SubmitQuizRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำตอบไม่ถูกต้อง",
		})
	}

	totalPoints := 0
	earnedPoints := 0
	reviews := make([]QuestionReviewItem, len(quiz.Questions))

	for i, q := range quiz.Questions {
		totalPoints += q.Points
		studentAns := req.Answers[q.ID.String()]

		isCorrect := strings.TrimSpace(studentAns) != "" && strings.TrimSpace(studentAns) == strings.TrimSpace(q.CorrectAnswer)
		pts := 0
		if isCorrect {
			pts = q.Points
			earnedPoints += pts
		}

		reviews[i] = QuestionReviewItem{
			QuestionID:     q.ID,
			QuestionText:   q.QuestionText,
			SelectedAnswer: studentAns,
			CorrectAnswer:  q.CorrectAnswer,
			IsCorrect:      isCorrect,
			PointsEarned:   pts,
			MaxPoints:      q.Points,
		}
	}

	var scorePercent int = 0
	if totalPoints > 0 {
		scorePercent = int((float64(earnedPoints) / float64(totalPoints)) * 100)
	}

	passed := scorePercent >= quiz.PassingScore
	now := time.Now()

	attempt := models.QuizAttempt{
		ID:          uuid.New(),
		QuizID:      quiz.ID,
		StudentID:   claims.UserID,
		Score:       scorePercent,
		Passed:      passed,
		StartedAt:   now,
		CompletedAt: &now,
	}

	if err := h.db.DB.Create(&attempt).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถบันทึกผลการทดสอบได้",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ส่งแบบทดสอบและประมวลผลคะแนนเรียบร้อยแล้ว",
		"data": fiber.Map{
			"attempt":       attempt,
			"earned_points": earnedPoints,
			"total_points":  totalPoints,
			"score_percent": scorePercent,
			"passed":        passed,
			"passing_score": quiz.PassingScore,
			"reviews":       reviews,
		},
	})
}
