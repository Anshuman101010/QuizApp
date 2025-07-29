"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, Trophy, Clock, BarChart3 } from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"

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
  const searchParams = useSearchParams()
  const [sessionStatus, setSessionStatus] = useState<"waiting" | "active" | "paused" | "completed">("waiting")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [joinCode, setJoinCode] = useState<string>("")
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch session, participants, and questions on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const code = searchParams.get("code")
        if (!code) {
          setError("No session code provided")
          setLoading(false)
          return
        }

        console.log("Fetching session with code:", code)
        console.log("Current URL:", window.location.href)
        
        // Fetch session details
        const sessionUrl = `/api/sessions?code=${code}`
        console.log("Fetching session from:", sessionUrl)
        
        const res = await fetch(sessionUrl)
        console.log("Session response status:", res.status)
        console.log("Session response ok:", res.ok)
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("Session fetch error:", errorData)
          throw new Error(`Failed to fetch session: ${res.status} ${errorData.error || res.statusText}`)
        }
        
        const data = await res.json()
        console.log("Session data:", data)
        
        setJoinCode(data.session.code)
        setSessionId(data.session.id)
        setSessionStatus(data.session.status)
        
        // Fetch participants
        const participantsUrl = `/api/sessions/participants?code=${data.session.code}`
        console.log("Fetching participants from:", participantsUrl)
        
        const pres = await fetch(participantsUrl)
        console.log("Participants response status:", pres.status)
        
        if (pres.ok) {
          const pdata = await pres.json()
          console.log("Participants data:", pdata)
          setParticipants(
            pdata.participants.map((p: any) => ({
              id: p.users.id,
              name: p.users.username,
              score: p.score,
              streak: p.streak,
              accuracy: p.accuracy,
              answered: false // TODO: update with real answer status
            }))
          )
        } else {
          console.error("Failed to fetch participants:", pres.status, pres.statusText)
        }

        // Fetch questions for this session
        const questionsUrl = `/api/sessions/questions?code=${data.session.code}`
        console.log("Fetching questions from:", questionsUrl)
        
        const qres = await fetch(questionsUrl)
        console.log("Questions response status:", qres.status)
        console.log("Questions response ok:", qres.ok)
        
        if (qres.ok) {
          const qdata = await qres.json()
          console.log("Questions data:", qdata)
          console.log("Number of questions:", qdata.questions?.length || 0)
          
          // Transform the database questions to match our interface
          const transformedQuestions: Question[] = qdata.questions.map((q: any) => ({
            id: q.id.toString(),
            question: q.question,
            type: q.type === 'multiple_choice' ? 'multiple-choice' : 
                  q.type === 'true_false' ? 'true-false' : 'short-answer',
            options: q.options?.map((opt: any) => opt.option_text) || [],
            correctAnswer: q.correct_answer || '',
            timeLimit: q.time_limit || 30,
            points: q.points || 100,
          }))
          console.log("Transformed questions:", transformedQuestions)
          setQuestions(transformedQuestions)
        } else {
          const errorData = await qres.json().catch(() => ({}))
          console.error("Failed to fetch questions:", qres.status, errorData)
          throw new Error(`Failed to fetch questions: ${qres.status} ${errorData.error || qres.statusText}`)
        }
        
        setLoading(false)
        setError(null)
        console.log("Session fetch completed successfully")
      } catch (err) {
        console.error("Error in fetchSession:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }
    
    fetchSession()
    // Poll for new participants every 2 seconds
    const interval = setInterval(fetchSession, 2000)
    return () => clearInterval(interval)
  }, [searchParams])

  const currentQuestion = questions[currentQuestionIndex]

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

  const handleStartSession = async () => {
    setSessionStatus("active")
    setTimeRemaining(currentQuestion?.timeLimit || 30)
    // Update session status in backend
    if (joinCode) {
      await fetch("/api/sessions/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, status: "active" })
      })
    }
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
  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-lg">Loading quiz session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Session</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Questions Found</h1>
          <p className="text-gray-600 dark:text-gray-400">This quiz doesn't have any questions yet.</p>
        </div>
      </div>
    )
  }

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
            {sessionStatus !== "waiting" && currentQuestion && (
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

                    {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
                      <div className="grid grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => (
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
                    <Progress value={participants.length > 0 ? (answeredCount / participants.length) * 100 : 0} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {participants.length > 0 ? Math.round((answeredCount / participants.length) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Responded</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {currentQuestion ? Math.round((timeRemaining / currentQuestion.timeLimit) * 100) : 0}%
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
