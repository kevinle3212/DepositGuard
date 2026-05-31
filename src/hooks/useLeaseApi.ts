import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import apiClient from "@/src/lib/apiClient";
import { LeaseSchema, DamageItemSchema, type Lease } from "@/src/types/api";

export function useFetchLeases(walletAddress: string) {
    return useQuery({
        queryKey: ["leases", walletAddress],
        queryFn: async () => {
            const { data } = await apiClient.get<unknown>(`/leases?wallet=${walletAddress}`);
            const raw = Array.isArray(data) ? data : [];
            // Parse each lease individually so one bad doc doesn't crash the whole list
            return raw
                .map((item: unknown) => LeaseSchema.safeParse(item))
                .filter((r) => r.success)
                .map((r) => (r as { success: true; data: typeof LeaseSchema._type }).data);
        },
        enabled: !!walletAddress,
    });
}

export function useFetchLeaseById(id: string) {
    return useQuery({
        queryKey: ["lease", id],
        queryFn: async () => {
            const { data } = await apiClient.get<unknown>(`/leases/${id}`);
            return LeaseSchema.parse(data);
        },
        enabled: !!id,
    });
}

interface CreateLeasePayload {
    propertyAddress: string;
    depositAmount: number;
    currency: "USDC" | "SOL";
    tenantAddress: string;
    jurisdiction: string;
    landlordAddress?: string;
    contractHash?: string;
    contractStorageUrl?: string;
    leaseStart?: string;
    leaseEnd?: string;
}

export function useCreateLease() {
    return useMutation({
        mutationFn: async (payload: CreateLeasePayload): Promise<Lease> => {
            const { data } = await apiClient.post<unknown>("/leases", payload);
            return LeaseSchema.parse(data);
        },
    });
}

export function useFetchAssessment(leaseId: string) {
    return useQuery({
        queryKey: ["assessment", leaseId],
        queryFn: async () => {
            const { data } = await apiClient.get<unknown>(`/leases/${leaseId}/assessment`);
            return z.array(DamageItemSchema).parse(data);
        },
        enabled: !!leaseId,
    });
}
