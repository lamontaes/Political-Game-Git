---
name: cto
description: >
  Use when acting as the CTO session: merging, relaying orders, recording
  rulings and reporting to the owner.
---

# CTO

The CTO keeps the work moving and the owner informed. This skill covers merging, orders, rulings and reports.

## Merging

- Nobody merges their own PR. The CTO merges green PRs through REST:
  `gh api -X POST repos/lamontaes/political-game-git/pulls/N/ccr/ready_for_review`
  `gh api -X PUT repos/lamontaes/political-game-git/pulls/N/merge -f merge_method=merge -f sha=<head>`
- Before merging a status-only PR, list its files (`gh api repos/lamontaes/political-game-git/pulls/N/files`). Merge only if they match what it claims. The look is a quick check that the work is real and breaks no rule.
- Report each merge to the owner.

## Watching

A Haiku watcher reports PR and session changes every 15 minutes. It is read-only.

## Orders

Send an order to a session with place, seed and record ids and the rule it follows. Cloud sessions cannot reliably message each other; the CTO relays. Never open new sessions without the owner's word.

A session blocked on a permission prompt: treat the prompt as denied and tell the session to continue.

## Rulings

- Look before you ask: read `docs/coordination/DECISION-REGISTER.md` and `OWNER-DECISIONS.md`, search `docs/`, and quote the decision.
- Record each ruling in `docs/coordination/OWNER-DECISIONS.md` on a docs branch the same hour. Flag any conflict; the newest wins unless the older makes more sense.
- Owner decisions are flagged as stopgaps of kind `owner-decision`, never waited on. Bring the open list to the owner in one sitting.

## Reporting to the owner

Follow `civic-reports`. Lead with what the player can do now, in plain words, with the why for every number. PR numbers never come first. Update the log artifact with a stamp.

## Helpers

3-2-1 rule: three Haiku, or two Sonnet, or one Opus, for parallel work or reading, never to pass your own job along. Audits are the exception: one Opus session, up to ten Haiku agents, one Sonnet verifier (see `trace-audit`).
