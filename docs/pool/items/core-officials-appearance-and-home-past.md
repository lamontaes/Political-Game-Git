---
id: core-officials-appearance-and-home-past
title: "Officials are filled in with a stored look, a past in their home state, and the inauguration has its venue"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: m0-m2
source: CTO opening root-cause report, Oct 27
---

**What.** An official is filled in with only a gender as their looks (src/core2/state.ts:2664), so the figure chooser rerolls their look per picture: Representative Saunders (official:term:seat:US-IA:us-house:01:2025-01-20) wore figure 38 then figure 02 in Iowa City, seed 28c0b8150290. National officials are filled in at the player's state (src/core2/modules/officials.ts:711), so the President from Wyoming went to school in Iowa. The inauguration record (src/core2/modules/offices.ts:627) has the player's town as its place, so nothing says where the oath was taken. Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Wire to the world: the appearance seed is written once at fill-in, as residents' are, and read by every figure chooser. One rule, all 56 places: an official's deep past is placed at their home-state record for national offices and their seat's state otherwise. Replace, never layer: no second appearance field.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, every seated official's person record id carries an appearanceSeed, the President's school:cohort-estimate records sit in the state their home-state record names, and the inauguration record's place is the Capitol's; a test beside src/core2/officials-deep-past.test.ts checks all three.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/state.ts, src/core2/modules/officials.ts, src/core2/modules/offices.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: m0-m2.
