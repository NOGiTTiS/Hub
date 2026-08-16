package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Config struct {
	BaseURL      string
	Concurrency  int
	Duration     time.Duration
	RampUp       time.Duration
	Scenario     string
	VideoSizeMB  int
	OutputJSON   string
	OutputMD     string
	StudentEmail string
	StudentPass  string
	TeacherEmail string
	TeacherPass  string
}

type RequestResult struct {
	Scenario   string
	Method     string
	Endpoint   string
	StatusCode int
	Duration   time.Duration
	BytesRead  int64
	Error      error
	IsVideo206 bool
}

type ScenarioStats struct {
	Name            string        `json:"name"`
	TotalRequests   int64         `json:"total_requests"`
	SuccessRequests int64         `json:"success_requests"`
	FailedRequests  int64         `json:"failed_requests"`
	TotalBytes      int64         `json:"total_bytes"`
	RPS             float64       `json:"rps"`
	ThroughputMBps  float64       `json:"throughput_mbps"`
	MinLatencyMs    float64       `json:"min_latency_ms"`
	MaxLatencyMs    float64       `json:"max_latency_ms"`
	MeanLatencyMs   float64       `json:"mean_latency_ms"`
	P50LatencyMs    float64       `json:"p50_latency_ms"`
	P90LatencyMs    float64       `json:"p90_latency_ms"`
	P95LatencyMs    float64       `json:"p95_latency_ms"`
	P99LatencyMs    float64       `json:"p99_latency_ms"`
	StatusCodes     map[int]int64 `json:"status_codes"`
	Video206Count   int64         `json:"video_206_count,omitempty"`
}

type BenchmarkReport struct {
	TargetURL       string                   `json:"target_url"`
	Concurrency     int                      `json:"concurrency"`
	DurationSeconds float64                  `json:"duration_seconds"`
	Timestamp       string                   `json:"timestamp"`
	OverallStats    ScenarioStats            `json:"overall_stats"`
	Scenarios       map[string]ScenarioStats `json:"scenarios"`
}

func main() {
	target := flag.String("target", "http://localhost:8080", "Target API base URL (e.g., http://localhost:8080 or http://localhost)")
	concurrency := flag.Int("c", 150, "Number of concurrent active users / workers")
	duration := flag.Duration("d", 15*time.Second, "Test duration (e.g. 15s, 30s, 1m)")
	rampUp := flag.Duration("ramp-up", 2*time.Second, "Ramp up duration for workers")
	scenario := flag.String("scenario", "full-load", "Scenario: full-load, public-api, auth, student-flow, video-streaming")
	videoSizeMB := flag.Int("video-size", 5, "Size of mock test video in MB for streaming benchmark")
	outputJSON := flag.String("output-json", "loadtest-report.json", "JSON output file path")
	outputMD := flag.String("output-md", "loadtest-report.md", "Markdown output file path")
	studentEmail := flag.String("student-email", "student1@tunorth.ac.th", "Student email for authentication")
	studentPass := flag.String("student-pass", "Password123!", "Student password")
	teacherEmail := flag.String("teacher-email", "teacher@tunorth.ac.th", "Teacher email for authentication")
	teacherPass := flag.String("teacher-pass", "Password123!", "Teacher password")
	flag.Parse()

	cfg := Config{
		BaseURL:      strings.TrimRight(*target, "/"),
		Concurrency:  *concurrency,
		Duration:     *duration,
		RampUp:       *rampUp,
		Scenario:     *scenario,
		VideoSizeMB:  *videoSizeMB,
		OutputJSON:   *outputJSON,
		OutputMD:     *outputMD,
		StudentEmail: *studentEmail,
		StudentPass:  *studentPass,
		TeacherEmail: *teacherEmail,
		TeacherPass:  *teacherPass,
	}

	printBanner(cfg)

	// Ensure mock video file exists for video streaming tests
	ensureMockVideoFile(cfg.VideoSizeMB)

	// Run health check before starting
	if err := checkServerHealth(cfg.BaseURL); err != nil {
		fmt.Printf("\n❌ Warning: Target server at %s is not reachable: %v\n", cfg.BaseURL, err)
		fmt.Println("Please make sure backend server or docker stack is running!")
		fmt.Println("Example: cd backend && go run cmd/server/main.go")
		os.Exit(1)
	}

	fmt.Println("🟢 Target server is healthy and responsive! Starting benchmark...")
	runBenchmark(cfg)
}

