import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// GET /api/quizzes/[id] - Get quiz details by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = parseInt(params.id)
    
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    return NextResponse.json({ quiz })

  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 