---
id: tests-player-housemate-contact-refused
title: "player.test's household-contact case fails on main: becoming-friends between housemates is now refused by the casting rule"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: opus
effort: low
root: none
source: Red desk, Nov 13 (found gating #9035; bisected)
---

**What.** `src/bench/player.test.ts` "a household's contact on the first day is a scene that stops the week there; a player who allows no scenes has a quiet week" fails on clean main (f853d8aa, 9e436316, 48296b91, adb23f12): `expected 'complete' to be 'stop'`. It is a fixed fixture with no seed, so every pull request that touches src/bench/player.ts or its test sees it in CI. Before #8451 the fixture's two housemates produced the director's `becoming-friends` scene (`person:2021-01-02:other:person`) on January 2, 2021, and the Week stopped on it; now nothing is scheduled. Guards: the bench player's stop on a director scene in the first week.

**Cause.** Measured: with `npx vitest run --dir . src/bench/player.test.ts -t "household's contact"` (a fixed fixture, no seed): `git bisect` from c7de5067 (the case's own commit, good) to adb23f12 (bad) names bee2e30a, director-casting-rule-on-every-scene-kind (#8451): `becoming-friends` carries `receive.counterpart: "apart"` in src/director/data/situation-types.json, and `receives` in src/director/scheduling.ts refuses a cast whose asker lives in the person's household. The fixture's `other` lives in the player's household, and the tie that becoming-friends reads comes only from time together, which in this bare fixture only living together gives. Moving `other` next door with `knownIds` on both sides leaves no contact at all (tried on f853d8aa).

**Fix.** Give the fixture a counterpart who lives apart and spends time with the player through a record the relationship engine reads (a shared workplace or a relationship row), so a scene the rule allows stops the week; or point the case at a situation type whose receive rule is `any`. No assertion changes.

**Time box.** 1 hour

**Rules.** Ask why: the stop the case asserts is named by its record id and situation type, and no assertion is loosened, skipped or given a raised timeout.

**Done when.** A second session runs src/bench/player.test.ts on main and all 14 cases pass, the household-contact case naming the scene's record id and its situation type; src/director/receive-rule.test.ts still passes; and in a new life on the bench in a drawn place (named with its seed), a Week stops on the first scene of the week the director stages.

**Waits on.** Nothing.

**Files.** src/bench/player.test.ts
