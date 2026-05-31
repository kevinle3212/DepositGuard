"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletStore } from "@/src/store/useWalletStore";

export function WalletSyncProvider({ children }: { children: React.ReactNode }) {
    const { connected, publicKey } = useWallet();
    const { connect, disconnect } = useWalletStore();
    // On page reload the adapter starts as connected=false while it initialises.
    // Guard against treating that transient false as a real disconnect — only
    // clear the store after the adapter has confirmed at least one connection.
    const hasEverConnected = useRef(false);

    useEffect(() => {
        if (connected && publicKey) {
            hasEverConnected.current = true;
            connect(publicKey.toBase58());
        } else if (hasEverConnected.current) {
            disconnect();
        }
    }, [connected, publicKey, connect, disconnect]);

    return <>{children}</>;
}
