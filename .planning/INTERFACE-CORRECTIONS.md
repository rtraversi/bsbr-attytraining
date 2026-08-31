> ℹ️ **Findings log from 2026-07-10, not a status document (checked 2026-08-27).** The record of the
> first external user test (Katy and Rob on the light-theme rebuild). Which items were fixed is not
> tracked here. Kept for the record.

---

# Interface Corrections — Real User Testing Feedback

**Date:** 2026-07-10
**Source:** First real external test of the rebuilt app — Max sent an invite to Katy Chavez
(attorney co-author, tested as a firm **admin**) and Rob. This is the first time anyone outside
Max has touched the new light-theme rebuild (Overview/Quizzes/Training/Admin dashboard/nav pill),
and it surfaced real, load-bearing problems that internal testing hadn't caught.

**Status:** We are now in a **test → fix → repair → improve** phase. Everything below is raw
feedback captured in full detail so the next session (terminal or desktop) can start fixing
without re-deriving context. Nothing here has been triaged into a build prompt yet.

---

## 🔴 Critical bugs — block real usage, fix first

### 1. Admin could not access her own quizzes/lesson-checks at all
Katy tested as a firm **admin**. She passed what she believed were all the lesson checks, then
hit "Go to Lesson Checks →" from the "you've finished the course content" prompt — and was
redirected somewhere she couldn't use. Her words: *"even though I passed all the quizzes, I
wasnt allowed to take the quiz... I felt like I was being put in penalty box as if I had not done
sufficiently well on quizzes. But I think I took them all."*

**Root cause (confirmed earlier in this project, now proven real via actual testing):**
`/dashboard/overview` and `/dashboard/quizzes` both hard-redirect any non-`employee` role
(`if (role !== 'employee') redirect('/dashboard')`). An admin's `firm_members` role is
`'admin'`, never `'employee'` — the data model doesn't support one person being both. Katy, as
an admin, was **structurally unable** to ever pass a lesson check or reach the quiz flow, no
matter what she did. This isn't a UI bug, it's a routing/data-model gap.

Max's own note: *"she never had access as admin to overview tab or quiz and it was mostly a
freakshow."*

This was already flagged as a pinned future task (`task_59201337` — "Let firm admins complete
their own training") based on a hypothetical. **It is no longer hypothetical — this is now a
confirmed, reproduced, real blocker.** Priority should be raised accordingly. Workaround for
further testing in the meantime: invite yourself as a **team member** (separate account, e.g.
via the Gmail plus-addressing trick) rather than testing training-completion as an admin.

### 2. False-positive course completion — clicking the wrong thing marks the course "done"
Katy: *"I figured it out, then clicked on paul, it flashed his scenario for a fraction of a
second and said course was done."* Max: *"Wuh... okay thats a bug I will look into it."*

Clicking on some in-scene element (a character named "Paul" in one of the scenario screens)
appears to have incorrectly fired the SCORM completion signal (`video_completed`) after only a
fraction-of-a-second render, without the learner actually having gone through the real content.
This is a serious integrity problem for a *certification* product — the whole point of the SCORM
gate (built earlier this session) was to make completion unfakeable/unskippable, and this shows
it can still be triggered accidentally/incorrectly by some interaction path.

**Needs investigation:** which Storyline/Rise interaction is wired to the completion trigger, and
why does clicking "Paul" reach it. Cross-reference the biggest-open-risk note already in
`session_handoff.md` about completion being gated on a single embedded Storyline block
(`storylineId: "cmr0u5l7w007a2e78rd3axbg5"`) — this may be the same root cause: if that one block
is reachable via an unintended click path, it fires early.

### 3. "Exit course" button is a dead end — no way back in, and nothing is saved
Max's own finding (6th screenshot): *"what the hell is that exit course button? it shuts down
the course content and member cant do anything to get back to it and since there is no progress
saved..."*

This is Rise's own native player chrome (an "Exit course" control), not something we built — but
combined with the **already-known gap** that SCORM resume isn't wired (`lmsCommitUrl:false` ⇒ no
suspend_data/bookmark persisted, course restarts from the top every visit), clicking Exit can
strand a learner with genuinely no path back into their in-progress training. This was
previously logged as a "poor UX, not blocking" gap — **real testing shows it's actually a hard
dead-end, not just an inconvenience.** Needs to either: hide/disable the native Exit control if
Rise's embed API allows it, intercept it with our own confirmation + real navigation back, or
(longer-term) build real SCORM resume so re-entering isn't destructive regardless.

