---
id: core-speed-coverage-rows-owned
title: "Medical bill and counted premium rows are frozen in place, not copied (records identical)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: speed/coverage-owned
pr: #8093
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-10T01:16:18.509Z
---

**What.** Health coverage is 8.5 s of Gunnison UT's election year (key 4932660, seed n8f6): each month every household's medical bill row and every counted household's premium row is deep-copied on write (plainCopy), though each is built fresh for that write and never touched again. Write them with putOwned.

**Rules.** Exact (CTO, Nov 9 7:40 p.m.): the records proof is identical; only timing differs. No dice.

**Done when.** speed:year on Gunnison, Utah (key 4932660, seed n8f6) and Dickey, North Dakota (seed n8g7), four years each, on main and the branch on the same commit with --same-records gives identical fingerprints every year, with the timed pairs in the PR body.

**Files.** src/core2/medical-bills.ts, src/core2/modules/coverage.ts

**Notes.** TODO
