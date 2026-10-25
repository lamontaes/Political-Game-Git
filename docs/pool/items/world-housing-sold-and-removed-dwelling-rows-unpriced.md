---
id: world-housing-sold-and-removed-dwelling-rows-unpriced
title: "A household evicted or sold out leaves a dwelling row with no value or rent, so M0-13 counts it as an unpriced home (St. Johnsbury 9 of 2,830, Decaturville 2 of 347, Lawrenceville 2 of 494)"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on: play-first-freeze
source: added with npm run pool -- add
---

**What.** M0-13's 'homes have values and rents' fails in all three places drawn: St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) has 9 of 2,830 dwellings unpriced, Decaturville, Tennessee (seed 1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809) 2 of 347 and Lawrenceville, Virginia (seed 9e8d7c6b5a49382716059e8d7c6b5a49382716059e8d7c6b5a49382716059e8d7c6b) 2 of 494. In St. Johnsbury all nine are tombstones left when a household stopped living there: eight tenure removed with basis eviction (src/core2/modules/housing.ts:1907, for example dwelling:household_134693eee12b95cb on 2025-06-10 and dwelling:household_53c1e1f1642578b1 on 2025-10-11; foreclosure writes the same shape at src/core2/housing-foreclosure.ts:321) and one tenure sold (dwelling:household_0185a6fa5385f11c on 2025-02-17, src/core2/housing-sale.ts:128). They carry no valueMinor or rentMinor, and the check treats every non-rent row as an owned home needing a value. Nothing else reads them as homes (ownsHome in moves.ts:248 falls back to the mortgage books, the rent review at housing.ts:1580 skips non-rent rows), but src/core2/home-sale.test.ts asserts the sold row exists, so deleting the rows would change that test's contract.

**Rules.** Wire to the world: a household's last home is a record the home panel reads (src/core2/modules/world-panels.ts homePanel), so keep it and make it truthful rather than delete it to pass a check. Estimate, never UNKNOWN: a former home keeps the last value or rent the records show. Replace, never layer: one tombstone shape for sold, removed and foreclosed, written in one place.

**Done when.** In buildBenchWorld in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) and the two other places named here, M0-13 homes have values and rents is alive: every dwelling row, including the former homes of an evicted, foreclosed or sold-out household, carries the last value or rent from the household's own record (dwelling id, sales or cases row id named in the PR), src/core2/home-sale.test.ts passes unchanged, and the home panel still shows how the household left.

**Files.** src/core2/modules/housing.ts, src/core2/housing-sale.ts, src/core2/housing-foreclosure.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper. A renter's tombstone has a last rent but no value, and the check at tests/golden-path/played-world.node-test.ts:774 reads valueMinor for every tenure other than rent, so a renter tombstone needs either a valueMinor of the home it was (the landlord's recorded value) or the spec to read rows with tenure rent, own only: the second is the M0-13 owner's call (OWNER DECISIONS NEEDED if the builder picks it).

Frozen Oct 24 (play first): not claimable until the CTO lifts the freeze (play-first-freeze; docs/work-orders/play-first-2026-10-24.md).
