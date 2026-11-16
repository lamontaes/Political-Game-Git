---
name: train-gate
description: >
  The gate a pull request passes before it is named for the train (draft PR
  #9554 on `claude/project-thread-lhbwzt-train2`, and its successors) while the first account's merging is stopped: the
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
   Run it against the PR's own base, the Train head it merged, not main: `RELEASE_DECLARATION_BASE=<train sha> RELEASE_DECLARATION_HEAD=$(git rev-parse HEAD) RELEASE_DECLARATION_MODE=pr npm run release:check`. Against main's merge-base it can pass because the Train's own declarations cover the range, while CI on the PR fails for a missing declaration (#9430, Nov 15: six skill files with no declaration passed locally and went red in CI).
6. `npm run zero-dice`, `npm run pool -- --check`, and `npm run test:skill-ops` when an instruction or skill file changed.

Cloud sessions set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command.

## Saying where it ran

A gate line names each command, its exit code and where it ran (which container, which clone, which head). "Tests pass" with no place is not evidence; ask where it was run. If the head moves after a check, the check is stale: say what changed or run it again.

## Reds that are not yours

A test that draws a place or case at run time cannot be listed as a known red: it is fixed or deleted (`pinned-tests`; Account lead, Nov 16). Compare against the clean train head, not only main: main's reds and the train's reds differ. Keep the current known-red list in project memory and in the PR body; a red also red on the clean base does not block, and a red the PR introduces does. A red on a drawn seed must name its seed: keep the test's own seed line in any filter on the gate's output. A red whose seed was lost is not attributed until five new draws run on the head and every red seed also runs on the clean train head (Account lead, Nov 15). Never skip, loosen or quarantine a test to get green (`pinned-tests`). An accepted PR can still break the world: when a trace shows it, the lead pulls its sha from the Train order and the fix goes on that PR's own branch. A fault found in another PR's fold goes to that PR's builder with the place, seed and figures; the finder's test waits and does not re-pin.

## A new test's time limit (Account lead, Nov 15)

Set a new or changed test's limit near twice the slower of two runs: the test alone, and the test beside the PR's other changed test files (CI's `unit` job runs them together). Write both in the test's comment. A limit set from the run alone went red on CI (#9509: 32 s alone, 74.6 s on CI beside four other files, against a 70 s limit). For a drawn red you did not cause, rerun it at the seed it printed on the clean Train head (`GOLDEN_PATH_SEED` or the test's own variable) and say "red at the same seed on <sha>"; a test that prints no replayable seed is said as such.

## Shas and lines

- Always the full 40-character sha. A short sha is refused.
- The builder reports to the lead with the key diff, the tests and the sha. The lead approves; the builder marks the PR ready and posts `train-ready #N <full sha>` as a comment on the PR itself; the lead names the sha to the Train. Issue #8928 refuses new comments (past 2,500 since about 09:00Z, Nov 16), so every line that used to go there goes on the PR, and a new crew issue has to be named by the owner or the CTO (Account lead, Nov 16).
- Words and story PRs also need `Words lead: train-ready #N <sha>` before they join; the readers put their stamps on the PR too.
- PRs that only work together are named to the Train together, in one message, each with its full sha.
- A PR based on the train branch shows "merged" on GitHub when folded. That is not a merge to main.
- After a usage limit resets, every thread that failed needs a message.

## The Train works in rounds (CTO, Nov 16)

The Train pushes one head, posts `Train 2 ready at <full sha>` on #9554 with the red test files and why, and leaves that head untouched until validate, golden-path and new game finish; folds named meanwhile go on a second branch. Each push cancels the checks of the push before it, so nothing is pushed between rounds.

## A moved head needs a new stamp

A `Words lead: train-ready` stamp is for one sha. If the head moves afterward, the stamp is void and the PR is read again, unless the diff since the stamp is lint only (prettier or eslint, nothing a player sees). Say in the post what changed between the two heads. A played-file sha may also be waived when the last commit holds a pool item and its release note and nothing else (Account lead, Nov 16).

Readers' lines are not the lead's acceptance (Nov 15, #9369). Post `Account lead Tn: train-ready` only after the lead's message accepts that exact sha, even when both readers' carry-over lines are already up. A head several Train folds behind is not accepted however clean its gate: merge the newest pushed Train head, gate again, and show each red at the same seed on the clean Train. A line posted early is struck through and marked withdrawn, and the PR goes back to draft.

## A new core2 source file needs its family and its owner (Nov 15)

A new file under `src/core2` fails `tests/guards/families.test.ts` until it is in a family in `tests/guards/families.json`, and is in `.github/CODEOWNERS` (the test compares the two). When another family's file (the bench, the executive) imports it, list it under the family's `entry` too, or the guard says "Import the family's entry instead." Run that one test before pushing a PR that adds a core2 file.

## Counting conflicts (Nov 15, Visit/Call thread)

After a merge stops on conflicts, count them with `git diff --name-only --diff-filter=U`: data files (judged stores, `scene-places.json`) conflict beside the code, and a count of code files alone misses them.

## Carrying an old PR (Nov 15)

- Bring the old PR's change with `git diff <old>~N <old> -- . ':!docs/play-first/shots' | git apply --3way`, then resolve each conflict by reading both sides; where the train already does what the old PR added (a label, a briefs-only lead), keep the train's side and say so in the PR body.
- Open the draft PR before writing the number into the pool item's `pr:` field; a guessed number is wrong.
- A force-push is refused. Your branch is behind the train once your last PR folds, so merge the train in and push as a fast-forward.
- `npm run zero-dice` refuses a new list-pick, and `-- --update` rewrites every row. Reuse the one allowed pick (`oneOfParents` in `src/core2/opening-origin.ts` for a parent pick) instead of adding one.
- A new source file in `src/core2` needs its path in `tests/guards/families.json` (inside the family it belongs to) and a CODEOWNERS line from `node --import tsx scripts/guards/codeowners.ts`.
- A release declaration with `impact: none` carries no `section` or `title`; a patch note is for a player-visible change.
- A pool item that is `in-pr` needs `pr:` set, `after:` and `blocked-on:` present (empty is fine), a `root:` listed in `docs/pool/roots.md` (or `none`) and a Done when that says what a second session sees in the running game.
- `npm run guards` names its pool red "docs/pool/INDEX.md ... this branch changes it" when the clone's `origin/main` is old, not when the branch touched the index: fetch, and it passes.

## Skill-file conflicts when folding a named sha (coordinator ruling, Nov 15)

- When a named sha conflicts only in skill files (`.agents/skills`, with its `.claude/skills` mirror) and both sides only add text, the one who folds resolves it on the Train: keep both sides, copy the file to its mirror, run prettier and `npm run test:skill-ops`, and list each such resolve in the push report and on the crew's issue. Anything else (code, data, banks, tests, generated files, or a skill conflict where one side deletes or rewrites the other's words) goes back to the builder.
- A numbered list that both sides appended to is the same case: keep every item once, the Train's first, then the PR's; renumber, or add the PR's items as plain bullets when the Train's list is bullets. Only the order or number of items differs, never their words. A real rewrite of another PR's words goes back. Skill lists are plain bullets, not numbers, so the next PR does not conflict on the numbers.
- A fold that carries judged-store conflicts and a skill conflict in the same merge is not a send-back by itself: union the judged stores and bank pieces by key as in `generated-file-merges`, resolve the skill text as above, then regenerate (`words:verdicts`, `words:rules` twice).
- When a fold changes a test file, run that whole file; once per push, run every test file under `src/director` that any fold in the push touched, so an old red is found on the Train and not first in a builder's PR. A red that is the same on an older base (bisect with a sparse copy: `scripts/storage/helper-checkout.sh new <dir> <branch>`, then `git checkout --detach <sha>` and the one file) is an old Train red; report it and do not hold the push for it.
- **A stamped or accepted PR never re-merges the Train; an unstamped one merges the newest pushed Train head before stamps and gate (Account lead, Nov 15).** A builder whose branch holds an accepted or stamped sha pushes the next item to a new branch named `<branch>-<item>`, cut from the newest Train head with only its own commits; the old branch does not move.
- One item per PR: a second pool item that rode along (a cause write-up for another PR's fix, say) comes out before acceptance. Copy its files to `/mnt/project-files/pool-drafts/` and open it as its own small PR after the PR it points at folds.
- `npx tsc --noEmit -p .` fails at once with TS6310 on the project references; that says nothing about your change. Run `npm run typecheck`.
- **Next item, new branch.** The branch holds the PR in flight, so the next PR goes on `<branch>-<item>` cut from the newest Train head with only its own commits cherry-picked (a merge of the Train into a branch that carried the first PR's skill lines conflicts again and drags the first PR into the second). Gate it there, and push only after the first PR has folded.

## Lessons of Nov 15, afternoon (gate and lines)

- **Merge the newest Train head before the stamps and the gate, and run the whole gate on the exact final head.** A merge of a newer Train head is a new head: the gate runs again on it, and a red that was also red on the previous Train head is named as such with the head it was checked on. A last commit that touches only pool files reuses the typecheck and nothing else.
- **A gate run in the background dies when the worker restarts, and also when it is started as `( … ) &` from a tool call.** Start it with `setsid nohup bash run.sh > /dev/null 2>&1 < /dev/null &`, look for its process a minute later, read the log for ALLDONE, rerun the missing steps on the same head, and keep temporary probe test files out of the tree until the run ends. Do not fold or switch branches in the checkout while its test files run: they read the working tree.
- **Lines in the changed-test list that a PR deleted give NO RESULT in one second.** List only files that exist on the head before the batch.
- **A red in a PR's own test is checked in a clean copy at the PR's head before it is called a collision.** Check out the named sha in the sparse copy, run the one file; if it fails alone there, the PR goes back to its builder with the place, seed and message and is left out of the fold (#9519 at 2fd1c858, Surrency GA seed pl4). If the file also fails on the previous Train head, it is a known red: name it with the place and seed and do not hold the push.
- **Pool items sent by other threads to ride on the Train** are copied as sent, then made to pass `npm run pool -- --check`: a Cause that begins Found in code:, Measured:, Design: or Needs cause.; a last sentence of What that begins Seen: (on its own line if the split misses it); a Done when that says second session and a drawn place; no `after:` that names an item the Train does not carry. Add its release declaration (`impact: none`) beside it.
- **When the owner has another account read the Train,** the reviewed PR is frozen at one pushed head (nothing more goes to its branch, its body lists the folds, known reds and never-fold shas, and one comment lists every fold in order), and later folds go in a new draft PR whose branch starts from that head; read that PR's new comments each time #8928 is read and pass them on word for word.
- **Keep each changed test's time.** Run the changed tests with vitest's verbose reporter, alone and beside each other (`--maxWorkers=2`), and report every file's time and limit; a gate that keeps only pass and fail counts has to be run again. `npx vitest run --dir . tests/guards --maxWorkers=2` is 180 tests; current-pointers is the one known red.
- **A train-ready line never comes before the lead's acceptance.** The builder reports the diff, tests and full sha; the lead accepts; only then the builder marks the PR ready and posts `Account lead Tn: train-ready #N <sha>`.
- **CI measures a PR built on the Train against main.** paired-performance and `repository` list the Train's whole diff, so before taking the red as the PR's read the same check on the Train head it is built on (#9538 measured 1.244 against main, the Train alone 1.170). The PR's own cost is year 1 against the Train head at three places, with and without, twice each side, alternated. `repository` exits 249 on more than about 2,000 changed files until the Train's batched validate.yml is in the base. A red aggregate `validate` is its parts: open `repository`, `guards` and `unit` separately; a canceled part belongs to a head that was pushed over, and Train files that fail prettier show red on a PR that never touched them.
- **CI's pool guard counts every pool item the Train carries as touched by your PR.** A Train item that fails the standard fails your guards and validate checks though local `npm run guards` passed (#9422: `words-asked-mutual-no-answer-offered-against-the-record`). Comment once on the PR naming the item and where it came from, and push nothing for it; the fix belongs to that item's own PR. A red golden-path row is compared the same way: run that exact case on the clean Train head, and a red there is the Train's (M2-07 at Dry Valley NV, #9529).
- **A thread with a second item:** the second item's `pr:` names the same open PR, the PR body's line 1 names the new item with the earlier one below it, and the lead names only the commits after the folded sha to the Train. `npm run guards` fails the pool guard until an in-pr item names its pr.
- **Pool item files and guard output:** read `npm run pool -- --check 2>&1 | grep <item-id>`, not its tail (see `file-a-pool-item`).
- **A background job started from a tool call dies when the turn ends.** Use the tool's own background mode (`run_in_background`, with a timeout of two hours at most); a job past the limit is cut, so split a long batch in two lanes and keep each lane's output file, and read what already finished before restarting the rest.
- **Folding a long queue:** a script folds each named sha in order after checking its train-ready line and that the PR head equals the sha, stops at the first conflict and says where. A conflict in a release declaration whose id release consumed on main is a rename (give the declaration a new id), not a revert; the same id declared twice (a pool-only copy and the real patch) keeps the real patch. Import and export lists that both sides extended are united by hand; an overlap of code goes back to the builder with the files named.
- **A red that passes alone on a PR's own head but fails at its fold is a collision with an earlier fold,** not the PR's fault alone: binary search the Train's first-parent folds with the one test file in the sparse copy (about a minute a step), and tell the builder the fold it first goes red at. A red that also fails on the pushed head before the fold is old and goes in the push note with its item.
- **Compare every new red against the last pushed head in the sparse copy** before naming it: many reds on a long batch were already red there (a changed opener, a drawn seed). Run only the failing files, in the order of the batch output.
- **A Train that merged main resets the pool INDEX guard's base;** a Train that did not is red on it against a newer main until the merge lands, and the push note says so.
- **Train-ready lines are comments on the PR itself since Nov 16, 09:00Z** (issue #8928 refuses comments past 2,500, and no new issue is opened). Read the PR's own comments for the line with the full sha, same wording as before; `gh api --paginate repos/<repo>/issues/<N>/comments` lists them.
- **A test file that did not exist at the last pushed head cannot be compared there:** its red is its own head's or a collision, so name it as new and send it to its builder; do not spend a run on the old head.
- **A day-zero known-red mark can flip between folds** (Washington's drives tables were full at one head and empty again at the next): run `src/core2/day-zero.test.ts` on the final head and restore or drop the marks by what it prints.
- **A test whose limit is near its alone time fails the moment the machine is busy or a later fold adds work:** time it alone on an idle machine before blaming the fold (Amherst NH tests ran 215 s against 180 s).
