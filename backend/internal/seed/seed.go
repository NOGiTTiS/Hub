package seed

import (
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"tunorth-hub-backend/internal/models"
)

func SeedDatabase(db *gorm.DB) error {
	log.Println("🌱 Starting database seeding...")

	// 1. Check if Admin already exists
	var count int64
	db.Model(&models.User{}).Where("email = ?", "admin@tunorth.ac.th").Count(&count)
	if count > 0 {
		log.Println("Database already seeded. Skipping initial seed.")
		return nil
	}

	// 2. Hash default password ("Password123!")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	pwStr := string(hashedPassword)

	// 3. Create Users (Admin, Teacher, Students)
	admin := models.User{
		ID:           uuid.New(),
		Email:        "admin@tunorth.ac.th",
		PasswordHash: pwStr,
		FirstName:    "ระบบ",
		LastName:     "ผู้ดูแล",
		Role:         models.RoleAdmin,
	}

	teacher := models.User{
		ID:           uuid.New(),
		Email:        "teacher@tunorth.ac.th",
		PasswordHash: pwStr,
		FirstName:    "สมชาย",
		LastName:     "ใจดี",
		Role:         models.RoleTeacher,
	}

	gradeM4 := "M4"
	class1 := "1"
	student1 := models.User{
		ID:           uuid.New(),
		Email:        "student1@tunorth.ac.th",
		PasswordHash: pwStr,
		FirstName:    "กิตติพงษ์",
		LastName:     "รักเรียน",
		Role:         models.RoleStudent,
		GradeLevel:   &gradeM4,
		Classroom:    &class1,
	}

	student2 := models.User{
		ID:           uuid.New(),
		Email:        "student2@tunorth.ac.th",
		PasswordHash: pwStr,
		FirstName:    "พิมพ์ใจ",
		LastName:     "ขยันยิ่ง",
		Role:         models.RoleStudent,
		GradeLevel:   &gradeM4,
		Classroom:    &class1,
	}

	users := []models.User{admin, teacher, student1, student2}
	for _, u := range users {
		if err := db.Create(&u).Error; err != nil {
			log.Printf("Error creating user %s: %v", u.Email, err)
			return err
		}
	}
	log.Printf("✓ Created %d initial users (Admin, Teacher, Students)", len(users))

	// 4. Create Sample Course
	var sciCat models.CourseCategory
	var catID *uuid.UUID
	if err := db.Where("name = ?", "วิทยาศาสตร์และเทคโนโลยี").First(&sciCat).Error; err == nil {
		catID = &sciCat.ID
	}

	sampleCourse := models.Course{
		ID:            uuid.New(),
		Title:         "วิทยาการคำนวณและวิทยาการข้อมูล ม.4 (CS & Data Science)",
		Description:   "หลักสูตรเรียนรู้พื้นฐานการเขียนโปรแกรม Python โครงสร้างข้อมูล และการวิเคราะห์ข้อมูลเบื้องต้น",
		CoverImageURL: "/uploads/covers/python-course.jpg",
		TeacherID:     teacher.ID,
		CategoryID:    catID,
		IsPublished:   true,
	}
	if err := db.Create(&sampleCourse).Error; err != nil {
		return err
	}
	log.Printf("✓ Created sample course: %s", sampleCourse.Title)

	// 5. Create Modules
	module1 := models.Module{
		ID:         uuid.New(),
		CourseID:   sampleCourse.ID,
		Title:      "หน่วยการเรียนรู้ที่ 1: การคิดเชิงคำนวณและพื้นฐาน Python",
		OrderIndex: 1,
	}
	module2 := models.Module{
		ID:         uuid.New(),
		CourseID:   sampleCourse.ID,
		Title:      "หน่วยการเรียนรู้ที่ 2: โครงสร้างข้อมูลและเงื่อนไข (Control Flow)",
		OrderIndex: 2,
	}
	db.Create(&module1)
	db.Create(&module2)

	// 6. Create Lessons
	lesson1 := models.Lesson{
		ID:          uuid.New(),
		ModuleID:    module1.ID,
		Title:       "1.1 แนะนำภาษา Python และการติดตั้งสภาพแวดล้อม",
		ContentType: models.ContentTypeVideoEmbed,
		EmbedURL:    "https://www.youtube.com/embed/dQw4w9WgXcQ",
		BodyText:    "ยินดีต้อนรับสู่วิชาวิทยาการคำนวณ ในบทเรียนนี้เราจะทำความเข้าใจเกี่ยวกับไวยากรณ์พื้นฐานของภาษา Python",
		OrderIndex:  1,
	}

	lesson2 := models.Lesson{
		ID:          uuid.New(),
		ModuleID:    module1.ID,
		Title:       "1.2 การเขียนโปรแกรมแรกด้วย Interactive Code Playground",
		ContentType: models.ContentTypeCodeLab,
		BodyText:    "print('Hello, TUNorth-Hub!')",
		OrderIndex:  2,
	}

	lesson3 := models.Lesson{
		ID:          uuid.New(),
		ModuleID:    module1.ID,
		Title:       "1.3 เอกสารประกอบการสอน สไลด์บทที่ 1 (PDF)",
		ContentType: models.ContentTypeSlidePDF,
		PDFURL:      "/uploads/slides/module1-slides.pdf",
		BodyText:    "ดาวน์โหลดหรือเปิดอ่านสไลด์ประกอบการสอนประจำสัปดาห์",
		OrderIndex:  3,
	}
	db.Create(&lesson1)
	db.Create(&lesson2)
	db.Create(&lesson3)

	// 7. Create Sample Assignment
	due := time.Now().Add(7 * 24 * time.Hour)
	assignment1 := models.Assignment{
		ID:           uuid.New(),
		LessonID:     lesson2.ID,
		Title:        "แบบฝึกหัดที่ 1: การเขียนโปรแกรมคำนวณพื้นที่รูปเรขาคณิต",
		Instructions: "ให้นักเรียนเขียนโปรแกรมภาษา Python คำนวณพื้นที่สามเหลี่ยมและสี่เหลี่ยม แล้วส่งไฟล์ .py หรือพิมพ์โค้ดคำตอบ",
		MaxScore:     100,
		DueDate:      &due,
	}
	db.Create(&assignment1)

	// 8. Create Sample Quiz
	quiz1 := models.Quiz{
		ID:               uuid.New(),
		LessonID:         lesson1.ID,
		Title:            "แบบทดสอบความรู้พื้นฐานบทที่ 1",
		TimeLimitMinutes: 15,
		PassingScore:     80,
	}
	db.Create(&quiz1)

	q1 := models.QuizQuestion{
		ID:            uuid.New(),
		QuizID:        quiz1.ID,
		QuestionText:  "คำสั่งใดใน Python ใช้สำหรับแสดงผลข้อความออกทางหน้าจอ?",
		QuestionType:  "MULTIPLE_CHOICE",
		OptionsJSON:   `["print()", "echo()", "console.log()", "display()"]`,
		CorrectAnswer: "print()",
		Points:        10,
	}
	q2 := models.QuizQuestion{
		ID:            uuid.New(),
		QuizID:        quiz1.ID,
		QuestionText:  "Python เป็นภาษาประเภท Dynamic Typing ใช่หรือไม่?",
		QuestionType:  "TRUE_FALSE",
		OptionsJSON:   `["ใช่ (True)", "ไม่ใช่ (False)"]`,
		CorrectAnswer: "ใช่ (True)",
		Points:        10,
	}
	db.Create(&q1)
	db.Create(&q2)

	// 9. Create Sample Enrollment
	enrollment := models.Enrollment{
		ID:               uuid.New(),
		StudentID:        student1.ID,
		CourseID:         sampleCourse.ID,
		CompletedLessons: "[]",
		ProgressPercent:  0,
		EnrolledAt:       time.Now(),
		UpdatedAt:        time.Now(),
	}
	db.Create(&enrollment)

	log.Println("✅ Database seeding completed successfully!")
	return nil
}
