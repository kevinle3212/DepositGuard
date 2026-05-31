import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PublicKey } from '@solana/web3.js'
const CLOCK_SKEW_SECS = 300

const MSG_PREFIX = 'NestCrow identity verification '

async function verifySolanaSignature(pubkey: string, signature: string, message: string): Promise<boolean> {
  try {
    // Wrap in new Uint8Array() to ensure ArrayBuffer-backed views (TS 5.x strict check)
    const pubkeyBytes = new Uint8Array(new PublicKey(pubkey).toBytes())
    const sigBytes = new Uint8Array(Buffer.from(signature, 'base64'))
    const msgBytes = new Uint8Array(new TextEncoder().encode(message))
    const cryptoKey = await crypto.subtle.importKey('raw', pubkeyBytes, { name: 'Ed25519' }, false, ['verify'])
    return await crypto.subtle.verify({ name: 'Ed25519' }, cryptoKey, sigBytes, msgBytes)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { signature, pubkey, message, chain } = await req.json()

    if (!signature || !pubkey || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!message.startsWith(MSG_PREFIX)) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // Expected format: "NestCrow identity verification <nonce> <unix_ts>"
    const payload = message.slice(MSG_PREFIX.length).trim()
    const parts = payload.split(' ')
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }
    const ts = parseInt(parts[1], 10)
    const now = Math.floor(Date.now() / 1000)
    if (isNaN(ts) || Math.abs(now - ts) > CLOCK_SKEW_SECS) {
      return NextResponse.json({ error: 'Challenge expired or clock skew too large' }, { status: 401 })
    }

    if (chain === 'solana') {
      const valid = await verifySolanaSignature(pubkey, signature, message)
      if (!valid) {
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
      }
    }

    // TODO(§7): replace with Firebase Admin createCustomToken(pubkey, { walletPubkey: pubkey, chain })
    const mockJwt = `dg.${Buffer.from(JSON.stringify({ pubkey, chain, iat: Math.floor(Date.now() / 1000) })).toString('base64')}.sig`

    const response = NextResponse.json({ jwt: mockJwt, pubkey, chain }, { status: 200 })
    response.cookies.set('dg-session', mockJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
