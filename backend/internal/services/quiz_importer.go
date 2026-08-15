package services

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/models"
)

type QuizImportRowError struct {
	Row      int    `json:"row"`
	Question string `json:"question,omitempty"`
	Error    string `json:"error"`
}

type QuizImportResult struct {
	Total    int                  `json:"total"`
	Imported int                  `json:"imported"`
	Failed   int                  `json:"failed"`
	Errors   []QuizImportRowError `json:"errors"`
}

type RawQuizQuestionRow struct {
	RowNumber     int
	QuestionText  string
	QuestionType  string
	OptionA       string
	OptionB       string
	OptionC       string
	OptionD       string
	CorrectAnswer string
	Points        int
}

// ParseQuizFile parses a CSV or Excel file reader and returns normalized RawQuizQuestionRow items
func ParseQuizFile(filename string, r io.Reader) ([]RawQuizQuestionRow, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return parseQuizCSV(r)
	case ".xlsx", ".xls":
		return parseQuizExcel(r)
	default:
		return nil, errors.New("รองรับเฉพาะไฟล์นามสกุล .csv และ .xlsx เท่านั้น")
	}
}

func parseQuizCSV(r io.Reader) ([]RawQuizQuestionRow, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถอ่านไฟล์ CSV ได้: %v", err)
	}

	if len(records) < 2 {
		return nil, errors.New("ไฟล์ CSV ไม่มีข้อมูลหรือไม่มีหัวตาราง (Header)")
	}

	headerMap := mapQuizHeaders(records[0])
	var rows []RawQuizQuestionRow

	for i, record := range records[1:] {
		rowNum := i + 2
		if isQuizEmptyRow(record) {
			continue
		}
		rows = append(rows, extractQuizRow(rowNum, record, headerMap))
	}

	return rows, nil
}

func parseQuizExcel(r io.Reader) ([]RawQuizQuestionRow, error) {
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

	headerMap := mapQuizHeaders(records[0])
	var rows []RawQuizQuestionRow

	for i, record := range records[1:] {
		rowNum := i + 2
		if isQuizEmptyRow(record) {
			continue
		}
		rows = append(rows, extractQuizRow(rowNum, record, headerMap))
	}

	return rows, nil
}

func mapQuizHeaders(headers []string) map[string]int {
	m := make(map[string]int)
	for idx, h := range headers {
		raw := strings.ToLower(strings.TrimSpace(h))
		// Remove special punctuation
		clean := strings.ReplaceAll(raw, "-", " ")
		clean = strings.ReplaceAll(clean, "/", " ")
		clean = strings.ReplaceAll(clean, ".", " ")
		clean = strings.ReplaceAll(clean, "_", " ")
		clean = strings.Join(strings.Fields(clean), " ") // collapse multiple spaces

		// Test tokens and phrases
		if strings.Contains(clean, "question") || strings.Contains(clean, "คำถาม") || strings.Contains(clean, "โจทย์") || strings.Contains(clean, "ข้อสอบ") {
			m["question"] = idx
		} else if strings.Contains(clean, "type") || strings.Contains(clean, "ประเภท") || strings.Contains(clean, "ชนิด") {
			m["type"] = idx
		} else if strings.Contains(clean, "option a") || strings.Contains(clean, "option 1") || strings.Contains(clean, "ตัวเลือก 1") || strings.Contains(clean, "ตัวเลือก ก") || strings.Contains(clean, "choice a") || strings.Contains(clean, "choice 1") || clean == "a" || clean == "ก" || clean == "1" {
			m["option_a"] = idx
		} else if strings.Contains(clean, "option b") || strings.Contains(clean, "option 2") || strings.Contains(clean, "ตัวเลือก 2") || strings.Contains(clean, "ตัวเลือก ข") || strings.Contains(clean, "choice b") || strings.Contains(clean, "choice 2") || clean == "b" || clean == "ข" || clean == "2" {
			m["option_b"] = idx
		} else if strings.Contains(clean, "option c") || strings.Contains(clean, "option 3") || strings.Contains(clean, "ตัวเลือก 3") || strings.Contains(clean, "ตัวเลือก ค") || strings.Contains(clean, "choice c") || strings.Contains(clean, "choice 3") || clean == "c" || clean == "ค" || clean == "3" {
			m["option_c"] = idx
		} else if strings.Contains(clean, "option d") || strings.Contains(clean, "option 4") || strings.Contains(clean, "ตัวเลือก 4") || strings.Contains(clean, "ตัวเลือก ง") || strings.Contains(clean, "choice d") || strings.Contains(clean, "choice 4") || clean == "d" || clean == "ง" || clean == "4" {
			m["option_d"] = idx
		} else if strings.Contains(clean, "correct") || strings.Contains(clean, "เฉลย") || strings.Contains(clean, "answer") || strings.Contains(clean, "คำตอบ") {
			m["correct_answer"] = idx
		} else if strings.Contains(clean, "point") || strings.Contains(clean, "คะแนน") || strings.Contains(clean, "score") {
			m["points"] = idx
		}
	}
	return m
}

