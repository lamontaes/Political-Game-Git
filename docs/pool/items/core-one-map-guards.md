---
id: core-one-map-guards
title: "Fix the two guards the place map turned red (families, English spelling)"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: one-map-families
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T01:42:33.822Z
---

**What.** The place map was never registered in an engine family, imported rule packs across families, and held real Census names that the spelling scan flags. Register it, move the four-slot resolution into the gov-rules family, lower the baselines that shrank, and exempt the map file like the other Census place files.

**Rules.** Red main comes first; guards only shrink.

**Done when.** families and english guards pass on a branch from main.

**Files.** tests/guards/families.json

**Notes.** TODO
