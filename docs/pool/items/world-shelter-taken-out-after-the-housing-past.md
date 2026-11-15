---
id: world-shelter-taken-out-after-the-housing-past
title: "Shelter is taken out of a household's outside living cost at the opening's payment, before the housing past restates it"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the resident spending build, Nov 15"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-15
---

**What.** The opening takes what a household pays for its home out of its outside living cost (rent or mortgage and property tax, up to the Fair Market Rent), but at the payment the opening computed first. The housing past then restates the mortgage and rent from the move record, so the cost keeps the old payment's shelter while the household pays the new one. Seen: at Matagorda, Texas, seed pt1:0, household_b822e058930032f0's mortgage goes from 606.50 to 1,258 dollars a month (a 2024 purchase at 6.94 percent in place of a 2019 one at 3.75 percent) and the shelter taken out stays the old figure; five of five households printed were restated.

**Cause.** Found in code: `src/core2/modules/housing.ts` called `withoutOutsideShelter` in `withHousing` (world creation) with a payment map built from the opening's contracts, and `src/core2/housing-past.ts` `restateMortgage` then calls `setStandingContractAmount`; the moves history it reads does not exist until the pre-start passes run after the core is built, so the payment cannot be known at creation.

**Fix.** Design: take the shelter out once, after the housing past, from the contracts, rent flows and property tax as they stand (`standingHomePayments` in `housing.ts`, `takeShelterOutOfOutsideLiving` in `housing-shelter.ts`), and delete the creation-time removal. One payment, no later correction by the difference.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Shelter is paid once; replace, never layer: the creation-time removal is deleted in the same change; the same rule for both tiers.

**Done when.** A second session, not the builder, builds the world at a drawn place and seed it names and sees, for a household whose mortgage the housing past restated, that its outside living cost is reduced by the Fair Market Rent or what it pays through the housing engine as it now stands, whichever is less, naming the household and both payments.

**Waits on.** None.

**Files.** src/core2/modules/housing.ts; src/core2/housing-shelter.ts; src/core2/residents-economy.ts

**Notes.** Found while tracing newly short property tax bills in world-resident-spending-follows-income.
