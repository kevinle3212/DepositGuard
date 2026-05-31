import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/require-auth.js";
import { sha256Hex, sha256Bytes } from "../lib/hash.js";
import { docxToPdf } from "../lib/convert.js";
import { getNextVersion, uploadContractPdf } from "../lib/storage.js";
import { writeContractRecord } from "../lib/firestore.js";
import { buildRecordContractHashTx } from "../lib/on-chain.js";

export const uploadRouter = Router();

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter(_req, file, cb) {
        if (ALLOWED_MIME.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF and DOCX files are accepted."));
        }
    },
});

const QuerySchema = z.object({ leaseId: z.string().min(1) });

uploadRouter.post(
    "/",
    upload.single("file"),
    async (req: Request, res: Response): Promise<void> => {
        const authed = req as AuthenticatedRequest;

        if (!req.file) {
            res.status(400).json({ error: "No file uploaded." });
            return;
        }

        const query = QuerySchema.safeParse(req.body);
        if (!query.success) {
            res.status(400).json({ error: "Missing leaseId in request body." });
            return;
        }
        const { leaseId } = query.data;

        let pdfBytes = req.file.buffer;
        const isDocx = req.file.mimetype.includes("wordprocessingml");

        if (isDocx) {
            try {
                pdfBytes = await docxToPdf(req.file.buffer);
            } catch (err) {
                console.error("[upload-contract] DOCX conversion failed:", err);
                res.status(422).json({ error: "Failed to convert DOCX to PDF." });
                return;
            }
        }

        const contractHash = sha256Hex(pdfBytes);
        const contractHashBytes = sha256Bytes(pdfBytes);

        let version: number;
        let storageUrl: string;
        try {
            version = await getNextVersion(leaseId);
            storageUrl = await uploadContractPdf(leaseId, pdfBytes, version);
        } catch (err) {
            console.error("[upload-contract] GCS upload failed:", err);
            res.status(502).json({ error: "Failed to upload contract to storage." });
            return;
        }

        try {
            await writeContractRecord(leaseId, {
                contractHash,
                storageUrl,
                uploadedBy: authed.walletPubkey,
                version,
            });
        } catch (err) {
            console.error("[upload-contract] Firestore write failed:", err);
            res.status(500).json({ error: "Failed to persist contract record." });
            return;
        }

        // Build an unsigned Solana transaction for record_contract_hash.
        // The caller (landlord or tenant) must sign it client-side and submit via /upload/submit-tx.
        let unsignedTx: string | undefined;
        try {
            unsignedTx = await buildRecordContractHashTx(
                leaseId,
                contractHashBytes,
                authed.walletPubkey,
            );
        } catch (err) {
            console.warn("[upload-contract] Could not build on-chain tx (non-fatal):", err);
        }

        res.json({ contractHash, storageUrl, version, ...(unsignedTx ? { unsignedTx } : {}) });
    },
);

// Accepts a wallet-signed base64 transaction and submits it to Solana.
uploadRouter.post("/submit-tx", async (req: Request, res: Response): Promise<void> => {
    const { signedTx } = req.body as { signedTx?: string };
    if (!signedTx) {
        res.status(400).json({ error: "Missing signedTx in body." });
        return;
    }

    try {
        const { submitSignedTx } = await import("../lib/on-chain.js");
        const sig = await submitSignedTx(signedTx);
        res.json({ signature: sig });
    } catch (err) {
        console.error("[upload-contract] submit-tx failed:", err);
        res.status(502).json({ error: "Failed to submit transaction to Solana." });
    }
});
