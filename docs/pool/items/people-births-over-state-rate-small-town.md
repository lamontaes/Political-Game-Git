---
id: people-births-over-state-rate-small-town
title: "M1-09: 14 births in half a year in Roche Harbor, Washington, against at most 9.8 at the state's rate"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-births
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T05:22:02.495Z
---

**What.** The M1-09 command (src/core2/moves.test.ts) on main b09ba675cd fails in Roche Harbor, Washington (seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26): 'brings births at about the state's 2024 rates for the women in town' expected at most 9.8 births in half a year and saw 14. The other nine moves tests pass there. Find whether the births engine over-weights a small or old town's women, or the expectation reads the wrong population, and fix the cause.

**Rules.** No dice: births follow couples' circumstances and the state's real rate only checks the total. One rule, all 56 places: the births test must hold in any drawn place, not only the ones it was tuned on.

**Done when.** The M1-09 command passes in Roche Harbor, Washington (seed above) and in three more places drawn from all 56 with seeds the builder did not choose, each named with its birth count and expectation in the PR body.

**Files.** src/core2/moves.test.ts, src/core2/modules/renewal.ts

**Notes.** Found by the M0-M2 lead's baseline run, Oct 24. Blocks roadmap M1-09.
