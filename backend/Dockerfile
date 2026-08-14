# Backend Dockerfile for TUNorth-Hub Go Fiber API
FROM golang:1.25-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/seed ./cmd/seed

FROM alpine:3.21 AS runner
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata

ENV TZ=Asia/Bangkok
ENV PORT=8080
ENV APP_ENV=production
ENV UPLOAD_DIR=/var/tunorth_data/uploads

COPY --from=builder /app/server /app/server
COPY --from=builder /app/seed /app/seed

EXPOSE 8080
CMD ["/app/server"]
