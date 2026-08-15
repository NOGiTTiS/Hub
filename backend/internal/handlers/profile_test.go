package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/handlers"
)

func TestGetProfile_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewProfileHandler(nil)
	app.Get("/api/profile", handler.GetProfile)

	req := httptest.NewRequest("GET", "/api/profile", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}
}

func TestUpdateProfile_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewProfileHandler(nil)
	app.Put("/api/profile", handler.UpdateProfile)

	body, _ := json.Marshal(map[string]string{
		"first_name": "Test",
		"last_name":  "User",
	})
	req := httptest.NewRequest("PUT", "/api/profile", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}
}

func TestChangePassword_Unauthorized(t *testing.T) {
	app := fiber.New()
	handler := handlers.NewProfileHandler(nil)
	app.Put("/api/profile/password", handler.ChangePassword)

	body, _ := json.Marshal(map[string]string{
		"current_password": "OldPassword123!",
		"new_password":     "NewPassword123!",
	})
	req := httptest.NewRequest("PUT", "/api/profile/password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("Expected status 401 Unauthorized, got %d", resp.StatusCode)
	}
}
