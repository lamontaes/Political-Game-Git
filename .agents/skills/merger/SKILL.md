---
name: merger
description: Merges and validates pull requests for Our Civic Duty: changed-file checks on the merged result in its own environment, the morning check, head-pinned merges in a share shared with other mergers, send-backs that reopen pool items, stale GitHub runs cleared. Use when a session is asked to merge or validate PRs.
---

# Merger

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Review means you are not the session that wrote it; any model counts. Run the changed-file checks on the merged result and try once to break the claim on another drawn place or seed. Send back any PR whose **OWNER DECISIONS NEEDED** or `owner-decision` stopgap lacks the reading line (`Read: OWNER-DECISIONS (...), DECISION-REGISTER, prior-rulings/..., LAW; searched: ...`), and any stopgap of kind faked-mechanic or missing-mechanic whose id is not a marker in code. Every send-back you write is SMART: the one defect, the check that shows it fixed, and a time box.

Current as of 2026-10-24, 21:30 UTC (owner, Oct 24: lane PRs first; the lane may edit director and English files with Words review; lines the grade ledger lets play are never a send-back; "sessions never message each other")

You are the CTO's merger. The CTO never merges or reads diffs; you do, and return a table. Read `AGENTS.md` ("Process") first, then `docs/coordination/MERGE-FIRST.md` (the CTO's order; its lines come before your share) and the CTO section of `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`). Use `gh api` (REST, plus the one GraphQL call that marks a draft ready, step 2.6) or the GitHub tools your session provides, plain pushes, `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` for npm. No scheduled tasks, and no messages to other sessions except the CTO (questions for the owner or blockers, owner Oct 29): on a PR your voice is a PR comment and the pool item's Notes.

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
- **Holding back (owner, Oct 27).** On Oct 27, 31 green, mergeable PRs sat open at noon: two CTO merge freezes for a release, "merge after" chains, a send-back over a line-1 label. The owner: "There's no reason to be holding shit back. That's the point of having so many mergers and fixers." A merger merges; it never queues. A PR whose line 1 is `Touches pool item: <id>` flips nothing on merge, even if the item's `pr:` field names it (`scripts/pool/done-on-merge.ts`); a send-back needs no `pr:` edit to keep the item open.
- **Holds nobody saw.** Two merge holds were broken by sessions mid-turn that never read the message. A hold lives on MERGE-FIRST line 0 and binds every push to main; read that file before every merge, not once per session.

## 0. Red main comes first

At the start of every run, before listing PRs, and again after every merge you make, read the latest run of **every** workflow on main, not only Release: `gh api 'repos/lamontaes/Political-Game-Git/actions/runs?branch=main&per_page=12'` (Release, Deterministic validation, M0 guards, Every place nightly). Main is red if any of them concluded `failure` on the newest commit. **A merge that turns main red is yours (owner, Oct 28: "Why does nobody own it?"):** the merger who merged it fixes it at the root the same hour, or comments on the PR naming the failing test, place and seed and hands it to the standing red-main session, whose section in the channel is `## Red main`. A red is never "not this item's"; it has one owner at every hour, named in that section. If main is red and no other merger claimed `release-main-red` in the last 60 minutes and the red-main section's newest block does not name it

1. Create or claim the pool item `release-main-red` (area release, kind bug, priority 1). Create `docs/pool/items/release-main-red.md` if absent; set status `claimed` with your branch.
2. Read the failing job's log: `gh api repos/lamontaes/Political-Game-Git/actions/jobs/<id>/logs` (job ids from the run's `jobs`).
3. Fix it at the root on a `fix/main-red-<date>` branch. Never skip a test and never loosen the gate. A missing declaration is fixed by adding the declaration; a typecheck or build failure is fixed in the code that broke.
4. Run the same changed-file checks, then open a ready PR. Another merger merges it, never its author.
5. Then continue with the merging below.

## 0b. The queue and the tooling PRs

