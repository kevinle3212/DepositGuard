import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

const SECRET = process.env.JWT_SIGNING_SECRET ?? ''
const TTL_SECONDS = 48 * 60 * 60 // 48 hours

export interface SigningTokenPayload {
  leaseId: string
  role: 'landlord' | 'tenant'
  email: string
  jti: string
}

export function issueSigningToken(leaseId: string, role: 'landlord' | 'tenant', email: string): string {
  if (!SECRET) throw new Error('JWT_SIGNING_SECRET is not configured.')
  const jti = randomBytes(16).toString('hex')
  return jwt.sign({ leaseId, role, email, jti }, SECRET, { expiresIn: TTL_SECONDS })
}

export function verifySigningToken(token: string): SigningTokenPayload {
  if (!SECRET) throw new Error('JWT_SIGNING_SECRET is not configured.')
  return jwt.verify(token, SECRET) as SigningTokenPayload
}
