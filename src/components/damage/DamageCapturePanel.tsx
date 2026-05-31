"use client";

import { useRef, useState } from "react";
import {
    Camera,
    Upload,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DamageEstimateResponse, DamageEstimateItem } from "@/app/api/damage-estimate/route";

// ── Types ───────────────────────────────────────────────────────────────────

interface DamageCaptureProps {
    /** "tenant" or "landlord" — controls label copy */
    role: "tenant" | "landlord";
    /** Optional callback with the raw estimate result */
    onEstimate?: (result: DamageEstimateResponse) => void;
}

type AnalysisState = "idle" | "analyzing" | "done" | "error";

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
            // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
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
            {/* Header */}
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

            {/* Analysis notes */}
            <p className="text-xs text-muted-foreground leading-relaxed italic">
                {result.analysisNotes}
            </p>

            {/* Damage items table */}
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
                            <tr key={i} className="group">
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
                            <td
                                colSpan={2}
                                className="px-3 py-2.5 text-sm font-bold text-foreground"
                            >
                                Total Estimate
                            </td>
                            <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums text-foreground">
                                ${result.totalEstimate.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Disclaimer */}
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

export function DamageCapturePanel({ role, onEstimate }: DamageCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
    const [result, setResult] = useState<DamageEstimateResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    function handleFile(file: File) {
        if (!file.type.startsWith("image/")) return;
        // Revoke previous preview URL if it was a blob URL
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        setCapturedFile(file);
        setResult(null);
        setErrorMsg(null);
        setAnalysisState("idle");
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset input so the same file can be re-selected if needed
        e.target.value = "";
    }

    function clearCapture() {
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPreview(null);
        setCapturedFile(null);
        setResult(null);
        setErrorMsg(null);
        setAnalysisState("idle");
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

    const isAnalyzing = analysisState === "analyzing";
    const roleLabel = role === "landlord" ? "Landlord" : "Tenant";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                    {roleLabel} Damage Capture — Gemini Cost Estimate
                </h3>
            </div>
            <p className="text-xs text-muted-foreground">
                Take a photo or upload an image of the damage. Gemini will analyze it and return an
                itemized repair cost estimate.
            </p>

            {/* Hidden file inputs */}
            {/* Camera capture (mobile: rear camera; desktop: file picker fallback) */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleInputChange}
                aria-label="Capture photo with camera"
            />
            {/* Standard file upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={handleInputChange}
                aria-label="Upload damage photo"
            />

            {!preview ? (
                /* ── Capture / Upload buttons ── */
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2 h-16 border-dashed"
                        onClick={() => cameraInputRef.current?.click()}
                    >
                        <Camera className="h-5 w-5 text-muted-foreground" />
                        <span>
                            <span className="block text-sm font-semibold">Capture Photo</span>
                            <span className="block text-xs text-muted-foreground font-normal">
                                Use device camera
                            </span>
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 gap-2 h-16 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span>
                            <span className="block text-sm font-semibold">Upload Image</span>
                            <span className="block text-xs text-muted-foreground font-normal">
                                JPEG / PNG / WebP
                            </span>
                        </span>
                    </Button>
                </div>
            ) : (
                /* ── Preview + actions ── */
                <div className="space-y-3">
                    {/* Image preview */}
                    <div className="relative rounded-xl border border-border overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Captured damage"
                            className="w-full max-h-72 object-contain"
                        />
                        {!isAnalyzing && (
                            <button
                                onClick={clearCapture}
                                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 hover:bg-destructive hover:text-white transition-colors"
                                aria-label="Remove image"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Re-capture / analyze buttons */}
                    {analysisState !== "done" && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={isAnalyzing}
                            >
                                <Camera className="h-3.5 w-3.5" />
                                Retake
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 gap-1.5"
                                onClick={() => void runAnalysis()}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Gemini is analyzing…
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Estimate Repair Cost
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Analyzing spinner overlay */}
                    {isAnalyzing && (
                        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Gemini is analyzing your image…
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Carefully examining damage extent, materials, and labor costs.
                                    This may take a few seconds.
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
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => void runAnalysis()}
                                >
                                    Retry
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {analysisState === "done" && result && (
                        <div className="space-y-3">
                            <EstimateResultCard result={result} />
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 w-full"
                                onClick={clearCapture}
                            >
                                <Camera className="h-3.5 w-3.5" />
                                Capture Another Photo
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
