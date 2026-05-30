export interface DisputeFlag {
  flagged: boolean
  landlordEstimateUsdc: number
  geminiEstimateUsd: number
  thresholdPct: number
  actualDivergencePct: number
  reason: string
}

/**
 * Checks whether the landlord's claimed total diverges from Gemini's estimate
 * by more than disputeThresholdPct (default 15%).
 *
 * Formula: |landlordTotal - geminiTotal| / geminiTotal > threshold
 */
export function computeDisputeFlag(
  landlordEstimateUsdc: number,
  geminiEstimateUsd: number,
  disputeThresholdPct: number,
): DisputeFlag {
  let actualDivergencePct: number
  if (geminiEstimateUsd === 0) {
    // Any non-zero landlord estimate against a $0 AI estimate always flags
    actualDivergencePct = landlordEstimateUsdc > 0 ? 1 : 0
  } else {
    actualDivergencePct =
      Math.abs(landlordEstimateUsdc - geminiEstimateUsd) / geminiEstimateUsd
  }

  const flagged = actualDivergencePct > disputeThresholdPct

  const reason = flagged
    ? `Landlord estimate ($${landlordEstimateUsdc.toFixed(2)}) diverges from AI estimate ($${geminiEstimateUsd.toFixed(2)}) by ${(actualDivergencePct * 100).toFixed(1)}%, exceeding the ${(disputeThresholdPct * 100).toFixed(0)}% threshold.`
    : `Estimates are within the acceptable threshold (${(actualDivergencePct * 100).toFixed(1)}% divergence).`

  return {
    flagged,
    landlordEstimateUsdc,
    geminiEstimateUsd,
    thresholdPct: disputeThresholdPct,
    actualDivergencePct,
    reason,
  }
}
