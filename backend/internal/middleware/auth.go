package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

const UserContextKey = "user_claims"

// RequireAuth extracts and validates JWT access token from cookies or Authorization header
func RequireAuth(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tokenStr string

		// 1. Try to read from Cookie
		tokenStr = c.Cookies("access_token")

		// 2. If not in cookie, check Authorization header (Bearer token)
		if tokenStr == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				parts := strings.SplitN(authHeader, " ", 2)
				if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
					tokenStr = parts[1]
				}
			}
		}

		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "กรุณาเข้าสู่ระบบ (Authentication required)",
			})
		}

		claims, err := utils.ValidateToken(tokenStr, cfg.JWTSecret)
		if err != nil || claims.TokenType != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Token หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
			})
		}

		// Store claims in Fiber context locals
		c.Locals(UserContextKey, claims)
		return c.Next()
	}
}

// RequireRole ensures the authenticated user has one of the allowed roles
func RequireRole(roles ...models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(UserContextKey).(*utils.JWTClaims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "ไม่พบข้อมูลสิทธิ์ผู้ใช้งาน",
			})
		}

		for _, role := range roles {
			if claims.Role == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Permission denied)",
		})
	}
}

// GetCurrentUser returns the authenticated JWTClaims from Fiber context
func GetCurrentUser(c *fiber.Ctx) *utils.JWTClaims {
	claims, ok := c.Locals(UserContextKey).(*utils.JWTClaims)
	if !ok {
		return nil
	}
	return claims
}
