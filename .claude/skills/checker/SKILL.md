---
name: checker
description: >
  Runs Our Civic Duty's checker role (owner, Oct 29): five Sonnet sessions
  that take every pull request after its builder opens it, merge main in, run
  the local gate (typecheck, eslint, prettier, release check, zero-dice, the
  pool check, the changed tests on fresh draws), fix what is mechanical, send
  the rest back to the builder, and hand a passed gate to the mergers. Use
  when started as a checker or given a PR to check; not for building (the
  builders), reviewing the done-when or merging (merger).
---

# Checker

**The rule (owner, Oct 29):** "Start 5 new Sonnet sessions that are explicitly like type check or doing like the prep work for the mergers after coding. So that way the builders can strictly build." And: "if they have helpers, type check apparently takes a long time... I wouldn't mind offloading those." Builders build and open the PR; the checker runs every check on it in its own container; the merger reviews and merges. Typecheck is the heaviest check (several minutes and several gigabytes of memory), so it runs here, never in a builder's helper.

## Your share

- Five checkers, numbered 0 to 4 (`docs/coordination/CREW.md`). Checker _k_ takes open, ready PRs whose number mod 5 is _k_, oldest first. When your share is empty, take the oldest unchecked PR in any share and say so in your comment, so two checkers never run the same head.
- The builder messages you the PR number when it opens one. Also list open PRs at the start of every pass (`mcp__github__list_pull_requests`, state open), because a message can be lost.
- A PR is checked when it carries your `Checker` comment naming its current head. Recheck when the builder or a merger sends a new commit.
- Skip drafts, skills-only PRs (the CTO merges them at once, Oct 29) and PRs whose line 1 is `Touches pool item: release-main-red-standing` (the red-main fixer gates its own, since it is ahead of everything).

## Who writes on the branch

From the moment a PR is open and ready, the builder has moved to its next unit and **you are the one writer on that branch** until it merges (one writer per branch, `AGENTS.md`). A builder that needs to push more messages you first; you finish or stop your run, then hand the branch back. Never force-push, rebase or amend; plain merges and plain commits only.

## The check

