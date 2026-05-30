import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'landlord' | 'tenant' | null

interface WalletState {
  walletConnected: boolean
  walletPubkey: string | null
  userRole: UserRole
  firebaseJwt: string | null
}

interface WalletActions {
  connect: (pubkey: string, role?: UserRole) => void
  disconnect: () => void
  setUserRole: (role: UserRole) => void
  setFirebaseJwt: (jwt: string | null) => void
}

export type WalletStore = WalletState & WalletActions

const INITIAL_STATE: WalletState = {
  walletConnected: false,
  walletPubkey: null,
  userRole: null,
  firebaseJwt: null,
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      connect: (pubkey, role = null) =>
        set({ walletConnected: true, walletPubkey: pubkey, userRole: role }),

      disconnect: () => set(INITIAL_STATE),

      setUserRole: (role) => set({ userRole: role }),

      setFirebaseJwt: (jwt) => set({ firebaseJwt: jwt }),
    }),
    {
      name: 'dg-wallet',
      // Only persist identity — never persist the JWT in localStorage
      partialize: (state) => ({
        walletConnected: state.walletConnected,
        walletPubkey: state.walletPubkey,
        userRole: state.userRole,
      }),
    }
  )
)
