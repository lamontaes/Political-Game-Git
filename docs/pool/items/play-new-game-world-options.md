---
id: play-new-game-world-options
title: "The new-game screen passes the custom world's economy setting and starts the game from the world options"
area: play
kind: feature
priority: 3
size: S
status: done
claimed-by:
pr: #4699
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `worldGameOptions({ economy })` exists (modules/world.ts) and the macro module reads it, but no new-game screen passes it and src/bench/world.ts wires the modules by hand. Add the form and have start-up call `newGame` with the options.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** A new game started with a different unemployment or inflation setting opens in that economy, shown by the macro state record, in a drawn place.

**Files.** src/bench/world.ts, src/core2/modules/world.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4699 (branch claude/new-game-economy): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4699 (branch claude/new-game-economy): The claimed item play-new-game-world-options is a Play-area screen/startup task, but this diff changes the shared Core world-settings.ts API and adds its core test while leaving the Play form/startup work unbuilt. No Core-area agreement is recorded in the PR body or discussion. Have the Core-area session land the shared setting change, then keep the Play PR to its screen/startup wiring, or record the owning-area agreement before resubmitting; finish on that branch, merge main into it first.
