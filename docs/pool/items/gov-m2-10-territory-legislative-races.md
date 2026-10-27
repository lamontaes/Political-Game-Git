---
id: gov-m2-10-territory-legislative-races
title: "M2-10 finds no legislative races in a drawn territory world"
area: gov
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/territory-legislative-races
pr: #6186
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T20:23:41.027Z
---

**What.** Merger 1 reproduced M2-10 failing with no state legislative races in 2026 in Santa Rita, Guam, on clean main b4c4a8c7a2c884ccc30bba3e18bd4eeeb860fa51 and PR #5969. Use GOLDEN_PATH_SEED=b39480445e197e340cd943a3b2dc42327946e62abb0cbea669721444ad0d26de and GOLDEN_PATH_PLACE_KEY=territory:GU:santa-rita with src/bench/m2-10-check.ts; the fresh draw root was 1aa674d51e10a7e7. Both reports have 438 House races, 35 Senate races and zero legislative races; the PR separately fixes governor races from zero on main to 36 correctly recorded winners. Existing completed territory-seating work and open district research do not explain or repair this missing election proof.

**Rules.** One rule, all 56 places: territories receive the same election-calendar and counted-race rules from their own data. Find the actual missing election or incorrect calendar expectation at its source, retain the positive legislative-race and seating checks, and never clear the failure by skipping territories or replacing the drawn input.

**Done when.** M2-10 on the recorded Santa Rita input names the territory legislative calendar, actual election and winner records, and every applicable legislative race from that calendar with correct seating dates; the positive legislative assertion passes without an exemption or weaker count, and the command also passes for a fresh drawn place with seed and records in the PR body.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/bench/m2-10-check.ts, src/core2/modules/world-races.ts, src/core2/offices-state.ts

**Notes.** Found during Merger 1 review of #5969 on October 24, 2026. The clean-main legislative clause is separate from the bounded governor-race-counting change. Existing gov-territory-legislature-districts remains the research follow-up for district geography.
