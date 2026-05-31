"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, FileText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/wallet-button";

const NAV_LINKS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/deposits", label: "Deposits", icon: FileText },
    { href: "/deposits/new", label: "New", icon: PlusCircle },
];

export function Nav() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="flex h-14 items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 font-semibold text-foreground"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                                <Shield className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <span className="hidden sm:inline">NestCrow</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        pathname === href
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <WalletButton />
                    </div>
                </div>

                {/* Mobile nav */}
                <nav className="md:hidden flex items-center gap-1 pb-2 -mx-1">
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                                pathname === href
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
