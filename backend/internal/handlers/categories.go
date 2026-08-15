package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/models"
)

type CategoryHandler struct {
	db *database.Database
}

func NewCategoryHandler(db *database.Database) *CategoryHandler {
	return &CategoryHandler{db: db}
}

type CategoryResponseItem struct {
	models.CourseCategory
	CoursesCount int64 `json:"courses_count"`
}

// ListCategories returns all course categories with courses count
func (h *CategoryHandler) ListCategories(c *fiber.Ctx) error {
	var categories []models.CourseCategory
	if err := h.db.DB.Order("order_index ASC, created_at ASC").Find(&categories).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถดึงข้อมูลหมวดหมู่รายวิชาได้",
			"error":   err.Error(),
		})
	}

	results := make([]CategoryResponseItem, len(categories))
	for i, cat := range categories {
		var courseCount int64
		h.db.DB.Model(&models.Course{}).Where("category_id = ?", cat.ID).Count(&courseCount)
		results[i] = CategoryResponseItem{
			CourseCategory: cat,
			CoursesCount:   courseCount,
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

type CreateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	OrderIndex  int    `json:"order_index"`
}

// CreateCategory creates a new course category (Admin only)
func (h *CategoryHandler) CreateCategory(c *fiber.Ctx) error {
	var req CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "กรุณากรอกชื่อหมวดหมู่รายวิชา",
		})
	}

	// Check for duplicate name
	var existing models.CourseCategory
	if err := h.db.DB.Where("LOWER(name) = LOWER(?)", req.Name).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "มีหมวดหมู่ชื่อนี้อยู่ในระบบแล้ว",
		})
	}

	color := strings.TrimSpace(req.Color)
	if color == "" {
		color = "#2563eb"
	}

	orderIndex := req.OrderIndex
	if orderIndex <= 0 {
		var maxOrder struct {
			MaxIndex int
		}
		h.db.DB.Model(&models.CourseCategory{}).Select("COALESCE(MAX(order_index), 0) as max_index").Scan(&maxOrder)
		orderIndex = maxOrder.MaxIndex + 1
	}

	category := models.CourseCategory{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: strings.TrimSpace(req.Description),
		Color:       color,
		OrderIndex:  orderIndex,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.db.DB.Create(&category).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถสร้างหมวดหมู่รายวิชาได้",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "สร้างหมวดหมู่รายวิชาสำเร็จเรียบร้อย",
		"data":    category,
	})
}

type UpdateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	OrderIndex  *int   `json:"order_index,omitempty"`
}

// UpdateCategory updates an existing course category (Admin only)
func (h *CategoryHandler) UpdateCategory(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสหมวดหมู่ไม่ถูกต้อง",
		})
	}

	var category models.CourseCategory
	if err := h.db.DB.Where("id = ?", id).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "ไม่พบหมวดหมู่รายวิชานี้",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการค้นหาหมวดหมู่",
		})
	}

	var req UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name != "" && req.Name != category.Name {
		// Check for duplicate name
		var existing models.CourseCategory
		if err := h.db.DB.Where("LOWER(name) = LOWER(?) AND id != ?", req.Name, id).First(&existing).Error; err == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "มีหมวดหมู่ชื่อนี้อยู่ในระบบแล้ว",
			})
		}
		category.Name = req.Name
	}

	category.Description = strings.TrimSpace(req.Description)
	if req.Color != "" {
		category.Color = strings.TrimSpace(req.Color)
	}
	if req.OrderIndex != nil {
		category.OrderIndex = *req.OrderIndex
	}
	category.UpdatedAt = time.Now()

	if err := h.db.DB.Save(&category).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถอัปเดตหมวดหมู่รายวิชาได้",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "แก้ไขข้อมูลหมวดหมู่สำเร็จเรียบร้อย",
		"data":    category,
	})
}

// DeleteCategory deletes a course category (Admin only) and unlinks related courses
func (h *CategoryHandler) DeleteCategory(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "รหัสหมวดหมู่ไม่ถูกต้อง",
		})
	}

	var category models.CourseCategory
	if err := h.db.DB.Where("id = ?", id).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "ไม่พบหมวดหมู่รายวิชานี้",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "เกิดข้อผิดพลาดในการค้นหาหมวดหมู่",
		})
	}

	// Unlink category from all courses explicitly
	if err := h.db.DB.Model(&models.Course{}).Where("category_id = ?", id).Update("category_id", nil).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถปลดความสัมพันธ์คอร์สออกจากหมวดหมู่นี้ได้",
			"error":   err.Error(),
		})
	}

	// Delete category
	if err := h.db.DB.Delete(&category).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "ไม่สามารถลบหมวดหมู่รายวิชาได้",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ลบหมวดหมู่รายวิชาสำเร็จเรียบร้อย",
	})
}

// ReorderCategories reorders categories in bulk (Admin only)
func (h *CategoryHandler) ReorderCategories(c *fiber.Ctx) error {
	var items []ReorderItem
	if err := c.BodyParser(&items); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "ข้อมูลคำขอไม่ถูกต้อง",
		})
	}

	tx := h.db.DB.Begin()
	for _, item := range items {
		if err := tx.Model(&models.CourseCategory{}).Where("id = ?", item.ID).Update("order_index", item.OrderIndex).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "ไม่สามารถจัดเรียงลำดับหมวดหมู่ได้",
				"error":   err.Error(),
			})
		}
	}
	tx.Commit()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "บันทึกลำดับหมวดหมู่สำเร็จเรียบร้อย",
	})
}
