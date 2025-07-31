"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Play, X, Trophy, Clock, UserCheck, UserX } from "lucide-react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Participant {
  id: string
  name: string
  joinedAt: string
  status: "waiting" | "ready"
}

export default function HostLobby() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [joinCode, setJoinCode] = useState<string>("")
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState<string>("")
  const [participantCount, setParticipantCount] = useState(0)

  // Fetch session and participants on mount
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
        
        // Fetch session details
        const res = await fetch(`/api/sessions?code=${code}`)
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(`Failed to fetch session: ${res.status} ${errorData.error || res.statusText}`)
        }
        
        const data = await res.json()
        console.log("Session data:", data)
        
        setJoinCode(data.session.code)
        setSessionId(data.session.id)

        // Fetch quiz details
        const quizRes = await fetch(`/api/quizzes/${data.session.quiz_id}`)
        if (quizRes.ok) {
          const quizData = await quizRes.json()
          // Handle both formats: direct quiz object or wrapped in quiz property
          const quiz = quizData.quiz || quizData
          setQuizTitle(quiz?.title || 'Quiz')
        }
        
        // Fetch participants
        const pres = await fetch(`/api/sessions/participants?code=${data.session.code}`)
        if (pres.ok) {
          const pdata = await pres.json()
          console.log("Participants data:", pdata)
          const transformedParticipants = pdata.participants.map((p: any) => ({
            id: p.users.id.toString(),
            name: p.users.username,
            joinedAt: p.joined_at || new Date().toISOString(),
            status: "waiting" as const
          }))
          setParticipants(transformedParticipants)
          setParticipantCount(transformedParticipants.length)
        } else {
          console.error("Failed to fetch participants:", pres.status, pres.statusText)
        }
        
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error in fetchSession:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }
    
    fetchSession()
    // Poll for new participants every 8 seconds (reduced frequency)
    const interval = setInterval(fetchSession, 8000)
    return () => clearInterval(interval)
  }, [searchParams])

  const handleStartQuiz = async () => {
    if (!joinCode) return
    
    try {
      // Update session status to active
      const res = await fetch("/api/sessions/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, status: "active" })
      })
      
      if (res.ok) {
        // Redirect to session page
        router.push(`/host/quiz/${params.id}/session?code=${joinCode}`)
      } else {
        alert("Failed to start quiz")
      }
    } catch (error) {
      console.error("Error starting quiz:", error)
      alert("Failed to start quiz")
    }
  }

  const handleStopQuiz = async () => {
    if (!joinCode) return
    
    if (!confirm("Are you sure you want to stop this quiz session? You can restart it later from the dashboard.")) {
      return
    }
    
    try {
      // First, get the quiz ID from the session
      const sessionRes = await fetch(`/api/sessions?code=${joinCode}`)
      if (!sessionRes.ok) {
        throw new Error("Failed to fetch session details")
      }
      const sessionData = await sessionRes.json()
      const quizId = sessionData.session.quiz_id

      // Update session status to completed
      const sessionUpdateRes = await fetch("/api/sessions/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, status: "completed" })
      })
      
      if (!sessionUpdateRes.ok) {
        throw new Error("Failed to update session status")
      }

      // Update quiz status to stopped
      const quizUpdateRes = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stopped" })
      })
      
      if (!quizUpdateRes.ok) {
        console.warn("Failed to update quiz status, but session was stopped")
      }
      
      // Redirect back to host dashboard
      router.push("/host/dashboard")
    } catch (error) {
      console.error("Error stopping quiz:", error)
      alert("Failed to stop quiz")
    }
  }

  const handleTerminateQuiz = async () => {
    if (!joinCode) return
    
    if (!confirm("Are you sure you want to terminate this quiz session? This action cannot be undone.")) {
      return
    }
    
    try {
      // First, get the quiz ID from the session
      const sessionRes = await fetch(`/api/sessions?code=${joinCode}`)
      if (!sessionRes.ok) {
        throw new Error("Failed to fetch session details")
      }
      const sessionData = await sessionRes.json()
      const quizId = sessionData.session.quiz_id

      // Update session status to completed
      const sessionUpdateRes = await fetch("/api/sessions/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode, status: "completed" })
      })
      
      if (!sessionUpdateRes.ok) {
        throw new Error("Failed to update session status")
      }

      // Update quiz status to terminated
      const quizUpdateRes = await fetch(`/api/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "terminated" })
      })
      
      if (!quizUpdateRes.ok) {
        console.warn("Failed to update quiz status, but session was terminated")
      }
      
      // Redirect back to host dashboard
      router.push("/host/dashboard")
    } catch (error) {
      console.error("Error terminating quiz:", error)
      alert("Failed to terminate quiz")
    }
  }

  const handleCopyCode = async () => {
    try {
      // Try using the modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(joinCode)
        toast({
          title: "Code copied!",
          description: "Join code has been copied to clipboard.",
          variant: "success",
        })
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement("textarea")
        textArea.value = joinCode
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          toast({
            title: "Code copied!",
            description: "Join code has been copied to clipboard.",
            variant: "success",
          })
        } catch (err) {
          console.error('Fallback copy failed:', err)
          // Final fallback - show the code in a toast
          toast({
            title: "Copy failed",
            description: `Join code: ${joinCode}\n\nPlease copy this code manually.`,
            variant: "destructive",
          })
        }
        
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      // Show the code in a toast as final fallback
      toast({
        title: "Copy failed",
        description: `Join code: ${joinCode}\n\nPlease copy this code manually.`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-lg">Loading lobby...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Lobby</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 fade-in-up">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 slide-in-left">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quiz Lobby</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {quizTitle || "Quiz Session"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {participantCount} Participants
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Join Code Card */}
            <Card className="card-hover fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Join Code
                </CardTitle>
                <CardDescription>
                  Share this code with participants to join the quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                      <span className="font-mono text-2xl font-bold text-center block">
                        {joinCode}
                      </span>
                    </div>
                  </div>
                  <Button onClick={handleCopyCode} variant="outline" className="transition-element">
                    Copy Code
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Participants can join by entering this code at the dashboard
                </p>
              </CardContent>
            </Card>

            {/* Participants List */}
            <Card className="card-hover fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({participantCount})
                </CardTitle>
                <CardDescription>
                  Participants who have joined the lobby
                </CardDescription>
              </CardHeader>
              <CardContent>
                {participantCount === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No participants yet</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Share the join code with participants to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                        style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{participant.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 card-hover fade-in-up" style={{ animationDelay: '0.4s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Host Controls
                </CardTitle>
                <CardDescription>Manage the quiz session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Status */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Session Status</span>
                  </div>
                  <Badge variant="default" className="bg-blue-600">
                    Waiting for Participants
                  </Badge>
                </div>

                {/* Participant Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Joined</span>
                    <span className="font-bold">{participantCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ready to Start</span>
                    <span className="font-bold text-green-600">{participantCount}</span>
                  </div>
                </div>

                <Progress value={participantCount > 0 ? 100 : 0} className="h-2" />

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={handleStartQuiz} 
                    className="w-full transition-element" 
                    size="lg"
                    disabled={participantCount === 0}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Quiz
                  </Button>
                  
                  <Button 
                    onClick={handleStopQuiz} 
                    variant="outline" 
                    className="w-full transition-element"
                    size="lg"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Stop Quiz
                  </Button>

                  <Button 
                    onClick={handleTerminateQuiz} 
                    variant="destructive" 
                    className="w-full transition-element"
                    size="lg"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Terminate Quiz
                  </Button>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Instructions</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Share the join code with participants</li>
                    <li>• Wait for participants to join</li>
                    <li>• Click "Start Quiz" when ready</li>
                    <li>• Use "Stop Quiz" to pause and restart later</li>
                    <li>• Use "Terminate Quiz" to end permanently</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 