---
id: core-opening-past-race-repeats-a-real-vote-count
title: "A made-up 2024 race opens with exactly the same vote count in two worlds"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: the lead (Fable A), Nov 12, 2026, on the CTO's line on #7365 (comment 6822377628)
---

**What.** Guards: the game may calibrate on real numbers and never reproduce them (CTO, Nov 12, 2026, #7365 comment 6822377628). `src/core2/realistic-not-real.test.ts` line 820 (row 44, past races) builds the same place with two seeds and requires every past race of a thousand votes or more to differ between the two worlds. It fails on clean main in two drawn places. Carolina, Rhode Island (4412340), REALISTIC_SEED=1f847ff6f693efc1: prior-election:seat:US-RI:lower:039:0:2024-11-05 has 6,731 votes in both worlds (Deterministic validation 43204347616 on main 3ed3915c59). Leusoali'i, American Samoa (territory:AS:leusoalii), REALISTIC_SEED=970a2d32fc2d63f1: prior-election:seat:US-AS:lower:At-large:0:2024-11-05 has 10,488 votes in both worlds (Merger codex-4629, #7365 comment 6817215400, on main cd2f4a44f8). Both are lower-house seats.

**Cause.** Needs cause. Not yet traced: which function writes the total votes of a past state lower-house race at the opening, and why that total does not take the world's seed for these seats when other races do. The cause find runs the test with each seed above, names the function and the source row the 6,731 and the 10,488 come from, and says whether the number is a real count carried through unchanged or a drawn count whose draw ignores the seed for this kind of seat. `realistic-elections-per-world` is the wider feature (the 2024 vote drawn per world); this item is the two seats where a count is the same in every world today.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists and of a world's own past is allowed; a real count is never printed as the world's. One rule, all 56 places. Estimate, never UNKNOWN. Never loosen the test or raise its thousand-vote floor.

**Done when.** A second session runs `REALISTIC_SEED=1f847ff6f693efc1 npx vitest run src/core2/realistic-not-real.test.ts` and `REALISTIC_SEED=970a2d32fc2d63f1 npx vitest run src/core2/realistic-not-real.test.ts` and sees both pass, and runs it on three fresh seeds, one of them in a territory, with every run naming its place.

**Waits on.** Nothing

**Files.** src/core2/realistic-not-real.test.ts, and the opening code that writes past races (found by the cause find)

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's line; after `core-world-stops-on-income-term-without-its-award` and `tests-budgets-public-pay-alega-has-a-public-employer` in the order of work.
