"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SignInPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.")
      return
    }
    setError("")
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      })
      if (!res.ok) {
        setError("Invalid username or password.")
        return
      }
      const data = await res.json()
      if (data.success) {
        if (data.id) {
          localStorage.setItem("userId", data.id.toString());
        }
        router.push("/dashboard")
      } else {
        setError("Invalid username or password.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md border-2 border-purple-200 dark:border-purple-800 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">Sign In</CardTitle>
          <CardDescription>Sign in to access the Quiz Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <Button type="submit" className="w-full" size="lg">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
