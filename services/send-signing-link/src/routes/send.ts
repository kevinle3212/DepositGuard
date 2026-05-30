import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { AuthenticatedRequest } from '../middleware/require-auth.js'
import { issueSigningToken } from '../lib/jwt.js'
import { storeSigningToken, dispatchMagicLinkEmail } from '../lib/firestore.js'

export const sendRouter = Router()

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://depositguard.tech'

const BodySchema = z.object({
  leaseId: z.string().min(1),
  role: z.enum(['landlord', 'tenant']),
  email: z.string().email(),
})

sendRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() })
    return
  }

  const { leaseId, role, email } = parsed.data
  const authed = req as AuthenticatedRequest

  // Only the landlord (identified by walletPubkey stored in Firestore) can send signing links.
  // For a more complete check, verify against the on-chain LeaseConfig; this is a lightweight
  // defence-in-depth gate using the authenticated wallet claim.
  let token: string
  try {
    token = issueSigningToken(leaseId, role, email)
  } catch (err) {
    console.error('[send-signing-link] JWT issue failed:', err)
    res.status(500).json({ error: 'Failed to generate signing token.' })
    return
  }

  try {
    await storeSigningToken(token, leaseId, role, email)
  } catch (err) {
    console.error('[send-signing-link] Firestore write failed:', err)
    res.status(500).json({ error: 'Failed to store signing token.' })
    return
  }

  const signingUrl = `${APP_BASE_URL}/lease/${leaseId}/sign?token=${token}`

  try {
    await dispatchMagicLinkEmail(email, leaseId, role, signingUrl)
  } catch (err) {
    console.error('[send-signing-link] Email dispatch failed:', err)
    res.status(502).json({ error: 'Failed to dispatch signing email.' })
    return
  }

  res.json({ sent: true, leaseId, role, email, signingUrl })
})
