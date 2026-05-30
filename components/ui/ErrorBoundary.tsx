'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  context?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.context ? ` – ${this.props.context}` : ''}]`, error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Something went wrong</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              {this.props.context
                ? `An error occurred in ${this.props.context}.`
                : 'An unexpected error occurred.'}{' '}
              Please try again.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <code className="mt-2 block text-[10px] text-destructive font-mono">
                {this.state.error.message}
              </code>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={this.reset} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
