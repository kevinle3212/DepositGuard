"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { WalletGate } from "@/components/layout/wallet-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createDepositSchema, type CreateDepositInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { Denomination } from "@/types";
import { useCreateDeposit } from "@/hooks/use-deposits";
import { useWalletStore } from "@/src/store/useWalletStore";

export default function NewDepositPage() {
    const router = useRouter();
    const { walletPubkey: publicKey } = useWalletStore();
    const createDeposit = useCreateDeposit();
    const [txSigning, setTxSigning] = useState(false);
    const [denomination, setDenomination] = useState<Denomination>("SOL");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm<CreateDepositInput>({
        resolver: zodResolver(createDepositSchema),
        defaultValues: { amountSol: 1 },
    });

    const amountSol = watch("amountSol");

    async function onSubmit(data: CreateDepositInput) {
        if (!publicKey) return;
        try {
            setTxSigning(true);
            // In production: fetch unsigned tx from API, sign client-side, submit
            await new Promise((r) => setTimeout(r, 800)); // simulate signing
            setTxSigning(false);

            const { propertyDescription, moveOutDate, ...rest } = data;
            const deposit = await createDeposit.mutateAsync({
                ...rest,
                landlordAddress: publicKey,
                denomination,
                ...(propertyDescription !== undefined ? { propertyDescription } : {}),
                ...(moveOutDate !== undefined && moveOutDate !== "" ? { moveOutDate } : {}),
            });
            router.push(`/deposits/${deposit.id}`);
        } catch {
            setTxSigning(false);
        }
    }

    const isBusy = isSubmitting || txSigning || createDeposit.isPending;

    return (
        <>
            <Nav />
            <WalletGate>
                <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
                    <div className="mb-6">
                        <Link
                            href="/deposits"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to deposits
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">New Deposit</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a trustless escrow for a security deposit on Solana.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Property details */}
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base">Property Details</CardTitle>
                                <CardDescription>
                                    Information about the rental property.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="propertyAddress">Property Address *</Label>
                                    <Input
                                        id="propertyAddress"
                                        placeholder="42 Maple Street, Austin TX 78701"
                                        {...register("propertyAddress")}
                                        disabled={isBusy}
                                    />
                                    {errors.propertyAddress && (
                                        <p className="text-xs text-destructive">
                                            {errors.propertyAddress.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="propertyDescription">
                                        Description{" "}
                                        <span className="text-muted-foreground">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="propertyDescription"
                                        placeholder="2BR/1BA apartment, 850 sqft…"
                                        rows={2}
                                        {...register("propertyDescription")}
                                        disabled={isBusy}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="moveInDate">Move-In Date *</Label>
                                        <Input
                                            id="moveInDate"
                                            type="date"
                                            {...register("moveInDate")}
                                            disabled={isBusy}
                                        />
                                        {errors.moveInDate && (
                                            <p className="text-xs text-destructive">
                                                {errors.moveInDate.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="moveOutDate">
                                            Lease End Date{" "}
                                            <span className="text-muted-foreground">
                                                (optional)
                                            </span>
                                        </Label>
                                        <Input
                                            id="moveOutDate"
                                            type="date"
                                            {...register("moveOutDate")}
                                            disabled={isBusy}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tenant & amount */}
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base">Escrow Terms</CardTitle>
                                <CardDescription>Tenant wallet and deposit amount.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="tenantAddress">Tenant Wallet Address *</Label>
                                    <Input
                                        id="tenantAddress"
                                        placeholder="Solana wallet address (base58)"
                                        className="font-mono text-sm"
                                        {...register("tenantAddress")}
                                        disabled={isBusy}
                                    />
                                    {errors.tenantAddress && (
                                        <p className="text-xs text-destructive">
                                            {errors.tenantAddress.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="amountSol">Deposit Amount *</Label>
                                    {/* Denomination toggle */}
                                    <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit mb-2">
                                        {(["SOL", "USDC"] as Denomination[]).map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => {
                                                    setDenomination(d);
                                                }}
                                                disabled={isBusy}
                                                className={cn(
                                                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                                                    denomination === d
                                                        ? "bg-background text-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="amountSol"
                                            type="number"
                                            step={denomination === "USDC" ? "1" : "0.001"}
                                            min={denomination === "USDC" ? "1" : "0.001"}
                                            max="1000000"
                                            {...register("amountSol", { valueAsNumber: true })}
                                            disabled={isBusy}
                                            className="pr-16"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                                            {denomination}
                                        </span>
                                    </div>
                                    {errors.amountSol && (
                                        <p className="text-xs text-destructive">
                                            {errors.amountSol.message}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800 space-y-1">
                                <p className="font-medium">How it works</p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    You (landlord) create the escrow. The tenant then funds it with{" "}
                                    <strong>
                                        {amountSol || "—"} {denomination}
                                    </strong>
                                    . Funds are locked on-chain until both parties complete the
                                    move-out process. No intermediary holds your money.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                disabled={isBusy}
                                className="flex-1"
                            >
                                <Link href="/deposits">Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                                {isBusy ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {txSigning ? "Sign in wallet…" : "Creating…"}
                                    </>
                                ) : (
                                    <>
                                        <Shield className="h-4 w-4" />
                                        Create Escrow
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </main>
            </WalletGate>
        </>
    );
}
