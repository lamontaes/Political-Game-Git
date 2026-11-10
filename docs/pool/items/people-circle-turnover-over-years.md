---
id: people-circle-turnover-over-years
title: "M0-07: nothing checks that a circle's turnover over years matches a sourced study"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/quirky-ride-vrwwz4-circle-turnover
pr: #5913
blocked-on: people-circle-turnover-too-low
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:16:05.149Z
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: m0-m2
---

**What.** Roadmap M0-07's test text ends "over years, circle turnover matches a sourced study". Its command passes on main in Bridgeville, Pennsylvania, but its four tests cover 91 days only: new acquaintances, a tie growing closer, saved reasons and visits inside the GSS and ATUS ranges. No test plays years or compares how many of a person's ties are replaced with a study. Research the turnover rate, then add the multi-year check against it.

**Cause.** Found in code: src/core2/m0-meeting-people.test.ts (the describe at line 104 and its four tests, lines 110 to 151) covers 91 days only; nothing plays years against a sourced turnover rate.

**Fix.** Research the turnover rate of a person's close ties from a fetched study, then add a three-year test in two drawn places that reports the share of the player's circle replaced beside the study's figure and fails if ties never end.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the turnover rate is SOURCED from a fetched study with its citation, and it checks the total, never one tie's fate (No dice). Wire to the world: the check plays a world built with buildBenchWorld in a drawn place.

**Done when.** A second session runs the M0-07 command and sees a test that plays at least three years of a world built with buildBenchWorld in two places drawn from all 56 (place and seed named), reports the share of the player's circle replaced beside the sourced study's figure, and fails when ties never end. The People web shows ties ending in those years.

**Waits on.** people-circle-turnover-too-low (the check passes in two drawn places only after the turnover fix).

**Files.** src/core2/m0-meeting-people.test.ts, src/core2/data/parameters.json

**Notes.** Found by the M0-M2 lead, Oct 24. Blocks roadmap M0-07's flag.

Sent back 2026-10-24 from PR #5913 (branch claude/quirky-ride-vrwwz4-circle-turnover): its Done-when table admits the required two passing drawn-place multi-year runs are not met; expected-red diagnostic evidence does not complete this item; finish on that branch, merge main into it first.

The check itself is bounded by roadmap-m0-07-turnover-check for PR #5913. This item stays open until the check passes in two drawn places, which waits on people-circle-turnover-too-low.
