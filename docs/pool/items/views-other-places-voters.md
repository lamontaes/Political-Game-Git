---
id: views-other-places-voters
title: "M1-13: other places' voters have no views to change; the views engine holds only the town's people"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: design-country-tier
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-views-other-places-voters
---

**What.** Roadmap M1-13 asks that other places' voters' views change from their own conditions within real ranges. The views engine (src/core2/modules/views.ts) keeps views for the town's full and counted people only; races elsewhere are counted from each place's 2024 lean (src/core2/electorate-places.ts), which never moves. So nothing about another place's voters changes in a year, and the new M1-13 check fails the clause. Keep a coarse lean per other place, stepped from that place's own conditions (its jobs, prices and the news it gets), read by the races counted there. Seen: other states' voters and races, whose polls and results now move year to year.

**Cause.** Found in code: (opus-5234's findings, Nov 11, PR #8695, read against main) no voter anywhere holds a lean that conditions move, and none should be added for other places alone. A counted resident's lean is fixed (`countedLean`, src/core2/modules/views.ts), and a full person's view moves only on policy questions (`groupShift`, `caseShift`). Conditions reach a vote one way: as each candidate's standing, from the unemployment and crime the town has heard of (`raceConditions` and `townConditions`, src/core2/electorate-inputs.ts lines 282 to 345). Races elsewhere call `raceConditions` with `townPlaceId: null` (src/core2/modules/voting.ts, the calls at about lines 3634, 4609 and 5277), so they read only the national approval gap (`tideAgainstPresident`, line 131) and never their own state's cells, which the country tier keeps (`countryStateNow`, src/core2/modules/macro.ts line 268). And src/bench/m1-13-check.ts (about line 135) fails its views clause unconditionally. Under one model, two tiers, "other places' voters change from their own conditions" means their races read their own state's conditions through the same standing rule as the town's, not a second view model.

**Fix.** (1) In `raceConditions` (src/core2/electorate-inputs.ts), give a race outside the town its state's conditions: its unemployment against its base from `countryStateNow(api, fips).now` and `.base`, cited by the tier's state row id as its record id, in the same `town` field shape the standing rule reads (crime stays 0; the tier keeps no crime). A coarse state hears its own conditions without a story, since the country tier has no news of its own; register that as a stopgap with its reason. (2) In src/bench/m1-13-check.ts, replace the always-failing views clause: over the played year, at least one race counted in another state reads its own state's unemployment change, by state row id, and its standing differs from what the national tide alone gives. (3) Leave views.ts unchanged. Say in the PR body that M1-13's views clause is now read as the standing rule, and ask the CTO to confirm the reading.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: other places' voters move by the same view rule as the town's people, times their count, never a second simulation. No dice: a place's lean moves from its conditions, and real spreads only check the totals.

**Done when.** A second session plays a year in a drawn place from all 56 (place and seed named) and sees a race counted in another state read its own state's unemployment change by record id (the tier's state row), with its standing moved from the national tide by it. The M1-13 command (src/bench/m1-13-check.ts) passes its views clause on that draw.

**Waits on.** Nothing. The country tier's state cells are on main (`stepCountry` in src/core2/country-model.ts, read through `countryStateNow` in src/core2/modules/macro.ts).

**Files.** src/core2/electorate-inputs.ts, src/core2/modules/voting.ts, src/core2/modules/macro.ts, src/bench/m1-13-check.ts, src/core2/data/stopgaps/core.json

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:19 UTC) on branch claude/pool-views-other-places-voters.

Released (2026-11-11): The Fix's view rule does not exist in the code; the Cause is set to Needs cause with findings on PR 8695. Continue on branch claude/pool-views-other-places-voters.

Nov 11 (cause finder for Fable B): wrote the design opus-5234 left open. Other places' races read their own state's conditions through the standing rule the town's races use, from the country tier, instead of a new lean nobody else has. The CTO is asked in the PR to confirm that reading of M1-13.