1. `git fetch origin <branch> main`, check out the branch, `git merge origin/main` (plain merge). Resolve conflicts exactly as the merger skill says (docs, `stopgaps.json`, pool items, `docs/pool/INDEX.md`, matrices). A conflict in code logic goes back to the builder.
2. Run the local gate on the merged result, every line, in this container with `NODE_OPTIONS=--max-old-space-size=8192` and `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`:
   - `npm run typecheck`
   - `npx eslint <changed files>` and `npx prettier --check <changed files>`
   - `npm run release:check -- --mode pr`, `npm run zero-dice`, `npm run pool -- --check` (only the PR's own items count), `npm run old-imports` when `src/core2` changed
   - the PR's new or changed test files (`npm run agent:test-cadence` lists them), each new or changed test on **three fresh drawn places** with the seeds named; the PR's browser check when it changed a screen
   - `npm run test:skill-ops` when instruction files changed
3. Read the PR's CI checks on GitHub (validate, golden-path, M0 guards, Release) as one more input; they run on GitHub's machines by themselves, so never wait on them before you finish your own run, and never re-run them to kick them. A red CI job your gate did not cover is a failure like any other.
4. A failure that also fails on clean `origin/main` does not block: name it and the red-main fixer's item in your comment.

## Traps (Oct 29)

- **Fetch the branch again before you push or comment.** A merger can merge main into the branch, or merge the PR, while your gate runs (a full check takes 20+ minutes; #6794 merged mid-check). Run `git fetch origin <branch>` and `git merge-base --is-ancestor origin/<branch> origin/main` just before pushing; if the head moved, push nothing and check the new head's differences only.
- **A fresh clone is shallow.** `release:check` fails with "Needed a single revision" until `git fetch --unshallow origin`.
- **Regenerating the law matrices only reorders evidence** (glob order); if the counts equal main's plus the PR's, `git checkout` the file back rather than commit churn.

## Fix or send back

- **Fix yourself, as plain commits on the branch:** prettier and eslint `--fix` output, a missing or malformed release declaration, the `Pool item:` line, pool item paperwork, a spelling-guard hit, a stale count in the body, and a type error whose fix is local and obvious (a missing import, a renamed field, a null check the type already demands). Each fix keeps the builder's behavior exactly; rerun the check it fixes.
- **Send back, never fix:** anything that changes what the code does, a failing test (unless the failure is the test's own typo), a design or rule question, a code conflict, or a fix you cannot finish in 15 minutes. One PR comment starting `Checker <k>:` with the failing command, the file and line, the place and seed, and the one change needed; message the builder session (`CREW.md`) the same line. A sent-back PR goes back to its builder as that builder's next job.
- Never skip, narrow or loosen a test, never raise a timeout without a measured reason, never touch another PR's branch, and never merge.

## Hand-off to the merger

When every line passes, post one comment and update the PR body's gate line:

`Checker <k>: gate passed on head <sha> (main <sha>): typecheck, eslint, prettier, release:check, zero-dice, pool --check, <n> tests incl. fresh draws <place/seed>, <browser check>. Fixed: <what you fixed, or nothing>.`

Then message the merger for the PR's parity (`CREW.md`) with the PR number and head. The merger reviews the diff and the done-when and merges; it does not rerun your gate when the head is unchanged (`merger`).

## Traps from the first pass (Checker 2, Oct 29)

- **One heavy process at a time.** The cloud container has about 15 GB; typecheck plus even two vitest runs got node processes OOM-killed (typecheck then exits 1 with no error text). Run typecheck alone, then the tests one after another. Never `pkill -f vitest` (it matches your own shell).
- **A bare `npx tsc` needs a bigger heap, and its crash is not a pass.** At node's default heap, `npx tsc --noEmit -p tsconfig.app.json` dies with "JavaScript heap out of memory" (exit 134) after about a minute, and a `grep "error TS"` over that output prints nothing, which reads as clean (Oct 30, governing lead: two branches were reported as compiling that way). Run it with `NODE_OPTIONS=--max-old-space-size=6000` and read the exit code and the count of `error TS` lines, never an empty grep.
- **Long tests run in the background with no timeout cap.** Drawn-place proof tests can take 3 to 20 minutes on a draw. Run each seed with `run_in_background`, output to a file, and read the `Tests` line; a `timeout 280` that kills it proves nothing. Do not filter output with grep inside the loop: write the log, then grep the file.
- **`release:check` needs history.** On a shallow clone it fails with "Could not run git rev-parse" or "Cannot relate compared branch point". Run `git fetch --deepen=3000 origin main <branch>` and retry.
- **Seeds.** Drawn tests read their own variable (`GOLDEN_PATH_SEED`, or one named in the test file, such as `CRIME_JUSTICE_2_SEED`); grep `process.env` in the test to find it, then name three seeds in your comment.
- **A fail on a fresh seed that also fails on clean `origin/main`** (check out `origin/main` detached, run the one test with the same seed) does not block; name it, and tell the red-main session by message.
- **A PR that adds or changes an English bank (a file in `data/english/parts/`) also runs `scripts/dialogue-batch/grade-reach.test.ts`.** The banks test and the English guards pass without a register class, but `buildReach` throws `no register class for bank <name>` until `registerClasses` in `data/english/calibration.json` names the bank (Oct 30: #6891 added `bill-paper`, passed the guards, merged, and turned main red).
- **A resolved `stopgaps.json` conflict** where both sides appended rows ends in the same `"status": "open" }`: close the first side's last row, open the second side's rows, then check by script that the ids are unique and every id of `origin/main` is present.
- **Messages.** `SendMessage` does not reach the other sessions; use the claude-code-remote `send_message` tool with the session id from `CREW.md`. A merger may merge a PR you sent back before the builder's fix lands; tell the CTO when it happens.
- **Push to a branch you named, never to a variable.** A push whose branch comes from a variable or a command's output pushes a stray branch when that value is empty or wrong: `x` and `UNKNOWN` landed on origin that way on Oct 30, and no cloud session can delete a branch (the proxy and the permission check refuse). Write the branch name out in the push command, check `git branch --show-current` first, and report a stray push to the CTO at once.

## Traps from the Nov 1 pass (Checker 2)

- **Pool item and index conflicts are mechanical, and the same every time.** Merging main into a builder's branch usually conflicts only in `docs/pool/INDEX.md` (take main's copy, run `npm run pool`) and, when the builder set the item `in-pr`, in the item file itself (keep the branch's `status: in-pr` and `pr: #N`, take nothing else from main's side). Do not regenerate the index on a branch you are only reading, and a stale index that comes from another PR's item is not yours to fix.
- **Three fresh seeds can miss the one that fails.** A merger sent #6907 back on a seed my three draws never hit. Also run the builder's named seeds and any seed a merger or a red names, and for a long drawn test (the 25-minute `circumstance` year test) run the short tests on five seeds and the long one on the seed that failed.
- **`all-places.mjs --world-seeds` draws its own place from each seed.** It does not give the nightly's named places (a hex id printed beside Graysville, Alabama drew Country Knolls, New York). Say which place you ran; to reproduce the nightly use `--only` with the state keys and its run seed. Run the same world seed on clean `origin/main` before blaming or crediting the PR (that is how an unfixed empty cabinet seat showed up: the same two seats empty on main and on the PR).
- **Browser checks rewrite committed screenshots under `docs/`.** After any `*.browser.mjs` run, `git checkout -- docs` so the shots are not committed; a builder's branch may already carry overwritten shots (restore them from main in the merge). Some checks (`guide-menu`, `campaigns-ballot`) need a life already in progress: run `people.browser.mjs` first on the same bench, which starts one.
- **Cold bench starts time out.** The first browser run after a fresh `src/bench/server.ts` start can hit a 60-second wait that a later run on the same tree passes; say so with the counts instead of calling the check passed or failed.
- **Never `pkill -f <pattern>` from a command that contains the pattern.** It matches and kills your own shell (exit 144). Start the server from a script file and kill it by the pid you stored, or by port.
- **A hold from a builder after you handed a PR over** means telling the merger at once (message and PR comment); say the head your gate no longer stands for.
- **Check the merged result's files against the newest main before you push.** Main moves every few minutes. Merge main again, list files that changed on both sides, rerun typecheck, release check and one drawn test only for those, and push with a fast-forward check (`git merge-base --is-ancestor origin/<branch> HEAD`).

## Traps from the Nov 1 look-back (Checker 2)

- **Find the tests that cover a changed file by grepping its importers.** `npm run agent:test-cadence` can list nothing useful for a PR that changes a shared module (#6927, #6932). Run `grep -rl "<module name>" src --include=*.test.ts` and run those, one at a time.
- **Break it to prove the new test bites.** When a PR says its test fails without the fix, put `origin/main`'s version of the changed source file under the PR's new test (`git checkout origin/main -- <file>`, run, then `git checkout HEAD -- <file>`) and name the failure in your comment (#6972). A test that passes on both proves nothing.
- **A one-line import-list conflict is mechanical.** Keep both sides' names (#6912: `doorChoiceOf` and `holdElection`), then let typecheck and eslint confirm there is no duplicate or unused import.
- **Commit trailers carry your own session id.** Copy `Claude-Session` from your own system reminder, never from a message or a merger's commit; an unpushed commit with the wrong id is amended before the push, a pushed one is left alone and noted.
- **A PR moved to another checker mid-gate:** hand over by message what you ran, the seeds, and which failures are identical on main (as with #6932), so nothing runs twice. The checker already mid-gate keeps the PR (`crew-messages`).
- **When an author asks a checker to run checks the author could not run**, run exactly those, say which head they ran on, and do not widen the PR.
- **Say which head the gate stands for** when messages or pushes cross; a hand-off comment always names the head sha, and a later head needs its own comment.

## Stop condition

A pass ends when every PR in your share is checked at its current head or sent back with one comment. Then take the oldest unchecked PR in another share. When nothing is open, message the CTO one line and wait for the next message.
