---
id: words-bench-stage
title: "The grading bench stages every situation the records fire in one cached world"
area: words
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/words-bench-stage
pr: #4598
blocked-on:
after: words-authored-pieces-gate
source: added with npm run pool -- add
claimed-at: 2026-10-16T17:30:26.535Z
---

**What.** Build `scripts/dialogue-batch/grading-bench.ts`'s first half, run as `npm run words:bench -- --id batch-12 --cache <world cache>`. It loads one cached played world through the coverage batch's `--cache` mechanism (header of `scripts/dialogue-batch/coverage-batch.ts`), draws no new world, and for every situation type in `src/director/data/situation-types.json` whose cause records exist in that world asks the director's own staging (`src/director/scene.ts`, `scheduling.ts`) to stage it with the real people those records put there. A type with no cause record, or with `awaitingProducer`, is listed with its reason and skipped, never invented; a scene whose speaker or body resolves to a raw id is skipped and listed under "Facts that were stood in". With no cache it says so and stops. The player would notice nothing yet; the owner reads which situations the world fired.

**Rules.** No hand-written player text: every word comes from the English engine's banks in `data/english/parts/`, nothing is typed into code or a screen; no dice: profiles vary by traits, never a roll; one rule, all 56 places: the place is drawn from all 56 and named; American English (`npm run spelling`); speed: the bench reuses one cached world and adds no new world run. An effect is a read: staging reads the world's records, with no hand-placed cast; ask why: each staged scene names the cause record id that fired it.

**Done when.** Running the stage step on a cached year in a place drawn from all 56 (name it and the seed) writes a staged-scenes file naming, for every situation type in the catalog, either the staged scenes with their cause record ids and cast ids or the reason it was skipped; a test in `scripts/dialogue-batch/` proves a type with no cause record is skipped with a reason and a scene with a raw id is listed under facts that were stood in.

**Files.** scripts/dialogue-batch/grading-bench.ts (new), scripts/dialogue-batch/coverage-batch.ts (cache read only), src/director/scene.ts, src/director/scheduling.ts

**Notes.** Part of words-grading-bench. Needs the authored-pieces gate (words-authored-pieces-gate, PR #4443) so the bank checks accept authored parts.

Sent back 2026-10-16 from PR #4598 (branch claude/words-bench-stage): Sent back by the merger: prettier --check fails on data/english/batches/batch-12-staged.json (Code style issues found). Run prettier --write on it (or have the generator write formatted JSON), rerun the changed-file checks, merge main and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4598 (branch claude/words-bench-stage): The focused grading-bench test fails on merged head 07b705330: scripts/dialogue-batch/grading-bench.test.ts:67 expected a staged scene but got zero in Blue Ridge, Alabama, seed 76b314aa575e5cb1 (2 tests pass, 1 fails). Reproduce with GOLDEN_PATH_SEED=76b314aa575e5cb1 and fix the staging/acceptance behavior without skipping or loosening the test or choosing a passing seed. Typecheck, eslint/prettier, zero-dice and release pass; the pool check has identical malformed-item failures on clean main and is not the blocker; finish on that branch, merge main into it first.
