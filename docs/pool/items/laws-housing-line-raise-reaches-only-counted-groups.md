---
id: laws-housing-line-raise-reaches-only-counted-groups
title: "A county's raised housing line pays counted groups and no full household under its own measure, because the state's older line is paid first"
area: laws
kind: bug
priority: 3
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

**What.** The housing family test's case "the housing line: raising it pays a household's rent assistance through the journal" fails at Whitney NV (3283800), Southern Pines NC (3763120) and Fort Carson CO (0827370), seed `housing-pin-1`: "no full household's assistance was paid through the journal with an applied row". Seen: a player who raises a town's housing line sees rent help reach groups of renters and no named household.

**Cause.** Measured: at Whitney, Nevada (place 3283800, seed `housing-pin-1`) with `npx vitest run src/core2/law-wiring-housing.test.ts -t Whitney` once its pins are in, and by a short script that builds the same world and plays 700 days. At Whitney on 2026-12-21 the county line was raised by 2,111 vouchers (the test's own sizing for three full households). Forty-five days later there were 33 applied rows, 31 to counted groups and 2 to full households; the two full-household rows cite the state's measure `budget:US-NV:2025`, not the county's raised line. The state's housing line already stood 261,996,171 above its base (its own passed budget) and pays the poorest renters first, so the county's vouchers fall on counted groups behind them. The test's sizing (`vouchersToReachFullHouseholds`) counts the vouchers other governments' lines buy through `townShare`, and that count does not match who the state line actually reached. Not yet shown: where the two counts differ. Needs cause.

**Fix.** None until the cause is found; compare the vouchers `payRentAssistance` gives each government's line with the sizing in the test, at Whitney on that date.

**Time box.** 2 hours.

**Rules.** An effect is a read, not a record. No dice. Estimate, never UNKNOWN: the sizing is an estimate with the state's share as its source.

**Done when.** At three pinned places, each a drawn place named with its seed, the housing family test's housing case passes without being skipped, and a second session sees it in the running game: it raises a county's housing line and reads a full household's Journal line citing the county's measure.

**Waits on.** Nothing.

**Files.** src/core2/housing-assistance.ts, src/core2/law-wiring-housing.test.ts
