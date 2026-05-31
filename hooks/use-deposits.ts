import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Deposit, CreateDepositInput } from "@/types";

async function fetchDeposits(walletAddress?: string): Promise<Deposit[]> {
    if (!walletAddress) return [];
    const res = await fetch(`/api/deposits?wallet=${walletAddress}`);
    if (!res.ok) throw new Error("Failed to fetch deposits");
    return res.json() as Promise<Deposit[]>;
}

async function fetchDeposit(id: string): Promise<Deposit | null> {
    const res = await fetch(`/api/deposits/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch deposit");
    return res.json() as Promise<Deposit>;
}

async function createDeposit(
    input: CreateDepositInput & { landlordAddress: string },
): Promise<Deposit> {
    const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Failed to create deposit");
    }
    return res.json() as Promise<Deposit>;
}

export function useDeposits(walletAddress?: string) {
    return useQuery({
        queryKey: ["deposits", walletAddress],
        queryFn: async () => fetchDeposits(walletAddress),
        enabled: !!walletAddress,
    });
}

export function useDeposit(id: string) {
    return useQuery({
        queryKey: ["deposit", id],
        queryFn: async () => fetchDeposit(id),
        enabled: !!id,
    });
}

export function useCreateDeposit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDeposit,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["deposits"] });
        },
    });
}
