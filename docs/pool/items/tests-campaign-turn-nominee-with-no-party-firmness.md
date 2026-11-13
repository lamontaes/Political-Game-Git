---
id: tests-campaign-turn-nominee-with-no-party-firmness
title: "Two nominees of different parties answer alike when the nominee holds no party at all (partyFirmness clamps to zero)"
area: elections
kind: bug
priority: 2
size: S
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
source: Red desk, Nov 13 (fresh draws of PR #8998)
---

**What.** src/core2/campaign-turn.test.ts, "two nominees of different parties never answer alike, with positions on a sliding scale", fails on clean main and on PR #8998's branch at GOLDEN_PATH_SEED=2c57496978f6ab09 in Hermann, Missouri (2931762): the same person filed under the Democratic and the Republican label answers all 71 platform questions the same. The place's parties are recorded by side (Republican 1, Democratic -1). Seen: a nominee's party label moves their answers, unless their own record says they owe the party nothing.

**Cause.** Found in code: `StanceReader.stance` in src/core2/campaign-stances.ts blends the person's own view with their party's position by `partyFirmness`, which is `clamp(partyFirmnessBase × loyalty + partyFirmnessTieWeight × tieLean + traits, 0, 1)`. For someone with no party tie, whose traits lean far enough toward staying out of parties (`leanedScore(..., "campaigns.party-firmness", "join", "stay-out")`), the sum is at or below zero and clamps to zero, so the party's position has no weight and either label gives their own view. The test's first pair is the first adult who stands somewhere, whoever they are, and it assumes everyone's firmness is above zero.

**Fix.** Needs a decision from the governing lead, one of two: (a) the test's pair is a nominee whose firmness is above zero (a person who holds no party is a real outcome and is passed over by name), or (b) the clamp is a threshold the sliding-scales rule forbids, and firmness is never exactly zero for a nominee who files under a party (a party label they chose to run under carries some weight). Build what the lead rules.

**Time box.** 1 hour

**Rules.** Sliding scales and causes: nothing flips at a threshold, and a clamp to exactly zero is one. No dice: firmness comes from the person's tie, loyalty and traits.

**Done when.** A second session runs campaign-turn.test.ts on main at GOLDEN_PATH_SEED=2c57496978f6ab09 and at a fresh seed, each naming its drawn place, and the two-nominees case passes under the lead's ruling, its output naming the nominee's firmness.

**Waits on.** The governing lead's ruling between (a) and (b).

**Files.** src/core2/campaign-stances.ts, src/core2/campaign-turn.test.ts
