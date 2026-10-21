---
id: core-speed-press-counted-followers
title: "The press engine's countedFollowers and news reach take 3 percent of a dense town's year"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-press
pr: #5377
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:12:57.008Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), countedFollowers in the press engine takes 5.2 seconds and the press and news files together 13 seconds of 251. The followers of an outlet are counted again each time a story reaches people, though they change only when a person subscribes, moves or dies. Keep the counted followers by outlet and update them on those changes.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One model, two tiers: counted followers are read by the same rule as full ones, times their count.

**Done when.** A profile of npm run speed:year -- --seed m7b --exclusive in the played world after the change shows countedFollowers below 1 percent of the year, and the press and news tests, including the counted-reach checks, pass with the same readers by record id.

**Files.** src/core2/modules/press.ts, src/core2/modules/news.ts

**Notes.** TODO
