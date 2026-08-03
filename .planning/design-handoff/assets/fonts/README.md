# Fonts — read before sending this pack

**The font files are deliberately not committed here.** They are needed for the reference mockups
to render correctly and for the designer to work accurately — but redistributing font binaries to a
third party is a licensing decision, and the licence status of one of them is not verified.

## Licence status

| Font | File | Status |
|---|---|---|
| Stack Sans Headline | `StackSansHeadline-VariableFont_wght.ttf` | **OFL-1.1** — documented in the app source. Redistribution is fine |
| Host Grotesk | `HostGrotesk[wght].ttf`, `HostGrotesk-Italic[wght].ttf` | Believed open-source (Google Fonts family). **Not verified** |
| Kapakana | `Kapakana-VariableFont_wght.ttf` | Believed open-source (Google Fonts family). **Not verified** |
| Gyrotrope | `GyrotropeVF.ttf` | **Unknown.** No licence file accompanied it in the repo. Verify before sending |

Gyrotrope is the one to check — it's the serif carrying most of the display type in two of the three
reference directions, and it's the only file with no traceable provenance in the project.

## To populate this folder

From the repository root, in PowerShell:

```powershell
Copy-Item public\fonts\*.ttf .planning\design-handoff\assets\fonts\
```

Then confirm the licences above permit sharing, and zip the pack.

## If you'd rather not send the binaries

Delete this folder and tell the designer to source the open families from Google Fonts by name. The
reference mockups will fall back to system fonts — they'll read as roughly the right *shapes* but
the display type won't be accurate, so say so if you take this route.
