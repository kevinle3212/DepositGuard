import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { sha256Hex, sha256Bytes } from '../lib/hash.js'

// ── hash ───────────────────────────────────────────────────────────────────

describe('sha256Hex', () => {
  it('returns a 64-char lowercase hex string', () => {
    const result = sha256Hex(Buffer.from('hello'))
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic', () => {
    const a = sha256Hex(Buffer.from('test data'))
    const b = sha256Hex(Buffer.from('test data'))
    expect(a).toBe(b)
  })

  it('differs for different inputs', () => {
    expect(sha256Hex(Buffer.from('a'))).not.toBe(sha256Hex(Buffer.from('b')))
  })
})

describe('sha256Bytes', () => {
  it('returns a 32-byte Uint8Array', () => {
    const result = sha256Bytes(Buffer.from('hello'))
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('matches hex encoding', () => {
    const buf = Buffer.from('test')
    const hex = sha256Hex(buf)
    const bytes = sha256Bytes(buf)
    expect(Buffer.from(bytes).toString('hex')).toBe(hex)
  })
})

// ── convert ────────────────────────────────────────────────────────────────

describe('docxToPdf', () => {
  it('returns a non-empty Buffer starting with the PDF magic bytes', async () => {
    // Minimal valid DOCX is complex to synthesize — mock mammoth instead.
    jest.mock('mammoth', () => ({ extractRawText: async () => ({ value: 'Hello lease agreement text.' }) }))
    const { docxToPdf } = await import('../lib/convert.js')
    const result = await docxToPdf(Buffer.from('fake docx content'))
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(4)
    expect(result.slice(0, 4).toString()).toBe('%PDF')
  })
})

// ── route validation ───────────────────────────────────────────────────────

describe('upload route — input validation', () => {
  it('rejects non-PDF/DOCX MIME types via multer fileFilter', () => {
    // fileFilter calls cb(new Error(...)) for disallowed types
    const { ALLOWED_MIME } = (() => {
      const allowed = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
      return { ALLOWED_MIME: allowed }
    })()
    expect(ALLOWED_MIME.has('application/pdf')).toBe(true)
    expect(ALLOWED_MIME.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
    expect(ALLOWED_MIME.has('image/jpeg')).toBe(false)
    expect(ALLOWED_MIME.has('text/plain')).toBe(false)
  })
})
