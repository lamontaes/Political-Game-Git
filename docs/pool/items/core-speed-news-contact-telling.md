---
id: core-speed-news-contact-telling
title: "Each new contact between two people walks the teller's heard stories through a generator and fetches every story, even when nothing is owed (Grand Haven, Michigan: about 10 s under relationship changes)"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-news-contact
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T08:01:55.481Z
---

**What.** Every relationship change fans out to the news engine's onRelationshipChange in src/core2/modules/news.ts, which walks each side's recently heard stories through a generator and fetches each story before checking whether the listener already heard it, even when the teller owes no story at all. A Grand Haven, Michigan profile (seed spd-d, a 223 s profiled year) put relationship() at 12.3 s, news onRelationshipChange at 9.6 s and recentStoriesHeard at 1.5 s. The trait leans that decide believing and passing on a story are recomputed for every call, and several helpers create closures per call.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** onRelationshipChange skips the walk when nothing is owed and fetches a story only when it is judged, and a decision table's trait lean is kept per person's lean object; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/modules/news.ts, src/core2/trait-decisions.ts, src/core2/choice.ts, src/core2/heard-claims.ts

**Notes.** TODO
