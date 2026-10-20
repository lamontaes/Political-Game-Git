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

A sent-back PR is usually one small fix away from merging. Finish it on its own branch; never open a second PR for the same item.

## Find the work

- Pool items with status `open` whose Notes say `Sent back <date> from PR #N (branch X): <reason>`.
- Open PRs whose newest merger comment (starting `Cloud merger:`, `Codex merger:` or `CTO:`, or saying "sent back" or "left open") has no commit pushed after it.
- Skip PRs from running lead sessions (branches `law-wiring*`, `claude/law-wiring*`, `effect-web*`, `claude/traits*`); they fix their own.
- Skip anything that got a commit or comment in the last 45 minutes.

## Fix

1. Claim the item with its branch: `npm run pool -- claim <id> --branch <X>`.
2. Check out `X` and run `git merge origin/main` (plain merge). Resolve docs-only conflicts as the merger skill says. A code conflict is part of your fix.
3. Read the merger's whole comment and the diff. Fix exactly what was raised, inside the PR's own scope:
   - never loosen, skip or early-return a test;
   - never raise a timeout without a measured reason;
   - tests draw places from all 56 with bounded retries and fail when the retries run out.
4. Run the changed-file checks on the merged result (`local-gate`).
5. Push with a plain push. Comment once on the PR: `Fixer: fixed <what>, at <sha>. Checks run here: <list>, all passed.` The merger compares that commit's time with its send-back.
6. Set the item back to `in-pr` with the PR number.

## When you can't

- If the fix needs the owner's or another area's call, or is bigger than the PR, comment why, set the item `open` with a one-line Notes entry, and move on.
- If the PR's work is already on main, say so with the main commits that carry each change, and leave it for the CTO to close.

## Fixer PRs into a PR branch

When you can't push to the branch, open a PR whose base is the parent PR's branch. Its body's line 1 is `Pool item: <id>`, and it explains the send-back it fixes. The merger whose share holds the parent merges it into the parent's branch. The pool item flips only when the parent merges into main.

## Stop condition

Stop when no sent-back PR in your reach is left, then list again.
