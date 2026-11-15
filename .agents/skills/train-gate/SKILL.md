---
name: train-gate
description: >
  The gate a pull request passes before it is named for the train (draft PR
  #9052 and its successors) while the first account's merging is stopped: the
  exact checks, why release:check needs a full clone, how to say where each
  check ran, the known reds on a clean train, full 40-character shas, and who
  posts which train-ready line. Use before marking a PR ready, before posting a
  ready or train-ready line on #8928, and when reading a builder's claim that
  the gate passed. Not for the merge itself (merger) or the checker role
  (checker).
---

# The train gate

Owner, Nov 13: "run the checks and fix and just add it all to the train." Nothing on this account merges into main; the Train thread folds only shas the lead names.

## The checks, on the PR's own head

1. The tests for files you changed (`npm run agent:test-cadence` lists them). Never the whole suite or the golden path.
2. `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=8192`. It also runs `typecheck-test-imports`; `scripts/dev-lab/typecheck.ts` alone misses test files, and a broken test import reached the train that way.
3. Prettier and eslint on changed files. When a words, bank or line file changed, `tests/english-parts-banks.test.ts` is in the gate.
4. `npx vitest run --dir . tests/guards --maxWorkers=2`, then `npm run guards` (20 guards).
5. `npm run release:check -- --mode pr` **on a full clone**: run `git fetch --unshallow` first. "Cannot relate branch point" or a pool INDEX red means the clone is shallow, not that the PR is wrong.
6. `npm run zero-dice`, `npm run pool -- --check`, and `npm run test:skill-ops` when an instruction or skill file changed.

Cloud sessions set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command.

## Saying where it ran

A gate line names each command, its exit code and where it ran (which container, which clone, which head). "Tests pass" with no place is not evidence; ask where it was run. If the head moves after a check, the check is stale: say what changed or run it again.

## Reds that are not yours

Compare against the clean train head, not only main: main's reds and the train's reds differ. Keep the current known-red list in project memory and in the PR body; a red also red on the clean base does not block, and a red the PR introduces does. Never skip, loosen or quarantine a test to get green (`pinned-tests`).

## Shas and lines

- Always the full 40-character sha. A short sha is refused.
- The builder reports to the lead with the key diff, the tests and the sha. The lead approves; the builder marks the PR ready and posts `Account lead Tn: train-ready #N <sha>` on #8928; the lead names the sha to the Train.
- Words and story PRs also need `Words lead: train-ready #N <sha>` before they join.
- A PR based on the train branch shows "merged" on GitHub when folded. That is not a merge to main.
- After a usage limit resets, every thread that failed needs a message.

## A moved head needs a new stamp

A `Words lead: train-ready` stamp is for one sha. If the head moves afterward, the stamp is void and the PR is read again, unless the diff since the stamp is lint only (prettier or eslint, nothing a player sees). Say in the post what changed between the two heads.

## Carrying an old PR (Nov 15)

- Bring the old PR's change with `git diff <old>~N <old> -- . ':!docs/play-first/shots' | git apply --3way`, then resolve each conflict by reading both sides; where the train already does what the old PR added (a label, a briefs-only lead), keep the train's side and say so in the PR body.
- Open the draft PR before writing the number into the pool item's `pr:` field; a guessed number is wrong.
- A force-push is refused. Your branch is behind the train once your last PR folds, so merge the train in and push as a fast-forward.
- `npm run zero-dice` refuses a new list-pick, and `-- --update` rewrites every row. Reuse the one allowed pick (`oneOfParents` in `src/core2/opening-origin.ts` for a parent pick) instead of adding one.
- A new source file in `src/core2` needs its path in `tests/guards/families.json` (inside the family it belongs to) and a CODEOWNERS line from `node --import tsx scripts/guards/codeowners.ts`.
- A release declaration with `impact: none` carries no `section` or `title`; a patch note is for a player-visible change.
- A pool item that is `in-pr` needs `pr:` set, `after:` and `blocked-on:` present (empty is fine), a `root:` listed in `docs/pool/roots.md` (or `none`) and a Done when that says what a second session sees in the running game.

- `npm run guards` names its pool red "docs/pool/INDEX.md ... this branch changes it" when the clone's `origin/main` is old, not when the branch touched the index: fetch, and it passes.
