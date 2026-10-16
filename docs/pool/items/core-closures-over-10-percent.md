---
id: core-closures-over-10-percent
title: "A town year closes more than 10% of its businesses in small places (Hinesburg VT 4 of 38, Eureka WI 4 of 36)"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/core-closures-over-10-percent
pr: #4614
blocked-on:
milestone:
source: "found while closing core-outside-flow-catalog-rows; closures.mjs check 1"
claimed-at: 2026-10-16T04:52:37.756Z
---

**What.** `scripts/core2-year/closures.mjs` check 1 (under 10% of businesses close in a year) fails in small places: Hinesburg, Vermont (seed gate-repro-2) 4 of 38 (10.5%) and Eureka, Wisconsin (seed gate-repro-3) 4 of 36 (11.1%). Sullivan's Island (gate-repro-1) passes. Find why those firms close (the script's per-firm cash lines) and fix the cause.

**Rules.** No dice; wire to the world; estimate from the BDS closure range; one rule, all 56 places.

**Done when.** A year in the three places above closes under 10%, or the check is shown to be tighter than the BDS rate for towns with fewer than 40 firms and the owner rules on the bar.

**Files.** src/core2/modules/business*.ts, scripts/core2-year/closures.mjs

**Notes.** With so few firms, four closures swing the percentage by 2.5 points each; the check may need a small-count tolerance, which is the owner's call.

Checked on main on October 16, 2026 (claude/core-closures-over-10-percent): the closure check passes in all three places. Hinesburg, Vermont (seed gate-repro-2) closed 2 of 38 firms (5.3%), Eureka, Wisconsin (gate-repro-3) 2 of 37 (5.4%) and Sullivan's Island, South Carolina (gate-repro-1) 0 of 40, with `CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs --seed <seed>`. Something merged since the report cleared them (not bisected); no code change here.
