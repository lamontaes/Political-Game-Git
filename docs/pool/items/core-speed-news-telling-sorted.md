---
id: core-speed-news-telling-sorted
title: "Telling the news sorts and filters each teller's recent stories again every day"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-news-telling
pr: #6073
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:23:30.762Z
---

**What.** In Long Hill, Connecticut's played year (seed m7b), the news engine's onRelationshipChange takes 7.5 s inclusive of a 107 s profiled year, and recentList in src/core2/modules/news.ts takes 1.65 s of it. Each story a person hears marks their recent list unsorted, so the next time they tell news the whole list is sorted again with localeCompare. Each day a teller's first telling also filters their whole list and builds a new set of its ids, though only the stories that just passed the cutoff leave. Keep the list in order as stories are heard, drop only the stale tail when the cutoff moves (the full filter only when an entry may have been heard before the cutoff), and remove dropped ids from the set.

**Rules.** No dice: who hears and tells which story stays exactly the same, by record id. Speed: measured before and after on the same base and machine, both checkouts in one process. Replace, never layer: the old sort goes.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, recentList's inclusive time falls by more than half and the year is no slower; the news, news-telling and press tests pass.

**Files.** src/core2/modules/news.ts

**Notes.** Filed Oct 25 by the speed lead from the by-module profile of the counted renewal branch's paired run (news.ts 9.7 s, second after work.ts).

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/speed-news-telling` at 9e0109ebd5 on main e796c06eee (no code change from 01f5cd4715). Exact: deep fingerprints identical before and after (Long Hill year one `3350c66a3805f1e8`; Stanardsville years one to three `176370fb6d3c2ba1`, `3ccb0a9002236aa5`, `4be9e9254da3aaf3`). Profiled pair 126.4 to 121.3 s (0.960): `recentList` 1.3 to 0.4 s, `recentStoriesHeard` 3.4 to 1.2 s (it now reads the stories table once per telling), the news engine 10.45 to 8.96 s. Plain pair 131.6 to 125.3 s (0.952). The news, news-telling, outcome-news, press and law-knowledge tests pass; typecheck, release check and zero-dice are clean.
