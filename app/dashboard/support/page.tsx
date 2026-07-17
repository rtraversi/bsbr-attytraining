import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SupportClient } from './_components/support-client'

export const metadata = {
  title: 'Support — AI Staff Compliance Training',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // The contact form's confirmation shows where the reply will go — the real
  // signed-in email, fetched server-side (never client-supplied).
  return <SupportClient userEmail={user.email ?? ''} />
}
