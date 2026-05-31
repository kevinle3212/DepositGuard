/**
 * Voice script templates keyed by scriptKey.
 * Variables are interpolated with {{variableName}} syntax.
 * These mirror the Firestore voiceScripts/{scriptKey} documents;
 * this map serves as the local fallback when Firestore is unavailable.
 */
export const VOICE_SCRIPTS: Record<string, string> = {
    // Voice feature onboarding — spoken when user enables voice for the first time
    "voice.enabled":
        "Voice is now on. I'm Eryn, your NestCrow assistant. " +
        "I'll read important steps and confirmations aloud as you go through the deposit process. " +
        "You can turn voice off at any time by clicking the speaker icon in the top navigation bar.",

    // Wallet & onboarding
    "wallet.prompt": "Please connect your Solana wallet to get started with NestCrow.",
    "wallet.connected": "Wallet connected successfully. Welcome to NestCrow.",
    "onboarding.welcome":
        "Welcome to NestCrow. I'm Eryn, your platform guide. " +
        "NestCrow holds security deposits in on-chain escrow so neither party can touch the funds until both agree. " +
        "Let me walk you through the next steps.",

    // Contract signing
    "contract.signing":
        "Please review the lease agreement and sign with your wallet to confirm your identity. " +
        "Your signature is recorded on-chain and cannot be altered.",
    "contract.signed":
        "Both parties have signed the contract. The lease is now active and the deposit window is open.",

    // Escrow funding
    "escrow.funded":
        "The security deposit of {{amount}} USDC has been placed in escrow. " +
        "Funds are locked on-chain until move-out is complete.",

    // Photos
    "photos.movein.required":
        "Move-in photos are required from both parties before the lease becomes active. " +
        "Please upload your photos now.",
    "photos.moveout.required":
        "Move-out is complete. Please upload your move-out photos so the AI assessment can begin.",

    // Assessment
    "assessment.ready":
        "The damage assessment is ready. Please review the itemized estimate. " +
        "Remember — this is an advisory AI estimate only, not a legal determination.",
    "assessment.dispute.flagged":
        "The landlord's deduction statement differs from the AI estimate by more than {{thresholdPct}} percent. " +
        "A dispute prompt has been surfaced for the tenant.",

    // Dispute
    "dispute.opened":
        "A dispute has been opened. Both parties must now submit their damage estimates independently. " +
        "Neither party will see the other's estimate until both have submitted.",
    "dispute.estimates.sealed":
        "Both estimates are sealed. The maximum fine has been set to the average of the two estimates on-chain.",

    // Arbitration fees
    "arbitration.fee":
        "A fifty dollar USDC arbitration fee is required from each party to proceed to arbitration. " +
        "You have seventy-two hours to pay. If only one party pays, that party is refunded automatically.",
    "arbitration.fee.paid":
        "Your arbitration fee has been received. Waiting for the other party to pay.",
    "arbitration.fee.refunded": "The arbitration fees have been refunded to both parties.",

    // Panel upgrade
    "panel.upgrade":
        "Both parties may optionally upgrade to a three-panelist review for an additional twenty-five USDC each.",

    // Rulings
    "ruling.issued":
        "The arbitration ruling has been issued. The adopted fine is {{adoptedFine}} USDC.",
    "minority.dissent":
        "A minority dissent has been recorded. The dissenting panelist's ruling is permanently stored on-chain " +
        "and the fourteen-day escalation window is now open.",

    // Deposit release
    "deposit.released":
        "The security deposit has been settled. Funds have been transferred on-chain. " +
        "Thank you for using NestCrow.",

    // Deadline & timeout
    "deadline.warning":
        "Your deadline is approaching on {{date}}. Please take action to avoid an automatic timeout.",
    "claim.timeout":
        "The claim timeout has been executed and the remaining balance has been released to the tenant.",

    // Errors
    "error.general": "Something went wrong. Please try again or contact NestCrow support.",
    "error.wallet.signing": "Wallet signing was cancelled or failed. Please try again.",
};

/** Replace {{key}} placeholders with values from the variables map. */
export function interpolateScript(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}
