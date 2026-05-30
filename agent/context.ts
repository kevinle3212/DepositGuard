import type { DepositStatus } from '@/types'

export function buildAgentContext(lease: {
  id: string
  status: DepositStatus
  disputeTier?: string
}) {
  return {
    dynamicVariables: {
      lease_id: lease.id,
      lease_status: lease.status,
      dispute_tier: lease.disputeTier ?? 'none',
    },
  }
}
