import { TopNav } from "@/components/layout/TopNav";
import { WalletGate } from "@/components/layout/wallet-gate";
import { ErynWidget } from "@/components/eryn/ErynWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <TopNav />
            <WalletGate>
                <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
            </WalletGate>
            <ErynWidget />
        </>
    );
}
