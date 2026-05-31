import express from 'express'
import request from 'supertest'
import nacl from 'tweetnacl'
// bs58 v4 ships no type declarations; use a typed require to keep strict-mode happy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bs58 = require('bs58') as { encode(b: Buffer): string; decode(s: string): Buffer }
import * as nonceStore from '../nonce'

jest.mock('firebase-admin', () => ({
  apps: [] as unknown[],
  initializeApp: jest.fn(),
  auth: jest.fn(() => ({
    createCustomToken: jest.fn(() => Promise.resolve('fake-custom-token')),
  })),
}))

// Import router after mock is hoisted.
import { verifyRouter } from './verify'

const app = express()
app.use(express.json())
app.use('/verify', verifyRouter)

const MSG_PREFIX = 'NestCrow identity verification '

function makeKeypair() {
  return nacl.sign.keyPair()
}

function pubkeyB58(kp: nacl.SignKeyPair): string {
  return bs58.encode(Buffer.from(kp.publicKey))
}

function sign(kp: nacl.SignKeyPair, message: string): string {
  const msgBytes = new TextEncoder().encode(message)
  return Buffer.from(nacl.sign.detached(msgBytes, kp.secretKey)).toString('base64')
}

describe('POST /verify', () => {
  it('accepts a valid Solana signature', async () => {
    const kp = makeKeypair()
    const pubkey = pubkeyB58(kp)
    const nonce = nonceStore.issue(pubkey)
    const message = `${MSG_PREFIX}${nonce}`

    const res = await request(app)
      .post('/verify')
      .send({ pubkey, signature: sign(kp, message), message, chain: 'solana' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('customToken', 'fake-custom-token')
    expect(res.body).toHaveProperty('pubkey', pubkey)
  })

  it('rejects an invalid signature', async () => {
    const kp = makeKeypair()
    const pubkey = pubkeyB58(kp)
    const nonce = nonceStore.issue(pubkey)
    const message = `${MSG_PREFIX}${nonce}`
    const badSig = Buffer.alloc(64).toString('base64')

    const res = await request(app)
      .post('/verify')
      .send({ pubkey, signature: badSig, message, chain: 'solana' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('rejects a missing nonce (nonce never issued for this pubkey)', async () => {
    const kp = makeKeypair()
    const pubkey = pubkeyB58(kp)
    const fakeNonce = 'deadbeef00000000deadbeef00000000'
    const message = `${MSG_PREFIX}${fakeNonce}`

    const res = await request(app)
      .post('/verify')
      .send({ pubkey, signature: sign(kp, message), message, chain: 'solana' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/nonce/i)
  })

  it('rejects an expired nonce', async () => {
    const kp = makeKeypair()
    const pubkey = pubkeyB58(kp)
    const base = Date.now()
    const spy = jest.spyOn(Date, 'now').mockReturnValue(base)
    const nonce = nonceStore.issue(pubkey)
    spy.mockReturnValue(base + 6 * 60 * 1000) // past the 5-min TTL
    const message = `${MSG_PREFIX}${nonce}`

    const res = await request(app)
      .post('/verify')
      .send({ pubkey, signature: sign(kp, message), message, chain: 'solana' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/nonce/i)
    spy.mockRestore()
  })

  it('rejects a request with a malformed body', async () => {
    const res = await request(app)
      .post('/verify')
      .send({ pubkey: 'x', signature: 'y' }) // missing message and chain

    expect(res.status).toBe(400)
  })
})
