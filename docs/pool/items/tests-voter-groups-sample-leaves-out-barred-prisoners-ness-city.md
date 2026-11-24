---
id: tests-voter-groups-sample-leaves-out-barred-prisoners-ness-city
title: "The voter-groups contract test is red where a town has an adult prison and the state bars prisoners from voting (Ness City, Kansas)"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #9533
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: "Fable B, Nov 15 (the golden-path check M0-09 was red on GitHub for a pull request that changed one unrelated test)"
merged-at: 2026-11-16T01:32:43.378Z
---

**What.** The golden path's M0-09 spec ("the four core pieces") goes red by the draw: `src/core2/voter-groups.test.ts` fails in any town that has an adult correctional facility in a state that bars people held in prison from voting. At Ness City, Kansas it expects 930 counted adults in the electorate sample and finds 914. Any pull request whose commit draws such a town shows a red golden-path check that has nothing to do with it. Seen: the golden-path check on a pull request, and the test's message.

**Cause.** Measured: Ness City, Kansas (2049925), `GOLDEN_PATH_SEED=269b736a7eea34056d4cbc8deff4a52993d81b830772de9863c1a4eade00e2f2 GOLDEN_PATH_PLACE_KEY=2049925 npx vitest run src/core2/voter-groups.test.ts` on the train at df168042e6: "expected [ 'person_0036ba049c70bf44', …(913) ] to deeply equal [ 'person_0036ba049c70bf44', …(929) ]". A scratch copy of the test's opening (not committed) listed the 16 counted adults of the town who are not in the sample: all 16 live in adult correctional rooms (the town's 930 counted adults are 878 in households, 36 in nursing rooms and 16 in adult correctional rooms). The engine is right. Since commit 0a22c86c152 (Nov 14, "Counted correctional rooms do not vote or run where the state bars people held in prison"), `countedVoters` (src/core2/modules/voting.ts) leaves those residents out, and `electorateSample` reads `countedVoters`. The test still builds its expected set from `countedResidents`, every counted adult of the town.

**Fix.** In the test, the eligible set is the town's counted adults who may vote: build `adults` from `countedVoters(api)` in place of `countedResidents(core)`, and add one check that the people left out are exactly the residents of adult correctional rooms where `incarceratedMayVote` bars them, by id. No engine change.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test holds in a state that bars prisoners and in one that does not, with no state named in it. One model, two tiers: a counted prisoner is barred by the same law as a named one. Never loosen a test to get green: the sample must still equal the eligible set, id for id.

**Done when.** A second session runs the command above on the train or main and it passes at Ness City, Kansas, then runs the test in a drawn place it names with its seed in a state where prisoners may vote and sees the sample hold every counted adult, by id.

**Waits on.** Nothing.

**Files.** src/core2/voter-groups.test.ts

**Notes.** Nov 15 (Fable B): seen as the one accepted failure of the golden-path run on GitHub for #9468, whose only change is another test file.
