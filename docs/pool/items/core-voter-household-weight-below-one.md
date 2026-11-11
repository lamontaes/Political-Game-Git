---
id: core-voter-household-weight-below-one
title: "A counted household stands for less than one voter in some towns"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-voter-household-weight-below-one
pr: #8450
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: CTO, from the golden-path failure (M0-09) on PR 8060, Nov 9, 2026
claimed-at: 2026-11-11T01:53:13.697Z
checked: fable 2026-11-10
---

**What.** `src/core2/voter-groups.test.ts` ("voter groups are the counted electorate") fails at some drawn places because a voter row carries its household's weight and that weight is below 1. Valley City, North Dakota (key 3881180, seed d5a9ce3f642229fdc5611e1a85e2e1565f79688af5a1f55b560643f2d082a184) gave 0.414. A counted household stands for at least itself, so a weight under 1 means the opening's scaling shrank a household instead of growing it. Fix the weight, not the test.

**Cause.** Found in code: `src/core2/opening-county-sample.ts` lines 286 to 290, where the county sample's household weight is `max(county.eligible - kinEligible, 1) / sampleEligible`. It falls below 1 whenever the sampled adult citizens outnumber the county's eligible voters, which is the Valley City case. The test asserts `v.weight >= 1` against `store.weightOf` (`src/core2/counted-groups.ts` line 531, `src/core2/voter-groups.test.ts` line 83).

**Fix.** Keep every counted household at weight one or more. When the sample holds more adults than the county needs, draw fewer sample households (or hold the weight at one) so the weighted adults still add up to the county's eligible count. Change the weight code, not the test.

**Time box.** 3 hours for one Sonnet session.

**Rules.** One model, two tiers (owner, Oct 14): a counted household is read by every engine with the same rule as a full one, times its weight, so every counted household stands for one or more real households. One rule, all 56 places: the fix holds in a small county and a large one with no place named in code. Research before building: real data calibrates the weights and never decides one household's outcome.

**Done when.** A second session runs `src/core2/voter-groups.test.ts` at Valley City, North Dakota with the seed above and it passes. It then builds `buildBenchWorld` in two more places drawn from all 56 (names and seeds written down) and lists the smallest household weight in each, which is 1 or more. It names the household record and its weight before and after the change, and the weighted adults still match the county's eligible count in each place.

**Waits on.** Nothing.

**Files.** src/core2/voter-groups.test.ts, src/core2/opening-county-sample.ts, src/core2/counted-groups.ts

**Notes.** Not caused by PR 8060, which changes no engine file. The golden path draws a random place, so this fails only sometimes.

**Notes (Fable's check, Nov 10).** Two more sightings, from core-voter-groups-weight-under-one-fernwood (proposed drop into this item): on clean main at c8273e2e6e src/core2/voter-groups.test.ts fails in Fernwood, Idaho (place key 1627640, world seed eba04327de239c4a9b3cf1afdbca4c70a48536225da8601591d8cd9e444baee0) with a weight of 0.77, and the same step failed on pull request 8154 in San Lorenzo, Puerto Rico (world seed 82d7b46a29debf1ff32ff697623ab8b0288375cdc8ce1b4ef970f499929a9748; that message was not confirmed). The second session replays Fernwood as well as Valley City.
