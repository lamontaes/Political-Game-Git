---
id: core-opening-pay-reads-start-law
title: "Opening pay reads the start date's minimum wage law"
area: core
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4649
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `population.ts` (near line 782) calls `townJobRate` with no minimum, so it floors opening pay with the old table of later-2026 rates (Alaska opens at $14 in January 2025; the law in force then is $13). Pass the minimum from the `minimum-wage` rows the start date's starting law gives. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place the opening's lowest wage equals the minimum wage in force on the start date, by law row id, and a state whose rate rose after January 2025 opens at the January rate. A test proves it.

**Files.** src/core2/population.ts, src/core2/modules/laws.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4649 (branch claude/core-opening-pay-reads-start-law): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
