import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon } from 'wagmi/chains'

export const chains = [mainnet, polygon] as const

export const wagmiConfig = getDefaultConfig({
  appName: 'DepositGuard',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'depositguard-dev',
  chains,
  ssr: true,
})
