export type NotificationEvent =
    | "magic_link_invite"
    | "both_parties_signed"
    | "move_in_photo_required"
    | "move_out_complete"
    | "assessment_ready"
    | "deduction_statement"
    | "dispute_opened"
    | "arbitration_fee_due"
    | "arbitration_fee_refunded"
    | "ruling_issued"
    | "minority_dissent_filed"
    | "deposit_released"
    | "deadline_warning"
    | "claim_timeout_executed";

export interface EmailTemplate {
    subject: string;
    text: string;
    html: string;
}

export type TemplateVariables = Record<string, string>;

const BASE_URL = process.env.APP_BASE_URL ?? "https://nestcrow.tech";
const SOLSCAN = (sig: string) =>
    `https://solscan.io/tx/${sig}?cluster=${process.env.SOLANA_CLUSTER ?? "devnet"}`;

function wrap(leaseId: string, body: string): string {
    return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h3 style="color:#1a1a1a">NestCrow</h3>
      ${body}
      <hr/>
      <p style="font-size:12px;color:#666">
        Lease ID: <code>${leaseId}</code><br/>
        <a href="${BASE_URL}/lease/${leaseId}">View lease dashboard</a>
      </p>
    </div>
  `.trim();
}

export function buildTemplate(
    leaseId: string,
    event: NotificationEvent,
    vars: TemplateVariables,
): EmailTemplate {
    switch (event) {
        case "magic_link_invite": {
            const role = vars.role ?? "party";
            const link = vars.signingLink ?? `${BASE_URL}/lease/${leaseId}/sign`;
            return {
                subject: "NestCrow: Sign Your Lease",
                text: [
                    `You have been invited to review and sign a lease as the ${role}.`,
                    "",
                    `Sign here (link expires in 48 hours): ${link}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>You have been invited to review and sign a lease as the <strong>${role}</strong>.</p>
           <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Sign Lease</a></p>
           <p style="font-size:12px;color:#666">This link expires in 48 hours.</p>`,
                ),
            };
        }

        case "both_parties_signed": {
            return {
                subject: "NestCrow: Both Parties Have Signed",
                text: [
                    `Both the landlord and tenant have signed the lease for lease ID ${leaseId}.`,
                    "The tenant may now fund the security deposit escrow.",
                    `${BASE_URL}/lease/${leaseId}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>Both the landlord and tenant have signed the lease.</p>
           <p>The tenant may now fund the security deposit escrow.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}">Go to lease dashboard</a></p>`,
                ),
            };
        }

        case "move_in_photo_required": {
            const role = vars.role ?? "your party";
            return {
                subject: "NestCrow: Move-In Photos Required",
                text: [
                    `Action required: ${role} must upload move-in photos for lease ${leaseId}.`,
                    "Both parties must complete photo upload before the lease becomes active.",
                    `${BASE_URL}/lease/${leaseId}/photos/move-in`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>Action required: <strong>${role}</strong> must upload move-in photos.</p>
           <p>Both parties must complete photo upload before the lease becomes active.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}/photos/move-in">Upload Photos</a></p>`,
                ),
            };
        }

        case "move_out_complete": {
            return {
                subject: "NestCrow: Move-Out Photos Submitted",
                text: [
                    `Move-out photos have been submitted for lease ${leaseId}.`,
                    "The Gemini damage assessment will run shortly.",
                    `${BASE_URL}/lease/${leaseId}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>Move-out photos have been submitted.</p>
           <p>The AI damage assessment will run shortly. You will be notified when results are ready.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}">View lease</a></p>`,
                ),
            };
        }

        case "assessment_ready": {
            const total = vars.totalEstimate ?? "N/A";
            return {
                subject: "NestCrow: Damage Assessment Ready",
                text: [
                    `The AI damage assessment for lease ${leaseId} is ready.`,
                    `Estimated total (advisory only, not legally binding): $${total} USDC`,
                    `${BASE_URL}/lease/${leaseId}/assessment`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>The AI damage assessment is ready.</p>
           <p><strong>Estimated total:</strong> $${total} USDC<br/>
           <em style="font-size:12px;color:#666">Advisory estimate only — not legally binding.</em></p>
           <p><a href="${BASE_URL}/lease/${leaseId}/assessment">View Assessment</a></p>`,
                ),
            };
        }

        case "deduction_statement": {
            const landlordTotal = vars.landlordTotal ?? "N/A";
            const items = vars.deductionItems ?? "(see dashboard for details)";
            return {
                subject: "NestCrow: Landlord Deduction Statement Issued",
                text: [
                    `The landlord has issued a deduction statement for lease ${leaseId}.`,
                    `Total deduction claimed: $${landlordTotal} USDC`,
                    `Items: ${items}`,
                    "",
                    "You may agree to release funds or open a dispute from the dashboard.",
                    `${BASE_URL}/lease/${leaseId}/assessment`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>The landlord has issued a deduction statement.</p>
           <p><strong>Total deduction claimed:</strong> $${landlordTotal} USDC</p>
           <p>${items}</p>
           <p>You may agree to release funds or open a dispute.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}/assessment">Review Statement</a></p>`,
                ),
            };
        }

        case "dispute_opened": {
            return {
                subject: "NestCrow: Dispute Opened",
                text: [
                    `A dispute has been opened for lease ${leaseId}.`,
                    "The undisputed portion has been released to the tenant.",
                    "The disputed remainder is locked in escrow pending resolution.",
                    `${BASE_URL}/lease/${leaseId}/dispute`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>A dispute has been opened.</p>
           <p>The <strong>undisputed portion</strong> has been released to the tenant. The disputed remainder is locked in escrow.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}/dispute">Go to Dispute Dashboard</a></p>`,
                ),
            };
        }

        case "arbitration_fee_due": {
            const deadline = vars.paymentDeadline ?? "72 hours";
            return {
                subject: "NestCrow: Arbitration Fee Due",
                text: [
                    `Arbitration has been initiated for lease ${leaseId}.`,
                    `Each party owes a $50 USDC arbitration fee. Payment deadline: ${deadline}.`,
                    "If only one party pays within 72 hours, the paying party is refunded and arbitration is cancelled.",
                    `${BASE_URL}/lease/${leaseId}/dispute`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>Arbitration has been initiated.</p>
           <p>Each party owes a <strong>$50 USDC</strong> arbitration fee.</p>
           <p><strong>Payment deadline:</strong> ${deadline}</p>
           <p style="font-size:12px;color:#666">If only one party pays within 72 hours, the paying party is refunded and arbitration is cancelled.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}/dispute">Pay Arbitration Fee</a></p>`,
                ),
            };
        }

        case "arbitration_fee_refunded": {
            const amount = vars.amount ?? "$50";
            return {
                subject: "NestCrow: Arbitration Fee Refunded",
                text: [
                    `Your arbitration fee of ${amount} USDC has been refunded for lease ${leaseId}.`,
                    "The dispute was resolved before an arbitrator was assigned.",
                    `${BASE_URL}/lease/${leaseId}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>Your arbitration fee of <strong>${amount} USDC</strong> has been refunded.</p>
           <p>The dispute was resolved before an arbitrator was assigned.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}">View lease</a></p>`,
                ),
            };
        }

        case "ruling_issued": {
            const adoptedFine = vars.adoptedFine ?? "N/A";
            const sig = vars.txSignature;
            return {
                subject: "NestCrow: Arbitration Ruling Issued",
                text: [
                    `An arbitration ruling has been issued for lease ${leaseId}.`,
                    `Adopted fine: $${adoptedFine} USDC`,
                    ...(sig ? [`Transaction: ${SOLSCAN(sig)}`] : []),
                    `${BASE_URL}/lease/${leaseId}/arbitration`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>An arbitration ruling has been issued.</p>
           <p><strong>Adopted fine:</strong> $${adoptedFine} USDC</p>
           ${sig ? `<p><a href="${SOLSCAN(sig)}">View transaction on Solscan</a></p>` : ""}
           <p><a href="${BASE_URL}/lease/${leaseId}/arbitration">View Full Ruling</a></p>`,
                ),
            };
        }

        case "minority_dissent_filed": {
            const dissenterRole = vars.dissenterRole ?? "a panelist";
            const dissentAmount = vars.dissentAmount ?? "N/A";
            return {
                subject: "NestCrow: Minority Dissent Filed",
                text: [
                    `A minority dissent has been filed by ${dissenterRole} for lease ${leaseId}.`,
                    `Dissenting ruling amount: $${dissentAmount} USDC`,
                    "The dissent has been recorded permanently on-chain. You have 14 days to escalate.",
                    `${BASE_URL}/lease/${leaseId}/arbitration`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>A minority dissent has been filed by <strong>${dissenterRole}</strong>.</p>
           <p><strong>Dissenting ruling amount:</strong> $${dissentAmount} USDC</p>
           <p>The dissent is recorded permanently on-chain. You have <strong>14 days</strong> to escalate to a higher authority.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}/arbitration">View Arbitration Details</a></p>`,
                ),
            };
        }

        case "deposit_released": {
            const amount = vars.amount ?? "N/A";
            const sig = vars.txSignature;
            return {
                subject: "NestCrow: Deposit Released",
                text: [
                    `The security deposit has been released for lease ${leaseId}.`,
                    `Amount: $${amount} USDC`,
                    ...(sig ? [`Transaction: ${SOLSCAN(sig)}`] : []),
                    `${BASE_URL}/lease/${leaseId}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>The security deposit has been released.</p>
           <p><strong>Amount:</strong> $${amount} USDC</p>
           ${sig ? `<p><a href="${SOLSCAN(sig)}">View transaction on Solscan</a></p>` : ""}
           <p><a href="${BASE_URL}/lease/${leaseId}">View lease</a></p>`,
                ),
            };
        }

        case "deadline_warning": {
            const deadline = vars.deadlineTs
                ? new Date(Number(vars.deadlineTs) * 1000).toUTCString()
                : "soon";
            return {
                subject: "NestCrow: Review Deadline Approaching",
                text: [
                    `The review deadline for lease ${leaseId} is approaching.`,
                    `Deadline: ${deadline}`,
                    "If no agreement is reached by the deadline, the full deposit will be automatically released to the tenant.",
                    `${BASE_URL}/lease/${leaseId}`,
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>The review deadline is approaching.</p>
           <p><strong>Deadline:</strong> ${deadline}</p>
           <p>If no agreement is reached, the full deposit will be automatically released to the tenant.</p>
           <p><a href="${BASE_URL}/lease/${leaseId}">Review Now</a></p>`,
                ),
            };
        }

        case "claim_timeout_executed": {
            const sig = vars.txSignature;
            return {
                subject: "NestCrow: Deposit Released — Deadline Passed",
                text: [
                    `The review deadline for lease ${leaseId} has passed without a mutual agreement.`,
                    "The full deposit has been automatically released to the tenant.",
                    ...(sig ? [`Transaction: ${SOLSCAN(sig)}`] : []),
                ].join("\n"),
                html: wrap(
                    leaseId,
                    `<p>The review deadline has passed without a mutual agreement.</p>
           <p>The full deposit has been automatically released to the tenant.</p>
           ${sig ? `<p><a href="${SOLSCAN(sig)}">View transaction on Solscan</a></p>` : ""}`,
                ),
            };
        }
    }
}
