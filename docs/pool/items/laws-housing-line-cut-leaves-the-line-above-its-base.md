---
id: laws-housing-line-cut-leaves-the-line-above-its-base
title: "A cut to a government's housing line, made after its fiscal year turned over, leaves the line above its base and the help still paid"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 while pinning the housing family test (Nov 14)
after:
lead: laws-effects
model: opus
effort: medium
root: none
---

**What.** The housing family test's case "rent help: cutting the housing line ends every payment" fails at Whitney, Nevada (3283800, seed `housing-pin-1`), Southern Pines, North Carolina (3763120) and Fort Carson, Colorado (0827370): "this government paid assistance after its line was cut". A player who cuts a housing line sees rent help go on being paid. Seen: the Journal's rent assistance lines and the government's budget screen at Whitney keep showing the cut line's money after the cut.

**Cause.** Measured: at Whitney, Nevada (place 3283800, seed `housing-pin-1`) with `npx vitest run src/core2/law-wiring-housing.test.ts -t Whitney` once its pins are in, and by a short script that builds the same world and plays 700 days. At Whitney after 700 days (world date 2026-12-21) the county's housing line stood 510,952,656 above its Census base. The line was cut by that amount through `amendBudget` on 2027-02-04, against the latest budget row that had started, `budget:county:32003:2026` (fiscal year 2026). Forty days later (2027-03-16) the county's line was still 510,952,656 above base, and 4 rent-assistance payments had been made since the cut (the first two paid from the state's treasury residual, and the county's own were not separated in the run). The cut did not reach the budget `budgetToday` reads for the new date. Not yet shown: which budget row `payRentAssistance` reads on 2027-02-04 and why the amendment does not reach it. Needs cause.

**Fix.** None until the cause is found; read `amendBudget` and `budgetToday` for a government whose latest started budget year is not the year the date falls in.

**Time box.** 2 hours.

**Rules.** An effect is a read, not a record: the payer reads the line on the day it pays. No dice.

**Done when.** At three pinned places, each a drawn place named with its seed, the housing family test's cut case passes without being skipped, and a second session sees it in the running game: it cuts a raised housing line at a place and date after the fiscal year turned, and reads the Journal for no rent assistance from that line afterward.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/housing-assistance.ts, src/core2/law-wiring-housing.test.ts
