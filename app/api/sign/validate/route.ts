import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SIGNING_SECRET ?? ''

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string }
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  try {
    const payload = jwt.verify(token, SECRET) as {
      leaseId: string
      role: 'landlord' | 'tenant'
      email: string
      jti: string
    }
    return NextResponse.json({ valid: true, leaseId: payload.leaseId, role: payload.role, email: payload.email })
  } catch {
    return NextResponse.json({ error: 'Invalid or expired signing token' }, { status: 401 })
  }
}
