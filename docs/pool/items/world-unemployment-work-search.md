---
id: world-unemployment-work-search
title: "Unemployment claims check work-search contacts per week"
area: world
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** State unemployment law carries `workSearchContactsPerWeek` (starting-law.json) but nothing reads it. Add it to the unemployment terms in jobs-benefits.ts and have `payClaims` pay a week only when the claimant's search that week meets it.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place with a work-search rule, a claimant who made too few contacts is paid nothing that week, shown by claim and week record ids.

**Files.** src/core2/jobs-benefits.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
