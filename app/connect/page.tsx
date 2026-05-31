'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useMutation } from '@tanstack/react-query'
import { useAccount, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  Shield,
  Zap,
  HardDrive,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { useWalletStore } from '@/src/store/useWalletStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVoice } from '@/src/hooks/useVoice'

type Chain = 'solana' | 'evm' | 'hardware'
type Step = 'select' | 'signing' | 'verifying' | 'success'

interface WalletCategory {
  id: Chain
  label: string
  description: string
  wallets: string[]
  icon: React.ElementType
  accent: string
  border: string
}

async function verifyWallet(payload: { signature: string; pubkey: string; message: string; chain: Chain }) {
  const res = await fetch('/api/verify-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Verification failed')
  }
  return res.json() as Promise<{ jwt: string; pubkey: string; chain: Chain }>
}

const WALLET_CATEGORIES: WalletCategory[] = [
  {
    id: 'solana',
    label: 'Solana',
    description: 'Connect a Solana wallet. Deposits are held in on-chain escrow programs.',
    wallets: ['Phantom', 'Solflare', 'Backpack'],
    icon: Zap,
    accent: 'bg-violet-50 text-violet-700',
    border: 'border-violet-200 hover:border-violet-400',
  },
  {
    id: 'evm',
    label: 'EVM (Ethereum / Polygon)',
    description: 'Connect via RainbowKit — MetaMask, Coinbase Wallet, and 20+ others.',
    wallets: ['MetaMask', 'Coinbase Wallet', 'WalletConnect', '+20'],
    icon: Shield,
    accent: 'bg-blue-50 text-blue-700',
    border: 'border-blue-200 hover:border-blue-400',
  },
  {
    id: 'hardware',
    label: 'Hardware (Tangem)',
    description: 'Tap your Tangem card for the highest-security self-custody experience.',
    wallets: ['Tangem Card', 'Tangem Ring'],
    icon: HardDrive,
    accent: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200 hover:border-slate-400',
  },
]

function ConnectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'

  // Solana wallet
  const { signMessage, publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()

  // EVM wallet (wagmi + RainbowKit)
  const { address: evmAddress, isConnected: evmConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()

  const { connect: storeConnect, setFromFirebaseToken } = useWalletStore()
  const { speak } = useVoice()

  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [error, setError] = useState<string | null>(null)

  // Tracks whether we opened the wallet modal and are waiting for the user to approve
  const pendingSolanaSign = useRef(false)
  const pendingEvmSign = useRef(false)

  // After the Solana modal connects the wallet, auto-proceed to signing
  useEffect(() => {
    if (connected && publicKey && pendingSolanaSign.current) {
      pendingSolanaSign.current = false
      signAndVerify('solana', publicKey.toBase58())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey])

  // After EVM wallet connects via RainbowKit, auto-proceed to signing
  useEffect(() => {
    if (evmConnected && evmAddress && pendingEvmSign.current) {
      pendingEvmSign.current = false
      signAndVerifyEvm(evmAddress)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmConnected, evmAddress])

  const verifyMutation = useMutation({
    mutationFn: verifyWallet,
    onSuccess: async (data) => {
      setFromFirebaseToken(data.jwt)
      storeConnect(data.pubkey)
      setStep('success')
      await speak('wallet.connected', { chain: data.chain })
      setTimeout(() => router.replace(from), 800)
    },
    onError: (e: Error) => {
      setError(e.message)
      setStep('select')
    },
  })

  async function signAndVerify(chain: Chain, pubkey: string) {
    if (!signMessage) { setError('Wallet does not support message signing.'); return }
    try {
      setStep('signing')
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const unix_ts = Math.floor(Date.now() / 1000)
      const message = `DepositGuard identity verification ${nonce} ${unix_ts}`
      const sigBytes = await signMessage(new TextEncoder().encode(message))
      const signature = Buffer.from(sigBytes).toString('base64')
      setStep('verifying')
      await verifyMutation.mutateAsync({ signature, pubkey, message, chain })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signing cancelled or failed.')
      setStep('select')
    }
  }

  async function signAndVerifyEvm(pubkey: string) {
    try {
      setStep('signing')
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const unix_ts = Math.floor(Date.now() / 1000)
      const message = `DepositGuard identity verification ${nonce} ${unix_ts}`
      const signature = await signMessageAsync({ message })
      setStep('verifying')
      await verifyMutation.mutateAsync({ signature, pubkey, message, chain: 'evm' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signing cancelled or failed.')
      setStep('select')
    }
  }

  function handleSolanaConnect() {
    setSelectedChain('solana')
    setError(null)
    pendingSolanaSign.current = true
    setVisible(true)
  }

  function handleEvmConnect() {
    setSelectedChain('evm')
    setError(null)
    if (evmConnected && evmAddress) {
      // Wallet already connected — go straight to signing
      signAndVerifyEvm(evmAddress)
    } else {
      // Open RainbowKit modal; useEffect will pick up once connected
      pendingEvmSign.current = true
      openConnectModal?.()
    }
  }

  function handleHardwareConnect() {
    setSelectedChain('hardware')
    // @tangem/tangem-sdk-web is not available on npm.
    // To enable NFC Tangem signing: install @tangem/tangem-sdk-web and configure
    // NFC permissions in your browser/native host, then call TangemSdk.startSession().
    setError(
      'Tangem NFC — install @tangem/tangem-sdk-web and configure NFC permissions to enable hardware wallet signing.'
    )
  }

  const handlers: Record<Chain, () => void> = {
    solana: handleSolanaConnect,
    evm: handleEvmConnect,
    hardware: handleHardwareConnect,
  }

  const busy = step === 'signing' || step === 'verifying' || step === 'success'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">DepositGuard</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Connect your wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a wallet architecture to verify your identity and access DepositGuard.
            </p>
          </div>

          {step === 'signing' && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Awaiting wallet signature</p>
                <p className="text-xs text-amber-700 mt-0.5">Sign the identity challenge in your wallet.</p>
              </div>
            </div>
          )}
          {step === 'verifying' && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-blue-800">Verifying signature…</p>
            </div>
          )}
          {step === 'success' && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">Identity verified — redirecting…</p>
            </div>
          )}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Connection failed</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3" role="list">
            {WALLET_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = busy && selectedChain === cat.id
              return (
                <button
                  key={cat.id}
                  role="listitem"
                  onClick={handlers[cat.id]}
                  disabled={busy}
                  aria-label={`Connect with ${cat.label}`}
                  className={cn(
                    'group w-full rounded-xl border bg-card p-4 text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:pointer-events-none disabled:opacity-50',
                    isActive ? 'ring-2 ring-primary' : cat.border
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0', cat.accent)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{cat.label}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{cat.wallets.join(' · ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By connecting, you agree to the DepositGuard Terms of Service. Running on <strong>Devnet</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectInner />
    </Suspense>
  )
}
