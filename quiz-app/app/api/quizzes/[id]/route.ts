import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// GET /api/quizzes/[id] - Get quiz details by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quizId = parseInt(id)
    
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

// PATCH /api/quizzes/[id] - Update quiz status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quizId = parseInt(id)
    
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const { status } = await req.json()
    
    if (!status || !['inactive', 'active', 'stopped', 'completed', 'terminated'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be inactive, active, stopped, completed, or terminated' }, { status: 400 })
    }

    const quiz = await prisma.quizzes.update({
      where: { id: quizId },
      data: { status },
      include: {
        questions: true
      }
    })

    return NextResponse.json({ quiz })

  } catch (error) {
    console.error('Error updating quiz:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 