---
id: core-opening-past-race-repeats-a-real-vote-count
title: "A made-up 2024 race opens with exactly the same vote count in two worlds"
area: core
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: R1 (Fable A's builder)
pr: #8884
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: the lead (Fable A), Nov 12, 2026, on the CTO's line on #7365 (comment 6822377628)
merged-at: 2026-11-12T14:53:19.580Z
---

**What.** Guards: the game may calibrate on real numbers and never reproduce them (CTO, Nov 12, 2026, #7365 comment 6822377628). `src/core2/realistic-not-real.test.ts` line 820 (row 44, past races) builds the same place with two seeds and requires every past race of a thousand votes or more to differ between the two worlds. It fails on clean main in two drawn places. Carolina, Rhode Island (4412340), REALISTIC_SEED=1f847ff6f693efc1: prior-election:seat:US-RI:lower:039:0:2024-11-05 has 6,731 votes in both worlds (Deterministic validation 43204347616 on main 3ed3915c59). Leusoali'i, American Samoa (territory:AS:leusoalii), REALISTIC_SEED=970a2d32fc2d63f1: prior-election:seat:US-AS:lower:At-large:0:2024-11-05 has 10,488 votes in both worlds (Merger codex-4629, #7365 comment 6817215400, on main cd2f4a44f8). Both are lower-house seats.

**Cause.** Measured: a probe in `buildPriorElections` (src/core2/past-elections.ts, the one writer of a past race's `totalVotes`) on main cb0cf89f6e, with both seeds. The count is not a real count, and it does take the world's seed. For a state lower-house seat with no recorded result (`realResult` returns null), the center is `electorateBallots` (the state's or territory's ballots over its seats, or all of them for an at-large seat). That center is the same in both worlds. `worldLevel(center, town.seed, "past-votes:<seat>:<date>", "worldPastVotesSpreadShare")` then moves it once by the world's own offset: a sign and a size between 0.34 (`worldDrawOffsetFloorShare`) and 1 of 4% (`worldPastVotesSpreadShare`). Carolina, Rhode Island, REALISTIC_SEED=1f847ff6f693efc1, prior-election:seat:US-RI:lower:039:0:2024-11-05: the center is 6,845.15 in both worlds. World a's offset is -1.6685% (6,730.94) and world b's is -1.6704% (6,730.81), so both round to 6,731. Leusoali'i, American Samoa, REALISTIC_SEED=970a2d32fc2d63f1, prior-election:seat:US-AS:lower:At-large:0:2024-11-05: the center is 10,113 in both worlds (the territory's general-election ballots, at large), and both worlds draw 10,488. The other 20 at-large seats all differ (for example seat 1: 9,770 and 9,949). The test's per-race rule ("each race of a thousand votes or more must differ") fails by chance: a ±1.36% to 4% band around a center of N votes holds about 0.053 N possible counts. That is about 362 for 6,845 votes and 534 for 10,113, so two worlds share a count about once in 360 races, or once in 530. American Samoa's 21 at-large seats of about 10,000 votes each share one somewhere about one run in 25. Neither number is a real count: 6,731 and 10,488 are each world's own draw, and neither equals the center.

**Where the count comes from (CTO, Nov 12).** The 2024 prior-election counts are not simulated from the world's history. Each is drawn as one offset around a real center, in `buildPriorElections` (src/core2/past-elections.ts). The center is `realResult` (the certified total from data/source/electoral-calibration-2024/corpus.json for a U.S. House, Senate or presidential race) or, where the corpus has no race, `electorateBallots` times `turnoutRatio`. `electorateBallots` is the state's real 2024 presidential total (`CORPUS.presidentialByState`) over the chamber's seats, a territory's reported ballots (data/research/elections/territory-ballots.json), or a county's 2024 presidential total (src/core2/data/county-presidential-2024.json). Carolina's 6,845.15 is Rhode Island's 513,386 presidential ballots over its 75 House seats. Whether that should be simulated from the world's own voters is a question for the owner, kept apart from this test change.

**Fix.** Built, as the CTO ruled on Nov 12 (the test asserts what is true; the spread is not widened to suit a test). `buildPriorElections` (src/core2/past-elections.ts) keeps each race's source count (`sourceVotes` on `PastElectionRow`, the rounded center), and src/core2/past-news.ts writes it on the race's archive story beside `totalVotes`. Row 44 of src/core2/realistic-not-real.test.ts now checks two things. In each world, no race of a thousand votes or more prints its source count. Across the large races, the two worlds share a count in at most `ceil(large × 3/87)` races: the 95% upper limit for the 0 of 87 measured over ten draws, which is written in the test. The thousand-vote floor stays.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists and of a world's own past is allowed; a real count is never printed as the world's. One rule, all 56 places. Estimate, never UNKNOWN. Never loosen the test or raise its thousand-vote floor.

**Done when.** A second session runs `REALISTIC_SEED=1f847ff6f693efc1 npx vitest run src/core2/realistic-not-real.test.ts` and `REALISTIC_SEED=970a2d32fc2d63f1 npx vitest run src/core2/realistic-not-real.test.ts` and sees both pass, and runs it on three fresh seeds, one of them in a territory, with every run naming its place.

**Waits on.** Nothing

**Files.** src/core2/realistic-not-real.test.ts, src/core2/past-elections.ts

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's line; after `core-world-stops-on-income-term-without-its-award` and `tests-budgets-public-pay-alega-has-a-public-employer` in the order of work.

**Notes (Nov 12, R1).** Cause found with a temporary probe in `buildPriorElections`, removed. I ran `REALISTIC_SEED=1f847ff6f693efc1` and `REALISTIC_SEED=970a2d32fc2d63f1` `npx vitest run src/core2/realistic-not-real.test.ts -t "past races"` on main cb0cf89f6e: both still red, as the item says. The offsets were computed with `worldOffsetShare` directly. Not built: the Fix changes what the test asserts, so it waits for the lead's word.
