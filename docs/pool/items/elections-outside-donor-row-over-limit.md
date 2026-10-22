---
id: elections-outside-donor-row-over-limit
title: "campaign-turn.test fails on main: an outside donor row is one gift per place group, above the per-donor limit"
area: elections
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/outside-donor-limit
pr: #5819
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-22T04:26:02.744Z
---

**What.** On main, src/core2/campaign-turn.test.ts fails in drawn places: 'a world candidate's turns raise money' gets a donor total of 7452900 against a 350000 per-donor limit (Chama, New Mexico, seed 0a3ed48041c83fd9…), and the donor running-total test reads 900 where it expects 0. Swapping main's test file onto PR #4925 fails the same way, so the cause is on main. Likely askOutsideDonors in src/core2/modules/campaigns.ts records one gift of donors times each per place group, so one donor row stands for many people and passes the limit.

**Rules.** No dice; a counted group is read with the same rule as a full person, times its count; tests draw places from all 56 with bounded retries.

**Done when.** campaign-turn.test.ts passes on three random draws on main, and a counted donor row never stands for more than one donor's legal limit per person (or the test reads it per person), with the rule named in the test.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts, src/core2/campaign-outside-donors.test.ts

**Notes.** TODO

Sent back 2026-10-21 from PR #5819 (branch claude/outside-donor-limit): The new outside-donor count and per-person limit arithmetic describe a legitimate bounded fix, but the donor-index test is narrowed into a new no-check success path. In src/core2/campaign-turn.test.ts:262-265 it now selects only a gift whose donorId does not start outside:, then returns successfully if none is found. A world whose campaign has only outside gifts therefore skips every running-total/index assertion even though it has raised money. Keep the outside-group case separate and make the named-donor/index case use bounded draws or turns that require a nonempty named gift, failing on exhaustion instead of returning. Retain the outside-row per-person cap and verify the count is positive/integer on an exercised outside gift. No standard local gate pass or merge is claimed for this source review.; finish on that branch, merge main into it first.
