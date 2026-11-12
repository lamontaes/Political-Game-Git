---
id: prices-vehicle-miles-fuel-spending-follows-miles
title: "A household's fuel spending follows the miles the outcome web says it drives"
area: world
kind: wiring
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: laws
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The price engine scales the miles a household drives by the outcome web's factor on `traffic.vehicle-miles` where it charges a mileage fee, so the fee and the fuel tax refund follow the miles. The household's own spending on fuel is meant to read the same factor, so a law that moves driving changes both the fee and what the household spends at the pump. The item says to check first which engine charges fuel today, and that check has not been completed, so the cause is not yet known.

**Cause.** Needs cause. Looked at src/core2/modules/place-prices.ts (the mileage fee reads the `traffic.vehicle-miles` factor, lines 112 to 117, 424 to 433 and 1222 to 1225) and src/core2/cost-of-living.ts (it does not read it); the engine that pays a household's pump spending was not found.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the engine that pays reads the factor when it pays. One model, two tiers: counted households take the same rule times their count. No dice.

**Done when.** A second session (not the builder) (or the finder) names the engine that charges a household for fuel in `buildBenchWorld` in a drawn place (place and seed named), by the journal record id of one fuel payment and the function that wrote it, and rewrites this item with that as its Cause and a Fix; or, if no engine charges fuel, says so by search and the item is rewritten as a build item.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/cost-of-living.ts

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25. Check first which engine charges fuel today.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have made a household's pump spending follow the miles a mileage-fee law moves; its cause is not found, only that one law reads it, and no screen shows it.
