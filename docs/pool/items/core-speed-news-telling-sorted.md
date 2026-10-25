---
id: core-speed-news-telling-sorted
title: "Telling the news sorts and filters each teller's recent stories again every day"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-news-telling
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:23:30.762Z
---

**What.** In Long Hill, Connecticut's played year (seed m7b), the news engine's onRelationshipChange takes 7.5 s inclusive of a 107 s profiled year, and recentList in src/core2/modules/news.ts takes 1.65 s of it. Each story a person hears marks their recent list unsorted, so the next time they tell news the whole list is sorted again with localeCompare. Each day a teller's first telling also filters their whole list and builds a new set of its ids, though only the stories that just passed the cutoff leave. Keep the list in order as stories are heard, drop only the stale tail when the cutoff moves (the full filter only when an entry may have been heard before the cutoff), and remove dropped ids from the set.

**Rules.** No dice: who hears and tells which story stays exactly the same, by record id. Speed: measured before and after on the same base and machine, both checkouts in one process. Replace, never layer: the old sort goes.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, recentList's inclusive time falls by more than half and the year is no slower; the news, news-telling and press tests pass.

**Files.** src/core2/modules/news.ts

**Notes.** Filed Oct 25 by the speed lead from the by-module profile of the counted renewal branch's paired run (news.ts 9.7 s, second after work.ts).
