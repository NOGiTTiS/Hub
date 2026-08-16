package services

import (
	"strings"
	"testing"
)

func TestExtractJSONBlock(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{
			input:    `{"quiz_title": "Test"}`,
			expected: `{"quiz_title": "Test"}`,
		},
		{
			input:    "```json\n{\"quiz_title\": \"Test\"}\n```",
			expected: `{"quiz_title": "Test"}`,
		},
		{
			input:    "```\n{\"quiz_title\": \"Test\"}\n```",
			expected: `{"quiz_title": "Test"}`,
		},
	}

	for _, c := range cases {
		out := extractJSONBlock(c.input)
		if out != c.expected {
			t.Errorf("extractJSONBlock(%q) = %q, expected %q", c.input, out, c.expected)
		}
	}
}

func TestNormalizeAIQuestion_MultipleChoice(t *testing.T) {
	q := AIQuizQuestionItem{
		QuestionText:  "ภาษา Python ใช้คำสั่งใดแสดงผล?",
		QuestionType:  "MULTIPLE_CHOICE",
		Options:       []string{"print()", "echo", "System.out.println()", "printf()"},
		CorrectAnswer: "print()",
		Points:        1,
		Explanation:   "print() เป็นคำสั่งแสดงผลมาตรฐานใน Python",
	}

	normalized := normalizeAIQuestion(q)
	if normalized == nil {
		t.Fatalf("expected normalized question, got nil")
	}
	if normalized.CorrectAnswer != "print()" {
		t.Errorf("expected correct_answer print(), got %s", normalized.CorrectAnswer)
	}
	if len(normalized.Options) != 4 {
		t.Errorf("expected 4 options, got %d", len(normalized.Options))
	}
}

func TestNormalizeAIQuestion_IndexMatching(t *testing.T) {
	// AI returns "A" or "ก" or "1" for correct answer
	q := AIQuizQuestionItem{
		QuestionText:  "HTML คืออะไร?",
		QuestionType:  "MULTIPLE_CHOICE",
		Options:       []string{"Hypertext Markup Language", "High Text Machine Learning", "Home Tool Markup", "None"},
		CorrectAnswer: "A",
		Points:        2,
	}

	normalized := normalizeAIQuestion(q)
	if normalized == nil {
		t.Fatalf("expected normalized question, got nil")
	}
	if normalized.CorrectAnswer != "Hypertext Markup Language" {
		t.Errorf("expected correct answer to match option A 'Hypertext Markup Language', got %s", normalized.CorrectAnswer)
	}
	if normalized.Points != 2 {
		t.Errorf("expected points 2, got %d", normalized.Points)
	}
}

func TestNormalizeAIQuestion_TrueFalse(t *testing.T) {
	q := AIQuizQuestionItem{
		QuestionText:  "Python เป็นภาษาแบบ Interpreted",
		QuestionType:  "TRUE_FALSE",
		Options:       []string{"จริง", "เท็จ"},
		CorrectAnswer: "True",
		Points:        0, // Should fallback to 1
	}

	normalized := normalizeAIQuestion(q)
	if normalized == nil {
		t.Fatalf("expected normalized question, got nil")
	}
	if normalized.QuestionType != "TRUE_FALSE" {
		t.Errorf("expected TRUE_FALSE, got %s", normalized.QuestionType)
	}
	if normalized.CorrectAnswer != "จริง" {
		t.Errorf("expected correct answer 'จริง', got %s", normalized.CorrectAnswer)
	}
	if normalized.Points != 1 {
		t.Errorf("expected fallback points 1, got %d", normalized.Points)
	}
}

func TestCleanHTMLToText(t *testing.T) {
	htmlInput := `
		<h1>หัวข้อบทเรียน</h1>
		<p>นี่คือเนื้อหาที่มี <strong>ตัวหนา</strong> และ <a href="https://example.com">ลิงก์</a></p>
		<ul>
			<li>ข้อที่ 1: ตัวแปร int</li>
			<li>ข้อที่ 2: ตัวแปร string</li>
		</ul>
		<script>alert('test');</script>
		<style>body { color: red; }</style>
	`
	text := CleanHTMLToText(htmlInput)
	if strings.Contains(text, "<h1>") || strings.Contains(text, "<script>") || strings.Contains(text, "alert") {
		t.Errorf("CleanHTMLToText contains HTML tags or scripts: %s", text)
	}
	if !strings.Contains(text, "หัวข้อบทเรียน") || !strings.Contains(text, "ตัวแปร int") {
		t.Errorf("CleanHTMLToText missed core textual content: %s", text)
	}
}

