'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { deserializeAndSignSolanaTx } from '@/src/lib/txEngine'
import { toast } from '@/hooks/use-toast'
import {
  MessageSquare,
  Users,
  Scale,
  Landmark,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Info,
  Gavel,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

type DisputeTier = 'Negotiation' | 'Mediation' | 'Arbitration' | 'Court'
type ArbitratorVote = 'landlord' | 'tenant' | 'split'

interface Arbitrator {
  id: string
  name: string
  credential: string
  vote: ArbitratorVote | null
  dissent?: string
  dissentVariance?: number
}

// ── Mock data ──────────────────────────────────────────────────────────────

const ARBITRATORS: Arbitrator[] = [
  {
    id: 'arb_1',
    name: 'Dr. Patricia Nguyen',
    credential: 'Certified Property Arbitrator · 12 yrs',
    vote: 'landlord',
  },
  {
    id: 'arb_2',
    name: 'James O. Whitfield',
    credential: 'Licensed Mediator · Real Estate Law',
    vote: 'landlord',
  },
  {
    id: 'arb_3',
    name: 'Sofia Reyes, Esq.',
    credential: 'Consumer Tenancy Attorney · 8 yrs',
    vote: 'tenant',
    dissent:
      'The AI assessment substantially overvalued carpet replacement given standard wear-and-tear guidelines. The $320 estimate for 12 sq ft of carpet staining exceeds the documented depreciation schedule by 42%. I find for the tenant on this line item.',
    dissentVariance: 42,
  },
]

const TIER_STEPS: { id: DisputeTier; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'Negotiation', icon: MessageSquare, label: 'Negotiation', description: 'Direct party negotiation with platform mediation tools.' },
  { id: 'Mediation', icon: Users, label: 'Mediation', description: 'Licensed mediator facilitates structured settlement.' },
  { id: 'Arbitration', icon: Scale, label: 'Arbitration', description: '3-arbitrator panel issues binding verdict.' },
  { id: 'Court', icon: Landmark, label: 'Court', description: 'Small claims escalation. Escrow frozen pending ruling.' },
]

// ── Countdown hook ─────────────────────────────────────────────────────────

