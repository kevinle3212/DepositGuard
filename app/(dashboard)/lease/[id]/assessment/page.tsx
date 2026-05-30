'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  X,
  Edit3,
  Lock,
  Eye,
  ArrowLeft,
  Bot,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useWalletStore } from '@/src/store/useWalletStore'
import { useFetchAssessment } from '@/src/hooks/useLeaseApi'
import type { DamageItem as ApiDamageItem } from '@/src/types/api'
import { Skeleton } from '@/components/ui/skeleton'

type Severity = ApiDamageItem['severity']
type ItemAction = 'accept' | 'modify' | 'reject' | null

interface DamageItem extends ApiDamageItem {
  action: ItemAction
  modifiedCost?: number
}

const SEVERITY_STYLES: Record<Severity, string> = {
  Minor: 'bg-slate-100 text-slate-700',
  Moderate: 'bg-amber-50 text-amber-700',
  Major: 'bg-red-50 text-red-700',
}

// ── Sealed estimate module ─────────────────────────────────────────────────

interface EstimateState {
  mySubmitted: boolean
  myValue: string
  counterpartySubmitted: boolean
  revealed: boolean
  counterpartyValue: number
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const { userRole } = useWalletStore()
  const isLandlord = userRole !== 'tenant'

  const { data: assessmentItems, isLoading: assessmentLoading, isError: assessmentError } = useFetchAssessment(id)

  const [items, setItems] = useState<DamageItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const [estimate, setEstimate] = useState<EstimateState>({
    mySubmitted: false,
    myValue: '',
    counterpartySubmitted: false,
    revealed: false,
    counterpartyValue: 875,
  })

  // Sync fetched assessment items into local state
  useEffect(() => {
    if (assessmentItems) {
      setItems(assessmentItems.map((i) => ({ ...i, action: null })))
    }
  }, [assessmentItems])

  const AI_TOTAL = assessmentItems?.reduce((s, i) => s + i.estimatedCost, 0) ?? 0

  const acceptedTotal = items
    .filter((i) => i.action !== 'reject')
    .reduce((s, i) => s + (i.action === 'modify' ? (i.modifiedCost ?? i.estimatedCost) : i.estimatedCost), 0)

  const myNumeric = parseFloat(estimate.myValue) || 0
  const variance = AI_TOTAL > 0 ? Math.abs((myNumeric - AI_TOTAL) / AI_TOTAL) * 100 : 0
  const showVarianceWarning = estimate.mySubmitted && variance > 15

