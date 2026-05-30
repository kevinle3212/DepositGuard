// agent/agents.ts

export const AGENT_ROLES = ['platform-guide'] as const
export type AgentRole = (typeof AGENT_ROLES)[number]

export type AgentId = `agent_${string}`
export type AgentBranchId = `agtbrch_${string}`

export interface DepositGuardAgent {
  role: AgentRole
  id: AgentId
  branchId?: AgentBranchId
  label: string
  displayName: string
  voiceName: string
  description: string
  mode: 'voice' | 'text'
  defaultLanguage: 'en' | 'de' | 'es' | 'fr' | 'zh'
}

const PLATFORM_GUIDE_ID = (process.env.NEXT_PUBLIC_ELEVEN_AGENT_PLATFORM_GUIDE ??
  'agent_5701ksxanh84fdc8g33x3376zxmw') as AgentId

export const DEPOSITGUARD_AGENTS = {
  'platform-guide': {
    role: 'platform-guide',
    id: PLATFORM_GUIDE_ID,
    branchId: 'agtbrch_5501ksxan' as AgentBranchId,
    label: 'DepositGuard Assistant',
    displayName: 'Eryn',
    voiceName: 'Eryn - Friendly AI Assistant',
    description: 'Move-in/out docs, deposits, refund status, general support',
    mode: 'voice',
    defaultLanguage: 'en',
  },
} as const satisfies Record<AgentRole, DepositGuardAgent>

export function getAgent(role: AgentRole): DepositGuardAgent {
  return DEPOSITGUARD_AGENTS[role]
}
