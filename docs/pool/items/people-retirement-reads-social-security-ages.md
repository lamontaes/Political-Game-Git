---
id: people-retirement-reads-social-security-ages
title: "Retirement claims read the Social Security ages from the law in force"
area: people
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/people-retirement-ssa-ages
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T08:11:43.525Z
---

**What.** `socialSecurityAges(api, birthDate)` (laws.ts) returns the earliest, full and delayed-maximum ages from the federal law in force, but retirement claims still read src/core2/data/social-security-ages.json. Make `fullRetirementAgeMonths` and the claim bounds read the law, and delete the JSON copy.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** When Congress raises the full age in a played year, a retiree's claim date moves, shown by the law row id and the claim record id (the retirement-claims test covers this once the data copy is gone).

**Files.** src/core2/retirement-claim.ts, src/core2/modules/retirement-claims.ts, src/core2/data/social-security-ages.json

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
