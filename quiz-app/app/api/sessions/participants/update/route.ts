import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

// PATCH /api/sessions/participants/update - Update participant stats
export async function PATCH(req: NextRequest) {
  try {
    const { sessionCode, username, score, streak, accuracy } = await req.json()
    
    if (!sessionCode || !username) {
      return NextResponse.json({ error: 'sessionCode and username required' }, { status: 400 })
    }

    // Find the session
    const session = await prisma.quiz_sessions.findFirst({
      where: { code: sessionCode },
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Find the user
    const user = await prisma.users.findFirst({
      where: { username },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find and update the participant
    const participant = await prisma.session_participants.findFirst({
      where: {
        session_id: session.id,
        user_id: user.id,
      },
    })
    
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found in session' }, { status: 404 })
    }

    // Update the participant stats
    const updatedParticipant = await prisma.session_participants.update({
      where: { id: participant.id },
      data: {
        score: score !== undefined ? score : participant.score,
        streak: streak !== undefined ? streak : participant.streak,
        accuracy: accuracy !== undefined ? accuracy : participant.accuracy,
      },
    })

    return NextResponse.json({ 
      success: true, 
      participant: updatedParticipant 
    })
  } catch (error) {
    console.error('Error updating participant:', error)
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 })
  }
} 