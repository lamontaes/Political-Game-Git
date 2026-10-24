---
id: tests-corruption-dulac-no-offer-answer
title: "M3-09 corruption spec fails in Dulac, Louisiana since the deep-past research rows: the reputation-other ask gets no answer"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/corruption-dulac-answer
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T09:46:48.304Z
---

**What.** The accepted golden-path spec M3-09 (src/core2/corruption.test.ts) fails for Dulac, Louisiana (key 2221940, seed 85dd5f6c7746eccd0c937fe4f99a09c9b2b151392136efcb5109e58c9de16b86) in the case that draws more offers to an official the offerer has learned took a bribe: ask(other.id, "reputation-other") returns null at line 244, so the test throws reading its reasons. Bisected on main: it passes at 185d76d7ce and fails from e382438ccc (research: source the deep past, partner age gap, peer group and opening profile rows, from PR 5854), which changes who exists in a generated town. The test draws three fresh places each run, so it fails only on some draws and sends random PRs red. Find why no answer comes back for that official in Dulac (no eligible other official, or the ask path refusing) and fix the cause, never by skipping the place.

**Rules.** No dice: whether a bribe is offered comes from the people's own traits, money and circumstances, so a place where none can be offered must say why by record, not crash. One rule, all 56 places: the case has to hold, or name its cause, in every drawn place. Ask why: the failure message names the place, the seed and the missing record.

**Done when.** src/core2/corruption.test.ts passes with the Dulac, Louisiana case (key 2221940, seed 85dd5f6c7746eccd0c937fe4f99a09c9b2b151392136efcb5109e58c9de16b86) added as a fixed regression case beside the Hawleyville one, and with its three fresh drawn places on two more fresh seeds; the PR names why the ask returned no answer, by record id.

**Files.** src/core2/corruption.test.ts

**Notes.** Found Oct 24 by the speed lead from the golden-path failure on PR 5925 (the payroll change does not touch it: the Dulac case fails the same way on clean main 89095daebb). Reproduce by replacing the fresh draws with corruptionCases(seed, "2221940").