Main's full validation runs hourly, not on every push (#6692, Oct 28), so a PR's checks are the verdict; main's hourly run is the backstop. When the Actions queue is deep, a PR whose checks are only queued is gated locally (changed-file checks on the merged result, as section 1 says) and merged on that gate. A tooling PR that unblocks every other PR (the pool's done flip, a workflow fix) is first in every merger's order, ahead of MERGE-FIRST, and its one red that is main's own red does not hold it.

## 1. Your share, and other mergers

Several mergers run at once, splitting open PRs by PR number modulo the number of share mergers your prompt names (five on Oct 26: `<N>` is 0 to 4), plus a recheck merger when `MERGE-FIRST.md` names one. Your prompt gives your share and an order (oldest or newest first). Stay in it, after `MERGE-FIRST.md`: a `MERGE-FIRST.md` line in nobody's share is anyone's; a line in your share is yours first.

- Skip any PR that got a commit merging main, or a comment from another merger, in the last 45 minutes: someone is on it.
- Read the PR's comments again just before you post. If another merger already sent back the same head, add nothing (Oct 26: four mergers sent #6086 back on the same head within three minutes).
- Merge with the head pinned: `gh api -X PUT repos/lamontaes/Political-Game-Git/pulls/N/merge -f merge_method=merge -f sha=<the head you checked>`. HTTP 409 means the branch moved: re-check it or move on.
- If your plain push is rejected because the branch moved, drop that PR and move on.
- Start every comment with your prompt's prefix (for example `Codex merger:` or `Cloud merger:`), so audits can tell mergers apart.

List with `gh api 'repos/lamontaes/Political-Game-Git/pulls?state=open&per_page=100'` (all pages). Skip drafts whose body says work in progress.

## 2. For each PR