func printBanner(cfg Config) {
	fmt.Println(strings.Repeat("═", 78))
	fmt.Println("🚀 TUNorth-Hub High-Concurrency Load Testing & Video Stream Benchmark")
	fmt.Println("   Target Scale: 150 Peak Concurrent Active Users (LMS High School Workload)")
	fmt.Println(strings.Repeat("─", 78))
	fmt.Printf("🎯 Target URL    : %s\n", cfg.BaseURL)
	fmt.Printf("👥 Concurrent CCU: %d Workers\n", cfg.Concurrency)
	fmt.Printf("⏱️  Duration      : %v (Ramp-up: %v)\n", cfg.Duration, cfg.RampUp)
	fmt.Printf("🧪 Scenario      : %s\n", cfg.Scenario)
	fmt.Printf("📹 Video Stream  : HTTP Range 206 Partial Content (Mock %d MB)\n", cfg.VideoSizeMB)
	fmt.Println(strings.Repeat("═", 78))
}

func ensureMockVideoFile(sizeMB int) {
	videoDir := filepath.Join("..", "uploads", "videos")
	if _, err := os.Stat("uploads"); err == nil {
		videoDir = filepath.Join("uploads", "videos")
	}
	_ = os.MkdirAll(videoDir, 0755)

	targetFile := filepath.Join(videoDir, "loadtest-sample.mp4")
	info, err := os.Stat(targetFile)
	expectedBytes := int64(sizeMB) * 1024 * 1024

	if err == nil && info.Size() >= expectedBytes {
		return // File already exists with enough size
	}

	fmt.Printf("📦 Preparing mock video streaming file (%d MB) at %s...\n", sizeMB, targetFile)
	f, err := os.Create(targetFile)
	if err != nil {
		fmt.Printf("Warning: failed to create mock video file: %v\n", err)
		return
	}
	defer f.Close()

	// Generate MP4 pseudo header & chunk bytes
	header := []byte{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D}
	_, _ = f.Write(header)

	buf := make([]byte, 64*1024)
	for i := range buf {
		buf[i] = byte(i % 256)
	}

	var written int64 = int64(len(header))
	for written < expectedBytes {
		toWrite := int64(len(buf))
		if written+toWrite > expectedBytes {
			toWrite = expectedBytes - written
		}
		n, err := f.Write(buf[:toWrite])
		if err != nil {
			break
		}
		written += int64(n)
	}
	fmt.Printf("✓ Created %s (%.2f MB)\n", targetFile, float64(written)/(1024*1024))
}

func checkServerHealth(baseURL string) error {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(baseURL + "/api/health")
	if err != nil {
		// Try root health
		resp, err = client.Get(baseURL + "/health")
		if err != nil {
			return err
		}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("server returned HTTP status %d", resp.StatusCode)
	}
	return nil
}

func createHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        300,
			MaxIdleConnsPerHost: 200,
			IdleConnTimeout:     90 * time.Second,
			TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
			DisableCompression:  false,
		},
	}
}

