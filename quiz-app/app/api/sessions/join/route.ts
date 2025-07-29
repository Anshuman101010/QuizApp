import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// POST /api/sessions/join - Join a session by code and username
export async function POST(req: NextRequest) {
  try {
    const { code, username } = await req.json()
    
    if (!code || !username) {
      return NextResponse.json({ error: 'code and username required' }, { status: 400 })
    }

    // Find session by code
    const session = await prisma.quiz_sessions.findFirst({
      where: { code },
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session has already ended' }, { status: 400 })
    }

    if (session.status === 'active') {
      return NextResponse.json({ error: 'Session has already started' }, { status: 400 })
    }

    // Check if user already exists
    let user = await prisma.users.findFirst({
      where: { username },
    })

    // If user doesn't exist, create a new participant user
    if (!user) {
      user = await prisma.users.create({
        data: {
          username,
          email: `${username}@participant.local`, // Temporary email
          password: 'participant', // Temporary password
          role: 'participant',
        },
      })
    }

    // Check if user is already in this session
    const existingParticipant = await prisma.session_participants.findFirst({
      where: {
        session_id: session.id,
        user_id: user.id,
      },
    })

    if (existingParticipant) {
      return NextResponse.json({ 
        error: 'You are already in this session',
        userId: user.id 
      }, { status: 400 })
    }

    // Add user to session
    const participant = await prisma.session_participants.create({
      data: {
        session_id: session.id,
        user_id: user.id,
        join_code: code,
        score: 0,
        streak: 0,
        accuracy: 0,
      },
    })

    return NextResponse.json({ 
      success: true,
      userId: user.id,
      participantId: participant.id,
      message: 'Successfully joined session'
    })

  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
