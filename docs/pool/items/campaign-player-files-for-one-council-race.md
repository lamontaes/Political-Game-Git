---
id: campaign-player-files-for-one-council-race
title: "The player is offered one council race, their district's seat or the at-large race, and only while its filing is open"
area: elections
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: governing/one-council-race
pr: #7085
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 23:05 UTC (third batch, a Massachusetts life)
lead: governing
milestone: play-first
claimed-at: 2026-11-01T22:46:57.616Z
---

**What.** Owner, Nov 1 playtest of v0.73.0 in Massachusetts: "So first thing I see is that it just gives me the choice of a bunch of council seats. No, I should only be able to run for one council seat." Campaigns lists three council seats by their holders' names plus Mayor, and the clerk offers six "I want to run for Council member" lines, two of them for November 2027 seats on January 20, 2025. Under the CTO's town council seats ruling, a place's council is elected as its records say: by district, the player may file only for their own district's seat; at-large, the seats up together are one race the player files for once. A race is offered only while its filing period is open.

**Rules.** One rule, all 56 places: the choice reads each place's own election method from data, estimated as at-large where unknown. Wire to the world: playerMayFileFor in src/bench/government.ts reads the filing engine's records, and the clerk and Campaigns read that one answer. No hand-written player text: the race is named as its records name it.

**Done when.** In three drawn places with different election methods (named with seeds), Campaigns and the clerk offer the player exactly the races they may file for that day: one council race (their district's or the at-large race) and the other offices open to them, none whose filing is closed or not yet open; a test asserts it for each method.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** You see one council race you can run for, your own district's or the citywide one, and only when filing is open.

**Screenshot.** Campaigns and the clerk's choices before and after, in a drawn place.

**Files.** src/bench/government.ts, src/core2/modules/campaigns.ts, src/core2/gov-rules/municipal-election-rules.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, third batch (Nov 1, 23:05 UTC, five screenshots, a Massachusetts life). Read: OWNER-DECISIONS (town council seats elected as each place's records say, at-large, by district or mixed; six offices and playerMayFile, Oct 29; every campaign act is a scene), the pool for twins.
