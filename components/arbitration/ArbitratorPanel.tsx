"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { Scale, Loader2, CheckCircle2, AlertTriangle, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deserializeAndSignSolanaTx } from "@/src/lib/txEngine";
import { toast } from "@/hooks/use-toast";
const RPC_URL = process.env["NEXT_PUBLIC_RPC_URL"] ?? "https://api.devnet.solana.com";

interface DepositArb {
    id: string;
    status: string;
    maxFineUsdc?: number;
    landlordEstimateUsdc?: number;
    tenantEstimateUsdc?: number;
    estimatesRevealed?: boolean;
}

interface ArbitratorPanelProps {
    deposit: DepositArb;
    onResolved?: () => void;
}

export function ArbitratorPanel({ deposit, onResolved }: ArbitratorPanelProps) {
    const wallet = useWallet();
    const [fineUsdc, setFineUsdc] = useState<string>("0");
    const [resolving, setResolving] = useState(false);
    const [resolved, setResolved] = useState(false);
    const [txSig, setTxSig] = useState<string | null>(null);

    const maxFine = deposit.maxFineUsdc ?? 0;
    const disputedTotal = Math.max(
        deposit.landlordEstimateUsdc ?? 0,
        deposit.tenantEstimateUsdc ?? 0,
    );

    async function handleResolve() {
        if (!wallet.connected || !wallet.publicKey) {
            toast({ title: "Wallet not connected", variant: "destructive" });
            return;
        }

        const fine = parseInt(fineUsdc, 10);
        if (isNaN(fine) || fine < 0) {
            toast({ title: "Invalid fine amount", variant: "destructive" });
            return;
        }
        if (fine > maxFine) {
            toast({
                title: "Fine exceeds maximum",
                description: `Max allowed fine is $${maxFine.toLocaleString()} USDC`,
                variant: "destructive",
            });
            return;
        }

        setResolving(true);
        try {
            toast({
                title: "Awaiting Wallet Signature…",
                description: "Approve the resolve_dispute transaction.",
                duration: 12000,
            });

            const res = await fetch(
                `/api/deposits/${deposit.id}/resolve-dispute-tx?arbitrator=${wallet.publicKey.toBase58()}&fineUsdc=${fine}`,
            );
            if (!res.ok) {
                const b = (await res.json()) as { error?: string };
                throw new Error(b.error ?? "Failed to build transaction");
            }
            const { transaction } = (await res.json()) as { transaction: string };

            const connection = new Connection(RPC_URL, "confirmed");
            const sig = await deserializeAndSignSolanaTx(transaction, wallet, connection);

            setTxSig(sig);
            setResolved(true);
            toast({
                title: "Dispute Resolved!",
                description: `Fine of $${fine.toLocaleString()} USDC applied. Tx: ${sig.slice(0, 8)}…`,
            });
            onResolved?.();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            toast({ title: "Resolution Failed", description: msg, variant: "destructive" });
        } finally {
            setResolving(false);
        }
    }

    if (deposit.status !== "Disputed") return null;

    return (
        <Card className="border-amber-300/50 bg-amber-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                    <Scale className="h-4 w-4 text-amber-600" />
                    Arbitrator Panel
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {resolved ? (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">
                                Dispute resolved on-chain
                            </p>
                            <p className="text-xs text-emerald-700 mt-0.5">
                                Fine: ${parseInt(fineUsdc, 10).toLocaleString()} USDC applied.
                            </p>
                            {txSig && (
                                <p className="text-xs font-mono text-emerald-700 mt-0.5 break-all">
                                    Tx: {txSig.slice(0, 20)}…
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Estimates summary */}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg bg-background border border-border p-3">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                    Landlord est.
                                </p>
                                <p className="font-semibold tabular-nums">
                                    ${(deposit.landlordEstimateUsdc ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg bg-background border border-border p-3">
                                <p className="text-xs text-muted-foreground mb-0.5">Tenant est.</p>
                                <p className="font-semibold tabular-nums">
                                    ${(deposit.tenantEstimateUsdc ?? 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg bg-amber-100 border border-amber-200 p-3">
                                <p className="text-xs text-amber-700 mb-0.5">Max fine</p>
                                <p className="font-bold tabular-nums text-amber-900">
                                    ${maxFine.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {!deposit.estimatesRevealed && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    Estimates not yet revealed. Both parties must submit before you
                                    can resolve.
                                </p>
                            </div>
                        )}

                        {/* Fine input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Fine amount (USDC)
                                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                    0 – ${maxFine.toLocaleString()} max
                                </span>
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={maxFine}
                                    step={1}
                                    value={fineUsdc}
                                    onChange={(e) => {
                                        setFineUsdc(e.target.value);
                                    }}
                                    className="flex-1 accent-amber-600"
                                    disabled={resolving}
                                />
                                <div className="relative w-28">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={maxFine}
                                        value={fineUsdc}
                                        onChange={(e) => {
                                            setFineUsdc(e.target.value);
                                        }}
                                        className="w-full rounded-md border border-input bg-background pl-6 pr-2 py-1.5 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-ring"
                                        disabled={resolving}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Tenant receives $
                                {(disputedTotal - parseInt(fineUsdc || "0", 10)).toLocaleString()} ·
                                Landlord receives ${parseInt(fineUsdc || "0", 10).toLocaleString()}
                            </p>
                        </div>

                        <Button
                            className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => void handleResolve()}
                            disabled={resolving || !deposit.estimatesRevealed}
                        >
                            {resolving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing resolution…
                                </>
                            ) : (
                                <>
                                    <Gavel className="h-4 w-4" />
                                    Resolve Dispute On-Chain
                                </>
                            )}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
