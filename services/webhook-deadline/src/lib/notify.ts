import admin from 'firebase-admin'

function db(): admin.firestore.Firestore {
  if (!admin.apps.length) admin.initializeApp()
  return admin.firestore()
}

export async function notifyTimeoutExecuted(
  leaseId: string,
  landlordEmail: string,
  tenantEmail: string,
  txSignature: string,
): Promise<void> {
  const firestore = db()
  const recipients = [landlordEmail, tenantEmail].filter(Boolean)
  if (recipients.length === 0) return

  await firestore.collection('mail').add({
    to: recipients,
    message: {
      subject: 'DepositGuard: Deposit Released — Deadline Passed',
      text: [
        `Lease ID: ${leaseId}`,
        '',
        'The review deadline has passed without a mutual agreement.',
        'The full deposit has been automatically released to the tenant.',
        '',
        `Transaction: https://solscan.io/tx/${txSignature}?cluster=devnet`,
      ].join('\n'),
      html: `
        <h2>Deposit Released — Deadline Passed</h2>
        <p>The review deadline for lease <strong>${leaseId}</strong> has passed
        without a mutual agreement.</p>
        <p>The full deposit has been automatically released to the tenant.</p>
        <p><a href="https://solscan.io/tx/${txSignature}?cluster=devnet">
          View transaction on Solscan
        </a></p>
      `,
    },
  })
}
