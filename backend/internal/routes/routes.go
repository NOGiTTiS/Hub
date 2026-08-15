package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/handlers"
	"tunorth-hub-backend/internal/middleware"
	"tunorth-hub-backend/internal/models"
)

func SetupRoutes(app *fiber.App, cfg *config.Config, db *database.Database) {
	// Global Middlewares
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, Cookie",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
	}))

	// Serve static files from upload directory
	app.Static("/uploads", cfg.UploadDir)

	// API Group
	api := app.Group("/api")
	api.Use(middleware.CheckMaintenanceMode(db, cfg))

	// Health check
	healthHandler := handlers.NewHealthHandler(db)
	api.Get("/health", healthHandler.HealthCheck)
	app.Get("/health", healthHandler.HealthCheck)

	// Public Certificate Verification Route
	certHandler := handlers.NewCertificateHandler(db)
	api.Get("/certificates/verify/:code", certHandler.VerifyCertificate)

	// Auth Routes
	authHandler := handlers.NewAuthHandler(cfg, db)
	authGroup := api.Group("/auth")
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/logout", authHandler.Logout)
	authGroup.Post("/refresh", authHandler.RefreshToken)
	authGroup.Get("/me", middleware.RequireAuth(cfg), authHandler.Me)

	// File Upload Route (Authenticated users)
	uploadHandler := handlers.NewUploadHandler(cfg)
	api.Post("/upload", middleware.RequireAuth(cfg), uploadHandler.UploadFile)

	// Settings Handler
	settingsHandler := handlers.NewSettingsHandler(db, cfg)
	api.Get("/settings/public", settingsHandler.GetPublicSettings)

	// Category Handler
	categoryHandler := handlers.NewCategoryHandler(db)
	api.Get("/categories", categoryHandler.ListCategories)

	// Handlers
	adminUserHandler := handlers.NewAdminUserHandler(db)
	courseHandler := handlers.NewCourseHandler(db)
	assignmentHandler := handlers.NewAssignmentHandler(db)
	quizHandler := handlers.NewQuizHandler(db)

	// Admin Routes
	adminGroup := api.Group("/admin", middleware.RequireAuth(cfg), middleware.RequireRole(models.RoleAdmin))
	
	adminGroup.Get("/stats/users", adminUserHandler.GetUserStats)
	adminGroup.Get("/users", adminUserHandler.ListUsers)
	adminGroup.Post("/users", adminUserHandler.CreateUser)
	adminGroup.Put("/users/:id", adminUserHandler.UpdateUser)
	adminGroup.Delete("/users/:id", adminUserHandler.DeleteUser)
	adminGroup.Post("/users/import", adminUserHandler.BatchImport)
	adminGroup.Get("/users/template", adminUserHandler.DownloadTemplate)
	adminGroup.Get("/settings", settingsHandler.GetAdminSettings)
	adminGroup.Put("/settings", settingsHandler.UpdateAdminSettings)
	adminGroup.Get("/settings/system-health", settingsHandler.GetSystemHealth)
	adminGroup.Get("/courses/:id/students", courseHandler.ListCourseStudents)
	adminGroup.Delete("/courses/:id/students/:studentId", courseHandler.RemoveStudentFromCourse)

	// Admin Category Management
	adminGroup.Post("/categories", categoryHandler.CreateCategory)
	adminGroup.Put("/categories/:id", categoryHandler.UpdateCategory)
	adminGroup.Delete("/categories/:id", categoryHandler.DeleteCategory)
	adminGroup.Post("/categories/reorder", categoryHandler.ReorderCategories)

	// Teacher Routes (Course, Content, Assignments, Quizzes Management)
	teacherGroup := api.Group("/teacher", middleware.RequireAuth(cfg), middleware.RequireRole(models.RoleTeacher))
	
	teacherGroup.Get("/courses", courseHandler.ListTeacherCourses)
	teacherGroup.Post("/courses", courseHandler.CreateCourse)
	teacherGroup.Get("/courses/:id", courseHandler.GetTeacherCourse)
	teacherGroup.Put("/courses/:id", courseHandler.UpdateCourse)
	teacherGroup.Delete("/courses/:id", courseHandler.DeleteCourse)
	teacherGroup.Patch("/courses/:id/publish", courseHandler.TogglePublishCourse)
	teacherGroup.Get("/courses/:id/students", courseHandler.ListCourseStudents)
	teacherGroup.Delete("/courses/:id/students/:studentId", courseHandler.RemoveStudentFromCourse)

	// Modules & Lessons management
	teacherGroup.Post("/courses/:courseId/modules", courseHandler.CreateModule)
	teacherGroup.Put("/modules/:id", courseHandler.UpdateModule)
	teacherGroup.Delete("/modules/:id", courseHandler.DeleteModule)
	teacherGroup.Post("/courses/:courseId/modules/reorder", courseHandler.ReorderModules)

	teacherGroup.Post("/modules/:moduleId/lessons", courseHandler.CreateLesson)
	teacherGroup.Put("/lessons/:id", courseHandler.UpdateLesson)
	teacherGroup.Delete("/lessons/:id", courseHandler.DeleteLesson)
	teacherGroup.Post("/modules/:moduleId/lessons/reorder", courseHandler.ReorderLessons)

	// Teacher Assignment Management
	teacherGroup.Post("/lessons/:lessonId/assignments", assignmentHandler.CreateAssignment)
	teacherGroup.Get("/lessons/:lessonId/assignments", assignmentHandler.GetLessonAssignments)
	teacherGroup.Put("/assignments/:id", assignmentHandler.UpdateAssignment)
	teacherGroup.Delete("/assignments/:id", assignmentHandler.DeleteAssignment)
	teacherGroup.Get("/assignments/:id/submissions", assignmentHandler.ListAssignmentSubmissions)
	teacherGroup.Post("/submissions/:id/grade", assignmentHandler.GradeSubmission)

	// Teacher Quiz Management
	teacherGroup.Post("/lessons/:lessonId/quizzes", quizHandler.CreateQuiz)
	teacherGroup.Get("/lessons/:lessonId/quizzes", quizHandler.GetLessonQuizzes)
	teacherGroup.Put("/quizzes/:id", quizHandler.UpdateQuiz)
	teacherGroup.Delete("/quizzes/:id", quizHandler.DeleteQuiz)
	teacherGroup.Post("/quizzes/:quizId/questions", quizHandler.CreateQuestion)
	teacherGroup.Put("/questions/:id", quizHandler.UpdateQuestion)
	teacherGroup.Delete("/questions/:id", quizHandler.DeleteQuestion)
	teacherGroup.Get("/quizzes/:id/stats", quizHandler.GetQuizStats)

	// Student Routes (Course Browsing, Player, Progress, Assignments, Quizzes, Certificate)
	studentCourseHandler := handlers.NewStudentCourseHandler(db)
	studentGroup := api.Group("/student", middleware.RequireAuth(cfg), middleware.RequireRole(models.RoleStudent))

	studentGroup.Get("/courses", studentCourseHandler.ListPublishedCourses)
	studentGroup.Get("/my-courses", studentCourseHandler.GetMyCourses)
	studentGroup.Post("/courses/:id/enroll", studentCourseHandler.EnrollCourse)
	studentGroup.Delete("/courses/:id/enroll", studentCourseHandler.UnenrollCourse)
	studentGroup.Get("/courses/:id/player", studentCourseHandler.GetCoursePlayer)
	studentGroup.Post("/courses/:id/lessons/:lessonId/progress", studentCourseHandler.UpdateLessonProgress)

	// Student Assignment & Quiz
	studentGroup.Get("/lessons/:lessonId/assignment", assignmentHandler.GetLessonAssignmentForStudent)
	studentGroup.Post("/assignments/:id/submit", assignmentHandler.SubmitAssignment)
	studentGroup.Get("/lessons/:lessonId/quiz", quizHandler.GetStudentQuiz)
	studentGroup.Post("/quizzes/:id/submit", quizHandler.SubmitQuiz)

	// Student Certificate
	studentGroup.Get("/courses/:id/certificate", certHandler.GetOrGenerateCertificate)
}
