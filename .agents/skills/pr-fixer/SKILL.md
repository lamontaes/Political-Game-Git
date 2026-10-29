---
name: pr-fixer
description: >
  Finishes Our Civic Duty pull requests that a merger sent back: finds them,
  takes over the branch, fixes exactly what the merger raised, and hands the
  PR back so it can merge. Use for pool items whose Notes say "Sent back", for
  any PR whose newest merger comment has no later commit, and for fixer PRs
  into another PR's branch.
---

# PR fixer

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**Push to your own branch when the author's is refused (lesson, Oct 27).** A cloud fixer's push to another session's branch can be refused by the permission classifier (Fixers 2 and 4, Oct 27, on #6108 and #6201); a refused push is not retried and is not worked around. Instead: branch from the PR's head (`git fetch origin <pr-branch> && git checkout -b fixerN/<slug> FETCH_HEAD`), fix the one defect, push your branch, open a new PR with the same `Pool item:` line and `Lead:`, a body saying "supersedes #N at <head> plus <defect>", and comment on the old PR pointing to it; the merger closes the old PR when the new one merges. Say in the PR body that the push was refused, so the lesson is on record.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Fix exactly the merger's SMART send-back inside its time box; if the send-back is not SMART, write the missing part into the PR body before working it. Before raising any owner question, do the full reading (`OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `LAW.md`, a `docs/` search) and end the question with the reading line. Research is allowed.

Current as of 2026-10-24, 21:30 UTC (owner, Oct 24: the play-first lane owns `src/bench`; the Words line owns director and English files; "sessions never message each other")

A sent-back PR is usually one small fix away from merging. Finish it on its own branch; never open a second PR for the same item.

## Find the work

- Read `docs/coordination/MERGE-FIRST.md` first: a sent-back PR on that list comes before any other. Then the CTO section of the channel, `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`): the CTO names fixer work there.
- Pool items with status `open` whose Notes say `Sent back <date> from PR #N (branch X): <reason>`.
- Open PRs whose newest merger comment (starting `Merger <N>:`, `Cloud merger:`, `Codex merger:` or `CTO:`, or saying "sent back" or "left open") has no commit pushed after it.
- **Never touch** the Words line's PRs (`Lead: words`, or diffs in `src/director`, `src/english`, `data/english`), play-first lane PRs (line 1 `play-first-*` or `play-stop-*`; the lane fixes its own on its handoff log), or PRs from running lead sessions (the channel names their branches); they fix their own.
- Skip anything that got a commit or comment in the last 45 minutes.

## Fix

1. Claim the item with its branch: `npm run pool -- claim <id> --branch <X>`.
2. Check out `X` and run `git merge origin/main` (plain merge). Resolve docs-only conflicts as the merger skill says. A code conflict is part of your fix.
   An English bank conflict (`data/english/parts/scene-talk.json`, and `data/english/grade-reach.json`, which is generated) is yours to redo, not the merger's: take main's file, re-add your scene's pieces and slots by piece key (never merge by hand), rebuild `grade-reach.json` with `scripts/dialogue-batch/apply-grades.ts`, and run `tests/english-parts-banks.test.ts` before the push. Oct 28: #6685 and #6689 sat sent back on this, as did #6329 on Oct 27, after the `words-engine` line said to land on fresh main.
3. Read the merger's whole comment and the diff. Fix exactly what was raised, inside the PR's own scope:
   - never loosen, skip or early-return a test;
   - never raise a timeout without a measured reason;
   - tests draw places from all 56 with bounded retries and fail when the retries run out.
4. Run the self-check from `session-start` ("Self-check before the PR") on the merged result. A send-back for missing proof means every done-when line, not only the one the merger quoted: fill the PR body's **Done when** table with the evidence for each. Then run the changed-file checks (`local-gate`).
5. Push with a plain push. Comment once on the PR: `Fixer: fixed <what>, at <sha>. Checks run here: <list>, all passed.` The merger compares that commit's time with its send-back.
6. Set the item back to `in-pr` with the PR number.

## When you can't

- If the fix needs the owner's or another area's call, or is bigger than the PR, comment why, set the item `open` with a one-line Notes entry, and move on.
- If the PR's work is already on main, say so with the main commits that carry each change, and leave it for the CTO to close.

## Fixer PRs into a PR branch

When you can't push to the branch, open a PR whose base is the parent PR's branch. Its body's line 1 is `Pool item: <id>`, and it explains the send-back it fixes. The merger whose share holds the parent merges it into the parent's branch. The pool item flips only when the parent merges into main.

## Stop condition

Stop when no sent-back PR in your reach is left, then list again.

## The prompt

> Read AGENTS.md and .agents/skills/pr-fixer/SKILL.md in lamontaes/Political-Game-Git, then docs/coordination/MERGE-FIRST.md and the CTO section of docs/coordination/LEADS-2026-10-24.md.
> You are the PR fixer. Take sent-back PRs in that order: MERGE-FIRST lines first, then pool items whose Notes say "Sent back", then PRs whose newest merger comment has no later commit.
> Claim the item with its branch, merge main in with a plain merge, fix exactly what the merger raised, run the self-check and the changed-file checks, push, comment "Fixer: fixed <what>, at <sha>", set the item in-pr.
> Never touch Words-line PRs, play-first lane PRs, src/bench, src/director, src/english or data/english. Never loosen a test, never force-push, never merge your own PR.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
