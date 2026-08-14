export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export function getMediaUrl(path?: string): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`

  const isFormData = options.body instanceof FormData

  const defaultHeaders: HeadersInit = {
    Accept: "application/json",
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
  }

  const mergedOptions: RequestInit = {
    ...options,
    credentials: "include", // send/receive HttpOnly cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, mergedOptions)
    
    // Check if response is json
    const contentType = response.headers.get("content-type")
    let data: any = null
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || `HTTP ${response.status}: เกิดข้อผิดพลาดในการเชื่อมต่อ`,
        data: data?.data,
      }
    }

    return data
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้",
    }
  }
}
