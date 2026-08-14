"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, ApiResponse } from "./api"

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  grade_level?: string | null
  classroom?: string | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<ApiResponse<{ user: User }>>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await apiFetch<User>("/api/auth/me")
      if (res.success && res.data) {
        setUser(res.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const res = await apiFetch<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    if (res.success && res.data?.user) {
      setUser(res.data.user)
    }
    setLoading(false)
    return res
  }

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      console.error("Logout error", e)
    } finally {
      setUser(null)
      // Navigate cleanly to /login without any redirect query params
      window.location.href = "/login"
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
