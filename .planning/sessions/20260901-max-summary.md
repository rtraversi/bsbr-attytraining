# Session summary — 2026-09-01 (Max, desktop)

## Headline

**The policy generator became a working product loop in one day.** It started as a tested engine
with no way to see its output and ended with a firm able to fill in the intake, submit it, and read
and download its own `.docx` policy once an operator delivers it. Six pieces of work landed:
a renderer, 33 transcribed clauses, D8, the 3-day retention decision, the app wiring, and the
delivery flow.

**The largest finding was not in the code. It was found by opening a browser.** A firm submitted
its intake, saw "the attorney is drafting your policy", and had no path forward, because nothing
in the codebase had ever written `policy_delivered_at`.

Five things to carry:

1. 🔴 **The delivery step did not exist.** Built today, merged, verified end to end.
2. 🔴 **A firm could read its own unreviewed policy.** Fixed, and five tests inverted to prove it.
3. **Terminal caught a real concurrency defect in its own delivery claim**, through a test it
   wrote on its own initiative.
4. **Katy's ask is nine clauses, not fourteen.** Five of the eighteen TODOs are structural.
5. **About fifteen of Katy's own intake questions were never built**, not the nine D3 approved.

---

## What was built, in order

| Commit | What |
|---|---|
| `860b0df` | The Markdown renderer, and one home for the two fixtures |
| `b460058` | Transcribe the 33 blocks whose text Katy had already written |
| `a07323a` | merge: the assembler, the renderer and the transcribed clauses |
| `b6cf12e` | D8-1/2/3: answers are kept for the subscription, not deleted after delivery |
| `6dcfefc` | D8-4: the deliverable is a `.docx`, written without a dependency |
| `4572bd8` | The retention grace period is three days, not thirty |
| `c96a4e7` | merge: D8 |
| `4a031bd` | `policyForFirm` — the seam between the intake and the assembler |
| `93557d2` | A firm can read and download its own policy |
| `028503f` | merge: the assembler is wired to the app |
| `3f07310` | fix: a firm could read its own unreviewed policy |
| `fb08560` | Delivery: the queue, the claim, and a dark notification |
| `8f38531` | `deliver-policy`, the operator surface |
| `2ef4292` | A Policy nav link, once there is a policy |
| `12c181c` | merge: the delivery flow |

Uncommitted on `intake-ui-fixes`: question numbers on the review page, and the tool grid layout.

---

## The transcription pass

**11 verbatim / 51 TODO became 51 verbatim / 18 TODO.** 33 blocks moved.

The strong check is not a claim: `tests/policy-transcription.test.ts` re-opens
`AI-Policy-Research-2026-08-20.md` and asserts every verbatim block appears at its stated source
line. All 51 pass, so nothing is paraphrased.

Three judgment calls terminal made and surfaced:

- **Seven blocks were split**, one per source line, because five source paragraphs are multi-line
  and the fidelity test checks a block against one line. Katy's sub-bullets are separate rules
  anyway. §8 Hallucinations became four blocks; §14 Disclosure became four.
- **Three `sourceLine`s moved** because the cited line was a heading, not the clause.
- **`p13-verify-every-case` (line 288) stayed TODO** even though source text exists. Ratification
  made §8 the single home for the verify-from-source rule; transcribing 288 would state it a third
  time, and writing a cross-reference would be inventing text.

**Katy's typos are preserved on purpose** and commented in place: "pr" for "or", "Enterpirse",
"entrie", "chatbox", "if there is every any". Fixing them here would put this file and her document
out of sync. The place to fix them is her document, and reading the rendered policy is her chance.

---

## D8, and what each part turned out to be

1. **The purge is gone.** `purged_at`, the `'purged'` status, the `ReviewState` member, and the
   screen reading "Your answers were deleted after your policy was delivered". Nothing had ever
   *written* `purged_at` — batch 4 of `0028` was never built — so no firm ever lost anything.
