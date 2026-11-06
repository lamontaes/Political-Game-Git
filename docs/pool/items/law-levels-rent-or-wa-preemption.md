---
id: law-levels-rent-or-wa-preemption
title: "Law levels: Oregon and Washington bar local rent control"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Oregon (ORS 91.225) and Washington (RCW 35.21.830) were not flagged as barring towns from rent control (docs/reports/law-levels-2026-11-05.md).

**Rules.** Sourced from the statutes the research file already cites in its notes; no other state touched.

**Done when.** Rent stabilization flags OR and WA as barring towns in every phase; a test reads both.

**Files.** data/research/laws/starting-law-2026/housing-land-use.json,src/core2/rent-or-wa-preemption.test.ts

**Notes.** TODO
