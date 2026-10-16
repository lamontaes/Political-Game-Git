---
id: core-old-imports-14
title: "The last 14 core files that import from the old folders"
area: core
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: claude/core-old-imports-14
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T05:07:20.786Z
---

**What.** 14 non-test files in `src/core2` still import `src/simulation`, `src/presentation` or `src/player-control-state-v1` (it was 71). Move or re-home them; `player-control-state-v1` is the most imported (6), then `simulation/types`, `simulation/world`, `living-world/town-pay` and `town-employment`. Each move is a path change, because the old files re-export the kernel types. The files that build the opening (town-pay, town-employment) move with the population builder's own work. Anything still needed from the old folders is listed in the PR body.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs.

**Done when.** The grep `grep -rlE 'from "\.\./(\.\./)?(simulation|presentation|player)' src/core2 --include=*.ts | grep -v test` prints nothing, the typecheck and the changed files' tests pass, and a drawn-place opening in buildBenchWorld builds the same town as before by record id.

**Files.** src/core2/**, src/simulation/**

**Notes.** core.md lines 176 and 203, checked Oct 15.
