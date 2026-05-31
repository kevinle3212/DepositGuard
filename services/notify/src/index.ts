import express, { Request, Response } from 'express'
import { z } from 'zod'
import { buildTemplate, type NotificationEvent } from './lib/templates.js'
import { queueEmail } from './lib/firestore.js'

const app = express()
app.use(express.json())

const NOTIFICATION_EVENTS: readonly NotificationEvent[] = [
  'magic_link_invite',
  'both_parties_signed',
  'move_in_photo_required',
  'move_out_complete',
  'assessment_ready',
  'deduction_statement',
  'dispute_opened',
  'arbitration_fee_due',
  'arbitration_fee_refunded',
  'ruling_issued',
  'minority_dissent_filed',
  'deposit_released',
  'deadline_warning',
  'claim_timeout_executed',
] as const

const SendSchema = z.object({
  leaseId: z.string().min(1),
  event: z.enum(NOTIFICATION_EVENTS as unknown as [NotificationEvent, ...NotificationEvent[]]),
  recipients: z.array(z.string().email()).min(1),
  variables: z.record(z.string()).optional().default({}),
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/send', async (req: Request, res: Response): Promise<void> => {
  const parsed = SendSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { leaseId, event, recipients, variables } = parsed.data

  let mailId: string
  try {
    const template = buildTemplate(leaseId, event, variables)
    mailId = await queueEmail(recipients, template)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[notify] failed leaseId=${leaseId} event=${event}:`, err)
    res.status(500).json({ error: 'Failed to queue email', detail: msg })
    return
  }

  console.log(`[notify] queued leaseId=${leaseId} event=${event} mailId=${mailId} recipients=${recipients.length}`)
  res.json({ ok: true, mailId })
})

const PORT = process.env.PORT ?? 8080
app.listen(PORT, () => console.log(`notify running on :${PORT}`))
