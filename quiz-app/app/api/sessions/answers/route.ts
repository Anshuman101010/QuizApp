import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// POST /api/sessions/answers - Save an answer
export async function POST(req: NextRequest) {
  try {
    const { sessionCode, username, questionId, selectedOption, isCorrect, timeTaken, pointsAwarded, streakAtTime } = await req.json()
    
    console.log('Saving answer:', { sessionCode, username, questionId, selectedOption, isCorrect, timeTaken, pointsAwarded, streakAtTime })
    
    if (!sessionCode || !username || !questionId) {
      return NextResponse.json({ error: 'sessionCode, username, and questionId required' }, { status: 400 })
    }

    // Find the session
    const session = await prisma.quiz_sessions.findFirst({
      where: { code: sessionCode },
    })
    
    if (!session) {
      console.error('Session not found for code:', sessionCode)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Find the user
    const user = await prisma.users.findFirst({
      where: { username },
    })
    
    if (!user) {
      console.error('User not found for username:', username)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the participant
    const participant = await prisma.session_participants.findFirst({
      where: {
        session_id: session.id,
        user_id: user.id,
      },
    })
    
    if (!participant) {
      console.error('Participant not found for session:', session.id, 'user:', user.id)
      return NextResponse.json({ error: 'Participant not found in session' }, { status: 404 })
    }

    // Save the answer
    const answer = await prisma.answers.create({
      data: {
        session_participant_id: participant.id,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        time_taken: timeTaken,
        points_awarded: pointsAwarded,
        streak_at_time: streakAtTime,
      },
    })

    console.log('Answer saved successfully:', answer.id)

    return NextResponse.json({ 
      success: true, 
      answer: answer 
    })
  } catch (error) {
    console.error('Error saving answer:', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
} 