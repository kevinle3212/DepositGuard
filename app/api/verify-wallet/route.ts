import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { signature, pubkey, message, chain } = await req.json()

    if (!signature || !pubkey || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Mock JWT — replace with real Firebase Admin SDK verification
    const mockJwt = `mock.jwt.${Buffer.from(pubkey).toString('base64').slice(0, 20)}`

    const response = NextResponse.json({ jwt: mockJwt, pubkey, chain }, { status: 200 })

    // Set the session cookie for middleware route-guard
    response.cookies.set('dg-session', mockJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
