---
id: core-speed-year-over-limit-dense-town
title: "A dense town's game year takes 194 to 214 seconds, over the 120-second limit (Long Hill, Connecticut, seed m7b)"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/dense-speed
pr: #5372
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:04:35.914Z
---

**What.** Measured Oct 20, 2026 on a 4-core cloud container with nothing else running: npm run speed:year -- --seed m7b --exclusive, a played year in Long Hill, Connecticut, takes 194, 200 and 214 seconds in three runs, over the 120-second limit in AGENTS.md. The same command on seed m7a, Discovery Harbour, Hawaii, takes 52 seconds, so the cost follows the town's size. A CPU profile of the 251 seconds shows no single hotspot: garbage collection is 52 seconds, and the largest named functions are 3 to 6 seconds each. This umbrella item is done when the parts filed beside it, found by that profile, bring the year under the limit.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One rule, all 56 places: the check draws its place from all 56 and names it and the seed.

**Done when.** npm run speed:year -- --seed m7b --exclusive on the same container finishes the played year in Long Hill, Connecticut in under 120 seconds in three runs, and seed m7a stays within 20 percent of its 52 seconds; the receipts from before and after go in the PR body with the profile's top functions.

**Files.** src/core2/life.ts, src/core2/modules/press.ts, src/core2/kernel/dates.ts, scripts/speed-years/run.ts

**Notes.** TODO
