import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// GET /api/sessions/events - Server-Sent Events for real-time session updates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json({ error: 'code parameter required' }, { status: 400 })
  }

  // Set up SSE headers
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const event = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(event))
      }

      const checkSessionStatus = async () => {
        try {
          const session = await prisma.quiz_sessions.findFirst({
            where: { code },
            include: {
              quizzes: true
            }
          })

          if (session) {
            sendEvent({
              type: 'session_update',
              session: {
                id: session.id,
                status: session.status,
                quiz_status: session.quizzes.status
              }
            })
          }
        } catch (error) {
          console.error('Error checking session status:', error)
          sendEvent({
            type: 'error',
            message: 'Failed to check session status'
          })
        }
      }

      // Send initial status
      await checkSessionStatus()

      // Set up interval to check status every 500ms
      const interval = setInterval(async () => {
        await checkSessionStatus()
      }, 500)

      // Clean up on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
} 