# Legal documents — Iurix Accreditation

Four policy documents adapted from the IurisIQ website (`C:\sites\iurisiq-website`) for Iurix
Accreditation, 2026-07-28.

| File | Source | Adaptation weight |
|---|---|---|
| [`privacy-policy.md`](./privacy-policy.md) | `privacy.html` | **Heavy** — different data model |
| [`terms-of-service.md`](./terms-of-service.md) | `terms.html` | **Heavy** — different commercial model |
| [`ai-use-policy.md`](./ai-use-policy.md) | `ai-policy.html` | **Rewritten** — the products' relationship to AI is inverted |
| [`accessibility-statement.md`](./accessibility-statement.md) | `accessibility.html` | Moderate — but full of unverifiable inherited claims |

---

## 🔴 Read this first

**These are drafts and none of them should be published as-is.** Two reasons:

1. **They are legal documents and need attorney review.** The existing pages in the app are
   deliberately marked `[ATTORNEY TO COMPLETE]` — that decision was made for good reasons and this
   work does not overturn it. What these drafts do is replace empty placeholders with substantive,
   product-accurate drafting that an attorney can review and correct, rather than write from scratch.
   Katy is the obvious reviewer.

2. **They contain marked claims I could not verify.** Every such claim carries a `[CONFIRM]` marker
   inline. Publishing without resolving them would put false statements into legally operative
   documents. The consolidated list is below.

---

## Why this was not a find-and-replace

IurisIQ and Iurix are both legal-sector products from the same parent, but their data and commercial
models differ so much that copying the documents would have produced text describing a product that
does not exist.

| | IurisIQ | Iurix Accreditation |
|---|---|---|
| What it is | Practice management platform | Training and certification |
| Holds client/case data | **Yes** — case files, immigration documents | **No — none at all** |
| Attorney-client privilege | Central concern | **Not implicated** |
| Data role | Processor (firm is controller) | **Controller** of certification records |
| AI in the product | Drafting, conflicts, translation, case intelligence | **None in the certification pathway** |
| Government APIs | USCIS | None |
| Tenancy | Single-tenant isolation | Multi-tenant, row-level security |
| Billing | Monthly or annual | **Annual only, per-seat volume, flat renewal** |
| Retention after termination | 60 days, then deleted | **7 years for certification records** |
| Who the users are | Attorneys | Attorneys **and their nonlawyer staff** |

Four consequences worth knowing, because they are the substance of the adaptation:

- **The privilege and case-data language is gone.** Keeping it would have been reassuring and false.
  Its removal simplifies the privacy policy considerably, and that simplification is itself a selling
  point — there is far less to worry about here.
- **Retention is inverted.** IurisIQ deletes 60 days after termination. Iurix must *retain* for seven
  years, because a certificate is compliance evidence that has to outlive the subscription. A record
  that disappears when a firm stops paying is worthless for its purpose.
- **The AI policy argues the opposite case.** IurisIQ's explains how its AI is safe. Iurix's explains
  that **there is no AI in the certification path at all** — fixed questions, deterministic
  server-side scoring, human-written answer key. For a product that sells AI supervision, that is a
  strong position and worth stating plainly.
- **Staff members are data subjects who did not buy anything.** They are enrolled by their employer
  and their scores are visible to that employer. Both documents say so explicitly rather than leaving
  it implied.

---

## 🔴 Open items — must be resolved before publication

### Blocking on Rob

| # | Item | Where |
|---|---|---|
| 1 | **Contact addresses.** Every document needs them: privacy, security, legal, billing, accessibility, AI concerns. Currently `[TBD]` throughout | All four |
| 2 | **Postal address.** Do not reuse IurisIQ's PO Box | All four |
| 3 | **Entity structure.** Is this "BSBR Holdings, LLC d/b/a Iurix," or is Iurix becoming its own LLC? This changes the attribution line in all four documents | All four |
| ~~4~~ | ~~**Was AI used to author the course content?**~~ ✅ **RESOLVED 2026-07-28 (Rob): no AI was used.** Curriculum designed and outline approved by a licensed attorney; content authored by an employee from that approved outline. Written into the policy as a positive provenance statement | AI policy §1 |
| 5 | **Governing law / venue.** North Carolina is presumed but unconfirmed | Terms §15 |
| 6 | **Cancellation notice period** for annual renewal | Terms §5 |
| 7 | **Keep `/dpa`?** A Data Processing Addendum makes sense when you process a customer's data as a processor. Iurix is largely a controller and holds no client data. The page exists but may not be the right instrument — an attorney should say whether to keep, rewrite, or retire it | — |

