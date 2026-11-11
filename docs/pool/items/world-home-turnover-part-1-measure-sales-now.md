---
id: world-home-turnover-part-1-measure-sales-now
title: "Measure a played year of home sales and purchases now, and fill the gap the reasons leave"
area: world
kind: research
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pool-world-home-turnover-part-1-measure-sales-now
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from world-home-turnover in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:50:51.547Z
branch: claude/pool-world-home-turnover-part-1-measure-sales-now
---

**What.** The item world-home-turnover was measured on Oct 17, before home sales for owners who leave or die existed: West Hammond, New Mexico wrote 0 sales and 0 purchases among 860 owner households and Epping, New Hampshire 1 sale among 1,226. Since then src/core2/housing-sale.ts (sellHome) sells a home when its owners leave town or die, and the sale row is kept by the housing ledger. Measure again what a played year writes today, so the remaining work is known: sales by reason (leave, death, move), purchases by who bought, and homes that should have changed hands and did not. Fix any owner who leaves, dies or moves and writes no sale row.

**Cause.** Measured: the Oct 17 one-year `buildBenchWorld` runs in West Hammond, New Mexico (0 sales and 0 purchases among 860 owner households) and Epping, New Hampshire (1 sale among 1,226), for which the item recorded no seed; src/core2/housing-sale.ts (`sellHome`, `homeSaleOf`) has landed since, so the current counts come from a new run whose seed the builder names.

**Fix.** Write the current counts by reason into this part's Notes, and add the sale row for any leave, death or move that still writes none (src/core2/modules/housing.ts, src/core2/housing-sale.ts).

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a household sells from its reasons (a move, a death or estate, a job, a new household, income against price, rates and the law in force), never a fixed percentage; the real rate is reported beside the result and never a target (owner, Nov 8). One model, two tiers: counted owners sell by the same rule as full households, times their count. One rule, all 56 places.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in three drawn places (names and seeds in the PR body) and sees home sales listed by record id with their reason (leave, death, move), the purchases beside them, and any owner who left, died or moved without a sale row either fixed or listed in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/housing-sale.ts, src/core2/housing.test.ts

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:50 UTC) on branch claude/pool-world-home-turnover-part-1-measure-sales-now.

**Measured (sonnet-fd29, Nov 11, 2026, main at the claim, `buildBenchWorld` with twoLevel, one year of 365 days from the game start, counts from the housing module's `sales` table and each initial owner household's members).**

- Orleans, Massachusetts (US-MA, 2551405; world seed 1bd55ce532856c952f547c5c180dfd5bc83e2118cb079fa41658913944cc386f): 1,159 owner households; 14 sales, all reason `estate.counted-last-owner`; 5 owner households whose members are all dead and have no sale row.
- Concrete, Washington (US-WA, 5314380; world seed c1d9970443ee91def50a609294044c19fa74cdce43f6495f23f7851fe854d31f): 805 owner households; 2 sales, both `estate.counted-last-owner`; 5 owner households whose members are all dead and have no sale row.
- No sale of any other reason appeared in either year: none for `moves.departure` (moves.ts line 906), `estate.probate-closes` (estates.ts line 639) or the residents.ts call (line 2981). Purchases by who bought and the buyers were not counted.
- Not known: whether the 10 unsold all-dead households were still in probate at the end of the year (an estate sale follows probate's close), or had their sale written under another household id. A leaver who moves out of town and keeps the home was not separated from one who sold. No code was changed: the item's Fix (a sale row for any leave, death or move that writes none) is not done because the cause of the gap is not established.
