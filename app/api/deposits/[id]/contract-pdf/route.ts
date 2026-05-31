import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { initFirebaseAdmin } from "@/lib/firebase-admin";

// Proxies the lease contract PDF from GCS so the browser can render it without
// exposing a long-lived signed URL or requiring CORS configuration on the bucket.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    initFirebaseAdmin();
    const db = getFirestore();
    const snap = await db.doc(`leases/${params.id}`).get();
    if (!snap.exists) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const storageUrl = snap.data()?.["contractStorageUrl"] as string | undefined;
    if (!storageUrl)
        return NextResponse.json({ error: "No contract uploaded for this lease" }, { status: 404 });

    // gs://bucket-name/path/to/file.pdf → bucket + object path
    const withoutScheme = storageUrl.replace(/^gs:\/\//, "");
    const slashIdx = withoutScheme.indexOf("/");
    const bucketName = withoutScheme.slice(0, slashIdx);
    const filePath = withoutScheme.slice(slashIdx + 1);

    const storage = getStorage();
    const [pdfBytes] = await storage.bucket(bucketName).file(filePath).download();

    return new NextResponse(new Uint8Array(pdfBytes), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="lease-${params.id}.pdf"`,
        },
    });
}
