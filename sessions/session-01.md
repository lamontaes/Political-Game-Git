# Session 01 — Rescue old PRs #713–#1307

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Every open PR numbered #713–#1307 ends today either merged into main or closed with a one-line reason.

## Milestones
1. Within 30 min: a triage line on #2424 listing every open PR in #713–#1307 as BRING, CLOSE (reason) or OWNED-ELSEWHERE.
2. Every 60 min: at least 4 PRs from the range marked ready for the mergers (merged into main or READY) or closed.
3. Half the range resolved by 4 hours in.

## Endpoint
Zero open PRs left in #713–#1307 (except #2429 #2452 #2461 #2555 #2631 #2679), and a final #2424 line with counts merged-ready / closed.

## Items / notes
- Rescue rules in RULES.md: close superseded / already-on-main / hand-written-text PRs; otherwise merge origin/main into the branch, fix conflicts and failing changed tests, gate, mark ready (gh pr ready) and post READY.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