func runBenchmark(cfg Config) {
	resultsChan := make(chan RequestResult, 100000)
	var wg sync.WaitGroup

	startTime := time.Now()
	stopTime := startTime.Add(cfg.Duration)

	var activeWorkers int32
	var totalRequestsSent int64

	fmt.Printf("\n🚀 Spawning %d concurrent virtual user workers...\n", cfg.Concurrency)

	for i := 0; i < cfg.Concurrency; i++ {
		wg.Add(1)
		workerID := i

		// Staggered ramp-up
		rampDelay := time.Duration(0)
		if cfg.Concurrency > 1 && cfg.RampUp > 0 {
			rampDelay = time.Duration(float64(cfg.RampUp) * (float64(i) / float64(cfg.Concurrency)))
		}

		go func(id int, delay time.Duration) {
			defer wg.Done()
			if delay > 0 {
				time.Sleep(delay)
			}
			atomic.AddInt32(&activeWorkers, 1)
			defer atomic.AddInt32(&activeWorkers, -1)

			client := createHTTPClient()
			workerLoop(id, client, cfg, stopTime, resultsChan, &totalRequestsSent)
		}(workerID, rampDelay)
	}

	// Collector goroutine
	var results []RequestResult
	collectorDone := make(chan struct{})
	go func() {
		for res := range resultsChan {
			results = append(results, res)
		}
		close(collectorDone)
	}()

	// Real-time progress ticker
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for range ticker.C {
			elapsed := time.Since(startTime)
			if elapsed > cfg.Duration {
				break
			}
			reqs := atomic.LoadInt64(&totalRequestsSent)
			workers := atomic.LoadInt32(&activeWorkers)
			currentRPS := float64(reqs) / elapsed.Seconds()
			fmt.Printf("\r⏳ [%02d/%02ds] Active CCU: %3d | Reqs: %6d | Current RPS: %7.1f req/s",
				int(elapsed.Seconds()), int(cfg.Duration.Seconds()), workers, reqs, currentRPS)
		}
	}()

	wg.Wait()
	ticker.Stop()
	close(resultsChan)
	<-collectorDone

	totalElapsed := time.Since(startTime)
	fmt.Printf("\n\n✅ Benchmark completed in %.2f seconds!\n", totalElapsed.Seconds())

	// Analyze results
	report := analyzeResults(cfg, results, totalElapsed)
	printReportSummary(report)

	// Save JSON & Markdown reports
	saveReports(cfg, report)
}

func workerLoop(
	workerID int,
	client *http.Client,
	cfg Config,
	stopTime time.Time,
	resultsChan chan<- RequestResult,
	totalReqs *int64,
) {
	// Pre-authenticate for authenticated scenarios
	var authToken string
	var authCookie *http.Cookie

	if cfg.Scenario == "auth" || cfg.Scenario == "student-flow" || cfg.Scenario == "full-load" {
		token, cookie, res := performLogin(client, cfg.BaseURL, cfg.StudentEmail, cfg.StudentPass)
		authToken = token
		authCookie = cookie
		resultsChan <- res
		atomic.AddInt64(totalReqs, 1)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(workerID)))

	for time.Now().Before(stopTime) {
		scenarioToRun := cfg.Scenario
		if scenarioToRun == "full-load" {
			// Weighted distribution simulating realistic high-school LMS load:
			// 40% Video Streaming (Byte-Range requests)
			// 25% Public APIs (Catalog, Settings, Landing)
			// 20% Student Course & Player APIs
			// 10% Auth & Profile
			// 5%  Progress & Quiz submission
			dice := rng.Intn(100)
			switch {
			case dice < 40:
				scenarioToRun = "video-streaming"
			case dice < 65:
				scenarioToRun = "public-api"
			case dice < 85:
				scenarioToRun = "student-flow"
			case dice < 95:
				scenarioToRun = "auth"
			default:
				scenarioToRun = "student-submit"
			}
		}

		var res RequestResult
		switch scenarioToRun {
		case "public-api":
			res = executePublicAPI(client, cfg.BaseURL, rng)
		case "auth":
			_, _, res = performLogin(client, cfg.BaseURL, cfg.StudentEmail, cfg.StudentPass)
		case "student-flow":
			res = executeStudentFlow(client, cfg.BaseURL, authToken, authCookie, rng)
		case "video-streaming":
			res = executeVideoStreaming(client, cfg.BaseURL, rng)
		case "student-submit":
			res = executeStudentSubmit(client, cfg.BaseURL, authToken, authCookie, rng)
		default:
			res = executePublicAPI(client, cfg.BaseURL, rng)
		}

		resultsChan <- res
		atomic.AddInt64(totalReqs, 1)

		// Micro pause to simulate human pacing (10ms - 50ms)
		time.Sleep(time.Duration(10+rng.Intn(40)) * time.Millisecond)
	}
}

