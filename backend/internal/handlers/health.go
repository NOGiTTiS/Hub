package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/database"
)

type HealthHandler struct {
	db *database.Database
}

func NewHealthHandler(db *database.Database) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) HealthCheck(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	dbStatus := "connected"
	redisStatus := "connected"

	if h.db != nil {
		dbErr, redisErr := h.db.Ping(ctx)
		if dbErr != nil {
			dbStatus = "disconnected: " + dbErr.Error()
		}
		if redisErr != nil {
			redisStatus = "disconnected: " + redisErr.Error()
		}
	} else {
		dbStatus = "not initialized"
		redisStatus = "not initialized"
	}

	return c.JSON(fiber.Map{
		"status":    "healthy",
		"app":       "TUNorth-Hub API",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
		"services": fiber.Map{
			"database": dbStatus,
			"redis":    redisStatus,
		},
	})
}
