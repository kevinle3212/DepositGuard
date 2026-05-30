/**
 * Fine-calculation agent.
 *
 * Pipeline:
 *   1. Read the Dispute account for the given escrow.
 *   2. Fetch the evidence image from its URI and verify SHA-256 == evidence_hash
 *      committed on-chain (abort on mismatch — the artifact must be the one
 *      the dispute was opened with).
 *   3. Ask Gemini for a STRUCTURED judgement (resolution direction + a 0..100
 *      severity + rationale). Gemini decides fault; it does NOT decide money.
 *   4. Derive fine_bps deterministically from severity in code (auditable),
 *      clamped to the on-chain max.
 *   5. Sign submit_verdict with the oracle key and send it. The program
 *      re-checks the cap and computes fine_amount itself.
 *
 * Usage: tsx src/agent.ts <ESCROW_PUBKEY>
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

import { GoogleGenAI, Type } from "@google/genai";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// --- config ---------------------------------------------------------------

const {
  RPC_URL,
  PROGRAM_ID,
  ORACLE_KEYPAIR,
  IDL_PATH,
  GEMINI_API_KEY,
  GEMINI_MODEL = "gemini-2.5-pro",
  IPFS_GATEWAY = "https://ipfs.io/ipfs/",
  ARWEAVE_GATEWAY = "https://arweave.net/",
} = process.env;

const CONFIG_SEED = Buffer.from("config");
const DISPUTE_SEED = Buffer.from("dispute");

// Resolution enum, mirrored from the Rust program. Anchor encodes Rust enums
// as objects with the camelCase variant name as the key.
type Resolution = "FAVOR_BUYER" | "FAVOR_SELLER" | "SPLIT";
const RESOLUTION_ARG: Record<Resolution, Record<string, object>> = {
  FAVOR_BUYER: { favorBuyer: {} },
  FAVOR_SELLER: { favorSeller: {} },
  SPLIT: { split: {} },
};

// --- helpers ---------------------------------------------------------------

function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function resolveUri(uri: string): string {
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.slice("ipfs://".length);
  if (uri.startsWith("ar://")) return ARWEAVE_GATEWAY + uri.slice("ar://".length);
  return uri; // assume http(s)
}

function sha256(bytes: Uint8Array): Buffer {
  return createHash("sha256").update(bytes).digest();
}

function detectMime(bytes: Uint8Array, contentType: string | null): string {
  if (contentType && contentType.startsWith("image/")) return contentType;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

/** severity 0..100 -> basis points, clamped to maxBps. */
function severityToBps(severity: number, maxBps: number): number {
  const clamped = Math.max(0, Math.min(100, Math.round(severity)));
  return Math.min(maxBps, Math.round((clamped / 100) * maxBps));
}

// --- judgement -------------------------------------------------------------

const JUDGE_SYSTEM = `You are an impartial arbitrator in an on-chain escrow dispute.
You are shown a single image submitted as evidence by one party. Judge ONLY what
is visible in the image plus the stated dispute reason. Decide which party the
evidence favors and how severe the fault is.

- FAVOR_BUYER: the evidence supports the buyer (e.g. item is damaged, wrong,
  materially not as described, or undelivered).
- FAVOR_SELLER: the evidence is inconclusive or actually supports the seller
  (item appears as described / intact).
- SPLIT: evidence shows partial fault on both sides.

severity is 0..100: 0 = no fault by the at-fault party, 100 = total/egregious
fault. Be conservative when the image is ambiguous, low quality, or could be
unrelated to the transaction. Do not invent details you cannot see.`;

const VERDICT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resolution: {
      type: Type.STRING,
      enum: ["FAVOR_BUYER", "FAVOR_SELLER", "SPLIT"],
      description: "Which party the evidence favors.",
    },
    severity: {
      type: Type.INTEGER,
      description: "Fault severity from 0 (none) to 100 (egregious).",
    },
    rationale: {
      type: Type.STRING,
      description: "One or two sentences citing what in the image drove the call.",
    },
  },
  required: ["resolution", "severity", "rationale"],
};

interface Judgement {
  resolution: Resolution;
  severity: number;
  rationale: string;
}

