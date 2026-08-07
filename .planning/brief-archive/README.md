# Brief archive

The **Weekly Intel Brief** is Max's live task board:
https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075

It carries **open work only**. Once an item is done it is retired to a dated file in this folder,
verbatim, and removed from the board. That is what keeps it *weekly* rather than an ever-growing log.

## The board's source lives here too

`weekly-brief.html` in this folder **is** the board. Publishing it renders the artifact above;
before 2026-08-06 the only copy was on one machine and in the published page, which is the same
single-place problem this archive exists to fix. Edit this file, then republish to the same URL.

## Why the archive lives in the repo

Rob and Max work on different machines, so the repo is the only shared source of truth. An archive
that lived only in a browser or a chat would be invisible to one of them, and the board's local
state has already been lost once.

## Finding something

Item IDs (`ix-*`, `pt-*`, `iq-*`) are **stable and survive rewording**, so they are the handle:

```bash
grep -rn "ix-cisecrets" .planning/brief-archive/
```

Every archived entry keeps its full original text, including the verbatim decision quotes and the
corrections made to earlier claims. If a decision needs tracing, it is here, not in the board.

## The weekly ritual

Run this once a week. Steps 1 and 4 are Max's; 2 and 3 are Claude's.

1. **Max exports local changes.** The board's *Export my changes* button lists every status flip,
   owner change and objective logged in the browser. Those live in `localStorage` **only** and have
   been lost before. Paste the export to Claude.
2. **Claude bakes the export into the file**, so browser state stops being load-bearing.
3. **Claude archives everything now done** into `YYYY-MM-DD-done.md` here, strips those rows from
   the board's `SEED`, bumps the `ARCHIVED` counter, and republishes to the same URL.
4. **Max resets local overrides** in the browser once the bake-in is confirmed, so the board reads
   from the file again rather than from stale local state.

### Two traps worth not rediscovering

- **`stOf` reads `ovrSt[t.id] || t.s`.** A status toggled in Max's browser **overrides** whatever
  the file says for that ID. If a freshly published change does not appear, that is a stale local
  override, not a failed edit.
- **Never put a straight `"` inside a `t:"..."` value in the `SEED`.** It terminates the string,
  makes the whole script a syntax error, and renders the board **completely blank**, which is
  indistinguishable from total data loss. This happened on 2026-08-04. Use curly quotes, and parse
  the `SEED` under `node` before publishing rather than trusting the diff.

## Files

| File | Retired on | Items |
|---|---|---|
| `2026-08-06-done.md` | 2026-08-06 | 76 |
| `2026-08-07-done.md` | 2026-08-07 | 3 |

> ⚠ The `76` above does not reconcile with that file's own "Iurix (81 items)" heading or with the
> `ARCHIVED` counter, which read 81 before today. Five items were retired into it after this table
> row was written (`ix-devsandbox` in `af41706` among them) without the row being updated. Left as
> found rather than guessed at. Today's `+3` is exact: the counter moved 81 → 84.

### A third failure mode, found 2026-08-07

The two traps below are about *editing* the board. This one is about **not editing it**: three items
(`ix-enrollorder`, `ix-multialert`, `ix-socialsdead`) sat on the board describing bugs that had
already been fixed in code days earlier, because the sessions that closed the code never closed the
board row. It was caught only because the next batch of work was scoped by reading the code rather
than trusting the board, and it would otherwise have sent someone to fix three things that were
already correct.

**So: when a fix lands, retire the row in the same pass.** If that is not possible, the weekly ritual
must verify each open row against the code, not just collect the ones already marked done.
