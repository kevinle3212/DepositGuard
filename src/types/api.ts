import { z } from 'zod'

export const LeaseSchema = z.object({
  id: z.string(),
  propertyAddress: z.string(),
  landlordAddress: z.string(),
  tenantAddress: z.string(),
  depositAmount: z.number(),
  currency: z.enum(['USDC', 'SOL']),
  status: z.enum([
    'Created',
    'Funded',
    'Pending Documentation',
    'Active',
    'Move-Out Pending',
    'Assessed',
    'Approved',
    'Disputed',
    'Resolved',
  ]),
  // Optional fields surfaced by the backend for UI display
  propertyName: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  landlordSigned: z.boolean().optional(),
  tenantSigned: z.boolean().optional(),
  contractHash: z.string().optional(),
})

export type Lease = z.infer<typeof LeaseSchema>

export const DamageItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: z.enum(['Minor', 'Moderate', 'Major']),
  estimatedCost: z.number(),
})

export type DamageItem = z.infer<typeof DamageItemSchema>
