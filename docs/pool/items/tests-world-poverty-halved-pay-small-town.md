---
id: tests-world-poverty-halved-pay-small-town
title: "world-poverty.test fails on main in Lupton, Arizona: halving every pay leaves the poverty share unchanged in a 14-person town"
area: core
lead: effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/poverty-halved-pay
pr: #6251
blocked-on:
source: laws lead, Oct 26
claimed-at: 2026-10-27T06:35:43.051Z
---

**What.** `src/core2/world-poverty.test.ts` ("is the engine's record, spreads by household and moves with pay") fails on clean main at 6be073c3b1 with `WEB_POVERTY_SEED=2bb9c36ff3aac413`, which draws Lupton, Arizona: "expected 0.21428571428571427 to be greater than 0.21428571428571427". The town's poverty share is 3 of 14 people (one-adult households 0.750 poor, the others none; the lowest income fifth all poor, the rest none). After the test halves every job's daily wage and every household's yearly wages, no one else falls below the line. Whether the households above the line live on income other than wages (retirement, assistance) or are far enough above it is not traced. The laws lead's health branch hit it on a random draw (PR #6026); it is red by draw, not by a change.

**Rules.** Never weaken the check into nothing: halving pay must still raise poverty wherever a household lives on wages near the line. Ask why: read the households above the line and what their income is before changing the test. One rule, all 56 places.

**Done when.** The test passes on `WEB_POVERTY_SEED=2bb9c36ff3aac413` and on two fresh draws named in the PR, and still fails when the poverty measure stops reading wages. **On screen.** None by design: this is a check; the player notices only that the numbers stay believable.

**Files.** src/core2/world-poverty.test.ts

**Notes.** Filed by the laws lead, Oct 26, from the health branch's gate.

Worker check (Claude, Oct 27): already fixed on main. The test halves pay up to ten times until the share rises (src/core2/world-poverty.test.ts, `halving < 10 && last <= before`). It passes at `WEB_POVERTY_SEED=2bb9c36ff3aac413` (Lupton, Arizona) and on fresh seeds `pv1a` (Honeyville, Utah) and `pv2b` (Golden Shores, Arizona). With the poverty measure no longer reading wages (named jobs fixed at a constant, counted households at a constant) it fails at the seed: "expected 0.0145 to be greater than 0.0145". No code change was needed.
