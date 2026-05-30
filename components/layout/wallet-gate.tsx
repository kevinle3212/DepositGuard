'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/src/store/useWalletStore'
import { Shield } from 'lucide-react'

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected, connecting } = useWallet()
  // Persisted Zustand state — reflects a prior successful sign-in across page navigations
  const { walletConnected: storeConnected } = useWalletStore()
  const router = useRouter()

  // Defer guard check by one tick so the wallet adapter can set connecting=true (autoConnect)
  // before we decide to redirect. Without this, the guard fires with connected=false on every
  // fresh navigation even for authenticated users.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || connecting) return
    if (!connected && !storeConnected) {
      console.log('[WalletGate] No active wallet session — redirecting to /connect')
      router.replace('/connect')
    }
  }, [ready, connected, connecting, storeConnected, router])

  if (!ready || connecting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Connecting wallet…</p>
      </div>
    )
  }

  if (!connected && !storeConnected) return null

  return <>{children}</>
}
