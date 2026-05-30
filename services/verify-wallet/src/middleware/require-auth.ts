import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'

function ensureInit(): void {
  if (!admin.apps.length) admin.initializeApp()
}

export interface AuthenticatedRequest extends Request {
  uid: string
  walletPubkey: string
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' })
    return
  }

  const idToken = auth.slice(7)
  ensureInit()

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decoded) => {
      const walletPubkey = decoded['walletPubkey'] as string | undefined
      if (!walletPubkey) {
        res.status(401).json({ error: 'Token missing walletPubkey claim' })
        return
      }
      const r = req as AuthenticatedRequest
      r.uid = decoded.uid
      r.walletPubkey = walletPubkey
      next()
    })
    .catch(() => {
      res.status(401).json({ error: 'Invalid or expired token' })
    })
}
