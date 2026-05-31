"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletSyncProvider } from "./wallet-sync-provider";

const NETWORK = WalletAdapterNetwork.Devnet;

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
    const endpoint = useMemo(
        () => process.env["NEXT_PUBLIC_SOLANA_RPC_URL"] ?? clusterApiUrl(NETWORK),
        [],
    );

    const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            {/* autoConnect is intentionally false: with it true the provider
                silently reconnects whatever wallet is saved in localStorage on
                every load (e.g. Solflare), which then hijacks the "Solana"
                button. The connect page drives connect() explicitly after the
                user picks a wallet in the modal. */}
            <WalletProvider wallets={wallets} autoConnect={false}>
                <WalletModalProvider>
                    <WalletSyncProvider>{children}</WalletSyncProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
