"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, Trophy, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Question {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "matching-pairs" | "ordering"
  options?: string[]
  timeLimit: number
  points: number
  correct_answer?: string | number
  // New fields for different question types
  matchingPairs?: Array<{ left: string; right: string }>
  orderingItems?: string[]
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
  // State to track which options are hidden by fiftyFifty
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([])
  
  // State for new question types
  const [matchingAnswers, setMatchingAnswers] = useState<{[key: number]: number}>({})
  const [orderingAnswers, setOrderingAnswers] = useState<string[]>([])
  const [selectedLeftItem, setSelectedLeftItem] = useState<number | null>(null)

  // Optimized reverse lookup for matching answers to improve performance
  const matchedRightItems = useMemo(() => {
    return new Set(Object.values(matchingAnswers))
  }, [matchingAnswers])

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
              correct_answer: q.correct_answer,
              // Add new question type data
              matchingPairs: q.matching_pairs?.map((pair: any) => ({ left: pair.left_item, right: pair.right_item })) || [],
              orderingItems: q.ordering_items?.map((item: any) => item.item_text) || [],
            }
            
            console.log("Raw question type from DB:", q.type)
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
                
                // Always start from question 1 for proctoring
                const startIndex = 0
                
                console.log(`Starting quiz from question ${startIndex + 1} (always start from first question)`)
                
                setQuestionIndex(startIndex)
                setCurrentQuestion(questions[startIndex])
                setGameState("active")
                setTimeRemaining(questions[startIndex].timeLimit)
                
                // Save the starting question index for proctoring
                saveQuestionProgress(startIndex)
              } else {
                console.log("Not starting quiz:", { sessionStatus, gameState, questionsLength: questions.length })
              }
              
              // Check for termination conditions
              if ((sessionStatus === "completed" || sessionStatus === "paused" || quizStatus === "terminated" || quizStatus === "stopped") && !showTerminationModal) {
                console.log("Quiz terminated/stopped detected via SSE! Showing termination modal...")
                setShowTerminationModal(true)
                // Redirect to review page after 2 seconds
                setTimeout(() => {
                  console.log("Redirecting to review page...")
                  router.push(`/participant/review/${quizCode}?name=${encodeURIComponent(playerName)}`)
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
              
              // Always start from question 1 for proctoring
              const startIndex = 0
              
              setCurrentQuestion(questions[startIndex])
              setGameState("active")
              setTimeRemaining(questions[startIndex].timeLimit)
              setQuestionIndex(startIndex)
              
              // Save the starting question index for proctoring
              saveQuestionProgress(startIndex)
            } else {
              console.log("Not starting quiz (polling):", { status, gameState, questionsLength: questions.length })
            }
            
            if (status === "completed" || status === "paused" && !showTerminationModal) {
              console.log("Quiz terminated/stopped detected via polling! Showing termination modal...")
              setShowTerminationModal(true)
              setTimeout(() => {
                console.log("Redirecting to review page...")
                router.push(`/participant/review/${quizCode}?name=${encodeURIComponent(playerName)}`)
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

  // Auto-redirect when quiz is completed
  useEffect(() => {
    if (gameState === "completed") {
      // Show completion message for 2 seconds, then redirect
      setTimeout(() => {
        router.push(`/participant/review/${quizCode}?name=${encodeURIComponent(playerName)}`)
      }, 2000)
    }
  }, [gameState, quizCode, playerName, router])

  // When moving to next question, update currentQuestion and reset hidden options
  useEffect(() => {
    console.log("Question progression useEffect triggered:", { questionIndex, questionsLength: questions.length, gameState })
    if (questions.length > 0 && questionIndex < questions.length && gameState === "waiting") {
      console.log(`Moving to question ${questionIndex + 1}/${questions.length}`)
      const question = questions[questionIndex]
      console.log("Setting current question:", question)
      setCurrentQuestion(question)
      setTimeRemaining(question.timeLimit)
      setGameState("active")
      setHiddenOptions([])
      setActivePowerUp(null)
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
      
      // Reset new question type state
      setMatchingAnswers({})
      setOrderingAnswers([])
      setSelectedLeftItem(null)
      
      // Save progress for proctoring
      saveQuestionProgress(nextIndex)
      
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

  // Handle skip question (new function)
  const handleSkipQuestion = () => {
    console.log("handleSkipQuestion called, current questionIndex:", questionIndex)
    if (questionIndex < questions.length - 1) {
      const nextIndex = questionIndex + 1
      console.log(`Skipping to next question: ${nextIndex + 1}/${questions.length}`)
      
      // Update stats for skipped question (count as incorrect)
      const newStats = {
        score: playerStats.score,
        streak: 0,
        correctAnswers: playerStats.correctAnswers,
        totalAnswered: playerStats.totalAnswered + 1,
        accuracy: Math.round((playerStats.correctAnswers / (playerStats.totalAnswered + 1)) * 100),
        position: playerStats.position,
      }
      setPlayerStats(newStats)
      updateParticipantStats(newStats)
      
      // Save skipped answer to database
      if (currentQuestion) {
        saveAnswer(currentQuestion.id, null, false, currentQuestion.timeLimit - timeRemaining, 0, playerStats.streak)
      }
      
      // Move to next question
      setQuestionIndex(nextIndex)
      setGameState("waiting")
      setSelectedAnswer(null)
      setCurrentQuestion(null)
      setShowFeedback(false)
      setIsCorrect(false)
      
      // Reset new question type state
      setMatchingAnswers({})
      setOrderingAnswers([])
      setSelectedLeftItem(null)
      
      // Save progress for proctoring
      saveQuestionProgress(nextIndex)
      
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
      case "fiftyFifty": {
        // Remove two wrong answers
        if (currentQuestion && currentQuestion.options && typeof currentQuestion.correct_answer !== "undefined") {
          const correctIdx = typeof currentQuestion.correct_answer === "number"
            ? currentQuestion.correct_answer
            : currentQuestion.options.findIndex(
                (opt) => opt === currentQuestion.correct_answer
              )
          // Get all incorrect option indices
          const incorrectIndices = currentQuestion.options
            .map((_, idx) => idx)
            .filter((idx) => idx !== correctIdx)
          // Randomly pick two to hide
          const shuffled = incorrectIndices.sort(() => 0.5 - Math.random())
          setHiddenOptions(shuffled.slice(0, 2))
        }
        break
      }
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
    // Reset hidden options and double points after answer
    setHiddenOptions([])
    setActivePowerUp(null)
    // Immediately submit answer without delay, passing the answer directly
    handleSubmitAnswer(answer)
  }

  // Handlers for new question types
  const handleMatchingPairSelect = (leftIndex: number, rightIndex: number) => {
    if (gameState !== "active") return
    
    setMatchingAnswers(prev => {
      const newAnswers = { ...prev }
      
      // If this left item is already matched, clear it
      if (leftIndex in newAnswers) {
        delete newAnswers[leftIndex]
      }
      
      // If this right item is already matched to another left item, clear that match
      // Optimized: Use direct property access instead of Object.keys().find()
      const existingLeftIndex = Object.entries(newAnswers).find(([_, rightIdx]) => rightIdx === rightIndex)?.[0]
      if (existingLeftIndex !== undefined) {
        delete newAnswers[parseInt(existingLeftIndex)]
      }
      
      // Set the new match
      newAnswers[leftIndex] = rightIndex
      return newAnswers
    })
    
    // Clear the selected left item after matching
    setSelectedLeftItem(null)
  }

  const handleOrderingSelect = (itemIndex: number, newPosition: number) => {
    if (gameState !== "active") return
    setOrderingAnswers(prev => {
      const newOrder = [...prev]
      // Remove item from current position if it exists
      const currentIndex = newOrder.findIndex(item => item === currentQuestion?.orderingItems?.[itemIndex])
      if (currentIndex !== -1) {
        newOrder.splice(currentIndex, 1)
      }
      // Add item to new position
      newOrder.splice(newPosition, 0, currentQuestion?.orderingItems?.[itemIndex] || '')
      return newOrder
    })
  }

  const handleSubmitNewQuestionType = () => {
    if (gameState !== "active") return
    
    let answer: any = null
    let isCorrect = false
    
    if (currentQuestion?.type === "matching-pairs" || currentQuestion?.type === "matching_pairs") {
      // Optimized: Check if all pairs are matched using the Set size
      const allMatched = matchedRightItems.size === currentQuestion.matchingPairs?.length
      if (allMatched) {
        answer = matchingAnswers
        
        // Check against the correct answer from the database
        try {
          const correctPairs = JSON.parse(currentQuestion.correct_answer || '[]')
          if (Array.isArray(correctPairs) && correctPairs.length > 0) {
            // For matching pairs, we need to check if the user's matches align with the correct pairs
            // The correct_answer contains the original pairs, so we need to verify the matching logic
            isCorrect = currentQuestion.matchingPairs?.every((pair, index) => {
              const userMatch = matchingAnswers[index]
              if (userMatch === undefined) return false
              
              // Check if the user matched this left item with the correct right item
              const userRightItem = currentQuestion.matchingPairs?.[userMatch]?.right
              return userRightItem === pair.right
            }) || false
          } else {
            // Fallback: assume correct if all pairs are matched
            isCorrect = true
          }
        } catch (error) {
          console.error("Error parsing correct pairs:", error)
          // Fallback: assume correct if all pairs are matched
          isCorrect = true
        }
      }
    } else if (currentQuestion?.type === "ordering") {
      // Check if all items are ordered
      if (orderingAnswers.length === currentQuestion.orderingItems?.length) {
        answer = orderingAnswers
        
        // Check against the correct answer from the database
        try {
          const correctOrder = JSON.parse(currentQuestion.correct_answer || '[]')
          if (Array.isArray(correctOrder) && correctOrder.length === orderingAnswers.length) {
            // Compare the user's order with the correct order
            isCorrect = orderingAnswers.every((item, index) => item === correctOrder[index])
          } else {
            // Fallback: assume correct if all items are ordered
            isCorrect = true
          }
        } catch (error) {
          console.error("Error parsing correct order:", error)
          // Fallback: assume correct if all items are ordered
          isCorrect = true
        }
      }
    }
    
    if (answer !== null) {
      handleSubmitAnswer(answer, isCorrect)
    }
  }

  const handleSubmitAnswer = (answer?: string | number, isCorrect?: boolean) => {
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
    } else if (currentQuestion?.type === "matching-pairs" || currentQuestion?.type === "matching_pairs") {
      // Use the passed isCorrect flag for matching pairs
      correct = isCorrect || false
    } else if (currentQuestion?.type === "ordering") {
      // Use the passed isCorrect flag for ordering
      correct = isCorrect || false
    }
    
    console.log("Answer check:", { answerToUse, correct_answer: currentQuestion?.correct_answer, correct, isCorrect })
    setIsCorrect(correct)
    setShowFeedback(true)

    // Calculate score - host controlled points with powerup multipliers only
    let points = 0
    if (correct) {
      // Start with the exact points set by the host
      points = currentQuestion!.points

      // Double points power-up (only powerup that affects scoring)
      if (activePowerUp === "doublePoints") {
        points *= 2
        setActivePowerUp(null)
      }

      const newStats = {
        score: playerStats.score + points,
        streak: playerStats.streak + 1, // Keep streak for display purposes only
        correctAnswers: playerStats.correctAnswers + 1,
        totalAnswered: playerStats.totalAnswered + 1,
        accuracy: Math.round(((playerStats.correctAnswers + 1) / (playerStats.totalAnswered + 1)) * 100),
        position: playerStats.position,
      }

      setPlayerStats(newStats)

      // Save updated stats to database
      updateParticipantStats(newStats)

      // Save individual answer to database
      saveAnswer(currentQuestion!.id, answerToUse, correct, currentQuestion!.timeLimit - timeRemaining, points, playerStats.streak)
    } else {
      const newStats = {
        score: playerStats.score,
        streak: 0,
        correctAnswers: playerStats.correctAnswers,
        totalAnswered: playerStats.totalAnswered + 1,
        accuracy: Math.round((playerStats.correctAnswers / (playerStats.totalAnswered + 1)) * 100),
        position: playerStats.position,
      }

      setPlayerStats(newStats)

      // Save updated stats to database
      updateParticipantStats(newStats)

      // Save individual answer to database
      saveAnswer(currentQuestion!.id, answerToUse, correct, currentQuestion!.timeLimit - timeRemaining, 0, playerStats.streak)
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

  // Function to update participant stats in database
  const updateParticipantStats = async (stats: PlayerStats) => {
    try {
      const response = await fetch('/api/sessions/participants/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: quizCode,
          username: playerName,
          score: stats.score,
          streak: stats.streak,
          accuracy: stats.accuracy,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update participant stats:', response.statusText)
      } else {
        console.log('Participant stats updated successfully')
      }
    } catch (error) {
      console.error('Error updating participant stats:', error)
    }
  }

  // Function to save individual answer to database
  const saveAnswer = async (questionId: string, selectedOption: string | number | null, isCorrect: boolean, timeTaken: number, pointsAwarded: number, streakAtTime: number) => {
    try {
      const response = await fetch('/api/sessions/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: quizCode,
          username: playerName,
          questionId: parseInt(questionId),
          selectedOption: selectedOption?.toString() || null,
          isCorrect,
          timeTaken,
          pointsAwarded,
          streakAtTime,
        }),
      })

      if (!response.ok) {
        console.error('Failed to save answer:', response.statusText)
      } else {
        console.log('Answer saved successfully')
      }
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }

  // Function to save current question index for proctoring
  const saveQuestionProgress = (index: number) => {
    try {
      // Save to localStorage for immediate access
      localStorage.setItem(`quiz_progress_${quizCode}_${playerName}`, index.toString())
      
      // Also save to server (optional, for backup)
      fetch('/api/sessions/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: quizCode,
          username: playerName,
          questionIndex: index,
        }),
      }).catch(error => {
        console.error('Error saving progress to server:', error)
      })
    } catch (error) {
      console.error('Error saving question progress:', error)
    }
  }

  // Function to load saved question progress for proctoring
  const loadQuestionProgress = (): number => {
    try {
      const savedIndex = localStorage.getItem(`quiz_progress_${quizCode}_${playerName}`)
      return savedIndex ? parseInt(savedIndex, 10) : 0
    } catch (error) {
      console.error('Error loading question progress:', error)
      return 0
    }
  }

  const handleTimeUp = () => {
    console.log("Time's up! Moving to next question...")
    setGameState("answered")
    setIsCorrect(false)
    setShowFeedback(true)

    const newStats = {
      score: playerStats.score,
      streak: 0,
      correctAnswers: playerStats.correctAnswers,
      totalAnswered: playerStats.totalAnswered + 1,
      accuracy: Math.round((playerStats.correctAnswers / (playerStats.totalAnswered + 1)) * 100),
      position: playerStats.position,
    }

    setPlayerStats(newStats)

    // Save updated stats to database
    updateParticipantStats(newStats)

    // Save individual answer to database
    saveAnswer(currentQuestion!.id, null, false, currentQuestion!.timeLimit - timeRemaining, 0, playerStats.streak)

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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz Session
            </h1>
            <p className="text-sm text-gray-600">Code: {quizCode}</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="animate-pulse">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full"></div>
                  <h2 className="text-xl font-semibold mb-2">Loading quiz...</h2>
                  <p className="text-gray-600 mb-6">
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
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <span className="font-medium">{participant.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {participant.score} pts
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 py-4">
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
    <TooltipProvider>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Quiz Session
              </h1>
              <p className="text-sm text-gray-600 mb-1">
                Player: {playerName} | Code: {quizCode}
              </p>
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <span>
                  Status: <span className="font-medium text-gray-700 capitalize">{sessionStatus}</span>
                </span>
                <span>
                  Connection: 
                  <span className={`ml-1 font-medium ${
                    connectionStatus === "connected" ? "text-green-600" :
                    connectionStatus === "connecting" ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {connectionStatus === "connected" ? "Connected" :
                     connectionStatus === "connecting" ? "Connecting..." :
                     "Disconnected"}
                  </span>
                </span>
                {gameState === "active" && (
                  <span>
                    Proctoring: <span className="font-medium text-red-600">Active</span>
                  </span>
                )}
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
              </div>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Rank #{playerStats.position}
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
                    onClick={() => usePowerUp("fiftyFifty")}
                    disabled={powerUps.fiftyFifty <= 0 || gameState !== "active"}
                  >
                    50/50 ({powerUps.fiftyFifty})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => usePowerUp("extraTime")}
                    disabled={powerUps.extraTime <= 0 || gameState !== "active"}
                  >
                    +Time ({powerUps.extraTime})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => usePowerUp("doublePoints")}
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
          <div className="max-w-6xl mx-auto">
            {gameState === "waiting" && (
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="animate-pulse">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full"></div>
                    <h2 className="text-xl font-semibold mb-2">Waiting for host to start...</h2>
                    <p className="text-gray-600 mb-6">
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
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {index + 1}
                                </div>
                                <span className="font-medium">{participant.name}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {participant.score} pts
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 py-4">
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Main Quiz Content */}
                <div className="lg:col-span-3">
                  <Card className="shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                          Question {questionIndex + 1} of {questions.length}
                        </CardTitle>
                        <div className="flex items-center gap-4">
                          {activePowerUp === "doublePoints" && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1">
                              2x Points Active!
                            </Badge>
                          )}
                          {gameState === "active" && (
                            <div className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-400">
                              <Clock className="w-6 h-6" />
                              {timeRemaining}s
                            </div>
                          )}
                        </div>
                      </div>
                      {gameState === "active" && (
                        <Progress 
                          value={(timeRemaining / currentQuestion.timeLimit) * 100} 
                          className="h-3 bg-gray-200 dark:bg-gray-700" 
                        />
                      )}
                    </CardHeader>
                    <CardContent className="p-8">
                      {!showFeedback ? (
                        <div className="space-y-8">
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                              {currentQuestion.question}
                            </p>
                          </div>
                          
                          {/* Debug logging */}
                          {console.log("Rendering question:", {
                            type: currentQuestion.type,
                            matchingPairs: currentQuestion.matchingPairs,
                            dragDropItems: currentQuestion.dragDropItems,
                            orderingItems: currentQuestion.orderingItems
                          })}

                          {currentQuestion.type === "multiple-choice" || currentQuestion.type === "multiple_choice" ? (
                            <div className="space-y-4 max-w-3xl mx-auto">
                              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                                currentQuestion.options.map((option, index) => (
                                  hiddenOptions.includes(index) ? null : (
                                    <Button
                                      key={index}
                                      variant={selectedAnswer === index ? "default" : "outline"}
                                      className="w-full justify-start text-left h-auto p-6 text-lg"
                                      onClick={() => handleAnswerSelect(index)}
                                      disabled={gameState !== "active"}
                                    >
                                      <span className="font-bold mr-4 text-xl">{String.fromCharCode(65 + index)}.</span>
                                      {option}
                                    </Button>
                                  )
                                ))
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <p>No options available for this question.</p>
                                  <p className="text-sm">Please contact the host.</p>
                                </div>
                              )}
                            </div>
                          ) : currentQuestion.type === "true-false" || currentQuestion.type === "true_false" ? (
                            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                              <Button
                                variant={selectedAnswer === "true" ? "default" : "outline"}
                                className="h-20 text-xl font-semibold"
                                onClick={() => handleAnswerSelect("true")}
                                disabled={gameState !== "active"}
                              >
                                True
                              </Button>
                              <Button
                                variant={selectedAnswer === "false" ? "default" : "outline"}
                                className="h-20 text-xl font-semibold"
                                onClick={() => handleAnswerSelect("false")}
                                disabled={gameState !== "active"}
                              >
                                False
                              </Button>
                            </div>
                          ) : currentQuestion.type === "matching-pairs" || currentQuestion.type === "matching_pairs" ? (
                            <div className="space-y-6 max-w-4xl mx-auto">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                                Match each item on the left with its corresponding item on the right by clicking them in sequence.
                              </div>
                              
                              <div className="flex justify-center mb-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setMatchingAnswers({})
                                    setSelectedLeftItem(null)
                                  }}
                                  disabled={gameState !== "active"}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  Reset All Matches
                                </Button>
                              </div>
                              
                              <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-8 border border-gray-200 dark:border-gray-600">
                                <div className="grid grid-cols-2 gap-20 relative">
                                  <div className="space-y-4">
                                    <h4 className="font-bold text-center text-gray-800 dark:text-gray-200 mb-6 text-xl">Left Items</h4>
                                    {currentQuestion.matchingPairs?.map((pair, index) => {
                                      const isMatched = index in matchingAnswers
                                      const isSelected = selectedLeftItem === index
                                      const matchedRightIndex = matchingAnswers[index]
                                      return (
                                        <Button
                                          key={index}
                                          id={`left-${index}`}
                                          variant={isMatched ? "default" : isSelected ? "secondary" : "outline"}
                                          className={`w-full justify-start text-left h-auto p-6 relative transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-lg ${
                                            isMatched ? "bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-300" : 
                                            isSelected ? "bg-amber-500 text-white shadow-lg ring-2 ring-amber-300" : 
                                            "hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md"
                                          }`}
                                          onClick={() => {
                                            // If this left item is already matched, clear it
                                            if (isMatched) {
                                              setMatchingAnswers(prev => {
                                                const newAnswers = { ...prev }
                                                delete newAnswers[index]
                                                return newAnswers
                                              })
                                              setSelectedLeftItem(null)
                                            } else {
                                              // Select this left item for matching
                                              setSelectedLeftItem(index)
                                            }
                                          }}
                                          disabled={gameState !== "active"}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium bg-white/20 dark:bg-black/20 px-2 py-1 rounded">
                                              {index + 1}
                                            </span>
                                            <span className="font-semibold text-lg">{pair.left}</span>
                                            {isMatched && (
                                              <span className="ml-auto text-xs bg-white/30 px-2 py-1 rounded">
                                                → {matchedRightIndex + 1}
                                              </span>
                                            )}
                                          </div>
                                        </Button>
                                      )
                                    })}
                                  </div>
                                  <div className="space-y-4">
                                    <h4 className="font-bold text-center text-gray-800 dark:text-gray-200 mb-6 text-xl">Right Items</h4>
                                    {currentQuestion.matchingPairs?.map((rightPair, rightIndex) => {
                                      // Optimized: Check if this right item is matched using a more efficient approach
                                      const isMatched = matchedRightItems.has(rightIndex)
                                      const matchedLeftIndex = Object.keys(matchingAnswers).find(key => matchingAnswers[parseInt(key)] === rightIndex)
                                      return (
                                        <Button
                                          key={rightIndex}
                                          id={`right-${rightIndex}`}
                                          variant={isMatched ? "default" : "outline"}
                                          className={`w-full justify-start text-left h-auto p-6 relative transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-lg ${
                                            isMatched ? "bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-300" : 
                                            "hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md"
                                          }`}
                                          onClick={() => {
                                            // Only allow matching if a left item is selected and this right item is not already matched
                                            if (selectedLeftItem !== null && !isMatched) {
                                              handleMatchingPairSelect(selectedLeftItem, rightIndex)
                                            }
                                          }}
                                          disabled={gameState !== "active"}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium bg-white/20 dark:bg-black/20 px-2 py-1 rounded">
                                              {rightIndex + 1}
                                            </span>
                                            <span className="font-semibold text-lg">{rightPair.right}</span>
                                            {isMatched && (
                                              <span className="ml-auto text-xs bg-white/30 px-2 py-1 rounded">
                                                ← {parseInt(matchedLeftIndex!) + 1}
                                              </span>
                                            )}
                                          </div>
                                        </Button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Progress indicator */}
                              <div className="text-center">
                                <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Matched: {matchedRightItems.size} / {currentQuestion.matchingPairs?.length}
                                  </span>
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                              
                              <div className="text-center pt-4">
                                <Button
                                  onClick={handleSubmitNewQuestionType}
                                  disabled={gameState !== "active" || matchedRightItems.size !== currentQuestion.matchingPairs?.length}
                                  className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                  size="lg"
                                >
                                  Submit Answer
                                </Button>
                              </div>
                            </div>
                          ) : currentQuestion.type === "ordering" ? (
                            <div className="space-y-4 max-w-3xl mx-auto">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                                Arrange the items in the correct order by clicking them in sequence.
                              </div>
                              <div className="space-y-3">
                                {currentQuestion.orderingItems?.map((item, index) => (
                                  <Button
                                    key={index}
                                    variant={orderingAnswers.includes(item) ? "default" : "outline"}
                                    className="w-full justify-start text-left h-auto p-4 text-lg"
                                    onClick={() => {
                                      if (!orderingAnswers.includes(item)) {
                                        setOrderingAnswers(prev => [...prev, item])
                                      }
                                    }}
                                    disabled={gameState !== "active"}
                                  >
                                    <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                                    <span className="flex-1">{item}</span>
                                  </Button>
                                ))}
                              </div>
                              {orderingAnswers.length > 0 && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <h4 className="font-medium mb-3 text-center">Your Order:</h4>
                                  <div className="space-y-2">
                                    {orderingAnswers.map((item, index) => (
                                      <div key={index} className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                                        <span className="flex-1">{item}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setOrderingAnswers(prev => prev.filter((_, i) => i !== index))}
                                          disabled={gameState !== "active"}
                                          className="ml-auto h-8 px-3 text-xs"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="text-center">
                                <Button
                                  onClick={handleSubmitNewQuestionType}
                                  disabled={gameState !== "active" || orderingAnswers.length !== currentQuestion.orderingItems?.length}
                                  className="mt-6 px-8 py-4 text-lg"
                                >
                                  Submit Answer
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <p>Question type not supported: {currentQuestion.type}</p>
                              <p className="text-sm">Please contact the host.</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between max-w-3xl mx-auto">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Points: {currentQuestion.points}
                              {activePowerUp === "doublePoints" && " × 2"}
                            </div>
                            {gameState === "active" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    onClick={handleSkipQuestion}
                                    className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                  >
                                    Skip Question
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Skips the current question and moves to the next one.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
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
                                +{currentQuestion.points} points
                              </p>
                            </div>
                          )}
                          <p className="text-gray-600 dark:text-gray-400">Moving to next question...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Participants Sidebar */}
                <div className="lg:col-span-2">
                  <Card className="shadow-lg border-0 h-fit sticky top-8">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                      <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-200">
                        Participants ({participants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {participants.length > 0 ? (
                          participants.map((participant, index) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-base font-bold shadow-md">
                                  {index + 1}
                                </div>
                                <span className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {participant.name}
                                </span>
                              </div>
                              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                                {participant.score} pts
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400 py-6 text-center">
                            <div className="w-10 h-10 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-gray-400">👥</span>
                            </div>
                            <p className="text-sm">No participants yet...</p>
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
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Redirecting to your detailed results...
                      </p>
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
