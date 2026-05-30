import express from 'express'
import { nonceRouter } from './routes/nonce.js'
import { verifyRouter } from './routes/verify.js'
import { requireAuth } from './middleware/require-auth.js'

const app = express()
app.use(express.json())

app.get('/health', (_, res) => res.json({ ok: true }))
app.use('/nonce', nonceRouter)
app.use('/verify', verifyRouter)

// Any route not matched above requires a valid Firebase Auth JWT with a walletPubkey claim.
// Missing or invalid auth → 401; valid auth but unknown path → 404.
app.use(requireAuth, (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = process.env.PORT ?? 8080
app.listen(PORT, () => console.log(`verify-wallet running on :${PORT}`))