2. **`canReopen` is now `submitted || delivered`.** The bug this could produce: reopen a delivered
   intake, edit, resubmit, and `policy_delivered_at` is still set while the answers behind it have
   moved. `intakeStateOf` now compares `submitted_at > policy_delivered_at`, so it needs no column.
3. **`lib/intake/retention.ts`** computes from `firms.status` + `firms.current_period_end`, which
   the Stripe webhook already maintains, rather than a retention column someone has to remember to
   write. `payment_failed` reads as active, because Smart Retries are still running.
4. **`lib/policy/docx.ts`** is a hand-written ZIP + WordprocessingML writer, no dependency, because
   this eventually runs in a Worker. Same constraint that chose `pdf-lib`.

---

## The 3-day grace period

**Max, 2026-09-01, verbatim:**

> *"I said grace period because I was cautious a firm might not renew but come back. however lets
> make it shorter. katy said this could be a seling point of renewing to save their answers. and i
> like it. so have it be three days only."*

Supersedes the 30-day placeholder, which had been borrowed from the retired purge window. Recorded
in `.planning/POLICY-DECISIONS.md` under a new **Answer retention** heading.

**A consequence worth knowing:** the approved copy spells out "three days" in prose, so that
sentence no longer interpolates `RENEWAL_GRACE_DAYS`. The copy and the clock can now drift apart
silently. `tests/intake-retention.test.ts` pins the literal 3 rather than merely referencing the
constant, so changing the clock fails a test.

**Max approved the grace and expired strings as written and rewrote the active one.** The em dash
that had been in it is gone.

---

## The delivery flow

Scoped in plan mode, three decisions taken before any code:

| | Decision |
|---|---|
| Operator | **Max, via a script.** No operator console, no cross-firm role in the deployed app. Follows the rule in `dev-seed-firm.mjs`: a script cannot leak, because it is not deployed. |
| Review depth | **Approve as-generated.** Wording problems are fixed in `lib/policy/blocks` so every firm benefits. No per-firm edited copy, which would fork a firm's document away from the engine. |
| Notification | **Build it, leave it dark.** Resend is 403. A failed send is logged and does not roll back the delivery. |

### The concurrency defect

Terminal's first `markDelivered` guarded the `UPDATE` on `status` and `submitted_at`, **neither of
which a delivery changes**, so a second concurrent delivery still matched and silently overwrote
the first author and timestamp. The claim was not a claim.

The fix is a **compare-and-set on `policy_delivered_at` itself**: `is null` for a first delivery,
`eq` the previous timestamp for a revision. That satisfies both the concurrency guarantee and D8-2.
A plain `IS NULL` would have fixed one and broken the other.

### The email is locked twice

Resend's 403 is one lock. **`POLICY_EMAIL_COPY_APPROVED = false` is the second and the important
one:** without it, the day someone fixes DNS, every delivery would start sending firms an email
reading `[TODO(copy) — headline]`. It is pinned false by a test. Copy is Max's to write.

### Verified end to end

Against session `51ad5877`: waiting state before delivery, `--list` showing 51 clauses / 16
unwritten, a valid `.docx` from `--render`, a refusal without `--force-todos`, a successful forced
delivery with the email failing loudly and the delivery not rolling back, the firm reading it, then
**reopen → edit → resubmit returning the firm to the waiting state and back into the queue flagged
`⟲ RESUBMITTED`**. That last case was called out in the plan as the one most likely to be wrong.

---

## Findings about the source material

### Katy's eighteen remaining TODOs, correctly split

**Nine need real new prose** (source lines 268, 276, 278, 312, 316, 318, 320, 330, 342). The most
important is **342**: *"Professional level of data protection: API, Claude Enterpirse, ..[finish
this list]"*. §5, §9 and §10 all turn on that term.

**Five are structural, not writing.** 361 is a bare list the vendor blocks already carry. 363 and
408 are bare headings whose sub-bullets are transcribed. 401 and 403 are instructions to the firm
and are likely slot fills.

