/**
 * Integration tests for Firestore security rules.
 *
 * Run with the Firestore emulator:
 *   firebase emulators:start --only firestore
 *   cd tests/firestore-rules && npm test
 *
 * The FIRESTORE_EMULATOR_HOST env var is set automatically when tests run
 * inside `firebase emulators:exec`. Set it manually for standalone runs:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setDoc, doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore'
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rulesPath = resolve(__dirname, '../../firestore.rules')

let testEnv: RulesTestEnvironment

// Wallet-verified user token (includes walletPubkey custom claim).
const withWallet = (uid: string, walletPubkey: string) => ({
  uid,
  walletPubkey,
})

// Authenticated user with no wallet claim.
const noWallet = (uid: string) => ({ uid })

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'uoo-quackathon26eug-8200',
    firestore: {
      rules: readFileSync(rulesPath, 'utf-8'),
      host: '127.0.0.1',
      port: 8081,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

// ---------------------------------------------------------------------------
// Helper: seed a lease document via admin bypass so tests can run rule checks.
// ---------------------------------------------------------------------------
async function seedLease(
  leaseId: string,
  landlordUid: string,
  tenantUid: string,
  extra: Record<string, unknown> = {},
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'leases', leaseId), {
      landlordUid,
      tenantUid,
      status: 'created',
      ...extra,
    })
  })
}

async function seedUser(uid: string, data: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data)
  })
}

// ---------------------------------------------------------------------------
// users/{uid}
// ---------------------------------------------------------------------------
describe('users/{uid}', () => {
  it('allows wallet-verified owner to create their own document', async () => {
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'WALLET_ABC')).firestore()
    await assertSucceeds(setDoc(doc(db, 'users', 'alice'), { walletPubkey: 'WALLET_ABC', walletVerifiedAt: new Date() }))
  })

  it('rejects unauthenticated writes', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'users', 'alice'), { walletPubkey: 'X' }))
  })

  it('rejects writes without walletPubkey claim', async () => {
    const db = testEnv.authenticatedContext('alice', noWallet('alice')).firestore()
    await assertFails(setDoc(doc(db, 'users', 'alice'), { name: 'Alice' }))
  })

  it('rejects writes to another user document', async () => {
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'WALLET_ABC')).firestore()
    await assertFails(setDoc(doc(db, 'users', 'bob'), { walletPubkey: 'X' }))
  })

  it('allows owner to read their own document', async () => {
    await seedUser('alice', { walletPubkey: 'ABC' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'ABC')).firestore()
    await assertSucceeds(getDoc(doc(db, 'users', 'alice')))
  })

  it('rejects reading another user document', async () => {
    await seedUser('bob', { walletPubkey: 'XYZ' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'ABC')).firestore()
    await assertFails(getDoc(doc(db, 'users', 'bob')))
  })

  it('rejects changing walletPubkey on update (write-once)', async () => {
    await seedUser('alice', { walletPubkey: 'ORIGINAL' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'ORIGINAL')).firestore()
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { walletPubkey: 'CHANGED' }))
  })

  it('allows updating non-protected fields', async () => {
    await seedUser('alice', { walletPubkey: 'ORIGINAL', displayName: 'Old' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'ORIGINAL')).firestore()
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { displayName: 'New' }))
  })
})

// ---------------------------------------------------------------------------
// leases/{leaseId}
// ---------------------------------------------------------------------------
describe('leases/{leaseId}', () => {
  it('allows a wallet-verified user to create a lease', async () => {
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertSucceeds(
      setDoc(doc(db, 'leases', 'lease1'), { landlordUid: 'alice', tenantUid: 'bob', status: 'created' }),
    )
  })

  it('rejects unauthenticated lease creation', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'leases', 'lease1'), { landlordUid: 'x', tenantUid: 'y', status: 'created' }))
  })

  it('rejects non-party from reading a lease', async () => {
    await seedLease('lease1', 'alice', 'bob')
    const db = testEnv.authenticatedContext('carol', withWallet('carol', 'W')).firestore()
    await assertFails(getDoc(doc(db, 'leases', 'lease1')))
  })

  it('allows parties to read their lease', async () => {
    await seedLease('lease1', 'alice', 'bob')
    const landlordDb = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    const tenantDb = testEnv.authenticatedContext('bob', withWallet('bob', 'W2')).firestore()
    await assertSucceeds(getDoc(doc(landlordDb, 'leases', 'lease1')))
    await assertSucceeds(getDoc(doc(tenantDb, 'leases', 'lease1')))
  })

  it('rejects updating contractHash once set (write-once)', async () => {
    await seedLease('lease1', 'alice', 'bob', { contractHash: 'HASH_ORIGINAL' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertFails(updateDoc(doc(db, 'leases', 'lease1'), { contractHash: 'HASH_NEW' }))
  })

  it('rejects updating moveInPhotoHash once set (write-once)', async () => {
    await seedLease('lease1', 'alice', 'bob', { moveInPhotoHash: 'PHOTO_HASH' })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertFails(updateDoc(doc(db, 'leases', 'lease1'), { moveInPhotoHash: 'NEW_HASH' }))
  })

  it('rejects updating tenantEstimate after sealing', async () => {
    await seedLease('lease1', 'alice', 'bob', { tenantEstimate: 500, tenantEstimateSealed: true })
    const db = testEnv.authenticatedContext('bob', withWallet('bob', 'W')).firestore()
    await assertFails(updateDoc(doc(db, 'leases', 'lease1'), { tenantEstimate: 999 }))
  })

  it('allows updating tenantEstimate before sealing', async () => {
    await seedLease('lease1', 'alice', 'bob', { tenantEstimate: 500, tenantEstimateSealed: false })
    const db = testEnv.authenticatedContext('bob', withWallet('bob', 'W')).firestore()
    await assertSucceeds(updateDoc(doc(db, 'leases', 'lease1'), { tenantEstimate: 600 }))
  })
})

// ---------------------------------------------------------------------------
// leases/{leaseId}/assessments/{assessmentId}
// ---------------------------------------------------------------------------
describe('leases/{leaseId}/assessments/{assessmentId}', () => {
  it('rejects changing geminiRaw after creation (write-once)', async () => {
    await seedLease('lease1', 'alice', 'bob')
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await addDoc(collection(ctx.firestore(), 'leases', 'lease1', 'assessments'), {
        geminiRaw: { items: [] },
        advisoryLabel: 'Estimate Only',
      })
    })
    // Fetch the generated doc ID
    let assessmentId = ''
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await ctx.firestore().collection('leases/lease1/assessments').get()
      assessmentId = snap.docs[0].id
    })

    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertFails(
      updateDoc(doc(db, 'leases', 'lease1', 'assessments', assessmentId), {
        geminiRaw: { items: ['tampered'] },
      }),
    )
  })

  it('allows a party to read assessments', async () => {
    await seedLease('lease1', 'alice', 'bob')
    let assessmentId = ''
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'leases', 'lease1', 'assessments'), {
        geminiRaw: {},
        advisoryLabel: 'Estimate Only',
      })
      assessmentId = ref.id
    })

    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertSucceeds(getDoc(doc(db, 'leases', 'lease1', 'assessments', assessmentId)))
  })

  it('rejects non-party from reading assessments', async () => {
    await seedLease('lease1', 'alice', 'bob')
    let assessmentId = ''
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'leases', 'lease1', 'assessments'), {
        geminiRaw: {},
      })
      assessmentId = ref.id
    })

    const db = testEnv.authenticatedContext('carol', withWallet('carol', 'W')).firestore()
    await assertFails(getDoc(doc(db, 'leases', 'lease1', 'assessments', assessmentId)))
  })
})

// ---------------------------------------------------------------------------
// voiceScripts/{scriptKey}
// ---------------------------------------------------------------------------
describe('voiceScripts/{scriptKey}', () => {
  it('allows any authenticated user to read voice scripts', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'voiceScripts', 'wallet_prompt'), { template: 'Please connect your wallet.' })
    })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertSucceeds(getDoc(doc(db, 'voiceScripts', 'wallet_prompt')))
  })

  it('rejects unauthenticated reads', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'voiceScripts', 'wallet_prompt'), { template: 'hello' })
    })
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'voiceScripts', 'wallet_prompt')))
  })

  it('rejects client writes to voice scripts', async () => {
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertFails(setDoc(doc(db, 'voiceScripts', 'new_script'), { template: 'test' }))
  })
})

// ---------------------------------------------------------------------------
// signingTokens/{token}
// ---------------------------------------------------------------------------
describe('signingTokens/{token}', () => {
  it('allows recipient to read their signing token', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'signingTokens', 'tok_abc'), {
        recipientUid: 'alice',
        leaseId: 'lease1',
        exp: Date.now() + 48 * 3600 * 1000,
      })
    })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertSucceeds(getDoc(doc(db, 'signingTokens', 'tok_abc')))
  })

  it('rejects non-recipient from reading a signing token', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'signingTokens', 'tok_abc'), {
        recipientUid: 'alice',
        leaseId: 'lease1',
      })
    })
    const db = testEnv.authenticatedContext('bob', withWallet('bob', 'W')).firestore()
    await assertFails(getDoc(doc(db, 'signingTokens', 'tok_abc')))
  })

  it('rejects updates to signing tokens (immutable)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'signingTokens', 'tok_abc'), {
        recipientUid: 'alice',
        used: false,
      })
    })
    const db = testEnv.authenticatedContext('alice', withWallet('alice', 'W')).firestore()
    await assertFails(updateDoc(doc(db, 'signingTokens', 'tok_abc'), { used: true }))
  })
})
