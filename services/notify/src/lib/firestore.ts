import admin from 'firebase-admin'
import type { EmailTemplate } from './templates.js'

function db(): admin.firestore.Firestore {
  if (!admin.apps.length) admin.initializeApp()
  return admin.firestore()
}

export async function queueEmail(
  recipients: string[],
  template: EmailTemplate,
): Promise<string> {
  const firestore = db()
  const ref = await firestore.collection('mail').add({
    to: recipients,
    message: {
      subject: template.subject,
      text: template.text,
      html: template.html,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  return ref.id
}
