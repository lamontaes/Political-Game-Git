---
id: tests-opening-adults-cash-red-malaeimi
title: "opening-adults-cash.test fails in Malaeimi, American Samoa: 33 of 126 resident adults hold no cash (seed b46fc844a2e79fa2)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/opening-adults-cash-territory
pr: #5939
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T12:11:24.609Z
---

**What.** src/core2/opening-adults-cash.test.ts fails on clean main 185d76d7ce for GOLDEN_PATH_SEED=b46fc844a2e79fa2, which draws Malaeimi, American Samoa. 33 of 126 resident adults hold nothing at the opening, a share of 0.262 against the test's survey bound of 0.232; the explained groups it names are 45 officials in posts with no salary row (gov-unpaid-posts-officials-no-income), one election chief and three husk-tier kin. Either the island area's resident adults open with too little cash, or the bound should read the territory's own survey; find which from the records and fix that, without loosening the test.

**Rules.** Estimate, never UNKNOWN: an adult's opening cash starts from the place's own survey figure with a spread. One rule, all 56 places: the check holds in every drawn place, territories included. Never narrow or skip a test.

**Done when.** npx vitest run src/core2/opening-adults-cash.test.ts passes in the played world (buildBenchWorld opening) for GOLDEN_PATH_SEED=b46fc844a2e79fa2 (Malaeimi, American Samoa) and for two other drawn island-area places, naming each place and seed, with the same bound or one read from the territory's own sourced survey.

**Files.** src/core2/opening-adults-cash.test.ts

**Notes.** Found Oct 24 by the speed lead while testing core-speed-journal-posting-in-play; red on main with the same seed, not caused by that change. PR #5046 (island-area governments have a budget) may be related.
