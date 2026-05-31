import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

type Severity = "Minor" | "Moderate" | "Major";

interface DamageItem {
    id: string;
    description: string;
    severity: Severity;
    estimatedCost: number;
}

const VALID_SEVERITIES: Severity[] = ["Minor", "Moderate", "Major"];

/**
 * Normalizes an arbitrary stored assessment entry into the `DamageItem` shape the
 * UI expects. Returns `null` for entries that cannot be coerced so a single bad
 * record never breaks the whole list.
 */
function toDamageItem(raw: unknown, index: number): DamageItem | null {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;

    const description = typeof r["description"] === "string" ? r["description"] : null;
    if (!description) return null;

    const severityRaw = typeof r["severity"] === "string" ? r["severity"] : "Minor";
    const severity = VALID_SEVERITIES.find((s) => s.toLowerCase() === severityRaw.toLowerCase());

    const cost =
        typeof r["estimatedCost"] === "number"
            ? r["estimatedCost"]
            : typeof r["estimatedAmountUsdc"] === "number"
              ? r["estimatedAmountUsdc"]
              : 0;

    return {
        id: typeof r["id"] === "string" ? r["id"] : `item-${index}`,
        description,
        severity: severity ?? "Minor",
        estimatedCost: cost,
    };
}

/**
 * Returns the AI damage-assessment line items for a lease.
 *
 * Items are read from the lease document's `assessmentItems` field (written by
 * the Gemini assessment pipeline). When no assessment has been produced yet this
 * returns an empty array with a 200 status so the assessment page renders an
 * empty table instead of surfacing a load error.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json([], { status: 200 });

    const data = snap.data() ?? {};
    const stored: unknown = data["assessmentItems"];
    if (!Array.isArray(stored)) return NextResponse.json([], { status: 200 });

    const items = stored
        .map((raw, i) => toDamageItem(raw, i))
        .filter((item): item is DamageItem => item !== null);

    return NextResponse.json(items, { status: 200 });
}
