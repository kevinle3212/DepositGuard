import { Request, Response, NextFunction } from 'express'

// TODO(§7): validate Firebase Admin JWT and extract walletPubkey claim
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' })
    return
  }
  next()
}
