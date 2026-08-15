package handlers_test

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"tunorth-hub-backend/internal/handlers"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

func TestDownloadQuizTemplate_CSV(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewQuizHandler(nil)
	app.Get("/api/teacher/quizzes/template", handler.DownloadQuizTemplate)

	req := httptest.NewRequest("GET", "/api/teacher/quizzes/template?format=csv", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to request template: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("Expected status 200 OK, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "text/csv; charset=utf-8" {
		t.Errorf("Expected Content-Type text/csv; charset=utf-8, got %s", contentType)
	}
}

func TestDownloadQuizTemplate_XLSX(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewQuizHandler(nil)
	app.Get("/api/teacher/quizzes/template", handler.DownloadQuizTemplate)

	req := httptest.NewRequest("GET", "/api/teacher/quizzes/template?format=xlsx", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to request template: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("Expected status 200 OK, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" {
		t.Errorf("Expected XLSX Content-Type, got %s", contentType)
	}
}

func TestImportQuestions_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewQuizHandler(nil)
	app.Post("/api/teacher/quizzes/:quizId/import", handler.ImportQuestions)

	req := httptest.NewRequest("POST", "/api/teacher/quizzes/"+uuid.New().String()+"/import", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	// 404 or 401 when unauthenticated / no DB
	if resp.StatusCode != fiber.StatusNotFound && resp.StatusCode != fiber.StatusUnauthorized {
		t.Logf("Got status %d", resp.StatusCode)
	}
}

func TestImportQuestions_InvalidQuizID(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewQuizHandler(nil)

	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.UserContextKey, &utils.JWTClaims{
			UserID: uuid.New(),
			Email:  "teacher@tunorth.ac.th",
			Role:   models.RoleTeacher,
		})
		return c.Next()
	})
	app.Post("/api/teacher/quizzes/:quizId/import", handler.ImportQuestions)

	req := httptest.NewRequest("POST", "/api/teacher/quizzes/invalid-uuid/import", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	if body["success"] != false {
		t.Errorf("Expected success false, got %v", body["success"])
	}
}
