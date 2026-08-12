# Item histories

One file per brief item. The board carries the current ask; these carry everything else.
Item ids are stable, so `grep` for one to trace a decision.

## 2026-08-12 — the board became a data model

Before this date the board was one giant `t` string per row, mixing the action, the history,
the corrections and the decisions together. 68 rows held **34,747 characters**, and no amount
of clipping made it scannable, because the first line of a row was as likely to be a correction
from three weeks ago as the thing to do next. A human could not use it.

The row is now typed:

| Field | Holds |
|---|---|
| `t` | ONE imperative sentence — the action, nothing else. Max 90 chars. |
| `p` | The problem, in 1–2 sentences. |
| `x` | The fix, or what done looks like. |
| `n` | Optional: the blocker, the decision, the gotcha. |

The collapsed board is now **4,830 characters** — 86% smaller — and every row reads as one line.

**Nothing was discarded.** Every one of the 68 rows has its full pre-restructure text preserved
verbatim in `items/<id>.md` here, under a `## Board text as of 2026-08-12` heading. That is what
a Claude reads before touching the code, and it is the reason the archive was written and
verified on disk *before* a single row was shortened. This directory now holds **118,795
characters** across 68 files.

Every row carries `h:1`, so every row links here. Two rows (`ix-questionpool`, `ix-quizsubset`)
had claimed `h:1` with no file behind it; that is fixed.

## 2026-08-06 — the first capture

32 items whose text had outgrown the board, 42,377 characters reduced to 11,960 (72% smaller).
Those files now carry both captures: the 2026-08-06 text and, where the board moved on before
the restructure, a dated section holding what it said on 2026-08-12.

| Item | Owner | Was | Now |
|---|---|--:|--:|
| [`ix-doublebill`](ix-doublebill.md) | Max | 4,182 | 387 |
| [`ix-legaldrafts`](ix-legaldrafts.md) | Max | 2,760 | 457 |
| [`ix-prodcutover`](ix-prodcutover.md) | Rob | 2,734 | 482 |
| [`ix-monogram`](ix-monogram.md) | Max | 2,098 | 428 |
| [`ix-aitutor`](ix-aitutor.md) | Max | 1,536 | 469 |
| [`ix-cookiespage`](ix-cookiespage.md) | Max | 1,533 | 406 |
| [`ix-lookupkey`](ix-lookupkey.md) | Terminal | 1,475 | 291 |
| [`ix-dnszoho`](ix-dnszoho.md) | Max | 1,469 | 415 |
| [`ix-lessoncounter`](ix-lessoncounter.md) | Terminal | 1,455 | 397 |
| [`ix-adminswap`](ix-adminswap.md) | Terminal | 1,436 | 419 |
| [`ix-legalv2`](ix-legalv2.md) | Max | 1,386 | 360 |
| [`ix-ogimage`](ix-ogimage.md) | Max | 1,376 | 295 |
| [`ix-stripeaudit`](ix-stripeaudit.md) | Max | 1,374 | 483 |
| [`ix-risehosting`](ix-risehosting.md) | Max | 1,318 | 440 |
| [`ix-contactc4`](ix-contactc4.md) | Terminal | 1,240 | 370 |
| [`ix-privacyrise`](ix-privacyrise.md) | Max | 1,226 | 399 |
| [`ix-testfirmfuse`](ix-testfirmfuse.md) | Max | 1,175 | 339 |
| [`ix-inactivityredesign`](ix-inactivityredesign.md) | Terminal | 1,116 | 445 |
| [`ix-cancelemail`](ix-cancelemail.md) | Max | 1,039 | 385 |
| [`ix-authperf`](ix-authperf.md) | Max | 967 | 386 |
| [`ix-cicleanup`](ix-cicleanup.md) | Terminal | 918 | 303 |
| [`ix-termsaccept`](ix-termsaccept.md) | Terminal | 907 | 378 |
| [`ix-mobile390`](ix-mobile390.md) | Max | 904 | 305 |
| [`ix-mig0023`](ix-mig0023.md) | Terminal | 901 | 294 |
| [`ix-winbackflow`](ix-winbackflow.md) | Max | 853 | 382 |
| [`ix-refundnonus`](ix-refundnonus.md) | Rob | 847 | 333 |
| [`ix-favicon`](ix-favicon.md) | Max | 839 | 353 |
| [`ix-featuresunbuilt`](ix-featuresunbuilt.md) | Rob | 839 | 383 |
| [`ix-socialsdead`](ix-socialsdead.md) | Terminal | 805 | 325 |
| [`ix-www522`](ix-www522.md) | Rob | 613 | 264 |
| [`ix-claudemd`](ix-claudemd.md) | Terminal | 546 | 273 |
| [`ix-webhooksecret`](ix-webhooksecret.md) | Rob | 510 | 314 |

Five of those ids (`ix-lookupkey`, `ix-mig0023`, `ix-refundnonus`, `ix-socialsdead`, `ix-www522`)
have since left the board. Their files stay — a retired item is still a decision someone made.
