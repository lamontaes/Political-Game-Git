---
id: web-lag-law-before-opening-reads-none
title: "The outcome web reads a law as absent before the opening, so repealing an opening law skips its lag"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/web-reach-health-played
pr: #6006
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T02:07:02.849Z
---

**What.** The outcome web reads a law's value lagMonths back (lawValue in src/core2/modules/outcome-web.ts:145, used by effectOf). A starting policy-question row is dated at the opening (src/core2/modules/laws.ts:194, the earlier of today and the answers' date), so for any month before the opening the web reads no law. When a law in force at the opening is repealed, its lagged value reads as none, not yes, and the repeal's full effect shows in the first month instead of after the lag. Seen in the laws lead's checker run: right-to-work-to-turnout (lag 12 months) at 0.031 in Uehling, Nebraska (seed 5e27b0c4196fd3a8) in 2025-01, the month right-to-work was repealed.

**Rules.** Sliding scales and causes: a lagged effect follows its law's change by the researched lag, never the opening's bookkeeping. One rule, all 56 places: the fix reads every place's opening law the same way, from data.

**Done when.** In a played world (buildBenchWorld, a drawn place, seed named) where a policy-question law is in force at the opening, a test repeals it and shows its lagged web link moving only after lagMonths, naming the month row ids, while the control world shows no effect. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/outcome-web.ts, src/core2/modules/laws.ts

**Notes.** Fixed by #6006 (`web-reach-health`), effects lead, Oct 25: the web now reads a date before the calibration date as the law stood on that date (`causeAt` in `src/core2/modules/outcome-web.ts`). Its played test repeals the Medicaid expansion in Magas Arriba, Puerto Rico (seed `cd8115b11913aa3f`); the 12-month mortality link stays at no effect until `web:jurisdiction_2e69284a5d5f9738:2026-02`, and the break-it check with the old reading fails at once.

Merger 2: Sent back 2026-10-26 from PR #6006 (branch claude/web-reach-health-played), checked47f3b2c2d840c282a1fe44a5e9913f49ed7c647e: third Done-when row explicitly requires a control world showing no effect, but outcome-web-health-played.test.ts156-177 builds one treated world and291 calls play once; expected305-334/pre-lag or restored-law zeros are from that same treated world. Add an actual same-seed generated control without the experimental repeal, assert its named month rows alongside treatment through the relevant lag, account for natural legislature changes and retain410-day boundaries/low-income own-group/full-count records. The lag-item rescope fixes the prior scope return; web-reach-health stays OPEN for coverage. No local green gate or new world failure claimed; finish on that branch with main merged first. Exact return: https://github.com/lamontaes/Political-Game-Git/pull/6006#issuecomment-6406413429.