func extractQuizRow(rowNum int, record []string, headerMap map[string]int) RawQuizQuestionRow {
	getVal := func(key string) string {
		if idx, ok := headerMap[key]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	pointsStr := getVal("points")
	points := 1
	if p, err := strconv.Atoi(pointsStr); err == nil && p > 0 {
		points = p
	}

	return RawQuizQuestionRow{
		RowNumber:     rowNum,
		QuestionText:  getVal("question"),
		QuestionType:  getVal("type"),
		OptionA:       getVal("option_a"),
		OptionB:       getVal("option_b"),
		OptionC:       getVal("option_c"),
		OptionD:       getVal("option_d"),
		CorrectAnswer: getVal("correct_answer"),
		Points:        points,
	}
}

func isQuizEmptyRow(record []string) bool {
	for _, val := range record {
		if strings.TrimSpace(val) != "" {
			return false
		}
	}
	return true
}

// ProcessBatchQuizImport validates and inserts rows into DB
func ProcessBatchQuizImport(db *gorm.DB, quizID uuid.UUID, rawRows []RawQuizQuestionRow, mode string) (*QuizImportResult, error) {
	result := &QuizImportResult{
		Total:    len(rawRows),
		Imported: 0,
		Failed:   0,
		Errors:   make([]QuizImportRowError, 0),
	}

	if len(rawRows) == 0 {
		return result, nil
	}

	var questionsToInsert []models.QuizQuestion

	for _, row := range rawRows {
		qText := strings.TrimSpace(row.QuestionText)
		if qText == "" {
			result.Errors = append(result.Errors, QuizImportRowError{
				Row:   row.RowNumber,
				Error: "เนื้อหาโจทย์ข้อสอบ (คำถาม) ต้องไม่เป็นค่าว่าง",
			})
			continue
		}

		// Normalize Question Type
		qType := strings.ToUpper(strings.TrimSpace(row.QuestionType))
		if qType == "" || qType == "ปรนัย" || strings.Contains(qType, "MULTIPLE") || qType == "MC" {
			qType = "MULTIPLE_CHOICE"
		} else if qType == "ถูกผิด" || qType == "ถูก/ผิด" || strings.Contains(qType, "TRUE") || strings.Contains(qType, "TF") {
			qType = "TRUE_FALSE"
		} else {
			qType = "MULTIPLE_CHOICE"
		}

		// Build options list
		var options []string
		if qType == "TRUE_FALSE" {
			optA := row.OptionA
			optB := row.OptionB
			if optA == "" && optB == "" {
				options = []string{"จริง", "เท็จ"}
			} else {
				if optA == "" {
					optA = "จริง"
				}
				if optB == "" {
					optB = "เท็จ"
				}
				options = []string{optA, optB}
			}
		} else {
			rawOptions := []string{row.OptionA, row.OptionB, row.OptionC, row.OptionD}
			for _, opt := range rawOptions {
				trimmed := strings.TrimSpace(opt)
				if trimmed != "" {
					options = append(options, trimmed)
				}
			}

			if len(options) < 2 {
				result.Errors = append(result.Errors, QuizImportRowError{
					Row:      row.RowNumber,
					Question: qText,
					Error:    "ข้อสอบปรนัยต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก",
				})
				continue
			}
		}

		// Resolve Correct Answer
		correctRaw := strings.TrimSpace(row.CorrectAnswer)
		if correctRaw == "" {
			result.Errors = append(result.Errors, QuizImportRowError{
				Row:      row.RowNumber,
				Question: qText,
				Error:    "กรุณาระบุเฉลยคำตอบ",
			})
			continue
		}

		resolvedAnswer, matched := resolveCorrectAnswer(correctRaw, options, qType)
		if !matched {
			result.Errors = append(result.Errors, QuizImportRowError{
				Row:      row.RowNumber,
				Question: qText,
				Error:    fmt.Sprintf("เฉลย '%s' ไม่ตรงกับตัวเลือกใดๆ (%s)", correctRaw, strings.Join(options, ", ")),
			})
			continue
		}

		optionsJSONBytes, _ := json.Marshal(options)

		points := row.Points
		if points <= 0 {
			points = 1
		}

		questionsToInsert = append(questionsToInsert, models.QuizQuestion{
			ID:            uuid.New(),
			QuizID:        quizID,
			QuestionText:  qText,
			QuestionType:  qType,
			OptionsJSON:   string(optionsJSONBytes),
			CorrectAnswer: resolvedAnswer,
			Points:        points,
		})
	}

	result.Failed = len(result.Errors)

	// If there are any validation errors, do not proceed with database insertion
	if len(result.Errors) > 0 {
		return result, nil
	}

	if len(questionsToInsert) == 0 {
		return result, nil
	}

	// Database Transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		if strings.ToLower(mode) == "replace" {
			if err := tx.Where("quiz_id = ?", quizID).Delete(&models.QuizQuestion{}).Error; err != nil {
				return fmt.Errorf("failed to clear existing questions: %v", err)
			}
		}

		if err := tx.CreateInBatches(questionsToInsert, 100).Error; err != nil {
			return fmt.Errorf("failed to insert quiz questions: %v", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	result.Imported = len(questionsToInsert)
	return result, nil
}

// resolveCorrectAnswer matches raw answer key (A, B, C, D / ก, ข, ค, ง / 1, 2, 3, 4 / Direct text) to actual option
func resolveCorrectAnswer(rawAnswer string, options []string, qType string) (string, bool) {
	clean := strings.TrimSpace(rawAnswer)
	lowerClean := strings.ToLower(clean)

	// 1. Direct match with option text (exact or case-insensitive)
	for _, opt := range options {
		if strings.EqualFold(opt, clean) {
			return opt, true
		}
	}

	// 2. TRUE_FALSE special aliases
	if qType == "TRUE_FALSE" && len(options) == 2 {
		if lowerClean == "t" || lowerClean == "true" || lowerClean == "จริง" || lowerClean == "ถูก" || lowerClean == "ใช่" || lowerClean == "1" || lowerClean == "a" || lowerClean == "ก" {
			return options[0], true
		}
		if lowerClean == "f" || lowerClean == "false" || lowerClean == "เท็จ" || lowerClean == "ผิด" || lowerClean == "ไม่ใช่" || lowerClean == "2" || lowerClean == "b" || lowerClean == "ข" {
			return options[1], true
		}
	}

	// 3. Choice Index mapping (A/ก/1 -> index 0, B/ข/2 -> index 1, C/ค/3 -> index 2, D/ง/4 -> index 3)
	keyMap := map[string]int{
		"a": 0, "ก": 0, "1": 0,
		"b": 1, "ข": 1, "2": 1,
		"c": 2, "ค": 2, "3": 2,
		"d": 3, "ง": 3, "4": 3,
		"e": 4, "จ": 4, "5": 4,
	}

	if idx, ok := keyMap[lowerClean]; ok {
		if idx >= 0 && idx < len(options) {
			return options[idx], true
		}
	}

	return "", false
}

// GenerateQuizTemplateCSV creates a downloadable sample CSV template
func GenerateQuizTemplateCSV() ([]byte, error) {
	var buf bytes.Buffer
	// Add UTF-8 BOM for Excel Thai compatibility
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(&buf)

	header := []string{
		"คำถาม / Question",
		"ประเภท / Type",
		"ตัวเลือก 1 / Option A",
		"ตัวเลือก 2 / Option B",
		"ตัวเลือก 3 / Option C",
		"ตัวเลือก 4 / Option D",
		"เฉลย / Correct Answer",
		"คะแนน / Points",
	}
	if err := writer.Write(header); err != nil {
		return nil, err
	}

	sampleRows := [][]string{
		{
			"ภาษาโปรแกรมใดเหมาะสำหรับการพัฒนาฝั่ง Backend ประสิทธิภาพสูง?",
			"MULTIPLE_CHOICE",
			"Go (Golang)",
			"HTML",
			"CSS",
			"JSON",
			"A",
			"1",
		},
		{
			"คำสั่งใดใน Python ใช้สำหรับแสดงผลข้อความออกทางหน้าจอ?",
			"MULTIPLE_CHOICE",
			"echo()",
			"print()",
			"console.log()",
			"System.out.println()",
			"print()",
			"1",
		},
		{
			"Next.js เป็น React Framework ที่รองรับการประมวลผลทั้งแบบ Client และ Server",
			"TRUE_FALSE",
			"จริง",
			"เท็จ",
			"",
			"",
			"จริง",
			"1",
		},
	}

	for _, row := range sampleRows {
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	return buf.Bytes(), writer.Error()
}

// GenerateQuizTemplateXLSX creates a styled sample Excel (.xlsx) template
func GenerateQuizTemplateXLSX() ([]byte, error) {
	f := excelize.NewFile()
	sheetName := "Quiz_Template"
	defaultSheet := f.GetSheetName(0)
	f.SetSheetName(defaultSheet, sheetName)

	// Headers
	headers := []string{
		"คำถาม / Question",
		"ประเภท / Type",
		"ตัวเลือก 1 / Option A",
		"ตัวเลือก 2 / Option B",
		"ตัวเลือก 3 / Option C",
		"ตัวเลือก 4 / Option D",
		"เฉลย / Correct Answer",
		"คะแนน / Points",
	}

	// Header Style (Dark Blue with White Bold Text)
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Color:  "FFFFFF",
			Size:   11,
			Family: "Prompt",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"1E40AF"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
			WrapText:   true,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "CBD5E1", Style: 1},
			{Type: "top", Color: "CBD5E1", Style: 1},
			{Type: "bottom", Color: "CBD5E1", Style: 1},
			{Type: "right", Color: "CBD5E1", Style: 1},
		},
	})
	if err != nil {
		return nil, err
	}

	// Write Headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}

	// Sample Rows
	sampleRows := [][]interface{}{
		{
			"ภาษาโปรแกรมใดเหมาะสำหรับการพัฒนาฝั่ง Backend ประสิทธิภาพสูง?",
			"MULTIPLE_CHOICE",
			"Go (Golang)",
			"HTML",
			"CSS",
			"JSON",
			"A",
			1,
		},
		{
			"คำสั่งใดใน Python ใช้สำหรับแสดงผลข้อความออกทางหน้าจอ?",
			"MULTIPLE_CHOICE",
			"echo()",
			"print()",
			"console.log()",
			"System.out.println()",
			"print()",
			1,
		},
		{
			"Next.js เป็น React Framework ที่รองรับการประมวลผลทั้งแบบ Client และ Server",
			"TRUE_FALSE",
			"จริง",
			"เท็จ",
			"",
			"",
			"จริง",
			1,
		},
	}

	// Data Style
	dataStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Size:   10,
			Family: "Prompt",
		},
		Alignment: &excelize.Alignment{
			Vertical: "center",
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})
	if err != nil {
		return nil, err
	}

	for rIdx, row := range sampleRows {
		rowNum := rIdx + 2
		for cIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(cIdx+1, rowNum)
			f.SetCellValue(sheetName, cell, val)
			f.SetCellStyle(sheetName, cell, cell, dataStyle)
		}
	}

	// Adjust column widths
	colWidths := map[string]float64{
		"A": 45, // Question
		"B": 20, // Type
		"C": 22, // Option A
		"D": 22, // Option B
		"E": 22, // Option C
		"F": 22, // Option D
		"G": 24, // Correct Answer
		"H": 15, // Points
	}
	for col, width := range colWidths {
		f.SetColWidth(sheetName, col, col, width)
	}

	f.SetRowHeight(sheetName, 1, 30)
	for i := 2; i <= len(sampleRows)+1; i++ {
		f.SetRowHeight(sheetName, i, 24)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
