package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv         string
	Port           string
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	UploadDir      string
	AllowedOrigins string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	appEnv := getEnv("APP_ENV", "development")
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=tunorth_hub port=5432 sslmode=disable TimeZone=Asia/Bangkok")
	redisURL := getEnv("REDIS_URL", "localhost:6379")
	jwtSecret := getEnv("JWT_SECRET", "tunorth-hub-super-secure-jwt-secret-key-2026")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:80,http://localhost")

	return &Config{
		AppEnv:         appEnv,
		Port:           port,
		DatabaseURL:    dbURL,
		RedisURL:       redisURL,
		JWTSecret:      jwtSecret,
		UploadDir:      uploadDir,
		AllowedOrigins: allowedOrigins,
	}
}

func getEnv(key, fallback string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return fallback
}
