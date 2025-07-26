import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Expecting: { title, description, negativeMarking, teamMode, questions, userId }
    const { title, description, negativeMarking, teamMode, questions, userId } = data;
    if (!title || !userId || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Create quiz
    const quiz = await prisma.quizzes.create({
      data: {
        title,
        description,
        negative_marking: negativeMarking,
        team_mode: teamMode,
        user_id: userId,
        questions: {
          create: questions.map((q: any) => ({
            type: q.type,
            question: q.question,
            correct_answer: q.correctAnswer?.toString() ?? '',
            time_limit: q.timeLimit,
            points: q.points,
            category: q.category,
            media_type: q.media?.type,
            media_url: q.media?.url,
            options: q.options
              ? {
                  create: q.options.map((optionText: string, idx: number) => ({
                    option_text: optionText,
                    option_index: idx,
                  })),
                }
              : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create quiz', details: err }, { status: 500 });
  }
}

// GET all quizzes for dashboard
export async function GET(req: NextRequest) {
  try {
    // Get user ID from query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Filter quizzes by user_id
    const quizzes = await prisma.quizzes.findMany({
      where: {
        user_id: parseInt(userId),
      },
      include: {
        questions: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ quizzes }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch quizzes', details: err }, { status: 500 });
  }
}
