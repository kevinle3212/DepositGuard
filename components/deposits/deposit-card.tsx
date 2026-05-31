import Link from "next/link";
import { MapPin, User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { shortenAddress, formatDate } from "@/lib/utils";
import type { Deposit } from "@/types";

interface DepositCardProps {
    deposit: Deposit;
    myAddress?: string;
}

export function DepositCard({ deposit, myAddress }: DepositCardProps) {
    const isLandlord = myAddress === deposit.landlordAddress;
    const role = isLandlord ? "Landlord" : "Tenant";
    const counterpartyAddress = isLandlord ? deposit.tenantAddress : deposit.landlordAddress;
    const counterpartyLabel = isLandlord ? "Tenant" : "Landlord";

    return (
        <Link href={`/deposits/${deposit.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <StatusBadge status={deposit.status} />
                                <span className="text-xs text-muted-foreground">{role}</span>
                            </div>

                            <div className="flex items-start gap-1.5 mb-1">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium text-foreground truncate">
                                    {deposit.propertyAddress}
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    {counterpartyLabel}: {shortenAddress(counterpartyAddress)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-lg font-bold text-foreground tabular-nums">
                                {deposit.amountSol} SOL
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatDate(deposit.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {deposit.moveInDate && (
                                <span className="text-xs text-muted-foreground">
                                    Move-in: {formatDate(deposit.moveInDate)}
                                </span>
                            )}
                            {deposit.moveOutDate && (
                                <span className="text-xs text-muted-foreground">
                                    Move-out: {formatDate(deposit.moveOutDate)}
                                </span>
                            )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
