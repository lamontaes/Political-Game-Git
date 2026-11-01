---
id: gov-campaign-day-test-nobody-can-file
title: "campaign-day-controls.test fails in some places: none of the five richest adults aged 35 or more can file"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The test in src/bench/campaign-day-controls.test.ts draws a place from all 56, builds its played world, and tries to file the richest adults aged 35 or more (most liquid money first) for a local office, so it can check the campaign day's choices. The title says it fails in some places because none of the five richest such adults can file, but the failing place and seed were never recorded. On Oct 27 a pool worker ran it on fresh seeds cd1 (Brady, Washington, 5307590) and cd2 (Huson, Montana, 3038275) and it passed, and the test now redraws up to six places and tries up to 60 of the richest adults until five have filed, so the failure in the title may already be fixed. The first job is to find a failing draw by running the test on fresh seeds.

**Rules.** One rule, all 56 places: a failing draw is named with its place and seed, and the cause is found in why fileCandidacy refuses the filing and fixed in the filing records or in how the test picks candidates, never by naming a place or skipping or narrowing the test.

**Done when.** src/bench/campaign-day-controls.test.ts passes on three fresh drawn places with each place and seed named in the PR body, and if a draw is found where no adult can file, its place and seed are named with the reason fileCandidacy refused, shown by the test failing before the fix and passing after; if no failing draw is found, the item is closed with the draws listed. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/bench/campaign-day-controls.test.ts, src/core2/modules/elections.ts, src/core2/modules/offices.ts

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.
Oct 27 (claude pool worker): the item body is a stub (What, Rules, Done when and Files are all TODO), so it goes back to its writer for a SMART body. Evidence for the writer: src/bench/campaign-day-controls.test.ts (run as `npx vitest run src/bench/campaign-day-controls.test.ts`; the core2 vitest config does not include src/bench) passed on fresh seeds cd1 (Brady, Washington, 5307590) and cd2 (Huson, Montana, 3038275); it already redraws up to six places (PLACES) until a candidate can file, so the failure in the title (none of the five richest adults aged 35 or more can file) was not seen. The failing seed was never recorded.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close.
