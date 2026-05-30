import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks (hoisted before imports) ---

const mockSet = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockErrorSet = vi.fn().mockResolvedValue(undefined)

const MOCK_ASSESSMENT_ID = 'mock-assessment-doc-id'
const MOCK_ERROR_ID = 'mock-error-doc-id'

const mockAssessmentDocRef = { set: mockSet, id: MOCK_ASSESSMENT_ID }
const mockErrorDocRef = { set: mockErrorSet, id: MOCK_ERROR_ID }

// Tracks which subcollection was requested so tests can verify routing
const assessmentCollectionDoc = vi.fn(() => mockAssessmentDocRef)
const errorCollectionDoc = vi.fn(() => mockErrorDocRef)

const mockLeaseDoc = {
  collection: vi.fn((name: string) => ({
    doc: name === 'assessments' ? assessmentCollectionDoc : errorCollectionDoc,
  })),
  update: mockUpdate,
}
const mockLeasesCollection = { doc: vi.fn(() => mockLeaseDoc) }
const mockDb = { collection: vi.fn(() => mockLeasesCollection) }

vi.mock('firebase-admin', () => ({
  default: { apps: { length: 0 }, initializeApp: vi.fn() },
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}))

// Import after mocks are registered
import { writeAssessment, flagAssessmentError, ADVISORY_LABEL } from '../firestore.js'
import type { Assessment } from '../schema.js'

// ---

const sampleAssessment: Assessment = {
  items: [
    {
      description: 'Broken window',
      estimatedAmountUsdc: 150,
      severity: 'major',
      observedDifference: 'Window cracked at move-out',
    },
  ],
  totalEstimatedDamageUsd: 150,
  summary: 'One major damage item found.',
}

const sampleGeminiRaw = { raw: true }

describe('writeAssessment', () => {
  beforeEach(() => {
    mockSet.mockClear()
    mockUpdate.mockClear()
    assessmentCollectionDoc.mockClear()
  })

  it('sets all required fields on the assessment document', async () => {
    await writeAssessment('lease-123', sampleAssessment, sampleGeminiRaw, mockDb as never)

    expect(mockSet).toHaveBeenCalledOnce()
    const setArg = mockSet.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.geminiRaw).toEqual(sampleGeminiRaw)
    expect(setArg.items).toEqual(sampleAssessment.items)
    expect(setArg.totalEstimatedDamageUsd).toBe(150)
    expect(setArg.summary).toBe(sampleAssessment.summary)
    expect(setArg.advisoryLabel).toBe(ADVISORY_LABEL)
    expect(setArg.createdAt).toBe('SERVER_TS')
  })

  it('advances the lease status to "assessed"', async () => {
    await writeAssessment('lease-123', sampleAssessment, sampleGeminiRaw, mockDb as never)

    expect(mockUpdate).toHaveBeenCalledOnce()
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.status).toBe('assessed')
    expect(updateArg.assessedAt).toBe('SERVER_TS')
    expect(updateArg.latestAssessmentId).toBe(MOCK_ASSESSMENT_ID)
  })

  it('returns the new assessment document ID', async () => {
    const id = await writeAssessment('lease-123', sampleAssessment, sampleGeminiRaw, mockDb as never)
    expect(id).toBe(MOCK_ASSESSMENT_ID)
  })

  it('stores geminiRaw exactly as received (no transformation)', async () => {
    const raw = { nested: { value: 42 }, array: [1, 2, 3] }
    await writeAssessment('lease-456', sampleAssessment, raw, mockDb as never)
    const setArg = mockSet.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.geminiRaw).toStrictEqual(raw)
  })
})

describe('flagAssessmentError', () => {
  beforeEach(() => {
    mockErrorSet.mockClear()
    errorCollectionDoc.mockClear()
  })

  it('writes an error document with the correct fields', async () => {
    await flagAssessmentError('lease-789', 'gemini_call_failed', 'timeout error', mockDb as never)

    expect(mockErrorSet).toHaveBeenCalledOnce()
    const setArg = mockErrorSet.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.reason).toBe('gemini_call_failed')
    expect(setArg.detail).toBe('timeout error')
    expect(setArg.occurredAt).toBe('SERVER_TS')
  })

  it('truncates detail to 2000 characters to avoid oversized documents', async () => {
    const longDetail = 'x'.repeat(3000)
    await flagAssessmentError('lease-789', 'unparseable_response', longDetail, mockDb as never)
    const setArg = mockErrorSet.mock.calls[0][0] as Record<string, unknown>
    expect((setArg.detail as string).length).toBe(2000)
  })
})
