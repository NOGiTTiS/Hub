package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

// CheckMaintenanceMode intercepts requests when maintenance mode is active,
// blocking non-admin users while allowing admin and essential routes.
func CheckMaintenanceMode(db *database.Database, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		path := c.Path()

		// 1. Whitelist essential paths
		if path == "/health" || path == "/api/health" ||
			path == "/api/settings/public" ||
			path == "/api/auth/login" ||
			path == "/api/auth/logout" ||
			path == "/api/auth/refresh" ||
			path == "/api/auth/me" ||
			strings.HasPrefix(path, "/uploads") {
			return c.Next()
		}

		// 2. Check if maintenance mode is enabled in database
		var modeSetting models.SystemSetting
		if err := db.DB.Where("key = ?", "maintenance_mode").First(&modeSetting).Error; err != nil {
			// If setting not found, default to normal operation
			return c.Next()
		}

		if modeSetting.Value != "true" {
			return c.Next()
		}

		// 3. Maintenance mode is active: Check if user is authenticated as ADMIN
		var tokenStr string
		tokenStr = c.Cookies("access_token")
		if tokenStr == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				parts := strings.SplitN(authHeader, " ", 2)
				if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
					tokenStr = parts[1]
				}
			}
		}

		if tokenStr != "" {
			claims, err := utils.ValidateToken(tokenStr, cfg.JWTSecret)
			if err == nil && claims.TokenType == "access" && claims.Role == models.RoleAdmin {
				// Admin is allowed during maintenance
				return c.Next()
			}
		}

		// 4. Non-admin user: Fetch maintenance message
		var msgSetting models.SystemSetting
		maintenanceMsg := "ระบบอยู่ระหว่างการปิดปรับปรุงชั่วคราวเพื่อพัฒนาประสิทธิภาพ ขออภัยในความไม่สะดวก"
		if err := db.DB.Where("key = ?", "maintenance_message").First(&msgSetting).Error; err == nil && msgSetting.Value != "" {
			maintenanceMsg = msgSetting.Value
		}

		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"success":     false,
			"maintenance": true,
			"message":     maintenanceMsg,
		})
	}
}
