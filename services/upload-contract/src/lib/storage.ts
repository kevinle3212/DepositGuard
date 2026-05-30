import { Storage } from '@google-cloud/storage'

const storage = new Storage()
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET ?? '')

export async function getNextVersion(leaseId: string): Promise<number> {
  const [files] = await bucket.getFiles({ prefix: `contracts/${leaseId}/lease-v` })
  return files.length + 1
}

export async function uploadContractPdf(
  leaseId: string,
  pdfBytes: Buffer,
  version: number,
): Promise<string> {
  const path = `contracts/${leaseId}/lease-v${version}.pdf`
  const file = bucket.file(path)

  await file.save(pdfBytes, {
    metadata: {
      contentType: 'application/pdf',
      // Immutable after upload — enforced by Storage WORM policy configured in §7.
      cacheControl: 'private, max-age=0',
    },
  })

  return `gs://${bucket.name}/${path}`
}
