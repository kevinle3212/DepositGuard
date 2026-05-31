'use client'

import { useState, useEffect } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface Toast {
  id: number
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

let _id = 0
const listeners = new Set<(toasts: Toast[]) => void>()
let _toasts: Toast[] = []

function notify() {
  const snapshot = [..._toasts]
  listeners.forEach((fn) => { fn(snapshot); })
}

export function toast(opts: Omit<Toast, 'id'>) {
  const id = ++_id
  const duration = opts.duration ?? 5000
  _toasts = [..._toasts, { id, ...opts }]
  notify()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    notify()
  }, duration)
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  return { toasts, toast }
}
