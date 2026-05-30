import { describe, it, expect } from '@jest/globals'
import jwt from 'jsonwebtoken'

const SECRET = 'test-secret-32-bytes-xxxxxxxxxxx'
process.env.JWT_SIGNING_SECRET = SECRET

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { issueSigningToken, verifySigningToken } = require('../lib/jwt.js') as typeof import('../lib/jwt.js')

describe('issueSigningToken', () => {
  it('returns a JWT string', () => {
    const token = issueSigningToken('lease-1', 'landlord', 'landlord@test.com')
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('encodes leaseId, role, and email in payload', () => {
    const token = issueSigningToken('lease-2', 'tenant', 'tenant@test.com')
    const decoded = jwt.verify(token, SECRET) as Record<string, unknown>
    expect(decoded.leaseId).toBe('lease-2')
    expect(decoded.role).toBe('tenant')
    expect(decoded.email).toBe('tenant@test.com')
  })

  it('expires in approximately 48 hours', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = issueSigningToken('lease-3', 'landlord', 'a@b.com')
    const decoded = jwt.verify(token, SECRET) as Record<string, unknown>
    const exp = decoded.exp as number
    const iat = decoded.iat as number
    const ttl = exp - iat
    // 48h = 172800s; allow ±5s tolerance
    expect(ttl).toBeGreaterThanOrEqual(172795)
    expect(ttl).toBeLessThanOrEqual(172805)
  })

  it('includes a unique jti per token', () => {
    const t1 = issueSigningToken('lease-4', 'landlord', 'a@b.com')
    const t2 = issueSigningToken('lease-4', 'landlord', 'a@b.com')
    const d1 = jwt.decode(t1) as Record<string, unknown>
    const d2 = jwt.decode(t2) as Record<string, unknown>
    expect(d1.jti).not.toBe(d2.jti)
  })
})

describe('verifySigningToken', () => {
  it('verifies a valid token', () => {
    const token = issueSigningToken('lease-5', 'tenant', 'tenant@test.com')
    const payload = verifySigningToken(token)
    expect(payload.leaseId).toBe('lease-5')
    expect(payload.role).toBe('tenant')
    expect(payload.email).toBe('tenant@test.com')
  })

  it('throws on tampered token', () => {
    const token = issueSigningToken('lease-6', 'landlord', 'a@b.com')
    const tampered = token.slice(0, -3) + 'xxx'
    expect(() => verifySigningToken(tampered)).toThrow()
  })

  it('throws on expired token', () => {
    const expired = jwt.sign({ leaseId: 'x', role: 'landlord', email: 'a@b.com', jti: 'y' }, SECRET, { expiresIn: -1 })
    expect(() => verifySigningToken(expired)).toThrow()
  })

  it('throws when signed with wrong secret', () => {
    const badToken = jwt.sign({ leaseId: 'x', role: 'landlord', email: 'a@b.com', jti: 'y' }, 'wrong-secret')
    expect(() => verifySigningToken(badToken)).toThrow()
  })
})
