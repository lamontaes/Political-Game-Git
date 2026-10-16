---
id: people-retirement-reads-social-security-ages
title: "Retirement claims read the Social Security ages from the law in force"
area: people
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4646
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `socialSecurityAges(api, birthDate)` (laws.ts) returns the earliest, full and delayed-maximum ages from the federal law in force, but retirement claims still read src/core2/data/social-security-ages.json. Make `fullRetirementAgeMonths` and the claim bounds read the law, and delete the JSON copy. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** When Congress raises the full age in a played year, a retiree's claim date moves, shown by the law row id and the claim record id (the retirement-claims test covers this once the data copy is gone).

**Files.** src/core2/retirement-claim.ts, src/core2/modules/retirement-claims.ts, src/core2/data/social-security-ages.json

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4646 (branch claude/people-retirement-ssa-ages): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
