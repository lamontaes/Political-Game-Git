---
id: gov-campaign-day-no-money-small-town
title: "Campaign day raises no money from reachable people (Putney, Vermont)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4749
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-16 from PR #4749 (branch claude/gov-campaign-day-no-money): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4749 (branch claude/gov-campaign-day-no-money): campaign-day.test.ts adds an early return when no reachable donor has spare cash, bypassing the existing positive-fundraising and remaining campaign-day assertions. That weakens the test, which the merger morning check forbids. Keep a separate no-donor edge case, and make the original campaign-day fixture reach and assert the funded path; retain the engine fix without skipping that coverage; finish on that branch, merge main into it first.
