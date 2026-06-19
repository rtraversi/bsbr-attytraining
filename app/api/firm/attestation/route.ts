import { NextResponse } from 'next/server'
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let s = text
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxWidth) {
    s = s.slice(0, -1)
  }
  return s + '…'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const admin = createAdminClient()

  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Unknown Firm'

  const now = new Date()

  // Active certificates only — expires_at in the future
  const { data: certs } = await admin
    .from('certificates')
    .select('id, user_id, issued_at, expires_at')
    .eq('firm_id', firmId)
    .gt('expires_at', now.toISOString())
    .order('issued_at')

  const activeCerts = certs ?? []

  // Resolve names in parallel — same pattern as dashboard page
  const authUsers = await Promise.all(
    activeCerts.map(c => admin.auth.admin.getUserById(c.user_id))
  )

  const rows = activeCerts.map((cert, i) => {
    const u = authUsers[i].data?.user
    const name = (u?.user_metadata?.full_name as string | undefined) || u?.email || '(unknown)'
    return {
      name,
      certId: cert.id,
      issuedAt: cert.issued_at,
      expiresAt: cert.expires_at,
    }
  })

  // ── PDF ──────────────────────────────────────────────────────────────────────
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792]) // US letter

  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const DARK  = rgb(0.10, 0.10, 0.10)
  const GREY  = rgb(0.40, 0.40, 0.40)
  const LIGHT = rgb(0.75, 0.75, 0.75)

  const ML = 60   // left margin
  const MR = 552  // right margin (60 right margin)
  const CW = MR - ML

  let y = 732

  // Firm name
  page.drawText(firmName, { x: ML, y, font: bold, size: 16, color: DARK })
  y -= 22

  // Subtitle
  page.drawText('AI Compliance Training — Staff Certification Attestation', {
    x: ML, y, font: regular, size: 11, color: GREY,
  })
  y -= 14

  // Divider below header
  page.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 0.5, color: LIGHT })
  y -= 14

  // As-of date
  const asOfDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  page.drawText(`As of ${asOfDate}`, { x: ML, y, font: regular, size: 9, color: GREY })
  y -= 28

  if (rows.length === 0) {
    page.drawText('No staff currently hold active certification.', {
      x: ML, y, font: regular, size: 10, color: DARK,
    })
  } else {
    // Column x-positions
    const COL_NAME = ML        // width ≈ 185
    const COL_CERT = 252       // cert ID (first 8 chars); width ≈ 85
    const COL_ISS  = 345       // issue date; width ≈ 100
    const COL_EXP  = 450       // expiry date; to MR = 102

    // Column headers
    for (const [label, x] of [
      ['Staff Member',   COL_NAME],
      ['Certificate ID', COL_CERT],
      ['Issue Date',     COL_ISS],
      ['Expiry Date',    COL_EXP],
    ] as [string, number][]) {
      page.drawText(label, { x, y, font: bold, size: 8, color: GREY })
    }
    y -= 5

    // Header underline
    page.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 0.5, color: LIGHT })
    y -= 14

    for (const row of rows) {
      if (y < 100) break // safety guard — not reachable at 1-15 staff

      const certDisplay = row.certId.length > 8 ? row.certId.slice(0, 8) + '…' : row.certId
      const nameDisplay = truncate(row.name, regular, 9, COL_CERT - COL_NAME - 8)

      page.drawText(nameDisplay,          { x: COL_NAME, y, font: regular, size: 9, color: DARK })
      page.drawText(certDisplay,          { x: COL_CERT, y, font: regular, size: 9, color: DARK })
      page.drawText(fmtDate(row.issuedAt),{ x: COL_ISS,  y, font: regular, size: 9, color: DARK })
      page.drawText(fmtDate(row.expiresAt),{ x: COL_EXP, y, font: regular, size: 9, color: DARK })

      y -= 18
    }

    // Bottom table line
    page.drawLine({ start: { x: ML, y: y + 8 }, end: { x: MR, y: y + 8 }, thickness: 0.5, color: LIGHT })
  }

  // Footer
  const FOOTER_Y = 58
  page.drawLine({
    start: { x: ML, y: FOOTER_Y + 20 },
    end:   { x: MR, y: FOOTER_Y + 20 },
    thickness: 0.5,
    color: LIGHT,
  })
  page.drawText(
    'This document confirms completion of training. It is not legal advice and does not constitute accreditation by the ABA or any state bar.',
    { x: ML, y: FOOTER_Y, font: regular, size: 7.5, color: GREY, maxWidth: CW, lineHeight: 11 }
  )

  const pdfBytes = await doc.save()
  const dateStr  = now.toISOString().split('T')[0]

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attestation-${firmId}-${dateStr}.pdf"`,
    },
  })
}
