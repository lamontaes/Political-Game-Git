---
id: elections-outside-donor-row-over-limit
title: "campaign-turn.test fails on main: an outside donor row is one gift per place group, above the per-donor limit"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5819
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, src/core2/campaign-turn.test.ts fails in drawn places: 'a world candidate's turns raise money' gets a donor total of 7452900 against a 350000 per-donor limit (Chama, New Mexico, seed 0a3ed48041c83fd9…), and the donor running-total test reads 900 where it expects 0. Swapping main's test file onto PR #4925 fails the same way, so the cause is on main. Likely askOutsideDonors in src/core2/modules/campaigns.ts records one gift of donors times each per place group, so one donor row stands for many people and passes the limit.

**Rules.** No dice; a counted group is read with the same rule as a full person, times its count; tests draw places from all 56 with bounded retries.

**Done when.** campaign-turn.test.ts passes on three random draws on main, and a counted donor row never stands for more than one donor's legal limit per person (or the test reads it per person), with the rule named in the test.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts, src/core2/campaign-outside-donors.test.ts

**Notes.** TODO
