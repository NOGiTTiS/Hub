package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleStudent Role = "STUDENT"
	RoleTeacher Role = "TEACHER"
	RoleAdmin   Role = "ADMIN"
)

type ContentType string

const (
	ContentTypeVideoUpload ContentType = "VIDEO_UPLOAD"
	ContentTypeVideoEmbed  ContentType = "VIDEO_EMBED"
	ContentTypeSlidePDF    ContentType = "SLIDE_PDF"
	ContentTypeCodeLab     ContentType = "CODE_LAB"
	ContentTypeText        ContentType = "TEXT"
)

type SubmissionStatus string

const (
	SubmissionStatusSubmitted SubmissionStatus = "SUBMITTED"
	SubmissionStatusGraded    SubmissionStatus = "GRADED"
)

// User represents the users table
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FirstName    string    `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName     string    `gorm:"type:varchar(100);not null" json:"last_name"`
	Role         Role      `gorm:"type:varchar(20);not null;default:'STUDENT'" json:"role"`
	GradeLevel   *string   `gorm:"type:varchar(20)" json:"grade_level,omitempty"`
	Classroom    *string   `gorm:"type:varchar(20)" json:"classroom,omitempty"`
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Courses     []Course     `gorm:"foreignKey:TeacherID" json:"courses,omitempty"`
	Enrollments []Enrollment `gorm:"foreignKey:StudentID" json:"enrollments,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return
}

// CourseCategory represents the course_categories table
type CourseCategory struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description,omitempty"`
	Color       string    `gorm:"type:varchar(50);default:'#2563eb'" json:"color,omitempty"`
	OrderIndex  int       `gorm:"not null;default:0" json:"order_index"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Courses []Course `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"courses,omitempty"`
}

func (cc *CourseCategory) BeforeCreate(tx *gorm.DB) (err error) {
	if cc.ID == uuid.Nil {
		cc.ID = uuid.New()
	}
	return
}

// Course represents the courses table
type Course struct {
	ID            uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title         string          `gorm:"type:varchar(255);not null" json:"title"`
	Description   string          `gorm:"type:text" json:"description"`
	CoverImageURL string          `gorm:"type:varchar(500)" json:"cover_image_url"`
	TeacherID     uuid.UUID       `gorm:"type:uuid;not null;index" json:"teacher_id"`
	Teacher       *User           `gorm:"foreignKey:TeacherID;constraint:OnDelete:CASCADE" json:"teacher,omitempty"`
	CategoryID    *uuid.UUID      `gorm:"type:uuid;index" json:"category_id,omitempty"`
	Category      *CourseCategory `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"category,omitempty"`
	IsPublished   bool            `gorm:"default:false" json:"is_published"`
	CreatedAt     time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time       `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Modules     []Module     `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"modules,omitempty"`
	Enrollments []Enrollment `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"enrollments,omitempty"`
}

func (c *Course) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// Module represents the modules table
type Module struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CourseID   uuid.UUID `gorm:"type:uuid;not null;index" json:"course_id"`
	Title      string    `gorm:"type:varchar(255);not null" json:"title"`
	OrderIndex int       `gorm:"not null;default:0" json:"order_index"`

	Lessons []Lesson `gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE" json:"lessons,omitempty"`
}

func (m *Module) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return
}

// Lesson represents the lessons table
type Lesson struct {
	ID          uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ModuleID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"module_id"`
	Title       string      `gorm:"type:varchar(255);not null" json:"title"`
	ContentType ContentType `gorm:"type:varchar(30);not null;default:'TEXT'" json:"content_type"`
	VideoURL    string      `gorm:"type:varchar(500)" json:"video_url,omitempty"`
	EmbedURL    string      `gorm:"type:varchar(500)" json:"embed_url,omitempty"`
	PDFURL      string      `gorm:"type:varchar(500)" json:"pdf_url,omitempty"`
	BodyText    string      `gorm:"type:text" json:"body_text,omitempty"`
	OrderIndex  int         `gorm:"not null;default:0" json:"order_index"`

	Assignments []Assignment `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"assignments,omitempty"`
	Quizzes     []Quiz       `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"quizzes,omitempty"`
}

func (l *Lesson) BeforeCreate(tx *gorm.DB) (err error) {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return
}

// Assignment represents the assignments table
type Assignment struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	LessonID     uuid.UUID `gorm:"type:uuid;not null;index" json:"lesson_id"`
	Title        string    `gorm:"type:varchar(255);not null" json:"title"`
	Instructions string    `gorm:"type:text;not null" json:"instructions"`
	MaxScore     int       `gorm:"not null;default:100" json:"max_score"`
	DueDate      *time.Time `gorm:"type:timestamptz" json:"due_date,omitempty"`
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	Submissions []Submission `gorm:"foreignKey:AssignmentID;constraint:OnDelete:CASCADE" json:"submissions,omitempty"`
}

func (a *Assignment) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}

// Submission represents the submissions table
type Submission struct {
	ID            uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AssignmentID  uuid.UUID        `gorm:"type:uuid;not null;index" json:"assignment_id"`
	StudentID     uuid.UUID        `gorm:"type:uuid;not null;index" json:"student_id"`
	Student       *User            `gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE" json:"student,omitempty"`
	FileURL       string           `gorm:"type:varchar(500)" json:"file_url,omitempty"`
	SubmittedText string           `gorm:"type:text" json:"submitted_text,omitempty"`
	Score         *int             `json:"score,omitempty"`
	Feedback      string           `gorm:"type:text" json:"feedback,omitempty"`
	Status        SubmissionStatus `gorm:"type:varchar(20);default:'SUBMITTED'" json:"status"`
	SubmittedAt   time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP" json:"submitted_at"`
}

