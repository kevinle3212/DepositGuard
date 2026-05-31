"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    User,
    Wallet,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDeposit } from "@/hooks/use-deposits";
import { useWalletStore } from "@/src/store/useWalletStore";
import { deserializeAndSignSolanaTx } from "@/src/lib/txEngine";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const RPC_URL = process.env["NEXT_PUBLIC_RPC_URL"] ?? "https://api.devnet.solana.com";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function DepositDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: deposit, isLoading, refetch } = useDeposit(id);
    const { walletPubkey } = useWalletStore();
    const wallet = useWallet();
    const [funding, setFunding] = useState(false);

    const isTenant = walletPubkey === deposit?.tenantAddress;
    const canFund = deposit?.status === "Created" && isTenant;

    async function handleFundEscrow() {
        if (!wallet.connected || !wallet.publicKey) {
            toast({ title: "Wallet not connected", variant: "destructive" });
            return;
        }
        try {
            setFunding(true);
            toast({
                title: "Awaiting Wallet Signature…",
                description: "Approve the escrow transaction in your wallet extension.",
                duration: 10000,
            });

            const res = await fetch(
                `/api/deposits/${id}/fund-tx?payer=${wallet.publicKey.toBase58()}`,
            );
            if (!res.ok) throw new Error("Failed to fetch unsigned escrow transaction");
            const { transaction } = (await res.json()) as { transaction: string };

            toast({
                title: "Confirming Block on Chain…",
                description: "Broadcasting signed transaction to Solana devnet.",
                duration: 15000,
            });

            const connection = new Connection(RPC_URL, "confirmed");
            const sig = await deserializeAndSignSolanaTx(transaction, wallet, connection);

            toast({
                title: "Escrow Funded!",
                description: `Signature: ${sig.slice(0, 8)}…`,
            });
            void refetch();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            const isRejected =
                msg.toLowerCase().includes("rejected") ||
                msg.toLowerCase().includes("cancelled") ||
                msg.toLowerCase().includes("user denied");
            toast({
                title: isRejected ? "Transaction Cancelled" : "Funding Failed",
                description: isRejected
                    ? "You rejected the signature request in your wallet."
                    : msg,
                variant: "destructive",
            });
        } finally {
            setFunding(false);
        }
    }

    if (isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </main>
        );
    }

    if (!deposit) {
        return (
            <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Deposit not found</p>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/deposits">Back to deposits</Link>
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-5">
            {/* Header */}
            <div>
                <Link
                    href="/deposits"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All deposits
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={deposit.status} />
                            <span className="text-xs text-muted-foreground font-mono">
                                {deposit.id}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground">
                            {deposit.propertyAddress}
                        </h1>
                        {deposit.propertyDescription && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {deposit.propertyDescription}
                            </p>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold tabular-nums">{deposit.amountSol} SOL</p>
                        <p className="text-xs text-muted-foreground">
                            Created {formatDate(deposit.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Fund Escrow CTA */}
            {canFund && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-semibold text-primary">
                                Action required: Fund escrow
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Sign the on-chain transaction to lock {deposit.amountSol} SOL into
                                escrow.
                            </p>
                        </div>
                        <Button
                            onClick={handleFundEscrow}
                            disabled={funding}
                            className="flex-shrink-0"
                        >
                            {funding ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing…
                                </>
                            ) : (
                                <>
                                    <Wallet className="h-4 w-4 mr-2" />
                                    Fund Escrow
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Parties */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Parties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[
                        { label: "Landlord", address: deposit.landlordAddress },
                        { label: "Tenant", address: deposit.tenantAddress },
                    ].map(({ label, address }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {label}
                                </p>
                                <p className="text-sm font-mono truncate">{address}</p>
                            </div>
                            {address === walletPubkey && (
                                <span className="ml-auto text-xs text-primary font-semibold flex-shrink-0">
                                    You
                                </span>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Escrow account */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Escrow Account
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-mono break-all">{deposit.escrowAddress}</p>
                    {deposit.moveInDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Move-in: {formatDate(deposit.moveInDate)}
                        </p>
                    )}
                    {deposit.moveOutDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Move-out: {formatDate(deposit.moveOutDate)}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Timeline */}
            {deposit.timeline.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="space-y-4">
                            {[...deposit.timeline].reverse().map((event, idx) => (
                                <li key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "flex h-7 w-7 items-center justify-center rounded-full ring-2 flex-shrink-0",
                                                idx === 0
                                                    ? "bg-primary ring-primary text-primary-foreground"
                                                    : "bg-muted ring-border text-muted-foreground",
                                            )}
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        </div>
                                        {idx < deposit.timeline.length - 1 && (
                                            <div
                                                className="mt-1 w-0.5 flex-1 bg-border"
                                                style={{ minHeight: 20 }}
                                            />
                                        )}
                                    </div>
                                    <div className="pb-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <StatusBadge status={event.status} />
                                            {event.actor && (
                                                <span className="text-xs text-muted-foreground">
                                                    by {event.actor}
                                                </span>
                                            )}
                                        </div>
                                        {event.note && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {event.note}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatDate(event.timestamp)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}
