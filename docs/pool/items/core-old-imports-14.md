---
id: core-old-imports-14
title: "The last 14 core files that import from the old folders"
area: core
kind: cleanup
priority: 2
size: L
status: done
claimed-by:
pr: #4773
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** 14 non-test files in `src/core2` still import `src/simulation`, `src/presentation` or `src/player-control-state-v1` (it was 71). Move or re-home them; `player-control-state-v1` is the most imported (6), then `simulation/types`, `simulation/world`, `living-world/town-pay` and `town-employment`. Each move is a path change, because the old files re-export the kernel types. The files that build the opening (town-pay, town-employment) move with the population builder's own work. Anything still needed from the old folders is listed in the PR body.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs.

**Done when.** The grep `grep -rlE 'from "\.\./(\.\./)?(simulation|presentation|player)' src/core2 --include=*.ts | grep -v test` prints nothing, the typecheck and the changed files' tests pass, and a drawn-place opening in buildBenchWorld builds the same town as before by record id.

**Files.** src/core2/**, src/simulation/**

**Notes.** core.md lines 176 and 203, checked Oct 15.

Looked at 2026-10-16: the grep matches six of the 14 only because `../player-control-state-v1` and `../player-stops-v1` already live in `src/core2`, so they are not old-folder imports. The real ones are the opening builders (`population.ts`, `opening-employment.ts`, `opening-work.ts`, `tooling/*`) and three leaves (`health.ts` reads `simulation/crisis/condition-pack` and `death-causes`; `legislature-bill-form.ts` reads `simulation/bill-numbering-styles`). The opening builders pull `town-pay` (2,169 lines), `town-employment` (1,718), `town-residents` (907), `work-schedules` (714), `life-queries` (1,206, used by 199 files) and `jail-terms`, so this is a split item, not a small one: the leaves first, then one item per opening module.

Sent back 2026-10-16 from PR #4773 (branch claude/old-imports-leaves): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
