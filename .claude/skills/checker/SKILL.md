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

## Fix or send back

- **Fix yourself, as plain commits on the branch:** prettier and eslint `--fix` output, a missing or malformed release declaration, the `Pool item:` line, pool item paperwork, a spelling-guard hit, a stale count in the body, and a type error whose fix is local and obvious (a missing import, a renamed field, a null check the type already demands). Each fix keeps the builder's behavior exactly; rerun the check it fixes.
- **Send back, never fix:** anything that changes what the code does, a failing test (unless the failure is the test's own typo), a design or rule question, a code conflict, or a fix you cannot finish in 15 minutes. One PR comment starting `Checker <k>:` with the failing command, the file and line, the place and seed, and the one change needed; message the builder session (`CREW.md`) the same line. A sent-back PR goes back to its builder as that builder's next job.
- Never skip, narrow or loosen a test, never raise a timeout without a measured reason, never touch another PR's branch, and never merge.

## Hand-off to the merger

When every line passes, post one comment and update the PR body's gate line:

`Checker <k>: gate passed on head <sha> (main <sha>): typecheck, eslint, prettier, release:check, zero-dice, pool --check, <n> tests incl. fresh draws <place/seed>, <browser check>. Fixed: <what you fixed, or nothing>.`

Then message the merger for the PR's parity (`CREW.md`) with the PR number and head. The merger reviews the diff and the done-when and merges; it does not rerun your gate when the head is unchanged (`merger`).

## Stop condition

A pass ends when every PR in your share is checked at its current head or sent back with one comment. Then take the oldest unchecked PR in another share. When nothing is open, message the CTO one line and wait for the next message.
