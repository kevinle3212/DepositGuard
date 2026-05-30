'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Wallet, ChevronDown, LogOut, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { shortenAddress } from '@/lib/utils'
import { useWalletStore } from '@/src/store/useWalletStore'

export function WalletButton() {
  const { connected, connecting, publicKey, disconnect: adapterDisconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { userRole, disconnect } = useWalletStore()
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleCopy = async () => {
    if (!publicKey) return
    await navigator.clipboard.writeText(publicKey.toBase58())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = () => {
    adapterDisconnect()
    disconnect()
    setMenuOpen(false)
  }

  if (connecting) {
    return (
      <Button disabled variant="outline" size="sm">
        <span className="animate-pulse">Connecting…</span>
      </Button>
    )
  }

  if (connected && publicKey) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {shortenAddress(publicKey.toBase58())}
          {userRole && (
            <span className="text-muted-foreground text-xs hidden sm:inline capitalize">
              {userRole}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-border bg-background shadow-lg p-1">
              <button
                onClick={handleCopy}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
                {copied ? 'Copied!' : 'Copy address'}
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={handleDisconnect}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Button size="sm" onClick={() => setVisible(true)} className="gap-2">
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}
