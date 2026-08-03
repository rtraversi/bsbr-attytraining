# Accessibility Statement — Iurix Accreditation

> **STATUS: DRAFT — REQUIRES REVIEW BEFORE PUBLICATION, AND CONTAINS CLAIMS THAT ARE NOT YET TRUE.**
> Adapted from the IurisIQ accessibility statement (`C:\sites\iurisiq-website\accessibility.html`,
> last updated 2026-06-25).
>
> ⚠️ **Read this before publishing.** An accessibility statement is a public representation about
> your product. The source document claims a specific assistive-technology test matrix (NVDA, JAWS,
> VoiceOver, TalkBack), automated Axe scanning in the deployment pipeline, and APCA contrast
> analysis. **None of that has been verified for this application, and as far as the project record
> shows, no formal accessibility audit has ever been conducted here.** Publishing those claims
> unverified would be a false statement about a legally sensitive subject.
>
> Every testing claim below is therefore marked **`[CONFIRM]`** or written conditionally. Resolve
> them by *doing the testing* or by *removing the claim* — not by assuming the source document's
> claims carry over.

**Last Updated:** [TBD]

---

Iurix Accreditation is committed to making our website and training platform usable by everyone,
including people with disabilities. We aim to conform to the **Web Content Accessibility Guidelines
(WCAG) 2.1 at Level AA**.

This statement sets out our current status, the limitations we know about, and how to reach us if you
encounter a barrier.

## Scope

This statement applies to:

- **iurixaccreditation.com** — our public website
- **The Iurix Accreditation platform** — the training, assessment, and dashboard application used by
  firms and their staff

It does not cover third-party websites linked from our site.

## Conformance Status

`[CONFIRM — choose the accurate description. Do not claim more than has been tested.]`

> **If no formal audit has been conducted (currently the case):**
> We have **not yet completed a formal accessibility audit** of the Service. We have built to
> accessibility good practice throughout — see "Measures Taken" below — but we are not in a position
> to claim a conformance level we have not verified. A formal evaluation is planned. `[TBD — target
> date.]` We would rather tell you that plainly than publish a conformance badge we cannot support.

> **After an audit is completed, replace the above with a substantiated statement**, e.g. "partially
> conformant with WCAG 2.1 Level AA," together with the evaluation date, method, and the specific
> criteria not met.

## Measures Taken

The following are implemented in the application `[CONFIRM — spot-check each before publishing;
these are drawn from the development record rather than from an audit]`:

- **Semantic HTML** — headings, landmarks, and lists convey document structure to assistive
  technology
- **Reduced-motion support** — animation is suppressed for users who set a reduced-motion preference
  at the operating-system level. This is applied consistently across the application's animated
  surfaces
- **Light and dark themes** — a manual theme control is available, which assists users sensitive to
  screen brightness or requiring higher contrast
- **Keyboard-operable interactive controls** — interactive elements are built as real buttons and
  links rather than click-handling containers
- **Visible focus indication** on interactive elements
- **Descriptive alternative text** for meaningful images; decorative imagery marked so screen readers
  skip it
- **Labelled form fields** with programmatically associated labels
- **Unique, descriptive page titles** on every route
- **Declared page language** via the `lang` attribute
- **No auto-playing audio or video**
- **No reliance on colour alone** to convey status — training and certification states carry a text
  label or icon in addition to colour

## Known Limitations

We would rather list these than have you discover them.

### The training course is third-party content

The interactive course is produced in **Articulate Rise 360** and delivered as an exported package
embedded in the training page. **Its internal accessibility is determined by Articulate's output, not
by our application code.** We cannot directly remediate the course player's markup, keyboard
handling, or screen-reader behaviour.

This is the most significant limitation in the Service, because the course is where learners spend
almost all of their time. `[CONFIRM — Articulate publishes its own accessibility conformance
documentation for Rise 360 output. Obtain it, review it against WCAG 2.1 AA, and either cite it here
or state what it does not cover.]`

If you are unable to complete the training because of a barrier in the course player, **contact us —
we will find another way to get you through the material.** See "Feedback and Contact" below.

### Certificate PDFs may not be fully tagged

Certificates are generated as PDF documents. `[CONFIRM]` These are **not currently produced to the
PDF/UA tagged-document standard**, which means a screen reader may not reliably convey their
structure. The same information is available in accessible form within the dashboard.

Remediating this means changing how certificates are generated. `[TBD — decide whether to fix, or to
provide an accessible alternative format on request, and state which here.]`

### Not yet formally evaluated

Until the audit described above is completed, there may be barriers we are not aware of. Reports from
users are currently our best source of information, and we treat them accordingly.

## Assessment Approach

`[CONFIRM — describe only what is actually done. Suggested honest baseline for now:]`

> Accessibility is currently addressed through developer self-review against WCAG 2.1 Level AA
> criteria during development, together with responsive and keyboard testing at multiple viewport
> sizes. **We have not yet conducted structured screen-reader testing or engaged a third-party
> accessibility evaluator.** Both are planned.

Once testing is genuinely performed, state precisely what was tested, with which tools and assistive
technologies, and on what date.

## Feedback and Contact

We welcome feedback on the accessibility of our website and platform. If you encounter a barrier that
prevents you from accessing content or completing the training, please contact us:

| | |
|---|---|
| **Email** | `[TBD]` |
| **Subject line** | Accessibility Issue |
| **Response time** | We aim to respond within 2 business days `[CONFIRM — only commit to a target that can actually be met by a small team]` |

Please include a description of the barrier, the page or URL where it occurred, and the browser and
assistive technology you were using. That detail lets us reproduce the problem quickly.

**If a barrier prevents a staff member from completing required training, tell us and we will make
alternative arrangements so that person is not disadvantaged.** We would rather issue a certificate
through an accommodation than have someone unable to complete training their employer requires.

## Formal Complaints

If you are not satisfied with our response, you may raise a complaint with the U.S. Department of
Justice Civil Rights Division in respect of digital accessibility obligations under the Americans
with Disabilities Act.

`[CONFIRM — the source document also cites Section 508 and the U.S. Access Board. Section 508 applies
to federal agencies and their contractors. Unless Iurix sells to federal government customers, citing
it may claim an obligation and a conformance standard that do not apply. An attorney should confirm
which regimes are correctly cited here.]`

## Review

This statement will be reviewed at least annually, and whenever a significant change is made to the
website or platform.
