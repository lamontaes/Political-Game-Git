---
id: prices-bill-a-household-cannot-pay-disappears
title: "A price bill a household cannot pay disappears instead of being owed"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
source: Laws thread, cause of the dearer-electricity red, Nov 15, 2026 (account lead's ruling, 16:45Z)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When the price engine asks a household for a law's price change (an electricity standard, a carbon price on fuel, a deposit) and the household's payer has no cash, the bill is paid at zero and nothing is owed afterward. The household is never short, never in arrears and never asked again. Seen: the household's money in dev mode (no electricity line at all for a broke household under a dearer price) and the law's bill card, which still counts the bill asked.

**Cause.** Found in code: `settle` (src/core2/modules/place-prices.ts) pays through `transferCash` (src/core2/world-transfer.ts), which calls `accounts.transfer` with `partial: true` and returns what was paid; the receipt's `shortMinor` is dropped. Measured: Wilton, Maine (2385815), world seed 056520284c241460, the player's household household_dd99fac750b89ba5: payer person_deddb8b1e5de6518 holds 0 cash and is asked 489 cents a month under the clean-electricity standard; 0 is paid and nothing is kept. The living-cost plan already carries what a household cannot pay as arrears (src/core2/cost-of-living.ts); the price engine does not use it.

**Fix.** `settle` carries the short part of a household's price bill into the household's arrears the way the living-cost plan does for its own bills, so a later payment or write-off settles it. The player sees the owed amount in household money.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** An effect is a read, not a record: a bill asked is money owed. One model, two tiers: counted groups' bills go the same way.

**Done when.** A second session plays a drawn place for 90 days with a price law in force, names the place and seed, and finds a household whose payer had no cash on a bill day: its unpaid part is on record as owed and later paid or written off, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/cost-of-living.ts