func (s *Submission) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}

// Quiz represents the quizzes table
type Quiz struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	LessonID         uuid.UUID `gorm:"type:uuid;not null;index" json:"lesson_id"`
	Title            string    `gorm:"type:varchar(255);not null" json:"title"`
	TimeLimitMinutes int       `gorm:"not null;default:30" json:"time_limit_minutes"`
	PassingScore     int       `gorm:"not null;default:60" json:"passing_score"`
	MaxAttempts      int       `gorm:"not null;default:0" json:"max_attempts"` // 0 = unlimited

	Questions []QuizQuestion `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
	Attempts  []QuizAttempt  `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"attempts,omitempty"`
}

func (q *Quiz) BeforeCreate(tx *gorm.DB) (err error) {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return
}

// QuizQuestion represents the quiz_questions table
type QuizQuestion struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID        uuid.UUID `gorm:"type:uuid;not null;index" json:"quiz_id"`
	QuestionText  string    `gorm:"type:text;not null" json:"question_text"`
	QuestionType  string    `gorm:"type:varchar(30);not null;default:'MULTIPLE_CHOICE'" json:"question_type"`
	OptionsJSON   string    `gorm:"type:jsonb;not null;default:'[]'" json:"options_json"`
	CorrectAnswer string    `gorm:"type:varchar(255);not null" json:"-"`
	Points        int       `gorm:"not null;default:1" json:"points"`
}

func (qq *QuizQuestion) BeforeCreate(tx *gorm.DB) (err error) {
	if qq.ID == uuid.Nil {
		qq.ID = uuid.New()
	}
	return
}

// QuizAttempt represents the quiz_attempts table
type QuizAttempt struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"quiz_id"`
	StudentID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"student_id"`
	Student     *User      `gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE" json:"student,omitempty"`
	Score       int        `gorm:"not null;default:0" json:"score"`
	Passed      bool       `gorm:"not null;default:false" json:"passed"`
	StartedAt   time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

func (qa *QuizAttempt) BeforeCreate(tx *gorm.DB) (err error) {
	if qa.ID == uuid.Nil {
		qa.ID = uuid.New()
	}
	return
}

// Enrollment represents the enrollments table
type Enrollment struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID        uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_student_course" json:"student_id"`
	CourseID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_student_course" json:"course_id"`
	Course           *Course   `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	CompletedLessons string    `gorm:"type:jsonb;default:'[]'" json:"completed_lessons"`
	ProgressPercent  float64   `gorm:"type:double precision;default:0" json:"progress_percent"`
	EnrolledAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"enrolled_at"`
	UpdatedAt        time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (e *Enrollment) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}

// Certificate represents the certificates table
type Certificate struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID       uuid.UUID `gorm:"type:uuid;not null;index" json:"student_id"`
	Student         *User     `gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE" json:"student,omitempty"`
	CourseID        uuid.UUID `gorm:"type:uuid;not null;index" json:"course_id"`
	Course          *Course   `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	CertificateCode string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"certificate_code"`
	IssuedAt        time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"issued_at"`
}

func (c *Certificate) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return
}

// SystemSetting represents the system_settings table for dynamic platform configuration
type SystemSetting struct {
	Key         string    `gorm:"type:varchar(100);primaryKey" json:"key"`
	Value       string    `gorm:"type:text;not null" json:"value"`
	Description string    `gorm:"type:varchar(255)" json:"description"`
	Category    string    `gorm:"type:varchar(50);not null;index" json:"category"`
	UpdatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

