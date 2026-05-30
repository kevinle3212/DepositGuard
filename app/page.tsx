'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  PlusCircle,
  Building2,
  UserCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Shield,
  ArrowRight,
  ChevronDown,
  MapPin,
  User,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { WalletGate } from '@/components/layout/wallet-gate'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, shortenAddress, formatDate } from '@/lib/utils'
import { useWalletStore } from '@/src/store/useWalletStore'
import {
  MOCK_LEASES,
  getActiveLeases,
  getHistoricLeases,
  type MockLease,
} from '@/src/lib/lease-mock-data'

async function fetchLeases(): Promise<MockLease[]> {
  await new Promise((r) => setTimeout(r, 500))
  return MOCK_LEASES
}

function LeaseCard({ lease, role }: { lease: MockLease; role: 'landlord' | 'tenant' }) {
  const isActionRequired =
    (role === 'tenant' && lease.status === 'Created') ||
    (role === 'landlord' && lease.status === 'Move-Out Pending')

  return (
    <Link href={`/lease/${lease.id}/sign`}>
      <Card className={cn('group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer', isActionRequired && 'ring-2 ring-amber-300 border-amber-200')}>
        <CardContent className="p-5">
          {isActionRequired && (
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 w-fit">
              <AlertCircle className="h-3.5 w-3.5" />
              {role === 'tenant' ? 'Action Required: Fund Escrow' : 'Action Required: Review'}
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <StatusBadge status={lease.status} />
              </div>
              <div className="flex items-start gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium truncate">{lease.propertyName}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Counterparty: {shortenAddress(lease.counterpartyAddress)}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-lg font-bold tabular-nums">{lease.depositAmount.toLocaleString()} {lease.currency}</span>
              <span className="text-xs text-muted-foreground">{formatDate(lease.leaseStart)} – {formatDate(lease.leaseEnd)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-end">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ role }: { role: 'landlord' | 'tenant' }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Shield className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">No leases yet</h3>
        <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">
          {role === 'landlord'
            ? 'Create your first lease to generate a trustless escrow for a security deposit.'
            : 'Your landlord needs to create a lease before you can fund the escrow.'}
        </p>
        {role === 'landlord' && (
          <Button asChild size="sm" className="mt-5">
            <Link href="/lease/setup"><PlusCircle className="h-4 w-4" />Create New Lease</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { walletPubkey, userRole, setUserRole } = useWalletStore()
  const [devRole, setDevRole] = useState<'landlord' | 'tenant'>(userRole ?? 'landlord')

  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases', walletPubkey],
    queryFn: fetchLeases,
    enabled: !!walletPubkey,
  })

  const activeLeases = useMemo(() => getActiveLeases(leases ?? []), [leases])
  const historicLeases = useMemo(() => getHistoricLeases(leases ?? []), [leases])
  const totalDeposited = useMemo(() => (leases ?? []).reduce((s, l) => s + l.depositAmount, 0), [leases])

  function toggleRole() {
    const next = devRole === 'landlord' ? 'tenant' : 'landlord'
    setDevRole(next)
    setUserRole(next)
  }

  const isLandlord = devRole === 'landlord'

  return (
    <>
      <TopNav />
      <WalletGate>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Viewing as: <span className={cn('font-semibold', isLandlord ? 'text-emerald-600' : 'text-blue-600')}>{devRole.charAt(0).toUpperCase() + devRole.slice(1)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={toggleRole} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Developer preview toggle">
                {isLandlord ? <Building2 className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                Switch to {isLandlord ? 'Tenant' : 'Landlord'} View
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {isLandlord && (
                <Button asChild>
                  <Link href="/lease/setup"><PlusCircle className="h-4 w-4" />Create New Lease</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              {[0,1,2].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-7 w-16" /></CardContent></Card>)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              {[
                { value: leases?.length ?? 0, label: 'Total Leases', icon: Shield, accent: 'bg-primary/10 text-primary' },
                { value: activeLeases.length, label: 'Active', icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-600' },
                { value: `${totalDeposited.toLocaleString()} USDC`, label: 'Total Escrowed', icon: Clock, accent: 'bg-blue-50 text-blue-600' },
              ].map(({ value, label, icon: Icon, accent }) => (
                <Card key={label}><CardContent className="p-5 flex items-center justify-between">
                  <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p></div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accent)}><Icon className="h-5 w-5" /></div>
                </CardContent></Card>
              ))}
            </div>
          )}

          {/* Active */}
          <section className="mb-10">
            <h2 className="mb-4 text-base font-semibold">Active Leases {!isLoading && <span className="text-xs font-normal text-muted-foreground ml-1">({activeLeases.length})</span>}</h2>
            {isLoading ? (
              <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
            ) : activeLeases.length === 0 ? <EmptyState role={devRole} /> : (
              <div className="grid gap-3 sm:grid-cols-2">{activeLeases.map(l => <LeaseCard key={l.id} lease={l} role={devRole} />)}</div>
            )}
          </section>

          {/* Historic */}
          {!isLoading && historicLeases.length > 0 && (
            <section>
              <h2 className="mb-4 text-base font-semibold">Archived / Resolved <span className="text-xs font-normal text-muted-foreground ml-1">({historicLeases.length})</span></h2>
              <div className="grid gap-3 sm:grid-cols-2">{historicLeases.map(l => <LeaseCard key={l.id} lease={l} role={devRole} />)}</div>
            </section>
          )}
        </main>
      </WalletGate>
    </>
  )
}
