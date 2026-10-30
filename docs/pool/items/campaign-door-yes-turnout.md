---
id: campaign-door-yes-turnout
title: "A door yes is also a word to vote: residents who pledge turn out like people who said they would"
area: elections
kind: bug
priority: 1
size: S
status: claimed
claimed-by: governing/door-yes-turnout
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T01:43:32.664Z
---

**What.** A resident who tells a campaign at the door that they will vote for its candidate turned out no more often than anyone else, because the turnout rule read the pledge only through the appeal gap. In Mount Auburn IL on Oct 29, 41 door yeses gave the player 9 votes at 8% turnout, so the near-binding yes rarely reached a ballot. Saying you will vote for someone is also saying you will vote, and people who say so mostly do.

**Rules.** No dice: the pledge adds a sliding part to the voter's own readiness, read from the pledge record and how far it still holds, and each voter still turns out by their own reasons. One model, two tiers: a counted record gets the same part, scaled by the share of its households the door reached.

**Done when.** src/core2/door-pledge.test.ts passes in a drawn place with the seed it prints: every pledged voter who voted carries a pledge part in their ballot's turnout reasons, and where at least five pledged, the pledged residents turn out at a higher share than the town's other adults.

**Files.** src/core2/modules/voting.ts, src/core2/turnout.ts, src/core2/data/campaigns/parameters.json, src/core2/door-pledge.test.ts

**Notes.** TODO
