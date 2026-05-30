'use client'

import { useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/src/store/useWalletStore'

export function WalletSyncProvider({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet()
  const { connect, disconnect } = useWalletStore()

  useEffect(() => {
    if (connected && publicKey) {
      connect(publicKey.toBase58())
    } else {
      disconnect()
    }
  }, [connected, publicKey, connect, disconnect])

  return <>{children}</>
}
