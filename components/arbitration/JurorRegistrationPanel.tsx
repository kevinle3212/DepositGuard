"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Users, UserCheck, Loader2, ShieldCheck, Trophy, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getConnection } from "@/lib/solana";
import type { JurorRecord } from "@/app/api/jurors/route";

// Juror pool wallet — receives the staked SOL (replace with a PDA in production)
const JUROR_POOL_ADDRESS =
    process.env["NEXT_PUBLIC_JUROR_POOL_ADDRESS"] ?? "11111111111111111111111111111111";

export function JurorRegistrationPanel() {
    const wallet = useWallet();
    const [jurors, setJurors] = useState<JurorRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [stakeSol, setStakeSol] = useState<string>("1");

    const walletAddress = wallet.publicKey?.toBase58() ?? null;
    const existingRecord = jurors.find((j) => j.walletAddress === walletAddress);
    const isRegistered = !!existingRecord;

    const fetchJurors = useCallback(async () => {
        try {
            const res = await fetch("/api/jurors");
            if (!res.ok) return;
            const data = (await res.json()) as { jurors: JurorRecord[] };
            setJurors(data.jurors.sort((a, b) => b.stakeSol - a.stakeSol));
        } catch {
            // ignore network errors
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchJurors();
    }, [fetchJurors]);

    async function handleRegister() {
        if (!wallet.publicKey || !wallet.signTransaction) {
            toast({ title: "Connect your wallet first", variant: "destructive" });
            return;
        }

        const stake = parseFloat(stakeSol);
        if (isNaN(stake) || stake <= 0) {
            toast({ title: "Enter a valid SOL amount (> 0)", variant: "destructive" });
            return;
        }

        setRegistering(true);
        try {
            // 1. Transfer SOL to juror pool on-chain
            const connection = getConnection();
            const latestBlockhash = await connection.getLatestBlockhash("confirmed");
            const { blockhash } = latestBlockhash;
            const lamports = Math.round(stake * LAMPORTS_PER_SOL);

            const message = new TransactionMessage({
                payerKey: wallet.publicKey,
                recentBlockhash: blockhash,
                instructions: [
                    SystemProgram.transfer({
                        fromPubkey: wallet.publicKey,
                        toPubkey: new PublicKey(JUROR_POOL_ADDRESS),
                        lamports,
                    }),
                ],
            }).compileToV0Message();

            const tx = new VersionedTransaction(message);

            toast({
                title: "Approve in wallet…",
                description: `Staking ${stake} SOL to the juror pool.`,
                duration: 15000,
            });

            const signed = await wallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signed.serialize(), {
                skipPreflight: false,
            });
            await connection.confirmTransaction(
                { signature: sig, ...latestBlockhash },
                "confirmed",
            );

            // 2. Record registration in Firestore
            const res = await fetch("/api/jurors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: wallet.publicKey.toBase58(),
                    stakeSol: stake,
                }),
            });
            if (!res.ok) {
                const b = (await res.json()) as { error?: string };
                throw new Error(b.error ?? "Registration failed");
            }

            toast({
                title: isRegistered ? "Stake Updated" : "Registered as Juror!",
                description: `${stake} SOL staked. Tx: ${sig.slice(0, 8)}…`,
            });
            await fetchJurors();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            const rejected =
                msg.toLowerCase().includes("rejected") ||
                msg.toLowerCase().includes("cancelled") ||
                msg.toLowerCase().includes("user denied");
            toast({
                title: rejected ? "Transaction Cancelled" : "Registration Failed",
                description: rejected ? "You rejected the wallet request." : msg,
                variant: "destructive",
            });
        } finally {
            setRegistering(false);
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Juror Registry
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                        {jurors.length} registered
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                    Stake SOL to register as a juror. When a dispute escalates to a 3-panelist
                    arbitration, registered jurors are eligible for selection based on their stake.
                </p>

                {/* Registration form */}
                {wallet.connected ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                                {isRegistered ? "Update Your Stake" : "Register as Juror"}
                            </p>
                            {isRegistered && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    <UserCheck className="h-3 w-3" />
                                    Registered · {existingRecord.stakeSol} SOL
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.1"
                                    value={stakeSol}
                                    onChange={(e) => {
                                        setStakeSol(e.target.value);
                                    }}
                                    placeholder="1"
                                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    disabled={registering}
                                />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">SOL</span>
                        </div>
                        <Button
                            className="w-full gap-2"
                            size="sm"
                            onClick={() => void handleRegister()}
                            disabled={registering}
                        >
                            {registering ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {isRegistered ? "Updating…" : "Staking & Registering…"}
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {isRegistered ? "Update Stake" : "Stake SOL & Register"}
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground italic px-1">
                        Connect your wallet to stake SOL and register as a juror.
                    </p>
                )}

                {/* Leaderboard */}
                {loading ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Loading jurors…</span>
                    </div>
                ) : jurors.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        No jurors registered yet. Be the first!
                    </p>
                ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide">
                                        Juror
                                    </th>
                                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide w-24">
                                        Staked
                                    </th>
                                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide w-16">
                                        Cases
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {jurors.slice(0, 10).map((juror, i) => (
                                    <tr
                                        key={juror.walletAddress}
                                        className={cn(
                                            juror.walletAddress === walletAddress && "bg-primary/5",
                                        )}
                                    >
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                {i === 0 && (
                                                    <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                                )}
                                                <span className="text-xs font-mono truncate max-w-[130px]">
                                                    {juror.walletAddress.slice(0, 4)}…
                                                    {juror.walletAddress.slice(-4)}
                                                </span>
                                                {juror.walletAddress === walletAddress && (
                                                    <span className="text-xs text-primary font-semibold flex-shrink-0">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-xs">
                                            {juror.stakeSol} SOL
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                                            {juror.casesServed}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
