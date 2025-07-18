"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, Trophy, Clock, BarChart3 } from "lucide-react"
import { useParams } from "next/navigation"

interface Participant {
  id: string
  name: string
  score: number
  streak: number
  accuracy: number
  answered: boolean
  timeRemaining?: number
}

interface Question {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  correctAnswer: string | number
  timeLimit: number
  points: number
}

export default function QuizSession() {
  const params = useParams()
  const [sessionStatus, setSessionStatus] = useState<"waiting" | "active" | "paused" | "completed">("waiting")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "Alice Johnson", score: 850, streak: 3, accuracy: 85, answered: true },
    { id: "2", name: "Bob Smith", score: 720, streak: 1, accuracy: 72, answered: true },
    { id: "3", name: "Carol Davis", score: 680, streak: 0, accuracy: 68, answered: false },
    { id: "4", name: "David Wilson", score: 590, streak: 2, accuracy: 59, answered: true },
    { id: "5", name: "Eva Brown", score: 540, streak: 0, accuracy: 54, answered: false },
  ])

  const questions: Question[] = [
    {
      id: "1",
      question: "What is the capital of France?",
      type: "multiple-choice",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      timeLimit: 30,
      points: 100,
    },
    {
      id: "2",
      question: "The Earth is flat.",
      type: "true-false",
      correctAnswer: "false",
      timeLimit: 20,
      points: 100,
    },
  ]

  const currentQuestion = questions[currentQuestionIndex]
  const joinCode = "ABC123"

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (sessionStatus === "active" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    } else if (timeRemaining === 0 && sessionStatus === "active") {
      handleNextQuestion()
    }
    return () => clearInterval(interval)
  }, [sessionStatus, timeRemaining])

  const handleStartSession = () => {
    setSessionStatus("active")
    setTimeRemaining(currentQuestion.timeLimit)
  }

  const handlePauseSession = () => {
    setSessionStatus("paused")
  }

  const handleResumeSession = () => {
    setSessionStatus("active")
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setTimeRemaining(questions[currentQuestionIndex + 1].timeLimit)
      // Reset participant answered status
      setParticipants((prev) => prev.map((p) => ({ ...p, answered: false })))
    } else {
      setSessionStatus("completed")
    }
  }

  const answeredCount = participants.filter((p) => p.answered).length
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quiz Session</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Join Code: <span className="font-mono font-bold text-lg">{joinCode}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {participants.length} Participants
            </Badge>
            {sessionStatus === "waiting" && (
              <Button onClick={handleStartSession} size="lg">
                <Play className="w-5 h-5 mr-2" />
                Start Quiz
              </Button>
            )}
            {sessionStatus === "active" && (
              <div className="flex gap-2">
                <Button onClick={handlePauseSession} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleNextQuestion}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Next
                </Button>
              </div>
            )}
            {sessionStatus === "paused" && (
              <Button onClick={handleResumeSession}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(progressPercentage)}% Complete
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </CardContent>
            </Card>

            {/* Current Question */}
            {sessionStatus !== "waiting" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Current Question</CardTitle>
                    {sessionStatus === "active" && (
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Clock className="w-5 h-5" />
                        {timeRemaining}s
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-lg font-medium">{currentQuestion.question}</p>

                    {currentQuestion.type === "multiple-choice" && (
                      <div className="grid grid-cols-2 gap-3">
                        {currentQuestion.options?.map((option, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                          </div>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === "true-false" && (
                      <div className="flex gap-4">
                        <div className="flex-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-center">True</div>
                        <div className="flex-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                          False
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Points: {currentQuestion.points}</span>
                      <span>Time Limit: {currentQuestion.timeLimit}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Response Stats */}
            {sessionStatus === "active" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Response Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Responses Received</span>
                      <span className="font-bold">
                        {answeredCount} / {participants.length}
                      </span>
                    </div>
                    <Progress value={(answeredCount / participants.length) * 100} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round((answeredCount / participants.length) * 100)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Responded</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round((timeRemaining / currentQuestion.timeLimit) * 100)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Time Left</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {participants.reduce((sum, p) => sum + p.streak, 0)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Streaks</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Live Leaderboard
                </CardTitle>
                <CardDescription>Real-time participant rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants
                    .sort((a, b) => b.score - a.score)
                    .map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          index === 0
                            ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                            : "bg-gray-50 dark:bg-gray-800"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-500 text-white"
                              : index === 1
                                ? "bg-gray-400 text-white"
                                : index === 2
                                  ? "bg-orange-400 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{participant.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>{participant.score} pts</span>
                            {participant.streak > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                🔥 {participant.streak}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              participant.answered
                                ? "bg-green-500"
                                : sessionStatus === "active"
                                  ? "bg-yellow-500"
                                  : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
