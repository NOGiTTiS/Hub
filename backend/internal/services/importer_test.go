package services_test

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/services"
	"tunorth-hub-backend/internal/utils"
)

// TestPasswordHashing verifies password hashing and verification
func TestPasswordHashing(t *testing.T) {
	password := "Password123!"
	hashed, err := utils.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if !utils.CheckPasswordHash(password, hashed) {
		t.Fatalf("Password check failed for correct password")
	}

	if utils.CheckPasswordHash("WrongPassword!", hashed) {
		t.Fatalf("Password check passed for wrong password")
	}
}

// TestJWTTokens verifies token generation and claim validation
func TestJWTTokens(t *testing.T) {
	secret := "test-secret-key-123456"
	grade := "M4"
	class := "1"
	user := models.User{
		ID:         uuid.New(),
		Email:      "test.student@tunorth.ac.th",
		FirstName:  "ทดสอบ",
		LastName:   "นักเรียน",
		Role:       models.RoleStudent,
		GradeLevel: &grade,
		Classroom:  &class,
	}

	pair, err := utils.GenerateTokenPair(&user, secret)
	if err != nil {
		t.Fatalf("GenerateTokenPair failed: %v", err)
	}

	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatalf("Token pair contains empty token")
	}

	// Validate Access Token
	claims, err := utils.ValidateToken(pair.AccessToken, secret)
	if err != nil {
		t.Fatalf("ValidateToken for access token failed: %v", err)
	}

	if claims.Email != user.Email || claims.Role != models.RoleStudent || claims.TokenType != "access" {
		t.Fatalf("Token claims mismatch: %+v", claims)
	}

	// Validate Refresh Token
	refreshClaims, err := utils.ValidateToken(pair.RefreshToken, secret)
	if err != nil {
		t.Fatalf("ValidateToken for refresh token failed: %v", err)
	}
	if refreshClaims.TokenType != "refresh" {
		t.Fatalf("Refresh token type mismatch")
	}
}

// TestParseCSV1000Users tests generating and parsing 1,000+ mock students from CSV
func TestParseCSV1000Users(t *testing.T) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write CSV Header
	_ = writer.Write([]string{"email", "password", "first_name", "last_name", "role", "grade_level", "classroom"})

	totalStudents := 1200
	grades := []string{"M4", "M5", "M6"}

	for i := 1; i <= totalStudents; i++ {
		grade := grades[(i-1)%len(grades)]
		classroom := fmt.Sprintf("%d", ((i-1)%10)+1)
		email := fmt.Sprintf("student.%s.%03d@tunorth.ac.th", strings.ToLower(grade), i)
		firstName := fmt.Sprintf("นักเรียน%d", i)
		lastName := fmt.Sprintf("นามสกุล%d", i)
		row := []string{email, "Password123!", firstName, lastName, "STUDENT", grade, classroom}
		_ = writer.Write(row)
	}
	writer.Flush()

	startTime := time.Now()
	rows, err := services.ParseUserFile("students_mock_1200.csv", &buf)
	duration := time.Since(startTime)

	if err != nil {
		t.Fatalf("ParseUserFile CSV failed: %v", err)
	}

	if len(rows) != totalStudents {
		t.Fatalf("Expected %d rows, got %d", totalStudents, len(rows))
	}

	t.Logf("✓ Successfully parsed %d CSV student accounts in %v (Categorized across M4, M5, M6 and Rooms 1-10)", len(rows), duration)
}

// TestParseExcelMockUsers tests parsing mock students from Excel (.xlsx)
func TestParseExcelMockUsers(t *testing.T) {
	f := excelize.NewFile()
	sheet := "Students"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"email", "password", "first_name", "last_name", "role", "grade_level", "classroom"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	totalStudents := 300
	for i := 1; i <= totalStudents; i++ {
		email := fmt.Sprintf("excel.student%d@tunorth.ac.th", i)
		row := []string{email, "Password123!", "นักเรียนเอกซ์เซล", fmt.Sprintf("คนที%d", i), "STUDENT", "M5", "2"}
		for colIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, i+1)
			f.SetCellValue(sheet, cell, val)
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatalf("Failed to write excel buffer: %v", err)
	}

	startTime := time.Now()
	rows, err := services.ParseUserFile("students_mock.xlsx", &buf)
	duration := time.Since(startTime)

	if err != nil {
		t.Fatalf("ParseUserFile Excel failed: %v", err)
	}

	if len(rows) != totalStudents {
		t.Fatalf("Expected %d rows, got %d", totalStudents, len(rows))
	}

	t.Logf("✓ Successfully parsed %d Excel student accounts in %v", len(rows), duration)
}
