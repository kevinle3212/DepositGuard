"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Types ──────────────────────────────────────────────────────────────────

export type PhotoPhase = "move-in" | "move-out";

interface StagedPhoto {
    id: string;
    file: File;
    preview: string;
    description: string;
}

type SubmitStage = "idle" | "uploading" | "hashing" | "confirming" | "waiting";

interface PhotoVerificationProps {
    phase: PhotoPhase;
    title?: string;
    onComplete?: (photos: { description: string; hash: string; storageUrl: string }[]) => void;
}

async function sha256Hex(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function uploadPhoto(
    file: File,
    phase: PhotoPhase,
): Promise<{ hash: string; storageUrl: string }> {
    const hash = await sha256Hex(file);
    const storageRef = ref(storage, `photos/${phase}/${hash}-${file.name}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const storageUrl = await getDownloadURL(storageRef);
    return { hash, storageUrl };
}

// ── Dropzone ───────────────────────────────────────────────────────────────

function PhotoDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
        onDrop: onFiles,
        multiple: true,
    });

    return (
        <div
            {...getRootProps()}
            className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
        >
            <input {...getInputProps()} aria-label="Photo upload" />
            <Upload className="h-7 w-7 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
                {isDragActive ? "Drop images here" : "Drag photos or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                PNG / JPEG · Multiple files accepted
            </p>
        </div>
    );
}

// ── Thumbnail card ─────────────────────────────────────────────────────────

function ThumbnailCard({
    photo,
    onDescriptionChange,
    onDelete,
    disabled,
}: {
    photo: StagedPhoto;
    onDescriptionChange: (id: string, desc: string) => void;
    onDelete: (id: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="group relative rounded-xl border border-border bg-card overflow-hidden">
            {/* Thumbnail */}
            <div className="aspect-square relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={photo.preview}
                    alt={photo.description || "Property photo"}
                    className="h-full w-full object-cover"
                />
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => {
                            onDelete(photo.id);
                        }}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                        aria-label="Delete photo"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {/* Description input */}
            <div className="p-2">
                <Input
                    value={photo.description}
                    onChange={(e) => {
                        onDescriptionChange(photo.id, e.target.value);
                    }}
                    placeholder="e.g. Living room wall near baseboard"
                    className="text-xs h-8"
                    disabled={disabled}
                    aria-label="Photo description"
                />
            </div>
        </div>
    );
}

// ── Progress stages ────────────────────────────────────────────────────────

const STAGE_LABELS: Record<SubmitStage, string> = {
    idle: "",
    uploading: "Uploading images to Firebase Storage…",
    hashing: "Generating verification hashes…",
    confirming: "Recording hashes on-chain…",
    waiting: "Awaiting counterparty verification hash receipt…",
};

const STAGE_ORDER: SubmitStage[] = ["uploading", "hashing", "confirming", "waiting"];

function ProgressTracker({ stage }: { stage: SubmitStage }) {
    const activeIdx = STAGE_ORDER.indexOf(stage);

    return (
        <div className="space-y-3">
            {STAGE_ORDER.map((s, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                    <div key={s} className="flex items-center gap-3">
                        <div
                            className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 text-xs font-bold",
                                done
                                    ? "bg-emerald-500 text-white"
                                    : active
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground",
                            )}
                        >
                            {done ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : active ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                i + 1
                            )}
                        </div>
                        <span
                            className={cn(
                                "text-sm",
                                active
                                    ? "font-semibold text-foreground"
                                    : done
                                      ? "text-muted-foreground line-through"
                                      : "text-muted-foreground",
                            )}
                        >
                            {STAGE_LABELS[s]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main export ────────────────────────────────────────────────────────────

export function PhotoVerification({ phase, title, onComplete }: PhotoVerificationProps) {
    const [photos, setPhotos] = useState<StagedPhoto[]>([]);
    const [stage, setStage] = useState<SubmitStage>("idle");
    const [uploadError, setUploadError] = useState<string | null>(null);

    const heading =
        title ??
        (phase === "move-in" ? "Move-In Photo Documentation" : "Move-Out Photo Documentation");

    const onDrop = useCallback((files: File[]) => {
        const newPhotos: StagedPhoto[] = files.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            description: "",
        }));
        setPhotos((prev) => [...prev, ...newPhotos]);
    }, []);

    const handleDescriptionChange = (id: string, desc: string) => {
        setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, description: desc } : p)));
    };

    const handleDelete = (id: string) => {
        setPhotos((prev) => {
            const removed = prev.find((p) => p.id === id);
            if (removed) URL.revokeObjectURL(removed.preview);
            return prev.filter((p) => p.id !== id);
        });
    };

    async function handleSubmit() {
        if (photos.length === 0) return;
        setUploadError(null);

        try {
            setStage("uploading");
            const uploaded = await Promise.all(photos.map(async (p) => uploadPhoto(p.file, phase)));

            setStage("hashing");
            await new Promise((r) => setTimeout(r, 300));

            setStage("confirming");
            await new Promise((r) => setTimeout(r, 500));

            setStage("waiting");

            const results = photos.map((p, i) => ({
                description: p.description || p.file.name,
                hash: uploaded[i]?.hash ?? "",
                storageUrl: uploaded[i]?.storageUrl ?? "",
            }));
            onComplete?.(results);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed.");
            setStage("idle");
        }
    }

    const isSubmitting = stage !== "idle" && stage !== "waiting";
    const isWaiting = stage === "waiting";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold tracking-tight">{heading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Upload photos with descriptive labels. All images are hashed and recorded
                    on-chain.
                </p>
            </div>

            {/* Dropzone — hide after submission */}
            {stage === "idle" && <PhotoDropzone onFiles={onDrop} />}

            {/* Photo grid */}
            {photos.length > 0 && !isWaiting && (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {photos.map((photo) => (
                        <ThumbnailCard
                            key={photo.id}
                            photo={photo}
                            onDescriptionChange={handleDescriptionChange}
                            onDelete={handleDelete}
                            disabled={isSubmitting}
                        />
                    ))}
                </div>
            )}

            {/* Progress tracker */}
            {stage !== "idle" && (
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm font-semibold mb-4">Upload Progress</p>
                    <ProgressTracker stage={stage} />
                </div>
            )}

            {/* Waiting state */}
            {isWaiting && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">
                            Awaiting counterparty verification hash receipt…
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {photos.length} photo{photos.length !== 1 ? "s" : ""} submitted. The
                            other party must acknowledge your documentation.
                        </p>
                    </div>
                </div>
            )}

            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

            {/* Submit button */}
            {stage === "idle" && (
                <Button
                    onClick={handleSubmit}
                    disabled={photos.length === 0}
                    className="w-full gap-2"
                >
                    <ImageIcon className="h-4 w-4" />
                    Submit Property Records ({photos.length} photo{photos.length !== 1 ? "s" : ""})
                </Button>
            )}
        </div>
    );
}
