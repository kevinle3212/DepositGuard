// Pure helpers for partitioning leases by lifecycle status.
// Operate on real lease data returned from the API.

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
