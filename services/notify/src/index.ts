import express from 'express'

const app = express()
app.use(express.json())

app.get('/health', (_, res) => res.json({ ok: true }))

app.post('/send', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented — see TODO §15' })
})

const PORT = process.env.PORT ?? 8080
app.listen(PORT, () => console.log(`notify running on :${PORT}`))
