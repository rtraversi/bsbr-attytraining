# Reference directions

Three complete homepage directions, built in-house. Open the `.html` files directly in a browser.

**These are taste references, not specifications.** You are not being asked to pick one, refine one,
or stay inside them. They exist so you can see the brand palette applied at full page scale and
understand the register being aimed at. If your own direction is stronger, propose it.

| File | Direction | Register |
|---|---|---|
| `direction-a-marble-and-rule.html` | **Marble & Rule** | Light and editorial. Marble ground, hairline rules, serif display. The certificate as a printed instrument. Calm authority |
| `direction-b-deep-water.html` | **Deep Water** | Dark jewel. Near-black teal so the metallic mark reads as drawn. Very large, very light display type. Premium software |
| `direction-c-the-record.html` | **The Record** | Systematic and gridded. Mono metadata, filled teal bands, a tabular sanctions docket, and the certificate itself as the hero object |

## What's shared across all three

All three use the **same copy and the same section order**, which is the approved content in
`../03-copy.md`. All colours are sampled from the logo. All type comes from fonts already
self-hosted in the production app.

Notably, all three replace the old site's "coming soon" block and email waitlist with a **real
checkout call to action** — that change is a requirement, not a stylistic choice.

## Two rendering caveats

1. **Fonts.** These will fall back to system fonts until `../assets/fonts/` is populated — see the
   README there. Judge layout and colour; treat the type as approximate until then.
2. **The mark loads slowly.** Each page pulls the raw 3.4 MB auto-traced SVG two or three times, so
   it may appear a beat late. That's known optimisation debt, documented in `../02-brand.md`, not a
   design flaw.

## What each one is trying to solve

Worth knowing, because these are the live open questions:

- **How the logo sits at nav size.** The mark is detailed and goes muddy below ~32 px. A solves it
  by pairing it with a serif name; B by letting it glow against dark; C by giving it a bordered cell.
- **How to set the name without a wordmark.** No wordmark asset exists (see `../02-brand.md`). Each
  direction type-sets it differently on purpose — serif over a spaced descriptor, letterspaced caps,
  and serif inline.
- **Where rose gold is allowed to appear.** All three restrict it, but by different rules. It's a
  small palette and the accent is easy to overuse.
