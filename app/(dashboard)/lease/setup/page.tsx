"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import {
    ArrowLeft,
    Upload,
    FileText,
    CheckCircle2,
    Loader2,
    Info,
    AlertCircle,
    Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCreateLease } from "@/src/hooks/useLeaseApi";
import { useWalletStore } from "@/src/store/useWalletStore";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Schema ─────────────────────────────────────────────────────────────────

const US_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
];

const leaseSetupSchema = z.object({
    streetAddress: z.string().min(5, "Street address required"),
    city: z.string().min(2, "City required"),
    state: z.string().length(2, "Select a US state"),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP"),
    tenantAddress: z.string().min(32, "Invalid wallet address").max(44),
    depositAmount: z.number().min(1, "Minimum $1").max(100_000, "Maximum $100,000"),
    currency: z.enum(["USDC", "SOL"]),
    leaseStart: z.string().min(1, "Required"),
    leaseEnd: z.string().min(1, "Required"),
    disputeThreshold: z.number().min(5).max(50),
});

type LeaseSetupInput = z.infer<typeof leaseSetupSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

async function sha256Hex(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function uploadContract(file: File): Promise<{ hash: string; storageUrl: string }> {
    const hash = await sha256Hex(file);
    const storageRef = ref(storage, `contracts/${hash}/${file.name}`);
    // Always force application/pdf — some browsers report an empty or incorrect
    // MIME type for dragged files, which would cause Firebase Storage rules to
    // reject the upload (rules require contentType == 'application/pdf').
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => {
            reject(new Error("Upload timed out after 30 s — check your connection and try again."));
        }, 30_000),
    );
    await Promise.race([
        uploadBytes(storageRef, file, { contentType: "application/pdf" }),
        timeout,
    ]);
    const storageUrl = await getDownloadURL(storageRef);
    return { hash, storageUrl };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ContractDropzone({
    onFile,
}: {
    onFile: (file: File, hash: string, storageUrl: string) => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const onDrop = useCallback(
        async (accepted: File[]) => {
            const file = accepted[0];
            if (!file) return;
            setProcessing(true);
            setUploadError(null);
            try {
                const { hash, storageUrl } = await uploadContract(file);
                onFile(file, hash, storageUrl);
            } catch (err) {
                setUploadError(
                    err instanceof Error
                        ? err.message
                        : "Upload failed — check Firebase Storage config.",
                );
            } finally {
                setProcessing(false);
            }
        },
        [onFile],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
        disabled: processing,
    });

    return (
        <div className="space-y-2">
            <div
                {...getRootProps()}
                className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                    isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    processing && "pointer-events-none opacity-70",
                )}
            >
                <input {...getInputProps()} aria-label="Contract file upload" />
                {processing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                )}
                <p className="text-sm font-medium text-foreground">
                    {processing
                        ? "Uploading to secure storage…"
                        : isDragActive
                          ? "Drop to upload"
                          : "Drag contract here"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF only · max 20 MB</p>
            </div>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
    );
}

function ThresholdSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>Dispute Threshold</Label>
                <span className="text-sm font-semibold text-foreground tabular-nums">{value}%</span>
            </div>
            <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={value}
                onChange={(e) => {
                    onChange(Number(e.target.value));
                }}
                className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
                aria-label={`Dispute threshold: ${value}%`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>5% (strict)</span>
                <span>50% (lenient)</span>
            </div>
            <p className="text-xs text-muted-foreground">
                AI assessment variance greater than {value}% triggers an automatic dispute
                escalation prompt.
            </p>
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LeaseSetupPage() {
    const router = useRouter();
    const { walletPubkey } = useWalletStore();
    const [contractFile, setContractFile] = useState<{
        name: string;
        hash: string;
        storageUrl: string;
    } | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const createLease = useCreateLease();

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<LeaseSetupInput>({
        resolver: zodResolver(leaseSetupSchema),
        defaultValues: {
            currency: "USDC",
            disputeThreshold: 15,
        },
    });

    async function onSubmit(data: LeaseSetupInput) {
        setSubmitError(null);
        try {
            const lease = await createLease.mutateAsync({
                propertyAddress: `${data.streetAddress}, ${data.city}, ${data.state} ${data.zip}`,
                depositAmount: data.depositAmount,
                currency: data.currency,
                tenantAddress: data.tenantAddress,
                jurisdiction: data.state,
                leaseStart: data.leaseStart,
                leaseEnd: data.leaseEnd,
                landlordAddress: walletPubkey ?? "",
                ...(contractFile
                    ? {
                          contractHash: contractFile.hash,
                          contractStorageUrl: contractFile.storageUrl,
                      }
                    : {}),
            });

            // Generate a landlord signing token so the sign page validates correctly
            const tokenRes = await fetch("/api/sign/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leaseId: lease.id, role: "landlord" }),
            });
            if (tokenRes.ok) {
                const { token } = (await tokenRes.json()) as { token: string };
                router.push(`/lease/${lease.id}/sign?token=${token}`);
            } else {
                // Fall back to the sign page without a token if generation fails
                router.push(`/lease/${lease.id}/sign`);
            }
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
        }
    }

    const submitting = createLease.isPending;

    return (
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to dashboard
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Create New Lease</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Set up a trustless escrow agreement. The tenant will be notified to sign and
                    fund.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                {/* Property details */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Property Details</CardTitle>
                        <CardDescription>The rental property address.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="streetAddress">Street Address *</Label>
                            <Input
                                id="streetAddress"
                                placeholder="142 Oak Street Apt 4B"
                                {...register("streetAddress")}
                                disabled={submitting}
                            />
                            {errors.streetAddress && (
                                <p className="text-xs text-destructive">
                                    {errors.streetAddress.message}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="col-span-2 sm:col-span-1 space-y-1.5">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    placeholder="Austin"
                                    {...register("city")}
                                    disabled={submitting}
                                />
                                {errors.city && (
                                    <p className="text-xs text-destructive">
                                        {errors.city.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="state">State *</Label>
                                <Controller
                                    name="state"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={submitting}
                                        >
                                            <SelectTrigger id="state">
                                                <SelectValue placeholder="TX" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {US_STATES.map((s) => (
                                                    <SelectItem key={s} value={s}>
                                                        {s}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.state && (
                                    <p className="text-xs text-destructive">
                                        {errors.state.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="zip">ZIP *</Label>
                                <Input
                                    id="zip"
                                    placeholder="78701"
                                    {...register("zip")}
                                    disabled={submitting}
                                />
                                {errors.zip && (
                                    <p className="text-xs text-destructive">{errors.zip.message}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Escrow terms */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Escrow Terms</CardTitle>
                        <CardDescription>
                            Tenant wallet, deposit amount, and lease dates.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="tenantAddress">Tenant Wallet Address *</Label>
                            <Input
                                id="tenantAddress"
                                placeholder="Solana base58 address"
                                className="font-mono text-sm"
                                {...register("tenantAddress")}
                                disabled={submitting}
                            />
                            {errors.tenantAddress && (
                                <p className="text-xs text-destructive">
                                    {errors.tenantAddress.message}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="depositAmount">Deposit Amount *</Label>
                                <Input
                                    id="depositAmount"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    {...register("depositAmount", { valueAsNumber: true })}
                                    disabled={submitting}
                                />
                                {errors.depositAmount && (
                                    <p className="text-xs text-destructive">
                                        {errors.depositAmount.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="currency">Currency *</Label>
                                <Controller
                                    name="currency"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={submitting}
                                        >
                                            <SelectTrigger id="currency">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USDC">
                                                    USDC (stablecoin)
                                                </SelectItem>
                                                <SelectItem value="SOL">SOL (native)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="leaseStart">Lease Start *</Label>
                                <Input
                                    id="leaseStart"
                                    type="date"
                                    {...register("leaseStart")}
                                    disabled={submitting}
                                />
                                {errors.leaseStart && (
                                    <p className="text-xs text-destructive">
                                        {errors.leaseStart.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="leaseEnd">Lease End *</Label>
                                <Input
                                    id="leaseEnd"
                                    type="date"
                                    {...register("leaseEnd")}
                                    disabled={submitting}
                                />
                                {errors.leaseEnd && (
                                    <p className="text-xs text-destructive">
                                        {errors.leaseEnd.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Jurisdiction + threshold */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Jurisdiction & Compliance</CardTitle>
                        <CardDescription>
                            Localized escrow rules are injected based on selected state.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 flex items-center gap-2">
                            <Info className="h-4 w-4 flex-shrink-0" />
                            {watch("state")
                                ? `${watch("state")} escrow rules applied: 21-day return window, itemized deduction required.`
                                : "Select a state above to load jurisdiction-specific compliance rules."}
                        </div>

                        <Controller
                            name="disputeThreshold"
                            control={control}
                            render={({ field }) => (
                                <ThresholdSlider value={field.value} onChange={field.onChange} />
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Contract upload */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Lease Contract Document</CardTitle>
                        <CardDescription>
                            Upload the PDF or DOCX lease agreement to be hashed on-chain.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {contractFile ? (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-emerald-800 truncate">
                                        {contractFile.name}
                                    </p>
                                    <p className="text-xs text-emerald-700 font-mono mt-0.5 truncate">
                                        sha256: {contractFile.hash}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setContractFile(null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <ContractDropzone
                                onFile={(file, hash, storageUrl) => {
                                    setContractFile({ name: file.name, hash, storageUrl });
                                }}
                            />
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            The sha256 hash is anchored to the escrow program. The document is
                            stored in Firebase Storage.
                        </p>
                    </CardContent>
                </Card>

                {submitError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive">{submitError}</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        disabled={submitting}
                        className="flex-1"
                    >
                        <Link href="/">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Initializing Escrow…
                            </>
                        ) : (
                            <>
                                <Shield className="h-4 w-4" />
                                Create Lease & Initialize Escrow
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </main>
    );
}