  function setAction(id: string, action: ItemAction) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        if (action === 'modify') setEditingId(id)
        else setEditingId(null)
        return { ...i, action }
      })
    )
  }

  function setModifiedCost(id: string, cost: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, modifiedCost: parseFloat(cost) || 0 } : i))
    )
  }

  function submitEstimate() {
    if (!estimate.myValue) return
    setEstimate((prev) => {
      const next = { ...prev, mySubmitted: true, counterpartySubmitted: true }
      setTimeout(() => setEstimate((s) => ({ ...s, revealed: true })), 1200)
      return next
    })
  }

  function mockReveal() {
    setEstimate((prev) => ({ ...prev, counterpartySubmitted: true, revealed: true }))
  }

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/lease/${id}/sign`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to lease
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Damage Assessment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lease ID: {id}</p>
      </div>

      {assessmentError && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <Info className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">Failed to load assessment data. Please refresh.</p>
        </div>
      )}

      {/* ── AI Report ── */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Assessment Engine Report</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Estimate Only — Not Legally Binding
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assessmentLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                    <th className="pb-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide w-28">Severity</th>
                    <th className="pb-2 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wide w-28">Est. Cost (USDC)</th>
                    {isLandlord && (
                      <th className="pb-2 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide w-52">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className={cn('transition-colors', item.action === 'reject' && 'opacity-40')}>
                      <td className="py-3 pr-4">
                        <p className={cn('text-sm', item.action === 'reject' && 'line-through')}>{item.description}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', SEVERITY_STYLES[item.severity])}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {item.action === 'modify' && editingId === item.id ? (
                          <Input
                            type="number"
                            defaultValue={item.modifiedCost ?? item.estimatedCost}
                            onChange={(e) => setModifiedCost(item.id, e.target.value)}
                            className="w-24 h-7 text-xs text-right ml-auto"
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <span>
                            ${(item.action === 'modify' ? (item.modifiedCost ?? item.estimatedCost) : item.estimatedCost).toLocaleString()}
                          </span>
                        )}
                      </td>
                      {isLandlord && (
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setAction(item.id, 'accept')}
                              className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors', item.action === 'accept' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted hover:bg-emerald-50 hover:text-emerald-700')}
                              aria-label="Accept item"
                            >
                              <Check className="h-3 w-3" />Accept
                            </button>
                            <button
                              onClick={() => setAction(item.id, 'modify')}
                              className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors', item.action === 'modify' ? 'bg-blue-100 text-blue-700' : 'bg-muted hover:bg-blue-50 hover:text-blue-700')}
                              aria-label="Modify cost"
                            >
                              <Edit3 className="h-3 w-3" />Modify
                            </button>
                            <button
                              onClick={() => setAction(item.id, 'reject')}
                              className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors', item.action === 'reject' ? 'bg-red-100 text-red-700' : 'bg-muted hover:bg-red-50 hover:text-red-700')}
                              aria-label="Reject item"
                            >
                              <X className="h-3 w-3" />Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={isLandlord ? 2 : 1} className="pt-3 text-sm font-semibold text-muted-foreground">
                      AI Benchmark Total
                    </td>
                    <td className="pt-3 text-right text-sm font-bold tabular-nums">${AI_TOTAL.toLocaleString()}</td>
                    {isLandlord && (
                      <td className="pt-3 text-right">
                        <span className="text-xs text-muted-foreground">Adjusted: ${acceptedTotal.toLocaleString()}</span>
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sealed estimate module ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Sealed Damage Estimate
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Each party submits a private estimate independently. Both are revealed simultaneously when both parties submit.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {!estimate.revealed ? (
            <>
              {!estimate.mySubmitted ? (
                <div className="space-y-3">
                  <label className="text-sm font-medium" htmlFor="myEstimate">
                    Your total damage estimate (USDC)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="myEstimate"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={estimate.myValue}
                        onChange={(e) => setEstimate((p) => ({ ...p, myValue: e.target.value }))}
                        className="pl-7"
                      />
                    </div>
                    <Button onClick={submitEstimate} disabled={!estimate.myValue}>
                      <Lock className="h-4 w-4 mr-2" />Seal Estimate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Lock className="h-5 w-5 text-slate-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Your estimate is successfully sealed.</p>
                      <p className="text-xs text-slate-600 mt-0.5">Waiting for the counterparty submission…</p>
                    </div>
                  </div>
                  <button onClick={mockReveal} className="text-xs text-muted-foreground underline">
                    [Demo] Simulate counterparty submission &amp; reveal
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn('h-2 w-2 rounded-full', estimate.mySubmitted ? 'bg-emerald-500' : 'bg-muted')} />
                You: {estimate.mySubmitted ? 'Submitted ✓' : 'Pending'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn('h-2 w-2 rounded-full', estimate.counterpartySubmitted ? 'bg-emerald-500' : 'bg-muted')} />
                Counterparty: {estimate.counterpartySubmitted ? 'Submitted ✓' : 'Pending'}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <Eye className="h-4 w-4" />
                Both estimates revealed
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Estimate</p>
                  <p className="text-2xl font-bold tabular-nums">${parseFloat(estimate.myValue).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Counterparty</p>
                  <p className="text-2xl font-bold tabular-nums">${estimate.counterpartyValue.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Variance from AI benchmark</span>
                <span className={cn('font-semibold tabular-nums', variance > 15 ? 'text-amber-600' : 'text-emerald-600')}>
                  {variance.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Variance warning ── */}
      {showVarianceWarning && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Variance exceeds 15% threshold.</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              We advise opening an official dispute tier or requesting arbitration panel upgrade.
              Your estimate of ${myNumeric.toLocaleString()} differs from the AI benchmark of
              ${AI_TOTAL.toLocaleString()} by {variance.toFixed(1)}%.
            </p>
            <Button asChild size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 text-white">
              <Link href={`/lease/${id}/dispute`}>Open Dispute →</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
