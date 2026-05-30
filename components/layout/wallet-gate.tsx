'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Shield } from 'lucide-react'

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected, connecting } = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (!connecting && !connected) {
      router.replace('/connect')
    }
  }, [connected, connecting, router])

  if (connecting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Connecting wallet…</p>
      </div>
    )
  }

  if (!connected) return null

  return <>{children}</>
}
