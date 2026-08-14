package handlers

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/services"
	"tunorth-hub-backend/internal/utils"
)

type AdminUserHandler struct {
	db *database.Database
}

func NewAdminUserHandler(db *database.Database) *AdminUserHandler {
	return &AdminUserHandler{
		db: db,
	}
}

// ListUsers returns paginated, searchable and filterable list of users
func (h *AdminUserHandler) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit < 1 || limit > 200 {
		limit = 20
	}
	offset := (page - 1) * limit

	search := strings.TrimSpace(c.Query("search", ""))
	role := strings.TrimSpace(c.Query("role", ""))
	gradeLevel := strings.TrimSpace(c.Query("grade_level", ""))
	classroom := strings.TrimSpace(c.Query("classroom", ""))

	query := h.db.DB.Model(&models.User{})

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ?", s, s, s)
	}

	if role != "" {
		query = query.Where("role = ?", strings.ToUpper(role))
	}

	if gradeLevel != "" {
		query = query.Where("grade_level = ?", gradeLevel)
	}

	if classroom != "" {
		query = query.Where("classroom = ?", classroom)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้",
		})
	}

	var users []models.User
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
		})
	}

	totalPages := (int(total) + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"users":       users,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

type CreateUserRequest struct {
	Email      string      `json:"email"`
	Password   string      `json:"password"`
	FirstName  string      `json:"first_name"`
	LastName   string      `json:"last_name"`
	Role       models.Role `json:"role"`
	GradeLevel *string     `json:"grade_level"`
	Classroom  *string     `json:"classroom"`
}

// CreateUser adds a new user manually
func (h *AdminUserHandler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.Email == "" || req.FirstName == "" || req.LastName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกอีเมล ชื่อ และนามสกุลให้ครบถ้วน",
		})
	}

	if req.Role == "" {
		req.Role = models.RoleStudent
	}

	if req.Password == "" {
		req.Password = "Password123!"
	}

	// Check email uniqueness
	var count int64
	h.db.DB.Model(&models.User{}).Where("LOWER(email) = ?", req.Email).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "อีเมลนี้มีอยู่ในระบบแล้ว",
		})
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถเข้ารหัสรหัสผ่านได้",
		})
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		GradeLevel:   req.GradeLevel,
		Classroom:    req.Classroom,
	}

	if err := h.db.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างบัญชีผู้ใช้สำเร็จ",
		"data":    user,
	})
}

type UpdateUserRequest struct {
	Email      string      `json:"email"`
	Password   string      `json:"password,omitempty"`
	FirstName  string      `json:"first_name"`
	LastName   string      `json:"last_name"`
	Role       models.Role `json:"role"`
	GradeLevel *string     `json:"grade_level"`
	Classroom  *string     `json:"classroom"`
}

// UpdateUser edits existing user info
func (h *AdminUserHandler) UpdateUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสผู้ใช้งานไม่ถูกต้อง (Invalid UUID)",
		})
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "ไม่พบบัญชีผู้ใช้งาน",
		})
	}

	// Email check
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	if cleanEmail != "" && cleanEmail != strings.ToLower(user.Email) {
		var count int64
		h.db.DB.Model(&models.User{}).Where("LOWER(email) = ? AND id != ?", cleanEmail, userID).Count(&count)
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว",
			})
		}
		user.Email = cleanEmail
	}

	if req.FirstName != "" {
		user.FirstName = strings.TrimSpace(req.FirstName)
	}
	if req.LastName != "" {
		user.LastName = strings.TrimSpace(req.LastName)
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	user.GradeLevel = req.GradeLevel
	user.Classroom = req.Classroom

	if strings.TrimSpace(req.Password) != "" {
		pwHash, err := utils.HashPassword(strings.TrimSpace(req.Password))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถเปลี่ยนรหัสผ่านได้",
			})
		}
		user.PasswordHash = pwHash
	}

	if err := h.db.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว",
		"data":    user,
	})
}

