---
id: core-world-race-lean-candidates
title: "Territory and district races the town doesn't vote in use fictional candidates with records, not each party's typical candidate (SG-GOV-world-race-lean)"
area: core
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-l
pr:
blocked-on:
after: core-race-candidates-with-records-house,core-race-candidates-who-runs,gov-legislative-district-results-2024,gov-legislative-district-results-missing-states
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:40:47.937Z
---

**What.** This is the roll-up for stopgap SG-GOV-world-race-lean in src/core2/modules/world-races.ts: races the town does not vote in use each party's typical candidate, and a legislative district with no read result uses the state's vote at a typical margin. It is replaced in two parts: fictional candidates with records and campaigns for the out-of-town seats (core-race-candidates-with-records-house for the House, core-race-candidates-who-runs for who stands in each seat), and each legislative district's own 2024 result as sourced data (gov-legislative-district-results-2024 and its missing-states part). When all are done this item removes the stopgap row and checks one out-of-town race end to end.

**Rules.** One model, two tiers: an out-of-town candidate is a counted name until met, then filled in from the same record. No dice: who runs and how a district votes follow traits, ambition, party lean and money, never a roll. One rule, all 56 places: districts and candidates come from data, with no state named in logic. Replace, never layer: the typical-candidate path and the typical-margin fallback are deleted. An effect is a read: the town's news and the legislature read the winner of each out-of-town race.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), each out-of-town race shows candidates who each filed with recorded reasons and each legislative district votes from its own 2024 result, by record id; SG-GOV-world-race-lean is gone from stopgaps.json, and src/core2/world-races.test.ts covers it.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/candidacy.ts, src/core2/data/stopgaps.json, src/core2/world-races.test.ts

**Notes.** TODO

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt. The row is SG-GOV-world-race-lean (`world-races.ts`, line 827): races the town does not vote in use each party's typical candidate, and a legislative district with no read result uses the state's vote at a typical margin. The replacement is two things at L size: fictional candidates with records and campaigns for every seat (the people engines' who-runs, seeded generation of who exists), and each legislative district's own 2024 result as sourced data. A builder splits it first: one item for candidates with records for the House seats, one for the legislative-district results data.

Oct 20 (pool feeder): spec written; the earlier note's split already exists (house candidates in a PR, district results in a PR plus a missing-states part); who-runs for Senate and legislature seats is still blocked on a design call, which holds this roll-up.
