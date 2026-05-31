import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AppProviders } from '@/providers/app-providers'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NestCrow',
    template: '%s · NestCrow',
  },
  description:
    'Trustless security deposit escrow on Solana with AI-assisted damage assessment.',
  applicationName: 'NestCrow',
}

export const viewport: Viewport = {
  themeColor: '#1e2f47',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/*
       * AppProviders mounts (in order):
       *   QueryClientProvider  — React Query server-state cache
       *   SolanaWalletProvider — ConnectionProvider + WalletProvider + WalletModalProvider
       *   WalletSyncProvider   — syncs adapter state → useWalletStore
       */}
      <body className="font-sans min-h-screen bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
