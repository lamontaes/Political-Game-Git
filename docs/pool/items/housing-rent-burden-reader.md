---
id: housing-rent-burden-reader
title: "Housing reads a household's rent burden, its rent against its income, so other engines can say who pays too much"
area: world
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: "The Story lead's address anchor (story-address-anchor-person), Nov 24 21:21Z: housing needs a rent-burden reader before an address can tell its problem through a resident; filed by the Coordinator"
checked:
---

**What.** An address on housing can't tell its problem through a resident, because no engine can say which household pays the most of its income in rent. The address anchor is already built for health and wages and waits on this one reader to add housing. News, stances and talk could use the same burden instead of each working out its own. Seen: an address whose theme is housing names no resident and their rent.

**Cause.** Found in code: the rent and the income are both on record. Each household's dwelling row carries its rent (src/core2/modules/housing.ts:793), a full household's lease is a finance contract with its monthly amount (:795-800), and a full household's yearly income is `fullHouseholdIncomes` (src/core2/counted-income-fifth.ts:44). No reader joins the two, so no engine can ask for a household's rent burden.

**Fix.** In housing, add `rentBurdenOf(api, householdId)`: twelve months of the dwelling's rent over the household's yearly income, as a share, returned with the dwelling's and the income's record ids. Add a second reader for the most burdened renting household in a place, chosen by the largest share. The address anchor then adds one row for housing.

**Time box.** 1.5 hours.

**Rules.** An effect is a read, not a record: the reader joins two records the engines already keep, with no new table. One model, two tiers: a counted household's burden is read by the same rule, times its count. No dice: the most burdened household is the one with the largest share on record, never a pick.

**Done when.** In a played world at a drawn place, `rentBurdenOf` returns a share for every renting household, citing its dwelling and income records. The most burdened full household is named by record id, and the address anchor can read it. A test fails if the share stops matching rent over income. A second session opens dev mode in a drawn place and sees the most burdened household's share, with its record ids, in the household's Trace.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/counted-income-fifth.ts
