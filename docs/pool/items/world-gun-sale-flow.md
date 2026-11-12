---
id: world-gun-sale-flow
title: "A handgun sale and an age-restricted sale exist as flows the age laws can refuse"
area: world
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** No handgun, and no other age-restricted good, is sold as a purchase flow from a seller's books in the economy, so the age laws read counts rather than a sale. Public safety models young adults' handgun purchases as law applications on groups (sale-refused-under-age), and the stopgap SG-GOV-REACH-A-handgun-age is already resolved on that basis; SG-GOV-REACH-A-age-verification concerns minors' accounts and is not closed by this item. Make age-restricted sales ordinary purchase flows from a seller's books to a buyer's account, so the sale reads the law in force and the buyer's own age at the moment it is made, and delete the counting code it replaces.

**Cause.** Found in code: src/core2/public-safety.ts (lines 1706-1730, the handgun-purchase-age section of the monthly step) models under-age handgun purchases as law applications on counts (sale-refused-under-age) with no purchase flow from a seller's books; the resolved stopgap row SG-GOV-REACH-A-handgun-age in src/core2/data/stopgaps/gov.json records that this is the stand-in.

**Fix.** Make an age-restricted sale a purchase flow from a seller's books (src/core2/modules/place-prices.ts and src/core2/residents-economy.ts) that reads the law in force and the buyer's age when it is made, refuse an under-age buyer with the law record id, and delete the count-based code in public-safety.ts it replaces.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the sale reads the law at the moment of purchase. One rule, all 56 places: each place's age limit comes from data. One model, two tiers: a counted buyer follows the same rule as a full one, times their count. No dice. Replace, never layer: the count-based model is deleted in the same change.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose (named) and sees a buyer under the place's handgun age refused at the sale, shown by the purchase record id and the law record id, and an adult's sale go through as a dollar on the journal; a test in a new src/core2/restricted-sales.test.ts proves it.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/modules/place-prices.ts, src/core2/residents-economy.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json, src/core2/restricted-sales.test.ts (new)

**Notes.** Split from world-sale-eligibility-reads (checked Oct 19: no sale flow for these goods exists to read the law). The hiring half is the owner question owner-employer-bias-source.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have made a handgun sale a purchase from a seller's books; the age law already refuses the sale for the counted groups, and no player opens a gun shop's sales.