// DeleteUser removes a user from DB
func (h *AdminUserHandler) DeleteUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสผู้ใช้งานไม่ถูกต้อง",
		})
	}

	currentAdmin := middleware.GetCurrentUser(c)
	if currentAdmin != nil && currentAdmin.UserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบบัญชีผู้ดูแลระบบของตนเองได้",
		})
	}

	if err := h.db.DB.Delete(&models.User{}, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "ลบบัญชีผู้ใช้สำเร็จ",
	})
}

// BatchImport handles uploading and processing a CSV or XLSX user list
func (h *AdminUserHandler) BatchImport(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณาแนบไฟล์ .csv หรือ .xlsx สำหรับการนำเข้า",
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถเปิดไฟล์ที่อัปโหลดได้",
		})
	}
	defer file.Close()

	// Parse rows from file
	rawRows, err := services.ParseUserFile(fileHeader.Filename, file)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	// Process and insert
	result, err := services.ProcessBatchUserImport(h.db.DB, rawRows)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("ประมวลผลเสร็จสิ้น: นำเข้าสำเร็จ %d บัญชี, ล้มเหลว %d บัญชี จากทั้งหมด %d แถว", result.Imported, result.Failed, result.Total),
		"data":    result,
	})
}

// DownloadTemplate produces a downloadable CSV or Excel template
func (h *AdminUserHandler) DownloadTemplate(c *fiber.Ctx) error {
	format := strings.ToLower(c.Query("format", "csv"))

	if format == "xlsx" {
		f := excelize.NewFile()
		sheet := "UsersTemplate"
		f.SetSheetName("Sheet1", sheet)

		headers := []string{"email", "password", "first_name", "last_name", "role", "grade_level", "classroom"}
		for colIdx, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
			f.SetCellValue(sheet, cell, h)
		}

		// Sample rows
		sample1 := []string{"student.m4.01@tunorth.ac.th", "Password123!", "สมชาย", "รักดี", "STUDENT", "M4", "1"}
		sample2 := []string{"teacher.cs@tunorth.ac.th", "Password123!", "อรทัย", "สอนดี", "TEACHER", "", ""}
		for colIdx, val := range sample1 {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, 2)
			f.SetCellValue(sheet, cell, val)
		}
		for colIdx, val := range sample2 {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, 3)
			f.SetCellValue(sheet, cell, val)
		}

		var buf bytes.Buffer
		if err := f.Write(&buf); err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Error generating Excel template")
		}

		c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Set("Content-Disposition", "attachment; filename=tunorth_user_template.xlsx")
		return c.Send(buf.Bytes())
	}

	// CSV Template default
	csvContent := "email,password,first_name,last_name,role,grade_level,classroom\n" +
		"student.m4.01@tunorth.ac.th,Password123!,สมชาย,รักดี,STUDENT,M4,1\n" +
		"teacher.cs@tunorth.ac.th,Password123!,อรทัย,สอนดี,TEACHER,,\n"

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=tunorth_user_template.csv")
	return c.SendString(csvContent)
}

// GetUserStats returns summary counts for admin dashboard
func (h *AdminUserHandler) GetUserStats(c *fiber.Ctx) error {
	var totalUsers int64
	var totalStudents int64
	var totalTeachers int64
	var totalAdmins int64

	h.db.DB.Model(&models.User{}).Count(&totalUsers)
	h.db.DB.Model(&models.User{}).Where("role = ?", models.RoleStudent).Count(&totalStudents)
	h.db.DB.Model(&models.User{}).Where("role = ?", models.RoleTeacher).Count(&totalTeachers)
	h.db.DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&totalAdmins)

	// Breakdown by Grade Level for students
	type GradeCount struct {
		GradeLevel string `json:"grade_level"`
		Count      int64  `json:"count"`
	}
	var gradeCounts []GradeCount
	h.db.DB.Model(&models.User{}).
		Select("COALESCE(grade_level, 'Unassigned') as grade_level, count(*) as count").
		Where("role = ?", models.RoleStudent).
		Group("grade_level").
		Order("grade_level ASC").
		Scan(&gradeCounts)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"total_users":    totalUsers,
			"total_students": totalStudents,
			"total_teachers": totalTeachers,
			"total_admins":   totalAdmins,
			"grade_counts":   gradeCounts,
		},
	})
}
