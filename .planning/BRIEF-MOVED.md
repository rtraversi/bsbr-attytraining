# The brief archive moved out of this repo — 2026-08-17

`.planning/brief-archive/` is gone from here. It now lives in its own repo:

- **Local:** `~/sites/intel-brief/`
- **Remote:** https://github.com/solarsaiko-code/intel-brief (private)

## Why

The board tracks three separate projects, keyed by stable item-id prefix:

| Prefix | Project | Items |
|---|---|---|
| `ix-*` | Iurix (this repo) | 65 |
| `pt-*` | Pentagon | 4 |
| `iq-*` | IurisIQ | 4 |

Two thirds of the board's projects had nothing to do with `bsbr-attytraining`, so the archive was
filed under a project it did not belong to. Anyone reading this repo to understand Iurix was also
carrying Pentagon and IurisIQ history they had no use for.

## Nothing was lost

The move used `git subtree split`, so **all 18 commits of item history came across intact** and are
in the new repo's log. This was not a copy-and-delete. To trace a decision, `grep` the new repo the
same way you would have grepped this one:

```bash
grep -rn "ix-cisecrets" ~/sites/intel-brief/
```

## What still points back here

Item files reference `.planning/POLICY-DECISIONS.md`, `.planning/QUESTION-POOL.md`,
`.planning/PROD-CUTOVER.md` and other Iurix docs. **Those references are still correct** and were
deliberately left alone — they point at files in this repo, which is where they belong. Only the
archive's references to its own location were rewritten.

## The weekly ritual is unchanged

It just runs against the new repo. `README.md` there is still the procedure of record, including
the two editing traps (browser-local status overrides winning over the published `SEED`, and a
straight `"` inside a `t:"..."` value blanking the entire board).
