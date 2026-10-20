---
id: jobs-no-openings-in-small-towns
title: "A small town's employers open no position in a whole year: Fort Laramie, Wyoming has 27 businesses, 7 separations and 0 openings"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-3xfqef
pr: #5203
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:00:27.308Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Fixed on claude/political-game-pool-3xfqef (Fort Laramie, Wyoming, place 5628230, seed off:0, 365 days from 2026-10-12, buildBenchWorld two-level): `reviewEmployers` kept a shrink carried from earlier months as negative `need`, so a leaver's vacancy (+1) in a firm short of staff stayed under 1 for months until the leaver was cleared when the firm's demand target dipped; positions opened went from 5 to 7 of about 21 separations. The rest are firms whose demand target is below their staff, which attrition shrinks by design. Test: src/core2/jobs-leaver-refilled.test.ts.
