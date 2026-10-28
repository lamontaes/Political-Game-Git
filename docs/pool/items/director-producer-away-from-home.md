---
id: director-producer-away-from-home
title: "A household member brings it up when an evening sitting keeps the player from home"
area: director
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/director-producer-away-from-home
pr: #6449
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:48:19.971Z
---

**What.** The family-absence situation type (a relative at home confronting the player about time their office takes) waits on a producer named away-from-home. The office-day engine records every sitting of a body the player sits on, with its start minute and length, and every member sits whether the player stops for it or not. A sitting that runs past the hour paid work's evening starts keeps the player from home that evening. Nothing reads that today, so the player's household never says a word about the office's hours.

**Rules.** No dice: the scene comes from a recorded sitting, and the household member cast is the one with the closest tie, the record id breaking a tie. Sliding scales and causes: the evening is the core's own workEveningStartMinute, and scenes space by a TUNABLE parameter, never a roll. One rule, all 56 places. Speed: the ledger reads the day's meeting rows through the office-day table, never a scan of history.

**Done when.** In a played world (buildBenchWorld) in a drawn place with the seed named, a one-year test in src/director/circumstance.test.ts where the player is a sitting member of a local body stages family-absence at home on the day of an evening sitting, citing the meeting record id and casting a household member, and the scene web shows one fewer row waiting on a producer.

**Files.** src/director/away.ts, src/director/ledger.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/circumstance.test.ts

**Notes.** TODO
