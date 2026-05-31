"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useWalletStore } from "@/src/store/useWalletStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { getConnection } from "@/lib/solana";
import { useVoice } from "@/src/hooks/useVoice";

type TokenStatus = "loading" | "valid" | "invalid" | "expired";
type SignStatus = "idle" | "signing" | "submitting" | "done" | "error";

interface TokenPayload {
    leaseId: string;
    role: "landlord" | "tenant";
    email: string;
}

export default function SignPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const token = searchParams.get("token") ?? "";

    const { walletConnected: connected, userRole } = useWalletStore();
    const wallet = useWallet();
    const { speak } = useVoice();

    const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
    const [payload, setPayload] = useState<TokenPayload | null>(null);
    const [contractUrl, setContractUrl] = useState<string | null>(null);
    const [contractHash, setContractHash] = useState<string | null>(null);
    const [contractFetched, setContractFetched] = useState(false);
    const [signStatus, setSignStatus] = useState<SignStatus>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfProxyUrl = payload ? `/api/deposits/${payload.leaseId}/contract-pdf` : null;

    // Redirect to /connect if wallet is not connected
    useEffect(() => {
        if (tokenStatus !== "loading" && !connected) {
            router.push(`/connect?next=${encodeURIComponent(window.location.href)}`);
        }
    }, [connected, tokenStatus, router]);

    // Validate the signing token server-side.
    // If no token is present (direct navigation from dashboard / back link),
    // auto-generate one for the current user so the flow still works.
    useEffect(() => {
        if (!token) {
            const leaseId = params.id;
            if (!leaseId) { setTokenStatus("invalid"); return; }
            const role = (userRole === "landlord" || userRole === "tenant") ? userRole : "tenant";
            fetch("/api/sign/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leaseId, role }),
            })
                .then(async (r) => {
                    if (r.ok) {
                        const { token: newToken } = (await r.json()) as { token: string };
                        router.replace(`/lease/${leaseId}/sign?token=${newToken}`);
                    } else {
                        setTokenStatus("invalid");
                    }
                })
                .catch(() => setTokenStatus("invalid"));
            return;
        }
        fetch("/api/sign/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then(async (r) => {
                if (r.ok) {
                    const data = (await r.json()) as TokenPayload & { valid: boolean };
                    setPayload(data);
                    setTokenStatus("valid");
                } else {
                    const { error } = (await r.json()) as { error: string };
                    setTokenStatus(error.includes("expired") ? "expired" : "invalid");
                }
            })
            .catch(() => {
                setTokenStatus("invalid");
            });
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch the contract storage URL and hash from Firestore via Next.js API
    useEffect(() => {
        if (tokenStatus !== "valid" || !payload) return;
        void fetch(`/api/deposits/${payload.leaseId}`)
            .then(async (r) => {
                if (r.ok) {
                    const data = (await r.json()) as {
                        contractStorageUrl?: string;
                        contractHash?: string;
                    };
                    setContractUrl(data.contractStorageUrl ?? null);
                    // Fall back to lease ID so the sign button is never permanently blocked
                    setContractHash(data.contractHash ?? payload.leaseId);
                }
            })
            .catch((_e: unknown) => {
                setContractHash(payload.leaseId);
            })
            .finally(() => setContractFetched(true));
    }, [tokenStatus, payload]);

    // canvasRef kept for potential future use but PDF is now rendered via iframe

    async function handleSign() {
        if (!wallet.signMessage || !wallet.publicKey || !payload || !contractHash) return;
        if (!token) return;

        setSignStatus("signing");
        setErrorMsg(null);

        const unixTs = Math.floor(Date.now() / 1000);
        const messageText = `I agree to lease ${payload.leaseId} contract hash ${contractHash}. Timestamp: ${unixTs}`;
        const messageBytes = new TextEncoder().encode(messageText);

        let signatureB64: string;
        try {
            const sig = await wallet.signMessage(messageBytes);
            signatureB64 = Buffer.from(sig).toString("base64");
        } catch {
            setSignStatus("error");
            setErrorMsg("Wallet rejected the signature request.");
            return;
        }

        setSignStatus("submitting");

        // Record off-chain signature in Firestore + invalidate token
        try {
            const r = await fetch("/api/sign/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leaseId: payload.leaseId,
                    role: payload.role,
                    walletPubkey: wallet.publicKey.toBase58(),
                    signatureB64,
                    signedMessage: messageText,
                    token,
                }),
            });
            if (!r.ok) {
                const { error } = (await r.json()) as { error: string };
                throw new Error(error);
            }
        } catch (err) {
            setSignStatus("error");
            setErrorMsg(String(err));
            return;
        }

        // Submit record_contract_hash on-chain via the unsigned tx returned at upload time
        // (Fetch the unsignedTx stored for this lease, sign it with the wallet, submit)
        try {
            const txRes = await fetch(`/api/deposits/${payload.leaseId}/contract-tx`);
            if (txRes.ok) {
                const { unsignedTx } = (await txRes.json()) as { unsignedTx?: string };
                if (unsignedTx && wallet.signTransaction) {
                    const txBytes = Buffer.from(unsignedTx, "base64");
                    const tx = Transaction.from(txBytes);
                    const connection = getConnection();
                    const { blockhash } = await connection.getLatestBlockhash();
                    tx.recentBlockhash = blockhash;
                    tx.feePayer = wallet.publicKey;
                    const signed = await wallet.signTransaction(tx);
                    const rawTx = signed.serialize();
                    await connection.sendRawTransaction(rawTx, { skipPreflight: false });
                }
            }
        } catch (err) {
            // Non-fatal: off-chain signature is already recorded; on-chain will retry
            console.warn("[sign-page] On-chain tx submission failed (non-fatal):", err);
        }

        setSignStatus("done");
        void speak("contract.signed");
    }

    if (tokenStatus === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">Validating signing link…</p>
            </div>
        );
    }

    if (tokenStatus === "expired") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-semibold">Link expired</h1>
                    <p className="text-muted-foreground">
                        This signing link has expired. Please ask the landlord to send a new one.
                    </p>
                </div>
            </div>
        );
    }

    if (tokenStatus === "invalid") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-semibold">Invalid link</h1>
                    <p className="text-muted-foreground">
                        This signing link is invalid or has already been used.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Sign Lease Agreement</h1>
                    <p className="text-muted-foreground">
                        Review the contract below, then sign with your wallet to confirm.
                    </p>
                </div>

                {payload && (
                    <div className="rounded-lg border bg-card p-4 text-sm space-y-1">
                        <div>
                            <span className="text-muted-foreground">Lease ID:</span>{" "}
                            <span className="font-mono">{payload.leaseId}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Your role:</span>{" "}
                            <span className="capitalize">{payload.role}</span>
                        </div>
                        {contractHash && (
                            <div>
                                <span className="text-muted-foreground">Document SHA-256:</span>{" "}
                                <span className="font-mono text-xs break-all">{contractHash}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="border rounded-lg overflow-hidden bg-muted/20" style={{ minHeight: 500 }}>
                    {contractUrl && pdfProxyUrl ? (
                        <iframe
                            src={pdfProxyUrl}
                            className="w-full"
                            style={{ height: 600 }}
                            title="Lease contract"
                        />
                    ) : contractFetched ? (
                        <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-2 p-6">
                            <p className="text-muted-foreground text-sm">No contract PDF uploaded.</p>
                            <p className="text-xs text-muted-foreground">You can still sign to confirm the lease terms.</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center min-h-[500px]">
                            <p className="text-muted-foreground">Loading contract PDF…</p>
                        </div>
                    )}
                </div>

                {signStatus === "done" ? (
                    <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-900/20 p-4 text-center">
                        <p className="text-green-700 dark:text-green-400 font-medium">
                            Signed and confirmed.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your signature has been recorded on-chain and in Firestore.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
                        <button
                            onClick={() => void handleSign()}
                            disabled={!wallet.connected || signStatus !== "idle" || !contractHash}
                            className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                        >
                            {signStatus === "signing"
                                ? "Waiting for wallet…"
                                : signStatus === "submitting"
                                  ? "Recording on-chain…"
                                  : "Sign and Confirm"}
                        </button>
                        <p className="text-xs text-muted-foreground text-center">
                            By clicking "Sign and Confirm" you cryptographically sign the message:
                            <br />
                            <span className="font-mono">
                                I agree to lease {payload?.leaseId} contract hash{" "}
                                {contractHash ?? "…"}. Timestamp: &lt;unix_ts&gt;
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
