"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, BarChart3 } from "lucide-react"
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
              id: p.user_id.toString(),
              name: p.users.username,
              score: p.score || 0,
              streak: p.streak || 0,
              accuracy: p.accuracy || 0,
              answered: p.answered || false,
              timeRemaining: undefined // We'll implement this later
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
    
    // Poll for session updates every 1 second for real-time updates
    const interval = setInterval(fetchSession, 1000)
    return () => clearInterval(interval)
  }, [searchParams])

  const answeredCount = participants.filter((p) => p.answered).length

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
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Questions Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Quiz Questions Preview</CardTitle>
                <CardDescription>All questions in this quiz</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary">Question {index + 1}</Badge>
                        <Badge variant="outline">{question.type}</Badge>
                        <Badge variant="outline">{question.points} pts</Badge>
                      </div>
                      <p className="text-lg font-medium mb-3">{question.question}</p>
                      
                      {question.type === "multiple-choice" && question.options && (
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                              <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === "true-false" && (
                        <div className="flex gap-4">
                          <div className="flex-1 p-2 border rounded bg-gray-50 dark:bg-gray-800 text-center">True</div>
                          <div className="flex-1 p-2 border rounded bg-gray-50 dark:bg-gray-800 text-center">False</div>
                        </div>
                      )}

                      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>Time Limit: {question.timeLimit}s</span>
                        {question.correctAnswer && (
                          <span className="ml-4">Correct Answer: {question.correctAnswer}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Stats */}
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
                        {participants.length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Participants</p>
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
