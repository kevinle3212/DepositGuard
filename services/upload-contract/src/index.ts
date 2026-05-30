import express from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from './middleware/require-auth.js'
import { uploadRouter } from './routes/upload.js'

const app = express()
app.use(express.json({ limit: '1kb' }))

const limiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests — please retry in a minute.' },
})

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/upload', limiter, requireAuth, uploadRouter)

const PORT = process.env.PORT ?? 8080
app.listen(PORT, () => console.log(`upload-contract running on :${PORT}`))
