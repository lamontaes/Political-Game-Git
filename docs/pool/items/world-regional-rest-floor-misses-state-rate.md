---
id: world-regional-rest-floor-misses-state-rate
title: "A state whose metros sit above its unemployment rate gives its rest-of-state region the state's own rate, so the state opens above its published rate"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/regional-rest-state-rate
pr: #6019
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T10:19:06.986Z
---

**What.** The regional model (src/core2/regional-model.ts) gives the rest of a state what the state's published unemployment leaves after its metros; when the metros sit above the state rate it leaves nothing, and the rest region takes the state's own rate. The state's people-weighted opening rate then sits above the published one. The M1-03 check excused this case until a merger sent it back on #5876 (state 5%, rest 5%, weighted 8% passed); it now fails it.

**Rules.** Estimate, never UNKNOWN: a state's opening unemployment must equal its published LAUS rate, so the rest-of-state share is solved from the metros' people and rates, never floored at the state's rate.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-03-check.ts shows no state's opening unemployment off its published rate for this cause, in the runner's drawn place and two more drawn places named with seeds; the cause is named by line in the PR.

**Files.** src/core2/regional-model.ts

**Notes.** TODO

2026-10-25 (claude/regional-rest-state-rate): in the 2024-12 opening no state with a rest region leaves it a non-positive rate (measured from regions.json); the states off their rate were the all-metro ones, D.C. (2.9% against 5.6%) and Rhode Island (4.2% against 4.5%), whose only region took its metro area's cross-state LAUS rate. Fixed by one shared factor on every region of such a state, which also covers a rest left at zero or below.
