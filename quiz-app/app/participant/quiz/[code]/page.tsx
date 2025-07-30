"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Question {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  timeLimit: number
  points: number
  correct_answer?: string | number
}

interface PlayerStats {
  score: number
  streak: number
  accuracy: number
  position: number
  totalAnswered: number
  correctAnswers: number
}

export default function ParticipantQuiz() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerName = searchParams.get("name") || "Anonymous"
  const quizCode = params.code as string

  const [gameState, setGameState] = useState<"waiting" | "active" | "answered" | "results" | "completed">("waiting")
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [powerUps, setPowerUps] = useState({ fiftyFifty: 1, extraTime: 1, doublePoints: 1 })
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null)

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    score: 0,
    streak: 0,
    accuracy: 0,
    position: 1,
    totalAnswered: 0,
    correctAnswers: 0,
  })

  const [proctorViolations, setProctorViolations] = useState(0)
  const [showProctorModal, setShowProctorModal] = useState(false)
  const [proctorTimer, setProctorTimer] = useState(10)
  const proctorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const violationTriggeredRef = useRef(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [participants, setParticipants] = useState<Array<{id: string, name: string, score: number}>>([])
  
  // New state for quiz termination
  const [showTerminationModal, setShowTerminationModal] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<string>("waiting")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

  // Check if participant is already in session
  useEffect(() => {
    async function checkSessionStatus() {
      try {
        const res = await fetch(`/api/sessions?code=${quizCode}`)
        if (res.ok) {
          const data = await res.json()
          console.log("Session info:", data.session)
          
          // Check if current user is already a participant
          const isParticipant = data.session.session_participants?.some((p: any) => 
            p.users && p.users.username === playerName
          ) || false
          
          if (!isParticipant) {
            console.log("User not in session, attempting to join...")
            // Try to join the session
            const joinRes = await fetch('/api/sessions/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: quizCode, username: playerName })
            })
            
            if (joinRes.ok) {
              console.log("Successfully joined session")
            } else {
              const errorData = await joinRes.json().catch(() => ({}))
              console.log("Join error:", errorData)
              // If session has already started, that's okay - we can still participate
              if (errorData.error === 'Session has already started') {
                console.log("Session already started, but continuing...")
              } else {
                toast({ title: 'Failed to join session', description: errorData.error || 'Please try again.' })
              }
            }
          } else {
            console.log("User already in session")
          }
        }
      } catch (error) {
        console.error("Error checking session status:", error)
      }
    }
    
    checkSessionStatus()
  }, [quizCode, playerName])

  // Fetch questions for this session on mount
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/sessions/questions?code=${quizCode}`)
        if (res.ok) {
          const data = await res.json()
          console.log("Fetched questions:", data.questions)
          
          // Process questions to match the expected format
          const processedQuestions = data.questions.map((q: any) => {
            console.log("Processing question:", q)
            console.log("Question options:", q.options)
            
            // Sort options by option_index to maintain order
            const sortedOptions = q.options ? q.options.sort((a: any, b: any) => a.option_index - b.option_index) : []
            console.log("Sorted options:", sortedOptions)
            
            const processedQuestion = {
              id: q.id.toString(),
              question: q.question,
              type: q.type,
              options: sortedOptions.map((opt: any) => opt.option_text),
              timeLimit: q.time_limit || 30,
              points: q.points || 100,
              correct_answer: q.correct_answer
            }
            
            console.log("Processed question:", processedQuestion)
            return processedQuestion
          })
          
          console.log("Processed questions:", processedQuestions)
          setQuestions(processedQuestions)
        } else {
          console.error("Failed to fetch questions:", res.status, res.statusText)
          const errorData = await res.json().catch(() => ({}))
          console.error("Error data:", errorData)
          toast({ title: 'Failed to load questions', description: errorData.error || 'Please try again.' })
        }
      } catch (error) {
        console.error("Error fetching questions:", error)
        toast({ title: 'Failed to load questions', description: 'Please try again.' })
      }
    }
    fetchQuestions()
  }, [quizCode])

  // Fetch participants for this session
  useEffect(() => {
    async function fetchParticipants() {
      try {
        const res = await fetch(`/api/sessions/participants?code=${quizCode}`)
        if (res.ok) {
          const data = await res.json()
          console.log("Fetched participants:", data.participants)
          setParticipants(
            data.participants.map((p: any) => ({
              id: p.users.id.toString(),
              name: p.users.username,
              score: p.score || 0
            }))
          )
        } else {
          console.error("Failed to fetch participants:", res.status, res.statusText)
        }
      } catch (error) {
        console.error("Error fetching participants:", error)
      }
    }
    fetchParticipants()
    // Poll for new participants every 3 seconds
    const interval = setInterval(fetchParticipants, 3000)
    return () => clearInterval(interval)
  }, [quizCode])

  // Real-time session status monitoring using Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const baseDelay = 1000 // 1 second

    const setupEventSource = () => {
      try {
        console.log('Setting up SSE connection for session:', quizCode)
        setConnectionStatus("connecting")
        eventSource = new EventSource(`/api/sessions/events?code=${quizCode}`)

        eventSource.onopen = () => {
          console.log('SSE connection established')
          setConnectionStatus("connected")
          reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('SSE event received:', data)

            if (data.type === 'session_update') {
              const sessionStatus = data.session.status
              const quizStatus = data.session.quiz_status
              
              console.log(`Session status: ${sessionStatus}, Quiz status: ${quizStatus}`)
              setSessionStatus(sessionStatus)
              
              // Start the quiz when session becomes active
              if (sessionStatus === "active" && gameState === "waiting" && questions.length > 0) {
                console.log("Session is now active, starting quiz...")
                console.log("Current state:", { sessionStatus, gameState, questionsLength: questions.length, questionIndex })
                setCurrentQuestion(questions[0])
                setGameState("active")
                setTimeRemaining(questions[0].timeLimit)
                setQuestionIndex(0)
              } else {
                console.log("Not starting quiz:", { sessionStatus, gameState, questionsLength: questions.length })
              }
              
              // Check for termination conditions
              if ((sessionStatus === "completed" || quizStatus === "terminated") && !showTerminationModal) {
                console.log("Quiz terminated detected via SSE! Showing termination modal...")
                setShowTerminationModal(true)
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                  console.log("Redirecting to dashboard...")
                  router.push("/dashboard")
                }, 2000)
              }
            } else if (data.type === 'error') {
              console.error('SSE error:', data.message)
              setConnectionStatus("disconnected")
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error)
          setConnectionStatus("disconnected")
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = baseDelay * Math.pow(2, reconnectAttempts)
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)
            
            setTimeout(() => {
              if (eventSource) {
                eventSource.close()
                reconnectAttempts++
                setupEventSource()
              }
            }, delay)
          } else {
            console.log('Max reconnection attempts reached, falling back to polling')
            setupPolling()
          }
        }
      } catch (error) {
        console.error('Error setting up SSE:', error)
        setConnectionStatus("disconnected")
        // Fallback to polling if SSE fails
        console.log('Falling back to polling...')
        setupPolling()
      }
    }

    // Fallback polling function
    const setupPolling = () => {
      console.log('Using polling fallback for session status')
      setConnectionStatus("disconnected")
      
      const checkSessionStatus = async () => {
        try {
          const res = await fetch(`/api/sessions?code=${quizCode}`)
          if (res.ok) {
            const data = await res.json()
            const status = data.session.status
            console.log(`Polling - Session status: ${status}`)
            setSessionStatus(status)
            
            // Start the quiz when session becomes active
            if (status === "active" && gameState === "waiting" && questions.length > 0) {
              console.log("Session is now active (polling), starting quiz...")
              console.log("Current state:", { status, gameState, questionsLength: questions.length, questionIndex })
              setCurrentQuestion(questions[0])
              setGameState("active")
              setTimeRemaining(questions[0].timeLimit)
              setQuestionIndex(0)
            } else {
              console.log("Not starting quiz (polling):", { status, gameState, questionsLength: questions.length })
            }
            
            if (status === "completed" && !showTerminationModal) {
              console.log("Quiz terminated detected via polling! Showing termination modal...")
              setShowTerminationModal(true)
              setTimeout(() => {
                console.log("Redirecting to dashboard...")
                router.push("/dashboard")
              }, 2000)
            }
          }
        } catch (error) {
          console.error("Error polling session status:", error)
        }
      }

      // Check immediately and then every 1 second
      checkSessionStatus()
      const interval = setInterval(checkSessionStatus, 1000)
      
      return () => clearInterval(interval)
    }

    // Start SSE connection
    setupEventSource()

    // Cleanup function
    return () => {
      if (eventSource) {
        console.log('Closing SSE connection')
        eventSource.close()
      }
    }
  }, [quizCode, showTerminationModal, router, gameState, questions])

  // When moving to next question, update currentQuestion
  useEffect(() => {
    console.log("Question progression useEffect triggered:", { questionIndex, questionsLength: questions.length, gameState })
    if (questions.length > 0 && questionIndex < questions.length && gameState === "waiting") {
      console.log(`Moving to question ${questionIndex + 1}/${questions.length}`)
      const question = questions[questionIndex]
      console.log("Setting current question:", question)
      setCurrentQuestion(question)
      setTimeRemaining(question.timeLimit)
      setGameState("active")
    }
  }, [questionIndex, questions, gameState])

  // Handle next question manually
  const handleNextQuestion = () => {
    console.log("handleNextQuestion called, current questionIndex:", questionIndex)
    if (questionIndex < questions.length - 1) {
      const nextIndex = questionIndex + 1
      console.log(`Manually moving to next question: ${nextIndex + 1}/${questions.length}`)
      setQuestionIndex(nextIndex)
      setGameState("waiting")
      setSelectedAnswer(null)
      setCurrentQuestion(null)
      setShowFeedback(false)
      setIsCorrect(false)
      
      // Set the next question after a brief delay
      setTimeout(() => {
        if (nextIndex < questions.length) {
          console.log("Setting next question:", questions[nextIndex])
          setCurrentQuestion(questions[nextIndex])
          setGameState("active")
          setTimeRemaining(questions[nextIndex].timeLimit)
        }
      }, 100)
    } else {
      console.log("All questions completed!")
      setGameState("completed")
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === "active" && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    } else if (timeRemaining === 0 && gameState === "active") {
      handleTimeUp()
    }
    return () => clearInterval(interval)
  }, [gameState, timeRemaining])

  const usePowerUp = (powerUp: string) => {
    if (powerUps[powerUp as keyof typeof powerUps] <= 0 || gameState !== "active") return

    setPowerUps((prev) => ({
      ...prev,
      [powerUp]: prev[powerUp as keyof typeof prev] - 1,
    }))

    switch (powerUp) {
      case "fiftyFifty":
        // Remove two wrong answers (mock implementation)
        break
      case "extraTime":
        setTimeRemaining((prev) => prev + 15)
        break
      case "doublePoints":
        setActivePowerUp("doublePoints")
        break
    }
  }

  const handleAnswerSelect = (answer: string | number) => {
    if (gameState !== "active") return
    setSelectedAnswer(answer)
    
    // Immediately submit answer without delay, passing the answer directly
    handleSubmitAnswer(answer)
  }

  const handleSubmitAnswer = (answer?: string | number) => {
    const answerToUse = answer !== undefined ? answer : selectedAnswer
    if (answerToUse === null || gameState !== "active") return
    setGameState("answered")
    
    // Check if answer is correct
    let correct = false
    if (currentQuestion?.type === "multiple-choice" || currentQuestion?.type === "multiple_choice") {
      // For multiple choice, selectedAnswer is the index, correct_answer is the text
      const selectedOption = currentQuestion.options?.[answerToUse as number]
      correct = selectedOption === currentQuestion.correct_answer
    } else if (currentQuestion?.type === "true-false" || currentQuestion?.type === "true_false") {
      correct = answerToUse === currentQuestion.correct_answer
    } else if (currentQuestion?.type === "short-answer" || currentQuestion?.type === "short_answer") {
      correct = String(answerToUse).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
    }
    
    console.log("Answer check:", { answerToUse, correct_answer: currentQuestion?.correct_answer, correct })
    setIsCorrect(correct)
    setShowFeedback(true)

    // Calculate score with bonuses
    let points = 0
    if (correct) {
      points = currentQuestion!.points

      // Time bonus (up to 50% extra points)
      const timeBonus = Math.floor((timeRemaining / currentQuestion!.timeLimit) * 0.5 * points)
      points += timeBonus

      // Streak multiplier
      if (playerStats.streak > 0) {
        points = Math.floor(points * (1 + playerStats.streak * 0.1))
      }

      // Double points power-up
      if (activePowerUp === "doublePoints") {
        points *= 2
        setActivePowerUp(null)
      }

      setPlayerStats((prev) => ({
        ...prev,
        score: prev.score + points,
        streak: prev.streak + 1,
        correctAnswers: prev.correctAnswers + 1,
        totalAnswered: prev.totalAnswered + 1,
        accuracy: Math.round(((prev.correctAnswers + 1) / (prev.totalAnswered + 1)) * 100),
      }))
    } else {
      setPlayerStats((prev) => ({
        ...prev,
        streak: 0,
        totalAnswered: prev.totalAnswered + 1,
        accuracy: Math.round((prev.correctAnswers / (prev.totalAnswered + 1)) * 100),
      }))
    }

    // Show feedback for 1 second then automatically move to next question
    setTimeout(() => {
      setShowFeedback(false)
      setSelectedAnswer(null)
      
      // Automatically move to next question immediately
      if (questionIndex < questions.length - 1) {
        handleNextQuestion()
      } else {
        setGameState("completed")
      }
    }, 1000)
  }

  const handleTimeUp = () => {
    console.log("Time's up! Moving to next question...")
    setGameState("answered")
    setIsCorrect(false)
    setShowFeedback(true)

    setPlayerStats((prev) => ({
      ...prev,
      streak: 0,
      totalAnswered: prev.totalAnswered + 1,
      accuracy: Math.round((prev.correctAnswers / (prev.totalAnswered + 1)) * 100),
    }))

    // Show feedback for 1 second then automatically move to next question
    setTimeout(() => {
      setShowFeedback(false)
      setSelectedAnswer(null)
      
      // Automatically move to next question immediately
      setTimeout(() => {
        if (questionIndex < questions.length - 1) {
          handleNextQuestion()
        } else {
          setGameState("completed")
        }
      }, 1000)
    }, 1000)
  }

  useEffect(() => {
    // Request fullscreen when quiz starts
    if (gameState === "active") {
      const requestFullscreen = async () => {
        try {
          const elem = document.documentElement
          if (elem.requestFullscreen) {
            await elem.requestFullscreen()
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen()
          } else if ((elem as any).msRequestFullscreen) {
            await (elem as any).msRequestFullscreen()
          }
        } catch (error) {
          console.log("Fullscreen request failed:", error)
          // Don't show error to user, just continue without fullscreen
        }
      }
      
      // Add a small delay to ensure the page is fully loaded
      setTimeout(requestFullscreen, 500)
    }
    // Exit fullscreen when quiz ends
    if (gameState === "completed" || gameState === "waiting") {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.log)
      }
    }
  }, [gameState])

  // Proctoring event handler
  useEffect(() => {
    let fullscreenRequestInProgress = false
    
    function triggerProctorViolation() {
      if (violationTriggeredRef.current || fullscreenRequestInProgress) return; // Prevent double trigger
      violationTriggeredRef.current = true;
      
      console.log("Proctoring violation detected!")
      setProctorViolations((prev) => {
        const newCount = prev + 1
        console.log(`Violation count: ${newCount}`)
        
        if (newCount >= 3) {
          console.log("Max violations reached, redirecting to disqualified page")
          router.replace("/participant/quiz/disqualified");
          return newCount
        } else {
          console.log("Showing proctor modal")
          setShowProctorModal(true)
          return newCount
        }
      })
    }
    
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && gameState === "active") {
        console.log("Tab/window hidden - proctoring violation")
        triggerProctorViolation()
      }
    }
    
    function handleBlur() {
      if (gameState === "active") {
        console.log("Window lost focus - proctoring violation")
        triggerProctorViolation()
      }
    }
    
    function handleFullscreenChange() {
      // Add a small delay to prevent false triggers during fullscreen entry
      setTimeout(() => {
        if (!document.fullscreenElement && gameState === "active" && !fullscreenRequestInProgress) {
          console.log("Exited fullscreen - proctoring violation")
          triggerProctorViolation()
        }
      }, 500)
    }
    
    // Start proctoring immediately when quiz becomes active
    if (gameState === "active") {
      console.log("Starting proctoring system for quiz...")
      
      // Set flag when requesting fullscreen
      fullscreenRequestInProgress = true
      setTimeout(() => {
        fullscreenRequestInProgress = false
        console.log("Fullscreen establishment period ended, proctoring fully active")
      }, 2000) // Allow 2 seconds for fullscreen to be established
      
      // Add event listeners immediately
      window.addEventListener("blur", handleBlur)
      document.addEventListener("visibilitychange", handleVisibilityChange)
      document.addEventListener("fullscreenchange", handleFullscreenChange)
      
      console.log("Proctoring event listeners added")
      
      return () => {
        console.log("Removing proctoring event listeners")
        window.removeEventListener("blur", handleBlur)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        document.removeEventListener("fullscreenchange", handleFullscreenChange)
      }
    } else {
      console.log("Quiz not active, proctoring disabled. Game state:", gameState)
    }
  }, [gameState, router])

  // Proctoring modal logic (force quit site when timer runs out or after 2 warnings)
  useEffect(() => {
    if (showProctorModal) {
      setProctorTimer(10)
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current)
      proctorIntervalRef.current = setInterval(() => {
        setProctorTimer((prev) => {
          if (prev <= 1) {
            clearInterval(proctorIntervalRef.current!)
            setShowProctorModal(false)
            // Force quit site when timer runs out
            router.replace("/participant/quiz/disqualified");
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current)
      }
      violationTriggeredRef.current = false; // Allow future triggers
    }
    return () => {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current)
      }
    }
  }, [showProctorModal, proctorViolations])

  // Resume exam handler
  function handleResumeExam() {
    setShowProctorModal(false)
    // Re-enter fullscreen
    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen()
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen()
        }
      } catch (error) {
        console.log("Fullscreen request failed on resume:", error)
        // Continue without fullscreen if permission denied
      }
    }
    requestFullscreen()
  }

  // Only show game content if questions are loaded
  if (questions.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg flex items-center gap-2 animate-pulse">
              <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
              <span>{playerName}</span>
            </h1>
            <p className="text-balance">Quiz Code: {quizCode}</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="animate-pulse">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">Loading quiz...</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Please wait while we load the quiz questions.
                  </p>
                  
                  {/* Participants List */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Participants ({participants.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {participants.length > 0 ? (
                        participants.map((participant, index) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{participant.name}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {participant.score} pts
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 py-4">
                          No participants yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {showProctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Proctoring Violation</h2>
            <p className="mb-2">
              You exited fullscreen or switched tabs/windows.<br />
              <span className="text-sm text-gray-600">Violation {proctorViolations} of 3</span>
            </p>
            <p className="mb-4 text-sm">
              You must resume the exam within <span className="font-bold text-red-600">{proctorTimer}</span> seconds or the exam will close.
            </p>
            <Button onClick={handleResumeExam} className="mt-2">Resume Exam</Button>
          </div>
        </div>
      )}
      {showTerminationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-red-600">Quiz Terminated</h2>
            <p className="mb-4">
              The quiz has been terminated by the host. You will be redirected to the dashboard in 2 seconds.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you are not redirected, please click the button below.
            </p>
            <Button onClick={() => router.push("/dashboard")} className="mt-2">Go to Dashboard</Button>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg flex items-center gap-2 animate-pulse">
              <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
              <span>One Chance</span>
            </h1>
            <p className="text-balance">Player: {playerName} | Quiz Code: {quizCode}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Session Status: <span className="font-medium capitalize">{sessionStatus}</span>
              <span className="ml-4">
                Connection: 
                <span className={`ml-1 font-medium ${
                  connectionStatus === "connected" ? "text-green-600" :
                  connectionStatus === "connecting" ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {connectionStatus === "connected" ? "🟢 Live" :
                   connectionStatus === "connecting" ? "🟡 Connecting..." :
                   "🔴 Disconnected"}
                </span>
                {connectionStatus === "disconnected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6 px-2 text-xs"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                )}
              </span>
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            #{playerStats.position}
          </Badge>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{playerStats.score}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {playerStats.streak > 0 && "🔥"} {playerStats.streak}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{playerStats.accuracy}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">#{playerStats.position}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Rank</div>
            </CardContent>
          </Card>
        </div>

        {/* Power-ups */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Power-ups</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPowerUps((prev) => ({ ...prev, fiftyFifty: prev.fiftyFifty - 1 }))}
                  disabled={powerUps.fiftyFifty <= 0 || gameState !== "active"}
                >
                  50/50 ({powerUps.fiftyFifty})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPowerUps((prev) => ({ ...prev, extraTime: prev.extraTime - 1 }))}
                  disabled={powerUps.extraTime <= 0 || gameState !== "active"}
                >
                  +Time ({powerUps.extraTime})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePowerUp("doublePoints")}
                  disabled={powerUps.doublePoints <= 0 || gameState !== "active"}
                  className={activePowerUp === "doublePoints" ? "bg-yellow-100 dark:bg-yellow-900" : ""}
                >
                  2x Points ({powerUps.doublePoints})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Content */}
        <div className="max-w-2xl mx-auto">
          {gameState === "waiting" && (
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="animate-pulse">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">Waiting for host to start...</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Get ready! The host will start the quiz soon.
                  </p>
                  
                  {/* Participants List */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Participants ({participants.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {participants.length > 0 ? (
                        participants.map((participant, index) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{participant.name}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {participant.score} pts
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 py-4">
                          No participants yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(gameState === "active" || gameState === "answered") && currentQuestion && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Quiz Content */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Question {questionIndex + 1} of {questions.length}</CardTitle>
                      <div className="flex items-center gap-4">
                        {activePowerUp === "doublePoints" && <Badge className="bg-yellow-500">2x Points Active!</Badge>}
                        {gameState === "active" && (
                          <div className="flex items-center gap-2 text-lg font-bold">
                            <Clock className="w-5 h-5" />
                            {timeRemaining}s
                          </div>
                        )}
                      </div>
                    </div>
                    {gameState === "active" && (
                      <Progress value={(timeRemaining / currentQuestion.timeLimit) * 100} className="h-2" />
                    )}
                  </CardHeader>
                  <CardContent>
                    {!showFeedback ? (
                      <div className="space-y-6">
                        <p className="text-lg font-medium">{currentQuestion.question}</p>

                        {currentQuestion.type === "multiple-choice" || currentQuestion.type === "multiple_choice" ? (
                          <div className="space-y-3">
                            {currentQuestion.options && currentQuestion.options.length > 0 ? (
                              currentQuestion.options.map((option, index) => (
                                <Button
                                  key={index}
                                  variant={selectedAnswer === index ? "default" : "outline"}
                                  className="w-full justify-start text-left h-auto p-4"
                                  onClick={() => handleAnswerSelect(index)}
                                  disabled={gameState !== "active"}
                                >
                                  <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                                  {option}
                                </Button>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <p>No options available for this question.</p>
                                <p className="text-sm">Please contact the host.</p>
                              </div>
                            )}
                          </div>
                        ) : currentQuestion.type === "true-false" || currentQuestion.type === "true_false" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <Button
                              variant={selectedAnswer === "true" ? "default" : "outline"}
                              className="h-16 text-lg"
                              onClick={() => handleAnswerSelect("true")}
                              disabled={gameState !== "active"}
                            >
                              True
                            </Button>
                            <Button
                              variant={selectedAnswer === "false" ? "default" : "outline"}
                              className="h-16 text-lg"
                              onClick={() => handleAnswerSelect("false")}
                              disabled={gameState !== "active"}
                            >
                              False
                            </Button>
                          </div>
                        ) : currentQuestion.type === "short-answer" || currentQuestion.type === "short_answer" ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Enter your answer..."
                              value={selectedAnswer as string || ""}
                              onChange={(e) => handleAnswerSelect(e.target.value)}
                              disabled={gameState !== "active"}
                              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                            />
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <p>Unknown question type: {currentQuestion.type}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Points: {currentQuestion.points}
                            {activePowerUp === "doublePoints" && " × 2"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div
                          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                            isCorrect ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <h3 className="text-xl font-semibold">
                          {isCorrect ? "Correct!" : "Incorrect"}
                        </h3>
                        {isCorrect && (
                          <div className="space-y-2">
                            <p className="text-lg">
                              +{Math.floor(currentQuestion.points * (1 + playerStats.streak * 0.1))} points
                            </p>
                            {playerStats.streak > 1 && (
                              <p className="text-sm text-orange-600">🔥 Streak bonus: {playerStats.streak}x</p>
                            )}
                          </div>
                        )}
                        <p className="text-gray-600 dark:text-gray-400">Moving to next question...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Participants Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Participants ({participants.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {participants.length > 0 ? (
                        participants.map((participant, index) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <span className="text-sm font-medium truncate">{participant.name}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {participant.score} pts
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 py-4 text-center text-sm">
                          No participants yet...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {gameState === "completed" && (
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold">Quiz Completed!</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Congratulations! You have completed all questions.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-md mx-auto">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{playerStats.score}</div>
                      <div className="text-sm text-gray-600">Total Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{playerStats.correctAnswers}</div>
                      <div className="text-sm text-gray-600">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{playerStats.accuracy}%</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{playerStats.streak}</div>
                      <div className="text-sm text-gray-600">Best Streak</div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={() => router.push("/dashboard")}>
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
