"use client";

import { QueryProvider } from "./query-provider";
import { SolanaWalletProvider } from "./wallet-provider";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/src/lib/wagmi-config";

import "@rainbow-me/rainbowkit/styles.css";

const evmQueryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={evmQueryClient}>
                <RainbowKitProvider>
                    <QueryProvider>
                        <SolanaWalletProvider>{children}</SolanaWalletProvider>
                    </QueryProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
