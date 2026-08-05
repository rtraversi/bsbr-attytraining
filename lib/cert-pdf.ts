import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import qrcode from 'qrcode-generator'
import { STACK_SANS_BOLD_B64, STACK_SANS_REGULAR_B64 } from './cert-fonts'
import { LOGO_B64 } from './cert-logo'

interface CertPdfOptions {
  employeeName: string
  employeeEmail: string
  firmName: string
  courseTitle: string
  certNumber: string
  /** Passing score, 0–100. `quiz_attempts.score` is a non-null int in that range. */
  score: number
  completedAt: Date
  expiresAt: Date
  /**
   * Absolute URL the QR code encodes — https://<app>/verify/<token>.
   *
   * Built by the caller, not here, because the token must be the SAME value
   * that lands in certificates.verification_token. Generating it in this
   * function would produce a PDF whose QR points at a certificate that was
   * never written under that token.
   */
  verifyUrl: string
}

// Monochrome for now, per Max — the teal/rose-gold brand treatment is not
// locked yet, so the certificate stays black and white rather than guessing.
// PAPER is pure white on purpose: the Iurix mark is white-matted with no
// alpha, so any off-white ground would show as a box around the logo.
const PAPER      = rgb(1, 1, 1)
const NEAR_BLACK = rgb(26  / 255, 26  / 255, 26  / 255)
const MID_GREY   = rgb(110 / 255, 110 / 255, 110 / 255)
const RULE_LINE  = rgb(214 / 255, 214 / 255, 214 / 255)

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
  // employeeEmail stays on the options but is no longer drawn — the redesign
  // identifies the recipient as "Name @ Firm" instead of by email address.
  const { employeeName, firmName, courseTitle, certNumber, score, completedAt, expiresAt, verifyUrl } = opts

  const doc  = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  // Landscape. The redesign is a wide certificate, not the old portrait sheet.
  const W = 792
  const H = 612
  const page = doc.addPage([W, H])

  // Stack Sans replaces the four StandardFonts embeds (Times/Helvetica). Two
  // weights carry the whole certificate: bold for headings and values, regular
  // for labels and body. subset:true keeps each PDF to the glyphs it uses.
  const bold    = await doc.embedFont(Buffer.from(STACK_SANS_BOLD_B64,    'base64'), { subset: true })
  const regular = await doc.embedFont(Buffer.from(STACK_SANS_REGULAR_B64, 'base64'), { subset: true })

  const M = 48 // page margin

  // ── Ground ───────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER })

  // One thin frame, nothing more. The design's decorative work — zigzag border,
  // circular seal, wave field, metallic treatment — is deliberately not built in
  // this pass; it is blocked on Rob's final art and Max's colour direction.
  page.drawRectangle({
    x: 24, y: 24, width: W - 48, height: H - 48,
    borderColor: NEAR_BLACK, borderWidth: 1, color: PAPER,
  })

  // ── Logo, top-left ───────────────────────────────────────────────────────────
  // The real Iurix mark (see lib/cert-logo.ts), no longer the placeholder.
  const logoBytes  = Buffer.from(LOGO_B64, 'base64')
  const logoImage  = await doc.embedJpg(logoBytes)
  const logoWidth  = 74
  const logoHeight = (logoWidth / logoImage.width) * logoImage.height
  const logoY      = H - M - logoHeight
  page.drawImage(logoImage, { x: M, y: logoY, width: logoWidth, height: logoHeight })

  // Wordmark beside the mark, optically centred against it. public/brand has no
  // wordmark asset — the logo is a mark only — so this is set in Stack Sans
  // rather than dropped in as art.
  const wordmark     = 'IURIX'
  const wordmarkSize = 22
  page.drawText(wordmark, {
    x: M + logoWidth + 14,
    y: logoY + logoHeight / 2 - wordmarkSize / 3,
    size: wordmarkSize,
    font: bold,
    color: NEAR_BLACK,
  })

  // ── Name @ Firm ──────────────────────────────────────────────────────────────
  const banner = `${employeeName} @ ${firmName}`
  const { size: bannerSize, width: bannerW } = fitText(banner, W - M * 2, 34, bold)
  const BANNER_Y = logoY - 58
  page.drawText(banner, {
    x: (W - bannerW) / 2, y: BANNER_Y, size: bannerSize, font: bold, color: NEAR_BLACK,
  })

  // ── Product headline ─────────────────────────────────────────────────────────
  const headline     = 'IURIX ACCREDITATION'
  const headlineSize = 15
  const headlineW    = bold.widthOfTextAtSize(headline, headlineSize)
  const HEADLINE_Y   = BANNER_Y - 34
  page.drawText(headline, {
    x: (W - headlineW) / 2, y: HEADLINE_Y, size: headlineSize, font: bold, color: NEAR_BLACK,
  })

  // ── Course + ABA rule line ───────────────────────────────────────────────────
  const { size: courseSize, width: courseW } = fitText(courseTitle, W - M * 2, 13, regular)
  page.drawText(courseTitle, {
    x: (W - courseW) / 2, y: HEADLINE_Y - 26, size: courseSize, font: regular, color: NEAR_BLACK,
  })

  const ruleNote  = 'demonstrating required competency in AI usage under ABA Model Rule 5.3'
  const ruleNoteW = regular.widthOfTextAtSize(ruleNote, 10)
  page.drawText(ruleNote, {
    x: (W - ruleNoteW) / 2, y: HEADLINE_Y - 46, size: 10, font: regular, color: MID_GREY,
  })

  // ── Score / Completed / Expires ──────────────────────────────────────────────
  const stats: Array<{ label: string; value: string }> = [
    { label: 'SCORE',        value: `${score}%` },
    { label: 'COMPLETED ON', value: formatDate(completedAt) },
    { label: 'EXPIRES',      value: formatDate(expiresAt) },
  ]

  const STATS_Y  = HEADLINE_Y - 108
  const colWidth = (W - M * 2) / stats.length

  stats.forEach(({ label, value }, i) => {
    const centre = M + colWidth * i + colWidth / 2
    const labelW = regular.widthOfTextAtSize(label, 8)
    page.drawText(label, {
      x: centre - labelW / 2, y: STATS_Y + 22, size: 8, font: regular, color: MID_GREY,
    })
    const { size: vSize, width: vW } = fitText(value, colWidth - 24, 15, bold)
    page.drawText(value, {
      x: centre - vW / 2, y: STATS_Y, size: vSize, font: bold, color: NEAR_BLACK,
    })
  })

  page.drawLine({
    start: { x: M, y: STATS_Y - 26 }, end: { x: W - M, y: STATS_Y - 26 },
    thickness: 0.5, color: RULE_LINE,
  })

  // ── Signature block, bottom-left ─────────────────────────────────────────────
  const SIG_Y = 132
  page.drawLine({
    start: { x: M, y: SIG_Y }, end: { x: M + 210, y: SIG_Y },
    thickness: 0.75, color: NEAR_BLACK,
  })
  page.drawText('Reviewed and signed by', {
    x: M, y: SIG_Y - 15, size: 9, font: regular, color: MID_GREY,
  })

  // ── Verification QR, bottom-right ────────────────────────────────────────────
  // Real code now, replacing the labelled placeholder box. Same 76pt footprint,
  // so the rest of the layout is untouched.
  //
  // Error correction 'M' (~15% recoverable): certificates get printed, scanned
  // from screens, photographed and faxed. 'L' is fragile on paper; 'H' would
  // push the module count up and each module below the size a phone camera
  // resolves reliably at 76pt.
  const QR  = 76
  const qrX = W - M - QR
  const qrY = SIG_Y - 15

  const qr = qrcode(0, 'M') // 0 = pick the smallest type that fits the URL
  qr.addData(verifyUrl)
  qr.make()

  // The quiet zone is part of the spec, not padding: without ~4 modules of
  // clear space many scanners will not find the symbol at all. It is drawn as
  // white paper here because the certificate ground is white anyway, but making
  // it explicit means the QR stays scannable if the ground ever changes.
  const QUIET = 4
  const modules = qr.getModuleCount()
  const cell = QR / (modules + QUIET * 2)
  const originX = qrX + cell * QUIET
  const originY = qrY + cell * QUIET

  page.drawRectangle({ x: qrX, y: qrY, width: QR, height: QR, color: PAPER })

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!qr.isDark(row, col)) continue
      page.drawRectangle({
        x: originX + col * cell,
        // pdf-lib's origin is bottom-left; QR rows count from the top, so the
        // row index has to be flipped or the code comes out mirrored
        // vertically — which still scans on some readers and not others, the
        // worst possible failure mode to debug.
        y: originY + (modules - 1 - row) * cell,
        width: cell,
        height: cell,
        color: NEAR_BLACK,
      })
    }
  }

  const qrCaption  = 'Scan to verify'
  const qrCaptionW = regular.widthOfTextAtSize(qrCaption, 7)
  page.drawText(qrCaption, {
    x: qrX + (QR - qrCaptionW) / 2, y: qrY - 11, size: 7, font: regular, color: MID_GREY,
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: M, y: 78 }, end: { x: W - M, y: 78 },
    thickness: 0.5, color: RULE_LINE,
  })

  page.drawText(`Certificate No: ${certNumber}`, {
    x: M, y: 60, size: 9, font: regular, color: MID_GREY,
  })

  // This read `accreditation@iurixaccreditation.com`, introduced in c0718aa as an
  // explicit PLACEHOLDER when the retired aistaffcompliance.com came off the cert.
  // It was put on iurix.com, a domain the project did not own, then f3db0c3 fixed
  // the domain and nobody revisited the local part — so a stopgap hardened into a
  // requirement, and it sat in the brief as a pre-launch blocker for a week.
  //
  // Resolved 2026-08-05 by deleting the requirement rather than satisfying it
  // (Max's call). `info@iurixaccreditation.com` exists as a Zoho alias and is
  // already the address on all three legal pages and behind the support form, so
  // this needs no second mailbox. Certificates now also carry a QR to /verify, so
  // the main reason anyone contacts us about one is self-service.
  //
  // ⚠️ Stored PDFs are never re-rendered. Whatever is printed here is permanent on
  // every certificate issued while it stands, so it must always be an address that
  // actually receives mail.
  const contact = 'info@iurixaccreditation.com'
  page.drawText(contact, {
    x: W - M - regular.widthOfTextAtSize(contact, 9), y: 60,
    size: 9, font: regular, color: MID_GREY,
  })

  // ── Disclaimer ───────────────────────────────────────────────────────────────
  // Existing real copy, repositioned only. New wording is Katy's call, and the
  // design mockup's disclaimer is a placeholder joke — explicitly not used.
  const disclaimer  = 'This certificate documents completion of training. It is not legal advice and does not constitute accreditation by the ABA or any state bar.'
  const disclaimerW = regular.widthOfTextAtSize(disclaimer, 7)
  page.drawText(disclaimer, {
    x: (W - disclaimerW) / 2, y: 42, size: 7, font: regular, color: RULE_LINE,
  })

  return doc.save()
}
