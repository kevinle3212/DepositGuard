import admin from 'firebase-admin'

export interface ExpiredLease {
  leaseId: string
  deadlineTs: number
  status: string
  tenantTokenAccount: string
  tokenMint: string
  landlordEmail: string
  tenantEmail: string
}

function db(): admin.firestore.Firestore {
  if (!admin.apps.length) admin.initializeApp()
  return admin.firestore()
}

const TRIGGERABLE_STATUSES = ['Active', 'Assessed', 'Disputed'] as const

export async function queryExpiredLeases(): Promise<ExpiredLease[]> {
  const firestore = db()
  const nowSecs = Math.floor(Date.now() / 1000)

  const snap = await firestore
    .collection('leases')
    .where('status', 'in', TRIGGERABLE_STATUSES)
    .where('deadlineTs', '<=', nowSecs)
    .get()

  return snap.docs
    .map((doc) => {
      const d = doc.data()
      if (!d.tenantTokenAccount || !d.tokenMint) return null
      return {
        leaseId: doc.id,
        deadlineTs: d.deadlineTs as number,
        status: d.status as string,
        tenantTokenAccount: d.tenantTokenAccount as string,
        tokenMint: d.tokenMint as string,
        landlordEmail: (d.landlordEmail as string) ?? '',
        tenantEmail: (d.tenantEmail as string) ?? '',
      }
    })
    .filter((l): l is ExpiredLease => l !== null)
}

export async function markLeaseReleased(leaseId: string): Promise<void> {
  const firestore = db()
  await firestore.doc(`leases/${leaseId}`).update({
    status: 'Released',
    timeoutExecutedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}
