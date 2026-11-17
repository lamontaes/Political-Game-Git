---
id: housing-bank-mortgage-room-from-capital
title: "The town bank's room for day-one mortgages comes from its own capital and the lines it already carries, not a published share of community banks' loans"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pins-housing-a2
pr: 0
blocked-on:
after:
lead: world
source: Justice lane, Nov 17, 2026, family 25 of the CTO's LIFT THE PINS list (issue 9747, comments 6936897718 and 6938447224), part A2 item 5; items 3 and 4 stay listed pins per the CTO's 08:49Z answer
model: sonnet
effort: medium
root: none
---

**What.** A town bank held at most 0.3 of its lending room in day-one mortgages, the share of community banks' loans that are residential mortgages (FDIC), so every bank of any capital held the same share. The owner ruled on Nov 16 that everything comes from the simulation and nothing is pegged to real numbers.
Seen: which day-one mortgages the town bank holds and which go to the outside market, in the mortgage records.

**Cause.** Found in code: `openHousing` in src/core2/modules/housing.ts gave `openingMortgages` a room of the bank's cash times `creditMaxLimitsPerEquity` times `housingBankMortgageShareOfLoans` (0.3).

**Fix.** `openingMortgageRoom` in src/core2/modules/housing.ts is the bank's capital times the limits credit lets it carry, less the business lines it already extended; mortgages take the room that is left and the rest go to the outside market. `housingBankMortgageShareOfLoans` is deleted. A bank with more capital holds more of its town's mortgages; one with more lines out holds fewer.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No dice: room is computed from the bank's records. One rule, all 56 places.

**Done when.** A second session opens a drawn place, Lafayette, Colorado (seed 3da19558bdb4a07c) or any other, and sees the town bank hold day-one mortgages up to its capital's room and the rest held outside, and src/core2/housing-mortgage-room.test.ts passes on main.

**Waits on.** #9888 (day one's rents and values), which this branch is stacked on.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json, src/core2/housing-mortgage-room.test.ts (new)
