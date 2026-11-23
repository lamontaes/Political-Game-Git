---
id: tests-outcome-news-depauville-forgets-the-printer
title: "At Depauville, New York, a reader moved by a printed story does not remember which station printed it"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: news
model: opus
effort: medium
source: "Interview check thread, Nov 14, 2026, gating #9267 on train 9ed4bf9c"
root: none
claimed-at:
branch: claude/project-thread-sew1gc
---

**What.** A resident who reads two stories from the same paper or station on the same day keeps only the second as the outlet's story, so the first can no longer be brought up or traced to the outlet that printed it. `src/core2/outcome-news.test.ts`, case "moves a reader's view through an ordinary year's condition stories", fails this way at Depauville, New York (seed 6f8bd0dad10d6bec) on the clean train head 9ed4bf9c4b065f8c4d260fd3431b28e7a35ab936 and on #9267 alike: "person_2f3831b8525a64f7 on 2025-04-15 by news.read:printed:outlet:television:3:jurisdiction_4850c25f2c63744f:outcome-web.month:jurisdiction_4850c25f2c63744f:2025-04:2025-04-15:repeal:budget-line:police: remembers who printed it: expected false to be true". It passes at the other draws seen (Olive Hill, Kentucky). Seen: a neighbor who read two stories in the town paper that day brings up only the later one.

**Cause.** Measured: `OUTCOME_NEWS_SEED=6f8bd0dad10d6bec npx vitest run src/core2/outcome-news.test.ts -t "ordinary year"`, red the same way on 9ed4bf9c and on #9267's head dfca8cf1. Measured Nov 15 on train 2190669e with a probe on the stance listener at Auburn, Wyoming (seed 9a4f2c7e1b03d865): person_64c1b3443a961f64 heard two newspaper:0 stories on 2025-02-25 (a board bill vote and the county police budget line), and the one fact `printed:organization:press:newspaper:0:<town>:story` held only the second, so the reading of the first no longer finds which outlet printed it. Found in code: `printItem` (src/core2/press-desk.ts) wrote that one key per outlet as a story fact, and bring-it-up's story row (src/director/data/bring-it-up-rows.json) matched it, so every story an outlet printed replaced the last one a reader could bring up from it. Auburn and Casper Mountain, Wyoming (e07b3d91a6c25f48) failed the case the same way.

**Fix.** The news engine already keeps one fact per story heard, `news:<story>:outlet`, whose value is the outlet that printed it. A reading of a printed story now carries that fact, so each reader perceives it story by story, and bring-it-up's story row reads it (the outlet from its value). The one-per-outlet `printed:<outlet>:story` fact is deleted. Pinned regression: src/director/bring-it-up-two-stories.test.ts at Auburn, Wyoming (9a4f2c7e1b03d865).

**Time box.** 2 hours.

**Rules.** No dice. One rule, all 56 places.

**Done when.** The case passes at Depauville, New York, seed 6f8bd0dad10d6bec, and at one more drawn place named with its seed, and a second session sees a resident bring up a story with the right station's name after two stories from that station ran the same day.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/outcome-news.test.ts

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-sew1gc since 2026-11-15 19:13 UTC, more than twice its 2-hour time box. Continue on branch claude/project-thread-sew1gc.
