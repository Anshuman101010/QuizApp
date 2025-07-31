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

    return NextResponse.json(quiz)

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

// PUT /api/quizzes/[id] - Update quiz content and questions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quizId = parseInt(id)
    
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    const { title, description, questions, negativeMarking, teamMode } = await req.json()
    
    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Title and questions are required' }, { status: 400 })
    }

    // Start a transaction to update quiz and questions
    const result = await prisma.$transaction(async (tx) => {
      // Update quiz basic info
      const updatedQuiz = await tx.quizzes.update({
        where: { id: quizId },
        data: {
          title,
          description: description || '',
          negative_marking: negativeMarking || false,
          team_mode: teamMode || false,
        }
      })

      // Delete existing questions and options
      await tx.options.deleteMany({
        where: {
          question_id: {
            in: (await tx.questions.findMany({
              where: { quiz_id: quizId },
              select: { id: true }
            })).map(q => q.id)
          }
        }
      })
      
      await tx.questions.deleteMany({
        where: { quiz_id: quizId }
      })

      // Create new questions
      for (const question of questions) {
        const newQuestion = await tx.questions.create({
          data: {
            quiz_id: quizId,
            question: question.question,
            type: question.type,
            correct_answer: String(question.correctAnswer),
            time_limit: question.timeLimit || 30,
            points: question.points || 100,
            category: question.category || 'General'
          }
        })

        // Create options for multiple choice questions
        if (question.type === 'multiple_choice' && question.options && Array.isArray(question.options)) {
          for (let i = 0; i < question.options.length; i++) {
            const option = question.options[i]
            if (option.trim()) {
              await tx.options.create({
                data: {
                  question_id: newQuestion.id,
                  option_text: option,
                  option_index: i
                }
              })
            }
          }
        }
      }

      return updatedQuiz
    })

    return NextResponse.json({ 
      message: 'Quiz updated successfully',
      quiz: result 
    })

  } catch (error) {
    console.error('Error updating quiz:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 

// DELETE /api/quizzes/[id] - Delete quiz and all related data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quizId = parseInt(id)
    
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    // Check if quiz exists
    const existingQuiz = await prisma.quizzes.findUnique({
      where: { id: quizId }
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check if quiz is currently active
    if (existingQuiz.status === 'active') {
      return NextResponse.json({ error: 'Cannot delete an active quiz. Please stop the quiz first.' }, { status: 400 })
    }

    // Delete quiz and all related data using cascade
    // The database schema should handle cascade deletion for:
    // - questions (cascade to options)
    // - quiz_sessions (cascade to session_participants and answers)
    // - participant_history
    await prisma.quizzes.delete({
      where: { id: quizId }
    })

    return NextResponse.json({ 
      message: 'Quiz deleted successfully',
      deletedQuizId: quizId
    })

  } catch (error) {
    console.error('Error deleting quiz:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 