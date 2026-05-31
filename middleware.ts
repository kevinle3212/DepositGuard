import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that do not require a wallet session
const PUBLIC_PATHS = ["/connect", "/login"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Pass through public routes and Next.js internals.
    // '/' is the public marketing landing page (exact match — startsWith('/')
    // would match every route).
    if (
        pathname === "/" ||
        PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Check for a valid session cookie set after Firebase auth
    const sessionCookie = request.cookies.get("dg-session")?.value;

    if (!sessionCookie) {
        const connectUrl = new URL("/connect", request.url);
        connectUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(connectUrl);
    }

    return NextResponse.next();
}

export const config = {
    // Run on all routes; the matcher uses a negative lookahead for static assets
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
