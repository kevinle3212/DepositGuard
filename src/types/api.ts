import { z } from 'zod'

const VALID_STATUSES = [
  'Created',
  'Funded',
  'Pending Documentation',
  'Active',
  'Move-Out Pending',
  'Assessed',
  'Approved',
  'Disputed',
  'Resolved',
] as const

export const LeaseSchema = z.object({
  id: z.string(),
  propertyAddress: z.string().catch(''),
  landlordAddress: z.string().catch(''),
  tenantAddress: z.string().catch(''),
  depositAmount: z.number().catch(0),
  currency: z.enum(['USDC', 'SOL']).catch('USDC'),
  status: z.enum(VALID_STATUSES).catch('Created'),
  // Optional fields surfaced by the backend for UI display
  propertyName: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  landlordSigned: z.boolean().optional(),
  tenantSigned: z.boolean().optional(),
  contractHash: z.string().optional(),
  contractStorageUrl: z.string().optional(),
})

export type Lease = z.infer<typeof LeaseSchema>

export const DamageItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: z.enum(['Minor', 'Moderate', 'Major']),
  estimatedCost: z.number(),
})

export type DamageItem = z.infer<typeof DamageItemSchema>
