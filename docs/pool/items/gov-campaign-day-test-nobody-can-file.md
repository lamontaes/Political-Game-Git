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

**What.** TODO

**Rules.** TODO

**Done when.** TODO **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** TODO

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.
Oct 27 (claude pool worker): the item body is a stub (What, Rules, Done when and Files are all TODO), so it goes back to its writer for a SMART body. Evidence for the writer: src/bench/campaign-day-controls.test.ts (run as `npx vitest run src/bench/campaign-day-controls.test.ts`; the core2 vitest config does not include src/bench) passed on fresh seeds cd1 (Brady, Washington, 5307590) and cd2 (Huson, Montana, 3038275); it already redraws up to six places (PLACES) until a candidate can file, so the failure in the title (none of the five richest adults aged 35 or more can file) was not seen. The failing seed was never recorded.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART or close.
