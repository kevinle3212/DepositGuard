"use client";

import { useState, useCallback } from "react";

interface SummaryData {
    overview: string;
    keyTerms: {
        monthlyRent: string | null;
        depositAmount: string | null;
        leaseDuration: string | null;
        propertyAddress: string | null;
    };
    tenantObligations: string[];
    landlordObligations: string[];
    importantDates: string[];
    clausesToWatch: string[];
    language: string;
}

const LANGUAGES = [
    { code: "en", label: "English", native: "English" },
    { code: "es", label: "Spanish", native: "Español" },
    { code: "fr", label: "French", native: "Français" },
    { code: "zh", label: "Chinese", native: "中文" },
    { code: "ko", label: "Korean", native: "한국어" },
    { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
    { code: "ar", label: "Arabic", native: "العربية" },
    { code: "tl", label: "Tagalog", native: "Tagalog" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

interface Props {
    leaseId: string;
    hasPdf: boolean;
}

export function LeaseAgreementSummary({ leaseId, hasPdf }: Props) {
    const [open, setOpen] = useState(false);
    const [activeLang, setActiveLang] = useState<LangCode>("en");
    const [loadingLang, setLoadingLang] = useState<LangCode | null>(null);
    const [cache, setCache] = useState<Partial<Record<LangCode, SummaryData>>>({});
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(
        async (lang: LangCode) => {
            if (cache[lang]) {
                setActiveLang(lang);
                return;
            }
            setLoadingLang(lang);
            setError(null);
            try {
                const res = await fetch(`/api/leases/${leaseId}/summarize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lang }),
                });
                if (!res.ok) {
                    const { error: msg } = (await res.json()) as { error?: string };
                    throw new Error(msg ?? "Summarization failed");
                }
                const { summary } = (await res.json()) as { summary: SummaryData };
                setCache((prev) => ({ ...prev, [lang]: summary }));
                setActiveLang(lang);
            } catch (err) {
                setError(String(err));
            } finally {
                setLoadingLang(null);
            }
        },
        [leaseId, cache],
    );

    const handleOpen = () => {
        if (!open) {
            setOpen(true);
            if (!cache.en && !loadingLang) {
                void fetchSummary("en");
            }
        } else {
            setOpen(false);
        }
    };

    const summary = cache[activeLang];
    const isLoading = loadingLang !== null;

    if (!hasPdf) return null;

    return (
        <div className="rounded-lg border bg-card overflow-hidden">
            {/* Header / toggle */}
            <button
                onClick={handleOpen}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">AI Summary</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Beta
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Plain-language breakdown of this lease
                    </span>
                </div>
                <span className="text-muted-foreground text-lg leading-none select-none">
                    {open ? "−" : "+"}
                </span>
            </button>

            {open && (
                <div className="border-t px-4 pb-5 pt-4 space-y-5">
                    {/* Language selector */}
                    <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => void fetchSummary(lang.code)}
                                disabled={isLoading}
                                className={[
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                    activeLang === lang.code
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary",
                                    loadingLang === lang.code ? "opacity-60 cursor-wait" : "",
                                    isLoading && loadingLang !== lang.code
                                        ? "opacity-40 cursor-not-allowed"
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                            >
                                {loadingLang === lang.code ? "…" : lang.native}
                            </button>
                        ))}
                    </div>

                    {/* Error state */}
                    {error && !isLoading && (
                        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
                            {error}
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {isLoading && (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-5/6" />
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="h-16 bg-muted rounded" />
                                <div className="h-16 bg-muted rounded" />
                                <div className="h-16 bg-muted rounded" />
                                <div className="h-16 bg-muted rounded" />
                            </div>
                        </div>
                    )}

                    {/* Summary content */}
                    {!isLoading && summary && (
                        <div
                            className="space-y-5 text-sm"
                            dir={activeLang === "ar" ? "rtl" : "ltr"}
                        >
                            {/* Overview */}
                            <p className="text-foreground leading-relaxed">{summary.overview}</p>

                            {/* Key terms grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <KeyTermCard
                                    label="Monthly Rent"
                                    value={summary.keyTerms.monthlyRent}
                                />
                                <KeyTermCard
                                    label="Deposit"
                                    value={summary.keyTerms.depositAmount}
                                />
                                <KeyTermCard
                                    label="Lease Duration"
                                    value={summary.keyTerms.leaseDuration}
                                />
                                <KeyTermCard
                                    label="Property"
                                    value={summary.keyTerms.propertyAddress}
                                />
                            </div>

                            {/* Obligations + dates */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <BulletSection
                                    title="Tenant Obligations"
                                    items={summary.tenantObligations}
                                    accent="blue"
                                />
                                <BulletSection
                                    title="Landlord Obligations"
                                    items={summary.landlordObligations}
                                    accent="green"
                                />
                            </div>

                            {summary.importantDates.length > 0 && (
                                <BulletSection
                                    title="Important Dates"
                                    items={summary.importantDates}
                                    accent="yellow"
                                />
                            )}

                            {summary.clausesToWatch.length > 0 && (
                                <BulletSection
                                    title="Clauses to Watch"
                                    items={summary.clausesToWatch}
                                    accent="red"
                                />
                            )}

                            <p className="text-[11px] text-muted-foreground border-t pt-3">
                                This summary is AI-generated for informational purposes only and is
                                not legal advice. Always read the full contract before signing.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function KeyTermCard({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className="text-sm font-medium leading-snug">
                {value ?? <span className="text-muted-foreground italic">Not specified</span>}
            </p>
        </div>
    );
}

const ACCENT_CLASSES: Record<"blue" | "green" | "yellow" | "red", { dot: string; title: string }> =
    {
        blue: { dot: "bg-blue-500", title: "text-blue-700 dark:text-blue-400" },
        green: { dot: "bg-green-500", title: "text-green-700 dark:text-green-400" },
        yellow: { dot: "bg-yellow-500", title: "text-yellow-700 dark:text-yellow-400" },
        red: { dot: "bg-red-500", title: "text-red-700 dark:text-red-400" },
    };

function BulletSection({
    title,
    items,
    accent,
}: {
    title: string;
    items: string[];
    accent: "blue" | "green" | "yellow" | "red";
}) {
    const cls = ACCENT_CLASSES[accent];
    return (
        <div className="space-y-1.5">
            <h3 className={`text-xs font-semibold uppercase tracking-wide ${cls.title}`}>
                {title}
            </h3>
            <ul className="space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start">
                        <span
                            className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls.dot}`}
                        />
                        <span className="text-foreground leading-snug">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
