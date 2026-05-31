import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

function ensureInit() {
    if (!getApps().length) initializeApp();
}

// Proxies the lease contract PDF from Firebase Storage so the browser can
// render it inline without CORS issues or exposing raw download URLs.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    ensureInit();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const storageUrl = snap.data()?.["contractStorageUrl"] as string | undefined;
    if (!storageUrl)
        return NextResponse.json({ error: "No contract uploaded for this lease" }, { status: 404 });

    // contractStorageUrl is a Firebase Storage download URL (https://...).
    // Fetch it server-side and stream the bytes back to the browser.
    const upstream = await fetch(storageUrl);
    if (!upstream.ok) {
        return NextResponse.json(
            { error: `Storage fetch failed: ${upstream.status}` },
            { status: 502 },
        );
    }

    const pdfBytes = await upstream.arrayBuffer();
    return new NextResponse(pdfBytes, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="lease-${params.id}.pdf"`,
            "Cache-Control": "private, max-age=300",
        },
    });
}
