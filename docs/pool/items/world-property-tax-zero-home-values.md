---
id: world-property-tax-zero-home-values
title: "Bench owners' home values are zero in some towns, so property tax collects nothing (Nekoma ND, Presque Isle ME)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4644
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The property tax is wired (`registerPropertyTax`), but in some drawn towns `ownedHomes` (housing.ts) skips every home because `valueMinor` is 0: `medianValue = rentValueOf(town.county)[1] ?? 0` finds nothing for the county. Find the real cause and give owners a home value (a county median marked ESTIMATED where the data has none).

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place that showed zero, a one-year run collects property tax from named owners, by home and payment record ids; a test fails when `ownedHomes` is empty for a town with owners.

**Files.** src/core2/modules/housing.ts, src/core2/property-tax-laws.test.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4644 (branch claude/world-property-tax-zero-home-values): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
