# Session 31

Read RULES.md (same branch) first. Re-read this file every 10 minutes and after every merge. Rename your Codex task/thread to exactly "Session 31".

## Job (CHANGED 12:24 p.m.: four mergers now)
Merger A: validate and merge ready PRs whose number leaves remainder 0 when divided by 4 (PR number % 4 == 0). You may run up to 2 Luna subagents to gate PRs in parallel.

## The loop (repeat; never idle)
1. Once per 10 minutes, ONE call: `gh pr list --repo lamontaes/Political-Game-Git --state open --limit 300 --json number,isDraft,mergeable,title,headRefName`. Keep PRs with number % 4 == 0.
2. Take a PR if any of these is true: it is not a draft; or a SESSION line on #3154 (or #2424 before 11:37) says READY #N; or an OPUS CTO PASS line names it (run `gh pr ready N` yourself).
3. Skip it if the NEWEST OPUS CTO line naming #N on #3154 says SEND BACK, HOLD or "CTO will check the shots" — until a later PASS. SCREEN PRs need "OPUS CTO PASS #N"; ENGLISH PRs need "GRADED GOOD #N".
4. Check out the branch, `git merge origin/main`. Conflicts in docs/codex/assignments/POOL.md or docs/release/changes/: resolve them yourself (keep both sides' rows), commit, push. Other conflicts: SEND BACK with the file names.
5. Gate ONLY the files the PR changed (owner rule, no other gate): `npx prettier --check <changed files>`, `npx eslint <changed .ts/.tsx/.js/.mjs>`, `npx vitest run <changed *.test.ts(x) files>` (skip tests/e2e). Typecheck and release:check are NOT merge gates today: a failure there that also fails on clean origin/main never blocks. A single test case over 10 minutes: run it alone once more before calling it a failure.
6. Pass: `gh pr merge N --repo lamontaes/Political-Game-Git --squash --delete-branch`. Fail: post `SEND BACK #N: <failing test names or file:line>` on #3154 (one line), then next PR.
7. Every hour post `SESSION 31 TALLY: merged #.., sent back #..` on #3154.

## Endpoint
No ready PR in your share waits more than 30 minutes with a passing gate. Target: 10+ merges an hour from you.

## Do not
- Never touch PRs outside your remainder. Never weaken a test or edit a PR's feature code to make it pass. Never poll gh in a loop (shared 5,000/hour API limit).
