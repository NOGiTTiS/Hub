package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"tunorth-hub-backend/internal/handlers"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

func TestCreateLesson_InvalidDates(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewCourseHandler(nil)

	// Mock teacher auth
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.UserContextKey, &utils.JWTClaims{
			UserID: uuid.New(),
			Email:  "teacher@tunorth.ac.th",
			Role:   models.RoleTeacher,
		})
		return c.Next()
	})
	app.Post("/api/teacher/modules/:moduleId/lessons", handler.CreateLesson)

	from := time.Now().Add(24 * time.Hour)
	until := time.Now() // until is BEFORE from

	payload := handlers.UpsertLessonRequest{
		Title:               "Test Timed Lesson",
		ContentType:         models.ContentTypeText,
		DurationMinutes:     30,
		AvailableFrom:       &from,
		AvailableUntil:      &until,
		MinStudyTimeSeconds: 60,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/api/teacher/modules/"+uuid.New().String()+"/lessons", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request for inverted dates, got %d", resp.StatusCode)
	}

	var res map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&res)
	if res["success"] != false {
		t.Errorf("Expected success to be false, got %v", res["success"])
	}
}

func TestUpdateLessonProgress_Validation(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewStudentCourseHandler(nil)

	// 1. Test Unauthorized
	app.Post("/api/student/courses/:id/lessons/:lessonId/progress", handler.UpdateLessonProgress)
	req := httptest.NewRequest("POST", "/api/student/courses/"+uuid.New().String()+"/lessons/"+uuid.New().String()+"/progress", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}

	// 2. Test Invalid Course UUID with Mock Auth
	appAuth := fiber.New()
	appAuth.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.UserContextKey, &utils.JWTClaims{
			UserID: uuid.New(),
			Email:  "student@tunorth.ac.th",
			Role:   models.RoleStudent,
		})
		return c.Next()
	})
	appAuth.Post("/api/student/courses/:id/lessons/:lessonId/progress", handler.UpdateLessonProgress)

	req2 := httptest.NewRequest("POST", "/api/student/courses/invalid-id/lessons/"+uuid.New().String()+"/progress", nil)
	resp2, err := appAuth.Test(req2)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	if resp2.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp2.StatusCode)
	}

	// 3. Test Invalid Lesson UUID with Mock Auth
	req3 := httptest.NewRequest("POST", "/api/student/courses/"+uuid.New().String()+"/lessons/invalid-lesson-id/progress", nil)
	resp3, err := appAuth.Test(req3)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	if resp3.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp3.StatusCode)
	}
}
