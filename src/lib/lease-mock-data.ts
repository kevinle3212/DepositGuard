import type { LeaseStatus } from "@/components/ui/StatusBadge";

export interface MockLease {
    id: string;
    propertyName: string;
    propertyAddress: string;
    counterpartyAddress: string;
    depositAmount: number;
    currency: "USDC" | "SOL";
    leaseStart: string;
    leaseEnd: string;
    status: LeaseStatus;
    landlordSigned: boolean;
    tenantSigned: boolean;
    contractHash?: string;
}

export const MOCK_LEASES: MockLease[] = [
    {
        id: "lease_001",
        propertyName: "Oak Street Apartments 4B",
        propertyAddress: "142 Oak Street, Austin TX 78701",
        counterpartyAddress: "FsJ3A3u2vn5cTkBvV5StX6zR4CwKi3usFDqHhj7tKHCB",
        depositAmount: 2500,
        currency: "USDC",
        leaseStart: "2024-03-01",
        leaseEnd: "2025-02-28",
        status: "Active",
        landlordSigned: true,
        tenantSigned: true,
        contractHash: "a3f9c812e4b27d1f0a8c3e6b9d2f5a8c",
    },
    {
        id: "lease_002",
        propertyName: "River Rd Studio Unit 4",
        propertyAddress: "108 River Rd Unit 4, Denver CO 80203",
        counterpartyAddress: "Aq4kXBi6qgLz7Wbp9HsY3cV8mFnE6dNjT1xKR2oMpQC",
        depositAmount: 1.8,
        currency: "SOL",
        leaseStart: "2023-11-01",
        leaseEnd: "2024-10-31",
        status: "Disputed",
        landlordSigned: true,
        tenantSigned: true,
    },
    {
        id: "lease_003",
        propertyName: "Pine Lane Single Family",
        propertyAddress: "789 Pine Lane, Nashville TN 37201",
        counterpartyAddress: "NwT7pL3mK9qX2vY8hA5sE6cR1dF4gB0uJ3iW2oZnMPQ",
        depositAmount: 3000,
        currency: "USDC",
        leaseStart: "2024-06-01",
        leaseEnd: "2025-05-31",
        status: "Funded",
        landlordSigned: true,
        tenantSigned: false,
    },
    {
        id: "lease_004",
        propertyName: "Congress Ave Commercial",
        propertyAddress: "2200 Congress Ave Suite 100, Austin TX 78701",
        counterpartyAddress: "PxQ4rM8nL2kV7wA5yH9sE3cT6fU0jB1oX3gW2iCbZnM",
        depositAmount: 8000,
        currency: "USDC",
        leaseStart: "2024-07-01",
        leaseEnd: "2025-06-30",
        status: "Created",
        landlordSigned: false,
        tenantSigned: false,
    },
    {
        id: "lease_005",
        propertyName: "Oak St Apartments 2A",
        propertyAddress: "142 Oak Street Unit 2A, Austin TX 78701",
        counterpartyAddress: "GhT6rM9nL3kV8wB6zH0sE4cT7fU1jC2oY4gX3iDbAnN",
        depositAmount: 1500,
        currency: "USDC",
        leaseStart: "2023-04-01",
        leaseEnd: "2024-03-31",
        status: "Resolved",
        landlordSigned: true,
        tenantSigned: true,
        contractHash: "b4e0d923f5c38e2a1b9d4f7c0e3g6b9d",
    },
    {
        id: "lease_006",
        propertyName: "Maple St Loft 3C",
        propertyAddress: "42 Maple Street Apt 3C, Austin TX 78701",
        counterpartyAddress: "RmX5kP0nM4lU9vC7aJ2rF8gB3oD6wQ1eZ9hY5tKsLwN",
        depositAmount: 2200,
        currency: "USDC",
        leaseStart: "2024-05-01",
        leaseEnd: "2024-10-31",
        status: "Move-Out Pending",
        landlordSigned: true,
        tenantSigned: true,
    },
];

export function getActiveLeases<T extends { status: string }>(leases: T[]): T[] {
    return leases.filter((l) =>
        [
            "Created",
            "Funded",
            "Pending Documentation",
            "Active",
            "Move-Out Pending",
            "Assessed",
        ].includes(l.status),
    );
}

export function getHistoricLeases<T extends { status: string }>(leases: T[]): T[] {
    return leases.filter((l) => ["Approved", "Resolved", "Disputed"].includes(l.status));
}

export function getActionableLeases(leases: MockLease[], role: "landlord" | "tenant"): MockLease[] {
    if (role === "tenant") {
        return leases.filter((l) => l.status === "Funded" || l.status === "Created");
    }
    return leases.filter((l) => l.status === "Move-Out Pending" || l.status === "Assessed");
}
