"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    ChevronDown,
    LogOut,
    Copy,
    Check,
    LayoutDashboard,
    FileText,
    Wallet,
    UserCheck,
    Building2,
    Scale,
} from "lucide-react";
import { useState } from "react";
import { cn, shortenAddress } from "@/lib/utils";
import { useWalletStore } from "@/src/store/useWalletStore";
import { Button } from "@/components/ui/button";
import { VoiceToggle } from "@/components/ui/VoiceToggle";

const NAV_LINKS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/deposits", label: "Deposits", icon: FileText },
    { href: "/jurors", label: "Jurors", icon: Scale },
];

function RoleBadge({ role }: { role: "landlord" | "tenant" | "arbitrator" | null }) {
    if (!role) return null;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                role === "landlord"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-blue-50 text-blue-700 ring-blue-200",
            )}
        >
            {role === "landlord" ? (
                <Building2 className="h-3 w-3" aria-hidden />
            ) : (
                <UserCheck className="h-3 w-3" aria-hidden />
            )}
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
}

function WalletMenu() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { publicKey, disconnect: adapterDisconnect } = useWallet();
    const { walletConnected, walletPubkey, userRole, disconnect } = useWalletStore();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const addr = publicKey?.toBase58() ?? walletPubkey;
        if (!addr) return;
        await navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    const handleDisconnect = () => {
        void adapterDisconnect();
        disconnect();
        setOpen(false);
        router.push("/connect");
    };

    if (!walletConnected || !walletPubkey) {
        return (
            <Button
                size="sm"
                onClick={() => {
                    router.push("/connect");
                }}
                className="gap-1.5"
                aria-label="Connect your wallet"
            >
                <Wallet className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Connect Wallet</span>
            </Button>
        );
    }

    return (
        <div className="relative flex items-center gap-2">
            <RoleBadge role={userRole} />

            <button
                onClick={() => {
                    setOpen((o) => !o);
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium",
                    "hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
            >
                <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden />
                <span className="font-mono text-xs">{shortenAddress(walletPubkey, 4)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setOpen(false);
                        }}
                    />
                    <div
                        role="menu"
                        className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-border bg-background shadow-lg py-1"
                    >
                        <div className="px-3 py-2 border-b border-border">
                            <p className="text-xs text-muted-foreground">Connected as</p>
                            <p className="text-xs font-mono font-medium truncate mt-0.5">
                                {walletPubkey}
                            </p>
                            {userRole && <RoleBadge role={userRole} />}
                        </div>

                        <button
                            role="menuitem"
                            onClick={handleCopy}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-emerald-500" aria-hidden />
                            ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
                            )}
                            {copied ? "Copied!" : "Copy address"}
                        </button>

                        <button
                            role="menuitem"
                            onClick={handleDisconnect}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-4 w-4" aria-hidden />
                            Disconnect
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export function TopNav() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="flex items-center font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            aria-label="NestCrow home"
                        >
                            <Image
                                src="/nestcrow-logo.png"
                                alt="NestCrow — Secure Rental Transactions"
                                width={528}
                                height={355}
                                priority
                                className="h-9 w-auto"
                            />
                        </Link>

                        {/* Desktop nav */}
                        <nav
                            aria-label="Main navigation"
                            className="hidden md:flex items-center gap-1"
                        >
                            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={pathname === href ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        pathname === href
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                    )}
                                >
                                    <Icon className="h-4 w-4" aria-hidden />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Right: voice toggle + wallet */}
                    <div className="flex items-center gap-2">
                        <VoiceToggle />
                        <WalletMenu />
                    </div>
                </div>

                {/* Mobile nav */}
                <nav
                    aria-label="Mobile navigation"
                    className="md:hidden flex items-center gap-1 pb-2"
                >
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={pathname === href ? "page" : undefined}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                                pathname === href
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
