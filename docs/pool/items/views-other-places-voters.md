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
model: opus
effort: high
root: design-country-tier
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-views-other-places-voters
---

**What.** Roadmap M1-13 asks that other places' voters' views change from their own conditions within real ranges. The views engine (src/core2/modules/views.ts) keeps views for the town's full and counted people only; races elsewhere are counted from each place's 2024 lean (src/core2/electorate-places.ts), which never moves. So nothing about another place's voters changes in a year, and the new M1-13 check fails the clause. Keep a coarse lean per other place, stepped from that place's own conditions (its jobs, prices and the news it gets), read by the races counted there. Seen: other states' voters and races, whose polls and results now move year to year.

**Cause.** Needs cause. Looked at (opus-5234, Nov 11, PR #8695): the three facts hold (views.ts keeps the town's people only; races elsewhere read each place's 2024 lean in src/core2/electorate-places.ts; src/bench/m1-13-check.ts line 132 fails unconditionally), but the old Fix's premise does not: no rule moves a person's lean from conditions (views.ts `countedLean`: a counted resident's lean is fixed; a full person's view moves only on policy questions through `groupShift` and `caseShift`). Conditions reach a vote as each candidate's standing, from the unemployment and crime the town has heard of (`raceConditions` and `townConditions`, src/core2/electorate-inputs.ts lines 282 to 345); races elsewhere read only the national approval gap (`tideAgainstPresident`, line 131), never their own state's cells (`countryStateNow`). The writer decides whether M1-13's views clause is met by another state's races reading their own conditions through that standing rule, or by a lean that moves.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session.

**Rules.** One model, two tiers: other places' voters move by the same view rule as the town's people, times their count, never a second simulation. No dice: a place's lean moves from its conditions, and real spreads only check the totals.

**Done when.** A second session plays a year of a place drawn from all 56 (place and seed named) and sees other states' coarse leans change from their own conditions with the cause named by record id, a race counted in another place read the moved lean, and the M1-13 command (src/bench/m1-13-check.ts) pass its views clause.

**Waits on.** Nothing. The country tier's state cells are on main (`stepCountry` in src/core2/country-model.ts, read through `countryStateNow` in src/core2/modules/macro.ts).

**Files.** src/core2/modules/views.ts, src/core2/electorate-places.ts, src/bench/m1-13-check.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:19 UTC) on branch claude/pool-views-other-places-voters.

Released (2026-11-11): The Fix's view rule does not exist in the code; the Cause is set to Needs cause with findings on PR 8695. Continue on branch claude/pool-views-other-places-voters.
