import admin from 'firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'
import type { Assessment } from './schema.js'

export const ADVISORY_LABEL = 'Estimate Only – Not Legally Binding'

function ensureFirebaseInit(): void {
  if (!admin.apps.length) admin.initializeApp()
}

/**
 * Persists a successful assessment:
 * - Writes geminiRaw (immutable, never overwritten — enforced in Firestore security rules §7)
 * - Sets advisoryLabel on the assessment document
 * - Advances the lease status to 'assessed'
 *
 * Returns the new assessment document ID.
 */
export async function writeAssessment(
  leaseId: string,
  assessment: Assessment,
  geminiRaw: unknown,
  _db?: Firestore,
): Promise<string> {
  ensureFirebaseInit()
  const db = _db ?? getFirestore()

  const leaseRef = db.collection('leases').doc(leaseId)
  const assessmentRef = leaseRef.collection('assessments').doc()

  await assessmentRef.set({
    geminiRaw,
    items: assessment.items,
    totalEstimatedDamageUsd: assessment.totalEstimatedDamageUsd,
    summary: assessment.summary,
    advisoryLabel: ADVISORY_LABEL,
    createdAt: FieldValue.serverTimestamp(),
  })

  await leaseRef.update({
    status: 'assessed',
    assessedAt: FieldValue.serverTimestamp(),
    latestAssessmentId: assessmentRef.id,
  })

  return assessmentRef.id
}

/**
 * Flags a failed or unparseable assessment without writing partial data.
 * Both parties can be notified by a downstream listener on this document.
 */
export async function flagAssessmentError(
  leaseId: string,
  reason: 'gemini_call_failed' | 'unparseable_response',
  detail: string,
  _db?: Firestore,
): Promise<void> {
  ensureFirebaseInit()
  const db = _db ?? getFirestore()

  await db
    .collection('leases')
    .doc(leaseId)
    .collection('assessmentErrors')
    .doc()
    .set({
      reason,
      detail: detail.slice(0, 2000), // cap to avoid oversized docs
      occurredAt: FieldValue.serverTimestamp(),
    })
}
