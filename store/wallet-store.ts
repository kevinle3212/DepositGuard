import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletStore {
  connected: boolean
  publicKey: string | null
  balance: number | null
  connecting: boolean
  setConnected: (connected: boolean, publicKey: string | null) => void
  setBalance: (balance: number | null) => void
  setConnecting: (connecting: boolean) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      connected: false,
      publicKey: null,
      balance: null,
      connecting: false,
      setConnected: (connected, publicKey) =>
        set({ connected, publicKey }),
      setBalance: (balance) => set({ balance }),
      setConnecting: (connecting) => set({ connecting }),
      disconnect: () =>
        set({ connected: false, publicKey: null, balance: null, connecting: false }),
    }),
    {
      name: 'depositguard-wallet',
      partialize: (state) => ({
        publicKey: state.publicKey,
        connected: state.connected,
      }),
    }
  )
)
