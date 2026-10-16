---
id: people-estate-drained-by-living-costs
title: "A dead person's account keeps paying their household's living costs while the estate waits in probate, so the estate is empty when probate closes"
area: people
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/estate-living-costs
pr: #4811
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:46:56.444Z
---

**What.** A town resident who dies leaves their cash in their account until probate closes 270 days later, but the household's monthly outside living-costs flow (`residents:outside-living:<household>`) names the dead person as its payer and stays open, so the account is drawn down every month and the estate is empty when probate closes. In Montura, Florida (seed 4f49403090122647, bench world, two-level) the richest town resident with living kin held 651,160 minor units when killed; the balance was 551,329 after 25 days and 351,667 after 60, the flow `residents:outside-living:household_d249d0bc3f4c4b89` (79,951 a month, payer the dead person) still open, and no `estate.settled` record was written when probate closed. Reassign each open flow whose payer died to a living adult of the household, or end it where none is left, so the estate that passes is the estate that was left.

**Rules.** No dice: the new payer is the household's oldest living adult, not a draw. An effect is a read: the flow reads who is alive on the day it falls due. Replace, never layer: the dead payer's flow is moved or ended, not shadowed by a second flow. One model, two tiers: a counted household's flow follows the same rule as a full one. One rule, all 56 places.

**Done when.** In a one-year played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) a resident with cash and living kin dies, the household's living-cost flow is paid by a living adult from the next due date, the dead person's account is unchanged until probate closes, and an `estate.settled` record names the heirs by person id and the estate the account held. A test in src/core2/estate-living-costs.test.ts proves it and fails on current main.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/estates.ts

**Notes.** Found while closing core-opening-resident-cash: killing a resident with `api.updatePerson(id, {alive: false})` followed by `settleEstate` and advancing 271 days (the path the health module takes) leaves the account at zero with no estate record. The account is drained by the household flow, not by taxes or debts (obligationsFrom was empty). Housing rent and mortgage flows may share the problem; check them in the same pass.
