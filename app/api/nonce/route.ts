import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { issue } from "@/lib/nonce-store";

export async function GET(req: NextRequest) {
    const pubkey = req.nextUrl.searchParams.get("pubkey") ?? "";
    if (pubkey.length < 32 || pubkey.length > 44) {
        return NextResponse.json({ error: "pubkey required (32–44 chars)" }, { status: 400 });
    }
    const nonce = await issue(pubkey);
    return NextResponse.json({ nonce });
}
