---
id: campaign-incumbent-response-test-red-by-seed
title: "The incumbent-response test finds no race to test in most drawn places, on main too"
area: elections
kind: bug
priority: 1
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
source: added with npm run pool -- add
---

**What.** src/core2/campaign-incumbent-response.test.ts fails on clean main with GOLDEN_PATH_SEED=ih1: its word test finds no drawn place in 24 draws. In 19 of those draws (ih1) and 14 (ih2) the reason is no open contest with a serving incumbent who can run again (none held), because the test's own world seats few town incumbents as full people; in most of the rest the word does not show the challenger ahead among the incumbent's circle. The test's three cases that wait on such a race, and the doors case PR #8516 adds, cannot pass, so the incumbent's reading of a race goes unchecked. Guards: an incumbent in a council race who comes home to campaign when a challenger gains on them.

**Cause.** Measured: GOLDEN_PATH_SEED=ih1 npx vitest run src/core2/campaign-incumbent-response.test.ts on main 282a7430dc fails the word test with 19 of 24 draws passed over as none held; on PR #8516's branch, ih1 and ih2 fail its word, counted and doors tests the same way. incumbentRace (the test's own finder, around line 134) takes only a contest whose incumbent term names a full person (term.personId), and the test's world (built with openOffices but no officials module) leaves most town seats to named officials, whom holderOf cannot fill in without that module.

**Fix.** Build the test's world with the officials module so holderOf fills in a seat's named holder as the played world does, or draw its places with the played world (buildBenchWorld), and in either case draw until a race holds the case, naming the places passed over. Never loosen what each case checks.

**Time box.** 3 hours

**Rules.** No dice: a test finds its case by drawing places, never by forcing an outcome. Ask why: each place passed over is named with its reason.

**Done when.** A second session runs src/core2/campaign-incumbent-response.test.ts on two fresh seeds and every case passes, each naming its drawn place and seed and the places it passed over.

**Waits on.** Nothing.

**Files.** src/core2/campaign-incumbent-response.test.ts