async function judge(
  ai: GoogleGenAI,
  imageBytes: Uint8Array,
  mimeType: string,
  reason: string,
): Promise<Judgement> {
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { text: `${JUDGE_SYSTEM}\n\nStated dispute reason: "${reason}"\n\nEvidence image:` },
      { inlineData: { mimeType, data: Buffer.from(imageBytes).toString("base64") } },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: VERDICT_SCHEMA,
    },
  });

  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  const parsed = JSON.parse(text) as Judgement;

  // Validate semantics — schema only guarantees shape, not sane values.
  if (!["FAVOR_BUYER", "FAVOR_SELLER", "SPLIT"].includes(parsed.resolution)) {
    throw new Error(`Unexpected resolution: ${parsed.resolution}`);
  }
  if (typeof parsed.severity !== "number" || Number.isNaN(parsed.severity)) {
    throw new Error("Severity is not a number");
  }
  return parsed;
}

// --- main ------------------------------------------------------------------

async function main() {
  const escrowArg = process.argv[2];
  if (!escrowArg) throw new Error("Usage: tsx src/agent.ts <ESCROW_PUBKEY>");
  for (const [k, v] of Object.entries({ RPC_URL, PROGRAM_ID, ORACLE_KEYPAIR, IDL_PATH, GEMINI_API_KEY })) {
    if (!v) throw new Error(`Missing env var: ${k}`);
  }

  const escrow = new PublicKey(escrowArg);
  const programId = new PublicKey(PROGRAM_ID!);
  const oracle = loadKeypair(ORACLE_KEYPAIR!);

  const connection = new Connection(RPC_URL!, "confirmed");
  const wallet = new anchor.Wallet(oracle);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = JSON.parse(readFileSync(IDL_PATH!, "utf8"));
  const program = new anchor.Program(idl, provider);

  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
  const [disputePda] = PublicKey.findProgramAddressSync(
    [DISPUTE_SEED, escrow.toBuffer()],
    programId,
  );

  const config: any = await program.account.config.fetch(configPda);
  const dispute: any = await program.account.dispute.fetch(disputePda);
  const maxFineBps: number = config.maxFineBps;

  console.log(`Dispute ${disputePda.toBase58()}`);
  console.log(`  reason:   ${dispute.reason}`);
  console.log(`  evidence: ${dispute.evidenceUri}`);

  // 1. fetch + 2. verify hash
  const url = resolveUri(dispute.evidenceUri);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch evidence (${resp.status}) from ${url}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());

  const onChainHash = Buffer.from(dispute.evidenceHash as number[]);
  const actualHash = sha256(bytes);
  if (!actualHash.equals(onChainHash)) {
    throw new Error(
      `Evidence hash mismatch. on-chain=${onChainHash.toString("hex")} fetched=${actualHash.toString("hex")}. Aborting — will not judge tampered evidence.`,
    );
  }
  const mimeType = detectMime(bytes, resp.headers.get("content-type"));

  // 3. judge
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
  const j = await judge(ai, bytes, mimeType, dispute.reason);
  console.log(`  verdict:  ${j.resolution} severity=${j.severity}`);
  console.log(`  why:      ${j.rationale}`);

  // 4. derive fine in code, clamp to on-chain cap
  const fineBps = severityToBps(j.severity, maxFineBps);

  // verdict_hash: canonical provenance record of the off-chain judgement
  const canonical = JSON.stringify({
    model: GEMINI_MODEL,
    resolution: j.resolution,
    severity: j.severity,
    rationale: j.rationale,
    evidence_hash: onChainHash.toString("hex"),
  });
  const verdictHash = sha256(Buffer.from(canonical));

  // 5. submit signed verdict
  const sig = await program.methods
    .submitVerdict(RESOLUTION_ARG[j.resolution], fineBps, Array.from(verdictHash))
    .accounts({
      oracle: oracle.publicKey,
      config: configPda,
      escrow,
      dispute: disputePda,
    })
    .signers([oracle])
    .rpc();

  console.log(`Submitted verdict. fineBps=${fineBps} tx=${sig}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
