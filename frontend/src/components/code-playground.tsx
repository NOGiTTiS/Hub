"use client"

import React, { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Code2,
  Terminal,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

// Dynamic import for Monaco to prevent SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2 font-mono text-xs">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      กำลังโหลด Monaco Code Editor...
    </div>
  ),
})

interface CodePlaygroundProps {
  initialCode?: string
  title?: string
  readOnly?: boolean
}

declare global {
  interface Window {
    loadPyodide?: any
    pyodide?: any
  }
}

export function CodePlayground({
  initialCode = `# พื้นฐานไวยากรณ์ภาษา Python 🐍
# ลองพิมพ์และกดปุ่ม "รันโค้ด (Run)" ด้านบน

def greet(name):
    return f"ยินดีต้อนรับคุณ {name} สู่ TUNorth-Hub!"

print("--- เริ่มต้นการทำงาน ---")
message = greet("นักเรียน ม.ปลาย")
print(message)

# ตัวอย่างการคำนวณ
scores = [85, 92, 78, 95, 88]
avg_score = sum(scores) / len(scores)
print(f"คะแนนเฉลี่ย: {avg_score:.2f} คะแนน")
`,
  title = "Interactive Python Playground (WebAssembly)",
  readOnly = false,
}: CodePlaygroundProps) {
  const [code, setCode] = useState<string>(initialCode)
  const [output, setOutput] = useState<string>("")
  const [isLoadingPyodide, setIsLoadingPyodide] = useState<boolean>(false)
  const [isPyodideReady, setIsPyodideReady] = useState<boolean>(false)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [hasError, setHasError] = useState<boolean>(false)

  const pyodideRef = useRef<any>(null)

  // Initialize Pyodide on demand or on mount
  useEffect(() => {
    let isMounted = true

    const loadPyodideEngine = async () => {
      if (window.pyodide) {
        pyodideRef.current = window.pyodide
        if (isMounted) setIsPyodideReady(true)
        return
      }

      setIsLoadingPyodide(true)

      // Dynamically load pyodide script if not present
      if (!window.loadPyodide) {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"
        script.async = true
        document.head.appendChild(script)

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Pyodide script"))
        })
      }

      try {
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        })
        window.pyodide = pyodide
        pyodideRef.current = pyodide
        if (isMounted) {
          setIsPyodideReady(true)
          setIsLoadingPyodide(false)
        }
      } catch (err) {
        console.error("Error loading Pyodide:", err)
        if (isMounted) {
          setIsLoadingPyodide(false)
        }
      }
    }

    loadPyodideEngine()

    return () => {
      isMounted = false
    }
  }, [])

  // Handle Code Run
  const handleRunCode = async () => {
    if (!pyodideRef.current) {
      setOutput("⏳ กำลังโหลด Python WebAssembly Engine กรุณารอสักครู่แล้วลองใหม่อีกครั้ง...")
      return
    }

    setIsRunning(true)
    setHasError(false)
    const startTime = performance.now()

    try {
      let outputBuffer = ""
      pyodideRef.current.setStdout({
        batched: (text: string) => {
          outputBuffer += text + "\n"
          setOutput(outputBuffer)
        },
      })
      pyodideRef.current.setStderr({
        batched: (text: string) => {
          outputBuffer += text + "\n"
          setOutput(outputBuffer)
        },
      })
      pyodideRef.current.setStdin({
        stdin: () => {
          const inputVal = window.prompt("🐍 Python input(): กรุณากรอกข้อมูลนำเข้า")
          if (inputVal === null) {
            return ""
          }
          outputBuffer += inputVal + "\n"
          setOutput(outputBuffer)
          return inputVal + "\n"
        },
        isatty: true,
      })

      // Execute python code
      await pyodideRef.current.runPythonAsync(code)

      const endTime = performance.now()
      setExecutionTime(Math.round(endTime - startTime))
      setOutput(outputBuffer || "(โปรแกรมทำงานเสร็จสิ้น - ไม่มีการพิมพ์ผลลัพธ์ออกทางหน้าจอ)")
      setHasError(false)
    } catch (err: any) {
      const endTime = performance.now()
      setExecutionTime(Math.round(endTime - startTime))
      setOutput(err.message || String(err))
      setHasError(true)
    } finally {
      setIsRunning(false)
    }
  }

  const handleResetCode = () => {
    if (confirm("คุณต้องการรีเซ็ตโค้ดกลับเป็นค่าเริ่มต้นของบทเรียนใช่หรือไม่?")) {
      setCode(initialCode)
      setOutput("")
      setExecutionTime(null)
      setHasError(false)
    }
  }

  const handleClearOutput = () => {
    setOutput("")
    setExecutionTime(null)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl text-slate-200">
      {/* PLAYGROUND TOP BAR */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                {title}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Python 3.12 (WASM)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              รันโค้ดโดยตรงบนเบราว์เซอร์ของคุณผ่าน Client-Side WebAssembly ไม่ต้องติดตั้งโปรแกรม
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition"
            title="คัดลอกโค้ด"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition"
            title="รีเซ็ตโค้ดเดิม"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ต
          </button>

          <button
            type="button"
            disabled={isRunning || isLoadingPyodide}
            onClick={handleRunCode}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isLoadingPyodide ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {isLoadingPyodide
              ? "กำลังเตรียม Engine..."
              : isRunning
              ? "กำลังรันโค้ด..."
              : "รันโค้ด (Run)"}
          </button>
        </div>
      </div>

      {/* EDITOR & CONSOLE SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* MONACO CODE EDITOR (COL 1-7) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>main.py</span>
            <span>UTF-8</span>
          </div>

          <div className="h-80 sm:h-96">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "var(--font-mono), Consolas, Courier New, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                readOnly: readOnly,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        {/* TERMINAL / OUTPUT CONSOLE (COL 8-12) */}
        <div className="lg:col-span-5 flex flex-col bg-black/60">
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>Console Output</span>
              {executionTime !== null && (
                <span className="text-[10px] text-slate-500 ml-1">
                  ({executionTime}ms)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearOutput}
              className="p-1 rounded hover:text-white text-slate-400 transition"
              title="ล้าง Console"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          <div className="h-80 sm:h-96 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-2">
            {output ? (
              <div
                className={`whitespace-pre-wrap ${
                  hasError ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {output}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-2 select-none">
                <Terminal className="w-8 h-8 opacity-40" />
                <p className="text-[11px]">กดปุ่ม "รันโค้ด (Run)" เพื่อแสดงผลลัพธ์โปรแกรมที่นี่</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
