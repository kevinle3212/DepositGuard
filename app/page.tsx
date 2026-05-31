import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Secure Your Lease Instantly",
    description:
        "Connect your wallet to manage your rental agreement securely — on-chain, transparent, and dispute-free.",
};

// Public marketing landing page (unauthenticated). The "Connect Wallet" CTAs
// route to /connect, which handles the actual wallet handshake + auth.
// Decorative animations/classes live in app/globals.css.
export default function LandingPage() {
    return (
        <div className="overflow-x-hidden bg-white">
            {/* ═══════════════════════════════════════════ HERO ═══════ */}
            <section
                className="relative min-h-screen flex flex-col overflow-hidden"
                style={{
                    background:
                        "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 28%, #bae6fd 58%, #f0f9ff 80%, #ffffff 100%)",
                }}
            >
                {/* ─── CLOUDS ─── */}
                {/* Large slow-drift clouds */}
                <div
                    className="cloud-drift-l pointer-events-none select-none"
                    style={{ position: "absolute", top: "6%", left: "5%" }}
                >
                    <svg
                        width="220"
                        height="70"
                        viewBox="0 0 220 70"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse cx="110" cy="50" rx="105" ry="28" fill="white" opacity="0.9" />
                        <ellipse cx="75" cy="35" rx="55" ry="38" fill="white" opacity="0.9" />
                        <ellipse cx="145" cy="38" rx="48" ry="34" fill="white" opacity="0.9" />
                        <ellipse cx="110" cy="28" rx="38" ry="30" fill="white" opacity="0.9" />
                    </svg>
                </div>
                <div
                    className="cloud-drift-r pointer-events-none select-none"
                    style={{ position: "absolute", top: "4%", right: "8%" }}
                >
                    <svg
                        width="170"
                        height="56"
                        viewBox="0 0 170 56"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse cx="85" cy="40" rx="80" ry="22" fill="white" opacity="0.85" />
                        <ellipse cx="55" cy="28" rx="42" ry="30" fill="white" opacity="0.85" />
                        <ellipse cx="120" cy="30" rx="38" ry="26" fill="white" opacity="0.85" />
                        <ellipse cx="85" cy="20" rx="30" ry="24" fill="white" opacity="0.85" />
                    </svg>
                </div>
                {/* Medium static clouds */}
                <div
                    className="pointer-events-none select-none"
                    style={{ position: "absolute", top: "14%", left: "25%" }}
                >
                    <svg
                        width="130"
                        height="46"
                        viewBox="0 0 130 46"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse cx="65" cy="34" rx="60" ry="18" fill="white" opacity="0.75" />
                        <ellipse cx="42" cy="22" rx="35" ry="25" fill="white" opacity="0.75" />
                        <ellipse cx="92" cy="25" rx="30" ry="22" fill="white" opacity="0.75" />
                    </svg>
                </div>
                <div
                    className="pointer-events-none select-none"
                    style={{ position: "absolute", top: "18%", right: "22%" }}
                >
                    <svg
                        width="100"
                        height="38"
                        viewBox="0 0 100 38"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse cx="50" cy="28" rx="46" ry="15" fill="white" opacity="0.7" />
                        <ellipse cx="33" cy="18" rx="28" ry="20" fill="white" opacity="0.7" />
                        <ellipse cx="70" cy="20" rx="24" ry="18" fill="white" opacity="0.7" />
                    </svg>
                </div>
                <div
                    className="hidden md:block pointer-events-none select-none"
                    style={{ position: "absolute", top: "28%", left: "62%" }}
                >
                    <svg
                        width="80"
                        height="30"
                        viewBox="0 0 80 30"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse cx="40" cy="22" rx="36" ry="12" fill="white" opacity="0.65" />
                        <ellipse cx="25" cy="14" rx="22" ry="16" fill="white" opacity="0.65" />
                        <ellipse cx="58" cy="16" rx="18" ry="14" fill="white" opacity="0.65" />
                    </svg>
                </div>

                {/* ─── NAVBAR ─── */}
                <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5">
                    {/* Logo */}
                    <a
                        href="#"
                        className="flex items-center gap-2 text-white font-black text-xl tracking-tight select-none"
                    >
                        <svg
                            className="w-7 h-7"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M14 2L3 11.5V26h7v-8h8v8h7V11.5L14 2z"
                                fill="white"
                                opacity="0.95"
                            />
                            <path
                                d="M14 2L3 11.5V26h7v-8h8v8h7V11.5L14 2z"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="0.5"
                            />
                            {/* Shield overlay */}
                            <path
                                d="M14 7l-5 2.5v4c0 2.8 2.1 5.4 5 6 2.9-.6 5-3.2 5-6v-4L14 7z"
                                fill="#38bdf8"
                                opacity="0.85"
                            />
                        </svg>
                        NestCrow
                    </a>
                    {/* Nav links */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#" className="nav-link text-white text-sm font-medium">
                            Features
                        </a>
                        <a href="#" className="nav-link text-white text-sm font-medium">
                            How it Works
                        </a>
                        <a href="#" className="nav-link text-white text-sm font-medium">
                            Docs
                        </a>
                        <a
                            href="#"
                            className="outline-btn text-white text-sm font-semibold border border-white/70 rounded-full px-5 py-1.5"
                        >
                            Help
                        </a>
                    </div>
                    {/* Mobile menu icon */}
                    <button className="md:hidden text-white">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </nav>

                {/* ─── HERO TEXT & CTA ─── */}
                <div className="relative z-30 flex flex-col items-center justify-center text-center flex-1 px-6 pt-28 pb-64 md:pb-80">
                    <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-4 select-none">
                        Web3 Rental Protection
                    </p>
                    <h1 className="text-white font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight max-w-4xl drop-shadow-md">
                        Tired of security
                        <br className="hidden sm:block" /> deposit disputes?
                    </h1>
                    <p className="mt-5 text-sky-50 text-base sm:text-lg md:text-xl max-w-lg font-medium leading-relaxed">
                        Connect your wallet to manage your rental agreement securely — on-chain,
                        transparent, and dispute-free.
                    </p>
                    <Link
                        href="/connect"
                        className="hero-btn mt-10 bg-blue-500 hover:bg-blue-600 text-white font-bold text-base sm:text-lg px-10 py-4 rounded-2xl flex items-center gap-3 mx-auto select-none"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v1H2V6zM2 9h16v5a2 2 0 01-2 2H4a2 2 0 01-2-2V9zm3 2a1 1 0 000 2h2a1 1 0 000-2H5z" />
                        </svg>
                        Connect Wallet
                    </Link>
                    <p className="mt-4 text-white/60 text-xs">Phantom · MetaMask · WalletConnect</p>
                </div>

                {/* ─── FLOATING MINI ICONS over the skyline ─── */}
                {/* Key icon */}
                <div
                    className="icon-float pointer-events-none select-none hidden md:block"
                    style={{ position: "absolute", bottom: "290px", left: "18%", zIndex: "35" }}
                >
                    <div className="bg-white/90 rounded-xl p-2.5 shadow-lg">
                        <svg
                            className="w-6 h-6 text-sky-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <circle cx="8" cy="15" r="5" />
                            <path d="M13 15h9M19 15v3M17 15v2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                {/* Document / Lease icon */}
                <div
                    className="icon-float-slow pointer-events-none select-none hidden md:block"
                    style={{ position: "absolute", bottom: "320px", right: "16%", zIndex: "35" }}
                >
                    <div className="bg-white/90 rounded-xl p-2.5 shadow-lg">
                        <svg
                            className="w-6 h-6 text-blue-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                {/* Lock / Shield icon */}
                <div
                    className="icon-float pointer-events-none select-none hidden lg:block"
                    style={{
                        position: "absolute",
                        bottom: "350px",
                        left: "38%",
                        zIndex: "35",
                        animationDelay: "1.2s",
                    }}
                >
                    <div className="bg-white/90 rounded-xl p-2.5 shadow-lg">
                        <svg
                            className="w-6 h-6 text-teal-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M12 2l-7 3.5V11c0 5 3.3 9.7 7 11 3.7-1.3 7-6 7-11V5.5L12 2z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
                {/* Wallet icon */}
                <div
                    className="icon-float-slow pointer-events-none select-none hidden lg:block"
                    style={{
                        position: "absolute",
                        bottom: "300px",
                        right: "30%",
                        zIndex: "35",
                        animationDelay: "2s",
                    }}
                >
                    <div className="bg-white/90 rounded-xl p-2.5 shadow-lg">
                        <svg
                            className="w-6 h-6 text-indigo-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <rect x="2" y="6" width="20" height="14" rx="2" />
                            <path d="M2 10h20" />
                            <circle cx="17" cy="15" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                </div>

                {/* ─── SKYLINE ILLUSTRATION ─── */}
                <div
                    className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none select-none overflow-hidden"
                    style={{ height: "280px" }}
                >
                    <svg
                        viewBox="0 0 1440 280"
                        preserveAspectRatio="xMidYMax meet"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                    >
                        <defs>
                            <linearGradient id="skyGrd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#dbeafe" />
                                <stop offset="100%" stopColor="#bfdbfe" />
                            </linearGradient>
                            <linearGradient id="groundGrd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#e0f2fe" />
                                <stop offset="100%" stopColor="#bae6fd" />
                            </linearGradient>
                        </defs>

                        {/* ── FAR-BACK LAYER (lightest) ── */}
                        {/* Skyscraper far left */}
                        <rect x="20" y="120" width="55" height="160" rx="3" fill="#d6e4f0" />
                        <rect x="25" y="118" width="45" height="8" rx="2" fill="#c3d8ec" />
                        {/* Windows */}
                        <rect x="28" y="130" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="42" y="130" width="9" height="7" rx="1" className="window-lit" />
                        <rect x="57" y="130" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="28" y="145" width="9" height="7" rx="1" className="window-lit" />
                        <rect x="42" y="145" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="57" y="145" width="9" height="7" rx="1" className="window-lit" />
                        <rect x="28" y="160" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="42" y="160" width="9" height="7" rx="1" className="window-lit" />
                        <rect x="57" y="160" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="28" y="175" width="9" height="7" rx="1" className="window-lit" />
                        <rect x="42" y="175" width="9" height="7" rx="1" className="window-dim" />
                        <rect x="57" y="175" width="9" height="7" rx="1" className="window-lit" />
                        {/* Antenna */}
                        <rect x="44" y="105" width="3" height="15" fill="#b0c8de" />

                        {/* Tall far building right */}
                        <rect x="1360" y="100" width="70" height="180" rx="3" fill="#cdd9ea" />
                        <rect x="1363" y="98" width="64" height="9" rx="2" fill="#b8cfe8" />
                        <rect
                            x="1366"
                            y="112"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-dim"
                        />
                        <rect
                            x="1382"
                            y="112"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-lit"
                        />
                        <rect
                            x="1398"
                            y="112"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-dim"
                        />
                        <rect
                            x="1366"
                            y="127"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-lit"
                        />
                        <rect
                            x="1382"
                            y="127"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-dim"
                        />
                        <rect
                            x="1398"
                            y="127"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-lit"
                        />
                        <rect
                            x="1366"
                            y="142"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-dim"
                        />
                        <rect
                            x="1382"
                            y="142"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-lit"
                        />
                        <rect
                            x="1366"
                            y="157"
                            width="10"
                            height="7"
                            rx="1"
                            className="window-dim"
                        />

                        {/* ── MID LAYER ── */}
                        {/* Block of flats - center-left */}
                        <rect x="160" y="145" width="90" height="135" rx="3" fill="#b8cfe8" />
                        <rect x="155" y="142" width="100" height="9" rx="2" fill="#a3bdd9" />
                        {/* Windows */}
                        <rect
                            x="167"
                            y="157"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="186"
                            y="157"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="206"
                            y="157"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="226"
                            y="157"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="167"
                            y="175"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="186"
                            y="175"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="206"
                            y="175"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="226"
                            y="175"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="167"
                            y="193"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="186"
                            y="193"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="206"
                            y="193"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="226"
                            y="193"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        {/* Door */}
                        <rect x="196" y="248" width="18" height="32" rx="2" fill="#8aaec5" />

                        {/* Modern house - left side */}
                        <rect x="90" y="195" width="80" height="85" rx="2" fill="#cdd9ea" />
                        <polygon points="80,195 210,195 145,155" fill="#9ab8d4" />
                        {/* windows */}
                        <rect
                            x="98"
                            y="207"
                            width="15"
                            height="14"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="122"
                            y="207"
                            width="15"
                            height="14"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="148"
                            y="207"
                            width="15"
                            height="14"
                            rx="1.5"
                            className="window-lit"
                        />
                        {/* Door */}
                        <rect x="131" y="240" width="20" height="40" rx="2" fill="#8aaec5" />

                        {/* Office tower - center */}
                        <rect x="550" y="80" width="110" height="200" rx="3" fill="#9ab8d4" />
                        <rect x="545" y="77" width="120" height="11" rx="2" fill="#8aaec5" />
                        {/* Spire */}
                        <rect x="602" y="60" width="5" height="20" fill="#7a9db8" />
                        <polygon points="597,60 610,60 604,48" fill="#7a9db8" />
                        {/* Windows grid */}
                        <rect
                            x="558"
                            y="93"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="578"
                            y="93"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="598"
                            y="93"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="618"
                            y="93"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="638"
                            y="93"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="558"
                            y="112"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="578"
                            y="112"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="598"
                            y="112"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="618"
                            y="112"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="638"
                            y="112"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="558"
                            y="131"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="578"
                            y="131"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="598"
                            y="131"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="618"
                            y="131"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="638"
                            y="131"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="558"
                            y="150"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="578"
                            y="150"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="598"
                            y="150"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="618"
                            y="150"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="638"
                            y="150"
                            width="14"
                            height="11"
                            rx="1.5"
                            className="window-dim"
                        />
                        {/* Door */}
                        <rect x="593" y="250" width="24" height="30" rx="2" fill="#7a9db8" />

                        {/* Apartment block right-center */}
                        <rect x="780" y="130" width="105" height="150" rx="3" fill="#b8cfe8" />
                        <rect x="775" y="127" width="115" height="10" rx="2" fill="#a3bdd9" />
                        {/* Stepped roof extras */}
                        <rect x="800" y="117" width="65" height="14" rx="2" fill="#9ab8d4" />
                        <rect x="820" y="107" width="25" height="14" rx="2" fill="#8aaec5" />
                        {/* Windows */}
                        <rect
                            x="787"
                            y="143"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="806"
                            y="143"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="825"
                            y="143"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="844"
                            y="143"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="863"
                            y="143"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="787"
                            y="161"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="806"
                            y="161"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="825"
                            y="161"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="844"
                            y="161"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="863"
                            y="161"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="787"
                            y="179"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="806"
                            y="179"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="825"
                            y="179"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="844"
                            y="179"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="863"
                            y="179"
                            width="13"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        {/* Door */}
                        <rect x="820" y="242" width="22" height="38" rx="2" fill="#8aaec5" />

                        {/* Townhouse row - right */}
                        <rect x="1050" y="175" width="65" height="105" rx="2" fill="#cdd9ea" />
                        <polygon points="1040,175 1125,175 1082,148" fill="#9ab8d4" />
                        <rect x="1115" y="175" width="65" height="105" rx="2" fill="#b8cfe8" />
                        <polygon points="1105,175 1190,175 1148,148" fill="#8aaec5" />
                        <rect x="1180" y="185" width="65" height="95" rx="2" fill="#cdd9ea" />
                        <polygon points="1170,185 1255,185 1213,158" fill="#9ab8d4" />
                        {/* Windows */}
                        <rect
                            x="1058"
                            y="188"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="1078"
                            y="188"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="1058"
                            y="205"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="1078"
                            y="205"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="1123"
                            y="188"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="1143"
                            y="188"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="1188"
                            y="198"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="1208"
                            y="198"
                            width="12"
                            height="10"
                            rx="1.5"
                            className="window-dim"
                        />
                        {/* Doors */}
                        <rect x="1072" y="242" width="14" height="38" rx="1.5" fill="#8aaec5" />
                        <rect x="1135" y="242" width="14" height="38" rx="1.5" fill="#7a9db8" />
                        <rect x="1198" y="240" width="14" height="40" rx="1.5" fill="#8aaec5" />

                        {/* ── FOREGROUND LAYER (darkest, most detail) ── */}
                        {/* Left house foreground */}
                        <rect x="280" y="185" width="100" height="95" rx="2" fill="#a8c5dc" />
                        <polygon points="265,185 395,185 330,148" fill="#7a9db8" />
                        {/* Chimney */}
                        <rect x="350" y="140" width="14" height="32" rx="2" fill="#8aaec5" />
                        {/* Windows */}
                        <rect
                            x="292"
                            y="198"
                            width="20"
                            height="16"
                            rx="2"
                            className="window-lit"
                        />
                        <rect
                            x="322"
                            y="198"
                            width="20"
                            height="16"
                            rx="2"
                            className="window-dim"
                        />
                        <rect
                            x="352"
                            y="198"
                            width="20"
                            height="16"
                            rx="2"
                            className="window-lit"
                        />
                        <rect
                            x="292"
                            y="222"
                            width="20"
                            height="16"
                            rx="2"
                            className="window-dim"
                        />
                        <rect
                            x="352"
                            y="222"
                            width="20"
                            height="16"
                            rx="2"
                            className="window-dim"
                        />
                        {/* Door */}
                        <rect x="319" y="242" width="24" height="38" rx="2" fill="#6b9ab5" />

                        {/* Wide apartment block foreground */}
                        <rect x="390" y="155" width="170" height="125" rx="3" fill="#9ab8d4" />
                        <rect x="385" y="151" width="180" height="11" rx="2" fill="#7a9db8" />
                        {/* Stepped roofline */}
                        <rect x="420" y="141" width="110" height="14" rx="2" fill="#8aaec5" />
                        <rect x="450" y="130" width="50" height="14" rx="2" fill="#7a9db8" />
                        {/* Windows 3 rows */}
                        <rect
                            x="398"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="420"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="442"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="464"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="486"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="508"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="530"
                            y="167"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="398"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="420"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="442"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="464"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="486"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="508"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="530"
                            y="187"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="398"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="420"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="442"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="464"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="486"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        <rect
                            x="508"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-dim"
                        />
                        <rect
                            x="530"
                            y="207"
                            width="15"
                            height="12"
                            rx="1.5"
                            className="window-lit"
                        />
                        {/* Door */}
                        <rect x="462" y="248" width="26" height="32" rx="2" fill="#6b9ab5" />

                        {/* Modern minimalist house foreground right */}
                        <rect x="1260" y="180" width="120" height="100" rx="2" fill="#a8c5dc" />
                        {/* Flat roof with overhang */}
                        <rect x="1252" y="172" width="136" height="12" rx="3" fill="#7a9db8" />
                        {/* Large window */}
                        <rect
                            x="1268"
                            y="193"
                            width="55"
                            height="40"
                            rx="2"
                            className="window-lit"
                        />
                        <line
                            x1="1295"
                            y1="193"
                            x2="1295"
                            y2="233"
                            stroke="#8aaec5"
                            strokeWidth="1.5"
                        />
                        <line
                            x1="1268"
                            y1="213"
                            x2="1323"
                            y2="213"
                            stroke="#8aaec5"
                            strokeWidth="1.5"
                        />
                        {/* Door */}
                        <rect x="1334" y="222" width="28" height="58" rx="2" fill="#6b9ab5" />
                        {/* Small window */}
                        <rect
                            x="1348"
                            y="193"
                            width="22"
                            height="18"
                            rx="2"
                            className="window-dim"
                        />

                        {/* ── GROUND LAYER ── */}
                        {/* Main ground fill */}
                        <rect
                            x="0"
                            y="262"
                            width="1440"
                            height="18"
                            rx="0"
                            fill="#7ab8d4"
                            opacity="0.5"
                        />

                        {/* Wavy water/ground line */}
                        <path
                            d="M0,268 C60,260 120,276 180,268 C240,260 300,276 360,268 C420,260 480,276 540,268 C600,260 660,276 720,268 C780,260 840,276 900,268 C960,260 1020,276 1080,268 C1140,260 1200,276 1260,268 C1320,260 1380,276 1440,268 L1440,280 L0,280 Z"
                            fill="#bae6fd"
                            opacity="0.8"
                        />
                        <path
                            d="M0,272 C80,264 160,280 240,272 C320,264 400,280 480,272 C560,264 640,280 720,272 C800,264 880,280 960,272 C1040,264 1120,280 1200,272 C1280,264 1360,280 1440,272 L1440,280 L0,280 Z"
                            fill="#e0f2fe"
                            opacity="0.9"
                        />

                        {/* Trees / bushes (simple circles) */}
                        <ellipse cx="260" cy="275" rx="22" ry="14" fill="#7ab8d4" opacity="0.6" />
                        <rect x="257" y="270" width="6" height="12" fill="#6b9ab5" opacity="0.5" />
                        <ellipse cx="530" cy="272" rx="18" ry="12" fill="#7ab8d4" opacity="0.55" />
                        <ellipse cx="900" cy="273" rx="20" ry="13" fill="#7ab8d4" opacity="0.6" />
                        <ellipse cx="1240" cy="274" rx="22" ry="13" fill="#7ab8d4" opacity="0.55" />
                    </svg>
                </div>
            </section>

            {/* ═══════════════════════════════════════ FEATURES STRIP ═══ */}
            <section className="bg-white py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-center text-3xl md:text-4xl font-black text-slate-800 mb-3">
                        How NestCrow protects you
                    </h2>
                    <p className="text-center text-slate-500 text-base mb-14 max-w-xl mx-auto">
                        Smart-contract escrow meets tenant rights — your deposit is safe,
                        verifiable, and automatically released.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="flex flex-col items-center text-center p-8 rounded-3xl border border-slate-100 hover:border-sky-200 hover:shadow-lg transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mb-5">
                                <svg
                                    className="w-7 h-7 text-sky-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        d="M12 2l-7 3.5V11c0 5 3.3 9.7 7 11 3.7-1.3 7-6 7-11V5.5L12 2z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M9 12l2 2 4-4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-2">
                                On-Chain Escrow
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Your deposit lives in a verified smart contract — not your
                                landlord's bank account.
                            </p>
                        </div>
                        {/* Card 2 */}
                        <div className="flex flex-col items-center text-center p-8 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-5">
                                <svg
                                    className="w-7 h-7 text-blue-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path
                                        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Digital Lease</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Sign agreements on-chain with full audit trails. No more "I never
                                received that notice."
                            </p>
                        </div>
                        {/* Card 3 */}
                        <div className="flex flex-col items-center text-center p-8 rounded-3xl border border-slate-100 hover:border-teal-200 hover:shadow-lg transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-5">
                                <svg
                                    className="w-7 h-7 text-teal-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Auto Release</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Funds release automatically when both parties confirm move-out. No
                                delays, no disputes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ HOW IT WORKS ═══ */}
            <section className="bg-slate-50 py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-center text-3xl md:text-4xl font-black text-slate-800 mb-14">
                        How it works
                    </h2>
                    <div className="flex flex-col md:flex-row items-start gap-12">
                        {/* Step 1 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-black text-xl flex items-center justify-center mb-4 shadow-md">
                                1
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">Connect Wallet</h3>
                            <p className="text-slate-500 text-sm">
                                Link your Phantom, MetaMask, or any WalletConnect-compatible wallet
                                in seconds.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center pt-6">
                            <svg
                                className="w-8 h-8 text-slate-300"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    d="M5 12h14M12 5l7 7-7 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        {/* Step 2 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-black text-xl flex items-center justify-center mb-4 shadow-md">
                                2
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">Sign Your Lease</h3>
                            <p className="text-slate-500 text-sm">
                                Both tenant and landlord sign the digital lease agreement on-chain.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center pt-6">
                            <svg
                                className="w-8 h-8 text-slate-300"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    d="M5 12h14M12 5l7 7-7 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        {/* Step 3 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-black text-xl flex items-center justify-center mb-4 shadow-md">
                                3
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">Deposit Locked</h3>
                            <p className="text-slate-500 text-sm">
                                Your deposit is secured in smart-contract escrow, visible to both
                                parties.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center pt-6">
                            <svg
                                className="w-8 h-8 text-slate-300"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    d="M5 12h14M12 5l7 7-7 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        {/* Step 4 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-teal-500 text-white font-black text-xl flex items-center justify-center mb-4 shadow-md">
                                4
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">Get Paid Back</h3>
                            <p className="text-slate-500 text-sm">
                                Move out, both parties confirm, and your deposit is released
                                instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════ BOTTOM CTA ═══════ */}
            <section className="bg-gradient-to-br from-sky-500 to-blue-600 py-20 px-6 text-center">
                <h2 className="text-white font-black text-3xl md:text-4xl mb-4">
                    Ready to rent with confidence?
                </h2>
                <p className="text-sky-100 text-base md:text-lg mb-10 max-w-md mx-auto">
                    Join thousands of tenants and landlords who have already made the switch to
                    transparent, on-chain rental agreements.
                </p>
                <Link
                    href="/connect"
                    className="hero-btn bg-white text-blue-600 font-bold text-base px-10 py-4 rounded-2xl inline-flex items-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v1H2V6zM2 9h16v5a2 2 0 01-2 2H4a2 2 0 01-2-2V9zm3 2a1 1 0 000 2h2a1 1 0 000-2H5z" />
                    </svg>
                    Connect Wallet
                </Link>
            </section>

            {/* ═══════════════════════════════════════ FOOTER ═══════════ */}
            <footer className="bg-slate-900 text-slate-400 py-10 px-6">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-white font-black tracking-tight">NestCrow</span>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="hover:text-white transition-colors">
                            Features
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Docs
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Privacy
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Terms
                        </a>
                    </div>
                    <span className="text-xs">© 2026 NestCrow. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
