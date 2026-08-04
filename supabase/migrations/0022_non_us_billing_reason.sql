-- =============================================================================
-- 0022_non_us_billing_reason.sql
-- Satisfies: US-only purchases (Katy's hard no on international data transfers)
-- =============================================================================
--
-- Katy's position, via Max: US law firms only, US sub-processors, no adequacy
-- decisions, no standard contractual clauses. The Terms and DPA will say so, and
-- checkout currently contradicts it — a firm in Dublin or Toronto can buy today.
--
-- Stripe Checkout has NO billing-country allowlist. Verified against the API
-- reference rather than assumed: `allowed_countries` exists only on
-- `shipping_address_collection`, which governs SHIPPING, and this is a digital
-- product with nothing to ship. So enforcement is two layers in our own code,
-- and a non-US buyer who gets past layer 1 needs a refusal reason here.
--
-- ⚠️ This restates ONLY provisioning_failures.reason. That constraint is new in
-- 0018 and nothing depends on its current value set, so extending it is safe.
-- It deliberately does NOT go near training_events_event_type_check: six
-- migrations define that one in full, 0017 is current, and restating it from an
-- older definition silently deletes every value added since.
-- ---------------------------------------------------------------------------

alter table public.provisioning_failures
  drop constraint if exists provisioning_failures_reason_check;

alter table public.provisioning_failures
  add constraint provisioning_failures_reason_check
  check (reason in ('duplicate', 'email_in_use', 'unresolved', 'non_us_billing'));

comment on column public.provisioning_failures.reason is
  'duplicate      — buyer already owns an active firm; the NEW subscription was '
  'cancelled and the existing one left untouched. '
  'email_in_use   — buyer is staff at someone else''s active firm; nothing was '
  'provisioned and nothing was cancelled. '
  'unresolved     — the address was reported as already registered but no user '
  'row matches it. '
  'non_us_billing — the billing address Stripe collected is outside the US. '
  'Charge-prevention lives in /api/checkout; this row means that layer was '
  'bypassed, so it should be rare and each one is worth understanding.';
