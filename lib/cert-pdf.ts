import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface CertPdfOptions {
  employeeEmail: string
  firmName: string
  courseTitle: string
  certNumber: string
  completedAt: Date
  expiresAt: Date
}

const CREAM      = rgb(250 / 255, 250 / 255, 248 / 255)
const NEAR_BLACK = rgb(26  / 255, 26  / 255, 26  / 255)
const AMBER      = rgb(200 / 255, 120 / 255, 58  / 255)
const MID_GREY   = rgb(110 / 255, 110 / 255, 110 / 255)
const RULE_LINE  = rgb(220 / 255, 215 / 255, 205 / 255)

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fitText(text: string, maxWidth: number, preferredSize: number, font: { widthOfTextAtSize: (t: string, s: number) => number }) {
  const size = font.widthOfTextAtSize(text, preferredSize) > maxWidth
    ? preferredSize * (maxWidth / font.widthOfTextAtSize(text, preferredSize))
    : preferredSize
  return { size: Math.max(size, 8), width: font.widthOfTextAtSize(text, size) }
}

export async function generateCertPdf(opts: CertPdfOptions): Promise<Uint8Array> {
  const { employeeEmail, firmName, courseTitle, certNumber, completedAt, expiresAt } = opts

  const doc  = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const W = 612
  const H = 792

  const serif     = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBoldItalic)
  const sans      = await doc.embedFont(StandardFonts.Helvetica)
  const sansBold  = await doc.embedFont(StandardFonts.HelveticaBold)

  // ── Background ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })

  // ── Double border ────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 24, y: 24, width: W - 48, height: H - 48,
    borderColor: AMBER, borderWidth: 2, color: CREAM,
  })
  page.drawRectangle({
    x: 32, y: 32, width: W - 64, height: H - 64,
    borderColor: NEAR_BLACK, borderWidth: 0.5, color: CREAM,
  })

  // ── Header bar ───────────────────────────────────────────────────────────────
  const HEADER_H = 68
  const HEADER_Y = H - 32 - HEADER_H           // top of inner border = H-32; bar sits flush at top
  page.drawRectangle({
    x: 32, y: HEADER_Y, width: W - 64, height: HEADER_H, color: NEAR_BLACK,
  })

  const headerLabel = 'AI Staff Compliance Training'
  const headerLabelSize = 14
  const headerLabelW = sansBold.widthOfTextAtSize(headerLabel, headerLabelSize)
  page.drawText(headerLabel, {
    x: (W - headerLabelW) / 2,
    y: HEADER_Y + 26,
    size: headerLabelSize,
    font: sansBold,
    color: CREAM,
  })

  const brandLabel = 'BUILT SMART BY ROB'
  const brandLabelSize = 8
  const brandLabelW = sans.widthOfTextAtSize(brandLabel, brandLabelSize)
  page.drawText(brandLabel, {
    x: (W - brandLabelW) / 2,
    y: HEADER_Y + 10,
    size: brandLabelSize,
    font: sans,
    color: AMBER,
  })

  // ── Title ────────────────────────────────────────────────────────────────────
  const titleText = 'Certificate of Completion'
  const titleSize = 28
  const titleW = serifBold.widthOfTextAtSize(titleText, titleSize)
  const TITLE_Y = HEADER_Y - 72
  page.drawText(titleText, {
    x: (W - titleW) / 2,
    y: TITLE_Y,
    size: titleSize,
    font: serifBold,
    color: NEAR_BLACK,
  })

  // Amber rule under title
  page.drawLine({
    start: { x: W / 2 - 100, y: TITLE_Y - 14 },
    end:   { x: W / 2 + 100, y: TITLE_Y - 14 },
    thickness: 1.5,
    color: AMBER,
  })

  // ── "This certifies that" ────────────────────────────────────────────────────
  const certifiesText = 'This certifies that'
  const certifiesW = serif.widthOfTextAtSize(certifiesText, 12)
  page.drawText(certifiesText, {
    x: (W - certifiesW) / 2,
    y: TITLE_Y - 60,
    size: 12,
    font: serif,
    color: MID_GREY,
  })

  // ── Employee name / email ────────────────────────────────────────────────────
  const { size: nameSize, width: nameW } = fitText(employeeEmail, 480, 20, serifBold)
  page.drawText(employeeEmail, {
    x: (W - nameW) / 2,
    y: TITLE_Y - 96,
    size: nameSize,
    font: serifBold,
    color: NEAR_BLACK,
  })

  // ── "has successfully completed" ─────────────────────────────────────────────
  const completedText = 'has successfully completed'
  const completedW = serif.widthOfTextAtSize(completedText, 12)
  page.drawText(completedText, {
    x: (W - completedW) / 2,
    y: TITLE_Y - 136,
    size: 12,
    font: serif,
    color: MID_GREY,
  })

  // ── Course title ─────────────────────────────────────────────────────────────
  const { size: courseSize, width: courseW } = fitText(courseTitle, 480, 15, serifBold)
  page.drawText(courseTitle, {
    x: (W - courseW) / 2,
    y: TITLE_Y - 168,
    size: courseSize,
    font: serifBold,
    color: NEAR_BLACK,
  })

  // ── ABA Rule note ────────────────────────────────────────────────────────────
  const ruleNote = 'demonstrating required competency in AI usage under ABA Model Rule 5.3'
  const ruleNoteW = serif.widthOfTextAtSize(ruleNote, 10)
  page.drawText(ruleNote, {
    x: (W - ruleNoteW) / 2,
    y: TITLE_Y - 196,
    size: 10,
    font: serif,
    color: MID_GREY,
  })

  // ── Details block ────────────────────────────────────────────────────────────
  const DETAILS_Y = TITLE_Y - 258
  const LABEL_X   = 80
  const VALUE_X   = 190

  const details: Array<{ label: string; value: string; valueColor?: ReturnType<typeof rgb> }> = [
    { label: 'Issued for:',       value: firmName },
    { label: 'Completion Date:',  value: formatDate(completedAt) },
    { label: 'Valid Until:',      value: formatDate(expiresAt), valueColor: AMBER },
  ]

  details.forEach(({ label, value, valueColor }, i) => {
    const y = DETAILS_Y - i * 26
    page.drawText(label, { x: LABEL_X, y, size: 10, font: sans, color: MID_GREY })
    const { size: vSize } = fitText(value, 320, 11, sansBold)
    page.drawText(value, { x: VALUE_X, y, size: vSize, font: sansBold, color: valueColor ?? NEAR_BLACK })
  })

  // ── Signature line ───────────────────────────────────────────────────────────
  const SIG_Y = DETAILS_Y - 120
  page.drawLine({
    start: { x: LABEL_X, y: SIG_Y },
    end:   { x: LABEL_X + 180, y: SIG_Y },
    thickness: 0.75,
    color: NEAR_BLACK,
  })
  page.drawText('Authorized by Built Smart by Rob', {
    x: LABEL_X,
    y: SIG_Y - 15,
    size: 9,
    font: sans,
    color: MID_GREY,
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: 60, y: 84 }, end: { x: W - 60, y: 84 },
    thickness: 0.5,
    color: RULE_LINE,
  })

  page.drawText(`Certificate No: ${certNumber}`, {
    x: 60, y: 64,
    size: 9, font: sans, color: MID_GREY,
  })

  const domain = 'aistaffcompliance.com'
  page.drawText(domain, {
    x: W - 60 - sans.widthOfTextAtSize(domain, 9),
    y: 64,
    size: 9, font: sans, color: MID_GREY,
  })

  return doc.save()
}
