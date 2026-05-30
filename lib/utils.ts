import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DepositStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(4)
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STATUS_CONFIG: Record<
  DepositStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  Created: {
    label: 'Created',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    dot: 'bg-slate-400',
  },
  Funded: {
    label: 'Funded',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
  },
  'Pending Documentation': {
    label: 'Pending Docs',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  Active: {
    label: 'Active',
    color: 'text-green-700',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
  },
  'Move-Out Pending': {
    label: 'Move-Out Pending',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    dot: 'bg-orange-500',
  },
  Assessed: {
    label: 'Assessed',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    dot: 'bg-violet-500',
  },
  Approved: {
    label: 'Approved',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  Disputed: {
    label: 'Disputed',
    color: 'text-red-700',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
  },
  Resolved: {
    label: 'Resolved',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    dot: 'bg-slate-400',
  },
}
