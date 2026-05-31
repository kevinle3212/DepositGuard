import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Deposit, CreateDepositInput } from "@/types";
import { MOCK_DEPOSITS } from "@/lib/mock-data";

async function fetchDeposits(walletAddress?: string): Promise<Deposit[]> {
    await new Promise((r) => setTimeout(r, 400));
    if (!walletAddress) return [];
    return MOCK_DEPOSITS.filter(
        (d) => d.landlordAddress === walletAddress || d.tenantAddress === walletAddress,
    );
}

async function fetchDeposit(id: string): Promise<Deposit | null> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_DEPOSITS.find((d) => d.id === id) ?? null;
}

async function createDeposit(
    input: CreateDepositInput & { landlordAddress: string },
): Promise<Deposit> {
    await new Promise((r) => setTimeout(r, 600));
    const now = new Date().toISOString();
    return {
        id: `dep_${Date.now()}`,
        status: "Created",
        amountSol: input.amountSol,
        landlordAddress: input.landlordAddress,
        tenantAddress: input.tenantAddress,
        propertyAddress: input.propertyAddress,
        ...(input.propertyDescription !== undefined && {
            propertyDescription: input.propertyDescription,
        }),
        escrowAddress: `EsCr0w${Math.random().toString(36).slice(2, 11)}`,
        createdAt: now,
        updatedAt: now,
        moveInDate: input.moveInDate,
        timeline: [
            {
                status: "Created",
                timestamp: now,
                actor: "Landlord",
                note: "Awaiting tenant funding",
            },
        ],
    };
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