### Blocking on an attorney

| # | Item | Where |
|---|---|---|
| 8 | **Dispute resolution.** The source uses binding AAA arbitration plus a class action waiver. Inherited by default it would be a substantive commercial choice made by accident. Left undrafted on purpose | Terms §16 |
| 9 | **Liability cap.** A fees-paid cap on a $35/seat/year product is very low in absolute terms. Confirm it is enforceable and commercially sensible | Terms §12 |
| 10 | **State privacy regimes.** CCPA is addressed. Virginia, Colorado, Connecticut, Texas and others are now in force — confirm which apply and whether thresholds are met | Privacy §7 |
| 11 | **Which accessibility regimes to cite.** The source cites Section 508 and the U.S. Access Board. Section 508 binds federal agencies and contractors; citing it may claim an obligation that does not apply | Accessibility |
| 12 | **Certificate revocation clause.** Newly drafted for assessment-integrity breaches. No equivalent exists in the source | Terms §4 |

### ✅ Engineering — one real finding, now fixed

| # | Item | Where |
|---|---|---|
| ~~13~~ | ~~**Profile photographs are stored in a publicly-readable bucket.**~~ ✅ **RESOLVED 2026-07-28 (Rob): the profile photo feature has been removed entirely.** Upload route and UI deleted, `avatars` bucket dropped in migration `0014_remove_avatars.sql`, and all five render sites reverted to the initial-letter / person-outline fallbacks they already had. The Service now holds no photographs. **Not yet deployed** | Privacy §2, §6 |

### ⏸ Accessibility — PINNED to the week of 2026-08-03 (Rob, 2026-07-28)

**The accessibility statement is parked and is not part of the current push.** It is drafted and
ready, but every testing claim in it is unresolved, and resolving them means doing real testing
rather than editing text. Picked back up the week of **Monday 3 August 2026**.

Consequence for the redesign: **do not add an `/accessibility` link to the footer yet.** The footer
goes from three legal links to **four** for now — Privacy, Terms, AI Use Policy, and DPA — with
Accessibility added when the statement is published. Design for five, ship four. This is reflected
in `.planning/design-handoff/`.

### Accessibility — do not inherit these claims

The source statement asserts a full assistive-technology test matrix (NVDA, JAWS, VoiceOver,
TalkBack), automated Axe scanning in the deployment pipeline, and APCA contrast analysis. **No
evidence of any formal accessibility audit exists in this project's record.**

Those claims are written conditionally in the draft, with an honest "not yet formally evaluated"
alternative supplied. Resolve by **doing the testing** or **dropping the claim**. An overclaiming
accessibility statement is itself a legal exposure, and it is the exact failure mode the source
document invites.

---

## What to do with these

1. **Rob** resolves items 1–7 and 13.
2. **Katy or another attorney** reviews everything and resolves items 8–12.
3. The approved text replaces the `[ATTORNEY TO COMPLETE]` placeholders in
   `app/privacy/page.tsx`, `app/terms/page.tsx`, and — as two new routes — `app/ai-policy/page.tsx`
   and `app/accessibility/page.tsx`.
4. The marketing footer gains links to the two new pages. This changes the footer's link count from
   three to five, which affects the redesign — see `.planning/design-handoff/`.

## Note on the design handoff

`.planning/design-handoff/` was written when there were three legal routes. There are now five. The
handoff has been updated to match, and these documents give a designer a realistic sense of the
length and structure of a legal page — considerably more useful than the placeholder shells.
