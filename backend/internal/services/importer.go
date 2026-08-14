package services

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/mail"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/models"
	"tunorth-hub-backend/internal/utils"
)

type ImportRowError struct {
	Row   int    `json:"row"`
	Email string `json:"email"`
	Error string `json:"error"`
}

type ImportResult struct {
	Total    int              `json:"total"`
	Imported int              `json:"imported"`
	Failed   int              `json:"failed"`
	Errors   []ImportRowError `json:"errors"`
}

type RawUserRow struct {
	RowNumber  int
	Email      string
	Password   string
	FirstName  string
	LastName   string
	Role       string
	GradeLevel string
	Classroom  string
}

// ParseUserFile parses a CSV or Excel file reader and returns normalized RawUserRow items
func ParseUserFile(filename string, r io.Reader) ([]RawUserRow, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return parseCSV(r)
	case ".xlsx", ".xls":
		return parseExcel(r)
	default:
		return nil, errors.New("รองรับเฉพาะไฟล์นามสกุล .csv และ .xlsx เท่านั้น")
	}
}

func parseCSV(r io.Reader) ([]RawUserRow, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1 // Allow variable fields per record

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถอ่านไฟล์ CSV ได้: %v", err)
	}

	if len(records) < 2 {
		return nil, errors.New("ไฟล์ CSV ไม่มีข้อมูลหรือไม่มีหัวตาราง (Header)")
	}

	headerMap := mapHeaders(records[0])
	var rows []RawUserRow

	for i, record := range records[1:] {
		rowNum := i + 2 // 1-indexed, header is row 1
		if isEmptyRow(record) {
			continue
		}

		rows = append(rows, extractRow(rowNum, record, headerMap))
	}

	return rows, nil
}

func parseExcel(r io.Reader) ([]RawUserRow, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถอ่านไฟล์ Excel ได้: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("ไฟล์ Excel ไม่มี Sheet ข้อมูล")
	}

	records, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("เกิดข้อผิดพลาดในการดึงข้อมูลจาก Excel Sheet: %v", err)
	}

	if len(records) < 2 {
		return nil, errors.New("ไฟล์ Excel ไม่มีข้อมูลหรือไม่มีหัวตาราง (Header)")
	}

	headerMap := mapHeaders(records[0])
	var rows []RawUserRow

	for i, record := range records[1:] {
		rowNum := i + 2
		if isEmptyRow(record) {
			continue
		}

		rows = append(rows, extractRow(rowNum, record, headerMap))
	}

	return rows, nil
}

func mapHeaders(headers []string) map[string]int {
	m := make(map[string]int)
	for idx, h := range headers {
		clean := strings.ToLower(strings.TrimSpace(h))
		clean = strings.ReplaceAll(clean, " ", "_")
		clean = strings.ReplaceAll(clean, "-", "_")

		switch clean {
		case "email", "อีเมล", "e_mail":
			m["email"] = idx
		case "password", "รหัสผ่าน", "pass":
			m["password"] = idx
		case "first_name", "firstname", "ชื่อ", "ชื่อจริง":
			m["first_name"] = idx
		case "last_name", "lastname", "นามสกุล":
			m["last_name"] = idx
		case "role", "บทบาท", "ตำแหน่ง":
			m["role"] = idx
		case "grade_level", "grade", "level", "ชั้น", "ระดับชั้น":
			m["grade_level"] = idx
		case "classroom", "class", "room", "ห้อง", "ห้องเรียน":
			m["classroom"] = idx
		}
	}
	return m
}

func extractRow(rowNum int, record []string, headerMap map[string]int) RawUserRow {
	getVal := func(key string) string {
		if idx, ok := headerMap[key]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	return RawUserRow{
		RowNumber:  rowNum,
		Email:      getVal("email"),
		Password:   getVal("password"),
		FirstName:  getVal("first_name"),
		LastName:   getVal("last_name"),
		Role:       getVal("role"),
		GradeLevel: getVal("grade_level"),
		Classroom:  getVal("classroom"),
	}
}

func isEmptyRow(record []string) bool {
	for _, val := range record {
		if strings.TrimSpace(val) != "" {
			return false
		}
	}
	return true
}

func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil && strings.Contains(email, "@") && strings.Contains(email, ".")
}

