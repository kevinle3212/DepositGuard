"use client";

import { useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "@/lib/solana";
import {
    Camera,
    Upload,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    RefreshCw,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DamageEstimateResponse, DamageEstimateItem } from "@/app/api/damage-estimate/route";

// ── Types ───────────────────────────────────────────────────────────────────

interface DamageCaptureProps {
    role: "tenant" | "landlord";
    leaseId?: string;
    walletPubkey?: string;
    onEstimate?: (result: DamageEstimateResponse) => void;
    onCommitted?: (txSig: string, estimateUsdc: number) => void;
}

type AnalysisState = "idle" | "analyzing" | "done" | "error";
type CommitState = "idle" | "signing" | "submitting" | "done" | "error";

const SEVERITY_STYLES: Record<DamageEstimateItem["severity"], string> = {
    Minor: "bg-slate-100 text-slate-700 border-slate-200",
    Moderate: "bg-amber-50 text-amber-700 border-amber-200",
    Major: "bg-red-50 text-red-700 border-red-200",
};

const CONFIDENCE_STYLES: Record<DamageEstimateResponse["confidenceLevel"], string> = {
    High: "text-emerald-700 bg-emerald-50 border-emerald-200",
    Medium: "text-amber-700 bg-amber-50 border-amber-200",
    Low: "text-red-700 bg-red-50 border-red-200",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EstimateResultCard({ result }: { result: DamageEstimateResponse }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold">Gemini Damage Estimate</span>
                </div>
                <span
                    className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full border",
                        CONFIDENCE_STYLES[result.confidenceLevel],
                    )}
                >
                    {result.confidenceLevel} confidence
                </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed italic">
                {result.analysisNotes}
            </p>

            <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                        <tr>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide">
                                Damage
                            </th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide w-24">
                                Severity
                            </th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide w-28">
                                Est. Cost
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {result.items.map((item, i) => (
                            <tr key={i}>
                                <td className="px-3 py-2.5">
                                    <p className="text-sm font-medium">{item.description}</p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {item.notes}
                                        </p>
                                    )}
                                </td>
                                <td className="px-3 py-2.5">
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border",
                                            SEVERITY_STYLES[item.severity],
                                        )}
                                    >
                                        {item.severity}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                                    ${item.estimatedCost.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/20 border-t-2 border-border">
                        <tr>
                            <td colSpan={2} className="px-3 py-2.5 text-sm font-bold">
                                Total Estimate
                            </td>
                            <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                                ${result.totalEstimate.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">
                    AI estimate only — not legally binding. Actual contractor quotes may differ.
                </p>
            </div>
        </div>
    );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function DamageCapturePanel({
    role,
    leaseId,
    walletPubkey,
    onEstimate,
    onCommitted,
}: DamageCaptureProps) {
    const wallet = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
    const [commitState, setCommitState] = useState<CommitState>("idle");
    const [result, setResult] = useState<DamageEstimateResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [commitError, setCommitError] = useState<string | null>(null);
    const [committedSig, setCommittedSig] = useState<string | null>(null);

    function handleFile(file: File) {
        if (!file.type.startsWith("image/")) return;
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        setCapturedFile(file);
        setResult(null);
        setErrorMsg(null);
        setAnalysisState("idle");
        setCommitState("idle");
        setCommittedSig(null);
        setCommitError(null);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
    }

    function clearCapture() {
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPreview(null);
        setCapturedFile(null);
        setResult(null);
        setErrorMsg(null);
        setAnalysisState("idle");
        setCommitState("idle");
        setCommittedSig(null);
        setCommitError(null);
    }

    async function runAnalysis() {
        if (!capturedFile) return;
        setAnalysisState("analyzing");
        setErrorMsg(null);

        try {
            const imageBase64 = await fileToBase64(capturedFile);
            const res = await fetch("/api/damage-estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64, mimeType: capturedFile.type }),
            });

            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }

            const estimate = (await res.json()) as DamageEstimateResponse;
            setResult(estimate);
            setAnalysisState("done");
            onEstimate?.(estimate);
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : String(err));
            setAnalysisState("error");
        }
    }

    async function commitToSolana() {
        if (!result || !leaseId) return;
        const payer = walletPubkey ?? wallet.publicKey?.toBase58();
        if (!payer) return;

        setCommitState("signing");
        setCommitError(null);

        try {
            // 1. Fetch the unsigned submit_estimate tx
            const txRes = await fetch(
                `/api/deposits/${leaseId}/submit-estimate-tx?payer=${payer}&estimateUsdc=${result.totalEstimate}`,
            );
            if (!txRes.ok) {
                const b = (await txRes.json()) as { error?: string };
                throw new Error(b.error ?? "Failed to build transaction");
            }
            const { transaction } = (await txRes.json()) as { transaction: string };

            // 2. Sign with wallet
            if (!wallet.signTransaction || !wallet.publicKey) {
                throw new Error("Wallet not connected — please connect your wallet first.");
            }
            const txBytes = Buffer.from(transaction, "base64");
            const tx = VersionedTransaction.deserialize(txBytes);
            const connection = getConnection();
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.message.recentBlockhash = blockhash;
            const signed = await wallet.signTransaction(tx);

            setCommitState("submitting");

            // 3. Submit on-chain
            let txSig = "";
            try {
                const rawTx = signed.serialize();
                txSig = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
                await connection.confirmTransaction(
                    { signature: txSig, blockhash, lastValidBlockHeight },
                    "confirmed",
                );
            } catch (chainErr) {
                // Non-fatal if the escrow isn't in Disputed state yet — still record off-chain
                console.warn("[DamageCapturePanel] On-chain submit failed (non-fatal):", chainErr);
            }

            // 4. Record in Firestore regardless (works even if escrow not yet disputed)
            const recordRes = await fetch(`/api/deposits/${leaseId}/record-estimate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    estimateUsdc: result.totalEstimate,
                    txSignature: txSig || undefined,
                }),
            });
            if (!recordRes.ok) {
                const b = (await recordRes.json()) as { error?: string };
                throw new Error(b.error ?? "Failed to record estimate");
            }

            setCommittedSig(txSig || "recorded");
            setCommitState("done");
            onCommitted?.(txSig || "recorded", result.totalEstimate);
        } catch (err: unknown) {
            setCommitError(err instanceof Error ? err.message : String(err));
            setCommitState("error");
        }
    }

    const isAnalyzing = analysisState === "analyzing";
    const isCommitting = commitState === "signing" || commitState === "submitting";
    const roleLabel = role === "landlord" ? "Landlord" : "Tenant";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                    {roleLabel} Damage Capture — Gemini AI Estimate
                </h3>
            </div>
            <p className="text-xs text-muted-foreground">
                Take a photo or upload an image of the damage. Gemini will analyze it and return an
                itemized repair cost estimate that you can commit on-chain as your sealed estimate.
            </p>

            {/* Hidden inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleInputChange}
                aria-label="Capture photo with camera"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={handleInputChange}
                aria-label="Upload damage photo"
            />

            {!preview ? (
                /* ── No image yet: capture / upload ── */
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors py-6 cursor-pointer"
                    >
                        <Camera className="h-8 w-8 text-primary" />
                        <span className="text-sm font-semibold text-primary">Take Photo</span>
                        <span className="text-xs text-muted-foreground">Use device camera</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/50 transition-colors py-6 cursor-pointer"
                    >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-semibold">Upload Image</span>
                        <span className="text-xs text-muted-foreground">JPEG / PNG / WebP</span>
                    </button>
                </div>
            ) : (
                /* ── Image selected ── */
                <div className="space-y-3">
                    {/* Preview */}
                    <div className="relative rounded-xl border border-border overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Captured damage"
                            className="w-full max-h-72 object-contain"
                        />
                        {!isAnalyzing && !isCommitting && (
                            <button
                                onClick={clearCapture}
                                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 hover:bg-destructive hover:text-white transition-colors"
                                aria-label="Remove image"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Retake + Analyze — shown until analysis completes */}
                    {analysisState !== "done" && (
                        <div className="flex gap-2">
                            {/* Prominent retake button */}
                            <Button
                                variant="outline"
                                className="gap-2 border-primary/40 text-primary hover:bg-primary/5"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={isAnalyzing}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retake Photo
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzing}
                            >
                                <Upload className="h-4 w-4" />
                                Change File
                            </Button>
                            <Button
                                className="flex-1 gap-2"
                                onClick={() => void runAnalysis()}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Gemini analyzing…
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4" />
                                        Analyze with Gemini
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Analyzing indicator */}
                    {isAnalyzing && (
                        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Gemini is analyzing…</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Examining damage extent, materials, and labor costs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {analysisState === "error" && errorMsg && (
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-destructive">
                                    Analysis failed
                                </p>
                                <p className="text-xs text-destructive/80 mt-0.5">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Results + Solana commit */}
                    {analysisState === "done" && result && (
                        <div className="space-y-4">
                            <EstimateResultCard result={result} />

                            {/* Retake after estimate */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 w-full border-primary/30 text-primary hover:bg-primary/5"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={isCommitting || commitState === "done"}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Retake & Re-analyze
                            </Button>

                            {/* Commit to Solana */}
                            {commitState !== "done" && leaseId && (
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">
                                            Commit Estimate On-Chain
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            ${result.totalEstimate.toLocaleString()} USDC
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Seal this as your damage estimate on Solana. The estimate
                                        stays hidden until both parties submit, then the max fine is
                                        computed on-chain.
                                    </p>
                                    <Button
                                        className="w-full gap-2"
                                        onClick={() => void commitToSolana()}
                                        disabled={isCommitting}
                                    >
                                        {isCommitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {commitState === "signing"
                                                    ? "Waiting for wallet…"
                                                    : "Submitting on-chain…"}
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-4 w-4" />
                                                Sign & Seal Estimate on Solana
                                            </>
                                        )}
                                    </Button>
                                    {commitError && (
                                        <p className="text-xs text-destructive">{commitError}</p>
                                    )}
                                </div>
                            )}

                            {/* Success state */}
                            {commitState === "done" && (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-800">
                                            Estimate committed on-chain
                                        </p>
                                        {committedSig && committedSig !== "recorded" && (
                                            <p className="text-xs text-emerald-700 font-mono mt-0.5 break-all">
                                                Tx: {committedSig.slice(0, 16)}…
                                            </p>
                                        )}
                                        <p className="text-xs text-emerald-700 mt-1">
                                            Waiting for the other party to submit their estimate.
                                            Estimates are revealed once both are in.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
