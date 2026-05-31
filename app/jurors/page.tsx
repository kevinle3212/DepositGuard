"use client";

import { Nav } from "@/components/layout/nav";
import { JurorRegistrationPanel } from "@/components/arbitration/JurorRegistrationPanel";

export default function JurorsPage() {
    return (
        <>
            <Nav />
            <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Juror Registry</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Stake SOL to join the arbitration panel pool. When a dispute escalates,
                        registered jurors are selected based on their stake weight.
                    </p>
                </div>
                <JurorRegistrationPanel />
            </main>
        </>
    );
}