function useCountdown(endTs: number) {
  const [remaining, setRemaining] = useState(endTs - Date.now())

  useEffect(() => {
    const interval = setInterval(() => setRemaining(endTs - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [endTs])

  const totalSecs = Math.max(0, Math.floor(remaining / 1000))
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60

  return { d, h, m, s, expired: totalSecs <= 0 }
}

function TimerBadge({ label, endTs, accent }: { label: string; endTs: number; accent: string }) {
  const { d, h, m, s, expired } = useCountdown(endTs)
  return (
    <div className={cn('rounded-xl border px-4 py-3', accent)}>
      <p className="text-xs font-semibold mb-1">{label}</p>
      {expired ? (
        <p className="text-sm font-bold">Expired</p>
      ) : (
        <p className="text-xl font-mono font-bold tabular-nums">
          {d > 0 && `${d}d `}{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const RPC_URL =
  (process.env.NEXT_PUBLIC_RPC_URL as string | undefined) ??
  'https://api.devnet.solana.com'

export default function DisputePage() {
  const { id } = useParams<{ id: string }>()
  const wallet = useWallet()
  const [activeTier] = useState<DisputeTier>('Arbitration')
  const [landlordPaid, setLandlordPaid] = useState(true)
  const [tenantPaid, setTenantPaid] = useState(false)
  const [stakingRole, setStakingRole] = useState<'Landlord' | 'Tenant' | null>(null)

  // Timers
  const arbitrationEnd = Date.now() + 72 * 60 * 60 * 1000  // 72h from now
  const courtEscalationEnd = Date.now() + 14 * 24 * 60 * 60 * 1000  // 14 days

  const handleStakeFee = useCallback(
    async (role: 'Landlord' | 'Tenant', markPaid: () => void) => {
      if (!wallet.connected || !wallet.publicKey) {
        toast({ title: 'Wallet not connected', variant: 'destructive' })
        return
      }
      try {
        setStakingRole(role)
        toast({
          title: 'Awaiting Wallet Signature…',
          description: `Sign the $50 USDC arbitration staking fee as ${role}.`,
          duration: 10000,
        })
        const res = await fetch(
          `/api/deposits/${id}/stake-fee?payer=${wallet.publicKey.toBase58()}`
        )
        if (!res.ok) throw new Error('Failed to fetch unsigned staking transaction')
        const { transaction } = await res.json()

        toast({
          title: 'Confirming Block on Chain…',
          description: 'Broadcasting staking transaction to Solana devnet.',
          duration: 15000,
        })

        const connection = new Connection(RPC_URL, 'confirmed')
        const sig = await deserializeAndSignSolanaTx(transaction, wallet, connection)

        markPaid()
        toast({
          title: `${role} Staking Fee Paid`,
          description: `$50 USDC locked. Tx: ${sig.slice(0, 8)}…`,
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        const isRejected =
          msg.toLowerCase().includes('rejected') ||
          msg.toLowerCase().includes('cancelled') ||
          msg.toLowerCase().includes('user denied')
        toast({
          title: isRejected ? 'Transaction Cancelled' : 'Staking Failed',
          description: isRejected
            ? 'You rejected the signature request in your wallet.'
            : msg,
          variant: 'destructive',
        })
      } finally {
        setStakingRole(null)
      }
    },
    [id, wallet]
  )

  const activeTierIdx = TIER_STEPS.findIndex((t) => t.id === activeTier)
  const prevailingVote = 'landlord' // 2-1 majority
  const dissentingArbitrator = ARBITRATORS.find((a) => a.vote !== prevailingVote)

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/lease/${id}/assessment`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to assessment
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Dispute Resolution</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lease ID: {id}</p>
      </div>

      {/* ── Escrow release banner ── */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800">
          <span className="font-bold">Undisputed escrow balance allocations have been released immediately to both parties&apos; wallets.</span>
          {' '}Only the contested portion ($480 USDC) remains locked pending arbitration verdict.
        </p>
      </div>

      {/* ── Progress timeline ── */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Legal Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative" aria-label="Dispute tier progress">
            {TIER_STEPS.map((step, idx) => {
              const Icon = step.icon
              const isActive = idx === activeTierIdx
              const isDone = idx < activeTierIdx
              const isFuture = idx > activeTierIdx

              return (
                <li key={step.id} className={cn('flex gap-4', idx < TIER_STEPS.length - 1 && 'pb-6')}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ring-2',
                      isDone ? 'bg-emerald-500 ring-emerald-500 text-white' :
                      isActive ? 'bg-primary ring-primary text-primary-foreground' :
                      'bg-muted ring-border text-muted-foreground'
                    )}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    {idx < TIER_STEPS.length - 1 && (
                      <div className={cn('mt-2 w-0.5 flex-1', isDone ? 'bg-emerald-400' : 'bg-border')} style={{ minHeight: 24 }} />
                    )}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : isFuture ? 'text-muted-foreground' : 'text-foreground')}>
                        {step.label}
                      </p>
                      {isActive && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">Active</span>}
                      {isDone && <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 font-medium">Complete</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      {/* ── Arbitration staking ── */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Arbitration Escrow Staking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TimerBadge
              label="Staking window closes in"
              endTs={arbitrationEnd}
              accent="border-amber-200 bg-amber-50 text-amber-800"
            />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Arbitration Pool</p>
              <p className="text-xl font-bold tabular-nums">{(landlordPaid && tenantPaid ? 100 : landlordPaid || tenantPaid ? 50 : 0)} USDC</p>
              <p className="text-xs text-muted-foreground mt-0.5">of $100 required ($50 each)</p>
            </div>
          </div>

          <Separator />

          {/* Pay status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staking Status</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { label: 'Landlord' as const, paid: landlordPaid, markPaid: () => setLandlordPaid(true) },
                { label: 'Tenant' as const, paid: tenantPaid, markPaid: () => setTenantPaid(true) },
              ] as const).map(({ label, paid, markPaid }) => {
                const isBusy = stakingRole === label
                return (
                  <div key={label} className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5', paid ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-background')}>
                    <div className="flex items-center gap-2">
                      {paid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-500" />}
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {paid ? (
                      <span className="text-xs text-emerald-700 font-semibold">Paid $50 ✓</span>
                    ) : (
                      <button
                        onClick={() => handleStakeFee(label, markPaid)}
                        disabled={isBusy || stakingRole !== null}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                        {isBusy ? 'Signing…' : 'Pay $50 →'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Arbitrator panel ── */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" />
            Arbitration Panel Verdict
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Panel votes */}
          <div className="space-y-3">
            {ARBITRATORS.map((arb) => (
              <div key={arb.id} className={cn('flex items-start justify-between gap-4 rounded-xl border p-3', arb.vote !== prevailingVote && 'border-amber-200 bg-amber-50/30')}>
                <div>
                  <p className="text-sm font-semibold text-foreground">{arb.name}</p>
                  <p className="text-xs text-muted-foreground">{arb.credential}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                    arb.vote === prevailingVote ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  )}>
                    {arb.vote === prevailingVote
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    Finds for {arb.vote === 'landlord' ? 'Landlord' : 'Tenant'}
                  </span>
                  {arb.dissent && (
                    <span className="text-[10px] text-amber-600 font-semibold">Minority dissent</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Prevailing verdict */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-primary">Prevailing Verdict: Finds for Landlord (2–1)</p>
            </div>
            <p className="text-xs text-muted-foreground">
              $380 USDC deduction approved. Remaining $100 USDC disputed — subject to minority dissent review.
            </p>
          </div>

          {/* Minority dissent block */}
          {dissentingArbitrator?.dissent && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Minority Dissent — {dissentingArbitrator.name}</p>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">{dissentingArbitrator.dissent}</p>
              {dissentingArbitrator.dissentVariance && (
                <div className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
                  Variance documented: <strong>{dissentingArbitrator.dissentVariance}%</strong> above depreciation schedule
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Court escalation ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4 text-red-600" />
            Small Claims Court Escalation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TimerBadge
            label="Right to escalate expires in"
            endTs={courtEscalationEnd}
            accent="border-red-200 bg-red-50 text-red-800"
          />
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Either party may escalate to Small Claims Court within <strong>14 days</strong> of the panel verdict.
              Filing overrides the arbitration outcome. The contested escrow portion remains frozen until a court ruling is received.
            </p>
          </div>
          <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50">
            <Landmark className="h-4 w-4 mr-2" />
            File Small Claims Escalation
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
