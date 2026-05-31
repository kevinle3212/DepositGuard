export type DepositStatus =
    | "Created"
    | "Funded"
    | "Pending Documentation"
    | "Pending Signature"
    | "Active"
    | "Move-Out Pending"
    | "Assessed"
    | "Approved"
    | "Disputed"
    | "Resolved";

/** Token used for the escrow deposit. Defaults to 'SOL' for backwards compat. */
export type Denomination = "SOL" | "USDC";

export interface Deposit {
    id: string;
    status: DepositStatus;
    arbitratorAddress?: string;
    /** Deposit amount in the unit specified by `denomination`. */
    amountSol: number;
    /** Token denomination for the deposit amount. Defaults to 'SOL'. */
    denomination?: Denomination;
    landlordAddress: string;
    tenantAddress: string;
    propertyAddress: string;
    propertyDescription?: string;
    escrowAddress: string;
    createdAt: string;
    updatedAt: string;
    moveInDate?: string;
    moveOutDate?: string;
    assessmentNotes?: string;
    claimAmount?: number;
    landlordSigned?: boolean;
    tenantSigned?: boolean;
    timeline: TimelineEvent[];
}

export interface TimelineEvent {
    status: DepositStatus;
    timestamp: string;
    note?: string;
    actor?: string;
}

export interface CreateDepositInput {
    tenantAddress: string;
    propertyAddress: string;
    propertyDescription?: string;
    amountSol: number;
    denomination?: Denomination;
    moveInDate: string;
    moveOutDate?: string;
}

export interface WalletState {
    connected: boolean;
    publicKey: string | null;
    balance: number | null;
    connecting: boolean;
}

export interface AppStats {
    totalDeposits: number;
    totalValueSol: number;
    activeDeposits: number;
    resolvedDeposits: number;
}

export const DEPOSIT_STATUS_ORDER: DepositStatus[] = [
    "Created",
    "Funded",
    "Pending Documentation",
    "Pending Signature",
    "Active",
    "Move-Out Pending",
    "Assessed",
    "Approved",
    "Disputed",
    "Resolved",
];
