import mammoth from 'mammoth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function docxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const { value: html } = await mammoth.extractRawText({ buffer: docxBuffer })
  const text = html.replace(/\s+/g, ' ').trim()

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 11
  const lineHeight = fontSize * 1.4
  const margin = 50
  const pageWidth = 612
  const pageHeight = 792
  const usableWidth = pageWidth - margin * 2

  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const width = font.widthOfTextAtSize(candidate, fontSize)
    if (width > usableWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight)
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    const chunk = lines.slice(i, i + linesPerPage)
    let y = pageHeight - margin
    for (const line of chunk) {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
      y -= lineHeight
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([pageWidth, pageHeight])

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}
