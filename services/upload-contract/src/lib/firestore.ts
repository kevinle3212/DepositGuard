import admin from 'firebase-admin'

function db(): admin.firestore.Firestore {
  if (!admin.apps.length) admin.initializeApp()
  return admin.firestore()
}

export interface ContractRecord {
  contractHash: string
  storageUrl: string
  uploadedBy: string
  timestamp: admin.firestore.FieldValue
  version: number
}

export async function writeContractRecord(leaseId: string, record: Omit<ContractRecord, 'timestamp'>): Promise<void> {
  const firestore = db()
  const ts = admin.firestore.FieldValue.serverTimestamp()

  // Write to lease document (top-level fields overwritten on re-upload)
  await firestore.doc(`leases/${leaseId}`).set(
    { contractHash: record.contractHash, contractStorageUrl: record.storageUrl, contractUploadedBy: record.uploadedBy, contractUploadedAt: ts },
    { merge: true },
  )

  // Version-stamped sub-document (write-once — enforced by Firestore rules in §7)
  await firestore.doc(`leases/${leaseId}/contracts/v${record.version}`).create({
    contractHash: record.contractHash,
    storageUrl: record.storageUrl,
    uploadedBy: record.uploadedBy,
    timestamp: ts,
    version: record.version,
  })
}
