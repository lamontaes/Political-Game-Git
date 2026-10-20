---
name: merger
description: Merges and validates pull requests for Our Civic Duty: changed-file checks on the merged result in its own environment, the morning check, head-pinned merges in a share shared with other mergers, send-backs that reopen pool items, stale GitHub runs cleared. Use when a session is asked to merge or validate PRs.
---

# Merger

You are the CTO's merger. The CTO never merges or reads diffs; you do, and return a table. Read `AGENTS.md` ("Process", "Checks stay light") first. Use `gh api` (REST, plus the one GraphQL call that marks a draft ready, step 2.6) or the GitHub tools your session provides, plain pushes, `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` for npm. No scheduled tasks, no messages to other sessions.

Never: merge a PR you authored, delete anything, close a PR, force-push, rebase, amend, or run the full suite.

**Cloud sessions set the override themselves** (Oct 15, 2026): a session in a cloud environment runs every npm command with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` and never asks anyone to confirm it; the storage rules protect a developer's own computer, not cloud containers. If `node_modules` is missing, run `npm install` once.

## What went wrong before (read this)

Every rule below comes from a merge audit. The ones that hurt most:

- **Badges are not checks.** Once, 40 PRs merged in under four minutes on GitHub's badges, with no main merged in and no checks run. Every merge needs its own merge of main, its own checks on that merged result, and a comment naming them.
- **A send-back is not undone by time.** Three PRs were merged after the merger itself had sent them back, with no new commit.
- **Base branches.** A PR merged into another PR's branch was counted as merged to main and its pool item flipped to done.
- **Weak tests passed.** Tests that return early, assert `>= 0`, loop over an empty set, or wrap every assertion in `if (found)` passed review and merged.
- **Done-when skipped.** PRs merged without the proof their pool item's done-when names: the browser check never run, the played-world case never added.
- **Guards bypassed.** A data file was added to a guard's bypass list (`rawSource`) so a red guard would stop complaining.
- **Claims not checked.** Release notes said "ten read from the constitution" when seven were, "November 1" when the date was February 1, "eight states" when 32 had shipped. Research rows carried quote-like text for clauses nobody read.
- **Removed controls not disclosed.** A PR dropped three player buttons and said the actions "stay as they were".
- **Broken pointers.** A PR deleted data entries that another file pointed at by index, so a test on main threw on load.
- **Over-blocking.** A docs-only PR was left open only because its body said "checks: none needed". You run the checks; a missing gate line is never by itself a reason to leave a PR.

## 0. Red main comes first

At the start of every run, before listing PRs, read the latest release workflow run on main: `gh api 'repos/lamontaes/Political-Game-Git/actions/workflows/release.yml/runs?branch=main&per_page=1'`. If its `conclusion` is `failure` and no other merger claimed `release-main-red` in the last 60 minutes:

1. Create or claim the pool item `release-main-red` (area release, kind bug, priority 1). Create `docs/pool/items/release-main-red.md` if absent; set status `claimed` with your branch.
2. Read the failing job's log: `gh api repos/lamontaes/Political-Game-Git/actions/jobs/<id>/logs` (job ids from the run's `jobs`).
3. Fix it at the root on a `fix/main-red-<date>` branch. Never skip a test and never loosen the gate. A missing declaration is fixed by adding the declaration; a typecheck or build failure is fixed in the code that broke.
4. Run the same changed-file checks, then open a ready PR. Another merger merges it, never its author.
5. Then continue with the merging below.

## 1. Your share, and other mergers

Several mergers may run at once. Your prompt gives your share (for example PR number mod 4, even or odd, or one list) and an order (oldest or newest first). Stay in it.

- Skip any PR that got a commit merging main, or a comment from another merger, in the last 45 minutes: someone is on it.
- Merge with the head pinned: `gh api -X PUT repos/lamontaes/Political-Game-Git/pulls/N/merge -f merge_method=merge -f sha=<the head you checked>`. HTTP 409 means the branch moved: re-check it or move on.
- If your plain push is rejected because the branch moved, drop that PR and move on.
- Start every comment with your prompt's prefix (for example `Codex merger:` or `Cloud merger:`), so audits can tell mergers apart.

List with `gh api 'repos/lamontaes/Political-Game-Git/pulls?state=open&per_page=100'` (all pages). Skip drafts whose body says work in progress.

## 2. For each PR

1. **Base.** Merge into main only a PR whose base is main.
   - A PR whose base is another open PR's branch is a fixer for that PR. If the parent is in your share, gate the fixer the same way, merge it into the parent's branch, and comment on the parent: "fixer #N merged into this branch; it fixes the send-back." Never flip a pool item for a fixer.
   - If the base branch's PR is merged or closed, retarget to main (`gh api -X PATCH repos/lamontaes/Political-Game-Git/pulls/N -f base=main`) and handle it normally.
2. **Send-backs.** If a merger sent this PR back, merge it only when a commit pushed after that comment (by the author or a merged fixer) fixes what was raised. Compare the commit times to the comment.
3. **Fetch and merge main.** `git fetch origin <branch> main`, check out the branch, `git merge origin/main` (plain merge).
   - Resolve docs-only conflicts yourself: `SESSION-*.md` and `PROGRESS.md` by taking both sides; `src/core2/data/stopgaps.json` by keeping every row from both sides, merged by `id`.
   - Pool item conflicts: keep the newer status, claim and pr fields, keep the written spec over an empty shell, and keep both sides' Notes lines. Regenerate `docs/pool/INDEX.md` with `npm run pool`; never hand-merge it or English banks.
   - A conflict in code goes back to the author: one comment naming the files, and the pool item back to open (step 2.7).
   - Push the merge commit with a plain push.
4. **Changed-file checks, on the merged result, in your own environment.** You run these whether or not the body has a gate line:
   - `npm run typecheck` (the repo's script; it is already scoped)
   - `npx eslint <changed files>`
   - `npx prettier --check <changed files>`
   - `npx vitest run <changed test files> --dir src` (scripts tests: run by path)
   - `npm run zero-dice`
   - `npm run release:check -- --mode pr`
   - `npm run pool -- --check`
   - `npm run old-imports` when the PR touches `src/core2`
   - `npm run test:skill-ops` when the PR touches `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/` or `.cursor/`

   A failure that also fails on clean `origin/main` does not block; say so in the table. `pool --check` already fails on main for old thin items, so only failures in the PR's own items count. A single test over 10 minutes: run it alone once more before calling it a failure.

5. **Morning check.** Read the diff, not just the body. Send back with the exact reason, quoting file and line, for any of the following.

   **Weak or broken tests**
   - A test is narrowed, skipped, or can pass without checking anything: an early return, `>= 0`, a loop over a set that can be empty, every assertion inside `if (found)`.
   - A test is pinned to one convenient seed with no drawn-place case beside it. A named regression seed next to a drawn-place test is fine.
   - A timeout is raised without a measured reason.

   **Done-when not met**
   - The item's done-when is found with `grep -l "pr: #N" docs/pool/items/*.md` or the item id in the PR body. Every proof it names must be in the PR: a played world built with `buildBenchWorld`, a browser check, a named test, a seed in the body. Name the missing proof.

   **Claims that don't match the diff**
   - The title, body or release note claims something the diff doesn't do.
   - Check at least one count, date or list in the release note against the data.

   **Research data**
   - A value tagged SOURCED whose quote doesn't contain the number.
   - A range presented as published that isn't the published interval.
   - A source URL that isn't the page read.
   - Quote-like text for a clause the row says was not read.

   **Guards**
   - A change to a guard's allowlist, ceiling or skip list (`scripts/audit/*allowlist*`, `scripts/zero-dice-allowlist.json`, `AWAITING_READER_CEILING`, any test skip list) without the right category and a stated reason.
   - A file added to a bypass list to clear a red guard is always a send-back.

   **Deleted data**
   - Deleted ids, entries or array items that another file still points at. Grep the repo for the removed ids and for index pointers like `#/actions/7`.

   **Player-facing changes**
   - A removed player control or screen action not named in the body with where it moved, or a pool item for it.

   **Core rules**
   - A stand-in without a row in `src/core2/data/stopgaps.json` and a code marker, or a stopgap row deleted.
   - A state, city or GEOID named in logic.
   - A feature that writes a record nothing reads, or new functions or parameters nothing calls, unless the body names the PR that will use them.
   - Hand-written player text in code or data (`origin: "authored"` with `shippable: true`).
   - Code in `src/core2` importing from `src/simulation`.
   - Owner names or dated owner notes in code or shipped data.
   - Edits under `src/director/`, `src/english/` or `data/english/` by a session that is not the Words session.
   - British spellings.
   - A docs/pool item with sections pasted twice.

   **Missing paperwork**
   - No release declaration in `docs/release/changes/`. Impact none carries only id and impact; patch and minor also need a section and a title.

6. **Merge on green.** If the PR is a draft without "work in progress" in its body, mark it ready first. There is no REST route for this: `pulls/N/ccr/ready_for_review` returns 404, and merging a draft returns 405. Use `gh pr ready N`, or the GraphQL mutation `gh api graphql -f query='mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}' -f id="$(gh api repos/lamontaes/Political-Game-Git/pulls/N --jq .node_id)"`, or `update_pull_request` with `draft: false`. Read the PR again and confirm `draft` is false. Then merge with the head pinned (section 1). Right after, post one comment: "<prefix> merged at <sha>. Checks run here: <list>, all passed."
7. **A send-back goes back to the pool.** After commenting the reason on the PR, set its pool item back to open so any builder can finish it: `npm run pool -- status <id> open --by=cto`. Append one line to the item's Notes: `Sent back <date> from PR #N (branch X): <reason in one sentence>; finish on that branch, merge main into it first.` If the item id is not in the PR, match it by branch name or title. Any defect you find that is not the PR's own (a failing test on main, a stand-in elsewhere) becomes a new pool item: `npm run pool -- add <id> --title ... --area ... --kind bug --priority 1 --size S`.
8. **Pool.** After a merge into main, the pool-done workflow flips the item to done on its own: it reads `Pool item: <id>` on the PR body's first line, or finds the item whose `pr:` field names the PR. Check the item (`grep -l "pr: #N" docs/pool/items/*.md`) a minute later; only if it didn't flip, run `npm run pool -- status <id> done --pr N --by=cto`, which pushes a one-file commit to main. Never flip an item for a merge into a branch other than main.

## 3. Stale runs

GitHub runs are never waited on. If the Actions queue holds runs from superseded commits, cancel them so the packager is not starved. List `gh api 'repos/lamontaes/Political-Game-Git/actions/runs?status=queued&per_page=100'` (and `in_progress`). For each run whose `head_sha` is no longer the tip of its branch: `gh api -X POST repos/lamontaes/Political-Game-Git/actions/runs/<id>/cancel`. The release workflow on main publishes on its own.

## 4. Report

End each batch with a table: `PR | merged / sent back / left | reason`.
