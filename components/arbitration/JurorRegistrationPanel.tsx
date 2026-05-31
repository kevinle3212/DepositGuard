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
import {
    Users,
    UserCheck,
    Loader2,
    ShieldCheck,
    Trophy,
    Coins,
    Minus,
    Plus,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getConnection } from "@/lib/solana";
import type { JurorRecord } from "@/app/api/jurors/route";

const JUROR_POOL_ADDRESS =
    process.env["NEXT_PUBLIC_JUROR_POOL_ADDRESS"] ?? "11111111111111111111111111111111";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function cooldownRemaining(stakedAt: string): number {
    return Math.max(0, COOLDOWN_MS - (Date.now() - new Date(stakedAt).getTime()));
}

function formatCooldown(ms: number): string {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((ms % (60 * 60 * 1000)) / 60000);
    return `${hours}h ${mins}m`;
}

export function JurorRegistrationPanel() {
    const wallet = useWallet();
    const [jurors, setJurors] = useState<JurorRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [addSol, setAddSol] = useState<string>("1");
    const [tick, setTick] = useState(0);

    const walletAddress = wallet.publicKey?.toBase58() ?? null;
    const myRecord = jurors.find((j) => j.walletAddress === walletAddress);
    const cooldownLeft = myRecord ? cooldownRemaining(myRecord.stakedAt) : 0;
    const canUnstake = !!myRecord && cooldownLeft === 0;

    useEffect(() => {
        const id = setInterval(() => {
            setTick((t) => t + 1);
        }, 60_000);
        return () => {
            clearInterval(id);
        };
    }, []);
    void tick;

    const fetchJurors = useCallback(async () => {
        try {
            const res = await fetch("/api/jurors");
            if (!res.ok) return;
            const data = (await res.json()) as { jurors: JurorRecord[] };
            setJurors(data.jurors);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchJurors();
    }, [fetchJurors]);

    async function sendSol(amountSol: number): Promise<boolean> {
        if (!wallet.publicKey || !wallet.signTransaction) {
            toast({ title: "Connect your wallet first", variant: "destructive" });
            return false;
        }
        const connection = getConnection();
        const latestBlockhash = await connection.getLatestBlockhash("confirmed");
        const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
        const message = new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
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
            description: `Staking ${amountSol} SOL.`,
            duration: 15000,
        });
        const signed = await wallet.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
        });
        await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, "confirmed");
        return true;
    }

    async function handleAddStake() {
        const amount = parseFloat(addSol);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Enter a valid amount (> 0 SOL)", variant: "destructive" });
            return;
        }
        setBusy(true);
        try {
            await sendSol(amount);
            const res = await fetch("/api/jurors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: wallet.publicKey?.toBase58() ?? "",
                    stakeSol: amount,
                }),
            });
            if (!res.ok) {
                const b = (await res.json()) as { error?: string };
                throw new Error(b.error ?? "Failed");
            }
            const result = (await res.json()) as { stakeSol: number };
            toast({
                title: myRecord ? "Stake Added!" : "Registered as Juror!",
                description: `Total stake: ${result.stakeSol} SOL`,
            });
            await fetchJurors();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            const rejected =
                msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("cancelled");
            toast({
                title: rejected ? "Cancelled" : "Failed",
                description: rejected ? "Transaction rejected." : msg,
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    async function handleUnstake() {
        if (!walletAddress || !canUnstake) return;
        setBusy(true);
        try {
            const res = await fetch("/api/jurors", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) throw new Error(data.error ?? "Failed");
            toast({ title: "Unstaked", description: "Your stake has been withdrawn." });
            await fetchJurors();
        } catch (e: unknown) {
            toast({
                title: "Unstake Failed",
                description: e instanceof Error ? e.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
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
                    Stake SOL to join the arbitration panel pool. Higher stake = higher selection
                    probability. A 7-day cooldown applies before you can withdraw.
                </p>

                {wallet.connected ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="text-sm font-semibold">
                                {myRecord ? "Manage Your Stake" : "Register as Juror"}
                            </p>
                            {myRecord && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    <UserCheck className="h-3 w-3" />
                                    {myRecord.stakeSol} SOL staked
                                </span>
                            )}
                        </div>

                        {/* Add stake */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.1"
                                    value={addSol}
                                    onChange={(e) => {
                                        setAddSol(e.target.value);
                                    }}
                                    placeholder="1"
                                    className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    disabled={busy}
                                />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">SOL</span>
                            <Button
                                size="sm"
                                className="gap-1.5 shrink-0"
                                onClick={() => void handleAddStake()}
                                disabled={busy}
                            >
                                {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : myRecord ? (
                                    <Plus className="h-3.5 w-3.5" />
                                ) : (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                )}
                                {myRecord ? "Add Stake" : "Stake & Register"}
                            </Button>
                        </div>

                        {/* Unstake row */}
                        {myRecord && (
                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                                {cooldownLeft > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                                        <Clock className="h-3.5 w-3.5" />
                                        Unstake in {formatCooldown(cooldownLeft)}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        Cooldown complete
                                    </span>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                                    onClick={() => void handleUnstake()}
                                    disabled={busy || !canUnstake}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                    Unstake All
                                </Button>
                            </div>
                        )}
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
                                                    <span className="text-xs text-primary font-semibold">
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
