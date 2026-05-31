import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'landlord' | 'tenant' | 'arbitrator' | null

interface WalletState {
  walletConnected: boolean
  walletPubkey: string | null
  userRole: UserRole
  firebaseJwt: string | null
  firebaseUid: string | null
}

interface WalletActions {
  connect: (pubkey: string, role?: UserRole) => void
  disconnect: () => void
  setUserRole: (role: UserRole) => void
  setFirebaseJwt: (jwt: string | null) => void
  setFromFirebaseToken: (idToken: string) => void
}

export type WalletStore = WalletState & WalletActions

const INITIAL_STATE: WalletState = {
  walletConnected: false,
  walletPubkey: null,
  userRole: null,
  firebaseJwt: null,
  firebaseUid: null,
}

/**
 * Decode a Firebase JWT payload (base64url) without verification.
 * Firebase already verified the token server-side — we just need the claims.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice((base64.length % 4 || 4) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
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

      setFromFirebaseToken: (idToken: string) => {
        const payload = decodeJwtPayload(idToken)
        const walletPubkey = typeof payload.walletPubkey === 'string' ? payload.walletPubkey : null
        const role = (['landlord', 'tenant', 'arbitrator'] as UserRole[]).includes(
          payload.role as UserRole
        )
          ? (payload.role as UserRole)
          : null
        const uid = typeof payload.sub === 'string' ? payload.sub : null

        set({
          firebaseJwt: idToken,
          firebaseUid: uid,
          walletPubkey: walletPubkey ?? undefined,
          userRole: role,
          walletConnected: true,
        } as Partial<WalletState>)
      },
    }),
    {
      name: 'dg-wallet',
      // Only persist identity — never persist the JWT in localStorage
      partialize: (state) => ({
        walletConnected: state.walletConnected,
        walletPubkey: state.walletPubkey,
        userRole: state.userRole,
        firebaseUid: state.firebaseUid,
      }),
    }
  )
)
