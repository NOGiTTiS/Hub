package services

import (
	"bytes"
	"strings"
	"testing"
)

func TestParseQuizCSV(t *testing.T) {
	csvContent := `คำถาม / Question,ประเภท / Type,ตัวเลือก 1 / Option A,ตัวเลือก 2 / Option B,ตัวเลือก 3 / Option C,ตัวเลือก 4 / Option D,เฉลย / Correct Answer,คะแนน / Points
ข้อที่หนึ่งคืออะไร,MULTIPLE_CHOICE,กอไก่,ขอไข่,คอควาย,งองู,กอไก่,2
Next.js คือ React Framework ใช่หรือไม่,TRUE_FALSE,จริง,เท็จ,,,A,1`

	rows, err := parseQuizCSV(strings.NewReader(csvContent))
	if err != nil {
		t.Fatalf("unexpected error parsing CSV: %v", err)
	}

	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}

	// Row 1
	if rows[0].QuestionText != "ข้อที่หนึ่งคืออะไร" {
		t.Errorf("expected question 'ข้อที่หนึ่งคืออะไร', got '%s'", rows[0].QuestionText)
	}
	if rows[0].Points != 2 {
		t.Errorf("expected 2 points, got %d", rows[0].Points)
	}
	if rows[0].OptionA != "กอไก่" {
		t.Errorf("expected OptionA 'กอไก่', got '%s'", rows[0].OptionA)
	}

	// Row 2
	if rows[1].QuestionType != "TRUE_FALSE" {
		t.Errorf("expected QuestionType 'TRUE_FALSE', got '%s'", rows[1].QuestionType)
	}
}

func TestResolveCorrectAnswer(t *testing.T) {
	options := []string{"Python", "JavaScript", "Go", "Rust"}

	// Test direct match
	ans, ok := resolveCorrectAnswer("Python", options, "MULTIPLE_CHOICE")
	if !ok || ans != "Python" {
		t.Errorf("expected 'Python', got '%s' (ok=%v)", ans, ok)
	}

	// Test case-insensitive direct match
	ans, ok = resolveCorrectAnswer("go", options, "MULTIPLE_CHOICE")
	if !ok || ans != "Go" {
		t.Errorf("expected 'Go', got '%s' (ok=%v)", ans, ok)
	}

	// Test choice alias A -> Index 0
	ans, ok = resolveCorrectAnswer("A", options, "MULTIPLE_CHOICE")
	if !ok || ans != "Python" {
		t.Errorf("expected 'Python' for choice A, got '%s' (ok=%v)", ans, ok)
	}

	// Test choice alias ก -> Index 0
	ans, ok = resolveCorrectAnswer("ก", options, "MULTIPLE_CHOICE")
	if !ok || ans != "Python" {
		t.Errorf("expected 'Python' for choice ก, got '%s' (ok=%v)", ans, ok)
	}

	// Test choice alias 3 -> Index 2
	ans, ok = resolveCorrectAnswer("3", options, "MULTIPLE_CHOICE")
	if !ok || ans != "Go" {
		t.Errorf("expected 'Go' for choice 3, got '%s' (ok=%v)", ans, ok)
	}

	// Test True/False aliases
	tfOptions := []string{"จริง", "เท็จ"}
	ans, ok = resolveCorrectAnswer("True", tfOptions, "TRUE_FALSE")
	if !ok || ans != "จริง" {
		t.Errorf("expected 'จริง' for 'True', got '%s' (ok=%v)", ans, ok)
	}

	ans, ok = resolveCorrectAnswer("เท็จ", tfOptions, "TRUE_FALSE")
	if !ok || ans != "เท็จ" {
		t.Errorf("expected 'เท็จ', got '%s' (ok=%v)", ans, ok)
	}

	// Test invalid choice
	_, ok = resolveCorrectAnswer("PHP", options, "MULTIPLE_CHOICE")
	if ok {
		t.Errorf("expected PHP to fail matching")
	}
}

func TestGenerateTemplates(t *testing.T) {
	// Test CSV Template
	csvBytes, err := GenerateQuizTemplateCSV()
	if err != nil {
		t.Fatalf("failed to generate CSV template: %v", err)
	}
	if len(csvBytes) == 0 {
		t.Errorf("CSV template should not be empty")
	}

	// Test Excel Template
	xlsxBytes, err := GenerateQuizTemplateXLSX()
	if err != nil {
		t.Fatalf("failed to generate XLSX template: %v", err)
	}
	if len(xlsxBytes) == 0 {
		t.Errorf("XLSX template should not be empty")
	}

	// Verify that the generated template can be parsed back
	rows, err := parseQuizExcel(bytes.NewReader(xlsxBytes))
	if err != nil {
		t.Fatalf("failed to parse generated XLSX template: %v", err)
	}
	if len(rows) != 3 {
		t.Errorf("expected 3 sample rows in generated XLSX template, got %d", len(rows))
	}

	// Test ParseQuizFile with XLSX
	fileRows, err := ParseQuizFile("quiz.xlsx", bytes.NewReader(xlsxBytes))
	if err != nil {
		t.Fatalf("ParseQuizFile failed on xlsx: %v", err)
	}
	if len(fileRows) != 3 {
		t.Errorf("expected 3 rows from ParseQuizFile, got %d", len(fileRows))
	}

	// Test ParseQuizFile with unsupported extension
	_, err = ParseQuizFile("quiz.pdf", bytes.NewReader(xlsxBytes))
	if err == nil {
		t.Errorf("expected error for unsupported extension .pdf")
	}
}

func TestValidationRules(t *testing.T) {
	// Test Empty Question
	csvEmptyQ := `คำถาม / Question,ประเภท / Type,ตัวเลือก 1 / Option A,ตัวเลือก 2 / Option B,เฉลย / Correct Answer,คะแนน / Points
,MULTIPLE_CHOICE,A,B,A,1`
	rows, err := parseQuizCSV(strings.NewReader(csvEmptyQ))
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected 1 raw row, got %d", len(rows))
	}

	// Test unmatchable correct answer resolution
	tfOptions := []string{"จริง", "เท็จ"}
	_, matched := resolveCorrectAnswer("อาจจะจริง", tfOptions, "TRUE_FALSE")
	if matched {
		t.Errorf("expected 'อาจจะจริง' not to match True/False options")
	}
}
