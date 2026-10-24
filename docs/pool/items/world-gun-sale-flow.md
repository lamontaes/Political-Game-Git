---
id: world-gun-sale-flow
title: "A handgun sale and an age-restricted sale exist as flows the age laws can refuse"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** No handgun, and no other age-restricted good, is sold anywhere in the economy, so the handgun-age and age-verification laws have no sale to refuse (stopgaps SG-GOV-REACH-A-handgun-age and SG-GOV-REACH-A-age-verification). Add the sale of these goods as ordinary purchase flows from a seller's books to a buyer's account. The sale then reads the law in force and the buyer's own age when it is made.

**Rules.** An effect is a read, not a record: the sale reads the law at the moment of purchase. One rule, all 56 places: each place's age limit comes from data. One model, two tiers: a counted buyer follows the same rule as a full one, times their count. No dice.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a buyer under the place's handgun age is refused at the sale, shown by the purchase record id and the law record id, an adult's sale goes through as a dollar on the journal, and the two stopgap rows close. A test in src/core2/jobs.test.ts or a new src/core2/restricted-sales.test.ts proves it.

**Files.** src/core2/modules/place-prices.ts, src/core2/residents-economy.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split from world-sale-eligibility-reads (checked Oct 19: no sale flow for these goods exists to read the law). The hiring half is the owner question owner-employer-bias-source.
