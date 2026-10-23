---
id: world-owner-property-tax-stays-in-town
title: "An owner's property tax is paid to the treasury, not left out of the outside shelter cost"
area: world
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #4695
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The shelter note (housing-shelter.ts) says an owner's taxes still leave the town: the property tax is wired to the treasury but the outside shelter cost still includes it. Subtract the tax from the outside shelter cost so no dollar is taxed twice.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place an owner's property tax appears once, on the journal to the treasury, by tax and shelter record ids.

**Files.** src/core2/housing-shelter.ts, src/core2/modules/budgets.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4695 (branch claude/owner-property-tax): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