**Three are intake questions**, not clauses: G-Q6 (vendor diligence beyond no-training), G-Q8 (who
approves a new tool), G-Q9 (who trains staff and on what cadence). All three trace to Katy's own
modules H, W and G.

**One is a deliberate hold**: P13.

### D3's count of nine missing questions is wrong

Cross-referencing Katy's Section 0 and Modules A–W against the 49 built question keys turns up
roughly **fifteen** gaps, not nine. Beyond the three G-Q items: **practice areas** (Section 0 Q3),
research verification step (B Q2), onboarding process (G Q1), attestation cadence (G Q3),
local-vs-cloud storage (H Q5), TAR methodology documentation (L Q2), notetaker states (M Q3),
citation-verification step (O Q1), engagement letter (P Q2), malpractice AI exclusions (R Q2),
employee handbook (S Q1), and client "safe question" examples (T Q3).

**Reconcile this before taking anything to Katy.**

### The vendor block review, still outstanding

Reviewed on desktop against all 20 fact rows. Findings, ranked:

1. **Half of it is action items, not policy**, which D2 says is a separate deliverable.
2. **"Written confirmation" is not the same term as §22 will define.** Katy's rule says *express
   agreement*.
3. **The DPA is bundled into the training sentence**, and a DPA is not a no-training agreement.
4. **Signal is the tell.** Telling a firm to get written no-training confirmation from an
   end-to-end encrypted messenger costs credibility on the other eighteen. PracticePanther is the
   same shape.
5. **Lexis+ AI and Telegram are the live risk.** AI on by default, opt-out unknown, training
   unsettled. The clause tells a firm to stop putting client information through its primary
   research tool with no path to compliance.
6. **The "as of 2026-08-31" date freezes into a delivered document**, which needs a stated re-check
   cadence. That is the renewal pitch.

---

## The browser run

The app was driven in a real browser for the first time this session, against **staging**, with a
seeded firm. That is how the delivery gap was found.

Max's UX findings, three of four still unspecified:

- The intake intro page: *"everything out of place"*.
- The tool grid: poor use of horizontal space. **Fixed on `intake-ui-fixes`.**
- The review page order: *"odd and not properly built"*.
- Question numbers missing from the review page. **Fixed on `intake-ui-fixes`.**

On "the review does not show all questions": that is deliberate. `buildReview()` shows visible
questions only, because a branch the firm never entered "is not a question they skipped, and
listing it would read as an omission they need to go and fix." Unanswered questions they *were*
asked do render, as "Not answered".

**Terminal refused to fabricate the before/after screenshots** when the Chrome extension would not
connect. Correct call. The two fixes compile, both pages return 200, and 470 tests pass, but
neither has been seen.

---

## Corrections made in-session

- Desktop wrote a prompt framed as "approve the copy before commit" for copy that was **already
  committed and on main**. Terminal flagged it rather than playing along.
- Desktop drifted back into dense prose after being told twice to use bullets. The standing rule
  was reinforced.
- A claim that the confirmation prompt "cannot be piped" was made and then immediately contradicted
  by piping it. Terminal made it true where it matters instead of leaving the false claim: production
  refuses a non-TTY confirmation, staging allows it.

---

## Open

1. **Screenshot and commit `intake-ui-fixes`.**
2. **Katy reviews `vendor-block.ts`** and writes the nine clauses. It is now on `main` unreviewed.
3. **Reconcile D3's nine against the real fifteen.**
4. **Privacy §2/§5** still has no category covering intake answers, and now owes the 3-day rule.
5. **The delivery email copy**, and the design direction on two screens.
6. **Staging cleanup**: `51ad5877` delivered twice, `firm_name` reads "The Best Firm Ever, Revised";
   Byron LLP has an open session.
7. Carried and unchanged: `0028`–`0032` are not on PROD, the `Intake-uploads` bucket does not exist
   there, Resend still returns 403, and nothing has shipped since 2026-08-24T19:34:58Z.
