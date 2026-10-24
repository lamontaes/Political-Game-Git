---
id: play-first-04-town-list-font-and-populations
title: "The town list uses the states' font and shows the population the world opens with"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: one font in the town list (the states' font), and the populations shown are the simulated ones. In the v0.22.10 creator the town list mixes fonts, and its counts come from a different table than the town the world builds. This item sets the list in the states' font and shows each town's count from the same source the world opens with.

**Rules.** One rule, all 56 places: every town list reads its counts from the one source the world opens from. Replace, never layer: the second font and the second count source are removed.

**Done when.** In a drawn place, the town list's names and counts use the state buttons' font, and the drawn town's listed count equals its opening population in the built world, checked by a test, shown by a screenshot.

**Files.** src/bench/creator.ts, src/bench/place-selection.mjs, src/bench/places.ts, src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