1. **Base.** Merge into main only a PR whose base is main.
   - A PR whose base is another open PR's branch is a fixer for that PR. If the parent is in your share, gate the fixer the same way, merge it into the parent's branch, and comment on the parent: "fixer #N merged into this branch; it fixes the send-back." Never flip a pool item for a fixer.
   - A PR stacked on another open PR (its own pool item, building on the parent rather than fixing the parent's send-back) is not a fixer: leave it until its base PR has merged into main, then retarget it to main and handle it normally. Its item is done only when it reaches main.
   - If the base branch's PR is merged or closed, retarget to main (`gh api -X PATCH repos/lamontaes/Political-Game-Git/pulls/N -f base=main`) and handle it normally.
2. **Send-backs.** If a merger sent this PR back, merge it only when a commit pushed after that comment (by the author or a merged fixer) fixes what was raised. Compare the commit times to the comment.
   - **Nothing waits (owner, Oct 27).** A green, mergeable PR merges within the hour it goes green, whatever its line in MERGE-FIRST. Send back only for a defect a player would meet, a standing-rule break, or a claim the checks disprove. A stacked PR merges right after its base, never "later". The only hold is a red main or a line 0 in MERGE-FIRST.
   - **Micro-fixes are yours (owner, Oct 27: "If it's a one-line thing, a really fast fix, the mergers can use a Haiku or Sonnet agent. But if it's two or three plus steps, then it goes back to the fixers").** Paperwork and one-step defects you fix on the branch in the merge: a `Pool item:` line, a release declaration, a prettier run, a spelling hit, a missing `--by=cto`, a stale count in the body, one wrong label. Do it yourself or hand it to one Haiku or Sonnet helper with the file, the line and the check that proves it; rerun the check; say in your merge comment what you fixed. Anything that takes two or more steps to diagnose or touches logic goes back to a fixer with the one defect named.
3. **Fetch and merge main.** `git fetch origin <branch> main`, check out the branch, `git merge origin/main` (plain merge).
   - Resolve docs-only conflicts yourself: `SESSION-*.md` by taking both sides; `docs/play-first/PROGRESS.md` by dropping the branch's hunk entirely (handoffs live on main only, acting CTO, Oct 25: a lane branch that changes it is a defect; `git checkout origin/main -- docs/play-first/PROGRESS.md` on the merge, then merge); `src/core2/data/stopgaps.json` by keeping every row from both sides, merged by `id`.
   - Pool item conflicts: keep the newer status, claim and pr fields, keep the written spec over an empty shell, and keep both sides' Notes lines. `docs/pool/INDEX.md` is generated: take main's copy (`git checkout origin/main -- docs/pool/INDEX.md`) and regenerate with `npm run pool`; never hand-merge it or English banks. Matrix files under `docs/reports/*-matrix*.json` are regenerated by their script, never hand-merged.
   - Merge main once, right before you run the checks; if main moves while you check, merge again and rerun only the checks whose files moved. A push to main rejected as non-fast-forward is normal with many mergers: fetch, rebase your merge commit, push again; never force.
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
   - The PR body's **Done when** table (from the PR template) has one row per done-when line with its evidence. A missing table, or a row whose evidence is not in the diff or the body, is a send-back naming that row. Builders run this same list on themselves first (`session-start`, "Self-check before the PR").

   **Claims that don't match the diff**
   - The title, body or release note claims something the diff doesn't do.
   - Check at least one count, date or list in the release note against the data.

   **Research data**
   - A value tagged SOURCED whose quote doesn't contain the number.
   - A range presented as published that isn't the published interval.
   - A source URL that isn't the page read.
   - Quote-like text for a clause the row says was not read.

   **Guards**
   - Run `npm run guards` on the merged result; `docs/design/guards.md` names the rule each guard holds. A count in a guard's list may only go down: a raised count is a send-back unless the PR names why the rule allows it.
   - A PR that adds or changes a guard counted its baseline at its own head: merge main in and rerun `npm run guards` right before merging, or a merge that landed in between turns main red under the guard.
   - A change to a guard's allowlist, ceiling or skip list (`scripts/audit/*allowlist*`, `scripts/zero-dice-allowlist.json`, `AWAITING_READER_CEILING`, any test skip list) without the right category and a stated reason.
   - A file added to a bypass list to clear a red guard is always a send-back.

   **Deleted data**
   - Deleted ids, entries or array items that another file still points at. Grep the repo for the removed ids and for index pointers like `#/actions/7`.

   **Player-facing changes**
   - A removed player control or screen action not named in the body with where it moved, or a pool item for it.
   - Developer text on a player screen, in the diff or the after screenshot (`player-screen-text`): record kinds, ids, ISO dates, unrounded numbers, status codes, debug labels. Name file and line.
   - A screen change that names no mock line, or adds a second renderer for a control that already has one (`screen-to-mock`).
   - A scene or talk whose outcome writes nothing back, or that a player cannot reach in ordinary play (`scene-standard`).
   - A test that asserts a known defect (an ISO date on screen, a masthead that only says "News").

   **Core rules**
   - A stand-in without a row in `src/core2/data/stopgaps.json` and a code marker, or a stopgap row deleted.
   - A state, city or GEOID named in logic.
   - A feature that writes a record nothing reads, or new functions or parameters nothing calls, unless the body names the PR that will use them.
   - Hand-written player text in code (a sentence typed into a screen or an engine instead of a bank). A bank part carries no play flag of its own (`tests/english-parts-banks.test.ts`): authored bank parts are English engine pieces and play unless the grade ledger rejects them (owner, Oct 24).
   - Code in `src/core2` importing from `src/simulation`.
   - Owner names or dated owner notes in code or shipped data.
   - Edits under `src/director/`, `src/english/` or `data/english/` by a session that is not the Words session, **except a play-first lane PR** (line 1 names a `play-first-*` or `play-stop-*` item; owner, Oct 24): the lane may edit them with `Review: words` in the body, and that is never a send-back reason. Leave a lane PR with director or English edits for the Words session's review comment before merging only if `MERGE-FIRST.md` says so; otherwise merge on green.
   - British spellings.
   - A docs/pool item with sections pasted twice.

   **The play-first lane** (`docs/play-first/README.md`)
   - A PR whose line 1 names a `play-first-*` or `play-stop-*` item without a before and an after screenshot in its body, each from a drawn place with the place and seed named, is sent back. A plain link to the PNG on the PR's branch satisfies the rule (acting CTO, Oct 25): open it. Embedding is preferred, not required; a backticked link is a writer defect the fixer corrects in the body, never a send-back reason on its own. **"OWNER SCREENSHOT NEEDED" is never a merge reason** (owner, Oct 25: "remove that block"): a PR carrying that line merges on its before/after screenshots and your checks like any other; the owner's installed-build check closes the pool item later, never the PR.
   - Lane PRs come first (`MERGE-FIRST.md`, line 1). Never send a lane PR back for director or English edits (`Review: words`) or for `data/english` lines the grade ledger lets play.

   **Missing paperwork**
   - No release declaration in `docs/release/changes/`. Impact none carries only id and impact; patch and minor also need a section and a title.

6. **Merge on green.** If the PR is a draft without "work in progress" in its body, mark it ready first. There is no REST route for this: `pulls/N/ccr/ready_for_review` returns 404, and merging a draft returns 405. Use `gh pr ready N`, or the GraphQL mutation `gh api graphql -f query='mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}' -f id="$(gh api repos/lamontaes/Political-Game-Git/pulls/N --jq .node_id)"`, or `update_pull_request` with `draft: false`. Read the PR again and confirm `draft` is false. Then merge with the head pinned (section 1). Right after, post one comment: "<prefix> merged at <sha>. Checks run here: <list>, all passed."
7. **A send-back goes back to the pool.** After commenting the reason on the PR, set its pool item back to open so any builder can finish it: `npm run pool -- status <id> open --by=cto`. Append one line to the item's Notes: `Sent back <date> from PR #N (branch X): <reason in one sentence>; finish on that branch, merge main into it first.` If the item id is not in the PR, match it by branch name or title. Any defect you find that is not the PR's own (a failing test on main, a stand-in elsewhere) becomes a new pool item: `npm run pool -- add <id> --title ... --area ... --kind bug --priority 1 --size S`.
8. **Pool.** A merge is not the owner's acceptance. For an item with `milestone: play-first` (or a `play-stop-*` item), add one Notes line after the merge: `Merged <date> in PR #N; awaiting the owner's installed-build check` (owner, Oct 25: the owner's check closes the item). If he rejects it in a playtest, it reopens with his words. Otherwise: after a merge into main, the pool-done workflow flips the item to done on its own: it reads `Pool item: <id>` on the PR body's first line, or finds the item whose `pr:` field names the PR. Check the item (`grep -l "pr: #N" docs/pool/items/*.md`) a minute later; only if it didn't flip, run `npm run pool -- status <id> done --pr N --by=cto`, which pushes a one-file commit to main. Never flip an item for a merge into a branch other than main.

## 3. Stale runs

GitHub runs are never waited on. If the Actions queue holds runs from superseded commits, cancel them so the packager is not starved. List `gh api 'repos/lamontaes/Political-Game-Git/actions/runs?status=queued&per_page=100'` (and `in_progress`). For each run whose `head_sha` is no longer the tip of its branch: `gh api -X POST repos/lamontaes/Political-Game-Git/actions/runs/<id>/cancel`. The release workflow on main publishes on its own.

## 4. Report

End each batch with a table: `PR | merged / sent back / left | reason`.

## The prompt

> Read AGENTS.md and .agents/skills/merger/SKILL.md in lamontaes/Political-Game-Git, then docs/coordination/MERGE-FIRST.md and the CTO section of docs/coordination/LEADS-2026-10-24.md.
> You are merger <N>: your share is open PRs whose number mod <M> equals <N> (<M> = the number of share mergers running) (the recheck merger's share is the recheck list in MERGE-FIRST.md), <oldest | newest> first, after every MERGE-FIRST line you can take. Start every comment with "Merger <N>:".
> For each PR: merge main into it, run the changed-file checks in your own environment (never the full suite, never wait on GitHub), apply the morning check, merge on green with the head pinned or comment once with the exact reason and set the item open with the reason in Notes.
> Play-first lane PRs first; send one back only for missing before/after screenshots, never for director or English edits or lines the grade ledger lets play. "OWNER SCREENSHOT NEEDED" is not a merge gate; a `docs/play-first/PROGRESS.md` hunk on a lane branch is dropped, not resolved.
> Never merge a PR you authored, never force-push, never run the full suite. If the latest release run on main is red, claim release-main-red and fix it at the root first. End with a table.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
