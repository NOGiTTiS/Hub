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
	GeminiAPIKey   string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	appEnv := getEnv("APP_ENV", "development")
	port := getEnv("PORT", "8080")

	dbHost := getEnv("DB_HOST", "")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "tunorth_hub")
	dbPort := getEnv("DB_PORT", "5432")

	var defaultDBURL string
	if dbHost != "" {
		defaultDBURL = "host=" + dbHost + " user=" + dbUser + " password=" + dbPass + " dbname=" + dbName + " port=" + dbPort + " sslmode=disable TimeZone=Asia/Bangkok"
	} else {
		defaultDBURL = "host=localhost user=postgres password=postgres dbname=tunorth_hub port=5432 sslmode=disable TimeZone=Asia/Bangkok"
	}
	dbURL := getEnv("DATABASE_URL", defaultDBURL)

	redisURL := getEnv("REDIS_URL", "localhost:6379")
	jwtSecret := getEnv("JWT_SECRET", "tunorth-hub-super-secure-jwt-secret-key-2026")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:80,http://localhost")
	geminiAPIKey := getEnv("GEMINI_API_KEY", "")

	return &Config{
		AppEnv:         appEnv,
		Port:           port,
		DatabaseURL:    dbURL,
		RedisURL:       redisURL,
		JWTSecret:      jwtSecret,
		UploadDir:      uploadDir,
		AllowedOrigins: allowedOrigins,
		GeminiAPIKey:   geminiAPIKey,
	}
}

func getEnv(key, fallback string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return fallback
}
