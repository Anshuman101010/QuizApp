"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, BarChart3, Settings, Users, Trophy, HelpCircle, CheckCircle, RotateCcw, Circle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface Quiz {
  id: string
  title: string
  description: string
  questions: number
  participants: number
  status: "inactive" | "active" | "stopped" | "completed" | "terminated"
  createdAt: string
}

export default function HostDashboard() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingQuiz, setUpdatingQuiz] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuizzes() {
      setLoading(true)
      // Get user ID from localStorage
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        console.error("No user ID found")
        setLoading(false)
        return
      }

      const res = await fetch(`/api/quizzes?userId=${userId}`)
      const data = await res.json()
      
      if (data.error) {
        console.error("Error fetching quizzes:", data.error)
        setLoading(false)
        return
      }

      // Process quizzes - properly map status values
      const processedQuizzes = (data.quizzes || []).map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        questions: q.questions.length,
        participants: 0, // You can update this if you have participant data
        status: q.status || "inactive", // Use the actual status from database
        createdAt: q.created_at ? q.created_at.split("T")[0] : "",
      }))

      setQuizzes(processedQuizzes)
      setLoading(false)
    }
    fetchQuizzes()
  }, [])

  const handleCreateQuiz = () => {
    router.push("/host/create-quiz")
  }

  const handleStartQuiz = async (quizId: string) => {
    setUpdatingQuiz(quizId)
    try {
      // Get hostId from local/session storage
      const hostId = Number(localStorage.getItem("userId"))
      if (!hostId) {
        alert("No host user ID found. Please log in again.")
        return
      }

      // First, update quiz status to active
      const updateRes = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })

      if (!updateRes.ok) {
        throw new Error("Failed to update quiz status")
      }

      // Then create a session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, hostId }),
      })

      if (sessionRes.ok) {
        const data = await sessionRes.json()
        // Update local state
        setQuizzes(prev => prev.map(q => 
          q.id === quizId ? { ...q, status: "active" } : q
        ))
        // Redirect to lobby page with ?code=SESSIONCODE
        router.push(`/host/quiz/${quizId}/lobby?code=${data.session.code}`)
      } else {
        // If session creation fails, revert quiz status
        await fetch(`/api/quizzes/${quizId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        })
        alert("Failed to start session")
      }
    } catch (error) {
      console.error("Error starting quiz:", error)
      alert("Failed to start quiz")
    } finally {
      setUpdatingQuiz(null)
    }
  }

  const handleStopQuiz = async (quizId: string) => {
    setUpdatingQuiz(quizId)
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stopped" }),
      })

      if (res.ok) {
        // Update local state
        setQuizzes(prev => prev.map(q => 
          q.id === quizId ? { ...q, status: "stopped" } : q
        ))
      } else {
        alert("Failed to stop quiz")
      }
    } catch (error) {
      console.error("Error stopping quiz:", error)
      alert("Failed to stop quiz")
    } finally {
      setUpdatingQuiz(null)
    }
  }

  const handleRestartQuiz = async (quizId: string) => {
    setUpdatingQuiz(quizId)
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })

      if (res.ok) {
        // Update local state
        setQuizzes(prev => prev.map(q => 
          q.id === quizId ? { ...q, status: "inactive" } : q
        ))
      } else {
        alert("Failed to restart quiz")
      }
    } catch (error) {
      console.error("Error restarting quiz:", error)
      alert("Failed to restart quiz")
    } finally {
      setUpdatingQuiz(null)
    }
  }

  const handleViewResults = (quizId: string) => {
    router.push(`/host/quiz/${quizId}/results`)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "stopped":
        return "outline"
      case "terminated":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700"
      case "inactive":
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700"
      case "stopped":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
      case "terminated":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-600 dark:text-emerald-400"
      case "inactive":
        return "text-slate-600 dark:text-slate-400"
      case "stopped":
        return "text-amber-600 dark:text-amber-400"
      case "terminated":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-slate-600 dark:text-slate-400"
    }
  }

  return (
    <div className="min-h-screen fade-in-up">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 slide-in-left">
          <div>
            <h1 className="text-3xl font-bold text-glow">Host Dashboard</h1>
            <p className="mt-2 text-balance">Manage your quizzes and view performance analytics</p>
          </div>
          <Button onClick={handleCreateQuiz} size="lg" className="transition-element">
            <Plus className="w-5 h-5 mr-2" />
            Create Quiz
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="card-hover fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizzes.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center scale-in">
                  <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quizzes.filter(q => q.status === "active").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center scale-in">
                  <Play className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stopped Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quizzes.filter(q => q.status === "stopped").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center scale-in">
                  <RotateCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Terminated</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quizzes.filter(q => q.status === "terminated").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center scale-in">
                  <CheckCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes List */}
        <Card className="card-hover fade-in-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Your Quizzes
            </CardTitle>
            <CardDescription>
              Manage and monitor your quiz sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No quizzes yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first quiz to get started
                </p>
                <Button onClick={handleCreateQuiz} className="transition-element">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 card-hover"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {quiz.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{quiz.questions} questions</span>
                        <span>{quiz.participants} participants</span>
                        <span>Created {quiz.createdAt}</span>
                        <Badge className={`${getStatusBadgeStyle(quiz.status)} border`}>
                          {quiz.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {quiz.status === "inactive" && (
                        <Button 
                          onClick={() => handleStartQuiz(quiz.id)} 
                          className="transition-element"
                          disabled={updatingQuiz === quiz.id}
                        >
                          {updatingQuiz === quiz.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Start
                        </Button>
                      )}
                      {quiz.status === "active" && (
                        <>
                          <Button 
                            onClick={() => handleStartQuiz(quiz.id)} 
                            className="transition-element"
                            disabled={updatingQuiz === quiz.id}
                          >
                            {updatingQuiz === quiz.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Continue
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleStopQuiz(quiz.id)} 
                            className="transition-element"
                            disabled={updatingQuiz === quiz.id}
                          >
                            {updatingQuiz === quiz.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Stop
                          </Button>
                        </>
                      )}
                      {quiz.status === "stopped" && (
                        <Button 
                          variant="outline"
                          onClick={() => handleRestartQuiz(quiz.id)} 
                          className="transition-element"
                          disabled={updatingQuiz === quiz.id}
                        >
                          {updatingQuiz === quiz.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          Restart
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="transition-element">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
