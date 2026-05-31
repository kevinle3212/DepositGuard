/**
 * Shared Firestore-lease → UI-`Deposit` mapper.
 *
 * Firestore stores leases with on-chain-aligned field names (`depositAmount`,
 * `currency`, `leaseStart`, …). The frontend `Deposit` type uses different names
 * (`amountSol`, `denomination`, `moveInDate`, …) and requires a non-optional
 * `timeline`. Both `/api/deposits` (list) and `/api/deposits/[id]` (detail) must
 * return the exact same shape, so the mapping lives here instead of being
 * duplicated — a previous divergence caused the detail page to crash on
 * `amountSol.toFixed()` and `timeline.length`.
 */

export interface LeaseDoc {
    status?: string;
    depositAmount?: number;
    arbitratorAddress?: string;
    currency?: string;
    landlordAddress?: string;
    tenantAddress?: string;
    propertyAddress?: string;
    propertyDescription?: string;
    escrowAddress?: string;
    createdAt?: string;
    updatedAt?: string;
    leaseStart?: string;
    leaseEnd?: string;
    contractHash?: string;
    contractStorageUrl?: string;
    landlordSigned?: boolean;
    tenantSigned?: boolean;
    landlordEstimateUsdc?: number;
    tenantEstimateUsdc?: number;
    maxFineUsdc?: number;
    estimatesRevealed?: boolean;
    landlordEstimateTxSig?: string;
    tenantEstimateTxSig?: string;
    solanaLeaseId?: string;
    timeline?: unknown[];
}

export interface DepositResponse {
    id: string;
    status: string;
    arbitratorAddress?: string;
    amountSol: number;
    denomination: string;
    landlordAddress: string;
    tenantAddress: string;
    propertyAddress: string;
    propertyDescription?: string;
    escrowAddress: string;
    createdAt: string;
    updatedAt: string;
    moveInDate?: string;
    moveOutDate?: string;
    contractHash?: string;
    contractStorageUrl?: string;
    landlordSigned?: boolean;
    tenantSigned?: boolean;
    landlordEstimateUsdc?: number;
    tenantEstimateUsdc?: number;
    maxFineUsdc?: number;
    estimatesRevealed?: boolean;
    landlordEstimateTxSig?: string;
    tenantEstimateTxSig?: string;
    timeline: unknown[];
}

/** Maps a Firestore lease document to the `Deposit` shape used by the UI. */
export function leaseToDeposit(id: string, raw: FirebaseFirestore.DocumentData): DepositResponse {
    const data = raw as LeaseDoc;
    const now = new Date().toISOString();
    return {
        id,
        status: data.status ?? "Created",
        amountSol: typeof data.depositAmount === "number" ? data.depositAmount : 0,
        denomination: data.currency ?? "USDC",
        landlordAddress: data.landlordAddress ?? "",
        tenantAddress: data.tenantAddress ?? "",
        propertyAddress: data.propertyAddress ?? "",
        ...(data.propertyDescription !== undefined
            ? { propertyDescription: data.propertyDescription }
            : {}),
        escrowAddress: data.escrowAddress ?? "",
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? data.createdAt ?? now,
        ...(data.leaseStart !== undefined ? { moveInDate: data.leaseStart } : {}),
        ...(data.leaseEnd !== undefined ? { moveOutDate: data.leaseEnd } : {}),
        ...(data.contractHash !== undefined ? { contractHash: data.contractHash } : {}),
        ...(data.contractStorageUrl !== undefined
            ? { contractStorageUrl: data.contractStorageUrl }
            : {}),
        landlordSigned: data.landlordSigned === true,
        tenantSigned: data.tenantSigned === true,
        ...(data.landlordEstimateUsdc !== undefined
            ? { landlordEstimateUsdc: data.landlordEstimateUsdc }
            : {}),
        ...(data.tenantEstimateUsdc !== undefined
            ? { tenantEstimateUsdc: data.tenantEstimateUsdc }
            : {}),
        ...(data.maxFineUsdc !== undefined ? { maxFineUsdc: data.maxFineUsdc } : {}),
        ...(data.estimatesRevealed !== undefined
            ? { estimatesRevealed: data.estimatesRevealed }
            : {}),
        ...(data.landlordEstimateTxSig !== undefined
            ? { landlordEstimateTxSig: data.landlordEstimateTxSig }
            : {}),
        ...(data.tenantEstimateTxSig !== undefined
            ? { tenantEstimateTxSig: data.tenantEstimateTxSig }
            : {}),
        ...(data.arbitratorAddress !== undefined
            ? { arbitratorAddress: data.arbitratorAddress }
            : {}),
        timeline:
            Array.isArray(data.timeline) && data.timeline.length > 0
                ? data.timeline
                : [
                      {
                          status: data.status ?? "Created",
                          timestamp: data.createdAt ?? now,
                          actor: "System",
                      },
                  ],
    };
}
