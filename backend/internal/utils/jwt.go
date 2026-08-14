package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"tunorth-hub-backend/internal/models"
)

type JWTClaims struct {
	UserID     uuid.UUID   `json:"user_id"`
	Email      string      `json:"email"`
	Role       models.Role `json:"role"`
	FirstName  string      `json:"first_name"`
	LastName   string      `json:"last_name"`
	GradeLevel *string     `json:"grade_level,omitempty"`
	Classroom  *string     `json:"classroom,omitempty"`
	TokenType  string      `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// GenerateTokenPair creates both Access and Refresh JWT tokens
func GenerateTokenPair(user *models.User, secretKey string) (*TokenPair, error) {
	now := time.Now()
	accessExpiry := now.Add(2 * time.Hour)
	refreshExpiry := now.Add(7 * 24 * time.Hour)

	// 1. Access Token
	accessClaims := JWTClaims{
		UserID:     user.ID,
		Email:      user.Email,
		Role:       user.Role,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		GradeLevel: user.GradeLevel,
		Classroom:  user.Classroom,
		TokenType:  "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			Issuer:    "tunorth-hub",
		},
	}

	accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err := accessTokenObj.SignedString([]byte(secretKey))
	if err != nil {
		return nil, err
	}

	// 2. Refresh Token
	refreshClaims := JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      user.Role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(refreshExpiry),
			Issuer:    "tunorth-hub",
		},
	}

	refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err := refreshTokenObj.SignedString([]byte(secretKey))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
	}, nil
}

// ValidateToken parses and validates a JWT token string
func ValidateToken(tokenString, secretKey string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
