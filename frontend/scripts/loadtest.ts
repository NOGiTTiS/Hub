// TUNorth-Hub 150 Concurrent Users Benchmark Script (Bun Runtime)
// Enforce NO semicolons rule

interface RequestMetric {
  scenario: string
  endpoint: string
  status: number
  durationMs: number
  bytes: number
  isError: boolean
}

const TARGET = process.env.TARGET_URL || 'http://localhost:8080'
const CONCURRENCY = parseInt(process.env.CCU || '150', 10)
const DURATION_SEC = parseInt(process.env.DURATION || '15', 10)

console.log('═'.repeat(75))
console.log('🚀 TUNorth-Hub High-Concurrency Benchmark Suite (Bun Engine)')
console.log('   Target Scale: 150 Peak Concurrent Active Users')
console.log('─'.repeat(75))
console.log(`🎯 Target URL    : ${TARGET}`)
console.log(`👥 Concurrent CCU: ${CONCURRENCY} Workers`)
console.log(`⏱️  Duration      : ${DURATION_SEC} seconds`)
console.log('═'.repeat(75))

async function runWorker(
  workerId: number,
  stopTime: number,
  metrics: RequestMetric[]
) {
  // Pre-auth
  let token = ''
  try {
    const authRes = await fetch(`${TARGET}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student1@tunorth.ac.th',
        password: 'Password123!'
      })
    })
    const authData = (await authRes.json()) as { token?: string }
    if (authData && authData.token) {
      token = authData.token
    }
  } catch {}

  const endpoints = [
    { type: 'public-api', url: '/api/settings/public', method: 'GET' },
    { type: 'public-api', url: '/api/courses/public', method: 'GET' },
    { type: 'public-api', url: '/api/categories', method: 'GET' },
    { type: 'student-flow', url: '/api/student/my-courses', method: 'GET' },
    { type: 'student-flow', url: '/api/profile', method: 'GET' },
    { type: 'video-stream', url: '/uploads/videos/loadtest-sample.mp4', method: 'STREAM' }
  ]

  while (Date.now() < stopTime) {
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)]
    const start = performance.now()
    let status = 0
    let bytes = 0
    let isError = false

    try {
      const headers: Record<string, string> = {}
      if (token && ep.type === 'student-flow') {
        headers['Authorization'] = `Bearer ${token}`
      }
      if (ep.method === 'STREAM') {
        // 256KB Range chunk
        headers['Range'] = 'bytes=0-262143'
      }

      const res = await fetch(`${TARGET}${ep.url}`, {
        method: ep.method === 'STREAM' ? 'GET' : ep.method,
        headers
      })
      status = res.status
      const buf = await res.arrayBuffer()
      bytes = buf.byteLength
      isError = status >= 400 && status !== 404
    } catch {
      isError = true
      status = 500
    }

    const durationMs = performance.now() - start
    metrics.push({
      scenario: ep.type,
      endpoint: ep.url,
      status,
      durationMs,
      bytes,
      isError
    })

    // Micro jitter
    await new Promise(r => setTimeout(r, 10 + Math.random() * 30))
  }
}

async function main() {
  const metrics: RequestMetric[] = []
  const startTime = Date.now()
  const stopTime = startTime + DURATION_SEC * 1000

  const workers = Array.from({ length: CONCURRENCY }, (_, i) =>
    runWorker(i, stopTime, metrics)
  )

  const ticker = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000
    const reqs = metrics.length
    const rps = (reqs / elapsed).toFixed(1)
    process.stdout.write(
      `\r⏳ [${elapsed.toFixed(0)}s/${DURATION_SEC}s] Reqs: ${reqs} | Current Throughput: ${rps} req/s`
    )
  }, 1000)

  await Promise.all(workers)
  clearInterval(ticker)

  const totalDurationSec = (Date.now() - startTime) / 1000
  console.log('\n\n✅ Benchmark Completed!')
  console.log('─'.repeat(75))

  const totalReqs = metrics.length
  const totalSuccess = metrics.filter(m => !m.isError).length
  const totalFailed = metrics.filter(m => m.isError).length
  const totalBytes = metrics.reduce((acc, m) => acc + m.bytes, 0)
  const rps = (totalReqs / totalDurationSec).toFixed(1)
  const throughputMBs = (totalBytes / (1024 * 1024) / totalDurationSec).toFixed(2)

  const durations = metrics.map(m => m.durationMs).sort((a, b) => a - b)
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0
  const p90 = durations[Math.floor(durations.length * 0.9)] || 0
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0
  const mean = durations.reduce((a, b) => a + b, 0) / (durations.length || 1)

  console.log(`🎯 Concurrency CCU  : ${CONCURRENCY} Active Users`)
  console.log(`📦 Total Requests   : ${totalReqs}`)
  console.log(`⚡ Throughput (RPS) : ${rps} req/s`)
  console.log(`🌐 Data Transferred : ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${throughputMBs} MB/s)`)
  console.log(`✅ Success Rate     : ${((totalSuccess / (totalReqs || 1)) * 100).toFixed(2)}% (${totalSuccess} OK / ${totalFailed} Failed)`)
  console.log('─'.repeat(75))
  console.log('📈 Latency Distribution:')
  console.log(`   • Mean Latency   : ${mean.toFixed(2)} ms`)
  console.log(`   • P50 (Median)   : ${p50.toFixed(2)} ms`)
  console.log(`   • P90 Percentile : ${p90.toFixed(2)} ms`)
  console.log(`   • P95 Percentile : ${p95.toFixed(2)} ms`)
  console.log(`   • P99 Percentile : ${p99.toFixed(2)} ms`)
  console.log('═'.repeat(75))
}

main()
