---
id: gov-officials-positions-from-views
title: "State and federal officials' positions behind votes come from the views engine"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4713
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Local members' positions read the views engine (`viewOn` in legislature.ts), but state and federal officials' positions (`officialStance` in officials.ts, read by world-legislating.ts) come from their data signature. Make them read `viewOn` too, with the data signature as their opening lean only. Wire it so a case made to an official moves their vote, with the stance record and the way they learned of the matter named.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place, a state legislator's vote cites a stance from their views, with the stance record id and how they learned of the matter, and a case made to them moves it, shown by a test in src/core2/views.test.ts.

**Files.** src/core2/modules/officials.ts, src/core2/modules/world-legislating.ts, src/core2/modules/views.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4713 (branch claude/officials-stance-views): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
