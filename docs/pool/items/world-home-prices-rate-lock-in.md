---
id: world-home-prices-rate-lock-in
title: "Owners holding a cheap mortgage put off selling when rates rise, so fewer homes come up for sale and prices hold"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-home-prices-from-housing
blocked-on:
lead: money
model: opus
effort: medium
root: none
checked: Account lead T49 2026-11-14
source: Account lead T49 building world-home-prices-from-housing (Nov 14, 2026)
---

**What.** When the 30-year rate rose from about 3 to about 7 percent in 2022-2023, the home price level the housing engine steps falls (what a payment carries shrank), while FHFA's state indexes kept rising 4 to 6 percent a year: owners holding loans at 3 percent stayed put, so few homes came up for sale. Nothing in the world makes an owner weigh its own loan's rate against today's before selling, so homes offered never shrink when rates rise. Seen: Metrics' typical home value on day one and in any rising-rate stretch of play; the price a seller gets.

**Cause.** Measured: `node --import tsx scripts/research/home-price-fit.ts` (June to June, 2023 and 2024: the rule +1.0% and -1.2% against FHFA's state mean +4.2% and +5.7%) and `node --import tsx scripts/research/home-price-paths.ts --seed d4 --place 2132428 --years 0` (Gratz, Kentucky: this world's path from 2020-01 to 2025-01 +10.5% against FHFA Kentucky +53.6%). Found in code: sales come only from moves (src/core2/modules/moves.ts, `sellHome` on departure), deaths (src/core2/estates.ts) and foreclosure; no step reads the owner's mortgage rate against the macro month's.

**Fix.** Where an owner household weighs moving out of town or within it (the moves engine's decision), add the extra yearly interest a new loan at today's rate would cost over its own loan as a reason against moving, read from the household's `mortgages` row and the macro month's `mortgage30Pct`. Fewer moves then mean fewer homes offered, and the price level's pressure term (src/core2/housing-price-level.ts) rises on its own. Before day one, the same reason weighs the past's sellers once world-home-prices-past-buyers-and-sellers counts them.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** No dice: the reason is the household's own loan against today's rate. One engine per mechanic: the moves engine decides moves. Calibrate against Fonseca and Liu (2023, "Mortgage Lock-In, Mobility, and Labor Reallocation"): each point the market rate runs above an owner's rate lowers its chance of moving by about 9 percent.

**Done when.** A second session plays a drawn place through a year in which the macro rate rises and sees owners with older, cheaper loans move less (named by household and their loans' rates) and the month's homes offered fall on the stock row's Trace line.

**Waits on.** world-home-prices-from-housing.

**Files.** src/core2/modules/moves.ts, src/core2/housing-price-level.ts

**Notes.** Filed by Account lead T49 on its own branch.
