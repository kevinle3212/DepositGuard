import { z } from 'zod'

export const createDepositSchema = z.object({
  tenantAddress: z
    .string()
    .min(32, 'Invalid Solana address')
    .max(44, 'Invalid Solana address'),
  propertyAddress: z.string().min(5, 'Property address is required'),
  propertyDescription: z.string().optional(),
  amountSol: z
    .number()
    .min(0.001, 'Minimum deposit is 0.001 SOL')
    .max(1000, 'Maximum deposit is 1000 SOL'),
  moveInDate: z.string().min(1, 'Move-in date is required'),
})

export const disputeSchema = z.object({
  reason: z.string().min(20, 'Please provide a detailed reason (min 20 chars)'),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
})

export const assessmentSchema = z.object({
  notes: z.string().min(10, 'Assessment notes are required'),
  claimAmount: z.number().min(0).optional(),
  recommendation: z.enum(['approve', 'partial', 'deny']),
})

export type CreateDepositInput = z.infer<typeof createDepositSchema>
export type DisputeInput = z.infer<typeof disputeSchema>
export type AssessmentInput = z.infer<typeof assessmentSchema>