// ProcessBatchUserImport validates and inserts rows into DB in batches
func ProcessBatchUserImport(db *gorm.DB, rawRows []RawUserRow) (*ImportResult, error) {
	result := &ImportResult{
		Total:    len(rawRows),
		Imported: 0,
		Failed:   0,
		Errors:   make([]ImportRowError, 0),
	}

	if len(rawRows) == 0 {
		return result, nil
	}

	// 1. Collect all existing emails in DB for fast duplicate lookup
	var existingEmails []string
	if err := db.Model(&models.User{}).Pluck("LOWER(email)", &existingEmails).Error; err != nil {
		return nil, fmt.Errorf("failed to query existing users: %v", err)
	}

	existingEmailSet := make(map[string]bool, len(existingEmails))
	for _, e := range existingEmails {
		existingEmailSet[strings.ToLower(e)] = true
	}

	// Track emails processed in this batch to prevent internal duplicates
	batchEmailSet := make(map[string]bool)

	// Pre-generate default password hash to speed up processing for large batches
	defaultHash, err := utils.HashPassword("Password123!")
	if err != nil {
		return nil, err
	}

	passwordCache := make(map[string]string)
	passwordCache["Password123!"] = defaultHash

	var usersToInsert []models.User

	for _, row := range rawRows {
		// Validations
		row.Email = strings.ToLower(strings.TrimSpace(row.Email))
		if row.Email == "" {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: "อีเมลว่างเปล่า (Email is required)",
			})
			continue
		}

		if !isValidEmail(row.Email) {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: fmt.Sprintf("รูปแบบอีเมลไม่ถูกต้อง: %s", row.Email),
			})
			continue
		}

		if existingEmailSet[row.Email] {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: fmt.Sprintf("อีเมล %s มีอยู่ในระบบแล้ว (Duplicate in DB)", row.Email),
			})
			continue
		}

		if batchEmailSet[row.Email] {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: fmt.Sprintf("อีเมล %s ซ้ำซ้อนภายในไฟล์เดียวกัน (Duplicate in file)", row.Email),
			})
			continue
		}

		if row.FirstName == "" {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: "กรุณาระบุชื่อจริง (First name is required)",
			})
			continue
		}

		if row.LastName == "" {
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: "กรุณาระบุนามสกุล (Last name is required)",
			})
			continue
		}

		// Normalize Role
		normalizedRole := models.RoleStudent
		roleUpper := strings.ToUpper(strings.TrimSpace(row.Role))
		switch roleUpper {
		case "ADMIN", "ผู้ดูแลระบบ":
			normalizedRole = models.RoleAdmin
		case "TEACHER", "ครู", "อาจารย์":
			normalizedRole = models.RoleTeacher
		case "STUDENT", "นักเรียน", "":
			normalizedRole = models.RoleStudent
		default:
			result.Failed++
			result.Errors = append(result.Errors, ImportRowError{
				Row:   row.RowNumber,
				Email: row.Email,
				Error: fmt.Sprintf("บทบาท '%s' ไม่ถูกต้อง (ต้องเป็น STUDENT, TEACHER หรือ ADMIN)", row.Role),
			})
			continue
		}

		// Hash Password
		pw := row.Password
		if pw == "" {
			pw = "Password123!"
		}

		var pwHash string
		if cached, ok := passwordCache[pw]; ok {
			pwHash = cached
		} else {
			h, err := utils.HashPassword(pw)
			if err != nil {
				result.Failed++
				result.Errors = append(result.Errors, ImportRowError{
					Row:   row.RowNumber,
					Email: row.Email,
					Error: "ไม่สามารถเข้ารหัสรหัสผ่านได้",
				})
				continue
			}
			passwordCache[pw] = h
			pwHash = h
		}

		// Optional fields
		var gradePtr *string
		if row.GradeLevel != "" {
			g := row.GradeLevel
			gradePtr = &g
		}

		var classPtr *string
		if row.Classroom != "" {
			c := row.Classroom
			classPtr = &c
		}

		batchEmailSet[row.Email] = true
		usersToInsert = append(usersToInsert, models.User{
			ID:           uuid.New(),
			Email:        row.Email,
			PasswordHash: pwHash,
			FirstName:    row.FirstName,
			LastName:     row.LastName,
			Role:         normalizedRole,
			GradeLevel:   gradePtr,
			Classroom:    classPtr,
		})
	}

	// Batch insert into DB using chunks of 200
	if len(usersToInsert) > 0 {
		if err := db.CreateInBatches(usersToInsert, 200).Error; err != nil {
			return nil, fmt.Errorf("เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้ลงฐานข้อมูล: %v", err)
		}
		result.Imported = len(usersToInsert)
	}

	return result, nil
}
