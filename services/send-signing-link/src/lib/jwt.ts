import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const TTL_SECONDS = 48 * 60 * 60 // 48 hours

let _secretClient: SecretManagerServiceClient | null = null
let _cachedSecret: string | null = null

function secretClient(): SecretManagerServiceClient {
  if (!_secretClient) _secretClient = new SecretManagerServiceClient()
  return _secretClient
}

/**
 * Returns the JWT signing secret.
 * In production (GCP_PROJECT_ID set), fetches from Secret Manager and caches.
 * Falls back to JWT_SIGNING_SECRET env var for local dev.
 */
async function getJwtSecret(): Promise<string> {
  if (_cachedSecret) return _cachedSecret

  const projectId = process.env.GCP_PROJECT_ID
  if (projectId) {
    try {
      const name = `projects/${projectId}/secrets/jwt-signing-secret/versions/latest`
      const [version] = await secretClient().accessSecretVersion({ name })
      const value = version.payload?.data?.toString() ?? ''
      if (value) {
        _cachedSecret = value
        return value
      }
    } catch (err) {
      console.warn('[jwt] Could not fetch jwt-signing-secret from Secret Manager, falling back to env:', err)
    }
  }

  const envSecret = process.env.JWT_SIGNING_SECRET ?? ''
  _cachedSecret = envSecret
  return envSecret
}

export interface SigningTokenPayload {
  leaseId: string
  role: 'landlord' | 'tenant'
  email: string
  jti: string
}

export async function issueSigningToken(leaseId: string, role: 'landlord' | 'tenant', email: string): Promise<string> {
  const secret = await getJwtSecret()
  if (!secret) throw new Error('JWT_SIGNING_SECRET is not configured.')
  const jti = randomBytes(16).toString('hex')
  return jwt.sign({ leaseId, role, email, jti }, secret, { expiresIn: TTL_SECONDS })
}

export async function verifySigningToken(token: string): Promise<SigningTokenPayload> {
  const secret = await getJwtSecret()
  if (!secret) throw new Error('JWT_SIGNING_SECRET is not configured.')
  return jwt.verify(token, secret) as SigningTokenPayload
}
