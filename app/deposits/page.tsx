"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import { Nav } from "@/components/layout/nav";
import { WalletGate } from "@/components/layout/wallet-gate";
import { DepositCard } from "@/components/deposits/deposit-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletStore } from "@/src/store/useWalletStore";
import { useDeposits } from "@/hooks/use-deposits";
import type { DepositStatus } from "@/types";
import { DEPOSIT_STATUS_ORDER } from "@/types";

const ALL_STATUSES: DepositStatus[] = DEPOSIT_STATUS_ORDER;

export default function DepositsPage() {
    const { walletPubkey: publicKey, userRole } = useWalletStore();
    const { data: deposits, isLoading } = useDeposits(publicKey ?? undefined);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filtered = useMemo(() => {
        if (!deposits) return [];
        return deposits.filter((d) => {
            const matchesSearch =
                search === "" ||
                d.propertyAddress.toLowerCase().includes(search.toLowerCase()) ||
                d.tenantAddress.toLowerCase().includes(search.toLowerCase()) ||
                d.landlordAddress.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === "all" || d.status === statusFilter;

            // Hard-filter by the user's role — landlords only see contracts they
            // own; tenants only see contracts they're invited to.
            const matchesRole =
                userRole === "landlord"
                    ? d.landlordAddress === publicKey
                    : userRole === "tenant"
                      ? d.tenantAddress === publicKey
                      : true;

            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [deposits, search, statusFilter, userRole, publicKey]);

    return (
        <>
            <Nav />
            <WalletGate>
                <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Deposits</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isLoading
                                    ? "Loading…"
                                    : `${filtered.length} deposit${filtered.length !== 1 ? "s" : ""}`}
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/deposits/new">
                                <PlusCircle className="h-4 w-4" />
                                New Deposit
                            </Link>
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by address or property…"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                }}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-44">
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {ALL_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                        </div>
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-28 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="space-y-3">
                            {filtered.map((deposit) => (
                                <DepositCard
                                    key={deposit.id}
                                    deposit={deposit}
                                    {...(publicKey != null ? { myAddress: publicKey } : {})}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <p className="text-sm font-medium text-foreground">No results found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Try adjusting your filters or search query.
                            </p>
                            {deposits?.length === 0 && (
                                <Button asChild className="mt-4" size="sm">
                                    <Link href="/deposits/new">
                                        <PlusCircle className="h-4 w-4" />
                                        Create your first deposit
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </main>
            </WalletGate>
        </>
    );
}
