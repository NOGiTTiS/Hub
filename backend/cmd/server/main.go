package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/routes"
	"tunorth-hub-backend/internal/seed"
)

func main() {
	runSeed := flag.Bool("seed", false, "Run database migration and seed initial data")
	flag.Parse()

	cfg := config.LoadConfig()
	log.Printf("Starting TUNorth-Hub Backend on port %s (env: %s)", cfg.Port, cfg.AppEnv)

	// Ensure upload directories exist
	uploadSubDirs := []string{"videos", "slides", "covers", "assignments"}
	for _, sub := range uploadSubDirs {
		dirPath := fmt.Sprintf("%s/%s", cfg.UploadDir, sub)
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			log.Printf("Warning: failed to create upload directory %s: %v", dirPath, err)
		}
	}

	// Connect to Database
	db, err := database.Connect(cfg)
	if err != nil {
		log.Printf("⚠️ Warning: Could not connect to PostgreSQL/Redis: %v", err)
	} else {
		log.Println("✓ Connected to PostgreSQL and Redis")
		// Run AutoMigrate
		if err := db.AutoMigrate(); err != nil {
			log.Printf("Migration error: %v", err)
		} else {
			log.Println("✓ Database migrations applied successfully")
		}

		if *runSeed || cfg.AppEnv == "development" {
			if err := seed.SeedDatabase(db.DB); err != nil {
				log.Printf("Seed error: %v", err)
			}
		}
	}

	// Fiber app configuration
	app := fiber.New(fiber.Config{
		AppName:      "TUNorth-Hub API Server v1.0",
		ServerHeader: "Fiber",
		BodyLimit:    500 * 1024 * 1024, // 500MB max payload for video/PDF uploads
	})

	// Setup routes
	routes.SetupRoutes(app, cfg, db)

	// Graceful shutdown channel
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%s", cfg.Port)
		if err := app.Listen(addr); err != nil {
			log.Printf("Server listen error: %v", err)
		}
	}()

	<-shutdownChan
	log.Println("Gracefully shutting down TUNorth-Hub API Server...")
	_ = app.Shutdown()
	log.Println("Server stopped.")
}
