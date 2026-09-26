// Server-only: uses the service-role client. Never import from a Client Component.
//
// The bottom of the funnel, read straight from Supabase — the authority for
// everything after payment. Pairs with lib/analytics/query.ts (the top of the
// funnel, from Analytics Engine) on /ops/metrics.
//
// Volumes are small enough to fetch the rows and count in JS; revisit with SQL
// aggregates if any of these tables reaches the tens of thousands.

import { createAdminClient } from "@/lib/supabase/admin";

export type BusinessReport = {
  firms: { active: number; paymentFailed: number; cancelled: number; newInRange: number };
  seatsPurchased: number;
  staff: { invited: number; activated: number };
  policy: { intakeStarted: number; intakeSubmitted: number; policyDelivered: number };
  training: { enrolled: number; completed: number; certificatesIssued: number; certificatesInRange: number };
  renewalsDue: { name: string; periodEnd: string; seats: number }[];
};

export async function businessReport(days: number): Promise<BusinessReport> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const soon = new Date(Date.now() + 60 * 86_400_000).toISOString();

  const [firms, members, intakes, enrollments, certs] = await Promise.all([
    supabase.from("firms").select("name, status, created_at, current_period_end, max_seats").limit(10_000),
    supabase.from("firm_members").select("role, status, activated_at").limit(10_000),
    supabase.from("intake_sessions").select("submitted_at, policy_delivered_at").limit(10_000),
    supabase.from("enrollments").select("status, completed_at").limit(10_000),
    supabase.from("certificates").select("issued_at, revoked_at").limit(10_000),
  ]);
  for (const r of [firms, members, intakes, enrollments, certs]) {
    if (r.error) throw new Error(`[ops/metrics] ${r.error.message}`);
  }

  const firmRows = firms.data ?? [];
  const active = firmRows.filter((f) => f.status === "active");
  // Staff = everyone the firm invited, not the purchasing admin.
  const staff = (members.data ?? []).filter((m) => m.role !== "admin");
  const liveCerts = (certs.data ?? []).filter((c) => !c.revoked_at);

  return {
    firms: {
      active: active.length,
      paymentFailed: firmRows.filter((f) => f.status === "payment_failed").length,
      cancelled: firmRows.filter((f) => f.status === "cancelled").length,
      newInRange: firmRows.filter((f) => f.created_at >= since).length,
    },
    seatsPurchased: active.reduce((sum, f) => sum + (f.max_seats ?? 0), 0),
    staff: {
      invited: staff.length,
      activated: staff.filter((m) => m.activated_at).length,
    },
    policy: {
      intakeStarted: (intakes.data ?? []).length,
      intakeSubmitted: (intakes.data ?? []).filter((i) => i.submitted_at).length,
      policyDelivered: (intakes.data ?? []).filter((i) => i.policy_delivered_at).length,
    },
    training: {
      enrolled: (enrollments.data ?? []).length,
      completed: (enrollments.data ?? []).filter((e) => e.completed_at).length,
      certificatesIssued: liveCerts.length,
      certificatesInRange: liveCerts.filter((c) => c.issued_at >= since).length,
    },
    renewalsDue: active
      .filter((f) => f.current_period_end && f.current_period_end <= soon)
      .sort((a, b) => (a.current_period_end ?? "").localeCompare(b.current_period_end ?? ""))
      .map((f) => ({ name: f.name || "(unnamed firm)", periodEnd: f.current_period_end!, seats: f.max_seats ?? 0 })),
  };
}
