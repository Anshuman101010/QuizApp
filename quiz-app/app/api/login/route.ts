import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  // Find user in DB
  const user = await prisma.users.findUnique({
    where: { username },
  })
  if (user && user.password && password && await bcrypt.compare(password, user.password)) {
    // Return success, id, and role
    return NextResponse.json({ success: true, id: user.id, role: user.role })
  }
  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}
