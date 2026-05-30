'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  User,
  Landmark,
  Loader2,
  Shield,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn, shortenAddress, formatDate } from '@/lib/utils'
import { MOCK_LEASES } from '@/src/lib/lease-mock-data'

// ── Types ──────────────────────────────────────────────────────────────────

interface SignatureState {
  landlord: boolean
  tenant: boolean
}

// ── PDF viewer placeholder ─────────────────────────────────────────────────

function PdfViewer({ contractHash }: { contractHash?: string }) {
  return (
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-sm mb-4">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">Lease Agreement</p>
      {contractHash ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">Verified document</p>
          <code className="mt-2 rounded bg-background px-2 py-1 text-[10px] text-muted-foreground font-mono">
            sha256: {contractHash.slice(0, 16)}…
          </code>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No document uploaded</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground/60 text-center max-w-[180px]">
        Full PDF rendering via pdfjs-dist available in production build.
      </p>
    </div>
  )
}

// ── Signature row ──────────────────────────────────────────────────────────

function SignatureRow({
  label,
  address,
  signed,
}: {
  label: string
  address: string
  signed: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        {signed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" aria-label="Signed" />
        ) : (
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" aria-label="Pending" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground font-mono">{shortenAddress(address, 6)}</p>
        </div>
      </div>
      <span
        className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          signed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        )}
      >
        {signed ? 'Signed ✓' : 'Pending'}
      </span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SignPage() {
  const { id } = useParams<{ id: string }>()
  const { signMessage, publicKey } = useWallet()

  const lease = MOCK_LEASES.find((l) => l.id === id) ?? MOCK_LEASES[0]

  const [signatures, setSignatures] = useState<SignatureState>({
    landlord: lease.landlordSigned,
    tenant: lease.tenantSigned,
  })
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bothSigned = signatures.landlord && signatures.tenant

  async function handleSign() {
    setError(null)
    setSigning(true)

    try {
      if (signMessage && publicKey) {
        // Mock sign — in production: sign actual contract hash
        const msg = new TextEncoder().encode(
          `Sign lease ${id} · ${lease.contractHash ?? 'no-hash'}`
        )
        await signMessage(msg)
      } else {
        await new Promise((r) => setTimeout(r, 800)) // demo without wallet
      }

      // Determine which role the current user is (demo: toggle whichever is unsigned)
      setSignatures((prev) => {
        if (!prev.landlord) return { ...prev, landlord: true }
        return { ...prev, tenant: true }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signing cancelled.')
    } finally {
      setSigning(false)
    }
  }

  const canSign = !signing && !(signatures.landlord && signatures.tenant)

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">{lease.propertyName}</h1>
          <StatusBadge status={lease.status} />
        </div>
      </div>

      {/* Both-signed success banner */}
      {bothSigned && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">
              Both parties signed — escrow can now be funded.
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              The tenant can now transfer {lease.depositAmount.toLocaleString()} {lease.currency} to the escrow address.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Split-screen layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — PDF viewer */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Lease Agreement Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PdfViewer contractHash={lease.contractHash} />
            </CardContent>
          </Card>
        </div>

        {/* Right — financial summary + signatures */}
        <div className="lg:col-span-2 space-y-4">
          {/* Financial summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Escrow Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: MapPin, label: 'Property', value: lease.propertyAddress },
                { icon: User, label: 'Landlord', value: shortenAddress(lease.counterpartyAddress, 6) },
                { icon: User, label: 'Tenant', value: shortenAddress(lease.counterpartyAddress, 6) },
                { icon: Shield, label: 'Deposit', value: `${lease.depositAmount.toLocaleString()} ${lease.currency}` },
                { icon: Clock, label: 'Term', value: `${formatDate(lease.leaseStart)} – ${formatDate(lease.leaseEnd)}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium truncate">{value}</p>
                  </div>
                </div>
              ))}

              <Separator className="my-1" />

              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-0.5">Jurisdiction</p>
                <p>State-specific escrow rules apply. 21-day return window. Itemized deductions required.</p>
              </div>
            </CardContent>
          </Card>

          {/* Signature matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Signature Status</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <SignatureRow
                label="Landlord"
                address={lease.counterpartyAddress}
                signed={signatures.landlord}
              />
              <SignatureRow
                label="Tenant"
                address={lease.counterpartyAddress}
                signed={signatures.tenant}
              />
            </CardContent>
          </Card>

          {/* Sign button */}
          {!bothSigned && (
            <Button
              onClick={handleSign}
              disabled={!canSign}
              className="w-full gap-2"
              size="lg"
            >
              {signing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Signing in wallet…</>
              ) : (
                <><Shield className="h-4 w-4" />Sign Contract with Connected Wallet</>
              )}
            </Button>
          )}

          {bothSigned && (
            <Button asChild className="w-full" variant="outline">
              <Link href={`/lease/${id}/assessment`}>
                Continue to Assessment →
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
