package database

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"tunorth-hub-backend/internal/config"
	"tunorth-hub-backend/internal/models"
)

type Database struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func Connect(cfg *config.Config) (*Database, error) {
	logLevel := logger.Info
	if cfg.AppEnv == "production" {
		logLevel = logger.Warn
	}

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Connection Pool configuration
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Redis connection
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})

	return &Database{
		DB:    db,
		Redis: rdb,
	}, nil
}

func (d *Database) AutoMigrate() error {
	log.Println("Running GORM AutoMigrate...")
	return d.DB.AutoMigrate(
		&models.User{},
		&models.Course{},
		&models.Module{},
		&models.Lesson{},
		&models.Assignment{},
		&models.Submission{},
		&models.Quiz{},
		&models.QuizQuestion{},
		&models.QuizAttempt{},
		&models.Enrollment{},
		&models.Certificate{},
	)
}

func (d *Database) Ping(ctx context.Context) (dbErr error, redisErr error) {
	sqlDB, err := d.DB.DB()
	if err != nil {
		dbErr = err
	} else {
		dbErr = sqlDB.PingContext(ctx)
	}

	if d.Redis != nil {
		redisErr = d.Redis.Ping(ctx).Err()
	}

	return
}
