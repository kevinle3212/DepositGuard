import express from 'express'
import { nonceRouter } from './routes/nonce.js'
import { verifyRouter } from './routes/verify.js'

const app = express()
app.use(express.json())

app.get('/health', (_, res) => res.json({ ok: true }))
app.use('/nonce', nonceRouter)
app.use('/verify', verifyRouter)

const PORT = process.env.PORT ?? 8080
app.listen(PORT, () => console.log(`verify-wallet running on :${PORT}`))
