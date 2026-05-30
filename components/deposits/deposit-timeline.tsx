import { cn, STATUS_CONFIG, formatDateTime } from '@/lib/utils'
import type { TimelineEvent } from '@/types'

interface DepositTimelineProps {
  events: TimelineEvent[]
}

export function DepositTimeline({ events }: DepositTimelineProps) {
  return (
    <ol className="relative space-y-6">
      {events.map((event, index) => {
        const config = STATUS_CONFIG[event.status]
        const isLast = index === events.length - 1

        return (
          <li key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 flex-shrink-0',
                  config.bg,
                  'border-current',
                  config.color
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', config.dot)} />
              </div>
              {!isLast && (
                <div className="mt-2 w-px flex-1 bg-border" style={{ minHeight: '24px' }} />
              )}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-sm font-semibold', config.color)}>
                  {event.status}
                </span>
                {event.actor && (
                  <span className="text-xs text-muted-foreground">
                    by {event.actor}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(event.timestamp)}
              </p>
              {event.note && (
                <p className="mt-1.5 text-sm text-foreground/80 bg-muted/50 rounded-lg px-3 py-2">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