func performLogin(client *http.Client, baseURL, email, password string) (string, *http.Cookie, RequestResult) {
	loginPayload := map[string]string{
		"email":    email,
		"password": password,
	}
	body, _ := json.Marshal(loginPayload)

	reqStart := time.Now()
	req, _ := http.NewRequest("POST", baseURL+"/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	duration := time.Since(reqStart)

	res := RequestResult{
		Scenario: "auth",
		Method:   "POST",
		Endpoint: "/api/auth/login",
		Duration: duration,
		Error:    err,
	}

	if err != nil {
		return "", nil, res
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	res.StatusCode = resp.StatusCode
	res.BytesRead = int64(len(respBytes))

	var token string
	var authCookie *http.Cookie

	for _, c := range resp.Cookies() {
		if c.Name == "token" || c.Name == "jwt" || c.Name == "access_token" {
			authCookie = c
			token = c.Value
		}
	}

	var jsonResp map[string]interface{}
	if err := json.Unmarshal(respBytes, &jsonResp); err == nil {
		if t, ok := jsonResp["token"].(string); ok && token == "" {
			token = t
		}
	}

	return token, authCookie, res
}

func executePublicAPI(client *http.Client, baseURL string, rng *rand.Rand) RequestResult {
	endpoints := []string{
		"/api/settings/public",
		"/api/categories",
		"/api/courses/public",
		"/api/health",
		"/api/certificates/verify/TUNorth-2026-DEMO-TEST",
	}

	chosen := endpoints[rng.Intn(len(endpoints))]
	reqStart := time.Now()
	req, _ := http.NewRequest("GET", baseURL+chosen, nil)

	resp, err := client.Do(req)
	duration := time.Since(reqStart)

	res := RequestResult{
		Scenario: "public-api",
		Method:   "GET",
		Endpoint: chosen,
		Duration: duration,
		Error:    err,
	}

	if err != nil {
		return res
	}
	defer resp.Body.Close()

	n, _ := io.Copy(io.Discard, resp.Body)
	res.StatusCode = resp.StatusCode
	res.BytesRead = n
	return res
}

func executeStudentFlow(client *http.Client, baseURL, token string, cookie *http.Cookie, rng *rand.Rand) RequestResult {
	endpoints := []string{
		"/api/student/courses",
		"/api/student/my-courses",
		"/api/profile",
	}

	chosen := endpoints[rng.Intn(len(endpoints))]
	reqStart := time.Now()
	req, _ := http.NewRequest("GET", baseURL+chosen, nil)

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}

	resp, err := client.Do(req)
	duration := time.Since(reqStart)

	res := RequestResult{
		Scenario: "student-flow",
		Method:   "GET",
		Endpoint: chosen,
		Duration: duration,
		Error:    err,
	}

	if err != nil {
		return res
	}
	defer resp.Body.Close()

	n, _ := io.Copy(io.Discard, resp.Body)
	res.StatusCode = resp.StatusCode
	res.BytesRead = n
	return res
}

func executeVideoStreaming(client *http.Client, baseURL string, rng *rand.Rand) RequestResult {
	// Simulate video chunk streaming: HTTP Range requests (e.g. 256KB or 512KB chunks)
	chunkSize := int64(256 * 1024) // 256 KB chunk
	totalMockSize := int64(5 * 1024 * 1024)
	startByte := int64(rng.Intn(int(totalMockSize - chunkSize)))
	endByte := startByte + chunkSize - 1

	videoURL := baseURL + "/uploads/videos/loadtest-sample.mp4"

	reqStart := time.Now()
	req, _ := http.NewRequest("GET", videoURL, nil)
	req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", startByte, endByte))

	resp, err := client.Do(req)
	duration := time.Since(reqStart)

	res := RequestResult{
		Scenario: "video-streaming",
		Method:   "GET",
		Endpoint: "/uploads/videos/loadtest-sample.mp4",
		Duration: duration,
		Error:    err,
	}

	if err != nil {
		return res
	}
	defer resp.Body.Close()

	n, _ := io.Copy(io.Discard, resp.Body)
	res.StatusCode = resp.StatusCode
	res.BytesRead = n
	res.IsVideo206 = (resp.StatusCode == http.StatusPartialContent || resp.StatusCode == http.StatusOK)
	return res
}

func executeStudentSubmit(client *http.Client, baseURL, token string, cookie *http.Cookie, rng *rand.Rand) RequestResult {
	reqStart := time.Now()

	// Simulate progress update
	dummyCourseID := "00000000-0000-0000-0000-000000000001"
	dummyLessonID := "00000000-0000-0000-0000-000000000002"
	endpoint := fmt.Sprintf("/api/student/courses/%s/lessons/%s/progress", dummyCourseID, dummyLessonID)

	payload := map[string]interface{}{
		"completed": true,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", baseURL+endpoint, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if cookie != nil {
		req.AddCookie(cookie)
	}

	resp, err := client.Do(req)
	duration := time.Since(reqStart)

	res := RequestResult{
		Scenario: "student-submit",
		Method:   "POST",
		Endpoint: "/api/student/courses/.../progress",
		Duration: duration,
		Error:    err,
	}

	if err != nil {
		return res
	}
	defer resp.Body.Close()

	n, _ := io.Copy(io.Discard, resp.Body)
	res.StatusCode = resp.StatusCode
	res.BytesRead = n
	return res
}

func analyzeResults(cfg Config, results []RequestResult, totalDuration time.Duration) BenchmarkReport {
	scenariosMap := make(map[string][]RequestResult)
	for _, r := range results {
		scenariosMap[r.Scenario] = append(scenariosMap[r.Scenario], r)
	}

	scenarioStats := make(map[string]ScenarioStats)
	for scName, scResults := range scenariosMap {
		scenarioStats[scName] = calculateStats(scName, scResults, totalDuration)
	}

	overallStats := calculateStats("OVERALL", results, totalDuration)

	return BenchmarkReport{
		TargetURL:       cfg.BaseURL,
		Concurrency:     cfg.Concurrency,
		DurationSeconds: totalDuration.Seconds(),
		Timestamp:       time.Now().Format(time.RFC3339),
		OverallStats:    overallStats,
		Scenarios:       scenarioStats,
	}
}

func calculateStats(name string, results []RequestResult, duration time.Duration) ScenarioStats {
	var totalReqs int64 = int64(len(results))
	var successReqs int64
	var failedReqs int64
	var totalBytes int64
	var video206Count int64
	statusCodes := make(map[int]int64)

	var latencies []float64

	for _, r := range results {
		totalBytes += r.BytesRead
		statusCodes[r.StatusCode]++

		if r.Error != nil || (r.StatusCode >= 400 && r.StatusCode != 404 && r.StatusCode != 400) {
			failedReqs++
		} else {
			successReqs++
		}

		if r.IsVideo206 {
			video206Count++
		}

		latMs := float64(r.Duration.Microseconds()) / 1000.0
		latencies = append(latencies, latMs)
	}

	sort.Float64s(latencies)

	var minLat, maxLat, meanLat, p50, p90, p95, p99 float64
	if len(latencies) > 0 {
		minLat = latencies[0]
		maxLat = latencies[len(latencies)-1]

		var sum float64
		for _, l := range latencies {
			sum += l
		}
		meanLat = sum / float64(len(latencies))

		p50 = percentile(latencies, 50)
		p90 = percentile(latencies, 90)
		p95 = percentile(latencies, 95)
		p99 = percentile(latencies, 99)
	}

	rps := float64(totalReqs) / duration.Seconds()
	throughputMBps := (float64(totalBytes) / (1024 * 1024)) / duration.Seconds()

	return ScenarioStats{
		Name:            name,
		TotalRequests:   totalReqs,
		SuccessRequests: successReqs,
		FailedRequests:  failedReqs,
		TotalBytes:      totalBytes,
		RPS:             rps,
		ThroughputMBps:  throughputMBps,
		MinLatencyMs:    minLat,
		MaxLatencyMs:    maxLat,
		MeanLatencyMs:   meanLat,
		P50LatencyMs:    p50,
		P90LatencyMs:    p90,
		P95LatencyMs:    p95,
		P99LatencyMs:    p99,
		StatusCodes:     statusCodes,
		Video206Count:   video206Count,
	}
}

func percentile(sortedData []float64, p float64) float64 {
	if len(sortedData) == 0 {
		return 0
	}
	idx := int(float64(len(sortedData)) * p / 100.0)
	if idx >= len(sortedData) {
		idx = len(sortedData) - 1
	}
	return sortedData[idx]
}

func printReportSummary(rep BenchmarkReport) {
	fmt.Println("\n" + strings.Repeat("═", 78))
	fmt.Println("📊 TUNorth-Hub 150 Concurrent Active Users Load Test Summary")
	fmt.Println(strings.Repeat("─", 78))

	o := rep.OverallStats
	successRate := 0.0
	if o.TotalRequests > 0 {
		successRate = (float64(o.SuccessRequests) / float64(o.TotalRequests)) * 100.0
	}

	fmt.Printf("🎯 Concurrency       : %d Concurrent Active Users (Peak Target CCU)\n", rep.Concurrency)
	fmt.Printf("⏱️  Duration          : %.2f seconds\n", rep.DurationSeconds)
	fmt.Printf("📦 Total Requests    : %d requests\n", o.TotalRequests)
	fmt.Printf("⚡ Throughput (RPS)  : %.1f req/sec\n", o.RPS)
	fmt.Printf("🌐 Data Transferred  : %.2f MB (%.2f MB/s)\n", float64(o.TotalBytes)/(1024*1024), o.ThroughputMBps)
	fmt.Printf("✅ Success Rate      : %.2f%% (%d OK / %d Failed)\n", successRate, o.SuccessRequests, o.FailedRequests)
	fmt.Println(strings.Repeat("─", 78))
	fmt.Println("📈 Latency Distribution (Response Time Percentiles):")
	fmt.Printf("   • Min Latency     : %7.2f ms\n", o.MinLatencyMs)
	fmt.Printf("   • Mean Latency    : %7.2f ms\n", o.MeanLatencyMs)
	fmt.Printf("   • P50 (Median)    : %7.2f ms\n", o.P50LatencyMs)
	fmt.Printf("   • P90 Percentile  : %7.2f ms\n", o.P90LatencyMs)
	fmt.Printf("   • P95 Percentile  : %7.2f ms\n", o.P95LatencyMs)
	fmt.Printf("   • P99 Percentile  : %7.2f ms\n", o.P99LatencyMs)
	fmt.Printf("   • Max Latency     : %7.2f ms\n", o.MaxLatencyMs)
	fmt.Println(strings.Repeat("─", 78))
	fmt.Println("📋 Breakdown by Scenario:")
	fmt.Printf("  %-18s | %8s | %10s | %9s | %9s | %9s\n", "Scenario", "Requests", "RPS", "P50 (ms)", "P95 (ms)", "P99 (ms)")
	fmt.Printf("  %s\n", strings.Repeat("-", 74))

	var names []string
	for k := range rep.Scenarios {
		names = append(names, k)
	}
	sort.Strings(names)

	for _, name := range names {
		s := rep.Scenarios[name]
		fmt.Printf("  %-18s | %8d | %10.1f | %9.2f | %9.2f | %9.2f\n",
			s.Name, s.TotalRequests, s.RPS, s.P50LatencyMs, s.P95LatencyMs, s.P99LatencyMs)
	}
	fmt.Println(strings.Repeat("═", 78))
}

func saveReports(cfg Config, rep BenchmarkReport) {
	if cfg.OutputJSON != "" {
		jsonData, err := json.MarshalIndent(rep, "", "  ")
		if err == nil {
			_ = os.WriteFile(cfg.OutputJSON, jsonData, 0644)
			fmt.Printf("📁 Saved JSON Benchmark Report: %s\n", cfg.OutputJSON)
		}
	}

	if cfg.OutputMD != "" {
		var sb strings.Builder
		sb.WriteString("# 🚀 TUNorth-Hub 150 Concurrent Users Benchmark Report\n\n")
		sb.WriteString(fmt.Sprintf("**Date:** %s  \n", rep.Timestamp))
		sb.WriteString(fmt.Sprintf("**Target Server:** `%s`  \n", rep.TargetURL))
		sb.WriteString(fmt.Sprintf("**Concurrent Active Users (CCU):** `%d`  \n", rep.Concurrency))
		sb.WriteString(fmt.Sprintf("**Test Duration:** `%.2f seconds`  \n\n", rep.DurationSeconds))

		sb.WriteString("## 📊 Overall Benchmark Metrics\n\n")
		sb.WriteString("| Metric | Value |\n")
		sb.WriteString("| :--- | :--- |\n")
		sb.WriteString(fmt.Sprintf("| **Total Requests** | `%d` |\n", rep.OverallStats.TotalRequests))
		sb.WriteString(fmt.Sprintf("| **Throughput (RPS)** | `%.1f req/s` |\n", rep.OverallStats.RPS))
		sb.WriteString(fmt.Sprintf("| **Data Transferred** | `%.2f MB (%.2f MB/s)` |\n", float64(rep.OverallStats.TotalBytes)/(1024*1024), rep.OverallStats.ThroughputMBps))
		sb.WriteString(fmt.Sprintf("| **Success Rate** | `%.2f%%` |\n", (float64(rep.OverallStats.SuccessRequests)/float64(rep.OverallStats.TotalRequests))*100.0))
		sb.WriteString(fmt.Sprintf("| **Min Latency** | `%.2f ms` |\n", rep.OverallStats.MinLatencyMs))
		sb.WriteString(fmt.Sprintf("| **P50 Latency (Median)** | `%.2f ms` |\n", rep.OverallStats.P50LatencyMs))
		sb.WriteString(fmt.Sprintf("| **P90 Latency** | `%.2f ms` |\n", rep.OverallStats.P90LatencyMs))
		sb.WriteString(fmt.Sprintf("| **P95 Latency** | `%.2f ms` |\n", rep.OverallStats.P95LatencyMs))
		sb.WriteString(fmt.Sprintf("| **P99 Latency** | `%.2f ms` |\n", rep.OverallStats.P99LatencyMs))
		sb.WriteString(fmt.Sprintf("| **Max Latency** | `%.2f ms` |\n", rep.OverallStats.MaxLatencyMs))

		sb.WriteString("\n## 🔬 Breakdown by Scenario\n\n")
		sb.WriteString("| Scenario | Total Requests | RPS | Mean (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Throughput (MB/s) |\n")
		sb.WriteString("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n")

		var names []string
		for k := range rep.Scenarios {
			names = append(names, k)
		}
		sort.Strings(names)

		for _, name := range names {
			s := rep.Scenarios[name]
			sb.WriteString(fmt.Sprintf("| **`%s`** | %d | %.1f | %.2f | %.2f | %.2f | %.2f | %.2f |\n",
				s.Name, s.TotalRequests, s.RPS, s.MeanLatencyMs, s.P50LatencyMs, s.P95LatencyMs, s.P99LatencyMs, s.ThroughputMBps))
		}

		_ = os.WriteFile(cfg.OutputMD, []byte(sb.String()), 0644)
		fmt.Printf("📁 Saved Markdown Benchmark Report: %s\n", cfg.OutputMD)
	}
}
