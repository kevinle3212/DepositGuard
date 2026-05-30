import { cn } from '@/lib/utils'

export type LeaseStatus =
  | 'Created'
  | 'Funded'
  | 'Pending Documentation'
  | 'Active'
  | 'Move-Out Pending'
  | 'Assessed'
  | 'Approved'
  | 'Disputed'
  | 'Resolved'

interface StatusBadgeProps {
  status: LeaseStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const STATUS_STYLES: Record<LeaseStatus, { pill: string; dot: string; label: string }> = {
  Created: {
    pill: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
    label: 'Created',
  },
  Funded: {
    pill: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
    label: 'Funded',
  },
  'Pending Documentation': {
    pill: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
    label: 'Pending Docs',
  },
  Active: {
    pill: 'bg-green-50 text-green-700 ring-green-200',
    dot: 'bg-green-500',
    label: 'Active',
  },
  'Move-Out Pending': {
    pill: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    label: 'Move-Out Pending',
  },
  Assessed: {
    pill: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-400',
    label: 'Assessed',
  },
  Approved: {
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Approved',
  },
  Resolved: {
    pill: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    dot: 'bg-emerald-400',
    label: 'Resolved',
  },
  Disputed: {
    pill: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500',
    label: 'Disputed',
  },
}

const SIZE_STYLES = {
  sm: { badge: 'px-2 py-0.5 text-xs gap-1', dot: 'h-1.5 w-1.5' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5', dot: 'h-2 w-2' },
  lg: { badge: 'px-3 py-1 text-sm gap-2', dot: 'h-2 w-2' },
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status]
  const sz = SIZE_STYLES[size]

  return (
    <span
      role="status"
      aria-label={`Status: ${style.label}`}
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        style.pill,
        sz.badge,
        className
      )}
    >
      <span className={cn('rounded-full flex-shrink-0', style.dot, sz.dot)} aria-hidden />
      {style.label}
    </span>
  )
}
