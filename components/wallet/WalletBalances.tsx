'use client'

import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Coins, Loader2 } from 'lucide-react'

// USDC mint on Solana Devnet
const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

interface Balances {
  sol: number | null
  usdc: number | null
}

export function WalletBalances() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [balances, setBalances] = useState<Balances>({ sol: null, usdc: null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setBalances({ sol: null, usdc: null })
      return
    }

    let cancelled = false

    async function fetchBalances() {
      setLoading(true)
      try {
        // SOL balance
        const lamports = await connection.getBalance(publicKey!)
        const sol = lamports / 1e9

        // USDC token account balance
        let usdc: number | null = null
        try {
          const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token')
          const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, publicKey!)
          const tokenAccount = await getAccount(connection, ata)
          usdc = Number(tokenAccount.amount) / 1e6 // USDC has 6 decimals
        } catch {
          // No USDC ATA found — treat as 0
          usdc = 0
        }

        if (!cancelled) {
          setBalances({ sol, usdc })
        }
      } catch {
        // RPC error — silently fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBalances()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [publicKey, connection])

  if (!publicKey) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1">
        <Coins className="h-3.5 w-3.5 text-violet-600" />
        {loading && balances.sol === null ? (
          <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
        ) : (
          <span className="text-xs font-semibold text-violet-700 tabular-nums">
            {balances.sol !== null ? `${balances.sol.toFixed(4)} SOL` : '— SOL'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
        <span className="text-[10px] font-bold text-blue-600">USDC</span>
        {loading && balances.usdc === null ? (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        ) : (
          <span className="text-xs font-semibold text-blue-700 tabular-nums">
            {balances.usdc !== null ? `${balances.usdc.toFixed(2)} USDC` : '— USDC'}
          </span>
        )}
      </div>
    </div>
  )
}
