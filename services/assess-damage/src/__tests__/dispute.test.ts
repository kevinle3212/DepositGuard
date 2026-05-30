import { describe, it, expect } from 'vitest'
import { computeDisputeFlag } from '../dispute.js'

const THRESHOLD = 0.15

describe('computeDisputeFlag', () => {
  it('flags when landlord estimate exceeds gemini by more than threshold', () => {
    // 200 vs 100 → 100% divergence > 15%
    const result = computeDisputeFlag(200, 100, THRESHOLD)
    expect(result.flagged).toBe(true)
    expect(result.actualDivergencePct).toBeCloseTo(1.0)
  })

  it('does not flag when within threshold', () => {
    // 110 vs 100 → 10% divergence < 15%
    const result = computeDisputeFlag(110, 100, THRESHOLD)
    expect(result.flagged).toBe(false)
    expect(result.actualDivergencePct).toBeCloseTo(0.1)
  })

  it('does not flag at exactly the threshold boundary (strict greater-than)', () => {
    // 115 vs 100 → 15% divergence = threshold → NOT flagged
    const result = computeDisputeFlag(115, 100, THRESHOLD)
    expect(result.flagged).toBe(false)
    expect(result.actualDivergencePct).toBeCloseTo(0.15)
  })

  it('flags just above threshold', () => {
    // 115.01 vs 100 → slightly above 15%
    const result = computeDisputeFlag(115.01, 100, THRESHOLD)
    expect(result.flagged).toBe(true)
  })

  it('works symmetrically when gemini estimate exceeds landlord', () => {
    // 100 vs 200 → 50% divergence > 15%
    const result = computeDisputeFlag(100, 200, THRESHOLD)
    expect(result.flagged).toBe(true)
    expect(result.actualDivergencePct).toBeCloseTo(0.5)
  })

  it('flags when gemini is 0 and landlord is non-zero', () => {
    const result = computeDisputeFlag(100, 0, THRESHOLD)
    expect(result.flagged).toBe(true)
    expect(result.actualDivergencePct).toBe(1)
  })

  it('does not flag when both estimates are 0', () => {
    const result = computeDisputeFlag(0, 0, THRESHOLD)
    expect(result.flagged).toBe(false)
    expect(result.actualDivergencePct).toBe(0)
  })

  it('carries through correct metadata fields', () => {
    const result = computeDisputeFlag(200, 100, 0.20)
    expect(result.landlordEstimateUsdc).toBe(200)
    expect(result.geminiEstimateUsd).toBe(100)
    expect(result.thresholdPct).toBe(0.20)
  })

  it('includes a human-readable reason string', () => {
    const flagged = computeDisputeFlag(200, 100, THRESHOLD)
    expect(flagged.reason).toMatch(/diverges/)

    const ok = computeDisputeFlag(110, 100, THRESHOLD)
    expect(ok.reason).toMatch(/within/)
  })

  it('respects a custom threshold of 0.10', () => {
    // 112 vs 100 → 12% divergence > 10% threshold → flagged
    const result = computeDisputeFlag(112, 100, 0.10)
    expect(result.flagged).toBe(true)
  })
})
