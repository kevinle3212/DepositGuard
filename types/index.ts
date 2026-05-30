export type DepositStatus =
  | 'Created'
  | 'Funded'
  | 'Pending Documentation'
  | 'Active'
  | 'Move-Out Pending'
  | 'Assessed'
  | 'Approved'
  | 'Disputed'
  | 'Resolved'

export interface Deposit {
  id: string
  status: DepositStatus
  amountSol: number
  landlordAddress: string
  tenantAddress: string
  propertyAddress: string
  propertyDescription?: string
  escrowAddress: string
  createdAt: string
  updatedAt: string
  moveInDate?: string
  moveOutDate?: string
  assessmentNotes?: string
  claimAmount?: number
  timeline: TimelineEvent[]
}

export interface TimelineEvent {
  status: DepositStatus
  timestamp: string
  note?: string
  actor?: string
}

export interface CreateDepositInput {
  tenantAddress: string
  propertyAddress: string
  propertyDescription?: string
  amountSol: number
  moveInDate: string
}

export interface WalletState {
  connected: boolean
  publicKey: string | null
  balance: number | null
  connecting: boolean
}

export interface AppStats {
  totalDeposits: number
  totalValueSol: number
  activeDeposits: number
  resolvedDeposits: number
}

export const DEPOSIT_STATUS_ORDER: DepositStatus[] = [
  'Created',
  'Funded',
  'Pending Documentation',
  'Active',
  'Move-Out Pending',
  'Assessed',
  'Approved',
  'Disputed',
  'Resolved',
]
