---
id: world-fill-in-cash-exceeds-group-fund-central-falls
title: "Filling in a counted household for a constituent case crashes the day: Insufficient funds in its group's fund"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: opus
effort: medium
root: design-one-model-two-tiers
source: Found by the door scenes builder running src/director/polling-place.test.ts on train 8bb1ff9d, Nov 14
---

**What.** A played world throws during an ordinary day with "Insufficient funds" in a counted group's fund when a constituent case fills in one of its households (`fund:group:jurisdiction_41ab3644c2f3f545:state-lower:44056:with-children:income-1:other:65-plus:retired`, `fill-in:household_c03df496a3b4a4db:248:cash`). The run stops before the eve of the first election. Seen: the day the player plays stops with that error and the game can't go on.

**Cause.** Measured: `GOLDEN_PATH_SEED=214f3cabe3d2caa9 npx vitest run src/director/polling-place.test.ts` in Central Falls, Rhode Island (4414140) throws while building the world to the eve of its first election. It does so on train 8bb1ff9d (clean, in a separate checkout) and on PR #9288's head. The stack is `officeHours` → `bringCases` → `bringCase` (src/core2/modules/constituent-cases.ts line 479) → `fillInPerson` (src/core2/state.ts line 2485) → `releaseResidentHousehold` (src/core2/modules/residents.ts line 2155) → `transferSplit` (src/core2/accounts.ts line 596). The fill-in moves one household's cash out of the group's fund, and the fund holds less than that amount. The cause of the shortfall is not yet found. It may be the same weight error that `world-counted-departure-insufficient-group-funds` names for departures (earlier departures taking too much from the fund), or the fill-in's own share. Check that first.

**Fix.** Find which earlier transfer left the fund short, from the fund's journal for that group in this run, and fix the share there. Never cap the fill-in at the balance to hide it.

**Time box.** 2 hours, Opus.

**Rules.** One model, two tiers: a counted group's money follows the same rule as a full household's, times its weight. No dice, and no cap that hides the shortfall.

**Done when.** The command above runs green at Central Falls with that seed, and one played year in two other drawn places shows no throw. A second session sees the world play past that day in the game.

**Waits on.** Nothing. Read `world-counted-departure-insufficient-group-funds` (in-pr) first.

**Files.** src/core2/modules/residents.ts, src/core2/state.ts, src/core2/counted-money.ts, src/core2/modules/constituent-cases.ts

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288), Nov 14.
