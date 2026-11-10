---
id: core-voter-groups-weight-under-one-fernwood
title: "Red on main by draw: the voter-groups contract test meets a counted household that stands for less than one household (Fernwood, Idaho: 0.77)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, replaying the golden path's step M0-09 on clean main after it failed on pull request 8154 (San Lorenzo, Puerto Rico), which changes no core code
checked: fable 2026-11-10
---

**What.** On clean main at c8273e2e6e, src/core2/voter-groups.test.ts fails in Fernwood, Idaho (place key 1627640, world seed eba04327de239c4a9b3cf1afdbca4c70a48536225da8601591d8cd9e444baee0): 'expected 0.7700336184304505 to be greater than or equal to 1' at the line that requires every counted voter's weight (the households its record stands for) to be at least one. So a counted household record there stands for 0.77 of a household. Either a record may stand for less than one household (then the test's rule is wrong and every reader that treats a record as at least one household needs a look), or something makes weights under one that should not (the weights of a county's sampled records, or the share-out when a record is filled in: CountedStore.releaseWeight in src/core2/counted-groups.ts adds fractions to other records). Not found which. The golden path's accepted step M0-09 runs this file, so any pull request can draw such a place and go red.

**Rules.** Red main comes first (owner, Oct 15). One model, two tiers: say once what a record's weight may be, and every reader holds to it. Never loosen the test to get green before the cause is named.

**Done when.** The pull request names where the 0.77 comes from, by function and line, and either the weight is whole-or-more by construction or the test and the readers accept a fraction on purpose, with the rule written in src/core2/counted-groups.ts. GOLDEN_PATH_SEED set to a seed that draws Fernwood, Idaho passes src/core2/voter-groups.test.ts, and it passes in three more drawn places. A second session opens dev mode's Metrics tab in Fernwood, Idaho with that world seed and reads the count of voters: it equals the adults counted, to the person.

**Files.** src/core2/voter-groups.test.ts, src/core2/counted-groups.ts, src/core2/electorate.ts, src/core2/residents.ts

**Notes.** The test draws its own place from GOLDEN_PATH_SEED with the label voter-groups; the Fernwood draw came from a random seed in my replay, and the world seed above is the one it printed. The failure on pull request 8154 was the same step in San Lorenzo, Puerto Rico (world seed 82d7b46a29debf1ff32ff697623ab8b0288375cdc8ce1b4ef970f499929a9748); my replay of that place died for memory beside other runs, so its message is not confirmed to be the same.

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of core-voter-household-weight-below-one. That item names where the 0.77 comes from: the county sample's household weight in src/core2/opening-county-sample.ts (lines 286 to 290) is the county's eligible voters over the sampled adults, which is under one whenever the sample holds more adults than the county has voters. Fernwood, Idaho and San Lorenzo, Puerto Rico are now named there as replays.