**RESOLVED (decision made 2026-07-10, Rob):** Confirmed via the package's own
`runtime-data.js` that this is a Rise export setting, not something baked unchangeably into the
compiled bundle — `lmsOptions.enableExitCourse: true` is a checkbox in Rise's "Export for LMS"
dialog. **Rob will uncheck "Enable Exit Course button" and re-export** — no app code change
needed, the button disappears from the compiled SCORM package entirely. The companion hamburger
icon (☰, Rise's own course outline/lesson navigator — `sidebarMode: "open"`) is being left alone;
it's not broken, just undiscovered (same shape of problem as the nav pill, item #5 below), and
it's the built-in answer to item #7's "back/forward isn't obvious" complaint. Real SCORM
resume (the longer-term option) is still separately open — see item #4 below, now folded into
the broader "own the Rise integration" rework Rob is scoping (2026-07-10 follow-up conversation).

### 4. Progress bar doesn't match its own label
5th screenshot: pill reads "50% Complete" but the rendered fill bar is visibly much less than
half the track width. Either the percentage calculation or the bar's width-binding is wrong —
needs a direct comparison of the displayed number vs. the CSS width value driving the fill.

---

## 🟠 UX problems — not "broken" exactly, but a real user got stuck

### 5. The new nav pill (hover-to-unfurl) is not discoverable — this is a real design failure, not a bug
Katy, on first landing on the admin dashboard: *"I got the invite. I will say I arrived here and
sat for awhile trying to find the training."* Screenshot 1 shows her looking at the admin
dashboard with the nav pill fully collapsed to just the "K" avatar circle — she had no idea it
was interactive at all.

Her direct recommendation: *"You have to hover on the K to get the menu. It should always be
visible. Or at least a hamburger icon to show there might be more. But I say just show the
tabs."*

**This directly contradicts the hover-to-unfurl nav design we locked and shipped this session.**
That design was verified to *work* mechanically (collapse/expand states both function
correctly), but it was never tested on someone who didn't already know it existed — and the
first real person to see it cold got completely stuck. This needs to be revisited as a real
design decision, not just patched. Katy's two suggested directions, in her preference order:
1. Don't collapse the tabs at all — show them always.
2. If collapsing is kept for space reasons, show a hamburger/indicator icon so it's obvious
   there's more, rather than a bare avatar with no affordance.

### 6. Interactive elements inside Rise content aren't visually marked as clickable
Katy got stuck on a scene with a mocked-up ChatGPT conversation and a card labeled "This is what
the AI saw" — she waited a long time assuming something would happen automatically. *"There is
still no sounds and nothing changes for QUITE a long time... I am not sure what I am supposed to
do."* Turned out the card itself was clickable to advance. Max: *"you have to click on button...
that says 'this is what the ai saw'... I'll make it look like an arrow instead."* Katy: *"Yeah
that looks like it is supposed to be a message and it is really confusing, like it only saw a
piece of the message?... Yeah, put an arrow and even 'click to proceed'."*

This is a **Rise-authoring fix** (Max/Katy edit the Rise course directly, not a code change) —
add a clear "click to proceed" affordance (arrow icon + label) to that interaction.

### 7. Rise's own back/forward navigation isn't obvious either
Screenshot 3: Katy got stuck again — *"I get stuck here. How do I proceed?"* Max: *"on the back
arrow to the right."* This is Rise's native chrome, largely out of our direct control, but worth
noting as a pattern: multiple points in the course rely on navigation affordances that a
first-time user didn't find intuitively. May be worth a short "how to navigate this course"
note at the very start of Training, since we can't redesign Rise's own player.

---

## 🟡 Content/authoring notes — Katy's own scenario-writing task, not a dev task

### 8. The confidentiality scenario needs a narrative rework
Katy, on the "ChatGPT" scene: *"I am thinking to kind of rework that one though. Because AI is
not locating the client. The point is that other people can figure out the client."* This is
Katy revising the scenario's own logic/writing as the content author — flagging here only so
it's not lost, no code action needed from us.

---

## Notes on Rise 360 hosting status (context, not a bug)
Max, mid-conversation with Katy: *"sounds pending btw. they're up on rise, but this embed was a
test. integrating it has been a bit of a hassle."* Confirms audio/sound assets are still pending
on Rise's side, and the current embed is explicitly understood by Max as a test integration, not
final — expect more friction here as the real Rise course gets finalized.

---

## What's NOT yet triaged into a build prompt
None of the above has been scoped into a terminal prompt yet. Before doing that, whoever picks
this up next should:
1. **Decide on the nav pill** — patch the hover-unfurl discoverability problem (add a
   hamburger/indicator, or drop the collapse behavior entirely per Katy's preference) before
   building anything else on top of it.
2. **Prioritize #1 (admin training access) and #2 (false-positive completion)** as the two
   integrity-critical bugs — a cert product where an admin can't complete training, or where
   completion can be accidentally faked, undermines the whole product's premise.
3. Re-test as a **team member** account (not admin) to get a cleaner read on the actual employee
   experience, since Katy's admin-role testing conflated "broken for admins" with "broken in
   general" for several of these findings.
