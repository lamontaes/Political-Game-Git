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

- **Rules, checks and skills first (owner, Nov 10).** A pull request that adds or changes a rule, a check (test, guard, gate, workflow), a skill, or something every other change runs through (speed, a shared engine) is gated before every other pull request in your share. A pull request whose files such a rule judges is gated after it, and passes it. Hand such a pull request to the merger the hour it passes.
- **Items are built to the standard (owner, Nov 10; `.agents/rules/pool-item-standard.md`).** A pull request's item carries `standard: 2` and `checked: fable`. If a pull request builds an item that says `Needs cause.` or lacks `checked: fable`, send it back; `npm run pool -- --check` names what is missing.

- Five checkers, numbered 0 to 4 (`docs/coordination/CREW.md`). Checker _k_ takes open, ready PRs whose number mod 5 is _k_, oldest first. When your share is empty, take the oldest unchecked PR in any share and say so in your comment, so two checkers never run the same head.
- **How a checker finds pull requests to check (CTO, Nov 10, issue 7365).** Ready means the pull request is no longer a draft: the builder marks it ready with `gh pr ready <number>` or its tool's own button or API. A tool that cannot take a pull request out of draft posts one comment on it starting `Ready for the desk:` and the head commit's hash, which counts the same. A builder that can message its checker still may, but a ready pull request needs no message. A send-back goes on the item's own pull request, not on issue 8928. The pull request is the item's thread (`docs/pool/START-A-BUILDER.md`): read its progress and handoff comments before you check, since it may have been carried on by a different agent on a different tool.
- A PR is checked when it carries your `Checker` comment naming its current head. Recheck when the builder or a merger sends a new commit.
- Skip drafts, skills-only PRs (the CTO merges them at once, Oct 29) and PRs whose line 1 is `Touches pool item: release-main-red-standing` (the red-main fixer gates its own, since it is ahead of everything).

## Who writes on the branch

From the moment a PR is open and ready, the builder has moved to its next unit and **you are the one writer on that branch** until it merges (one writer per branch, `AGENTS.md`). A builder that needs to push more messages you first; you finish or stop your run, then hand the branch back. Never force-push, rebase or amend; plain merges and plain commits only.

## The check

1. `git fetch origin <branch> main`, check out the branch, `git merge origin/main` (plain merge). Resolve conflicts exactly as the merger skill says (docs, stopgap family files, pool items, `docs/pool/INDEX.md`, matrices). A conflict in code logic goes back to the builder.
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

## Stop condition

A pass ends when every PR in your share is checked at its current head or sent back with one comment. Then take the oldest unchecked PR in another share. When nothing is open, message the CTO one line and wait for the next message.

- **A `minor` or `major` declaration needs `section:` and `title:` (Nov 2, Checker 1; #7101, #7106).** A bank change no longer needs `grade-reach.json` rebuilt: that file and the script that wrote it are gone (Nov 10 sweep).

## Lessons of Nov 11 (mechanical misses a builder should not leave for the desk)

- **A deleted file is still named by pool items.** A pull request that deletes a file fails the pool check on every item whose Files line names it. After a deletion, run `git grep -n "<the file's path>" -- docs/pool/items` and fix each line in the same pull request (now also: add the path to the replaced list, skill `current-pointers`).
- **Prettier runs on every changed file, pictures' pages and release notes included,** not only on the code.

## Lesson of Nov 11 (a merger on any tool)

- **A merger started from `docs/pool/START-A-MERGER.md` gates the way this skill says and merges what passes.** Where a desk can gate and cannot merge, its `ready #N <full sha>` line is what the merger or the CTO merges from, pinned to that sha. Post the line the moment the gate passes; a result that is not posted is lost when a session ends.

## More in this folder

Read each file here when its moment comes:

- `references/traps.md`: when a check fails in a way this page does not explain, before you send a pull request back, and on your first pass.
