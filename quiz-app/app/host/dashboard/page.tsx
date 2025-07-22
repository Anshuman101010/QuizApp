"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, BarChart3, Settings, Users, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"

interface Quiz {
  id: string
  title: string
  description: string
  questions: number
  participants: number
  status: "draft" | "active" | "completed"
  createdAt: string
}

export default function HostDashboard() {
  const router = useRouter()
  const [quizzes] = useState<Quiz[]>([
    {
      id: "1",
      title: "General Knowledge Quiz",
      description: "Test your knowledge across various topics",
      questions: 15,
      participants: 0,
      status: "draft",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      title: "Science & Technology",
      description: "Advanced questions on science and tech",
      questions: 20,
      participants: 24,
      status: "completed",
      createdAt: "2024-01-10",
    },
  ])

  const handleCreateQuiz = () => {
    router.push("/host/create-quiz")
  }

  const handleStartQuiz = (quizId: string) => {
    router.push(`/host/quiz/${quizId}/session`)
  }

  const handleViewResults = (quizId: string) => {
    router.push(`/host/quiz/${quizId}/results`)
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-glow">Host Dashboard</h1>
            <p className="mt-2 text-balance">Manage your quizzes and view performance analytics</p>
          </div>
          <Button onClick={handleCreateQuiz} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Quiz
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizzes.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quizzes.filter((q) => q.status === "active").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Participants</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quizzes.reduce((sum, quiz) => sum + quiz.participants, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Completion</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">87%</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Quizzes</CardTitle>
            <CardDescription>Manage and monitor your quiz sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{quiz.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          quiz.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : quiz.status === "completed"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {quiz.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{quiz.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{quiz.questions} questions</span>
                      <span>{quiz.participants} participants</span>
                      <span>Created {quiz.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {quiz.status === "draft" && (
                      <Button onClick={() => handleStartQuiz(quiz.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}
                    {quiz.status === "completed" && (
                      <Button variant="outline" onClick={() => handleViewResults(quiz.id)}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Results
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
