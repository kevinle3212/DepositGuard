import { Router, Request, Response } from 'express'
import { z } from 'zod'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import admin from 'firebase-admin'
import * as nonceStore from '../nonce.js'

export const verifyRouter = Router()

const BodySchema = z.object({
  pubkey: z.string().min(32).max(44),
  signature: z.string().min(1),
  message: z.string().min(1),
  chain: z.enum(['solana', 'evm', 'hardware']),
})

const MSG_PREFIX = 'NestCrow identity verification '

verifyRouter.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { pubkey, signature, message, chain } = parsed.data

  if (!message.startsWith(MSG_PREFIX)) {
    res.status(400).json({ error: 'Invalid message format' })
    return
  }

  const nonce = message.slice(MSG_PREFIX.length).trim()
  if (!nonceStore.consume(pubkey, nonce)) {
    res.status(401).json({ error: 'Invalid or expired nonce' })
    return
  }

  if (chain === 'solana') {
    try {
      const pubkeyBytes = bs58.decode(pubkey)
      const sigBytes = Buffer.from(signature, 'base64')
      const msgBytes = new TextEncoder().encode(message)
      if (!nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes)) {
        res.status(401).json({ error: 'Signature verification failed' })
        return
      }
    } catch {
      res.status(401).json({ error: 'Signature verification failed' })
      return
    }
  }

  let customToken: string
  try {
    if (!admin.apps.length) admin.initializeApp()
    customToken = await admin.auth().createCustomToken(pubkey, { walletPubkey: pubkey, chain })
  } catch {
    res.status(500).json({ error: 'Failed to mint auth token' })
    return
  }

  res.json({ customToken, pubkey, chain })
})
