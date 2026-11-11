---
id: pool-claims-and-status-commits-move-main
title: "A pool claim, a status change and a seen check each push a commit to main, which sinks a build window and regenerates the index every time"
area: release
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: opus
effort: high
root: design-guards
source: the CTO's line on the crew's issue, Nov 11, 2026, 13:22 UTC, after a claim moved main during the hold for the owner's Mac build; then the lead's reading of the pool tool
checked:
claimed-at:
---

**What.** On Nov 11 the owner's Mac build was held twice so main would stand still while it was packaged. Both times main moved anyway: once by the index bot after a pool change, once by a builder's `npm run pool -- claim`, and again two minutes later by a builder marking its pull request `in-pr`. None of them was a merge. Every claim, status change and seen check is a commit on main, and each one makes the index workflow push another. A hold that says "nothing merges" is not enough, and a crew of thirty writes dozens of these an hour. Seen: `git log origin/main` over an hour of work, where the only commits are merges, the hour's notes bundle and the release; and a build window in which a builder can claim an item without moving main.

**Cause.** Found in code: `mutate` in scripts/pool/index.ts (line 688) sends every change through `onMain`, which makes a branch at origin/main, commits the item file and pushes it to main (`pool-claim-<id>`). `claim` (line 1352), `status`, `seen` and `release` all call it, and so does `next` when it records a claim or a draft pull request's number. The workflow .github/workflows/pool-index.yml runs on every push to main that touches `docs/pool/items/**` and pushes the regenerated `docs/pool/INDEX.md`, a second commit for each first one. The rule that the index is main's alone (`onIndexHome`, line 512) was written to stop merge conflicts, and it made main the only place a claim can live.

**Fix.**

1. **Claims live on their own branch.** `claim`, `next`, `release` and the `in-pr` status write one small file for each claim, `docs/pool/claims/<id>.json` (who, branch, pull request, when), on the branch `pool/claims`, pushed fast-forward and retried once on a race. They never touch main. `claim` refuses when the file is already there with another branch.
2. **The item file on main knows only what main can know.** `status:` on main is `open`, `merged`, `done`, `blocked` or `dropped`. `claimed` and `in-pr` are read from `pool/claims` wherever the tool needs them (`next`, `--check`, the cap's count, the index's claimed list), by fetching that one branch.
3. **Everything else rides the hour's notes.** `seen`, `status <id> done|open|blocked|dropped` and Notes lines commit to the hour's notes branch (`pool/notes-<date>-<HH>`, skill pool-notes), which already merges once an hour. The merge flip (`pool-done-on-merge.yml`) stays: it rides a merge, which a build window already forbids.
4. **The index is written at a merge, not at a claim.** `pool-index.yml` keeps its trigger; with 1 to 3 in, the only pushes to main that touch items are the hourly bundle and merge flips. The index's claimed list reads `pool/claims` when it is generated.
5. **A claim is cleared when its pull request merges or closes.** The merge flip deletes the claim file on `pool/claims`; `release` deletes it; a claim file whose branch has no commit in the stale window is listed by `next` as free, as today.
6. **The words.** docs/pool/README.md, docs/pool/START-A-BUILDER.md and the skills session-start, pool-notes and merge-trains say the new places; the line "Claim on main, before you build" becomes "Claim before you build".

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Look before you ask (owner, Oct 14): the owner's Oct 15 ruling is that every session sees a claim within seconds, and a claims branch every tool fetches keeps that; nothing new is asked. Replace, never layer (owner, Oct 14): the push to main is removed from the tool in the same change, not kept beside the new path. Speed (owner, Oct 29) for the crew's own work: one fetch of one small branch, no scan of every open pull request.

**Done when.** A test in scripts/pool builds two clones of a bare repository and shows: a claim from one is seen by `next` in the other; a second claim of the same item is refused; `git log main` gains no commit from `claim`, `next`, `status in-pr`, `release` or `seen`; `seen` lands on the hour's notes branch. On the real repository, a second session claims an item during a declared build window and main's tip does not move, read from `git ls-remote origin refs/heads/main` before and after. `npm run pool -- --check` and the pool's own tests pass. The game is not touched, so no drawn place is played; the two clones stand in for one.

**Waits on.** Nothing. It changes .github/workflows/pool-done-on-merge.yml, so it merges outside a build window and by the CTO's hand or word.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts, scripts/pool/next.test.ts, .github/workflows/pool-done-on-merge.yml, .github/workflows/pool-index.yml, docs/pool/README.md, docs/pool/START-A-BUILDER.md, .agents/skills/session-start/SKILL.md, .agents/skills/pool-notes/SKILL.md, .agents/skills/merge-trains/SKILL.md

**Notes.** Written by the lead (Fable B), Nov 11, 14:10 UTC, at the CTO's request ("claims shouldn't touch main. They can go on pool/notes or be read from the PR"). Chosen over reading claims from open pull requests: a cloud session can search GitHub but cannot list pull requests cheaply, and a claim is made before any pull request exists. Until this is built, the rule is in the merge-trains skill: during a build window nobody runs a pool command that pushes.
