# Session 31 — Merger A (even PR numbers)

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Validate and merge every ready PR fast, checking only the files each PR changed. You may run up to 2 Luna subagents to gate PRs in parallel (6 merge workers in total with the other merger and its subagents).

## Milestones
1. Every 5 minutes: list open, non-draft PRs with even numbers; skip any the newest OPUS CTO line on #2424 holds or sends back.
2. For each PR: cancel its stale GitHub Actions runs (`gh run list --branch <head> --json databaseId,status` → `gh run cancel` for queued/in_progress), merge origin/main into it, gate changed files only (prettier, eslint, changed tests, typecheck, release:check), then `gh pr merge --squash --delete-branch`.
3. SCREEN PRs merge only after an 'OPUS CTO PASS #N' line; ENGLISH PRs only after 'GRADED GOOD #N'.
4. Failing gate: post 'SEND BACK #N: <failing test names / file:line>' on #2424 and on the PR; known main reds (fail identically on clean main) don't block.
5. Throughput: at least 10 merges per hour from you (20+ combined); post a tally line on #2424 every hour.

## Endpoint
No ready PR with a passing gate waits more than 30 minutes, and at stop you post a handoff with every PR you touched (merged / sent back / held, with reason).

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
