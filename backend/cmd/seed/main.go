package main

import (
	"log"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/database"
	"tunorth-hub-backend/internal/seed"
)

func main() {
	cfg := config.LoadConfig()
	log.Println("Connecting to database for seeding...")

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	if err := db.AutoMigrate(); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	if err := seed.SeedDatabase(db.DB); err != nil {
		log.Fatalf("Database seeding failed: %v", err)
	}

	log.Println("Seed process completed successfully!")
}
