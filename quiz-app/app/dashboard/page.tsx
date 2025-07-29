"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Trophy, BarChart3, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef } from "react"

export default function DashboardRoute() {
  const [joinCode, setJoinCode] = useState("")
  const router = useRouter()
  const tiltRef = useRef<HTMLDivElement>(null)

  // 3D tilt effect handlers
  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = x / rect.width
    const py = y / rect.height
    const tiltX = (py - 0.5) * 18 // max 18deg
    const tiltY = (px - 0.5) * -18
    const h1 = el.querySelector('.pro-title') as HTMLElement
    if (h1) {
      h1.style.setProperty('--tilt-x', `${tiltX}deg`)
      h1.style.setProperty('--tilt-y', `${tiltY}deg`)
    }
  }
  const resetTilt = () => {
    const el = tiltRef.current
    if (!el) return
    const h1 = el.querySelector('.pro-title') as HTMLElement
    if (h1) {
      h1.style.setProperty('--tilt-x', `0deg`)
      h1.style.setProperty('--tilt-y', `0deg`)
    }
  }

  const handleHostLogin = () => {
    router.push("/host/dashboard")
  }

  const handleJoinQuiz = () => {
    if (joinCode.trim()) {
      router.push(`/participant/lobby/${joinCode}`)
    }
  }

  return (
    <div className="min-h-screen fade-in-up">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12 slide-in-left">
          <div
            className="relative inline-block group"
            id="one-chance-tilt"
            ref={tiltRef}
            style={{ perspective: '600px' }}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
          >
            <h1
              className="app-title pro-title text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl mb-2"
              tabIndex={0}
            >
              <span className="pro-title-text">One Chance</span>
            </h1>
            <svg
              className="pro-underline absolute left-1/2 -translate-x-1/2 w-[90%] h-6 pointer-events-none"
              viewBox="0 0 300 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: 'hsl(var(--accent))' }}
            >
              <path
                className="pro-underline-path"
                d="M20 18 Q 150 28 280 18"
                stroke="currentColor"
                strokeWidth="3.5"
                fill="transparent"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create engaging quizzes with real-time participation, advanced scoring, and comprehensive analytics
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Host Section */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 card-hover slide-in-left" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 scale-in" style={{ animationDelay: '0.2s' }}>
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-2xl">Quiz Host</CardTitle>
              <CardDescription>
                Create and manage quizzes, control sessions, and view detailed analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span>Create Quizzes</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>View Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span>Real-time Control</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Manage Sessions</span>
                </div>
              </div>
              <Button onClick={handleHostLogin} className="w-full transition-element" size="lg">
                Start as Host
              </Button>
            </CardContent>
          </Card>

          {/* Participant Section */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 card-hover slide-in-right" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 scale-in" style={{ animationDelay: '0.3s' }}>
                <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Participant</CardTitle>
              <CardDescription>Join a quiz session with a code and compete with others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Enter Quiz Code</Label>
                <Input
                  id="joinCode"
                  placeholder="e.g., ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono transition-element"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleJoinQuiz} className="w-full transition-element" size="lg" disabled={!joinCode.trim()}>
                Join Quiz
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="text-center mb-12 fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose One Chance?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Experience the next generation of interactive learning and assessment
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 scale-in">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Interaction</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Live participation with instant feedback and dynamic leaderboards
              </p>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 scale-in">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive insights into performance, trends, and engagement
              </p>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 scale-in">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Edge</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gamified experience with streaks, achievements, and rankings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
