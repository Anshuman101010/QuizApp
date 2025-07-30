import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// GET /api/sessions/participants?code=XXXXXX - List participants for a session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
    
    // First find the session
    const session = await prisma.quiz_sessions.findFirst({ 
      where: { code }
    })
    
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    
    // Then fetch participants with their related data
    const participants = await prisma.session_participants.findMany({
      where: { session_id: session.id },
      include: { 
        users: true
      },
    })
    
    // Transform the data to include more detailed statistics
    const transformedParticipants = participants.map(participant => ({
      id: participant.id,
      user_id: participant.user_id,
      session_id: participant.session_id,
      score: participant.score || 0,
      streak: participant.streak || 0,
      accuracy: participant.accuracy || 0,
      joined_at: participant.joined_at,
      users: participant.users,
      answered: false // We'll implement this later when answers are working
    }))
    
    return NextResponse.json({ participants: transformedParticipants })
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
  }
}
