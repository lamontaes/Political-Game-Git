---
id: core-speed-drives-offers-filter-first
title: "A cause holder's group and public-figure offers check the nearby groups and known figures before sorting, not every group on the topic for each drive"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Johnstown, Ohio (key 3939340, drawn from all 56 by seed band-2026-10-26), on main with every open speed change, the drives engine's offers (src/core2/modules/drives.ts) grow from 0.32 s of year one to 5.83 s of year three, with groupKnown alone 3.54 s, as drives and cause groups pile up: part of that town's third year running 1.27 times its first. For each drive a holder serves, the known-cause-group and volunteer-place offers copy and sort every group the world has founded on the topic, then check each one's knowledge fact or membership before checking it meets nearby; known-public-figure copies and sorts everyone the person knows once per drive. Test the cheap nearby check first, sort only what passes, and work out a person's known figures once per call.

**Rules.** Speed: a town's year runs in under two minutes and year three within 1.2 times year one; never scan more than a call needs. No dice: the offers, their order and every choice made from them stay exactly the same. Replace, never layer: the repeated work is removed at its callers, with no cache.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) every deep fingerprint is identical before and after; a CPU profile of Johnstown, Ohio's third year (seed band-2026-10-26) shows the drives offers' inclusive time lower; and the drives tests pass.

**Files.** src/core2/modules/drives.ts

**Notes.** Filed Oct 26 by the speed lead from Johnstown's year one and year three profiles (speed-year-three-within-band). Not the dropped core-speed-cause-group-offers-per-topic, which shared one topic's checks across drives and saved nothing; this one skips the far groups' checks and the sorts. #6044, #5972 and #6082 also change drives.ts, in other hunks; each merges with this change without conflict.
