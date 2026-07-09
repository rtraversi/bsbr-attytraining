import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { error } = await createAdminClient()
      .from('courses')
      .select('id', { head: true, count: 'exact' })

    if (error) {
      console.error('[health] db check failed', error)
      return Response.json(
        { status: 'degraded', db: 'error', timestamp: new Date().toISOString() },
        { status: 503 }
      )
    }

    return Response.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[health] db check failed', err)
    return Response.json(
      { status: 'degraded', db: 'error', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
