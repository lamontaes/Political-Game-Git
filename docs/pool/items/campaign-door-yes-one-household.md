---
id: campaign-door-yes-one-household
title: "A door yes holds for the one household the door reached, not the whole counted record"
area: elections
kind: bug
priority: 1
size: S
status: claimed
claimed-by: governing/door-yes-counted-split
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T22:16:51.687Z
---

**What.** A counted resident record can stand for several real households (its weight), but a campaign's door reaches one of them. After campaign-door-yes-near-binding, a counted resident's yes moves the whole record's vote, so one door adds as many pledged votes as the record's weight, which favors the candidates whose doors reach counted records in larger towns. The split counts that one household on its word and the record's other households as they would have voted without it.

**Rules.** One model, two tiers: a counted record is read by the same rule as a full person times its count, so a door that reaches one household changes one household's vote, never the whole weight. No dice: the split is arithmetic on the record's weight.

**Done when.** src/core2/door-pledge.test.ts passes in a drawn place with the seed it prints and checks that a counted record of weight above one keeps the pledged household's choice in pledgedChoice while its own kept choice is the rest's, and that a record of weight one carries the pledge on its own ballot.

**Files.** src/core2/modules/voting.ts, src/core2/door-pledge.test.ts

**Notes.** TODO
