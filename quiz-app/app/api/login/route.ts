import { NextRequest, NextResponse } from "next/server"

// Simple hardcoded user for demo
const DEMO_USER = {
  username: "Angshuman",
  password: "password123"
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (username === DEMO_USER.username && password === DEMO_USER.password) {
    // Simulate session creation (for demo, just return success)
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
}
