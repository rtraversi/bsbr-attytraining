import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsNotConfigured, trafficReport, type TrafficReport } from "@/lib/analytics/query";
import { businessReport, type BusinessReport } from "@/lib/analytics/business";

// Operator-only metrics. Guarded by HTTP Basic auth in middleware.ts (the
// METRICS_DASHBOARD_PASSWORD secret) — there is no operator role in Supabase,
// and firm admins must never reach this page.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Metrics | Iurix",
  robots: { index: false, follow: false },
};

const RANGES = [7, 30, 90] as const;

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pct(part: number, whole: number) {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = RANGES.find((r) => String(r) === raw) ?? 30;

  const [traffic, business] = await Promise.all([
    trafficReport(days).then(
      (r) => ({ ok: true as const, r }),
      (e: unknown) => ({
        ok: false as const,
        message:
          e instanceof AnalyticsNotConfigured
            ? "Cloudflare analytics isn't configured on this deployment (CF_ACCOUNT_ID / CF_ANALYTICS_TOKEN)."
            : `Couldn't load Cloudflare analytics: ${e instanceof Error ? e.message : String(e)}`,
      }),
    ),
    businessReport(days).then(
      (r) => ({ ok: true as const, r }),
      (e: unknown) => ({ ok: false as const, message: e instanceof Error ? e.message : String(e) }),
    ),
  ]);

  return (
    <div className="min-h-screen bg-marble text-ink">
      <main className="mx-auto max-w-[1140px] px-4 py-10 md:px-8 md:py-14">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">Operator</p>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-normal leading-tight">Metrics</h1>
          </div>
          <nav className="flex gap-1 rounded-lg bg-marble-deep p-1 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/ops/metrics?days=${r}`}
                className={`rounded-md px-3 py-1.5 ${r === days ? "bg-white font-semibold shadow-sm" : "text-ink-mute hover:text-ink"}`}
              >
                {r} days
              </Link>
            ))}
          </nav>
        </header>

        <Section title="Website funnel" note={`Last ${days} days · page views, not unique people`}>
          {traffic.ok ? <TrafficFunnel t={traffic.r} /> : <Problem>{traffic.message}</Problem>}
        </Section>

        <Section title="After payment" note="All time, from the database, except where marked">
          {business.ok ? <BusinessFunnel b={business.r} days={days} /> : <Problem>{business.message}</Problem>}
        </Section>

        {traffic.ok && (
          <>
            <Section title="Where buyers come from" note="Credited to the last campaign link or referring site before checkout">
              <SourcesTable rows={traffic.r.sources} />
            </Section>

            <Section title="Daily activity">
              <DailyTable rows={traffic.r.daily} />
            </Section>

            <div className="grid gap-8 md:grid-cols-2">
              <Section title="Referring sites">
                <SimpleTable head={["Site", "Views"]} rows={traffic.r.referrers.map((r) => [r.referrer, r.views])} />
              </Section>
              <Section title="Countries">
                <SimpleTable head={["Country", "Views"]} rows={traffic.r.countries.map((r) => [r.country, r.views])} />
              </Section>
            </div>
          </>
        )}

        {business.ok && (
          <Section title="Renewals due" note="Active firms renewing in the next 60 days">
            <SimpleTable
              head={["Firm", "Renews", "Seats"]}
              rows={business.r.renewalsDue.map((f) => [f.name, f.periodEnd.slice(0, 10), f.seats])}
            />
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[20px] font-normal">{title}</h2>
        {note && <p className="text-xs text-ink-mute">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-gold-pale/50 px-4 py-3 text-sm text-gold-deep">{children}</p>;
}

function Steps({ steps }: { steps: { label: string; value: number | string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {steps.map((s) => (
        <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-ink-mute">{s.label}</p>
          <p className="mt-1 font-display text-[28px] leading-none tabular-nums">{s.value}</p>
          {s.sub && <p className="mt-2 text-xs text-teal-mid">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function TrafficFunnel({ t }: { t: TrafficReport }) {
  const f = t.funnel;
  return (
    <div className="space-y-3">
      <Steps
        steps={[
          { label: "Homepage views", value: f.homeViews },
          { label: "Pricing views", value: f.pricingViews, sub: `${pct(f.pricingViews, f.homeViews)} of homepage` },
          { label: "Checkouts started", value: f.checkoutsStarted, sub: `${pct(f.checkoutsStarted, f.pricingViews)} of pricing` },
          { label: "Paid", value: f.paid, sub: `${pct(f.paid, f.checkoutsStarted)} of checkouts · ${usd(f.paidCents)}` },
        ]}
      />
      {f.renewed > 0 && (
        <p className="text-sm text-ink-soft">
          Plus {f.renewed} renewal{f.renewed === 1 ? "" : "s"} · {usd(f.renewedCents)}
        </p>
      )}
    </div>
  );
}

function BusinessFunnel({ b, days }: { b: BusinessReport; days: number }) {
  return (
    <div className="space-y-3">
      <Steps
        steps={[
          {
            label: "Active firms",
            value: b.firms.active,
            sub: `${b.firms.newInRange} new in ${days}d · ${b.firms.cancelled} cancelled${b.firms.paymentFailed ? ` · ${b.firms.paymentFailed} payment failed` : ""}`,
          },
          { label: "Seats purchased", value: b.seatsPurchased, sub: "across active firms" },
          {
            label: "Policies delivered",
            value: b.policy.policyDelivered,
            sub: `${b.policy.intakeSubmitted} intakes submitted of ${b.policy.intakeStarted} started`,
          },
          {
            label: "Certificates issued",
            value: b.training.certificatesIssued,
            sub: `${b.training.certificatesInRange} in ${days}d`,
          },
        ]}
      />
      <Steps
        steps={[
          { label: "Staff invited", value: b.staff.invited },
          { label: "Staff activated", value: b.staff.activated, sub: `${pct(b.staff.activated, b.staff.invited)} of invited` },
          { label: "Training enrolments", value: b.training.enrolled },
          { label: "Training completed", value: b.training.completed, sub: `${pct(b.training.completed, b.training.enrolled)} of enrolled` },
        ]}
      />
    </div>
  );
}

function SourcesTable({ rows }: { rows: TrafficReport["sources"] }) {
  return (
    <SimpleTable
      head={["Source", "Views", "Checkouts", "Paid", "Revenue"]}
      rows={rows.map((r) => [r.source, r.views, r.checkouts, r.paid, usd(r.paidCents)])}
    />
  );
}

function DailyTable({ rows }: { rows: TrafficReport["daily"] }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-mute">
          <tr>
            <th className="px-4 py-2 font-medium">Day</th>
            <th className="w-1/2 px-4 py-2 font-medium">Views</th>
            <th className="px-4 py-2 text-right font-medium">Checkouts</th>
            <th className="px-4 py-2 text-right font-medium">Paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-t border-marble-deep">
              <td className="whitespace-nowrap px-4 py-1.5 tabular-nums">{r.day}</td>
              <td className="px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-teal-light" style={{ width: `${(r.views / max) * 100}%` }} />
                  <span className="tabular-nums text-ink-soft">{r.views}</span>
                </div>
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">{r.checkouts || ""}</td>
              <td className="px-4 py-1.5 text-right tabular-nums font-semibold">{r.paid || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-mute">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-marble-deep">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-1.5 ${j > 0 ? "text-right tabular-nums" : "break-all"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-ink-mute shadow-sm">Nothing yet.</p>;
}
