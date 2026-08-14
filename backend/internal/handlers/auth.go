package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

type AuthHandler struct {
	cfg *config.Config
	db  *database.Database
}

func NewAuthHandler(cfg *config.Config, db *database.Database) *AuthHandler {
	return &AuthHandler{
		cfg: cfg,
		db:  db,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	GradeLevel string `json:"grade_level"`
	Classroom  string `json:"classroom"`
}

// Register allows a student to register an account if allowed by policy
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	// 1. Check system policy for self registration
	var regSetting models.SystemSetting
	if err := h.db.DB.Where("key = ?", "allow_student_registration").First(&regSetting).Error; err != nil || regSetting.Value != "true" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "ระบบปิดรับการสมัครสมาชิกด้วยตนเองในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ",
		})
	}

	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รูปแบบข้อมูลไม่ถูกต้อง",
		})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.GradeLevel = strings.TrimSpace(req.GradeLevel)
	req.Classroom = strings.TrimSpace(req.Classroom)

	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกข้อมูลอีเมล รหัสผ่าน ชื่อ และนามสกุลให้ครบถ้วน",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
		})
	}

	// 2. Check duplicate email
	var count int64
	h.db.DB.Model(&models.User{}).Where("LOWER(email) = ?", req.Email).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น",
		})
	}

	// 3. Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการเข้ารหัสผ่าน",
		})
	}

	// 4. Create new user with RoleStudent
	var gradeLevelPtr *string
	if req.GradeLevel != "" {
		gradeLevelPtr = &req.GradeLevel
	}
	var classroomPtr *string
	if req.Classroom != "" {
		classroomPtr = &req.Classroom
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         models.RoleStudent,
		GradeLevel:   gradeLevelPtr,
		Classroom:    classroomPtr,
	}

	if err := h.db.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างบัญชีผู้ใช้งานได้ กรุณาลองใหม่อีกครั้ง",
		})
	}

	// 5. Generate token pair & set cookie for instant login
	tokens, err := utils.GenerateTokenPair(&user, h.cfg.JWTSecret)
	if err == nil {
		isProd := h.cfg.AppEnv == "production"
		c.Cookie(&fiber.Cookie{
			Name:     "access_token",
			Value:    tokens.AccessToken,
			Expires:  time.Now().Add(2 * time.Hour),
			HTTPOnly: true,
			Secure:   isProd,
			SameSite: "Lax",
			Path:     "/",
		})
		c.Cookie(&fiber.Cookie{
			Name:     "refresh_token",
			Value:    tokens.RefreshToken,
			Expires:  time.Now().Add(7 * 24 * time.Hour),
			HTTPOnly: true,
			Secure:   isProd,
			SameSite: "Lax",
			Path:     "/",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สมัครสมาชิกนักเรียนสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ",
		"data": fiber.Map{
			"user": fiber.Map{
				"id":          user.ID,
				"email":       user.Email,
				"first_name":  user.FirstName,
				"last_name":   user.LastName,
				"role":        user.Role,
				"grade_level": user.GradeLevel,
				"classroom":   user.Classroom,
				"created_at":  user.CreatedAt,
			},
		},
	})
}

// Login authenticates a user and returns JWT tokens & sets cookies
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง",
		})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน",
		})
	}

	// 1. Find user by email
	var user models.User
	if err := h.db.DB.Where("LOWER(email) = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
		})
	}

	// 2. Verify password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
		})
	}

	// 3. Generate JWT Tokens
	tokens, err := utils.GenerateTokenPair(&user, h.cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการสร้างสิทธิ์เข้าใช้งาน",
		})
	}

	// 4. Set HttpOnly Cookies
	isProd := h.cfg.AppEnv == "production"

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    tokens.AccessToken,
		Expires:  time.Now().Add(2 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "เข้าสู่ระบบสำเร็จ",
		"data": fiber.Map{
			"user": fiber.Map{
				"id":          user.ID,
				"email":       user.Email,
				"first_name":  user.FirstName,
				"last_name":   user.LastName,
				"role":        user.Role,
				"grade_level": user.GradeLevel,
				"classroom":   user.Classroom,
				"created_at":  user.CreatedAt,
			},
			"tokens": tokens,
		},
	})
}

// Logout clears the auth cookies
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "ออกจากระบบสำเร็จ",
	})
}

// RefreshToken exchanges a valid refresh token for a new access token
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		type refreshReq struct {
			RefreshToken string `json:"refresh_token"`
		}
		var req refreshReq
		if err := c.BodyParser(&req); err == nil && req.RefreshToken != "" {
			refreshToken = req.RefreshToken
		}
	}

	if refreshToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบ Refresh Token กรุณาเข้าสู่ระบบใหม่",
		})
	}

	claims, err := utils.ValidateToken(refreshToken, h.cfg.JWTSecret)
	if err != nil || claims.TokenType != "refresh" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Refresh Token หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งานในระบบ",
		})
	}

	// Generate new token pair
	tokens, err := utils.GenerateTokenPair(&user, h.cfg.JWTSecret)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการต่ออายุการเข้าใช้งาน",
		})
	}

	isProd := h.cfg.AppEnv == "production"

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    tokens.AccessToken,
		Expires:  time.Now().Add(2 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "ต่ออายุ Token สำเร็จ",
		"data": fiber.Map{
			"tokens": tokens,
		},
	})
}

// Me returns the authenticated user's current data
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบข้อมูลการเข้าสู่ระบบ",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งาน",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":          user.ID,
			"email":       user.Email,
			"first_name":  user.FirstName,
			"last_name":   user.LastName,
			"role":        user.Role,
			"grade_level": user.GradeLevel,
			"classroom":   user.Classroom,
			"created_at":  user.CreatedAt,
		},
	})
}
