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

func TestUnenrollCourse_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewStudentCourseHandler(nil)
	app.Delete("/api/student/courses/:id/enroll", handler.UnenrollCourse)

	req := httptest.NewRequest("DELETE", "/api/student/courses/"+uuid.New().String()+"/enroll", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}
}

func TestUnenrollCourse_InvalidCourseID(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewStudentCourseHandler(nil)

	// Mock auth middleware setting student claims
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.UserContextKey, &utils.JWTClaims{
			UserID: uuid.New(),
			Email:  "student@tunorth.ac.th",
			Role:   models.RoleStudent,
		})
		return c.Next()
	})
	app.Delete("/api/student/courses/:id/enroll", handler.UnenrollCourse)

	req := httptest.NewRequest("DELETE", "/api/student/courses/invalid-uuid/enroll", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp.StatusCode)
	}

	var result map[string]interface{}
	_ = json.NewDecoder(resp.Body).Decode(&result)
	if result["success"] != false {
		t.Errorf("Expected success to be false, got %v", result["success"])
	}
}

func TestGetCoursePlayer_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewStudentCourseHandler(nil)
	app.Get("/api/student/courses/:id/player", handler.GetCoursePlayer)

	req := httptest.NewRequest("GET", "/api/student/courses/"+uuid.New().String()+"/player", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}
}

func TestRemoveStudentFromCourse_InvalidCourseID(t *testing.T) {
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
	app.Delete("/api/teacher/courses/:id/students/:studentId", handler.RemoveStudentFromCourse)

	req := httptest.NewRequest("DELETE", "/api/teacher/courses/invalid-id/students/"+uuid.New().String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp.StatusCode)
	}
}

func TestRemoveStudentFromCourse_InvalidStudentID(t *testing.T) {
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
	app.Delete("/api/teacher/courses/:id/students/:studentId", handler.RemoveStudentFromCourse)

	req := httptest.NewRequest("DELETE", "/api/teacher/courses/"+uuid.New().String()+"/students/invalid-student-id", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Errorf("Expected status 400 Bad Request, got %d", resp.StatusCode)
	}
}
