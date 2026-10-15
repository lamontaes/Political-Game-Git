---
id: world-commuters-in-opening
title: "Some of the town's workers live in other places, and some residents work elsewhere, in the opening"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "gov-stopgap-budgets-faked-mechanic, found claiming it"
---

**What.** In the two-level opening the town's full people all live in the town, and the rest of the town is counted, so nobody lives in one place and works in another. Real towns have commuters in both directions. Give the opening some full workers who live in a neighboring place and work for a town employer, and some town residents who work for an employer elsewhere, drawn from the Census commuting flows for the place. Their pay, tax and spending then cross the town line the way the data says.

**Rules.** One rule, all 56 places: the shares come from commuting data per place, never a named town. One model, two tiers: a counted group commutes by the same rule as a full person, times its count. Estimate, never UNKNOWN: a place without commuting data starts from the real national average marked ESTIMATED with source and spread. No dice: who commutes follows from the jobs and homes the data places, not a roll. Replace, never layer: the all-residents-live-here assumption is deleted where it stood.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a named worker lives in another place and is paid by a town employer, with their paycheck, withholding and spending traced by record id, and a test in src/core2 proves the share of commuters matches the place's Census figure within its spread.

**Files.** src/core2/opening-employment.ts, src/core2/population.ts, src/core2/data/opening-employment.json

**Notes.** Blocks gov-stopgap-budgets-faked-mechanic (nonresident local tax and tax owed to another state cannot fire without it).
